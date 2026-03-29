"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import {
  CalendarIcon,
  MapPinIcon,
  DollarIcon,
  SettingsIcon,
  MailIcon,
  EditIcon,
  PlusIcon,
  EyeIcon,
} from "@/components/icons";
import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createEventAction,
  uploadEventImageAction,
  fetchTagsForSelect,
  type CreateEventResult,
} from "@/lib/actions/events";
import { fetchVenuesForSelect } from "@/lib/actions/venues";
import Link from "next/link";
import Image from "next/image";
import type { ComponentType, SVGProps } from "react";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Zod Schema (mirrors server-side for client validation)
// ---------------------------------------------------------------------------

const ticketTierSchema = z.object({
  name: z.string().min(1, "Ticket name is required"),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  description: z.string().optional(),
  capacity: z.union([z.coerce.number().int().positive(), z.literal(""), z.undefined()]).optional(),
  is_free: z.boolean().optional(),
  free_for_ladies: z.boolean().optional(),
});

const createEventFormSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  heroImageUrl: z.string().optional().or(z.literal("")),
  eventDate: z.string().min(1, "Event date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  venueId: z.string().optional().or(z.literal("")),
  ticketTiers: z.array(ticketTierSchema).min(1, "At least one ticket tier is required"),
  currency: z.string(),
  tagIds: z.array(z.string()).optional(),
  publishEvent: z.boolean(),
  waitlistEnabled: z.boolean().optional(),
  approvalMode: z.enum(["auto", "manual"]).optional(),
  sharingEnabled: z.boolean().optional(),
  contactEmail: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  contactPhone: z.string().optional(),
}).refine(
  (data) => {
    if (data.eventDate && data.startTime) {
      const startDateTime = new Date(`${data.eventDate}T${data.startTime}`);
      if (startDateTime <= new Date()) {
        return false;
      }
    }
    return true;
  },
  {
    message: "Event start date and time must be in the future",
    path: ["eventDate"],
  }
).refine(
  (data) => {
    if (data.eventDate && data.startTime && data.endTime) {
      const endDate = resolveEventEndDate(data.endDate, data.eventDate);
      const startDateTime = new Date(`${data.eventDate}T${data.startTime}`);
      const endDateTime = new Date(`${endDate}T${data.endTime}`);
      const diffMs = endDateTime.getTime() - startDateTime.getTime();
      const thirtyMinMs = 30 * 60 * 1000;
      if (diffMs < thirtyMinMs) {
        return false;
      }
    }
    return true;
  },
  {
    message: "End date/time must be at least 30 minutes after start date/time",
    path: ["endTime"],
  }
);

type CreateEventFormValues = z.infer<typeof createEventFormSchema>;

function resolveEventEndDate(endDate: string | undefined, eventDate: string) {
  if (endDate) return endDate;
  return eventDate;
}

function getNestedValue(value: unknown, key: string) {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}

// ---------------------------------------------------------------------------
// Shared UI pieces
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CreateEventPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [venues, setVenues] = useState<Array<{ id: string; name: string; city: string | null }>>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [tags, setTags] = useState<Array<{ id: string; label: string; type: string }>>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [locale, setLocale] = useState<Locale>("fr");

  useEffect(() => {
    setLocale(getClientLocale());
  }, []);

  useEffect(() => {
    fetchVenuesForSelect()
      .then((data) => setVenues(data))
      .catch(() => setVenues([]))
      .finally(() => setVenuesLoading(false));
    fetchTagsForSelect()
      .then((data) => setTags(data))
      .catch(() => setTags([]))
      .finally(() => setTagsLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      eventDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      venueId: "",
      ticketTiers: [{ name: "Standard", price: 0, description: "", capacity: "" as unknown as undefined }],
      currency: "USD",
      tagIds: [],
      publishEvent: false,
      contactEmail: "",
      contactPhone: "",
      heroImageUrl: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ticketTiers",
  });

  const publishEvent = watch("publishEvent");
  const eventDate = watch("eventDate");

  const todayStr = new Date().toISOString().split("T")[0];
  const minEndDate = eventDate || todayStr;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageError(null);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadEventImageAction(formData);
      if (result.success) {
        setValue("heroImageUrl", result.url);
      } else {
        setImageError(result.error);
        setImagePreview(null);
        setValue("heroImageUrl", "");
      }
    } catch {
      setImageError("Failed to upload image. Please try again.");
      setImagePreview(null);
      setValue("heroImageUrl", "");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setValue("heroImageUrl", "");
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = (data: CreateEventFormValues) => {
    setServerError(null);
    startTransition(async () => {
      try {
        const result: CreateEventResult = await createEventAction({
          ...data,
          tagIds: selectedTagIds,
          waitlistEnabled: data.waitlistEnabled ?? false,
          approvalMode: data.approvalMode ?? "auto",
          sharingEnabled: data.sharingEnabled ?? true,
          ticketTiers: data.ticketTiers.map((t) => ({
            ...t,
            capacity: typeof t.capacity === "number" ? t.capacity : undefined,
            is_free: t.is_free ?? false,
            free_for_ladies: t.free_for_ladies ?? false,
          })),
        });

        if (result.success) {
          router.push(`/events/${result.eventId}`);
        } else {
          setServerError(result.error);
        }
      } catch {
        setServerError("An unexpected error occurred. Please try again.");
      }
    });
  };

  const fieldError = (path: string): string | undefined => {
    const parts = path.split(".");
    let current: unknown = errors;
    for (const part of parts) {
      current = getNestedValue(current, part);
      if (current === undefined) return undefined;
    }
    const message = getNestedValue(current, "message");
    return typeof message === "string" ? message : undefined;
  };

  const venueOptions = [
    { value: "", label: venuesLoading ? translate(locale, "createEvent.loadingVenues") : translate(locale, "createEvent.selectVenue") },
    ...venues.map((v) => ({
      value: v.id,
      label: v.city ? `${v.name} — ${v.city}` : v.name,
    })),
  ];

  return (
    <MainLayout>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-4xl space-y-6"
      >
        {/* Hero Header */}
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-8 text-white shadow-xl shadow-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.22),_transparent_34%)]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
                <PlusIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/75">
                  {translate(locale, "createEvent.eyebrow")}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {translate(locale, "createEvent.title")}
                </h1>
                <p className="mt-1 max-w-lg text-sm text-slate-300">
                  {translate(locale, "createEvent.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => router.push("/events")}
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                {translate(locale, "common.cancel")}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSubmit(onSubmit)}
                className="cursor-pointer rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-950 shadow-sm transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                {isPending ? translate(locale, "common.saving") : translate(locale, "createEvent.saveEvent")}
              </button>
            </div>
          </div>
        </section>
        {/* Server Error */}
        {serverError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Event Image */}
        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
          <SectionHeader
            icon={EyeIcon}
            eyebrow={translate(locale, "createEvent.mediaEyebrow")}
            title={translate(locale, "createEvent.eventImage")}
            description={translate(locale, "createEvent.eventImageDesc")}
          />
          <div className="mt-6 flex items-center gap-5">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
              {imagePreview ? (
                <>
                  <Image
                    src={imagePreview}
                    alt="Event preview"
                    fill
                    className="object-cover"
                  />
                  {isUploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <PlusIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                className="hidden"
                id="event-image-input"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? translate(locale, "createEvent.uploading") : imagePreview ? translate(locale, "createEvent.changeImage") : translate(locale, "createEvent.chooseImage")}
                </Button>
                {imagePreview && !isUploadingImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-red-600 hover:text-red-700"
                  >
                    {translate(locale, "common.remove")}
                  </Button>
                )}
              </div>
              {imageError && (
                <p className="mt-2 text-sm text-red-600">{imageError}</p>
              )}
              <p className="mt-2 text-sm text-gray-500">
                {translate(locale, "createEvent.uploadHint")}
              </p>
              <p className="text-xs text-gray-400">
                {translate(locale, "createEvent.uploadSize")}
              </p>
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
          <SectionHeader
            icon={EditIcon}
            eyebrow={translate(locale, "createEvent.detailsEyebrow")}
            title={translate(locale, "createEvent.eventDetails")}
            description={translate(locale, "createEvent.eventDetailsDesc")}
          />
          <div className="mt-6 space-y-4">
            <Input
              label={translate(locale, "createEvent.eventTitle")}
              placeholder={translate(locale, "createEvent.eventTitlePlaceholder")}
              error={errors.title?.message}
              {...register("title")}
            />
            <Textarea
              label={translate(locale, "createEvent.descriptionLabel")}
              placeholder={translate(locale, "createEvent.descriptionPlaceholder")}
              rows={4}
              error={errors.description?.message}
              {...register("description")}
            />
            <Select
              label={translate(locale, "createEvent.categoryLabel")}
              options={[
                { value: "", label: translate(locale, "createEvent.selectCategory") },
                { value: "music", label: translate(locale, "createEvent.catMusic") },
                { value: "food", label: translate(locale, "createEvent.catFood") },
                { value: "business", label: translate(locale, "createEvent.catBusiness") },
                { value: "sports", label: translate(locale, "createEvent.catSports") },
                { value: "other", label: translate(locale, "createEvent.catOther") },
              ]}
              error={errors.category?.message}
              {...register("category")}
            />

            {/* Tags Multi-Select */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {translate(locale, "createEvent.tagsLabel")}
              </label>
              {tagsLoading ? (
                <p className="text-sm text-gray-400">{translate(locale, "createEvent.loadingTags")}</p>
              ) : tags.length === 0 ? (
                <p className="text-sm text-gray-400">{translate(locale, "createEvent.noTags")}</p>
              ) : (
                <>
                  {selectedTagIds.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {selectedTagIds.map((tagId) => {
                        const tag = tags.find((t) => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <span
                            key={tagId}
                            className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white"
                          >
                            {tag.label}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTagIds((prev) =>
                                  prev.filter((id) => id !== tagId)
                                )
                              }
                              className="ml-0.5 hover:text-gray-300"
                            >
                              &times;
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <select
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !selectedTagIds.includes(val)) {
                        setSelectedTagIds((prev) => [...prev, val]);
                      }
                    }}
                  >
                    <option value="">{translate(locale, "createEvent.addTag")}</option>
                    {tags
                      .filter((t) => !selectedTagIds.includes(t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                  </select>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
          <SectionHeader
            icon={CalendarIcon}
            eyebrow={translate(locale, "createEvent.scheduleEyebrow")}
            title={translate(locale, "createEvent.dateTime")}
            description={translate(locale, "createEvent.dateTimeDesc")}
          />
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={translate(locale, "createEvent.eventDate")}
              type="date"
              min={todayStr}
              error={errors.eventDate?.message}
              {...register("eventDate")}
            />
            <Input
              label={translate(locale, "createEvent.startTime")}
              type="time"
              error={errors.startTime?.message}
              {...register("startTime")}
            />
            <Input
              label={translate(locale, "createEvent.endDateOptional")}
              type="date"
              min={minEndDate}
              error={errors.endDate?.message}
              {...register("endDate")}
            />
            <Input
              label={translate(locale, "createEvent.endTimeOptional")}
              type="time"
              error={errors.endTime?.message}
              {...register("endTime")}
            />
          </div>
          <p className="mt-3 text-xs text-gray-400">
            {translate(locale, "createEvent.endTimeHint")}
          </p>
        </div>

        {/* Location */}
        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
          <SectionHeader
            icon={MapPinIcon}
            eyebrow={translate(locale, "createEvent.locationEyebrow")}
            title={translate(locale, "createEvent.venueTitle")}
            description={translate(locale, "createEvent.venueDesc")}
          />
          <div className="mt-6 space-y-4">
            <Select
              label={translate(locale, "createEvent.venueTitle")}
              options={venueOptions}
              error={errors.venueId?.message}
              {...register("venueId")}
            />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{translate(locale, "createEvent.noVenueHint")}</span>
              <Link
                href="/venues/create"
                className="font-medium text-gray-900 underline hover:text-gray-700"
              >
                {translate(locale, "createEvent.createVenue")}
              </Link>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
          <SectionHeader
            icon={DollarIcon}
            eyebrow={translate(locale, "createEvent.pricingEyebrow")}
            title={translate(locale, "createEvent.ticketsPricing")}
            description={translate(locale, "createEvent.ticketsPricingDesc")}
          />

          <div className="mt-6 mb-4">
            <Select
              label={translate(locale, "createEvent.currency")}
              options={[
                { value: "USD", label: "USD ($)" },
                { value: "EUR", label: "EUR (€)" },
                { value: "GBP", label: "GBP (£)" },
                { value: "MAD", label: "MAD (د.م.)" },
              ]}
              error={errors.currency?.message}
              {...register("currency")}
            />
          </div>

          {errors.ticketTiers?.message && (
            <p className="mb-3 text-sm text-red-600">{errors.ticketTiers.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-2xl border border-gray-200 bg-gray-50/50 p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-900 text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <h3 className="font-medium text-gray-900">
                      {translate(locale, "createEvent.ticketTier")} {index + 1}
                    </h3>
                  </div>
                  {fields.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      {translate(locale, "common.remove")}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={translate(locale, "createEvent.ticketName")}
                    placeholder={translate(locale, "createEvent.ticketNamePlaceholder")}
                    error={fieldError(`ticketTiers.${index}.name`)}
                    {...register(`ticketTiers.${index}.name`)}
                  />
                  <Input
                    label={translate(locale, "createEvent.priceLabel")}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    min="0"
                    error={fieldError(`ticketTiers.${index}.price`)}
                    {...register(`ticketTiers.${index}.price`)}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Input
                    label={translate(locale, "createEvent.descOptional")}
                    placeholder={translate(locale, "createEvent.descOptionalPlaceholder")}
                    {...register(`ticketTiers.${index}.description`)}
                  />
                  <Input
                    label={translate(locale, "createEvent.capacityOptional")}
                    placeholder="e.g., 100"
                    type="number"
                    min="1"
                    {...register(`ticketTiers.${index}.capacity`)}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      {...register(`ticketTiers.${index}.is_free`)}
                    />
                    {translate(locale, "createEvent.freeTicket")}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      {...register(`ticketTiers.${index}.free_for_ladies`)}
                    />
                    {translate(locale, "createEvent.freeForLadies")}
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                append({
                  name: "",
                  price: 0,
                  description: "",
                  capacity: "" as unknown as undefined,
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
            >
              <PlusIcon className="h-4 w-4" />
              {translate(locale, "createEvent.addTicketTier")}
            </button>
          </div>
        </div>

        {/* Event Settings */}
        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
          <SectionHeader
            icon={SettingsIcon}
            eyebrow={translate(locale, "createEvent.configEyebrow")}
            title={translate(locale, "createEvent.eventSettings")}
            description={translate(locale, "createEvent.eventSettingsDesc")}
          />
          <div className="mt-6 space-y-5">
            <Toggle
              label={translate(locale, "createEvent.publishEvent")}
              checked={publishEvent}
              onChange={(checked) => setValue("publishEvent", checked)}
            />
            <div className="border-t border-gray-100 pt-5">
              <Toggle
                label={translate(locale, "createEvent.enableWaitlist")}
                checked={watch("waitlistEnabled") ?? false}
                onChange={(checked) => setValue("waitlistEnabled", checked)}
              />
              <p className="mt-1 ml-11 text-xs text-gray-500">{translate(locale, "createEvent.waitlistHint")}</p>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <Toggle
                label={translate(locale, "createEvent.enableSharing")}
                checked={watch("sharingEnabled") ?? true}
                onChange={(checked) => setValue("sharingEnabled", checked)}
              />
              <p className="mt-1 ml-11 text-xs text-gray-500">{translate(locale, "createEvent.sharingHint")}</p>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {translate(locale, "createEvent.approvalMode")}
              </label>
              <select
                value={watch("approvalMode") ?? "auto"}
                onChange={(e) => setValue("approvalMode", e.target.value as "auto" | "manual")}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              >
                <option value="auto">{translate(locale, "createEvent.autoApprove")}</option>
                <option value="manual">{translate(locale, "createEvent.manualApprove")}</option>
              </select>
              <p className="mt-1.5 text-xs text-gray-500">{translate(locale, "createEvent.approvalHint")}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 sm:p-8">
          <SectionHeader
            icon={MailIcon}
            eyebrow={translate(locale, "createEvent.supportEyebrow")}
            title={translate(locale, "createEvent.contactInfo")}
            description={translate(locale, "createEvent.contactInfoDesc")}
          />
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={translate(locale, "createEvent.contactEmail")}
              type="email"
              placeholder="event@example.com"
              error={errors.contactEmail?.message}
              {...register("contactEmail")}
            />
            <Input
              label={translate(locale, "createEvent.contactPhone")}
              type="tel"
              placeholder="+33 1 23 45 67 89"
              error={errors.contactPhone?.message}
              {...register("contactPhone")}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pb-6">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push("/events")}
          >
            {translate(locale, "common.cancel")}
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? translate(locale, "common.saving") : translate(locale, "createEvent.saveEvent")}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
