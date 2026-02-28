import type { VenueRow } from "@/types/database";
import type { Venue } from "@/types";

export function mapVenue(row: VenueRow): Venue {
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
    createdAt: row.created_at,
  };
}

export function mapVenues(rows: VenueRow[]): Venue[] {
  return rows.map(mapVenue);
}
