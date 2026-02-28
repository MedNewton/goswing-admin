"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { LocationMapPicker } from "@/components/ui/LocationMapPicker";
import { useState, useEffect, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  fetchVenue,
  updateVenueAction,
  deleteVenueAction,
  type VenueActionResult,
} from "@/lib/actions/venues";
import type { Venue } from "@/types";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const editVenueFormSchema = z.object({
  name: z.string().min(1, "Venue name is required"),
  address_line1: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  country_code: z.string().optional().or(z.literal("")),
  venue_type: z.string().optional().or(z.literal("")),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

type EditVenueFormValues = z.infer<typeof editVenueFormSchema>;

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditVenueFormValues>({
    resolver: zodResolver(editVenueFormSchema),
    defaultValues: {
      name: "",
      address_line1: "",
      city: "",
      region: "",
      country_code: "",
      venue_type: "",
    },
  });

  // Load venue data
  useEffect(() => {
    async function loadVenue() {
      try {
        const data = await fetchVenue(id);
        setVenue(data);
        reset({
          name: data.name,
          address_line1: data.address || "",
          city: data.city || "",
          region: data.region || "",
          country_code: data.countryCode || "",
          venue_type: data.venueType || "",
          lat: data.lat ?? undefined,
          lng: data.lng ?? undefined,
        });
      } catch {
        setServerError("Failed to load venue.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadVenue();
  }, [id, reset]);

  const city = watch("city");
  const region = watch("region");
  const countryCode = watch("country_code");
  const address = watch("address_line1");
  const lat = watch("lat");
  const lng = watch("lng");

  const onSubmit = (data: EditVenueFormValues) => {
    setServerError(null);
    startTransition(async () => {
      try {
        const result: VenueActionResult = await updateVenueAction(id, {
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
          // Refresh venue data
          const updated = await fetchVenue(id);
          setVenue(updated);
          setIsEditing(false);
        } else {
          setServerError(result.error);
        }
      } catch {
        setServerError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const handleDelete = () => {
    setIsDeleting(true);
    startTransition(async () => {
      try {
        const result = await deleteVenueAction(id);
        if (result.success) {
          router.push("/venues");
        } else {
          setServerError(result.error);
          setIsDeleting(false);
          setShowDeleteConfirm(false);
        }
      } catch {
        setServerError("Failed to delete venue.");
        setIsDeleting(false);
        setShowDeleteConfirm(false);
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
    if (place.address) setValue("address_line1", place.address, { shouldDirty: true });
    if (place.city) setValue("city", place.city, { shouldDirty: true });
    if (place.region) setValue("region", place.region, { shouldDirty: true });
    if (place.countryCode) setValue("country_code", place.countryCode, { shouldDirty: true });
    if (place.lat) setValue("lat", place.lat, { shouldDirty: true });
    if (place.lng) setValue("lng", place.lng, { shouldDirty: true });
  };

  const handleCancelEdit = () => {
    if (venue) {
      reset({
        name: venue.name,
        address_line1: venue.address || "",
        city: venue.city || "",
        region: venue.region || "",
        country_code: venue.countryCode || "",
        venue_type: venue.venueType || "",
        lat: venue.lat ?? undefined,
        lng: venue.lng ?? undefined,
      });
    }
    setIsEditing(false);
    setServerError(null);
  };

  // Build location summary
  const locationParts = [address, city, region, countryCode].filter(Boolean);
  const locationSummary = locationParts.length > 0 ? locationParts.join(", ") : "No location set";

  if (isLoading) {
    return (
      <MainLayout title="Venue Details">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            <p className="mt-4 text-sm text-gray-500">Loading venue...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!venue && !isLoading) {
    return (
      <MainLayout title="Venue Not Found">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">Venue not found</p>
            <p className="mt-1 text-sm text-gray-500">
              The venue you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => router.push("/venues")}
            >
              Back to Venues
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title={isEditing ? "Edit Venue" : venue?.name ?? "Venue Details"}
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.push("/venues")}
          >
            ← Back
          </Button>
          {!isEditing ? (
            <>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => setIsEditing(true)}
              >
                Edit Venue
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:bg-red-50"
              >
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                disabled={isPending || !isDirty}
                onClick={handleSubmit(onSubmit)}
              >
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Venue</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete <strong>{venue?.name}</strong>? This action cannot be undone.
              Events using this venue will lose their venue reference.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete Venue"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Server Error */}
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* View Mode */}
        {!isEditing && venue && (
          <>
            {/* Venue Details Card */}
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                📍 Venue Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Name</p>
                  <p className="mt-1 text-sm text-gray-900">{venue.name}</p>
                </div>
                {venue.venueType && (
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">Type</p>
                    <p className="mt-1 text-sm capitalize text-gray-900">
                      {venue.venueType.replace(/_/g, " ")}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Location Card */}
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                🏙️ Location
              </h2>
              <div className="space-y-3">
                {venue.address && (
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">Address</p>
                    <p className="mt-1 text-sm text-gray-900">{venue.address}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Location</p>
                  <p className="mt-1 text-sm text-gray-900">{locationSummary}</p>
                </div>
                {(lat || lng) && (
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-500">Coordinates</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {lat}, {lng}
                    </p>
                  </div>
                )}
              </div>

              {/* Map placeholder */}
              {lat && lng && (
                <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                  <iframe
                    title="Venue Location"
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? ""}&q=${lat},${lng}&zoom=15`}
                  />
                </div>
              )}
            </Card>

            {/* Metadata Card */}
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                ℹ️ Info
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Created</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(venue.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Venue ID</p>
                  <p className="mt-1 font-mono text-xs text-gray-500">{venue.id}</p>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Edit Mode */}
        {isEditing && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  label="Search New Location"
                  placeholder="Search for a place or address..."
                  onPlaceSelect={handlePlaceSelect}
                  defaultValue={venue?.address || ""}
                />

                {/* Interactive Map */}
                {lat != null && lng != null && (
                  <LocationMapPicker
                    lat={lat}
                    lng={lng}
                    onLocationChange={(newLat, newLng) => {
                      setValue("lat", newLat, { shouldDirty: true });
                      setValue("lng", newLng, { shouldDirty: true });
                    }}
                  />
                )}

                {/* Editable fields */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="mb-3 text-xs font-medium text-gray-500">
                    Location details (editable):
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
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isPending || !isDirty}
              >
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
}
