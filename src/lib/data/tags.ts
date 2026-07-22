import { adminApiCall } from "@/lib/api/client";
import type { ApiItems, ApiTag } from "@/lib/api/types";

function mapTag(tag: ApiTag) {
  return { id: tag.id, label: tag.label, slug: tag.slug, type: tag.type };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch tags filtered by type (e.g., 'category', 'party_type', 'music_style', 'extra_service'). */
export async function getTagsByType(type: string) {
  const { items } = await adminApiCall<ApiItems<ApiTag>>("/v1/admin/tags", {
    query: { type },
  });
  return items.map(mapTag);
}

/** Fetch all tags linked to an organizer. */
export async function getOrganizerTags(organizerId: string) {
  // The API scopes to the authenticated caller's organizer.
  void organizerId;
  const { items } = await adminApiCall<ApiItems<ApiTag>>(
    "/v1/admin/organizer/tags",
  );
  return items.map(mapTag);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Replace the organizer's tag links with the given set. */
export async function setOrganizerTags(organizerId: string, tagIds: string[]) {
  void organizerId;
  await adminApiCall<ApiItems<ApiTag>>("/v1/admin/organizer/tags", {
    method: "PUT",
    body: { tagIds },
  });
}
