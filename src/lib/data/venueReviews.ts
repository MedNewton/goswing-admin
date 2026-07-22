// Venue reviews data layer — Gooswing REST API (/v1/admin/venues/:id/reviews).
import { adminApiCall } from "@/lib/api/client";
import type { ApiReviewStats, ApiVenueReview } from "@/lib/api/types";
import type { VenueReview } from "@/types";
import { formatDate } from "@/lib/utils/format";

type VenueReviewsResponse = Readonly<{
  items: ApiVenueReview[];
  stats: ApiReviewStats;
}>;

function mapApiVenueReview(r: ApiVenueReview): VenueReview {
  return {
    id: r.id,
    venueId: r.venueId,
    userName: r.userName,
    userAvatar: r.userAvatarUrl ?? undefined,
    rating: r.rating,
    comment: r.comment,
    date: formatDate(r.createdAt),
    adminLiked: r.adminLiked,
    adminReply: r.adminReply ?? undefined,
    adminReplyAt: r.adminReplyAt ? formatDate(r.adminReplyAt) : undefined,
  };
}

function mapApiReviewStats(stats: ApiReviewStats) {
  return {
    count: stats.count,
    average: stats.average,
    distribution: {
      1: stats.distribution["1"] ?? 0,
      2: stats.distribution["2"] ?? 0,
      3: stats.distribution["3"] ?? 0,
      4: stats.distribution["4"] ?? 0,
      5: stats.distribution["5"] ?? 0,
    } as Record<number, number>,
  };
}

/** Fetch all reviews for a specific venue. */
export async function getVenueReviews(venueId: string) {
  const res = await adminApiCall<VenueReviewsResponse>(
    `/v1/admin/venues/${venueId}/reviews`,
  );
  return res.items.map(mapApiVenueReview);
}

/** Fetch venue reviews and compute stats in one call. */
export async function getVenueReviewsWithStats(venueId: string) {
  const res = await adminApiCall<VenueReviewsResponse>(
    `/v1/admin/venues/${venueId}/reviews`,
  );
  return {
    reviews: res.items.map(mapApiVenueReview),
    stats: mapApiReviewStats(res.stats),
  };
}
