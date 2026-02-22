"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useJsApiLoader } from "@react-google-maps/api"
import { Input } from "@/components/ui/input"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

const LIBRARIES: ("places")[] = ["places"]

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing an address...",
  className,
  id,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const apiKey = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "")
    : ""

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || "no-key",
    libraries: LIBRARIES,
  })

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    if (place?.formatted_address) {
      onChange(place.formatted_address)
    } else if (place?.name) {
      onChange(place.name)
    }
  }, [onChange])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !apiKey || autocompleteRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "au" },
      fields: ["formatted_address", "name", "geometry"],
    })

    autocomplete.addListener("place_changed", handlePlaceChanged)
    autocompleteRef.current = autocomplete

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete)
    }
  }, [isLoaded, apiKey, handlePlaceChanged])

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
        isFocused ? "text-primary" : "text-slate-400"
      )} />
      <Input
        ref={inputRef}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="pl-9"
      />
    </div>
  )
}
