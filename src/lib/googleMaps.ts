// Lazily loads the Google Maps JS API (Places library) exactly once, client-side.
// Returns null when no API key is configured so callers can degrade to plain text
// entry. Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY + the "Maps JavaScript API" and
// "Places API" enabled on the key's Google Cloud project.

type GoogleNS = typeof google

let promise: Promise<GoogleNS | null> | null = null

export function googleMapsKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
}

export function loadGoogleMaps(): Promise<GoogleNS | null> {
  if (promise) return promise

  promise = new Promise<GoogleNS | null>((resolve) => {
    if (typeof window === "undefined") return resolve(null)
    const key = googleMapsKey()
    if (!key) return resolve(null)

    // Already present (e.g. loaded elsewhere).
    if (window.google?.maps?.places) return resolve(window.google)

    const existing = document.getElementById("gmaps-js") as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google ?? null))
      existing.addEventListener("error", () => resolve(null))
      return
    }

    const script = document.createElement("script")
    script.id = "gmaps-js"
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      key
    )}&libraries=places&v=weekly`
    script.onload = () => resolve(window.google ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })

  return promise
}

export interface ParsedAddress {
  line1: string
  city: string
  state: string
  zip: string
  lat: number | null
  lng: number | null
  placeId: string | null
}

/** Flatten a Google PlaceResult's address_components into our address fields. */
export function parsePlace(place: google.maps.places.PlaceResult): ParsedAddress {
  const get = (type: string, short = false): string => {
    const c = place.address_components?.find((comp) => comp.types.includes(type))
    return (short ? c?.short_name : c?.long_name) ?? ""
  }

  const streetNumber = get("street_number")
  const route = get("route")
  const line1 = [streetNumber, route].filter(Boolean).join(" ").trim()
  const city = get("locality") || get("postal_town") || get("sublocality") || get("administrative_area_level_2")
  const state = get("administrative_area_level_1", true)
  const zip = get("postal_code")

  const loc = place.geometry?.location
  return {
    line1,
    city,
    state,
    zip,
    lat: loc ? loc.lat() : null,
    lng: loc ? loc.lng() : null,
    placeId: place.place_id ?? null,
  }
}
