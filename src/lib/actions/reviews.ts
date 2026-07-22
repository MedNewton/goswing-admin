"use server";

import { adminApiCall } from "@/lib/api/client";
import type { ApiLikeToggleResult, ApiReplyResult } from "@/lib/api/types";
import { revalidatePath } from "next/cache";

export type ReviewActionResult =
  | { success: true }
  | { success: false; error: string };

/** Toggle admin like on an event review. */
export async function toggleReviewLike(
  reviewId: string,
): Promise<ReviewActionResult> {
  try {
    await adminApiCall<ApiLikeToggleResult>(
      `/v1/admin/reviews/${reviewId}/like-toggle`,
      { method: "POST" },
    );

    revalidatePath("/reviews");
    return { success: true };
  } catch (err) {
    console.error("toggleReviewLike error:", err);
    const message = err instanceof Error ? err.message : "Failed to toggle like";
    return { success: false, error: message };
  }
}

/** Add or update admin reply on an event review. */
export async function replyToReview(
  reviewId: string,
  reply: string,
): Promise<ReviewActionResult> {
  try {
    await adminApiCall<ApiReplyResult>(`/v1/admin/reviews/${reviewId}/reply`, {
      method: "PUT",
      body: { reply: reply.trim() },
    });

    revalidatePath("/reviews");
    return { success: true };
  } catch (err) {
    console.error("replyToReview error:", err);
    const message = err instanceof Error ? err.message : "Failed to reply to review";
    return { success: false, error: message };
  }
}

/** Remove admin reply from an event review. */
export async function removeReviewReply(
  reviewId: string,
): Promise<ReviewActionResult> {
  try {
    await adminApiCall<ApiReplyResult>(`/v1/admin/reviews/${reviewId}/reply`, {
      method: "DELETE",
    });

    revalidatePath("/reviews");
    return { success: true };
  } catch (err) {
    console.error("removeReviewReply error:", err);
    const message = err instanceof Error ? err.message : "Failed to remove reply";
    return { success: false, error: message };
  }
}

/** Toggle admin like on a venue review. */
export async function toggleVenueReviewLike(
  reviewId: string,
): Promise<ReviewActionResult> {
  try {
    await adminApiCall<ApiLikeToggleResult>(
      `/v1/admin/venue-reviews/${reviewId}/like-toggle`,
      { method: "POST" },
    );

    revalidatePath("/reviews");
    return { success: true };
  } catch (err) {
    console.error("toggleVenueReviewLike error:", err);
    const message = err instanceof Error ? err.message : "Failed to toggle like";
    return { success: false, error: message };
  }
}

/** Add or update admin reply on a venue review. */
export async function replyToVenueReview(
  reviewId: string,
  reply: string,
): Promise<ReviewActionResult> {
  try {
    await adminApiCall<ApiReplyResult>(
      `/v1/admin/venue-reviews/${reviewId}/reply`,
      { method: "PUT", body: { reply: reply.trim() } },
    );

    revalidatePath("/reviews");
    return { success: true };
  } catch (err) {
    console.error("replyToVenueReview error:", err);
    const message = err instanceof Error ? err.message : "Failed to reply to review";
    return { success: false, error: message };
  }
}
