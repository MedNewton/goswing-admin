import { adminApiCall, publicApiCall, isNotFound } from "@/lib/api/client";
import type {
  ApiAdminEvent,
  ApiAdminEventDetail,
  ApiGalleryItem,
  ApiGalleryItemInput,
  ApiItems,
} from "@/lib/api/types";
import type { GalleryItem } from "@/types";

function mapApiGalleryItem(item: ApiGalleryItem): GalleryItem {
  return {
    id: item.id,
    mediaUrl: item.url,
    mediaType: item.mediaType === "video" ? "video" : "image",
    caption: item.caption ?? undefined,
    sortOrder: item.sortOrder,
  };
}

function normalizeMediaType(
  mediaType: string | undefined,
): "image" | "video" | undefined {
  if (mediaType === undefined) return undefined;
  return mediaType === "video" ? "video" : "image";
}

// ---------------------------------------------------------------------------
// Organizer Gallery (admin surfaces; scoped to the caller's organizer)
// ---------------------------------------------------------------------------

/** Fetch gallery items for an organizer. */
export async function getOrganizerGallery(organizerId: string): Promise<GalleryItem[]> {
  // The API scopes to the authenticated caller's organizer.
  void organizerId;
  const { items } = await adminApiCall<ApiItems<ApiGalleryItem>>(
    "/v1/admin/organizer/gallery",
  );
  return items.map(mapApiGalleryItem);
}

/** Add a gallery item for an organizer. */
export async function addOrganizerGalleryItem(
  organizerId: string,
  item: { image_url: string; media_type?: string; caption?: string; sort_order?: number },
) {
  void organizerId;
  const created = await adminApiCall<ApiGalleryItem>(
    "/v1/admin/organizer/gallery",
    {
      method: "POST",
      body: {
        url: item.image_url,
        mediaType: normalizeMediaType(item.media_type),
        caption: item.caption,
        sortOrder: item.sort_order,
      },
    },
  );
  return created.id;
}

/** Remove a gallery item. */
export async function removeOrganizerGalleryItem(id: string) {
  await adminApiCall<void>(`/v1/admin/organizer/gallery/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Event Gallery
// ---------------------------------------------------------------------------

/** Fetch gallery items for an event (public event page + admin detail page). */
export async function getEventGallery(eventId: string): Promise<GalleryItem[]> {
  try {
    const { items } = await publicApiCall<ApiItems<ApiGalleryItem>>(
      `/v1/public/events/${eventId}/gallery`,
    );
    return items.map(mapApiGalleryItem);
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  // The public route 404s for unpublished events. The admin detail page also
  // renders draft galleries, so fall back to the admin event detail (which
  // fails unauthenticated on public pages — treated as "no gallery").
  try {
    const detail = await adminApiCall<ApiAdminEventDetail>(
      `/v1/admin/events/${eventId}`,
    );
    return detail.gallery.map(mapApiGalleryItem);
  } catch {
    return [];
  }
}

// The REST API has no single-item event-gallery routes: the event gallery is
// replace-all via PATCH /v1/admin/events/:id { galleryItems } (sortOrder =
// array order). The two mutations below read the current gallery and PATCH
// the amended list.

function toGalleryInputs(gallery: ApiGalleryItem[]): ApiGalleryItemInput[] {
  return gallery.map((g) => ({
    url: g.url,
    mediaType: g.mediaType,
    caption: g.caption,
  }));
}

/** Add a gallery item for an event. */
export async function addEventGalleryItem(
  eventId: string,
  item: { media_url: string; media_type?: string; caption?: string; sort_order?: number },
) {
  const detail = await adminApiCall<ApiAdminEventDetail>(
    `/v1/admin/events/${eventId}`,
  );

  const galleryItems = toGalleryInputs([...detail.gallery]);
  const index =
    item.sort_order !== undefined
      ? Math.max(0, Math.min(item.sort_order, galleryItems.length))
      : galleryItems.length;
  galleryItems.splice(index, 0, {
    url: item.media_url,
    mediaType: normalizeMediaType(item.media_type) ?? "image",
    caption: item.caption ?? null,
  });

  const updated = await adminApiCall<ApiAdminEventDetail>(
    `/v1/admin/events/${eventId}`,
    { method: "PATCH", body: { galleryItems } },
  );

  const created =
    updated.gallery[index] ??
    updated.gallery.find((g) => g.url === item.media_url);
  if (!created) throw new Error("Gallery item was not created");
  return created.id;
}

/** Remove an event gallery item. */
export async function removeEventGalleryItem(id: string) {
  // Only the item id is known; locate the owning event, then PATCH the
  // gallery without it.
  const { items: events } = await adminApiCall<ApiItems<ApiAdminEvent>>(
    "/v1/admin/events",
  );

  for (const event of events) {
    const detail = await adminApiCall<ApiAdminEventDetail>(
      `/v1/admin/events/${event.id}`,
    );
    if (!detail.gallery.some((g) => g.id === id)) continue;

    const galleryItems = toGalleryInputs(
      detail.gallery.filter((g) => g.id !== id),
    );
    await adminApiCall<ApiAdminEventDetail>(`/v1/admin/events/${event.id}`, {
      method: "PATCH",
      body: { galleryItems },
    });
    return;
  }

  throw new Error("Event gallery item not found");
}
