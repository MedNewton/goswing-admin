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

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const ticketTierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Ticket name is required"),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  description: z.string().optional(),
  capacity: z.union([z.coerce.number().int().positive(), z.literal(""), z.undefined()]).optional(),
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
              }))
            : [{ name: "Standard", price: 0, description: "", capacity: "" as unknown as undefined }],
          currency: eventData.currency,
          tagIds: eventData.tagIds,
          publishEvent: eventData.status === "published",
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
        setServerError("Failed to load event data.");
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = (data: EditEventFormValues) => {
    setServerError(null);
    startTransition(async () => {
      try {
        const result: UpdateEventResult = await updateEventAction(eventId, {
          ...data,
          tagIds: selectedTagIds,
          ticketTiers: data.ticketTiers.map((t) => ({
            ...t,
            capacity: typeof t.capacity === "number" ? t.capacity : undefined,
          })),
        });

        if (result.success) {
          router.push(`/events/${eventId}`);
        } else {
          setServerError(result.error);
        }
      } catch {
        setServerError("An unexpected error occurred. Please try again.");
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
        setServerError("Failed to delete event.");
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
    { value: "", label: venuesLoading ? "Loading venues..." : "Select a venue (optional)" },
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
    : "Venue not selected";
  const scheduleLabel = eventDate || "Date not set";
  const categoryDisplay = categoryValue.trim() ? categoryValue : undefined;

  if (loading) {
    return (
      <MainLayout title="Edit Event">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-green-500" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Edit Event"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.push(`/events/${eventId}`)}
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
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
    >
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
                Event Editor
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {titleValue || "Untitled event"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
                Update the content, schedule, venue, pricing, and publishing settings before pushing changes live.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {categoryDisplay ?? "Category not selected"}
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {publishEvent ? "Published" : "Draft"}
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                  {selectedTagIds.length} tags selected
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <SummaryCard
                icon={CalendarIcon}
                label="Schedule"
                value={scheduleLabel}
                accentClass="bg-sky-50 text-sky-700"
              />
              <SummaryCard
                icon={MapPinIcon}
                label="Venue"
                value={selectedVenueLabel}
                accentClass="bg-emerald-50 text-emerald-700"
              />
              <SummaryCard
                icon={DollarIcon}
                label="Currency"
                value={watch("currency")}
                accentClass="bg-amber-50 text-amber-700"
              />
              <SummaryCard
                icon={StarIcon}
                label="Ticket Tiers"
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
              eyebrow="Content"
              title="Event Details"
              description="Update the public-facing title, description, category, and tags."
            />
            <div className="mt-6 space-y-4">
              <Input label="Event Title" placeholder="e.g., Summer Jazz Night" error={errors.title?.message} {...register("title")} />
              <Textarea label="Description" placeholder="Describe your event..." rows={5} error={errors.description?.message} {...register("description")} />
              <Select
                label="Category"
                options={[
                  { value: "", label: "Select a category" },
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
                  Tags
                </label>
                {tagsLoading ? (
                  <p className="text-sm text-gray-400">Loading tags...</p>
                ) : tags.length === 0 ? (
                  <p className="text-sm text-gray-400">No tags available</p>
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
                      <option value="">Add a tag...</option>
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
              eyebrow="Media"
              title="Event Image"
              description="Keep the cover image aligned with the event branding and listing card."
            />
            <div className="mt-6 space-y-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border-2 border-dashed border-gray-300 bg-gray-50">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Event preview" className="h-full w-full object-cover" />
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
                      No image selected
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
                  {isUploadingImage ? "Uploading..." : imagePreview ? "Change Image" : "Choose Image"}
                </Button>
                {imagePreview && !isUploadingImage && (
                  <Button variant="ghost" size="sm" type="button" onClick={handleRemoveImage} className="text-red-600 hover:text-red-700">
                    Remove
                  </Button>
                )}
              </div>
              {imageError && <p className="text-sm text-red-600">{imageError}</p>}
              <p className="text-sm text-gray-500">Upload event image (JPEG, PNG, WebP, GIF)</p>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={CalendarIcon}
              eyebrow="Schedule"
              title="Date & Time"
              description="Control the public start and end timing for the event."
            />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Event Date" type="date" error={errors.eventDate?.message} {...register("eventDate")} />
              <Input label="Start Time" type="time" error={errors.startTime?.message} {...register("startTime")} />
              <Input label="End Date (optional)" type="date" min={minEndDate} error={errors.endDate?.message} {...register("endDate")} />
              <Input label="End Time (optional)" type="time" error={errors.endTime?.message} {...register("endTime")} />
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-teal-50/50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={MapPinIcon}
              eyebrow="Location"
              title="Venue Selection"
              description="Attach the event to one of your venues or create a new one."
            />
            <div className="mt-6 space-y-4">
              <Select label="Venue" options={venueOptions} error={errors.venueId?.message} {...register("venueId")} />
              <div className="rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-600">
                Don&apos;t see your venue?{" "}
                <Link href="/venues/create" className="font-medium text-gray-900 underline hover:text-gray-700">
                  Create a new venue
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-amber-50/50 shadow-lg shadow-gray-100">
          <SectionHeader
            icon={DollarIcon}
            eyebrow="Pricing"
            title="Currency & Ticket Tiers"
            description="Manage ticket pricing, descriptions, capacities, and the event currency."
          />
          <div className="mt-6">
            <div className="max-w-xs">
              <Select
                label="Currency"
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
                        Ticket Tier
                      </p>
                      <h3 className="mt-1 font-semibold text-gray-900">Tier {index + 1}</h3>
                    </div>
                    {fields.length > 1 && (
                      <Button variant="ghost" size="sm" type="button" onClick={() => remove(index)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <input type="hidden" {...register(`ticketTiers.${index}.id`)} />
                    <Input label="Ticket Name" placeholder="e.g., General Admission" error={fieldError(`ticketTiers.${index}.name`)} {...register(`ticketTiers.${index}.name`)} />
                    <Input label="Price" placeholder="0.00" type="number" step="0.01" min="0" error={fieldError(`ticketTiers.${index}.price`)} {...register(`ticketTiers.${index}.price`)} />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input label="Description (optional)" placeholder="What's included" {...register(`ticketTiers.${index}.description`)} />
                    <Input label="Capacity (optional)" placeholder="e.g., 100" type="number" min="1" {...register(`ticketTiers.${index}.capacity`)} />
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => append({ name: "", price: 0, description: "", capacity: "" as unknown as undefined })}
              >
                + Add Ticket Tier
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={SettingsIcon}
              eyebrow="Publishing"
              title="Event Settings"
              description="Decide whether this event is saved as draft or published."
            />
            <div className="mt-6 rounded-3xl border border-gray-200 bg-white/80 p-5">
              <Toggle label="Publish Event" checked={publishEvent} onChange={(checked) => setValue("publishEvent", checked)} />
            </div>
          </Card>

          <Card className="rounded-[2rem] border border-gray-200/80 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg shadow-gray-100">
            <SectionHeader
              icon={MailIcon}
              eyebrow="Support"
              title="Contact Information"
              description="Optional contact details for attendees who need help."
            />
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Contact Email" type="email" placeholder="event@example.com" error={errors.contactEmail?.message} {...register("contactEmail")} />
              <Input label="Contact Phone" type="tel" placeholder="+33 1 23 45 67 89" error={errors.contactPhone?.message} {...register("contactPhone")} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
                <MailIcon className="h-4 w-4" />
                Email
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
                <PhoneIcon className="h-4 w-4" />
                Phone
              </div>
            </div>
          </Card>
        </div>

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
                Delete Event
              </Button>
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 lg:flex-row lg:items-center">
                <span className="text-sm text-red-700">Are you sure? This cannot be undone.</span>
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  disabled={isPending}
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isPending ? "Deleting..." : "Confirm Delete"}
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => router.push(`/events/${eventId}`)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </MainLayout>
  );
}
