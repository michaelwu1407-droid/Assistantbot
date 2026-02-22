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
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isResolved, setIsResolved] = useState(false)

  const apiKey = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "")
    : ""

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || "no-key",
    libraries: LIBRARIES,
  })

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (!place) return

    const address = place.formatted_address ?? place.name ?? ""
    const latitude = place.geometry?.location?.lat() ?? null
    const longitude = place.geometry?.location?.lng() ?? null
    const placeId = place.place_id ?? null

    // Always fire the simple string onChange for backward compat
    onChange(address)

    // Fire the structured callback with full geo data
    onPlaceSelect?.({ address, latitude, longitude, placeId })

    // Show the resolved indicator briefly
    if (address) setIsResolved(true)
  }, [onChange, onPlaceSelect])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !apiKey || autocompleteRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "au" },
      fields: ["formatted_address", "name", "geometry", "place_id"],
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

  // Fallback to plain input if no API key
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
