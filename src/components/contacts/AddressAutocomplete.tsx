"use client"

import { useEffect, useRef } from "react"
import { loadGoogleMaps, parsePlace, type ParsedAddress } from "@/lib/googleMaps"

/**
 * Street-address input with Google Places autocomplete. When a place is picked,
 * `onResolve` fires with the parsed components (city/state/zip/lat/lng/placeId) so
 * the parent can fill the rest of the row. Falls back to a plain text input that
 * only reports its typed value when no Maps key is configured.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onResolve,
  className,
  placeholder,
}: {
  value: string
  onChange: (line1: string) => void
  onResolve: (parsed: ParsedAddress) => void
  className?: string
  placeholder?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Keep the latest onResolve without re-binding the widget each render.
  const resolveRef = useRef(onResolve)
  resolveRef.current = onResolve

  useEffect(() => {
    let ac: google.maps.places.Autocomplete | null = null
    let listener: google.maps.MapsEventListener | null = null
    let cancelled = false

    loadGoogleMaps().then((g) => {
      if (cancelled || !g || !inputRef.current) return
      ac = new g.maps.places.Autocomplete(inputRef.current, {
        types: ["address"],
        fields: ["address_components", "geometry", "place_id"],
      })
      listener = ac.addListener("place_changed", () => {
        const place = ac!.getPlace()
        if (!place?.address_components) return
        const parsed = parsePlace(place)
        if (parsed.line1) onChange(parsed.line1)
        resolveRef.current(parsed)
      })
    })

    return () => {
      cancelled = true
      if (listener) listener.remove()
      // Clean up the dropdown container Google appends to <body>.
      document.querySelectorAll(".pac-container").forEach((el) => el.remove())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      // Autocomplete off so the browser's own suggestions don't fight Google's.
      autoComplete="off"
    />
  )
}
