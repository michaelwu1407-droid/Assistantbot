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

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place) return

    const components = place.address_components ?? []
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
      streetNumber && route ? `${streetNumber} ${route}` : (place.name ?? place.formatted_address ?? "")

    // Prefer a provision-ready AU address string when we have the pieces.
    const address =
      streetLine && locality && region && postalCode
        ? `${streetLine}, ${locality} ${region} ${postalCode}`
        : (place.formatted_address ?? place.name ?? "")
    const latitude = place.geometry?.location?.lat() ?? null
    const longitude = place.geometry?.location?.lng() ?? null
    const placeId = place.place_id ?? null

    // Always fire the simple string onChange for backward compat
    onChange(address)

    // Fire the structured callback with full geo data
    onPlaceSelect?.({
      address,
      latitude,
      longitude,
      placeId,
      components: {
        streetLine: streetLine || undefined,
        locality: locality || undefined,
        region: region || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
      },
    })

    // Show the resolved indicator briefly
    if (address) setIsResolved(true)
  }, [onChange, onPlaceSelect])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !apiKey || autocompleteRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
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
        onBlur={() => setIsFocused(false)}
        className={cn("pl-9 pr-8", isResolved && "border-emerald-200")}
      />
      {isResolved && (
        <CheckCircle2 className="absolute right-2.5 top-2.5 h-4 w-4 text-emerald-500" />
      )}
    </div>
  )
}
