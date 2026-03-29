"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import {
  BuildingIcon,
  CalendarIcon,
  DollarIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SettingsIcon,
  StarIcon,
} from "@/components/icons";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import {
  useState,
  useEffect,
  useTransition,
  useRef,
  use,
  type ComponentType,
  type SVGProps,
} from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  updateEventAction,
  deleteEventAction,
  uploadEventImageAction,
  fetchEventForEdit,
  fetchTagsForSelect,
  type UpdateEventResult,
} from "@/lib/actions/events";
import { fetchVenuesForSelect } from "@/lib/actions/venues";
import Link from "next/link";
import Image from "next/image";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const ticketTierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Ticket name is required"),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  description: z.string().optional(),
  capacity: z.union([z.coerce.number().int().positive(), z.literal(""), z.undefined()]).optional(),
  is_free: z.boolean().optional(),
  free_for_ladies: z.boolean().optional(),
});

const eventPolicySchema = z.object({
  title: z.string().min(1, "Policy title is required"),
  description: z.string().min(1, "Policy description is required"),
});

const editEventFormSchema = z.object({
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
  policies: z.array(eventPolicySchema).optional(),
  contactEmail: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  contactPhone: z.string().optional(),
});

type EditEventFormValues = z.infer<typeof editEventFormSchema>;

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

function SummaryCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${accentClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);
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
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EditEventFormValues>({
    resolver: zodResolver(editEventFormSchema),
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
      publishEvent: false,
      policies: [],
      contactEmail: "",
      contactPhone: "",
      heroImageUrl: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "ticketTiers",
  });

  const { fields: policyFields, append: appendPolicy, remove: removePolicy } = useFieldArray({
    control,
    name: "policies",
  });

  const publishEvent = watch("publishEvent");
  const eventDate = watch("eventDate");
  const titleValue = watch("title");
  const categoryValue = watch("category");
  const venueIdValue = watch("venueId");
  const ticketTiers = watch("ticketTiers");

  // Fetch event data, venues, and tags on mount
  useEffect(() => {
    Promise.all([
      fetchEventForEdit(eventId),
      fetchVenuesForSelect(),
      fetchTagsForSelect(),
    ])
      .then(([eventData, venueData, tagData]) => {
        setVenues(venueData);
        setTags(tagData);

        const startsAtDate = eventData.startsAt ? new Date(eventData.startsAt) : null;
        const endsAtDate = eventData.endsAt ? new Date(eventData.endsAt) : null;

        const formValues: EditEventFormValues = {
          title: eventData.title,
          description: eventData.description,
          category: eventData.category,
          heroImageUrl: eventData.heroImageUrl,
          eventDate: startsAtDate ? startsAtDate.toISOString().slice(0, 10) : "",
          startTime: startsAtDate ? startsAtDate.toTimeString().slice(0, 5) : "",
          endDate: endsAtDate ? endsAtDate.toISOString().slice(0, 10) : "",
          endTime: endsAtDate ? endsAtDate.toTimeString().slice(0, 5) : "",
          venueId: eventData.venueId,
          ticketTiers: eventData.ticketTypes.length > 0
            ? eventData.ticketTypes.map((tt) => ({
                id: tt.id,
                name: tt.name,
                price: tt.price_cents / 100,
                description: tt.description ?? "",
                capacity: tt.capacity ?? ("" as unknown as undefined),
                is_free: tt.is_free ?? false,
                free_for_ladies: tt.free_for_ladies ?? false,
              }))
            : [{ name: "Standard", price: 0, description: "", capacity: "" as unknown as undefined, is_free: false, free_for_ladies: false }],
          currency: eventData.currency,
          tagIds: eventData.tagIds,
          publishEvent: eventData.status === "published",
          waitlistEnabled: eventData.waitlistEnabled ?? false,
          approvalMode: (eventData.approvalMode as "auto" | "manual") ?? "auto",
          sharingEnabled: eventData.sharingEnabled ?? true,
          policies: eventData.policies ?? [],
          contactEmail: "",
          contactPhone: "",
        };

        reset(formValues);
        setSelectedTagIds(eventData.tagIds ?? []);

        if (eventData.heroImageUrl) {
          setImagePreview(eventData.heroImageUrl);
        }
      })
      .catch((err) => {
        console.error("Failed to load event:", err);
        setServerError(translate(locale, "editEvent.failedToLoad"));
      })
      .finally(() => {
        setLoading(false);
        setVenuesLoading(false);
        setTagsLoading(false);
      });
  }, [eventId, reset]);

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
      setImageError(translate(locale, "editEvent.failedToUpload"));
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: EditEventFormValues) => {
    setServerError(null);
    startTransition(async () => {
      try {
        const result: UpdateEventResult = await updateEventAction(eventId, {
          ...data,
          tagIds: selectedTagIds,
          waitlistEnabled: data.waitlistEnabled ?? false,
          approvalMode: data.approvalMode ?? "auto",
          sharingEnabled: data.sharingEnabled ?? true,
          policies: data.policies ?? [],
          ticketTiers: data.ticketTiers.map((t) => ({
            ...t,
            capacity: typeof t.capacity === "number" ? t.capacity : undefined,
            is_free: t.is_free ?? false,
            free_for_ladies: t.free_for_ladies ?? false,
          })),
        });

        if (result.success) {
          router.push(`/events/${eventId}`);
        } else {
          setServerError(result.error);
        }
      } catch {
        setServerError(translate(locale, "editEvent.unexpectedError"));
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteEventAction(eventId);
        if (result.success) {
          router.push("/events");
        } else {
          setServerError(result.error);
          setShowDeleteConfirm(false);
        }
      } catch {
        setServerError(translate(locale, "editEvent.failedToDelete"));
        setShowDeleteConfirm(false);
      }
    });
  };

  const fieldError = (path: string): string | undefined => {
    const parts = path.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = errors;
    for (const part of parts) {
      if (!current) return undefined;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      current = current[part];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return current?.message as string | undefined;
  };

  const venueOptions = [
    { value: "", label: venuesLoading ? translate(locale, "editEvent.loadingVenues") : translate(locale, "editEvent.selectVenue") },
    ...venues.map((v) => ({
      value: v.id,
      label: v.city ? `${v.name} — ${v.city}` : v.name,
    })),
  ];

  const todayStr = new Date().toISOString().split("T")[0];
  const minEndDate = eventDate || todayStr;
  const selectedVenue = venues.find((venue) => venue.id === venueIdValue);
  const selectedVenueLabel = selectedVenue
    ? selectedVenue.city
      ? `${selectedVenue.name} - ${selectedVenue.city}`
      : selectedVenue.name
    : translate(locale, "editEvent.venueNotSelected");
  const scheduleLabel = eventDate || translate(locale, "editEvent.dateNotSet");
  const categoryDisplay = categoryValue?.trim() ? categoryValue : undefined;

  if (loading) {
    return (
      <MainLayout>
        <h1 className="mb-6 text-2xl font-semibold text-gray-900">{translate(locale, "editEvent.loading")}</h1>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-green-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{translate(locale, "editEvent.saveChanges")}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.push(`/events/${eventId}`)}
          >
            {translate(locale, "editEvent.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            {isPending ? translate(locale, "common.saving") : translate(locale, "editEvent.saveChanges")}
          </Button>
        </div>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-7xl space-y-6"
      >
        {/* Server Error */}
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-8 text-white shadow-xl shadow-slate-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.22),_transparent_34%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/75">
                {translate(locale, "editEvent.editorTitle")}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {titleValue || translate(locale, "editEvent.untitledEvent")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                {translate(locale, "editEvent.editorSubtitle")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {categoryDisplay ?? translate(locale, "editEvent.categoryNotSelected")}
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {publishEvent ? translate(locale, "editEvent.published") : translate(locale, "editEvent.draft")}
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {selectedTagIds.length} {translate(locale, "editEvent.tagsSelected")}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <SummaryCard
                icon={CalendarIcon}
                label={translate(locale, "editEvent.scheduleEyebrow")}
                value={scheduleLabel}
                accentClass="bg-sky-50 text-sky-700"
              />
              <SummaryCard
                icon={MapPinIcon}
                label={translate(locale, "editEvent.venue")}
                value={selectedVenueLabel}
                accentClass="bg-emerald-50 text-emerald-700"
              />
              <SummaryCard
                icon={DollarIcon}
                label={translate(locale, "editEvent.currency")}
                value={watch("currency")}
                accentClass="bg-amber-50 text-amber-700"
              />
              <SummaryCard
                icon={StarIcon}
                label={translate(locale, "editEvent.ticketTier")}
                value={`${ticketTiers.length}`}
                accentClass="bg-rose-50 text-rose-700"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={BuildingIcon}
              eyebrow={translate(locale, "editEvent.contentEyebrow")}
              title={translate(locale, "editEvent.contentTitle")}
              description={translate(locale, "editEvent.contentDesc")}
            />
            <div className="mt-6 space-y-4">
              <Input label={translate(locale, "editEvent.eventTitle")} placeholder="e.g., Summer Jazz Night" error={errors.title?.message} {...register("title")} />
              <Textarea label={translate(locale, "editEvent.description")} placeholder={translate(locale, "editEvent.descriptionPlaceholder")} rows={5} error={errors.description?.message} {...register("description")} />
              <Select
                label={translate(locale, "editEvent.category")}
                options={[
                  { value: "", label: translate(locale, "editEvent.selectCategory") },
                  { value: "music", label: "Music" },
                  { value: "food", label: "Food & Drink" },
                  { value: "business", label: "Business" },
                  { value: "sports", label: "Sports" },
                  { value: "other", label: "Other" },
                ]}
                error={errors.category?.message}
                {...register("category")}
              />

              <div className="rounded-3xl border border-gray-200 bg-white/80 p-5">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {translate(locale, "editEvent.tags")}
                </label>
                {tagsLoading ? (
                  <p className="text-sm text-gray-400">{translate(locale, "editEvent.loadingTags")}</p>
                ) : tags.length === 0 ? (
                  <p className="text-sm text-gray-400">{translate(locale, "editEvent.noTagsAvailable")}</p>
                ) : (
                  <>
                    {selectedTagIds.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {selectedTagIds.map((tagId) => {
                          const tag = tags.find((t) => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <span
                              key={tagId}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
                            >
                              {tag.label}
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedTagIds((prev) =>
                                    prev.filter((currentId) => currentId !== tagId)
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
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && !selectedTagIds.includes(val)) {
                          setSelectedTagIds((prev) => [...prev, val]);
                        }
                      }}
                    >
                      <option value="">{translate(locale, "editEvent.addTag")}</option>
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
          </Card>

          <Card className="rounded-[2rem] border border-gray-200/80 bg-white shadow-lg shadow-gray-100">
            <SectionHeader
              icon={StarIcon}
              eyebrow={translate(locale, "editEvent.mediaEyebrow")}
              title={translate(locale, "editEvent.mediaTitle")}
              description={translate(locale, "editEvent.mediaDesc")}
            />
            <div className="mt-6 space-y-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border-2 border-dashed border-gray-300 bg-gray-50">
                {imagePreview ? (
                  <>
                    <Image src={imagePreview} alt="Event preview" fill className="object-cover" />
                    {isUploadingImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-200 text-3xl">
                      +
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-500">
                      {translate(locale, "editEvent.noImageSelected")}
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                className="hidden"
                id="event-image-input"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}>
                  {isUploadingImage ? translate(locale, "editEvent.uploading") : imagePreview ? translate(locale, "editEvent.changeImage") : translate(locale, "editEvent.chooseImage")}
                </Button>
                {imagePreview && !isUploadingImage && (
                  <Button variant="ghost" size="sm" type="button" onClick={handleRemoveImage} className="text-red-600 hover:text-red-700">
                    {translate(locale, "editEvent.remove")}
                  </Button>
                )}
              </div>
              {imageError && <p className="text-sm text-red-600">{imageError}</p>}
              <p className="text-sm text-gray-500">{translate(locale, "editEvent.uploadHint")}</p>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={CalendarIcon}
              eyebrow={translate(locale, "editEvent.scheduleEyebrow")}
              title={translate(locale, "editEvent.scheduleTitle")}
              description={translate(locale, "editEvent.scheduleDesc")}
            />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label={translate(locale, "editEvent.eventDate")} type="date" error={errors.eventDate?.message} {...register("eventDate")} />
              <Input label={translate(locale, "editEvent.startTime")} type="time" error={errors.startTime?.message} {...register("startTime")} />
              <Input label={translate(locale, "editEvent.endDateOptional")} type="date" min={minEndDate} error={errors.endDate?.message} {...register("endDate")} />
              <Input label={translate(locale, "editEvent.endTimeOptional")} type="time" error={errors.endTime?.message} {...register("endTime")} />
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-teal-50/50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={MapPinIcon}
              eyebrow={translate(locale, "editEvent.locationEyebrow")}
              title={translate(locale, "editEvent.locationTitle")}
              description={translate(locale, "editEvent.locationDesc")}
            />
            <div className="mt-6 space-y-4">
              <Select label={translate(locale, "editEvent.venue")} options={venueOptions} error={errors.venueId?.message} {...register("venueId")} />
              <div className="rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-600">
                {translate(locale, "editEvent.dontSeeVenue")}{" "}
                <Link href="/venues/create" className="font-medium text-gray-900 underline hover:text-gray-700">
                  {translate(locale, "editEvent.createNewVenue")}
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-amber-50/50 shadow-lg shadow-gray-100">
          <SectionHeader
            icon={DollarIcon}
            eyebrow={translate(locale, "editEvent.pricingEyebrow")}
            title={translate(locale, "editEvent.pricingTitle")}
            description={translate(locale, "editEvent.pricingDesc")}
          />
          <div className="mt-6">
            <div className="max-w-xs">
              <Select
                label={translate(locale, "editEvent.currency")}
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
              <p className="mt-4 text-sm text-red-600">{errors.ticketTiers.message}</p>
            )}

            <div className="mt-6 space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-[1.5rem] border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                        {translate(locale, "editEvent.ticketTier")}
                      </p>
                      <h3 className="mt-1 font-semibold text-gray-900">{translate(locale, "editEvent.tier")} {index + 1}</h3>
                    </div>
                    {fields.length > 1 && (
                      <Button variant="ghost" size="sm" type="button" onClick={() => remove(index)}>
                        {translate(locale, "editEvent.remove")}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <input type="hidden" {...register(`ticketTiers.${index}.id`)} />
                    <Input label={translate(locale, "editEvent.ticketName")} placeholder="e.g., General Admission" error={fieldError(`ticketTiers.${index}.name`)} {...register(`ticketTiers.${index}.name`)} />
                    <Input label={translate(locale, "editEvent.price")} placeholder="0.00" type="number" step="0.01" min="0" error={fieldError(`ticketTiers.${index}.price`)} {...register(`ticketTiers.${index}.price`)} />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input label={translate(locale, "editEvent.descriptionOptional")} placeholder={translate(locale, "editEvent.whatsIncluded")} {...register(`ticketTiers.${index}.description`)} />
                    <Input label={translate(locale, "editEvent.capacityOptional")} placeholder="e.g., 100" type="number" min="1" {...register(`ticketTiers.${index}.capacity`)} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        {...register(`ticketTiers.${index}.is_free`)}
                      />
                      {translate(locale, "editEvent.freeTicket")}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        {...register(`ticketTiers.${index}.free_for_ladies`)}
                      />
                      {translate(locale, "editEvent.freeForLadies")}
                    </label>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => append({ name: "", price: 0, description: "", capacity: "" as unknown as undefined, is_free: false, free_for_ladies: false })}
              >
                {translate(locale, "editEvent.addTicketTier")}
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={SettingsIcon}
              eyebrow={translate(locale, "editEvent.settingsEyebrow")}
              title={translate(locale, "editEvent.settingsTitle")}
              description={translate(locale, "editEvent.settingsDesc")}
            />
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-gray-200 bg-white/80 p-5">
                <Toggle label={translate(locale, "editEvent.publishEvent")} checked={publishEvent} onChange={(checked) => setValue("publishEvent", checked)} />
              </div>
              <div className="rounded-3xl border border-gray-200 bg-white/80 p-5">
                <Toggle
                  label={translate(locale, "editEvent.enableWaitlist")}
                  checked={watch("waitlistEnabled") ?? false}
                  onChange={(checked) => setValue("waitlistEnabled", checked)}
                />
                <p className="mt-1 text-xs text-gray-500">{translate(locale, "editEvent.waitlistHint")}</p>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-white/80 p-5">
                <Toggle
                  label={translate(locale, "editEvent.enableSharing")}
                  checked={watch("sharingEnabled") ?? true}
                  onChange={(checked) => setValue("sharingEnabled", checked)}
                />
                <p className="mt-1 text-xs text-gray-500">{translate(locale, "editEvent.sharingHint")}</p>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-white/80 p-5">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {translate(locale, "editEvent.approvalMode")}
                </label>
                <select
                  value={watch("approvalMode") ?? "auto"}
                  onChange={(e) => setValue("approvalMode", e.target.value as "auto" | "manual")}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="auto">{translate(locale, "editEvent.autoApprove")}</option>
                  <option value="manual">{translate(locale, "editEvent.manualApprove")}</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">{translate(locale, "editEvent.approvalHint")}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={MailIcon}
              eyebrow={translate(locale, "editEvent.contactEyebrow")}
              title={translate(locale, "editEvent.contactTitle")}
              description={translate(locale, "editEvent.contactDesc")}
            />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label={translate(locale, "editEvent.contactEmail")} type="email" placeholder="event@example.com" error={errors.contactEmail?.message} {...register("contactEmail")} />
              <Input label={translate(locale, "editEvent.contactPhone")} type="tel" placeholder="+33 1 23 45 67 89" error={errors.contactPhone?.message} {...register("contactPhone")} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
                <MailIcon className="h-4 w-4" />
                {translate(locale, "editEvent.email")}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
                <PhoneIcon className="h-4 w-4" />
                {translate(locale, "editEvent.phone")}
              </div>
            </div>
          </Card>
        </div>

        {/* Policies */}
        <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
          <SectionHeader
            icon={StarIcon}
            eyebrow={translate(locale, "editEvent.policiesEyebrow")}
            title={translate(locale, "editEvent.policiesTitle")}
            description={translate(locale, "editEvent.policiesDesc")}
          />
          <div className="mt-6 space-y-4">
            {policyFields.map((field, index) => (
              <div key={field.id} className="rounded-[1.5rem] border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">{translate(locale, "editEvent.policy")} {index + 1}</h3>
                  <Button variant="ghost" size="sm" type="button" onClick={() => removePolicy(index)}>
                    {translate(locale, "editEvent.removePolicy")}
                  </Button>
                </div>
                <div className="space-y-4">
                  <Input
                    label={translate(locale, "editEvent.policyTitle")}
                    placeholder={translate(locale, "editEvent.policyTitlePlaceholder")}
                    error={fieldError(`policies.${index}.title`)}
                    {...register(`policies.${index}.title`)}
                  />
                  <Textarea
                    label={translate(locale, "editEvent.policyDescription")}
                    placeholder={translate(locale, "editEvent.policyDescPlaceholder")}
                    rows={3}
                    error={fieldError(`policies.${index}.description`)}
                    {...register(`policies.${index}.description`)}
                  />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => appendPolicy({ title: "", description: "" })}
            >
              {translate(locale, "editEvent.addPolicy")}
            </Button>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {!showDeleteConfirm ? (
              <Button
                variant="ghost"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                {translate(locale, "editEvent.deleteEvent")}
              </Button>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 lg:flex-row lg:items-center">
                <span className="text-sm text-red-700">{translate(locale, "editEvent.deleteConfirm")}</span>
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowDeleteConfirm(false)}>
                  {translate(locale, "editEvent.cancel")}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  disabled={isPending}
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isPending ? translate(locale, "editEvent.deleting") : translate(locale, "editEvent.confirmDelete")}
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => router.push(`/events/${eventId}`)}>
              {translate(locale, "editEvent.cancel")}
            </Button>
            <Button variant="primary" type="submit" disabled={isPending}>
              {isPending ? translate(locale, "common.saving") : translate(locale, "editEvent.saveChanges")}
            </Button>
          </div>
        </div>
      </form>
    </MainLayout>
  );
}
