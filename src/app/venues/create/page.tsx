"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { LocationMapPicker } from "@/components/ui/LocationMapPicker";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createVenueAction, type VenueActionResult } from "@/lib/actions/venues";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const createVenueFormSchema = z.object({
  name: z.string().min(1, "Venue name is required"),
  address_line1: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  country_code: z.string().optional().or(z.literal("")),
  venue_type: z.string().optional().or(z.literal("")),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

type CreateVenueFormValues = z.infer<typeof createVenueFormSchema>;

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CreateVenuePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateVenueFormValues>({
    resolver: zodResolver(createVenueFormSchema),
    defaultValues: {
      name: "",
      address_line1: "",
      city: "",
      region: "",
      country_code: "",
      venue_type: "",
    },
  });

  const city = watch("city");
  const region = watch("region");
  const countryCode = watch("country_code");
  const address = watch("address_line1");
  const lat = watch("lat");
  const lng = watch("lng");

  const onSubmit = (data: CreateVenueFormValues) => {
    setServerError(null);
    startTransition(async () => {
      try {
        const result: VenueActionResult = await createVenueAction({
          name: data.name,
          address_line1: data.address_line1,
          city: data.city,
          region: data.region,
          country_code: data.country_code,
          venue_type: data.venue_type,
          lat: data.lat,
          lng: data.lng,
        });

        if (result.success) {
          router.push("/venues");
        } else {
          setServerError(result.error);
        }
      } catch {
        setServerError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const handlePlaceSelect = (place: {
    name: string;
    address: string;
    city: string | null;
    region: string | null;
    countryCode: string | null;
    lat: number | null;
    lng: number | null;
    placeId: string;
  }) => {
    // Auto-fill the venue name if empty
    const currentName = watch("name");
    if (!currentName && place.name) {
      setValue("name", place.name);
    }

    // Auto-fill location fields from the selected place
    if (place.address) setValue("address_line1", place.address);
    if (place.city) setValue("city", place.city);
    if (place.region) setValue("region", place.region);
    if (place.countryCode) setValue("country_code", place.countryCode);
    if (place.lat) setValue("lat", place.lat);
    if (place.lng) setValue("lng", place.lng);
  };

  // Build a summary of the selected location
  const locationSummary = [address, city, region, countryCode]
    .filter(Boolean)
    .join(", ");

  return (
    <MainLayout
      title="Create New Venue"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.push("/venues")}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {isPending ? "Saving..." : "Save Venue"}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-2xl space-y-6"
      >
        {/* Server Error */}
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Venue Details */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📍 Venue Details
          </h2>
          <div className="space-y-4">
            <Input
              label="Venue Name"
              placeholder="e.g., Jazz Club Downtown"
              error={errors.name?.message}
              {...register("name")}
            />
            <Select
              label="Venue Type"
              options={[
                { value: "", label: "Select a type" },
                { value: "club", label: "Club" },
                { value: "bar", label: "Bar" },
                { value: "restaurant", label: "Restaurant" },
                { value: "concert_hall", label: "Concert Hall" },
                { value: "outdoor", label: "Outdoor Venue" },
                { value: "hotel", label: "Hotel" },
                { value: "conference_center", label: "Conference Center" },
                { value: "stadium", label: "Stadium" },
                { value: "theater", label: "Theater" },
                { value: "other", label: "Other" },
              ]}
              error={errors.venue_type?.message}
              {...register("venue_type")}
            />
          </div>
        </Card>

        {/* Location - Google Places */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            🏙️ Location
          </h2>
          <div className="space-y-4">
            <PlacesAutocomplete
              label="Search Location"
              placeholder="Search for a place or address..."
              onPlaceSelect={handlePlaceSelect}
            />

            {/* Show auto-filled location details */}
            {locationSummary && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-medium text-green-700">
                  📍 Selected Location
                </p>
                <p className="mt-1 text-sm text-green-800">
                  {locationSummary}
                </p>
              </div>
            )}

            {/* Interactive Map */}
            {lat != null && lng != null && (
              <LocationMapPicker
                lat={lat}
                lng={lng}
                onLocationChange={(newLat, newLng) => {
                  setValue("lat", newLat);
                  setValue("lng", newLng);
                }}
              />
            )}

            {/* Editable fields (pre-filled from Places API) */}
            <div className="border-t border-gray-100 pt-4">
              <p className="mb-3 text-xs font-medium text-gray-500">
                You can edit the auto-filled details below:
              </p>
              <div className="space-y-4">
                <Input
                  label="Address"
                  placeholder="Street address"
                  error={errors.address_line1?.message}
                  {...register("address_line1")}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="City"
                    placeholder="e.g., Paris"
                    error={errors.city?.message}
                    {...register("city")}
                  />
                  <Input
                    label="Region / State"
                    placeholder="e.g., Île-de-France"
                    error={errors.region?.message}
                    {...register("region")}
                  />
                </div>
                <Input
                  label="Country Code"
                  placeholder="e.g., FR, US, MA"
                  error={errors.country_code?.message}
                  {...register("country_code")}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push("/venues")}
          >
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Venue"}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
