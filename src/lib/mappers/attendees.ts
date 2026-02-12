import type {
  TicketAttendeeRow,
  TicketRow,
  EventRow,
  TicketCheckinRow,
} from "@/types/database";
import type { Attendee } from "@/types";
import { formatDateTime } from "@/lib/utils/format";

/** Shape returned by a ticket_attendees query joined with ticket + event. */
export interface AttendeeQueryRow extends TicketAttendeeRow {
  tickets?: Pick<TicketRow, "event_id" | "ticket_type_name_snapshot" | "status"> & {
    events?: Pick<EventRow, "title"> | null;
    ticket_checkins?: Pick<TicketCheckinRow, "scanned_at" | "result">[];
  } | null;
}

/** Map a single ticket_attendee row to the UI Attendee view model. */
export function mapAttendee(row: AttendeeQueryRow): Attendee {
  const ticket = row.tickets;
  const lastCheckin = ticket?.ticket_checkins
    ?.filter((c) => c.result === "accepted")
    .sort((a, b) => b.scanned_at.localeCompare(a.scanned_at))[0];

  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    eventId: ticket?.event_id ?? "",
    eventName: ticket?.events?.title ?? "Unknown Event",
    checkedIn: !!lastCheckin,
    checkInTime: lastCheckin
      ? formatDateTime(lastCheckin.scanned_at)
      : undefined,
    ticketType: ticket?.ticket_type_name_snapshot ?? undefined,
  };
}

export function mapAttendees(rows: AttendeeQueryRow[]): Attendee[] {
  return rows.map(mapAttendee);
}
