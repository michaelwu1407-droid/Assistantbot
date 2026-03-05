"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Loader2, MapPin } from "lucide-react"

interface PlacesAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

// Google Maps API loader
let googleMapsPromise: Promise<void> | null = null

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise
  
  if (window.google?.maps?.places) {
    return Promise.resolve()
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Google Maps"))
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

export function PlacesAutocomplete({ value, onChange, placeholder = "Enter address...", disabled }: PlacesAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null)
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!apiKey) {
      console.error("PlacesAutocomplete: No API key found")
      return
    }

    setIsLoading(true)
    console.log("PlacesAutocomplete: Loading Google Maps with API key")
    loadGoogleMaps(apiKey)
      .then(() => {
        if (window.google?.maps?.places) {
          autocompleteService.current = new window.google.maps.places.AutocompleteService()
          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken()
          console.log("PlacesAutocomplete: Google Maps loaded successfully")
        }
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("PlacesAutocomplete: Failed to load Google Maps", error)
        setIsLoading(false)
      })
  }, [apiKey])

  const fetchSuggestions = (input: string) => {
    if (!autocompleteService.current || !input || input.length < 3) {
      console.log("PlacesAutocomplete: Skipping fetch - service:", !!autocompleteService.current, "input length:", input.length)
      setSuggestions([])
      return
    }

    console.log("PlacesAutocomplete: Fetching suggestions for:", input)
    autocompleteService.current.getPlacePredictions(
      { 
        input,
        sessionToken: sessionToken.current || undefined,
        componentRestrictions: { country: "au" }
      },
      (predictions, status) => {
        console.log("PlacesAutocomplete: Response - status:", status, "predictions:", predictions?.length || 0)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
        }
      }
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    fetchSuggestions(newValue)
  }

  const handleSelectSuggestion = (suggestion: google.maps.places.AutocompletePrediction) => {
    onChange(suggestion.description)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow click events
    setTimeout(() => setShowSuggestions(false), 200)
  }

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  if (!apiKey) {
    // Fallback to regular input if no API key
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800"
            >
              <div className="font-medium">{suggestion.structured_formatting?.main_text || suggestion.description}</div>
              {suggestion.structured_formatting?.secondary_text && (
                <div className="text-xs text-slate-500">{suggestion.structured_formatting.secondary_text}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
