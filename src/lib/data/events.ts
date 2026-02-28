import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertInto, updateTable } from "@/lib/supabase/mutations";
import { mapEvent, mapEvents, type EventQueryRow } from "@/lib/mappers/events";
import type { EventInsert, EventUpdate, TicketTypeInsert } from "@/types/database";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all events created by the current user. */
export async function getEvents() {
  const sb = await createSupabaseServerClient();

  // Events are filtered by RLS policy (events_creator_read) which checks:
  // created_by_user_id = requesting_user_id()
  // We also add an explicit filter to ensure we only get user's own events
  const { data, error } = await sb
    .from("events")
    .select(`
      *,
      venues ( name, city ),
      organizers ( name ),
      event_tags ( tags ( label ) )
    `)
    .not("created_by_user_id", "is", null)
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return mapEvents((data ?? []) as EventQueryRow[]);
}

/** Fetch a single event by ID with full relations. */
export async function getEvent(id: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("events")
    .select(`
      *,
      venues ( id, name, city, address_line1, region, country_code, timezone, venue_type, lat, lng ),
      organizers ( id, name, logo_url, tagline, about, cover_image_url, established_year, is_verified, city, country_code, phone, email, website_url, instagram_handle, facebook_handle, specialties, cancellation_policy, refund_policy ),
      event_tags ( tags ( id, label, slug, type ) ),
      ticket_types ( id, name, description, price_cents, currency, benefits, capacity, sales_start_at, sales_end_at )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return {
    event: mapEvent(data as EventQueryRow),
    ticketTypes: (data as Record<string, unknown>).ticket_types as Array<{
      id: string;
      name: string;
      description: string | null;
      price_cents: number;
      currency: string;
      benefits: unknown[];
      capacity: number | null;
      sales_start_at: string | null;
      sales_end_at: string | null;
    }>,
    organizer: (data as Record<string, unknown>).organizers as {
      id: string;
      name: string;
      logo_url: string | null;
      tagline: string | null;
      about: string | null;
      cover_image_url: string | null;
      established_year: number | null;
      is_verified: boolean | null;
      city: string | null;
      country_code: string | null;
      phone: string | null;
      email: string | null;
      website_url: string | null;
      instagram_handle: string | null;
      facebook_handle: string | null;
      specialties: string[] | null;
      cancellation_policy: string | null;
      refund_policy: string | null;
    } | null,
    venue: (data as Record<string, unknown>).venues as {
      id: string;
      name: string;
      city: string | null;
      address_line1: string | null;
      region: string | null;
      country_code: string | null;
      timezone: string | null;
      venue_type: string | null;
      lat: number | null;
      lng: number | null;
    } | null,
  };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

/** Fetch all tags for the multi-select dropdown. */
export async function getTags() {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("tags")
    .select("id, label, slug, type")
    .order("type")
    .order("label");

  if (error) throw error;
  return (data ?? []) as Array<{ id: string; label: string; slug: string; type: string }>;
}

// ---------------------------------------------------------------------------
// Organizer helpers
// ---------------------------------------------------------------------------

/** Fetch the organizer row owned by the current authenticated user. */
export async function getOrganizerForCurrentUser() {
  const sb = await createSupabaseServerClient();
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await sb
    .from("organizers")
    .select("id, name")
    .eq("owner_user_id", userId)
    .limit(1)
    .single();

  if (error) throw error;
  return data as { id: string; name: string };
}

/** Create a venue and return its ID. */
export async function createVenue(venue: {
  name: string;
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
}) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await insertInto(
    sb,
    "venues",
    venue,
  )
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new event with ticket types. */
export async function createEvent(
  event: EventInsert,
  ticketTypes: Omit<TicketTypeInsert, "event_id">[],
  tagIds?: string[],
) {
  const sb = await createSupabaseServerClient();

  // Insert event
  const { data: eventData, error: eventError } = await insertInto(
    sb,
    "events",
    event,
  )
    .select("id")
    .single();

  if (eventError) throw eventError;
  const eventId = (eventData as { id: string }).id;

  // Insert ticket types
  if (ticketTypes.length > 0) {
    const { error: ttError } = await insertInto(
      sb,
      "ticket_types",
      ticketTypes.map((tt) => ({ ...tt, event_id: eventId })),
    );
    if (ttError) throw ttError;
  }

  // Insert event tags
  if (tagIds && tagIds.length > 0) {
    const { error: tagError } = await insertInto(
      sb,
      "event_tags",
      tagIds.map((tag_id) => ({ event_id: eventId, tag_id })),
    );
    if (tagError) throw tagError;
  }

  return eventId;
}

  /** Update an existing event. */
export async function updateEvent(id: string, updates: EventUpdate) {
  const sb = await createSupabaseServerClient();

  const { error } = await updateTable(sb, "events", updates).eq("id", id);

  if (error) throw error;
}

/** Delete an event. */
export async function deleteEvent(id: string) {
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("events")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
