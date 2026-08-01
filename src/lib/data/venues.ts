// Venues data layer — Gooswing REST API (/v1/admin/venues).
import { adminApiCall } from "@/lib/api/client";
import type {
  ApiAdminVenue,
  ApiItems,
  ApiVenueSelectItem,
} from "@/lib/api/types";
import type { Venue } from "@/types";
import type { VenueInsert, VenueUpdate } from "@/types/database";
import { htmlToPlainText } from "@/lib/utils/html";

// ---------------------------------------------------------------------------
// Local mappers
// ---------------------------------------------------------------------------

function mapApiVenue(v: ApiAdminVenue): Venue {
  return {
    id: v.id,
    name: v.name,
    address: v.addressLine1,
    city: v.city,
    region: v.region,
    countryCode: v.countryCode,
    lat: v.lat,
    lng: v.lng,
    venueType: v.venueType,
    timezone: v.timezone,
    createdAt: v.createdAt,
    postalCode: v.postalCode,
    capacity: v.capacity,
    organizerId: v.organizerId,
    description: v.description ? htmlToPlainText(v.description) : v.description,
    freeAccess: v.freeAccess,
    freeForLadies: v.freeForLadies,
    coverImageUrl: v.coverImageUrl,
  };
}

/**
 * snake_case DB-column input → camelCase API body. `organizer_id` /
 * `created_by_user_id` are intentionally dropped — the server attaches the
 * venue to the caller's organizer. `undefined` values disappear when the
 * body is JSON-serialized, preserving PATCH partial semantics.
 */
function toApiVenueBody(input: Partial<VenueInsert>) {
  return {
    name: input.name,
    addressLine1: input.address_line1,
    city: input.city,
    region: input.region,
    countryCode: input.country_code,
    postalCode: input.postal_code,
    venueType: input.venue_type,
    timezone: input.timezone,
    lat: input.lat,
    lng: input.lng,
    capacity: input.capacity,
    description: input.description,
    freeAccess: input.free_access,
    freeForLadies: input.free_for_ladies,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all venues for the current user's organizer. */
export async function getVenues() {
  const res = await adminApiCall<ApiItems<ApiAdminVenue>>("/v1/admin/venues");
  return res.items.map(mapApiVenue);
}

/** Fetch a single venue by ID (only if owned by current user). */
export async function getVenue(id: string) {
  const venue = await adminApiCall<ApiAdminVenue>(`/v1/admin/venues/${id}`);
  return mapApiVenue(venue);
}

/** Fetch venues for dropdown selection (id and name only, only user's venues). */
export async function getVenuesForSelect() {
  const res = await adminApiCall<ApiItems<ApiVenueSelectItem>>(
    "/v1/admin/venues",
    { query: { view: "select" } },
  );
  return res.items as Array<{ id: string; name: string; city: string | null }>;
}

/** Fetch the single venue linked to an organizer (one-to-one). */
export async function getVenueByOrganizer(organizerId: string) {
  const res = await adminApiCall<ApiItems<ApiAdminVenue>>("/v1/admin/venues");
  const match = res.items.find((v) => v.organizerId === organizerId);
  if (!match) return null;
  return mapApiVenue(match);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new venue. */
export async function createVenue(venue: Omit<VenueInsert, "created_by_user_id">) {
  const res = await adminApiCall<{ venueId: string }>("/v1/admin/venues", {
    method: "POST",
    body: toApiVenueBody(venue),
  });
  return res.venueId;
}

/** Update an existing venue (only if owned by current user). */
export async function updateVenue(id: string, updates: VenueUpdate) {
  await adminApiCall<ApiAdminVenue>(`/v1/admin/venues/${id}`, {
    method: "PATCH",
    body: toApiVenueBody(updates),
  });
}

/** Delete a venue (only if owned by current user; 409 when events reference it). */
export async function deleteVenue(id: string) {
  await adminApiCall<void>(`/v1/admin/venues/${id}`, { method: "DELETE" });
}
