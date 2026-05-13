import { sileo, type SileoButton, type SileoOptions } from "sileo"

type ToastType = "success" | "error" | "info" | "warning"

function show(type: ToastType, title: string, description?: string, button?: SileoButton) {
  const options: SileoOptions = {
    title,
    description,
    button,
    duration: type === "error" ? 6500 : 4200,
  }

  if (type === "success") return sileo.success(options)
  if (type === "error") return sileo.error(options)
  if (type === "warning") return sileo.warning(options)
  return sileo.info(options)
}

export const toast = {
  success: (title: string, description?: string, button?: SileoButton) => show("success", title, description, button),
  error: (title: string, description?: string, button?: SileoButton) => show("error", title, description, button),
  info: (title: string, description?: string, button?: SileoButton) => show("info", title, description, button),
  warning: (title: string, description?: string, button?: SileoButton) => show("warning", title, description, button),
  action: (title: string, description: string, button: SileoButton) => sileo.action({ title, description, button, duration: 8000 }),
}
