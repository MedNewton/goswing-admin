"use server";

import { z } from "zod";
import { createEvent, getOrganizerForCurrentUser, getTags } from "@/lib/data/events";
import { insertInto, updateTable } from "@/lib/supabase/mutations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { EventUpdate, TicketTypeInsert, TicketTypeUpdate } from "@/types/database";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

const ticketTierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Ticket name is required"),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  description: z.string().optional(),
  capacity: z.coerce.number().int().positive().optional().or(z.literal("")),
});

const createEventSchema = z.object({
  // Event details
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  category: z.string().optional(),

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
  currency: z.string().default("USD"),

  // Tags
  tagIds: z.array(z.string()).optional(),

  // Settings
  publishEvent: z.boolean().default(false),

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
    // Get organizer for current user
    const organizer = await getOrganizerForCurrentUser();

    // Use selected venue ID
    const venueId = trimToNull(data.venueId) ?? undefined;

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

    // Determine min price from ticket tiers
    const prices = data.ticketTiers.map((t) => t.price);
    const minPriceCents = Math.min(...prices) * 100;
    const isFree = minPriceCents === 0;

    // Generate a random external ID for public-facing references
    const externalId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

    // Create event
    const eventId = await createEvent(
      {
        title: data.title,
        description: emptyStringToNull(data.description),
        category: emptyStringToNull(data.category),
        organizer_id: organizer.id,
        external_id: externalId,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_id: venueId,
        hero_image_url: emptyStringToNull(data.heroImageUrl),
        status: data.publishEvent ? "published" : "draft",
        currency: data.currency,
        min_price_cents: minPriceCents,
        is_free: isFree,
      },
      data.ticketTiers.map((tier) => ({
        name: tier.name,
        price_cents: Math.round(tier.price * 100),
        currency: data.currency,
        description: emptyStringToNull(tier.description),
        capacity: typeof tier.capacity === "number" ? tier.capacity : null,
      })),
      data.tagIds,
    );

    return { success: true, eventId };
  } catch (err) {
    console.error("createEventAction error:", err);
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
  category: z.string().optional(),
  heroImageUrl: z.string().optional().or(z.literal("")),
  eventDate: z.string().min(1, "Event date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  venueId: z.string().optional().or(z.literal("")),
  ticketTiers: z.array(ticketTierSchema).min(1, "At least one ticket tier is required"),
  currency: z.string().default("USD"),
  tagIds: z.array(z.string()).optional(),
  publishEvent: z.boolean().default(false),
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
    const sb = await createSupabaseServerClient();
    const { data: existingTicketTypeRows, error: existingTicketTypesError } = await sb
      .from("ticket_types")
      .select("id")
      .eq("event_id", eventId);

    if (existingTicketTypesError) throw existingTicketTypesError;

    const venueId = trimToNull(data.venueId);
    const startsAt = new Date(`${data.eventDate}T${data.startTime}`).toISOString();

    let endsAt: string | null = null;
    if (data.endDate && data.endTime) {
      endsAt = new Date(`${data.endDate}T${data.endTime}`).toISOString();
    } else if (data.endTime && data.eventDate) {
      endsAt = new Date(`${data.eventDate}T${data.endTime}`).toISOString();
    }

    const prices = data.ticketTiers.map((t) => t.price);
    const minPriceCents = Math.min(...prices) * 100;
    const isFree = minPriceCents === 0;
    const existingTicketTypeIds = new Set(
      ((existingTicketTypeRows ?? []) as Array<{ id: string }>).map((row) => row.id)
    );
    const submittedExistingTiers = data.ticketTiers.filter(
      (tier): tier is typeof tier & { id: string } => Boolean(tier.id && existingTicketTypeIds.has(tier.id))
    );
    const submittedExistingIds = new Set(submittedExistingTiers.map((tier) => tier.id));
    const removedTicketTypeIds = [...existingTicketTypeIds].filter((id) => !submittedExistingIds.has(id));

    if (removedTicketTypeIds.length > 0) {
      const [{ data: reservationItemRefs, error: reservationItemRefsError }, { data: ticketRefs, error: ticketRefsError }] =
        await Promise.all([
          sb
            .from("reservation_items")
            .select("ticket_type_id")
            .in("ticket_type_id", removedTicketTypeIds)
            .limit(1),
          sb
            .from("tickets")
            .select("ticket_type_id")
            .in("ticket_type_id", removedTicketTypeIds)
            .limit(1),
        ]);

      if (reservationItemRefsError) throw reservationItemRefsError;
      if (ticketRefsError) throw ticketRefsError;

      if ((reservationItemRefs?.length ?? 0) > 0 || (ticketRefs?.length ?? 0) > 0) {
        return {
          success: false,
          error: "You cannot remove ticket tiers that already have reservations. Edit the existing tier instead.",
        };
      }
    }

    const eventUpdates: EventUpdate = {
      title: data.title,
      description: emptyStringToNull(data.description),
      category: emptyStringToNull(data.category),
      starts_at: startsAt,
      ends_at: endsAt,
      venue_id: venueId,
      hero_image_url: emptyStringToNull(data.heroImageUrl),
      status: data.publishEvent ? "published" : "draft",
      currency: data.currency,
      min_price_cents: minPriceCents,
      is_free: isFree,
    };

    // Update the event
    const { error: eventError } = await updateTable(sb, "events", eventUpdates).eq("id", eventId);

    if (eventError) throw eventError;

    for (const tier of submittedExistingTiers) {
      const ticketTypeUpdates: TicketTypeUpdate = {
        name: tier.name,
        price_cents: Math.round(tier.price * 100),
        currency: data.currency,
        description: emptyStringToNull(tier.description),
        capacity: typeof tier.capacity === "number" ? tier.capacity : null,
      };
      const { error: updateTicketTypeError } = await updateTable(
        sb,
        "ticket_types",
        ticketTypeUpdates,
      ).eq("id", tier.id);

      if (updateTicketTypeError) throw updateTicketTypeError;
    }

    const newTicketTiers: TicketTypeInsert[] = data.ticketTiers
      .filter((tier) => !tier.id || !existingTicketTypeIds.has(tier.id))
      .map((tier) => ({
        event_id: eventId,
        name: tier.name,
        price_cents: Math.round(tier.price * 100),
        currency: data.currency,
        description: emptyStringToNull(tier.description),
        capacity: typeof tier.capacity === "number" ? tier.capacity : null,
      }));

    if (newTicketTiers.length > 0) {
      const { error: insertTicketsError } = await insertInto(
        sb,
        "ticket_types",
        newTicketTiers
      );

      if (insertTicketsError) throw insertTicketsError;
    }

    if (removedTicketTypeIds.length > 0) {
      const { error: deleteTicketsError } = await sb
        .from("ticket_types")
        .delete()
        .in("id", removedTicketTypeIds);

      if (deleteTicketsError) throw deleteTicketsError;
    }

    // Delete old event tags and insert new ones
    const { error: deleteTagsError } = await sb
      .from("event_tags")
      .delete()
      .eq("event_id", eventId);

    if (deleteTagsError) throw deleteTagsError;

    if (data.tagIds && data.tagIds.length > 0) {
      const { error: insertTagsError } = await insertInto(
        sb,
        "event_tags",
        data.tagIds.map((tag_id) => ({ event_id: eventId, tag_id }))
      );
      if (insertTagsError) throw insertTagsError;
    }

    return { success: true };
  } catch (err) {
    console.error("updateEventAction error:", err);
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
    const message = err instanceof Error ? err.message : "Failed to delete event";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Fetch event for editing (callable from client components)
// ---------------------------------------------------------------------------

export async function fetchEventForEdit(eventId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("events")
    .select(`
      *,
      venues ( name, city ),
      ticket_types ( id, name, description, price_cents, currency, capacity ),
      event_tags ( tags ( id, label, slug, type ) )
    `)
    .eq("id", eventId)
    .single();

  if (error) throw error;

  const row = data as Record<string, unknown>;
  const ticketTypes = (row.ticket_types ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    price_cents: number;
    currency: string;
    capacity: number | null;
  }>;

  const eventTags = (row.event_tags ?? []) as Array<{
    tags: { id: string; label: string; slug: string; type: string };
  }>;
  const tagIds = eventTags.map((et) => et.tags.id);

  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? "",
    category: (row.category as string | null) ?? "",
    heroImageUrl: (row.hero_image_url as string | null) ?? "",
    startsAt: row.starts_at as string,
    endsAt: (row.ends_at as string | null) ?? null,
    venueId: (row.venue_id as string | null) ?? "",
    currency: ((row.currency as string) ?? "USD").trim(),
    status: row.status as string,
    ticketTypes,
    tagIds,
  };
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

    const sb = await createSupabaseServerClient();

    // Generate unique filename
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `event-images/${fileName}`;

    // Convert File to ArrayBuffer then to Uint8Array for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await sb.storage
      .from("event-images")
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = sb.storage
      .from("event-images")
      .getPublicUrl(filePath);

    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    console.error("uploadEventImageAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to upload image";
    return { success: false, error: message };
  }
}
