"use client"

import { AlertTriangleIcon, FileImageIcon, Loader2Icon } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function PrescriptionImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  return (
    <div className={cn("relative overflow-hidden rounded-lg border bg-muted", className)}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted text-sm text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading image
        </div>
      ) : null}
      {failed ? (
        <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
          <AlertTriangleIcon className="size-8" />
          <p className="text-sm">The image could not be loaded.</p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={alt}
          className="max-h-[34rem] w-full object-contain"
          src={src}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setFailed(true)
          }}
        />
      )}
      {!loading && !failed ? (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
          <FileImageIcon className="mr-1 inline size-3" />
          Prescription image
        </div>
      ) : null}
    </div>
  )
}
