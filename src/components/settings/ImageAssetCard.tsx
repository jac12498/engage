"use client"

import { useRef, useState } from "react"
import { Loader2, Upload, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * An in-DB image asset (headshot, logo, …) — upload / preview / remove. `uploadPath`
 * takes POST (multipart) + DELETE; `getPath`/`id` serves the current image. Errors are
 * surfaced through `onError`.
 */
export function ImageAssetCard({
  label,
  hint,
  round,
  id,
  uploadPath,
  getPath,
  initialHas,
  onError,
}: {
  label: string
  hint: string
  round?: boolean
  /** The owner id used in the GET url (candidate id / committee id). */
  id: string
  uploadPath: string
  getPath: string
  initialHas: boolean
  onError: (msg: string | null) => void
}) {
  const [has, setHas] = useState(initialHas)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    onError(null)
    setBusy(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(uploadPath, { method: "POST", body: form })
      if (!res.ok) {
        onError((await res.text()) || "Upload failed.")
        return
      }
      setHas(true)
      setVersion((v) => v + 1)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function remove() {
    onError(null)
    setBusy(true)
    try {
      const res = await fetch(uploadPath, { method: "DELETE" })
      if (!res.ok) {
        onError((await res.text()) || `Could not remove the ${label.toLowerCase()}.`)
        return
      }
      setHas(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-[#1a1a2e]">{label}</span>
      <div className="flex items-center gap-4">
        <div
          className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-border bg-[#f4f6f9] ${
            round ? "rounded-full" : "rounded-xl"
          }`}
        >
          {has ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${getPath}/${id}?v=${version}`} alt={label} className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) upload(f)
            }}
          />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            {has ? "Replace" : "Upload"}
          </Button>
          {has && (
            <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
