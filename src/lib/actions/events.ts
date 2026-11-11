"use server";

// Event server actions backed by the Gooswing REST API.

import { z } from "zod";
import { normalizeUploadUrl } from "@/lib/api/uploadUrl";
import { getTags } from "@/lib/data/events";
import { adminApiCall, isApiError } from "@/lib/api/client";
import type {
  ApiAdminContext,
  ApiAdminEventDetail,
  ApiCreateEventInput,
  ApiTag,
  ApiUploadResult,
} from "@/lib/api/types";
import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const ticketTierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Ticket name is required"),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  description: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("")),
  is_free: z.boolean().default(false),
  free_for_ladies: z.boolean().default(false),
});

const eventPolicySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const galleryItemSchema = z.object({
  url: z.string().url("Invalid media URL"),
  mediaType: z.enum(["image", "video"]),
  caption: z.string().max(500).optional().or(z.literal("")),
});

const createEventSchema = z.object({
  // Event details
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),

  // Image
  heroImageUrl: z.string().optional().or(z.literal("")),

  // Date & Time
  eventDate: z.string().min(1, "Event date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().optional(),
  endTime: z.string().optional(),

  // Location - now uses venue ID from dropdown
  venueId: z.string().optional().or(z.literal("")),

  // Pricing
  ticketTiers: z.array(ticketTierSchema).min(1, "At least one ticket tier is required"),
  currency: z.string().default("MAD"),

  // Tags (party types + music styles + extra services all stored as event tags)
  tagIds: z.array(z.string()).optional(),

  // Settings
  publishEvent: z.boolean().default(false),
  approvalMode: z.enum(["auto", "manual"]).default("auto"),
  sharingEnabled: z.boolean().default(true),
  policies: z.array(eventPolicySchema).optional(),

  // Gallery (images + videos)
  galleryItems: z.array(galleryItemSchema).optional().default([]),

  // Contact
  contactEmail: z.string().email().optional().or(z.literal("")),
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

export type CreateEventInput = z.infer<typeof createEventSchema>;

function emptyStringToNull(value: string | null | undefined) {
  if (value) return value;
  return null;
}

function trimToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return null;
}

function resolveEventEndDate(endDate: string | undefined, eventDate: string) {
  if (endDate) return endDate;
  return eventDate;
}

/** Extract per-field errors from an API validation_failed details payload. */
function extractFieldErrors(details: unknown): Record<string, string[]> | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
  const fieldErrors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    if (typeof value === "string") fieldErrors[key] = [value];
    else if (Array.isArray(value)) fieldErrors[key] = value.map(String);
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

export type CreateEventResult =
  | { success: true; eventId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createEventAction(
  formData: CreateEventInput
): Promise<CreateEventResult> {
  // Validate input
  const parsed = createEventSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      fieldErrors[path] ??= [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const data = parsed.data;

  try {
    // Build starts_at timestamp
    const startsAt = new Date(`${data.eventDate}T${data.startTime}`).toISOString();

    // Build ends_at timestamp if provided
    let endsAt: string | undefined;
    if (data.endDate && data.endTime) {
      endsAt = new Date(`${data.endDate}T${data.endTime}`).toISOString();
    } else if (data.endTime && data.eventDate) {
      // Same day, different end time
      endsAt = new Date(`${data.eventDate}T${data.endTime}`).toISOString();
    }

    const body: ApiCreateEventInput = {
      title: data.title,
      description: emptyStringToNull(data.description),
      startsAt,
      endsAt: endsAt ?? null,
      venueId: trimToNull(data.venueId),
      heroImageUrl: emptyStringToNull(data.heroImageUrl),
      publish: data.publishEvent,
      currency: data.currency,
      approvalMode: data.approvalMode,
      sharingEnabled: data.sharingEnabled,
      policies: data.policies ?? [],
      ticketTiers: data.ticketTiers.map((tier) => ({
        name: tier.name,
        priceCents: tier.is_free ? 0 : Math.round(tier.price * 100),
        currency: data.currency,
        description: emptyStringToNull(tier.description),
        capacity: typeof tier.capacity === "number" ? tier.capacity : null,
        isFree: tier.is_free,
        freeForLadies: tier.free_for_ladies,
      })),
      tagIds: data.tagIds ?? [],
      galleryItems: (data.galleryItems ?? []).map((item) => ({
        url: item.url,
        mediaType: item.mediaType,
        caption: item.caption ?? null,
      })),
    };

    const { eventId } = await adminApiCall<{ eventId: string }>("/v1/admin/events", {
      method: "POST",
      body,
    });

    return { success: true, eventId };
  } catch (err) {
    console.error("createEventAction error:", err);
    if (isApiError(err)) {
      if (err.code === "validation_failed") {
        return {
          success: false,
          error: err.message || "Validation failed",
          fieldErrors: extractFieldErrors(err.details),
        };
      }
      return { success: false, error: err.message };
    }
    const message = err instanceof Error ? err.message : "Failed to create event";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Update Event
// ---------------------------------------------------------------------------

const updateEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  heroImageUrl: z.string().optional().or(z.literal("")),
  eventDate: z.string().min(1, "Event date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  venueId: z.string().optional().or(z.literal("")),
  ticketTiers: z.array(ticketTierSchema).min(1, "At least one ticket tier is required"),
  currency: z.string().default("MAD"),
  tagIds: z.array(z.string()).optional(),
  publishEvent: z.boolean().default(false),
  approvalMode: z.enum(["auto", "manual"]).default("auto"),
  sharingEnabled: z.boolean().default(true),
  policies: z.array(eventPolicySchema).optional(),
  galleryItems: z.array(galleryItemSchema).optional().default([]),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export type UpdateEventResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateEventAction(
  eventId: string,
  formData: UpdateEventInput
): Promise<UpdateEventResult> {
  const parsed = updateEventSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      fieldErrors[path] ??= [];
      fieldErrors[path].push(issue.message);
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const data = parsed.data;

  try {
    const startsAt = new Date(`${data.eventDate}T${data.startTime}`).toISOString();

    let endsAt: string | null = null;
    if (data.endDate && data.endTime) {
      endsAt = new Date(`${data.endDate}T${data.endTime}`).toISOString();
    } else if (data.endTime && data.eventDate) {
      endsAt = new Date(`${data.eventDate}T${data.endTime}`).toISOString();
    }

    // ticketTiers is the authoritative list: tiers with an id are updated,
    // tiers without one are created, and existing tiers left out are deleted.
    const body = {
      title: data.title,
      description: emptyStringToNull(data.description),
      startsAt,
      endsAt,
      venueId: trimToNull(data.venueId),
      heroImageUrl: emptyStringToNull(data.heroImageUrl),
      publish: data.publishEvent,
      currency: data.currency,
      approvalMode: data.approvalMode,
      sharingEnabled: data.sharingEnabled,
      policies: data.policies ?? [],
      ticketTiers: data.ticketTiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        priceCents: tier.is_free ? 0 : Math.round(tier.price * 100),
        currency: data.currency,
        description: emptyStringToNull(tier.description),
        capacity: typeof tier.capacity === "number" ? tier.capacity : null,
        isFree: tier.is_free,
        freeForLadies: tier.free_for_ladies,
      })),
      tagIds: data.tagIds ?? [],
      galleryItems: (data.galleryItems ?? []).map((item) => ({
        url: item.url,
        mediaType: item.mediaType,
        caption: item.caption ?? null,
      })),
    };

    await adminApiCall<ApiAdminEventDetail>(`/v1/admin/events/${eventId}`, {
      method: "PATCH",
      body,
    });

    return { success: true };
  } catch (err) {
    console.error("updateEventAction error:", err);
    if (isApiError(err)) {
      if (err.code === "tier_in_use" || err.status === 422) {
        return {
          success: false,
          error: "You cannot remove ticket tiers that already have reservations. Edit the existing tier instead.",
        };
      }
      if (err.status === 404) {
        return { success: false, error: "Event not found or access denied" };
      }
      if (err.code === "validation_failed") {
        return {
          success: false,
          error: err.message || "Validation failed",
          fieldErrors: extractFieldErrors(err.details),
        };
      }
      return { success: false, error: err.message };
    }
    const message = err instanceof Error ? err.message : "Failed to update event";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Delete Event
// ---------------------------------------------------------------------------

export type DeleteEventResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteEventAction(eventId: string): Promise<DeleteEventResult> {
  try {
    const { deleteEvent } = await import("@/lib/data/events");
    await deleteEvent(eventId);
    return { success: true };
  } catch (err) {
    console.error("deleteEventAction error:", err);
    if (isApiError(err) && err.status === 409) {
      return {
        success: false,
        error: "You cannot delete an event that already has confirmed reservations.",
      };
    }
    const message = err instanceof Error ? err.message : "Failed to delete event";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Fetch event for editing (callable from client components)
// ---------------------------------------------------------------------------

export async function fetchEventForEdit(eventId: string) {
  const detail = await adminApiCall<ApiAdminEventDetail>(`/v1/admin/events/${eventId}`);
  const { event, tagIds, ticketTypes, gallery } = detail;

  const galleryItems = gallery
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((g) => ({
      url: g.url,
      mediaType: g.mediaType === "video" ? ("video" as const) : ("image" as const),
      caption: g.caption ?? "",
    }));

  return {
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    heroImageUrl: event.heroImageUrl ?? "",
    startsAt: event.startsAt,
    endsAt: event.endsAt ?? null,
    venueId: event.venueId ?? "",
    currency: (event.currency ?? "MAD").trim(),
    status: event.status,
    ticketTypes: ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      price_cents: tt.priceCents,
      currency: tt.currency,
      capacity: tt.capacity,
      is_free: tt.isFree,
      free_for_ladies: tt.freeForLadies,
    })),
    tagIds: [...tagIds],
    approvalMode: event.approvalMode ?? "auto",
    sharingEnabled: event.sharingEnabled ?? true,
    policies: event.policies.map((p) => ({ title: p.title, description: p.description })),
    galleryItems,
  };
}

/** Fetch organizer contact info for prefilling the create event form. */
export async function fetchOrganizerContact() {
  try {
    const context = await adminApiCall<ApiAdminContext>("/v1/admin/me/context");
    return {
      email: context.organizer?.email ?? "",
      phone: context.organizer?.phone ?? "",
    };
  } catch {
    return { email: "", phone: "" };
  }
}

// ---------------------------------------------------------------------------
// Redirect helper
// ---------------------------------------------------------------------------

export async function redirectToEvent(eventId: string) {
  redirect(`/events/${eventId}`);
}

// ---------------------------------------------------------------------------
// Fetch Tags (callable from client components)
// ---------------------------------------------------------------------------

export async function fetchTagsForSelect() {
  return getTags();
}

// ---------------------------------------------------------------------------
// Custom Tag Creation
// ---------------------------------------------------------------------------

const CUSTOM_TAG_TYPES = ["party_type", "music_style", "extra_service"] as const;
const customTagSchema = z.object({
  type: z.enum(CUSTOM_TAG_TYPES),
  label: z.string().trim().min(1, "Label is required").max(80, "Label is too long"),
});

export type CreateCustomTagResult =
  | { success: true; tag: { id: string; label: string; slug: string; type: string } }
  | { success: false; error: string };

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Create or reuse a tag for the given (type, label). Idempotent on slug. */
export async function createCustomTagAction(input: {
  type: string;
  label: string;
}): Promise<CreateCustomTagResult> {
  const parsed = customTagSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const { type, label } = parsed.data;
  if (!slugify(label)) {
    return { success: false, error: "Label must contain at least one alphanumeric character" };
  }

  try {
    const tag = await adminApiCall<ApiTag>("/v1/admin/tags", {
      method: "POST",
      body: { type, label },
    });
    return {
      success: true,
      tag: { id: tag.id, label: tag.label, slug: tag.slug, type: tag.type },
    };
  } catch (err) {
    console.error("[createCustomTagAction] error:", err);
    const message = err instanceof Error ? err.message : "Failed to create tag";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Image Upload
// ---------------------------------------------------------------------------

export type UploadImageResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function uploadEventImageAction(
  formData: FormData
): Promise<UploadImageResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: "File too large. Maximum size is 5MB." };
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("kind", "eventHero");

    const result = await adminApiCall<ApiUploadResult>("/v1/admin/uploads", {
      method: "POST",
      body: uploadForm,
    });

    return { success: true, url: normalizeUploadUrl(result.url) };
  } catch (err) {
    console.error("uploadEventImageAction error:", err);
    if (isApiError(err)) {
      return { success: false, error: `Upload failed: ${err.message}` };
    }
    const message = err instanceof Error ? err.message : "Failed to upload image";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Media Upload (gallery — images + videos)
// ---------------------------------------------------------------------------

export type UploadMediaResult =
  | { success: true; url: string; mediaType: "image" | "video" }
  | { success: false; error: string };

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

export async function uploadEventMediaAction(
  formData: FormData,
): Promise<UploadMediaResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const isImage = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type);
    const isVideo = (ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type);
    if (!isImage && !isVideo) {
      return {
        success: false,
        error: "Invalid file type. Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV.",
      };
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      const limitMb = maxSize / (1024 * 1024);
      return { success: false, error: `File too large. Maximum size is ${limitMb}MB.` };
    }

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("kind", "eventGallery");

    const result = await adminApiCall<ApiUploadResult>("/v1/admin/uploads", {
      method: "POST",
      body: uploadForm,
    });

    return {
      success: true,
      url: normalizeUploadUrl(result.url),
      mediaType: result.mediaType,
    };
  } catch (err) {
    console.error("uploadEventMediaAction error:", err);
    if (isApiError(err)) {
      return { success: false, error: `Upload failed: ${err.message}` };
    }
    const message = err instanceof Error ? err.message : "Failed to upload media";
    return { success: false, error: message };
  }
}
