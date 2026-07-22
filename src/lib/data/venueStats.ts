// Venue detail-page data (stats, organizer, events, similar) — Gooswing REST API.
import { adminApiCall } from "@/lib/api/client";
import type {
  ApiAdminOrganizer,
  ApiItems,
  ApiSimilarVenue,
  ApiVenueEventItem,
  ApiVenueEvents,
  ApiVenueStats,
} from "@/lib/api/types";

/** Stats for the venue detail page gradient header. */
export interface VenueStats {
  eventCount: number;
  totalAttendees: number;
  reviewScore: number | null;
  reviewCount: number;
  followerCount: number;
}

/** Fetch aggregate stats for a venue. (organizerId kept for signature parity; the API derives it.) */
export async function getVenueStats(venueId: string, organizerId: string | null): Promise<VenueStats> {
  void organizerId;
  const stats = await adminApiCall<ApiVenueStats>(`/v1/admin/venues/${venueId}/stats`);
  return {
    eventCount: stats.eventCount,
    totalAttendees: stats.totalAttendees,
    reviewScore: stats.reviewScore,
    reviewCount: stats.reviewCount,
    followerCount: stats.followerCount,
  };
}

/** Organizer details needed for venue page (social links, policies, etc.). */
export interface VenueOrganizer {
  id: string;
  name: string;
  about: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  facebookHandle: string | null;
  tiktokHandle: string | null;
  snapchatHandle: string | null;
  youtubeHandle: string | null;
  twitterHandle: string | null;
  pinterestHandle: string | null;
  googleBusinessUrl: string | null;
  cancellationPolicy: string | null;
  refundPolicy: string | null;
  customPolicies: Array<{ title: string; description: string }>;
}

/** Fetch organizer data linked to a venue. (organizerId kept for signature parity; the API scopes to the caller's organizer.) */
export async function getVenueOrganizer(organizerId: string): Promise<VenueOrganizer | null> {
  void organizerId;
  try {
    const org = await adminApiCall<ApiAdminOrganizer>("/v1/admin/organizer");
    return {
      id: org.id,
      name: org.name,
      about: org.about,
      coverImageUrl: org.coverImageUrl,
      logoUrl: org.logoUrl,
      email: org.email,
      phone: org.phone,
      websiteUrl: org.websiteUrl,
      instagramHandle: org.instagramHandle,
      facebookHandle: org.facebookHandle,
      tiktokHandle: org.tiktokHandle,
      snapchatHandle: org.snapchatHandle,
      youtubeHandle: org.youtubeHandle,
      twitterHandle: org.twitterHandle,
      pinterestHandle: org.pinterestHandle,
      googleBusinessUrl: org.googleBusinessUrl,
      cancellationPolicy: org.cancellationPolicy,
      refundPolicy: org.refundPolicy,
      customPolicies: (org.customPolicies ?? []).map((p) => ({
        title: p.title,
        description: p.description,
      })),
    };
  } catch {
    return null;
  }
}

/** API camelCase event → the snake_case shape the venue page consumes. */
function mapVenueEvent(e: ApiVenueEventItem) {
  return {
    id: e.id,
    title: e.title,
    hero_image_url: e.heroImageUrl,
    starts_at: e.startsAt,
    ends_at: e.endsAt,
    status: e.status,
    attendee_count: e.attendeeCount,
    min_price_cents: e.minPriceCents as number | null,
    is_free: e.isFree,
    currency: e.currency,
  };
}

/** Fetch events for a venue grouped by status (live/upcoming/past). */
export async function getVenueEvents(venueId: string) {
  const res = await adminApiCall<ApiVenueEvents>(`/v1/admin/venues/${venueId}/events`);
  return {
    live: res.live.map(mapVenueEvent),
    upcoming: res.upcoming.map(mapVenueEvent),
    past: res.past.map(mapVenueEvent),
    all: res.all.map(mapVenueEvent),
  };
}

/** Fetch similar venues in the same city (excluding current). (city kept for signature parity; the API derives it.) */
export async function getSimilarVenues(venueId: string, city: string | null) {
  if (!city) return [];

  try {
    const res = await adminApiCall<ApiItems<ApiSimilarVenue>>(
      `/v1/admin/venues/${venueId}/similar`,
      { query: { limit: 6 } },
    );
    return res.items.map((v) => ({
      id: v.id,
      name: v.name,
      city: v.city,
      venue_type: v.venueType,
      capacity: v.capacity,
    }));
  } catch {
    return [];
  }
}
