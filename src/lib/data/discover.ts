import { publicApiCall, isNotFound } from "@/lib/api/client";
import type {
  ApiCityInfo,
  ApiItems,
  ApiPublicEventCard,
  ApiPublicEventDetail,
  ApiPublicOrganizer,
  ApiPublicVenue,
  ApiPublicVenueDetail,
  ApiTag,
} from "@/lib/api/types";
import type { Event, Venue } from "@/types";
import { formatDate, formatPrice } from "@/lib/utils/format";

// Discover listings are cached briefly so public pages can be served fast.
const LIST_REVALIDATE = 60;

// ---------------------------------------------------------------------------
// Local mappers (API → UI view models)
// ---------------------------------------------------------------------------

function mapPublicEventCardToUiEvent(card: ApiPublicEventCard): Event {
  const location = [card.venueName, card.venueCity].filter(Boolean).join(", ");
  return {
    id: card.id,
    title: card.title,
    description: card.description ?? undefined,
    image: card.heroImageUrl ?? "/placeholder-event.png",
    date: formatDate(card.startsAt),
    startsAt: card.startsAt,
    endsAt: card.endsAt ?? undefined,
    location: location || "TBA",
    venue: card.venueName ?? undefined,
    attendeeCount: card.attendeeCount,
    status: "published",
    currency: card.currency.trim(),
    minPrice: formatPrice(card.minPriceCents, card.currency, card.isFree),
    isFree: card.isFree,
    organizerName: card.organizerName ?? undefined,
    tags: [...card.tags],
    partyTypes: [...card.partyTypes],
    musicStyles: [...card.musicStyles],
    extraServices: [...card.extraServices],
  };
}

function mapPublicVenueToUiVenue(v: ApiPublicVenue): Venue {
  return {
    id: v.id,
    name: v.name,
    address: v.addressLine1,
    city: v.city,
    region: v.region,
    countryCode: v.countryCode,
    lat: v.lat,
    lng: v.lng,
    venueType: v.venueType,
    timezone: v.timezone,
    // Not exposed by the public API; unused by public pages.
    createdAt: "",
    postalCode: v.postalCode,
    capacity: v.capacity,
    organizerId: v.organizerId,
    description: v.description,
    freeAccess: v.freeAccess,
    freeForLadies: v.freeForLadies,
    coverImageUrl: v.coverImageUrl,
  };
}

function mapPublicOrganizerToRaw(o: ApiPublicOrganizer) {
  return {
    id: o.id,
    name: o.name,
    logo_url: o.logoUrl,
    tagline: o.tagline,
    about: o.about,
    cover_image_url: o.coverImageUrl,
    city: o.city,
    country_code: o.countryCode,
    phone: o.phone,
    email: o.email,
    website_url: o.websiteUrl,
    instagram_handle: o.instagramHandle,
    facebook_handle: o.facebookHandle,
    specialties: o.specialties,
  };
}

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
  const { items } = await publicApiCall<ApiItems<ApiPublicEventCard>>(
    "/v1/public/events",
    {
      query: {
        city: filters?.city,
        partyType: filters?.partyType,
        isFree: filters?.isFree ? true : undefined,
        search: filters?.search,
        limit: filters?.limit,
        offset: filters?.offset,
      },
      revalidate: LIST_REVALIDATE,
    },
  );
  return items.map(mapPublicEventCardToUiEvent);
}

export async function getFeaturedEvents(limit = 6): Promise<Event[]> {
  const { items } = await publicApiCall<ApiItems<ApiPublicEventCard>>(
    "/v1/public/events/featured",
    { query: { limit }, revalidate: LIST_REVALIDATE },
  );
  return items.map(mapPublicEventCardToUiEvent);
}

// ---------------------------------------------------------------------------
// Single Published Event (detail)
// ---------------------------------------------------------------------------

export async function getPublishedEvent(id: string) {
  let data: ApiPublicEventDetail;
  try {
    data = await publicApiCall<ApiPublicEventDetail>(
      `/v1/public/events/${id}`,
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }

  return {
    event: mapPublicEventCardToUiEvent(data.event),
    ticketTypes: data.ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      price_cents: tt.priceCents,
      currency: tt.currency,
      capacity: tt.capacity,
    })),
    organizer: data.organizer
      ? mapPublicOrganizerToRaw(data.organizer)
      : null,
    venue: data.venue
      ? {
          id: data.venue.id,
          name: data.venue.name,
          city: data.venue.city,
          address_line1: data.venue.addressLine1,
          region: data.venue.region,
          country_code: data.venue.countryCode,
          timezone: data.venue.timezone,
          venue_type: data.venue.venueType,
          lat: data.venue.lat,
          lng: data.venue.lng,
        }
      : null,
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
  const { items } = await publicApiCall<ApiItems<ApiPublicVenue>>(
    "/v1/public/venues",
    {
      query: {
        venueType: filters?.venueType,
        city: filters?.city,
        search: filters?.search,
        limit: filters?.limit,
        offset: filters?.offset,
      },
      revalidate: LIST_REVALIDATE,
    },
  );
  return items.map(mapPublicVenueToUiVenue);
}

export async function getPublishedVenue(id: string) {
  try {
    const data = await publicApiCall<ApiPublicVenueDetail>(
      `/v1/public/venues/${id}`,
    );
    return mapPublicVenueToUiVenue(data.venue);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Tags (public)
// ---------------------------------------------------------------------------

export async function getPublicTags(type: string) {
  const { items } = await publicApiCall<ApiItems<ApiTag>>("/v1/public/tags", {
    query: { type },
    revalidate: LIST_REVALIDATE,
  });
  return items.map((t) => ({
    id: t.id,
    label: t.label,
    slug: t.slug,
    type: t.type,
  }));
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
  const { items } = await publicApiCall<ApiItems<ApiCityInfo>>(
    "/v1/public/cities",
    { revalidate: LIST_REVALIDATE },
  );
  return items.map((c) => ({
    city: c.city,
    eventCount: c.eventCount,
    venueCount: c.venueCount,
  }));
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
  try {
    const { items } = await publicApiCall<ApiItems<ApiPublicEventCard>>(
      `/v1/public/venues/${venueId}/events`,
      { revalidate: LIST_REVALIDATE },
    );
    return items.map(mapPublicEventCardToUiEvent);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Events by organizer (for "More from this organizer" carousel)
// ---------------------------------------------------------------------------

export async function getEventsByOrganizer(
  organizerId: string,
  excludeEventId?: string,
  limit = 6,
): Promise<Event[]> {
  try {
    const { items } = await publicApiCall<ApiItems<ApiPublicEventCard>>(
      `/v1/public/organizers/${organizerId}/events`,
      { query: { exclude: excludeEventId, limit }, revalidate: LIST_REVALIDATE },
    );
    return items.map(mapPublicEventCardToUiEvent);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Similar events (same city preferred, excluding current)
// ---------------------------------------------------------------------------

export async function getSimilarEvents(
  eventId: string,
  venueCity: string | null,
  limit = 6,
): Promise<Event[]> {
  // venueCity is unused: the API applies the city preference itself.
  void venueCity;
  try {
    const { items } = await publicApiCall<ApiItems<ApiPublicEventCard>>(
      `/v1/public/events/${eventId}/similar`,
      { query: { limit }, revalidate: LIST_REVALIDATE },
    );
    return items.map(mapPublicEventCardToUiEvent);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

/** Find published venues in the same city, excluding the current one. */
export async function getSimilarPublishedVenues(
  venueId: string,
  city: string | null,
  limit = 6,
): Promise<Venue[]> {
  // city is unused: the API resolves the venue's city itself.
  void city;
  try {
    const { items } = await publicApiCall<ApiItems<ApiPublicVenue>>(
      `/v1/public/venues/${venueId}/similar`,
      { query: { limit }, revalidate: LIST_REVALIDATE },
    );
    return items.map(mapPublicVenueToUiVenue);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Public venue with organizer (for guest venue view)
// ---------------------------------------------------------------------------

export async function getPublishedVenueDetail(id: string) {
  let data: ApiPublicVenueDetail;
  try {
    data = await publicApiCall<ApiPublicVenueDetail>(
      `/v1/public/venues/${id}`,
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }

  const organizer = data.organizer
    ? {
        ...mapPublicOrganizerToRaw(data.organizer),
        tiktok_handle: data.organizer.tiktokHandle ?? null,
        snapchat_handle: data.organizer.snapchatHandle ?? null,
      }
    : null;

  return { venue: mapPublicVenueToUiVenue(data.venue), organizer };
}
