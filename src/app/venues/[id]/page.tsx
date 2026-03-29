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
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

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
  postal_code: z.string().optional().or(z.literal("")),
  capacity: z.union([z.coerce.number().int().positive(), z.literal(""), z.undefined()]).optional(),
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
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

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
      postal_code: "",
      capacity: "" as unknown as undefined,
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
          postal_code: data.postalCode ?? "",
          capacity: data.capacity ?? ("" as unknown as undefined),
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
          postal_code: data.postal_code,
          capacity: typeof data.capacity === "number" ? data.capacity : null,
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
        postal_code: venue.postalCode ?? "",
        capacity: venue.capacity ?? ("" as unknown as undefined),
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
      <MainLayout>
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t("adminVenue.overviewTitle")}</h1>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
            <p className="mt-4 text-sm text-gray-500">{t("adminVenue.loading")}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!venue && !isLoading) {
    return (
      <MainLayout>
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t("adminVenue.notFound")}</h1>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">{t("adminVenue.notFound")}</p>
            <p className="mt-1 text-sm text-gray-500">
              {t("adminVenue.notFoundDesc")}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => router.push("/venues")}
            >
              {t("adminVenue.backToVenues")}
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEditing ? t("adminVenue.editVenue") : venue?.name ?? t("adminVenue.overviewTitle")}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.push("/venues")}
          >
            &larr; {t("common.back")}
          </Button>
          {!isEditing ? (
            <>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => setIsEditing(true)}
              >
                {t("adminVenue.editVenue")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:bg-red-50"
              >
                {t("common.delete")}
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
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                disabled={isPending || !isDirty}
                onClick={handleSubmit(onSubmit)}
              >
                {isPending ? t("common.saving") : t("editEvent.saveChanges")}
              </Button>
            </>
          )}
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">{t("adminVenue.deleteVenue")}</h3>
            <p className="mt-2 text-sm text-gray-600">
              {t("adminVenue.deleteConfirm")} <strong>{venue?.name}</strong>{t("adminVenue.deleteWarning")}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? t("common.deleting") : t("adminVenue.deleteVenue")}
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
                    {t("adminVenue.profileEyebrow")}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {venue.name}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                    {t("adminVenue.profileDesc")}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                      {venueTypeLabel ?? t("adminVenue.typeNotSpecified")}
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
                        {t("createVenue.venueType")}
                      </p>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {venueTypeLabel ?? t("common.notSet")}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
                    <div className="flex items-center gap-2 text-teal-100">
                      <MapPinIcon className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                        {t("adminVenue.geoStatus")}
                      </p>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {hasCoordinatePreview ? t("adminVenue.coordinatesSet") : t("adminVenue.mapPending")}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 text-teal-100">
                      <CalendarIcon className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                        {t("adminVenue.added")}
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
                    eyebrow={t("adminVenue.overviewEyebrow")}
                    title={t("adminVenue.overviewTitle")}
                    description={t("adminVenue.overviewDesc")}
                  />

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <DetailBlock
                      icon={BuildingIcon}
                      label={t("createVenue.venueName")}
                      value={venue.name}
                    />
                    <DetailBlock
                      icon={SettingsIcon}
                      label={t("createVenue.venueType")}
                      value={venueTypeLabel ?? t("common.notSet")}
                    />
                    {venue.capacity && (
                      <DetailBlock
                        icon={BuildingIcon}
                        label={t("createVenue.capacityLabel")}
                        value={venue.capacity.toLocaleString()}
                      />
                    )}
                  </div>
                </Card>

                <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-teal-50/50 shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={MapPinIcon}
                    eyebrow={t("adminVenue.locationEyebrow")}
                    title={t("adminVenue.locationTitle")}
                    description={t("adminVenue.locationDesc")}
                  />

                  <div className="mt-6 grid gap-4">
                    <DetailBlock
                      icon={HomeIcon}
                      label={t("adminVenue.streetAddress")}
                      value={venue.address ?? t("adminVenue.noStreetAddress")}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailBlock
                        icon={MapPinIcon}
                        label={t("adminVenue.area")}
                        value={locationSummary}
                      />
                      <DetailBlock
                        icon={MapPinIcon}
                        label={t("adminVenue.coordinates")}
                        value={hasCoordinatePreview ? `${lat}, ${lng}` : t("adminVenue.coordinatesNotSet")}
                        hint={hasCoordinatePreview ? t("adminVenue.coordinatesHint") : undefined}
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="rounded-[2rem] border border-gray-200/80 bg-white shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={MapPinIcon}
                    eyebrow={t("adminVenue.previewEyebrow")}
                    title={t("adminVenue.mapView")}
                    description={t("adminVenue.mapViewDesc")}
                  />

                  {lat && lng ? (
                    <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white">
                      <iframe
                        title={t("adminVenue.venueLocation")}
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
                        {t("adminVenue.noPreview")}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {t("adminVenue.noPreviewHint")}
                      </p>
                    </div>
                  )}
                </Card>

                <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-slate-50 via-white to-white shadow-lg shadow-gray-100">
                  <SectionHeader
                    icon={CalendarIcon}
                    eyebrow={t("adminVenue.metadataEyebrow")}
                    title={t("adminVenue.systemInfo")}
                    description={t("adminVenue.systemInfoDesc")}
                  />

                  <div className="mt-6 space-y-4">
                    <DetailBlock
                      icon={CalendarIcon}
                      label={t("adminVenue.created")}
                      value={formattedCreatedAt}
                    />
                    <DetailBlock
                      icon={SettingsIcon}
                      label={t("adminVenue.venueId")}
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
                      {t("adminVenue.editingEyebrow")}
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                      {t("adminVenue.editTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {t("adminVenue.editDesc")}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-600">
                  {t("adminVenue.currentLocation")} <span className="font-medium text-gray-900">{locationSummary}</span>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
              <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
                <SectionHeader
                  icon={BuildingIcon}
                  eyebrow={t("adminVenue.profileSection")}
                  title={t("adminVenue.profileSectionTitle")}
                  description={t("adminVenue.profileSectionDesc")}
                />
                <div className="mt-6 space-y-4">
                  <Input
                    label={t("createVenue.venueName")}
                    placeholder={t("createVenue.venueNamePlaceholder")}
                    error={errors.name?.message}
                    {...register("name")}
                  />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select
                      label={t("createVenue.venueType")}
                      options={[
                        { value: "", label: t("createVenue.selectType") },
                        { value: "club", label: t("createVenue.typeClub") },
                        { value: "bar", label: t("createVenue.typeBar") },
                        { value: "restaurant", label: t("createVenue.typeRestaurant") },
                        { value: "concert_hall", label: t("createVenue.typeConcertHall") },
                        { value: "outdoor", label: t("createVenue.typeOutdoor") },
                        { value: "hotel", label: t("createVenue.typeHotel") },
                        { value: "conference_center", label: t("createVenue.typeConference") },
                        { value: "stadium", label: t("createVenue.typeStadium") },
                        { value: "theater", label: t("createVenue.typeTheater") },
                        { value: "other", label: t("createVenue.typeOther") },
                      ]}
                      error={errors.venue_type?.message}
                      {...register("venue_type")}
                    />
                    <Input
                      label={t("createVenue.capacityLabel")}
                      placeholder={t("createVenue.capacityPlaceholder")}
                      type="number"
                      min="1"
                      {...register("capacity")}
                    />
                  </div>
                </div>
              </Card>

              <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-teal-50/50 shadow-lg shadow-gray-100">
                <SectionHeader
                  icon={MapPinIcon}
                  eyebrow={t("adminVenue.locationSection")}
                  title={t("adminVenue.locationSectionTitle")}
                  description={t("adminVenue.locationSectionDesc")}
                />
                <div className="mt-6 space-y-4">
                  <PlacesAutocomplete
                    label={t("adminVenue.searchNewLocation")}
                    placeholder={t("createVenue.searchPlaceholder")}
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
                      {t("adminVenue.locationDetails")}
                    </p>
                    <div className="space-y-4">
                      <Input
                        label={t("createVenue.addressLabel")}
                        placeholder={t("createVenue.addressPlaceholder")}
                        error={errors.address_line1?.message}
                        {...register("address_line1")}
                      />
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                          label={t("createVenue.cityLabel")}
                          placeholder={t("createVenue.cityPlaceholder")}
                          error={errors.city?.message}
                          {...register("city")}
                        />
                        <Input
                          label={t("createVenue.regionLabel")}
                          placeholder={t("createVenue.regionPlaceholder")}
                          error={errors.region?.message}
                          {...register("region")}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                          label={t("createVenue.countryLabel")}
                          placeholder={t("createVenue.countryPlaceholder")}
                          error={errors.country_code?.message}
                          {...register("country_code")}
                        />
                        <Input
                          label={t("createVenue.postalLabel")}
                          placeholder={t("createVenue.postalPlaceholder")}
                          error={errors.postal_code?.message}
                          {...register("postal_code")}
                        />
                      </div>
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
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isPending || !isDirty}
              >
                {isPending ? t("common.saving") : t("editEvent.saveChanges")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
}
