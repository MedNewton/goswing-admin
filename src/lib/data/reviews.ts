import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapReviews, computeReviewStats, type ReviewQueryRow } from "@/lib/mappers/reviews";

/** Fetch all reviews for events owned by current user. */
export async function getReviews(filters?: {
  eventId?: string;
  minRating?: number;
}) {
  const sb = await createSupabaseServerClient();

  let query = sb
    .from("event_reviews")
    .select(`
      *,
      profiles ( display_name, avatar_url ),
      events ( title )
    `)
    .order("created_at", { ascending: false });

  if (filters?.eventId) {
    query = query.eq("event_id", filters.eventId);
  }
  if (filters?.minRating) {
    query = query.gte("rating", filters.minRating);
  }

  const { data, error } = await query;
  if (error) throw error;
  return mapReviews((data ?? []) as ReviewQueryRow[]);
}

/** Fetch reviews and compute stats in one call. */
export async function getReviewsWithStats(filters?: {
  eventId?: string;
}) {
  const reviews = await getReviews(filters);
  const stats = computeReviewStats(reviews);
  return { reviews, stats };
}
