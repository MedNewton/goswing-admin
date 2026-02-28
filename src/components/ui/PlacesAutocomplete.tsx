"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { env } from "@/env";

interface PlaceResult {
  name: string;
  address: string;
  city: string | null;
  region: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  placeId: string;
}

interface PlacesAutocompleteProps {
  label?: string;
  placeholder?: string;
  error?: string;
  onPlaceSelect: (place: PlaceResult) => void;
  defaultValue?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
  }
}

export function PlacesAutocomplete({
  label,
  placeholder = "Search for a location...",
  error,
  onPlaceSelect,
  defaultValue = "",
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["establishment", "geocode"],
        fields: [
          "name",
          "formatted_address",
          "address_components",
          "geometry",
          "place_id",
        ],
      }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place || !place.address_components) return;

      // Extract address components
      let city: string | null = null;
      let region: string | null = null;
      let countryCode: string | null = null;
      let streetAddress: string | null = null;

      for (const component of place.address_components) {
        const types = component.types;
        if (types.includes("locality")) {
          city = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          region = component.short_name;
        } else if (types.includes("country")) {
          countryCode = component.short_name;
        } else if (types.includes("street_number") || types.includes("route")) {
          streetAddress = streetAddress
            ? `${streetAddress} ${component.long_name}`
            : component.long_name;
        }
      }

      const result: PlaceResult = {
        name: place.name || "",
        address: streetAddress || place.formatted_address || "",
        city,
        region,
        countryCode,
        lat: place.geometry?.location?.lat() ?? null,
        lng: place.geometry?.location?.lng() ?? null,
        placeId: place.place_id || "",
      };

      setInputValue(place.name || place.formatted_address || "");
      onPlaceSelect(result);
    });

    setIsLoaded(true);
  }, [onPlaceSelect]);

  useEffect(() => {
    const apiKey = env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn("Google Places API key not configured");
      return;
    }

    // Check if script is already loaded
    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", initAutocomplete);
      return;
    }

    // Load the script
    window.initGooglePlaces = initAutocomplete;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(
          autocompleteRef.current
        );
      }
    };
  }, [initAutocomplete]);

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className={`block w-full rounded-lg border ${
          error ? "border-red-300" : "border-gray-300"
        } bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900`}
        disabled={!isLoaded && !!env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}
      />
      {!env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY && (
        <p className="mt-1 text-xs text-amber-600">
          Google Places API not configured. Enter address manually.
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
