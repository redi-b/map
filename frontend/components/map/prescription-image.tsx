"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { AlertTriangleIcon, FileImageIcon, Loader2Icon, Maximize2Icon, MinusIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PrescriptionImageProps = {
  src: string
  alt: string
  className?: string
  imageClassName?: string
  label?: string
  openable?: boolean
  showOverlay?: boolean
}

export function PrescriptionImage(props: PrescriptionImageProps) {
  return <PrescriptionImageContent key={props.src} {...props} />
}

function PrescriptionImageContent({
  src,
  alt,
  className,
  imageClassName,
  label = "Prescription image",
  openable = true,
  showOverlay = true,
}: PrescriptionImageProps) {
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)

  const image = failed ? (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
      <AlertTriangleIcon className="size-8" />
      <div>
        <p className="font-medium text-foreground">Image unavailable</p>
        <p className="mt-1 text-sm">The prescription image could not be loaded.</p>
      </div>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={cn("h-full max-h-[34rem] w-full object-contain", imageClassName)}
      src={src}
      onLoad={() => setLoading(false)}
      onError={() => {
        setLoading(false)
        setFailed(true)
      }}
    />
  )

  const preview = (
    <div className={cn("relative flex min-h-40 overflow-hidden rounded-xl border bg-muted", className)}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted text-sm text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          Loading image
        </div>
      ) : null}
      {image}
      {showOverlay && !loading && !failed ? (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            <FileImageIcon className="mr-1 inline size-3" />
            {label}
          </span>
          {openable ? (
            <span className="rounded-full bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
              <Maximize2Icon className="mr-1 inline size-3" />
              Open
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  if (!openable) return preview

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        render={
          <button
            type="button"
            className="block w-full cursor-zoom-in rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            disabled={failed}
          />
        }
      >
        {preview}
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 md:inset-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
            <div>
              <DialogPrimitive.Title className="font-[var(--font-display)] text-lg font-semibold">
                Prescription preview
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                Zoom in to inspect the image before review or follow-up.
              </DialogPrimitive.Description>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}>
                <MinusIcon />
                <span className="sr-only">Zoom out</span>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setZoom(1)}>
                <RotateCcwIcon data-icon="inline-start" />
                {Math.round(zoom * 100)}%
              </Button>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}>
                <PlusIcon />
                <span className="sr-only">Zoom in</span>
              </Button>
              <DialogPrimitive.Close render={<Button type="button" variant="ghost" size="icon-sm" />}>
                <XIcon />
                <span className="sr-only">Close preview</span>
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/40 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={alt}
              src={src}
              className="max-h-none max-w-none rounded-lg bg-background shadow-xl"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 150ms ease" }}
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
