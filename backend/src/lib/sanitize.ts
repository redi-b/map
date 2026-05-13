import { z } from "zod"

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export function sanitizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARACTERS, "")
    .replace(/[<>]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim()
}

export function cleanString<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== "string") return value
    return sanitizeText(value)
  }, schema)
}
