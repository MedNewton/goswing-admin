import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapVenueReviews, computeVenueReviewStats, type VenueReviewQueryRow } from "@/lib/mappers/venueReviews";

/** Fetch all reviews for a specific venue. */
export async function getVenueReviews(venueId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("venue_reviews")
    .select(`
      *,
      profiles ( display_name, avatar_url )
    `)
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return mapVenueReviews((data ?? []) as VenueReviewQueryRow[]);
}

/** Fetch venue reviews and compute stats in one call. */
export async function getVenueReviewsWithStats(venueId: string) {
  const reviews = await getVenueReviews(venueId);
  const stats = computeVenueReviewStats(reviews);
  return { reviews, stats };
}
