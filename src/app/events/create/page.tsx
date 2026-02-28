"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
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

// ---------------------------------------------------------------------------
// Zod Schema (mirrors server-side for client validation)
// ---------------------------------------------------------------------------

const ticketTierSchema = z.object({
  name: z.string().min(1, "Ticket name is required"),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  description: z.string().optional(),
  capacity: z.union([z.coerce.number().int().positive(), z.literal(""), z.undefined()]).optional(),
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
  contactEmail: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  contactPhone: z.string().optional(),
}).refine(
  (data) => {
    // Validate start date/time is in the future
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
    // Validate end date/time is at least 30 min after start
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

  // Fetch venues and tags on mount
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

  // Compute today's date string for min attribute on date inputs
  const todayStr = new Date().toISOString().split("T")[0];

  // Compute min end date (must be >= event start date)
  const minEndDate = eventDate || todayStr;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
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
          ticketTiers: data.ticketTiers.map((t) => ({
            ...t,
            capacity: typeof t.capacity === "number" ? t.capacity : undefined,
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

  // Helper to get nested field error message
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

  // Build venue options for the select dropdown
  const venueOptions = [
    { value: "", label: venuesLoading ? "Loading venues..." : "Select a venue (optional)" },
    ...venues.map((v) => ({
      value: v.id,
      label: v.city ? `${v.name} — ${v.city}` : v.name,
    })),
  ];

  return (
    <MainLayout
      title="Create New Event"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => router.push("/events")}
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
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-4xl space-y-6"
      >
        {/* Server Error */}
        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {serverError}
          </div>
        )}

        {/* Event Image */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📷 Event Image
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative h-32 w-32 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="Event preview"
                    className="h-full w-full object-cover"
                  />
                  {isUploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <span className="text-4xl">+</span>
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
                  {isUploadingImage ? "Uploading..." : imagePreview ? "Change Image" : "Choose Image"}
                </Button>
                {imagePreview && !isUploadingImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>
              {imageError && (
                <p className="mt-2 text-sm text-red-600">{imageError}</p>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Upload event image (JPEG, PNG, WebP, GIF)
              </p>
              <p className="text-xs text-gray-400">
                Recommended: 1200 x 800px, max 5MB
              </p>
            </div>
          </div>
        </Card>

        {/* Event Details */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📝 Event Details
          </h2>
          <div className="space-y-4">
            <Input
              label="Event Title"
              placeholder="e.g., Summer Jazz Night"
              error={errors.title?.message}
              {...register("title")}
            />
            <Textarea
              label="Description"
              placeholder="Describe your event..."
              rows={4}
              error={errors.description?.message}
              {...register("description")}
            />
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

            {/* Tags Multi-Select */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Tags
              </label>
              {tagsLoading ? (
                <p className="text-sm text-gray-400">Loading tags...</p>
              ) : tags.length === 0 ? (
                <p className="text-sm text-gray-400">No tags available</p>
              ) : (
                <>
                  {/* Selected tags */}
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
                  {/* Dropdown to add tags */}
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
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

        {/* Date & Time */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📅 Date & Time
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Event Date"
              type="date"
              min={todayStr}
              error={errors.eventDate?.message}
              {...register("eventDate")}
            />
            <Input
              label="Start Time"
              type="time"
              error={errors.startTime?.message}
              {...register("startTime")}
            />
            <Input
              label="End Date (optional)"
              type="date"
              min={minEndDate}
              error={errors.endDate?.message}
              {...register("endDate")}
            />
            <Input
              label="End Time (optional)"
              type="time"
              error={errors.endTime?.message}
              {...register("endTime")}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            End time must be at least 30 minutes after start time.
          </p>
        </Card>

        {/* Location */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📍 Location
          </h2>
          <div className="space-y-4">
            <Select
              label="Venue"
              options={venueOptions}
              error={errors.venueId?.message}
              {...register("venueId")}
            />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Don&apos;t see your venue?</span>
              <Link
                href="/venues/create"
                className="font-medium text-gray-900 underline hover:text-gray-700"
              >
                Create a new venue
              </Link>
            </div>
          </div>
        </Card>

        {/* Pricing */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            💰 Pricing
          </h2>
          <div className="mb-4">
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
            <p className="mb-3 text-sm text-red-600">{errors.ticketTiers.message}</p>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    Ticket Tier {index + 1}
                  </h3>
                  {fields.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => remove(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Ticket Name"
                    placeholder="e.g., General Admission"
                    error={fieldError(`ticketTiers.${index}.name`)}
                    {...register(`ticketTiers.${index}.name`)}
                  />
                  <Input
                    label="Price"
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
                    label="Description (optional)"
                    placeholder="What's included"
                    {...register(`ticketTiers.${index}.description`)}
                  />
                  <Input
                    label="Capacity (optional)"
                    placeholder="e.g., 100"
                    type="number"
                    min="1"
                    {...register(`ticketTiers.${index}.capacity`)}
                  />
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() =>
                append({
                  name: "",
                  price: 0,
                  description: "",
                  capacity: "" as unknown as undefined,
                })
              }
            >
              + Add Ticket Tier
            </Button>
          </div>
        </Card>

        {/* Event Settings */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            ⚙️ Event Settings
          </h2>
          <div className="space-y-4">
            <Toggle
              label="Publish Event"
              checked={publishEvent}
              onChange={(checked) => setValue("publishEvent", checked)}
            />
          </div>
        </Card>

        {/* Contact Information */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            📧 Contact Information
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Contact Email"
              type="email"
              placeholder="event@example.com"
              error={errors.contactEmail?.message}
              {...register("contactEmail")}
            />
            <Input
              label="Contact Phone"
              type="tel"
              placeholder="+33 1 23 45 67 89"
              error={errors.contactPhone?.message}
              {...register("contactPhone")}
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push("/events")}
          >
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}
