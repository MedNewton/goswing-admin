import type { VenueRow } from "@/types/database";
import type { Venue } from "@/types";

// Optional joined organizer columns surfaced via Supabase select("*, organizers(...)")
type VenueRowWithOrganizer = VenueRow & {
  organizers?: { cover_image_url: string | null } | null;
};

export function mapVenue(row: VenueRow): Venue {
  const organizer = (row as VenueRowWithOrganizer).organizers;
  return {
    id: row.id,
    name: row.name,
    address: row.address_line1,
    city: row.city,
    region: row.region,
    countryCode: row.country_code,
    lat: row.lat,
    lng: row.lng,
    venueType: row.venue_type,
    timezone: row.timezone,
    createdAt: row.created_at,
    postalCode: row.postal_code,
    capacity: row.capacity,
    organizerId: row.organizer_id,
    description: row.description,
    freeAccess: row.free_access,
    freeForLadies: row.free_for_ladies,
    coverImageUrl: organizer?.cover_image_url ?? null,
  };
}

export function mapVenues(rows: VenueRow[]): Venue[] {
  return rows.map(mapVenue);
}
