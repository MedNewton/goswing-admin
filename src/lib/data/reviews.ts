import { adminApiCall } from "@/lib/api/client";
import type { ApiAdminReview, ApiReviewStats } from "@/lib/api/types";
import type { Review } from "@/types";
import { formatDate } from "@/lib/utils/format";

type ReviewsResponse = Readonly<{
  items: ApiAdminReview[];
  stats: ApiReviewStats;
}>;

function mapApiReview(r: ApiAdminReview): Review {
  return {
    id: r.id,
    eventId: r.eventId,
    eventName: r.eventTitle,
    userName: r.userName,
    userAvatar: r.userAvatarUrl ?? undefined,
    rating: r.rating,
    comment: r.comment,
    date: formatDate(r.createdAt),
    helpful: 0,
    adminLiked: r.adminLiked,
    adminReply: r.adminReply ?? undefined,
    adminReplyAt: r.adminReplyAt ? formatDate(r.adminReplyAt) : undefined,
  };
}

function mapApiStats(stats: ApiReviewStats): {
  count: number;
  average: number;
  distribution: Record<number, number>;
} {
  return {
    count: stats.count,
    average: stats.average,
    distribution: {
      1: stats.distribution["1"] ?? 0,
      2: stats.distribution["2"] ?? 0,
      3: stats.distribution["3"] ?? 0,
      4: stats.distribution["4"] ?? 0,
      5: stats.distribution["5"] ?? 0,
    },
  };
}

function fetchReviews(filters?: { eventId?: string; minRating?: number }) {
  return adminApiCall<ReviewsResponse>("/v1/admin/reviews", {
    query: { eventId: filters?.eventId, minRating: filters?.minRating },
  });
}

/** Fetch all reviews for events owned by current user. */
export async function getReviews(filters?: {
  eventId?: string;
  minRating?: number;
}) {
  const { items } = await fetchReviews(filters);
  return items.map(mapApiReview);
}

/** Fetch reviews and compute stats in one call. */
export async function getReviewsWithStats(filters?: {
  eventId?: string;
}) {
  const { items, stats } = await fetchReviews(filters);
  return { reviews: items.map(mapApiReview), stats: mapApiStats(stats) };
}
