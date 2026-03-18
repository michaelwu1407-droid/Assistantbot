"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useJsApiLoader } from "@react-google-maps/api"
import { Input } from "@/components/ui/input"
import { MapPin, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const LIBRARIES: ("places")[] = ["places"]

export interface PlaceResult {
  address: string
  latitude: number | null
  longitude: number | null
  placeId: string | null
  components?: {
    streetLine?: string
    locality?: string
    region?: string
    postalCode?: string
    country?: string
  }
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  /** Called when a user selects a place from the dropdown with full geo data */
  onPlaceSelect?: (place: PlaceResult) => void
  placeholder?: string
  className?: string
  id?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Start typing an address...",
  className,
  id,
}: AddressAutocompleteProps) {
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim()

  if (!apiKey) {
    return (
      <div className={cn("relative", className)}>
        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
    )
  }

  return (
    <AddressAutocompleteWithGoogle
      apiKey={apiKey}
      value={value}
      onChange={onChange}
      onPlaceSelect={onPlaceSelect}
      placeholder={placeholder}
      className={className}
      id={id}
    />
  )
}

function AddressAutocompleteWithGoogle({
  apiKey,
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className,
  id,
}: AddressAutocompleteProps & { apiKey: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isResolved, setIsResolved] = useState(false)
  const [hasMapsFailure, setHasMapsFailure] = useState(false)
  const resolvingRef = useRef(false)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  })

  useEffect(() => {
    if (loadError) {
      setHasMapsFailure(true)
    }
  }, [loadError])

  useEffect(() => {
    const globalWindow = window as typeof window & { gm_authFailure?: () => void }
    const previous = globalWindow.gm_authFailure
    globalWindow.gm_authFailure = () => {
      setHasMapsFailure(true)
      previous?.()
    }

    return () => {
      globalWindow.gm_authFailure = previous
    }
  }, [])

  const pickPlaceParts = useCallback((candidate: google.maps.places.PlaceResult | null | undefined) => {
    if (!candidate) return null
    const components = candidate.address_components ?? []
    const get = (type: string) => components.find((c) => c.types?.includes(type))
    const streetNumber = get("street_number")?.long_name
    const route = get("route")?.long_name
    const locality =
      get("locality")?.long_name ||
      get("postal_town")?.long_name ||
      get("sublocality")?.long_name ||
      get("sublocality_level_1")?.long_name
    const region = get("administrative_area_level_1")?.short_name
    const postalCode = get("postal_code")?.long_name
    const country = get("country")?.short_name

    const streetLine =
      streetNumber && route ? `${streetNumber} ${route}` : (candidate.name ?? candidate.formatted_address ?? "")

    const address =
      streetLine && locality && region && postalCode
        ? `${streetLine}, ${locality} ${region} ${postalCode}`
        : (candidate.formatted_address ?? candidate.name ?? "")

    return {
      address,
      streetLine: streetLine || undefined,
      locality: locality || undefined,
      region: region || undefined,
      postalCode: postalCode || undefined,
      country: country || undefined,
    }
  }, [])

  const applyResolvedPlace = useCallback((params: {
    place: google.maps.places.PlaceResult
    resolved: ReturnType<typeof pickPlaceParts>
  }) => {
    const latitude = params.place.geometry?.location?.lat() ?? null
    const longitude = params.place.geometry?.location?.lng() ?? null
    const placeId = params.place.place_id ?? null
    const address = params.resolved?.address ?? params.place.formatted_address ?? params.place.name ?? ""

    onChange(address)
    onPlaceSelect?.({
      address,
      latitude,
      longitude,
      placeId,
      components: params.resolved
        ? {
            streetLine: params.resolved.streetLine,
            locality: params.resolved.locality,
            region: params.resolved.region,
            postalCode: params.resolved.postalCode,
            country: params.resolved.country,
          }
        : undefined,
    })
    if (address) setIsResolved(true)
  }, [onChange, onPlaceSelect, pickPlaceParts])

  const resolvePlaceById = useCallback((placeId: string, fallbackText: string) => {
    try {
      const service = new google.maps.places.PlacesService(document.createElement("div"))
      service.getDetails(
        {
          placeId,
          fields: ["address_components", "formatted_address", "name", "geometry", "place_id"],
        },
        (details, status) => {
          resolvingRef.current = false
          if (status !== google.maps.places.PlacesServiceStatus.OK || !details) {
            onChange(fallbackText)
            return
          }
          applyResolvedPlace({ place: details, resolved: pickPlaceParts(details) })
        },
      )
    } catch {
      resolvingRef.current = false
      onChange(fallbackText)
    }
  }, [applyResolvedPlace, onChange, pickPlaceParts])

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place) return
    const resolved = pickPlaceParts(place)
    // If postcode/state/locality are missing, fetch full details.
    if (!resolved?.region || !resolved?.postalCode || !resolved?.locality) {
      const placeId = place.place_id
      if (placeId) {
        resolvingRef.current = true
        resolvePlaceById(placeId, resolved?.address ?? place.formatted_address ?? place.name ?? "")
        return
      }
    }
    applyResolvedPlace({ place, resolved })
  }, [applyResolvedPlace, pickPlaceParts, resolvePlaceById])

  const attemptAutoSelectBestMatch = useCallback(() => {
    if (!isLoaded || hasMapsFailure) return
    const text = value.trim()
    if (!text || isResolved || resolvingRef.current) return
    // Only attempt when the user has typed something meaningful.
    if (text.length < 8) return

    try {
      resolvingRef.current = true
      const service = new google.maps.places.AutocompleteService()
      service.getPlacePredictions(
        {
          input: text,
          componentRestrictions: { country: "au" },
          types: ["address"],
        },
        (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions?.length) {
            resolvingRef.current = false
            return
          }
          const top = predictions[0]
          if (!top?.place_id) {
            resolvingRef.current = false
            return
          }
          resolvePlaceById(top.place_id, text)
        },
      )
    } catch {
      resolvingRef.current = false
    }
  }, [hasMapsFailure, isLoaded, isResolved, resolvePlaceById, value])

  // If the value is programmatically filled (e.g. website scrape),
  // resolve it in the background without requiring user blur/click.
  useEffect(() => {
    if (!isLoaded || hasMapsFailure) return
    if (isFocused) return
    if (isResolved) return
    const text = value.trim()
    if (text.length < 8) return

    const t = window.setTimeout(() => {
      attemptAutoSelectBestMatch()
    }, 350)

    return () => {
      window.clearTimeout(t)
    }
  }, [attemptAutoSelectBestMatch, hasMapsFailure, isFocused, isLoaded, isResolved, value])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !apiKey || autocompleteRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["geocode"],
      componentRestrictions: { country: "au" },
      fields: ["formatted_address", "name", "geometry", "place_id", "address_components"],
    })

    autocomplete.addListener("place_changed", handlePlaceChanged)
    autocompleteRef.current = autocomplete

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete)
    }
  }, [isLoaded, apiKey, handlePlaceChanged])

  // Reset the resolved indicator when the user types manually
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsResolved(false)
    onChange(e.target.value)
  }

  if (hasMapsFailure) {
    return (
      <div className={cn("relative", className)}>
        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="pl-9"
        />
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <MapPin className={cn(
        "absolute left-2.5 top-2.5 h-4 w-4 transition-colors",
        isResolved ? "text-emerald-500" : isFocused ? "text-primary" : "text-slate-400"
      )} />
      <Input
        ref={inputRef}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false)
          attemptAutoSelectBestMatch()
        }}
        className={cn("pl-9 pr-8", isResolved && "border-emerald-200")}
      />
      {isResolved && (
        <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-emerald-500" />
      )}
    </div>
  )
}
