"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateTable } from "@/lib/supabase/mutations";
import { getTagsByType, getOrganizerTags, setOrganizerTags } from "@/lib/data/tags";
import {
  getOrganizerGallery,
  addOrganizerGalleryItem,
  removeOrganizerGalleryItem,
} from "@/lib/data/gallery";
import { getVenueOrganizer } from "@/lib/data/venueStats";
import type { GalleryItem } from "@/types";
import type { VenueOrganizer } from "@/lib/data/venueStats";

// ---------------------------------------------------------------------------
// Re-exports as server actions (callable from client components)
// ---------------------------------------------------------------------------

export async function fetchTagsByType(type: string) {
  return getTagsByType(type);
}

export async function fetchOrganizerTags(organizerId: string) {
  return getOrganizerTags(organizerId);
}

export async function syncOrganizerTags(organizerId: string, tagIds: string[]) {
  await setOrganizerTags(organizerId, tagIds);
}

export async function fetchOrganizerGallery(organizerId: string): Promise<GalleryItem[]> {
  return getOrganizerGallery(organizerId);
}

export async function addGalleryImage(
  organizerId: string,
  item: { image_url: string; media_type?: string; caption?: string; sort_order?: number },
): Promise<string> {
  return addOrganizerGalleryItem(organizerId, item);
}

export async function removeGalleryImage(id: string): Promise<void> {
  await removeOrganizerGalleryItem(id);
}

export async function fetchVenueOrganizer(organizerId: string): Promise<VenueOrganizer | null> {
  return getVenueOrganizer(organizerId);
}

// ---------------------------------------------------------------------------
// Update organizer fields (social, policies, cover image, etc.)
// ---------------------------------------------------------------------------

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
  try {
    const sb = await createSupabaseServerClient();

    const { error } = await updateTable(sb, "organizers", {
      cover_image_url: input.cover_image_url,
      website_url: input.website_url,
      google_business_url: input.google_business_url,
      instagram_handle: input.instagram_handle,
      tiktok_handle: input.tiktok_handle,
      facebook_handle: input.facebook_handle,
      snapchat_handle: input.snapchat_handle,
      twitter_handle: input.twitter_handle,
      youtube_handle: input.youtube_handle,
      pinterest_handle: input.pinterest_handle,
      cancellation_policy: input.cancellation_policy,
      refund_policy: input.refund_policy,
      custom_policies: input.custom_policies,
    }).eq("id", organizerId);

    if (error) {
      console.error("updateOrganizerAction error:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("updateOrganizerAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to update organizer";
    return { success: false, error: message };
  }
}
