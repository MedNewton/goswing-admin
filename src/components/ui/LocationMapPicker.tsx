"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { env } from "@/env";

interface LocationMapPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  zoom?: number;
  height?: string;
}

export function LocationMapPicker({
  lat,
  lng,
  onLocationChange,
  zoom = 15,
  height = "300px",
}: LocationMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const position = { lat, lng };

    // Create map if not exists
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: position,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      markerRef.current = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        draggable: true,
        title: "Drag to adjust location",
      });

      markerRef.current.addListener("dragend", () => {
        const pos = markerRef.current?.getPosition();
        if (pos) {
          onLocationChange(pos.lat(), pos.lng());
        }
      });

      // Also allow clicking on the map to move the pin
      mapInstanceRef.current.addListener(
        "click",
        (e: google.maps.MapMouseEvent) => {
          if (e.latLng && markerRef.current) {
            markerRef.current.setPosition(e.latLng);
            onLocationChange(e.latLng.lat(), e.latLng.lng());
          }
        }
      );

      setIsLoaded(true);
    }
  }, [lat, lng, zoom, onLocationChange]);

  // Update marker and map center when lat/lng props change
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const position = { lat, lng };
      markerRef.current.setPosition(position);
      mapInstanceRef.current.panTo(position);
    }
  }, [lat, lng]);

  // Load Google Maps script and init
  useEffect(() => {
    const apiKey = env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) return;

    if (window.google?.maps) {
      initMap();
      return;
    }

    // Wait for script already being loaded by PlacesAutocomplete
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", initMap);
      // Also try immediately in case it already loaded
      if (window.google?.maps) initMap();
      return;
    }

    // Load script ourselves (fallback if PlacesAutocomplete hasn't loaded it)
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, [initMap]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(markerRef.current);
      }
      if (mapInstanceRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(
          mapInstanceRef.current
        );
      }
    };
  }, []);

  if (!env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        style={{ height, width: "100%" }}
        className="overflow-hidden rounded-lg border border-gray-200"
      />
      {isLoaded && (
        <p className="text-xs text-gray-500">
          Drag the pin or click the map to adjust the location.
          Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
