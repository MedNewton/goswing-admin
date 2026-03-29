"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { LocationMapPicker } from "@/components/ui/LocationMapPicker";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createVenueAction, type VenueActionResult } from "@/lib/actions/venues";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

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
  postal_code: z.string().optional().or(z.literal("")),
  capacity: z.union([z.coerce.number().int().positive(), z.literal(""), z.undefined()]).optional(),
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
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

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
      postal_code: "",
      capacity: "" as unknown as undefined,
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
          postal_code: data.postal_code,
          capacity: typeof data.capacity === "number" ? data.capacity : undefined,
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
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t("createVenue.title")}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.push("/venues")}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {isPending ? t("common.saving") : t("createVenue.saveVenue")}
          </Button>
        </div>
      </div>
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
            {t("createVenue.detailsTitle")}
          </h2>
          <div className="space-y-4">
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

        {/* Location - Google Places */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {t("createVenue.locationTitle")}
          </h2>
          <div className="space-y-4">
            <PlacesAutocomplete
              label={t("createVenue.searchLocation")}
              placeholder={t("createVenue.searchPlaceholder")}
              onPlaceSelect={handlePlaceSelect}
            />

            {/* Show auto-filled location details */}
            {locationSummary && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-medium text-green-700">
                  {t("createVenue.selectedLocation")}
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
                {t("createVenue.editHint")}
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push("/venues")}
          >
            {t("common.cancel")}
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? t("common.saving") : t("createVenue.saveVenue")}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
