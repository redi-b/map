import { sileo, type SileoOptions } from "sileo"

type ToastType = "success" | "error" | "info" | "warning"

function show(type: ToastType, title: string, description?: string) {
  const options: SileoOptions = {
    title,
    description,
    duration: type === "error" ? 6500 : 4200,
  }

  if (type === "success") return sileo.success(options)
  if (type === "error") return sileo.error(options)
  if (type === "warning") return sileo.warning(options)
  return sileo.info(options)
}

export const toast = {
  success: (title: string, description?: string) => show("success", title, description),
  error: (title: string, description?: string) => show("error", title, description),
  info: (title: string, description?: string) => show("info", title, description),
  warning: (title: string, description?: string) => show("warning", title, description),
}
