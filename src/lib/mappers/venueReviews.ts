import type { VenueReviewRow, ProfileRow } from "@/types/database";
import type { VenueReview } from "@/types";
import { formatDate } from "@/lib/utils/format";

/** Shape returned by a venue_reviews query with profile join. */
export interface VenueReviewQueryRow extends VenueReviewRow {
  profiles?: Pick<ProfileRow, "display_name" | "avatar_url"> | null;
}

/** Map a single venue_review row to the UI VenueReview view model. */
export function mapVenueReview(row: VenueReviewQueryRow): VenueReview {
  return {
    id: row.id,
    venueId: row.venue_id,
    userName: row.profiles?.display_name ?? "Anonymous",
    userAvatar: row.profiles?.avatar_url ?? undefined,
    rating: row.rating,
    comment: row.comment ?? "",
    date: formatDate(row.created_at),
    adminLiked: row.admin_liked,
    adminReply: row.admin_reply ?? undefined,
    adminReplyAt: row.admin_reply_at ? formatDate(row.admin_reply_at) : undefined,
  };
}

export function mapVenueReviews(rows: VenueReviewQueryRow[]): VenueReview[] {
  return rows.map(mapVenueReview);
}

/** Compute aggregate stats from a set of venue reviews. */
export function computeVenueReviewStats(reviews: VenueReview[]) {
  if (reviews.length === 0) {
    return {
      count: 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
    };
  }

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of reviews) {
    const clamped = Math.max(1, Math.min(5, Math.round(r.rating)));
    distribution[clamped] = (distribution[clamped] ?? 0) + 1;
    sum += r.rating;
  }

  return {
    count: reviews.length,
    average: Math.round((sum / reviews.length) * 10) / 10,
    distribution,
  };
}
