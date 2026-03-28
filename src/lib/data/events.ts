import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertInto, updateTable } from "@/lib/supabase/mutations";
import { mapEvent, mapEvents, type EventQueryRow } from "@/lib/mappers/events";
import type { EventInsert, EventUpdate, TicketTypeInsert } from "@/types/database";
import type { EventOverview, TicketSalesBreakdown } from "@/types";
import { formatMoney } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all events created by the current user, enriched with counts. */
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
    .not("created_by_user_id", "is", null)
    .order("starts_at", { ascending: false });

  if (error) throw error;

  const events = (data ?? []) as EventQueryRow[];
  if (events.length === 0) return mapEvents(events);

  // Enrich events with aggregated counts in parallel
  const eventIds = events.map((e) => e.id);

  // Fetch aggregated counts in parallel
  const [songsResult, checkinsResult, reviewsResult, reservationsResult] = await Promise.all([
    sb.from("event_song_suggestions").select("event_id").in("event_id", eventIds),
    sb.from("ticket_checkins").select("ticket_id, tickets!inner(event_id)").in("tickets.event_id", eventIds).eq("result", "accepted"),
    sb.from("event_reviews").select("event_id, rating").in("event_id", eventIds),
    sb.from("reservations").select("event_id").in("event_id", eventIds).eq("status", "confirmed"),
  ]);

  const songCounts: Record<string, number> = {};
  for (const r of (songsResult.data ?? []) as Array<{ event_id: string }>) {
    songCounts[r.event_id] = (songCounts[r.event_id] ?? 0) + 1;
  }

  const checkinCounts: Record<string, number> = {};
  for (const r of (checkinsResult.data ?? []) as Array<{ tickets: { event_id: string } }>) {
    const eid = r.tickets.event_id;
    checkinCounts[eid] = (checkinCounts[eid] ?? 0) + 1;
  }

  const reviewStats: Record<string, number> = {};
  const reviewGrouped: Record<string, number[]> = {};
  for (const r of (reviewsResult.data ?? []) as Array<{ event_id: string; rating: number }>) {
    (reviewGrouped[r.event_id] ??= []).push(r.rating);
  }
  for (const [eid, ratings] of Object.entries(reviewGrouped)) {
    reviewStats[eid] = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  }

  const reservationCounts: Record<string, number> = {};
  for (const r of (reservationsResult.data ?? []) as Array<{ event_id: string }>) {
    reservationCounts[r.event_id] = (reservationCounts[r.event_id] ?? 0) + 1;
  }

  // Merge counts into event rows
  for (const event of events) {
    event._songSuggestionsCount = songCounts[event.id] ?? 0;
    event._checkedInCount = checkinCounts[event.id] ?? 0;
    event._reviewScore = reviewStats[event.id] ?? null;
    // Also set reservationCount on mapped result
  }

  const mapped = mapEvents(events);
  for (let i = 0; i < mapped.length; i++) {
    const event = events[i];
    const mappedEvent = mapped[i];
    if (event && mappedEvent) {
      mappedEvent.reservationCount = reservationCounts[event.id] ?? 0;
    }
  }

  return mapped;
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
// Event Overview (analytics for a single event)
// ---------------------------------------------------------------------------

/** Fetch full analytics overview for a single event. */
export async function getEventOverview(eventId: string): Promise<EventOverview> {
  const sb = await createSupabaseServerClient();

  const [reservationsResult, songsResult, checkinsResult, reviewsResult, itemsResult] = await Promise.all([
    sb.from("reservations").select("id, status, total_amount_cents, currency").eq("event_id", eventId),
    sb.from("event_song_suggestions").select("id").eq("event_id", eventId),
    sb.from("ticket_checkins").select("id, tickets!inner(event_id)").eq("tickets.event_id", eventId).eq("result", "accepted"),
    sb.from("event_reviews").select("rating").eq("event_id", eventId),
    sb.from("reservation_items").select("ticket_type_name_snapshot, quantity, line_total_cents, currency, reservations!inner(event_id, status)").eq("reservations.event_id", eventId).eq("reservations.status", "confirmed").eq("is_removed", false),
  ]);

  type ReservationAgg = { id: string; status: string; total_amount_cents: number; currency: string };
  const allReservations = (reservationsResult.data ?? []) as ReservationAgg[];
  const confirmedReservations = allReservations.filter((r) => r.status === "confirmed");
  const cancelledReservations = allReservations.filter((r) => r.status === "cancelled");

  const totalRevenueCents = confirmedReservations.reduce((sum, r) => sum + r.total_amount_cents, 0);
  const currency = confirmedReservations[0]?.currency ?? "USD";

  // Reviews
  const ratings = ((reviewsResult.data ?? []) as Array<{ rating: number }>).map((r) => r.rating);
  const reviewScore = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  // Ticket sales breakdown by type
  const breakdownMap: Record<string, { sold: number; revenue: number }> = {};
  for (const item of (itemsResult.data ?? []) as Array<{
    ticket_type_name_snapshot: string;
    quantity: number;
    line_total_cents: number;
  }>) {
    const entry = (breakdownMap[item.ticket_type_name_snapshot] ??= { sold: 0, revenue: 0 });
    entry.sold += item.quantity;
    entry.revenue += item.line_total_cents;
  }

  const ticketSalesBreakdown: TicketSalesBreakdown[] = Object.entries(breakdownMap).map(
    ([name, { sold, revenue }]) => ({
      ticketTypeName: name,
      ticketsSold: sold,
      revenue,
      revenueFormatted: formatMoney(revenue, currency),
    }),
  );

  const totalTicketsSold = ticketSalesBreakdown.reduce((sum, b) => sum + b.ticketsSold, 0);

  // Rates
  const totalBought = confirmedReservations.length + cancelledReservations.length;
  const cancellationRate = totalBought > 0 ? (cancelledReservations.length / totalBought) * 100 : null;

  return {
    eventId,
    reservationsCount: confirmedReservations.length,
    songSuggestionsCount: (songsResult.data ?? []).length,
    checkedInCount: (checkinsResult.data ?? []).length,
    reviewScore: reviewScore ? Math.round(reviewScore * 10) / 10 : null,
    reviewCount: ratings.length,
    totalTicketsSold,
    totalRevenue: totalRevenueCents,
    totalRevenueFormatted: formatMoney(totalRevenueCents, currency),
    ticketSalesBreakdown,
    conversionRate: null, // requires page view tracking (not yet available)
    cancellationRate: cancellationRate ? Math.round(cancellationRate * 10) / 10 : null,
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
