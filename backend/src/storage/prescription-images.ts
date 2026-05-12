import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { env } from "../lib/env.js"

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const encryptedImagePrefix = "encrypted://"
const prescriptionObjectPrefix = "prescriptions/"

type StoredPrescriptionImage = {
  version: 1
  algorithm: "aes-256-gcm"
  iv: string
  authTag: string
  mimeType: string
  originalFilename: string
  encryptedAt: string
  data: string
}

type EncryptedStorage = {
  upload: (key: string, payload: string) => Promise<void>
  download: (key: string) => Promise<string>
}

export type PrescriptionImageInput = {
  buffer: Buffer
  mimeType: string
  originalFilename: string
}

function getStorageDir() {
  return path.resolve(process.cwd(), env.PRESCRIPTION_STORAGE_DIR)
}

async function streamBodyToString(body: unknown) {
  if (!body) {
    throw new Error("Stored prescription image is empty")
  }

  if (typeof body === "object" && "transformToString" in body && typeof body.transformToString === "function") {
    return body.transformToString()
  }

  if (typeof body === "object" && "transformToByteArray" in body && typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray()).toString("utf8")
  }

  throw new Error("Unsupported prescription image response body")
}

function createPrescriptionImageStorage(): EncryptedStorage {
  if (env.PRESCRIPTION_STORAGE_PROVIDER === "r2") {
    if (!env.R2_BUCKET || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || (!env.R2_ACCOUNT_ID && !env.R2_ENDPOINT)) {
      throw new Error("R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ACCOUNT_ID or R2_ENDPOINT are required when PRESCRIPTION_STORAGE_PROVIDER=r2")
    }

    const client = new S3Client({
      region: "auto",
      endpoint: env.R2_ENDPOINT ?? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    })

    return {
      async upload(key, payload) {
        await client.send(new PutObjectCommand({
          Bucket: env.R2_BUCKET,
          Key: key,
          Body: payload,
          ContentType: "application/json",
          CacheControl: "private, no-store",
        }))
      },
      async download(key) {
        const object = await client.send(new GetObjectCommand({
          Bucket: env.R2_BUCKET,
          Key: key,
        }))
        return streamBodyToString(object.Body)
      },
    }
  }

  return {
    async upload(key, payload) {
      const filePath = path.join(getStorageDir(), key)
      await mkdir(path.dirname(filePath), { recursive: true })
      await writeFile(filePath, payload, { mode: 0o600 })
    },
    async download(key) {
      return readFile(path.join(getStorageDir(), key), "utf8")
    },
  }
}

const prescriptionImageStorage = createPrescriptionImageStorage()

function getEncryptionKey() {
  const keySource = env.PRESCRIPTION_IMAGE_KEY ?? env.BETTER_AUTH_SECRET ?? "map-local-prescription-image-development-key"
  return createHash("sha256").update(keySource).digest()
}

function getObjectKeyFromUrl(imageUrl: string) {
  if (!imageUrl.startsWith(encryptedImagePrefix)) {
    throw new Error("Unsupported prescription image URL")
  }

  const objectKey = imageUrl.slice(encryptedImagePrefix.length)
  if (!/^prescriptions\/[a-f0-9-]+\.json$/i.test(objectKey)) {
    throw new Error("Invalid prescription image reference")
  }

  return objectKey
}

export function validatePrescriptionImage(input: PrescriptionImageInput) {
  if (!allowedMimeTypes.has(input.mimeType)) {
    throw new Error("Prescription image must be a JPEG, PNG, WebP, or GIF file")
  }

  if (input.buffer.byteLength === 0) {
    throw new Error("Prescription image is empty")
  }
}

export async function storeEncryptedPrescriptionImage(input: PrescriptionImageInput) {
  validatePrescriptionImage(input)

  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(input.buffer), cipher.final()])
  const authTag = cipher.getAuthTag()
  const objectKey = `${prescriptionObjectPrefix}${randomUUID()}.json`

  const payload: StoredPrescriptionImage = {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    mimeType: input.mimeType,
    originalFilename: input.originalFilename,
    encryptedAt: new Date().toISOString(),
    data: encrypted.toString("base64"),
  }

  await prescriptionImageStorage.upload(objectKey, JSON.stringify(payload))

  return {
    imageUrl: `${encryptedImagePrefix}${objectKey}`,
    mimeType: input.mimeType,
  }
}

export async function readEncryptedPrescriptionImage(imageUrl: string) {
  const objectKey = getObjectKeyFromUrl(imageUrl)
  const raw = await prescriptionImageStorage.download(objectKey)
  const payload = JSON.parse(raw) as StoredPrescriptionImage

  if (payload.version !== 1 || payload.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported prescription image format")
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(payload.iv, "base64"))
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"))

  return {
    buffer: Buffer.concat([decipher.update(Buffer.from(payload.data, "base64")), decipher.final()]),
    mimeType: payload.mimeType,
    originalFilename: payload.originalFilename,
  }
}
