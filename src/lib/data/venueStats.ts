import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/data/auth";

/** Stats for the venue detail page gradient header. */
export interface VenueStats {
  eventCount: number;
  totalAttendees: number;
  reviewScore: number | null;
  reviewCount: number;
  followerCount: number;
}

/** Fetch aggregate stats for a venue. */
export async function getVenueStats(venueId: string, organizerId: string | null): Promise<VenueStats> {
  const sb = await createSupabaseServerClient();

  // Count events for this venue
  const { count: eventCount } = await sb
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId);

  // Sum attendee_count across all events for this venue
  const { data: attendeeData } = await sb
    .from("events")
    .select("attendee_count")
    .eq("venue_id", venueId);

  const totalAttendees = (attendeeData ?? []).reduce(
    (sum, e) => sum + ((e as { attendee_count: number }).attendee_count ?? 0),
    0,
  );

  // Venue review stats
  const { data: reviewData } = await sb
    .from("venue_reviews")
    .select("rating")
    .eq("venue_id", venueId);

  const reviews = (reviewData ?? []) as Array<{ rating: number }>;
  const reviewCount = reviews.length;
  const reviewScore =
    reviewCount > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
      : null;

  // Follower count (from organizer_follows)
  let followerCount = 0;
  if (organizerId) {
    const { count } = await sb
      .from("organizer_follows")
      .select("id", { count: "exact", head: true })
      .eq("organizer_id", organizerId);
    followerCount = count ?? 0;
  }

  return {
    eventCount: eventCount ?? 0,
    totalAttendees,
    reviewScore,
    reviewCount,
    followerCount,
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

/** Fetch organizer data linked to a venue. */
export async function getVenueOrganizer(organizerId: string): Promise<VenueOrganizer | null> {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("organizers")
    .select("*")
    .eq("id", organizerId)
    .single();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;

  return {
    id: row.id as string,
    name: row.name as string,
    about: row.about as string | null,
    coverImageUrl: row.cover_image_url as string | null,
    logoUrl: row.logo_url as string | null,
    email: row.email as string | null,
    phone: row.phone as string | null,
    websiteUrl: row.website_url as string | null,
    instagramHandle: row.instagram_handle as string | null,
    facebookHandle: row.facebook_handle as string | null,
    tiktokHandle: row.tiktok_handle as string | null,
    snapchatHandle: row.snapchat_handle as string | null,
    youtubeHandle: row.youtube_handle as string | null,
    twitterHandle: row.twitter_handle as string | null,
    pinterestHandle: row.pinterest_handle as string | null,
    googleBusinessUrl: row.google_business_url as string | null,
    cancellationPolicy: row.cancellation_policy as string | null,
    refundPolicy: row.refund_policy as string | null,
    customPolicies: (row.custom_policies as Array<{ title: string; description: string }>) ?? [],
  };
}

/** Fetch events for a venue grouped by status (live/upcoming/past). */
export async function getVenueEvents(venueId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("events")
    .select("id, title, hero_image_url, starts_at, ends_at, status, attendee_count, min_price_cents, is_free, currency")
    .eq("venue_id", venueId)
    .order("starts_at", { ascending: false });

  if (error) throw error;

  const now = new Date();
  const events = (data ?? []) as Array<{
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
  }>;

  const live = events.filter(
    (e) => e.status === "live" || (e.status === "published" && new Date(e.starts_at) <= now && (!e.ends_at || new Date(e.ends_at) > now)),
  );
  const upcoming = events.filter(
    (e) => (e.status === "published" || e.status === "draft") && new Date(e.starts_at) > now,
  );
  const past = events.filter(
    (e) => e.status === "completed" || (e.ends_at && new Date(e.ends_at) <= now),
  );

  return { live, upcoming, past, all: events };
}

/** Fetch similar venues in the same city (excluding current). */
export async function getSimilarVenues(venueId: string, city: string | null) {
  if (!city) return [];

  const sb = await createSupabaseServerClient();
  const userId = await getCurrentUserId();

  const { data, error } = await sb
    .from("venues")
    .select("id, name, city, venue_type, capacity")
    .eq("created_by_user_id", userId)
    .eq("city", city)
    .neq("id", venueId)
    .limit(6);

  if (error) return [];
  return (data ?? []) as Array<{
    id: string;
    name: string;
    city: string | null;
    venue_type: string | null;
    capacity: number | null;
  }>;
}
