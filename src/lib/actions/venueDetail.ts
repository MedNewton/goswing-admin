"use server";

import type { VenueStats, VenueOrganizer } from "@/lib/data/venueStats";
import type { GalleryItem, VenueReview } from "@/types";

// ---------------------------------------------------------------------------
// Server action wrappers for venue detail page
// ---------------------------------------------------------------------------
// Note: type re-exports are intentionally avoided here. Next.js's
// "use server" transform treats every named export as a server action,
// which breaks runtime evaluation of type-only re-exports. Consumers
// should import VenueStats / VenueOrganizer from "@/lib/data/venueStats".

export type VenueEventItem = {
  id: string;
  title: string;
  hero_image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  attendee_count: number;
  min_price_cents: number | null;
  is_free: boolean;
  currency: string;
};

export type SimilarVenueItem = {
  id: string;
  name: string;
  city: string | null;
  venue_type: string | null;
  capacity: number | null;
};

export type TagItem = {
  id: string;
  label: string;
  slug: string;
  type: string;
};

export async function fetchVenueStats(
  venueId: string,
  organizerId: string | null,
): Promise<VenueStats> {
  const { getVenueStats } = await import("@/lib/data/venueStats");
  return getVenueStats(venueId, organizerId);
}

export async function fetchVenueOrganizer(
  organizerId: string,
): Promise<VenueOrganizer | null> {
  const { getVenueOrganizer } = await import("@/lib/data/venueStats");
  return getVenueOrganizer(organizerId);
}

export async function fetchVenueEvents(venueId: string): Promise<{
  live: VenueEventItem[];
  upcoming: VenueEventItem[];
  past: VenueEventItem[];
  all: VenueEventItem[];
}> {
  const { getVenueEvents } = await import("@/lib/data/venueStats");
  return getVenueEvents(venueId);
}

export async function fetchSimilarVenues(
  venueId: string,
  city: string | null,
): Promise<SimilarVenueItem[]> {
  const { getSimilarVenues } = await import("@/lib/data/venueStats");
  return getSimilarVenues(venueId, city);
}

export async function fetchVenueReviewsWithStats(venueId: string): Promise<{
  reviews: VenueReview[];
  stats: { count: number; average: number; distribution: Record<number, number> };
}> {
  const { getVenueReviewsWithStats } = await import("@/lib/data/venueReviews");
  return getVenueReviewsWithStats(venueId);
}

export async function fetchOrganizerGallery(
  organizerId: string,
): Promise<GalleryItem[]> {
  const { getOrganizerGallery } = await import("@/lib/data/gallery");
  return getOrganizerGallery(organizerId);
}

export async function fetchOrganizerTags(
  organizerId: string,
): Promise<TagItem[]> {
  const { getOrganizerTags } = await import("@/lib/data/tags");
  return getOrganizerTags(organizerId);
}
