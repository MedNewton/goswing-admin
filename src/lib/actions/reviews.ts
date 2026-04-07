"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateTable } from "@/lib/supabase/mutations";
import { revalidatePath } from "next/cache";

export type ReviewActionResult =
  | { success: true }
  | { success: false; error: string };

/** Toggle admin like on an event review. */
export async function toggleReviewLike(
  reviewId: string,
): Promise<ReviewActionResult> {
  try {
    const sb = await createSupabaseServerClient();

    // Fetch current state
    const { data: review, error: fetchError } = await sb
      .from("event_reviews")
      .select("admin_liked")
      .eq("id", reviewId)
      .single();

    if (fetchError) throw fetchError;

    const currentLiked = (review as { admin_liked: boolean } | null)?.admin_liked ?? false;

    const { error } = await updateTable(sb, "event_reviews", {
      admin_liked: !currentLiked,
    }).eq("id", reviewId);

    if (error) throw error;

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
    const sb = await createSupabaseServerClient();

    const { error } = await updateTable(sb, "event_reviews", {
      admin_reply: reply.trim(),
      admin_reply_at: new Date().toISOString(),
    }).eq("id", reviewId);

    if (error) throw error;

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
    const sb = await createSupabaseServerClient();

    const { error } = await updateTable(sb, "event_reviews", {
      admin_reply: null,
      admin_reply_at: null,
    }).eq("id", reviewId);

    if (error) throw error;

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
    const sb = await createSupabaseServerClient();

    const { data: review, error: fetchError } = await sb
      .from("venue_reviews")
      .select("admin_liked")
      .eq("id", reviewId)
      .single();

    if (fetchError) throw fetchError;

    const currentLiked = (review as { admin_liked: boolean } | null)?.admin_liked ?? false;

    const { error } = await updateTable(sb, "venue_reviews", {
      admin_liked: !currentLiked,
    }).eq("id", reviewId);

    if (error) throw error;

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
    const sb = await createSupabaseServerClient();

    const { error } = await updateTable(sb, "venue_reviews", {
      admin_reply: reply.trim(),
      admin_reply_at: new Date().toISOString(),
    }).eq("id", reviewId);

    if (error) throw error;

    revalidatePath("/reviews");
    return { success: true };
  } catch (err) {
    console.error("replyToVenueReview error:", err);
    const message = err instanceof Error ? err.message : "Failed to reply to review";
    return { success: false, error: message };
  }
}
