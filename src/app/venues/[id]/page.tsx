"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import {
  BuildingIcon,
  CalendarIcon,
  HomeIcon,
  MapPinIcon,
  SettingsIcon,
} from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { LocationMapPicker } from "@/components/ui/LocationMapPicker";
import {
  useState,
  useEffect,
  useTransition,
  use,
  type ComponentType,
  type SVGProps,
} from "react";
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

function hasAnyTruthyValue(values: Array<number | string | null | undefined>) {
  return values.some(Boolean);
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: IconComponent;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function DetailBlock({
  icon: Icon,
  label,
  value,
  hint,
  className = "",
}: {
  icon: IconComponent;
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm shadow-gray-100 ${className}`}
    >
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</p>
      </div>
      <p className="mt-3 text-base font-semibold text-gray-950">{value}</p>
      {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    </div>
  );
}

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
          address_line1: data.address ?? "",
          city: data.city ?? "",
          region: data.region ?? "",
          country_code: data.countryCode ?? "",
          venue_type: data.venueType ?? "",
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
        address_line1: venue.address ?? "",
        city: venue.city ?? "",
        region: venue.region ?? "",
        country_code: venue.countryCode ?? "",
        venue_type: venue.venueType ?? "",
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
  const hasCoordinatePreview = hasAnyTruthyValue([lat, lng]);
  const venueTypeLabel = venue?.venueType ? venue.venueType.replace(/_/g, " ") : null;
  const formattedCreatedAt = venue
    ? new Date(venue.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

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

      <div className="mx-auto max-w-6xl space-y-6">
        {/* Server Error */}
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* View Mode */}
        {!isEditing && venue && (
          <>
            <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-8 text-white shadow-xl shadow-slate-200">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.22),_transparent_34%)]" />
              <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
                    <BuildingIcon className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/75">
                    Venue Profile
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {venue.name}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                    Review the venue profile, location coverage, and system metadata from a single place.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                      {venueTypeLabel ?? "Type not specified"}
                    </div>
                    <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                      {locationSummary}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
                    <div className="flex items-center gap-2 text-teal-100">
                      <BuildingIcon className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                        Venue Type
                      </p>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {venueTypeLabel ?? "Not set"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
                    <div className="flex items-center gap-2 text-teal-100">
                      <MapPinIcon className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                        Geo Status
                      </p>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {hasCoordinatePreview ? "Coordinates set" : "Map pending"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 text-teal-100">
                      <CalendarIcon className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                        Added
                      </p>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {formattedCreatedAt}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="space-y-6">
                <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={BuildingIcon}
                    eyebrow="Overview"
                    title="Venue Details"
                    description="Core profile details used across event creation and scheduling."
                  />

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <DetailBlock
                      icon={BuildingIcon}
                      label="Venue Name"
                      value={venue.name}
                    />
                    <DetailBlock
                      icon={SettingsIcon}
                      label="Venue Type"
                      value={venueTypeLabel ?? "Not set"}
                    />
                  </div>
                </Card>

                <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-teal-50/50 shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={MapPinIcon}
                    eyebrow="Location"
                    title="Address & Coverage"
                    description="Street details, broader area, and coordinates for map-based discovery."
                  />

                  <div className="mt-6 grid gap-4">
                    <DetailBlock
                      icon={HomeIcon}
                      label="Street Address"
                      value={venue.address ?? "No street address set"}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailBlock
                        icon={MapPinIcon}
                        label="Area"
                        value={locationSummary}
                      />
                      <DetailBlock
                        icon={MapPinIcon}
                        label="Coordinates"
                        value={hasCoordinatePreview ? `${lat}, ${lng}` : "Coordinates not set"}
                        hint={hasCoordinatePreview ? "Used for the embedded location preview." : undefined}
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="rounded-[2rem] border border-gray-200/80 bg-white shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={MapPinIcon}
                    eyebrow="Preview"
                    title="Map View"
                    description="A quick location preview powered by the saved venue coordinates."
                  />

                  {lat && lng ? (
                    <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white">
                      <iframe
                        title="Venue Location"
                        width="100%"
                        height="340"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? ""}&q=${lat},${lng}&zoom=15`}
                      />
                    </div>
                  ) : (
                    <div className="mt-6 rounded-[1.5rem] border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white">
                        <MapPinIcon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-gray-900">
                        No coordinate preview available
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Add latitude and longitude in edit mode to enable the embedded map.
                      </p>
                    </div>
                  )}
                </Card>

                <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-slate-50 via-white to-white shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={CalendarIcon}
                    eyebrow="Metadata"
                    title="System Info"
                    description="Reference fields for support, auditing, and internal tracking."
                  />

                  <div className="mt-6 space-y-4">
                    <DetailBlock
                      icon={CalendarIcon}
                      label="Created"
                      value={formattedCreatedAt}
                    />
                    <DetailBlock
                      icon={SettingsIcon}
                      label="Venue ID"
                      value={venue.id}
                      className="font-mono"
                    />
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Edit Mode */}
        {isEditing && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <section className="rounded-[2rem] border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-950 text-white">
                    <SettingsIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                      Editing
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                      Update Venue Profile
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Adjust the profile and location details below. Changes apply after saving.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-600">
                  Current location: <span className="font-medium text-gray-900">{locationSummary}</span>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
              <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
                <SectionHeader
                  icon={BuildingIcon}
                  eyebrow="Profile"
                  title="Venue Details"
                  description="Update the public-facing venue identity and classification."
                />
                <div className="mt-6 space-y-4">
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

              <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-teal-50/50 shadow-lg shadow-gray-100">
                <SectionHeader
                  icon={MapPinIcon}
                  eyebrow="Location"
                  title="Address & Map"
                  description="Search for a place, adjust coordinates, and refine the saved address fields."
                />
                <div className="mt-6 space-y-4">
                  <PlacesAutocomplete
                    label="Search New Location"
                    placeholder="Search for a place or address..."
                    onPlaceSelect={handlePlaceSelect}
                    defaultValue={venue?.address ?? ""}
                  />

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

                  <div className="rounded-3xl border border-gray-200 bg-white/80 p-5">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Location Details
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
                          placeholder="e.g., Ile-de-France"
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
            </div>

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
