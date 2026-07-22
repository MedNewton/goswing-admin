"use server";

// Organizer edit server actions — Gooswing REST API backed.
// Role enforcement lives in the API (403 role_forbidden); the old
// assertOrganizerAdmin guard is no longer needed. The `organizerId`
// parameters are kept for signature parity — the API always scopes
// requests to the caller's organizer.

import { adminApiCall, isApiError } from "@/lib/api/client";
import type { ApiAdminOrganizer, ApiGalleryItem, ApiItems, ApiTag } from "@/lib/api/types";
import { getVenueOrganizer } from "@/lib/data/venueStats";
import type { GalleryItem } from "@/types";
import type { VenueOrganizer } from "@/lib/data/venueStats";

const FORBIDDEN_MESSAGE = "Forbidden: not an admin of this organizer";

/** Re-throw API 403s with the message the old guard produced. */
function rethrowMapped(err: unknown): never {
  if (isApiError(err) && err.status === 403) {
    throw new Error(FORBIDDEN_MESSAGE);
  }
  throw err;
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function fetchTagsByType(type: string) {
  const res = await adminApiCall<ApiItems<ApiTag>>("/v1/admin/tags", {
    query: { type },
  });
  return res.items as Array<{ id: string; label: string; slug: string; type: string }>;
}

export async function fetchOrganizerTags(organizerId: string) {
  void organizerId;
  const res = await adminApiCall<ApiItems<ApiTag>>("/v1/admin/organizer/tags");
  return res.items as Array<{ id: string; label: string; slug: string; type: string }>;
}

export async function syncOrganizerTags(organizerId: string, tagIds: string[]) {
  void organizerId;
  try {
    await adminApiCall<ApiItems<ApiTag>>("/v1/admin/organizer/tags", {
      method: "PUT",
      body: { tagIds },
    });
  } catch (err) {
    rethrowMapped(err);
  }
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

function mapGalleryItem(item: ApiGalleryItem): GalleryItem {
  return {
    id: item.id,
    mediaUrl: item.url,
    mediaType: item.mediaType,
    caption: item.caption ?? undefined,
    sortOrder: item.sortOrder,
  };
}

export async function fetchOrganizerGallery(organizerId: string): Promise<GalleryItem[]> {
  void organizerId;
  const res = await adminApiCall<ApiItems<ApiGalleryItem>>(
    "/v1/admin/organizer/gallery",
  );
  return res.items.map(mapGalleryItem);
}

export async function addGalleryImage(
  organizerId: string,
  item: { image_url: string; media_type?: string; caption?: string; sort_order?: number },
): Promise<string> {
  void organizerId;
  try {
    const created = await adminApiCall<ApiGalleryItem>("/v1/admin/organizer/gallery", {
      method: "POST",
      body: {
        url: item.image_url,
        mediaType: item.media_type,
        caption: item.caption,
        sortOrder: item.sort_order,
      },
    });
    return created.id;
  } catch (err) {
    rethrowMapped(err);
  }
}

export async function removeGalleryImage(id: string): Promise<void> {
  try {
    await adminApiCall<void>(`/v1/admin/organizer/gallery/${id}`, {
      method: "DELETE",
    });
  } catch (err) {
    if (isApiError(err) && err.status === 404) {
      throw new Error("Gallery item not found");
    }
    rethrowMapped(err);
  }
}

// ---------------------------------------------------------------------------
// Organizer profile
// ---------------------------------------------------------------------------

export async function fetchVenueOrganizer(organizerId: string): Promise<VenueOrganizer | null> {
  return getVenueOrganizer(organizerId);
}

export type UpdateOrganizerResult =
  | { success: true }
  | { success: false; error: string };

export interface UpdateOrganizerInput {
  cover_image_url?: string | null;
  website_url?: string | null;
  google_business_url?: string | null;
  instagram_handle?: string | null;
  tiktok_handle?: string | null;
  facebook_handle?: string | null;
  snapchat_handle?: string | null;
  twitter_handle?: string | null;
  youtube_handle?: string | null;
  pinterest_handle?: string | null;
  cancellation_policy?: string | null;
  refund_policy?: string | null;
  custom_policies?: Array<{ title: string; description: string }>;
}

export async function updateOrganizerAction(
  organizerId: string,
  input: UpdateOrganizerInput,
): Promise<UpdateOrganizerResult> {
  void organizerId;
  try {
    // snake_case input (kept for caller parity) → camelCase API body.
    // Undefined values disappear on JSON serialization → PATCH partial semantics.
    await adminApiCall<ApiAdminOrganizer>("/v1/admin/organizer", {
      method: "PATCH",
      body: {
        coverImageUrl: input.cover_image_url,
        websiteUrl: input.website_url,
        googleBusinessUrl: input.google_business_url,
        instagramHandle: input.instagram_handle,
        tiktokHandle: input.tiktok_handle,
        facebookHandle: input.facebook_handle,
        snapchatHandle: input.snapchat_handle,
        twitterHandle: input.twitter_handle,
        youtubeHandle: input.youtube_handle,
        pinterestHandle: input.pinterest_handle,
        cancellationPolicy: input.cancellation_policy,
        refundPolicy: input.refund_policy,
        customPolicies: input.custom_policies,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("updateOrganizerAction error:", err);
    if (isApiError(err)) {
      if (err.status === 403) return { success: false, error: FORBIDDEN_MESSAGE };
      // 409 conflict (duplicate organizer name) and 400 validation_failed
      // surface the API message, matching the previous error-result shape.
      return { success: false, error: err.message };
    }
    const message = err instanceof Error ? err.message : "Failed to update organizer";
    return { success: false, error: message };
  }
}
