import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapEvent, mapEvents, type EventQueryRow } from "@/lib/mappers/events";
import type { EventInsert, EventUpdate, TicketTypeInsert } from "@/types/database";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all events for the current organizer. */
export async function getEvents() {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("events")
    .select(`
      *,
      venues ( name, city ),
      organizers ( name ),
      event_tags ( tags ( label ) )
    `)
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return mapEvents((data ?? []) as EventQueryRow[]);
}

/** Fetch a single event by ID with full relations. */
export async function getEvent(id: string) {
  const sb = await createSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error } = await sb
    .from("events")
    .select(`
      *,
      venues ( name, city, address_line1, region, country_code, timezone ),
      organizers ( id, name, logo_url, tagline ),
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
    } | null,
    venue: (data as Record<string, unknown>).venues as {
      name: string;
      city: string | null;
      address_line1: string | null;
      region: string | null;
      country_code: string | null;
      timezone: string | null;
    } | null,
  };
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
  const { data: eventData, error: eventError } = await sb
    .from("events")
    .insert(event)
    .select("id")
    .single();

  if (eventError) throw eventError;
  const eventId = (eventData as { id: string }).id;

  // Insert ticket types
  if (ticketTypes.length > 0) {
    const { error: ttError } = await sb
      .from("ticket_types")
      .insert(ticketTypes.map((tt) => ({ ...tt, event_id: eventId })));
    if (ttError) throw ttError;
  }

  // Insert event tags
  if (tagIds && tagIds.length > 0) {
    const { error: tagError } = await sb
      .from("event_tags")
      .insert(tagIds.map((tag_id) => ({ event_id: eventId, tag_id })));
    if (tagError) throw tagError;
  }

  return eventId;
}

/** Update an existing event. */
export async function updateEvent(id: string, updates: EventUpdate) {
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("events")
    .update(updates)
    .eq("id", id);

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
