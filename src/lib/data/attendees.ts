import { adminApiCall } from "@/lib/api/client";
import type {
  ApiAttendee,
  ApiCheckinSummaryItem,
  ApiItems,
} from "@/lib/api/types";
import type { Attendee } from "@/types";

/**
 * Fetch all attendees — people with reservations in "checkedIn" status
 * for events owned by the current user.
 */
export async function getAttendees(filters?: { eventId?: string }) {
  const { items } = await adminApiCall<ApiItems<ApiAttendee>>(
    "/v1/admin/attendees",
    { query: { eventId: filters?.eventId } },
  );

  return items.map((row): Attendee => ({
    id: row.reservationId,
    name: row.name || "Guest",
    email: row.email || "—",
    eventId: row.eventId,
    eventName: row.eventTitle,
    checkedIn: true,
    checkInTime: row.checkedInAt ?? undefined,
    ticketType: row.ticketSummary ?? undefined,
  }));
}

/** Get check-in summary counts per event (only current user's events). */
export async function getCheckinSummary(): Promise<
  Array<{
    eventId: string;
    eventName: string;
    totalReservations: number;
    checkedIn: number;
    cancelled: number;
  }>
> {
  const { items } = await adminApiCall<ApiItems<ApiCheckinSummaryItem>>(
    "/v1/admin/attendees/checkin-summary",
  );

  return items.map((item) => ({
    eventId: item.eventId,
    eventName: item.eventTitle,
    totalReservations: item.totalReservations,
    checkedIn: item.checkedIn,
    cancelled: item.cancelled,
  }));
}
