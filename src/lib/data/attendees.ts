import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Attendee } from "@/types";

/**
 * Fetch all attendees — people with reservations in "checkedIn" status
 * for events owned by the current user.
 */
export async function getAttendees(filters?: { eventId?: string }) {
  const sb = await createSupabaseServerClient();

  let query = sb
    .from("reservations")
    .select(`
      id,
      user_id,
      event_id,
      status,
      billing_first_name,
      billing_last_name,
      billing_email,
      total_amount_cents,
      currency,
      ordered_at,
      updated_at,
      events ( title ),
      reservation_items ( ticket_type_name_snapshot, quantity )
    `)
    .eq("status", "checkedIn")
    .order("updated_at", { ascending: false });

  if (filters?.eventId) {
    query = query.eq("event_id", filters.eventId);
  }

  const { data, error } = await query;
  if (error) throw error;

  type CheckedInRow = {
    id: string;
    user_id: string;
    event_id: string;
    status: string;
    billing_first_name: string | null;
    billing_last_name: string | null;
    billing_email: string | null;
    total_amount_cents: number;
    currency: string;
    ordered_at: string;
    updated_at: string;
    events: { title: string } | null;
    reservation_items: Array<{ ticket_type_name_snapshot: string; quantity: number }>;
  };

  return ((data ?? []) as unknown as CheckedInRow[]).map((row): Attendee => {
    const name =
      [row.billing_first_name, row.billing_last_name].filter(Boolean).join(" ") ||
      "Guest";

    let email = "—";
    if (row.billing_email) {
      email = row.billing_email;
    }

    const items = row.reservation_items ?? [];
    const ticketType =
      items.length === 1
        ? items[0]!.ticket_type_name_snapshot
        : items.length > 1
          ? items.map((i) => `${i.ticket_type_name_snapshot} x${i.quantity}`).join(", ")
          : undefined;

    return {
      id: row.id,
      name,
      email,
      eventId: row.event_id,
      eventName: row.events?.title ?? "Unknown Event",
      checkedIn: true,
      checkInTime: row.updated_at,
      ticketType,
    };
  });
}

/** Get check-in summary counts per event. */
export async function getCheckinSummary(): Promise<
  Array<{
    eventId: string;
    eventName: string;
    totalReservations: number;
    checkedIn: number;
  }>
> {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("events")
    .select(`
      id,
      title,
      reservations ( id, status )
    `)
    .order("starts_at", { ascending: false });

  if (error) throw error;

  type EventWithReservations = {
    id: string;
    title: string;
    reservations: Array<{ id: string; status: string }>;
  };

  return ((data ?? []) as EventWithReservations[])
    .map((event) => {
      const reservations = event.reservations ?? [];
      const checkedIn = reservations.filter((r) => r.status === "checkedIn").length;
      return {
        eventId: event.id,
        eventName: event.title,
        totalReservations: reservations.length,
        checkedIn,
      };
    })
    .filter((e) => e.totalReservations > 0);
}
