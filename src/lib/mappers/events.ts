import type { EventRow, VenueRow, OrganizerRow, TagRow } from "@/types/database";
import type { Event } from "@/types";
import { formatDate, formatPrice } from "@/lib/utils/format";

/** Shape returned by a typical event list query with joins. */
export interface EventQueryRow extends EventRow {
  venues?: Pick<VenueRow, "name" | "city"> | null;
  organizers?: Pick<OrganizerRow, "name"> | null;
  event_tags?: Array<{ tags: Pick<TagRow, "label"> | null }>;
}

/** Map a single DB event row (with optional joins) to the UI view model. */
export function mapEvent(row: EventQueryRow): Event {
  const venueName = row.venues?.name ?? "";
  const city = row.venues?.city ?? "";
  const location = [venueName, city].filter(Boolean).join(", ");

  return {
    id: row.id,
    title: row.title,
    image: row.hero_image_url ?? "/placeholder-event.png",
    date: formatDate(row.starts_at),
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    location: location || "TBA",
    venue: venueName || undefined,
    attendeeCount: row.attendee_count,
    status: normalizeEventStatus(row.status),
    currency: row.currency.trim(),
    minPrice: formatPrice(row.min_price_cents, row.currency, row.is_free),
    isFree: row.is_free,
    organizerId: row.organizer_id,
    organizerName: row.organizers?.name ?? undefined,
    tags: row.event_tags
      ?.map((et) => et.tags?.label)
      .filter((l): l is string => !!l),
  };
}

/** Map an array of rows. */
export function mapEvents(rows: EventQueryRow[]): Event[] {
  return rows.map(mapEvent);
}

function normalizeEventStatus(
  s: string,
): "published" | "draft" | "completed" | "cancelled" {
  const lower = s.toLowerCase();
  if (lower === "published") return "published";
  if (lower === "draft") return "draft";
  if (lower === "completed") return "completed";
  if (lower === "cancelled" || lower === "canceled") return "cancelled";
  return "draft";
}
