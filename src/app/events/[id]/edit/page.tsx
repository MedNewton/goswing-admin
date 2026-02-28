"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { useState, useEffect, useTransition, useRef, use } from "react";
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
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Event Image</h2>
          <div className="flex items-center gap-4">
            <div className="relative h-32 w-32 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Event preview" className="h-full w-full object-cover" />
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
                <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}>
                  {isUploadingImage ? "Uploading..." : imagePreview ? "Change Image" : "Choose Image"}
                </Button>
                {imagePreview && !isUploadingImage && (
                  <Button variant="ghost" size="sm" type="button" onClick={handleRemoveImage} className="text-red-600 hover:text-red-700">
                    Remove
                  </Button>
                )}
              </div>
              {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
              <p className="mt-2 text-sm text-gray-500">Upload event image (JPEG, PNG, WebP, GIF)</p>
            </div>
          </div>
        </Card>

        {/* Event Details */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Event Details</h2>
          <div className="space-y-4">
            <Input label="Event Title" placeholder="e.g., Summer Jazz Night" error={errors.title?.message} {...register("title")} />
            <Textarea label="Description" placeholder="Describe your event..." rows={4} error={errors.description?.message} {...register("description")} />
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
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Date & Time</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Event Date" type="date" error={errors.eventDate?.message} {...register("eventDate")} />
            <Input label="Start Time" type="time" error={errors.startTime?.message} {...register("startTime")} />
            <Input label="End Date (optional)" type="date" min={minEndDate} error={errors.endDate?.message} {...register("endDate")} />
            <Input label="End Time (optional)" type="time" error={errors.endTime?.message} {...register("endTime")} />
          </div>
        </Card>

        {/* Location */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Location</h2>
          <div className="space-y-4">
            <Select label="Venue" options={venueOptions} error={errors.venueId?.message} {...register("venueId")} />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Don&apos;t see your venue?</span>
              <Link href="/venues/create" className="font-medium text-gray-900 underline hover:text-gray-700">Create a new venue</Link>
            </div>
          </div>
        </Card>

        {/* Pricing */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Pricing</h2>
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
              <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Ticket Tier {index + 1}</h3>
                  {fields.length > 1 && (
                    <Button variant="ghost" size="sm" type="button" onClick={() => remove(index)}>Remove</Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Ticket Name" placeholder="e.g., General Admission" error={fieldError(`ticketTiers.${index}.name`)} {...register(`ticketTiers.${index}.name`)} />
                  <Input label="Price" placeholder="0.00" type="number" step="0.01" min="0" error={fieldError(`ticketTiers.${index}.price`)} {...register(`ticketTiers.${index}.price`)} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
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
        </Card>

        {/* Event Settings */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Event Settings</h2>
          <Toggle label="Publish Event" checked={publishEvent} onChange={(checked) => setValue("publishEvent", checked)} />
        </Card>

        {/* Contact Information */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Contact Information</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Contact Email" type="email" placeholder="event@example.com" error={errors.contactEmail?.message} {...register("contactEmail")} />
            <Input label="Contact Phone" type="tel" placeholder="+33 1 23 45 67 89" error={errors.contactPhone?.message} {...register("contactPhone")} />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
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
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
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
