import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertInto } from "@/lib/supabase/mutations";
import type { GalleryItem } from "@/types";

// ---------------------------------------------------------------------------
// Organizer Gallery
// ---------------------------------------------------------------------------

/** Fetch gallery items for an organizer. */
export async function getOrganizerGallery(organizerId: string): Promise<GalleryItem[]> {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("organizer_gallery")
    .select("id, image_url, media_type, caption, sort_order")
    .eq("organizer_id", organizerId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as Array<{
    id: string;
    image_url: string;
    media_type: string;
    caption: string | null;
    sort_order: number | null;
  }>).map((row) => ({
    id: row.id,
    mediaUrl: row.image_url,
    mediaType: row.media_type === "video" ? "video" : "image",
    caption: row.caption ?? undefined,
    sortOrder: row.sort_order ?? 0,
  }));
}

/** Add a gallery item for an organizer. */
export async function addOrganizerGalleryItem(
  organizerId: string,
  item: { image_url: string; media_type?: string; caption?: string; sort_order?: number },
) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await insertInto(sb, "organizer_gallery", {
    organizer_id: organizerId,
    ...item,
  })
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

/** Remove a gallery item. */
export async function removeOrganizerGalleryItem(id: string) {
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("organizer_gallery")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Event Gallery
// ---------------------------------------------------------------------------

/** Fetch gallery items for an event. */
export async function getEventGallery(eventId: string): Promise<GalleryItem[]> {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("event_gallery")
    .select("id, media_url, media_type, caption, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as Array<{
    id: string;
    media_url: string;
    media_type: string;
    caption: string | null;
    sort_order: number | null;
  }>).map((row) => ({
    id: row.id,
    mediaUrl: row.media_url,
    mediaType: row.media_type === "video" ? "video" : "image",
    caption: row.caption ?? undefined,
    sortOrder: row.sort_order ?? 0,
  }));
}

/** Add a gallery item for an event. */
export async function addEventGalleryItem(
  eventId: string,
  item: { media_url: string; media_type?: string; caption?: string; sort_order?: number },
) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await insertInto(sb, "event_gallery", {
    event_id: eventId,
    ...item,
  })
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

/** Remove an event gallery item. */
export async function removeEventGalleryItem(id: string) {
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("event_gallery")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
