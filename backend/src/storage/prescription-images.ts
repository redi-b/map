import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { env } from "../lib/env.js"

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const encryptedImagePrefix = "encrypted://prescriptions/"

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

export type PrescriptionImageInput = {
  buffer: Buffer
  mimeType: string
  originalFilename: string
}

function getStorageDir() {
  return path.resolve(process.cwd(), env.PRESCRIPTION_STORAGE_DIR)
}

function getEncryptionKey() {
  const keySource = env.PRESCRIPTION_IMAGE_KEY ?? env.BETTER_AUTH_SECRET ?? "map-local-prescription-image-development-key"
  return createHash("sha256").update(keySource).digest()
}

function getFilenameFromUrl(imageUrl: string) {
  if (!imageUrl.startsWith(encryptedImagePrefix)) {
    throw new Error("Unsupported prescription image URL")
  }

  const filename = imageUrl.slice(encryptedImagePrefix.length)
  if (!/^[a-f0-9-]+\\.json$/i.test(filename)) {
    throw new Error("Invalid prescription image reference")
  }

  return filename
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
  const filename = `${randomUUID()}.json`
  const storageDir = getStorageDir()

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

  await mkdir(storageDir, { recursive: true })
  await writeFile(path.join(storageDir, filename), JSON.stringify(payload), { mode: 0o600 })

  return {
    imageUrl: `${encryptedImagePrefix}${filename}`,
    mimeType: input.mimeType,
  }
}

export async function readEncryptedPrescriptionImage(imageUrl: string) {
  const filename = getFilenameFromUrl(imageUrl)
  const raw = await readFile(path.join(getStorageDir(), filename), "utf8")
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
