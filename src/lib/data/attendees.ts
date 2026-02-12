import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapAttendees, type AttendeeQueryRow } from "@/lib/mappers/attendees";

/** Fetch all ticket attendees for events owned by current user. */
export async function getAttendees(filters?: { eventId?: string }) {
  const sb = await createSupabaseServerClient();

  let query = sb
    .from("ticket_attendees")
    .select(`
      *,
      tickets (
        event_id,
        ticket_type_name_snapshot,
        status,
        events ( title ),
        ticket_checkins ( scanned_at, result )
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.eventId) {
    query = query.eq("tickets.event_id", filters.eventId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return mapAttendees((data ?? []) as AttendeeQueryRow[]);
}

/** Get check-in summary counts per event. */
export async function getCheckinSummary(): Promise<
  Array<{
    eventId: string;
    eventName: string;
    totalAttendees: number;
    totalTickets: number;
    checkedIn: number;
  }>
> {
  const sb = await createSupabaseServerClient();

  // Get events with ticket + checkin counts
  const { data, error } = await sb
    .from("events")
    .select(`
      id,
      title,
      attendee_count,
      tickets ( id, ticket_checkins ( id ) )
    `)
    .order("starts_at", { ascending: false });

  if (error) throw error;

  type CheckinEventRow = {
    id: string;
    title: string;
    attendee_count: number;
    tickets: Array<{ id: string; ticket_checkins: Array<{ id: string }> }>;
  };

  return ((data ?? []) as CheckinEventRow[]).map((event) => {
    const tickets = event.tickets ?? [];
    const checkedIn = tickets.filter((t) => t.ticket_checkins.length > 0).length;
    return {
      eventId: event.id,
      eventName: event.title,
      totalAttendees: event.attendee_count,
      totalTickets: tickets.length,
      checkedIn,
    };
  });
}
