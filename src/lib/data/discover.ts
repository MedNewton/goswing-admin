import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mapEvent, mapEvents, type EventQueryRow } from "@/lib/mappers/events";
import { mapVenue, mapVenues } from "@/lib/mappers/venues";
import type { Event, Venue } from "@/types";
import type { VenueRow } from "@/types/database";


// ---------------------------------------------------------------------------
// Published Events
// ---------------------------------------------------------------------------

export interface DiscoverEventFilters {
  partyType?: string;
  city?: string;
  isFree?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getPublishedEvents(
  filters?: DiscoverEventFilters,
): Promise<Event[]> {
  const sb = createSupabaseAdminClient();

  let query = sb
    .from("events")
    .select(
      `*, venues ( name, city ), organizers ( name ), event_tags ( tags ( label, slug, type ) )`,
    )
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (filters?.isFree) {
    query = query.eq("is_free", true);
  }
  if (filters?.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit ?? 50) - 1,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  let events = mapEvents((data ?? []) as EventQueryRow[]);

  // Post-filter by city (from joined venue)
  if (filters?.city) {
    const cityLower = filters.city.toLowerCase();
    events = events.filter((e) =>
      e.location?.toLowerCase().includes(cityLower),
    );
  }

  // Post-filter by party type tag
  if (filters?.partyType) {
    const slug = filters.partyType;
    type RawEventWithTags = {
      id: string;
      event_tags?: Array<{ tags: { slug?: string; label?: string; type?: string } | null }>;
    };
    const rawEvents = (data ?? []) as RawEventWithTags[];
    const matchingIds = new Set(
      rawEvents
        .filter((e) =>
          e.event_tags?.some((et) => et.tags?.slug === slug),
        )
        .map((e) => e.id),
    );
    events = events.filter((e) => matchingIds.has(e.id));
  }

  return events;
}

export async function getFeaturedEvents(limit = 6): Promise<Event[]> {
  const sb = createSupabaseAdminClient();

  const { data, error } = await sb
    .from("events")
    .select(
      `*, venues ( name, city ), organizers ( name ), event_tags ( tags ( label ) )`,
    )
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .not("hero_image_url", "is", null)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return mapEvents((data ?? []) as EventQueryRow[]);
}

// ---------------------------------------------------------------------------
// Single Published Event (detail)
// ---------------------------------------------------------------------------

export async function getPublishedEvent(id: string) {
  const sb = createSupabaseAdminClient();

  const { data, error } = await sb
    .from("events")
    .select(
      `*,
      venues ( id, name, city, address_line1, region, country_code, timezone, venue_type, lat, lng ),
      organizers ( id, name, logo_url, tagline, about, cover_image_url, city, country_code, phone, email, website_url, instagram_handle, facebook_handle ),
      event_tags ( tags ( id, label, slug, type ) ),
      ticket_types ( id, name, description, price_cents, currency, capacity )`,
    )
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error) return null;

  return {
    event: mapEvent(data as EventQueryRow),
    ticketTypes: (data as Record<string, unknown>).ticket_types as Array<{
      id: string;
      name: string;
      description: string | null;
      price_cents: number;
      currency: string;
      capacity: number | null;
    }>,
    organizer: (data as Record<string, unknown>).organizers as {
      id: string;
      name: string;
      logo_url: string | null;
      tagline: string | null;
      about: string | null;
      cover_image_url: string | null;
      city: string | null;
      country_code: string | null;
      phone: string | null;
      email: string | null;
      website_url: string | null;
      instagram_handle: string | null;
      facebook_handle: string | null;
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
// Published Venues
// ---------------------------------------------------------------------------

export interface DiscoverVenueFilters {
  venueType?: string;
  city?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getPublishedVenues(
  filters?: DiscoverVenueFilters,
): Promise<Venue[]> {
  const sb = createSupabaseAdminClient();

  let query = sb
    .from("venues")
    .select("*")
    .order("name", { ascending: true });

  if (filters?.venueType) {
    query = query.ilike("venue_type", filters.venueType);
  }
  if (filters?.city) {
    query = query.ilike("city", filters.city);
  }
  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return mapVenues((data ?? []) as VenueRow[]);
}

export async function getPublishedVenue(id: string) {
  const sb = createSupabaseAdminClient();

  const { data, error } = await sb
    .from("venues")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return mapVenue(data as VenueRow);
}

// ---------------------------------------------------------------------------
// Tags (public)
// ---------------------------------------------------------------------------

export async function getPublicTags(type: string) {
  const sb = createSupabaseAdminClient();

  const { data, error } = await sb
    .from("tags")
    .select("id, label, slug, type")
    .eq("type", type)
    .order("label");

  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    label: string;
    slug: string;
    type: string;
  }>;
}

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

export interface CityInfo {
  city: string;
  eventCount: number;
  venueCount: number;
}

export async function getCitiesWithCounts(): Promise<CityInfo[]> {
  const sb = createSupabaseAdminClient();

  // Get all venues with a city
  const { data: venues, error: vErr } = await sb
    .from("venues")
    .select("id, city")
    .not("city", "is", null);

  if (vErr) throw vErr;

  // Get published upcoming events with venue_id
  const { data: events, error: eErr } = await sb
    .from("events")
    .select("venue_id")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString());

  if (eErr) throw eErr;

  // Build venue-to-city map
  const venueCityMap = new Map<string, string>();
  const cityVenueCount = new Map<string, number>();

  for (const v of (venues ?? []) as Array<{ id: string; city: string | null }>) {
    if (v.city) {
      venueCityMap.set(v.id, v.city);
      cityVenueCount.set(v.city, (cityVenueCount.get(v.city) ?? 0) + 1);
    }
  }

  // Count events per city
  const cityEventCount = new Map<string, number>();
  for (const e of (events ?? []) as Array<{ venue_id: string | null }>) {
    if (e.venue_id) {
      const city = venueCityMap.get(e.venue_id);
      if (city) {
        cityEventCount.set(city, (cityEventCount.get(city) ?? 0) + 1);
      }
    }
  }

  // Merge into result
  const allCities = new Set([
    ...cityVenueCount.keys(),
    ...cityEventCount.keys(),
  ]);

  return [...allCities]
    .map((city) => ({
      city,
      eventCount: cityEventCount.get(city) ?? 0,
      venueCount: cityVenueCount.get(city) ?? 0,
    }))
    .sort((a, b) => b.eventCount + b.venueCount - (a.eventCount + a.venueCount));
}

export async function getCityData(
  cityName: string,
): Promise<{ city: string; events: Event[]; venues: Venue[] }> {
  const [events, venues] = await Promise.all([
    getPublishedEvents({ city: cityName }),
    getPublishedVenues({ city: cityName }),
  ]);

  return { city: cityName, events, venues };
}

// ---------------------------------------------------------------------------
// Events at a venue (for venue detail page)
// ---------------------------------------------------------------------------

export async function getEventsAtVenue(venueId: string): Promise<Event[]> {
  const sb = createSupabaseAdminClient();

  const { data, error } = await sb
    .from("events")
    .select(
      `*, venues ( name, city ), organizers ( name ), event_tags ( tags ( label ) )`,
    )
    .eq("status", "published")
    .eq("venue_id", venueId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return mapEvents((data ?? []) as EventQueryRow[]);
}
