import type { EventReviewRow, EventRow, ProfileRow } from "@/types/database";
import type { Review } from "@/types";
import { formatDate } from "@/lib/utils/format";

/** Shape returned by a reviews query with profile + event joins. */
export interface ReviewQueryRow extends EventReviewRow {
  profiles?: Pick<ProfileRow, "display_name" | "avatar_url"> | null;
  events?: Pick<EventRow, "title"> | null;
}

/** Map a single event_review row to the UI Review view model. */
export function mapReview(row: ReviewQueryRow): Review {
  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.events?.title ?? undefined,
    userName: row.profiles?.display_name ?? "Anonymous",
    userAvatar: row.profiles?.avatar_url ?? undefined,
    rating: row.rating,
    comment: row.comment ?? "",
    date: formatDate(row.created_at),
    helpful: 0, // no DB column for this yet
  };
}

export function mapReviews(rows: ReviewQueryRow[]): Review[] {
  return rows.map(mapReview);
}

/** Compute aggregate stats from a set of reviews. */
export function computeReviewStats(reviews: Review[]) {
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
