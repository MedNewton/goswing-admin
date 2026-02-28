import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCheckinSummary } from "@/lib/data/attendees";
import { mapEvents, type EventQueryRow } from "@/lib/mappers/events";
import type { Stats } from "@/types";
import { formatMoney } from "@/lib/utils/format";

/** Fetch dashboard overview stats + recent events. */
export async function getOverview() {
  const sb = await createSupabaseServerClient();

  // Run queries in parallel
  const [eventsResult, reviewsResult, ticketsResult, paymentsResult, checkinSummary] =
    await Promise.all([
      sb
        .from("events")
        .select(
          `*, venues ( name, city ), organizers ( name ), event_tags ( tags ( label ) )`,
        )
        .not("created_by_user_id", "is", null)
        .order("starts_at", { ascending: false }),
      sb
        .from("event_reviews")
        .select("rating"),
      sb
        .from("tickets")
        .select("id", { count: "exact", head: true }),
      sb
        .from("payments")
        .select("amount_cents, currency")
        .eq("status", "succeeded"),
      getCheckinSummary(),
    ]);

  if (eventsResult.error) throw eventsResult.error;

  const checkinSummaryByEventId = new Map(
    checkinSummary.map((item) => [item.eventId, item] as const),
  );
  const events = mapEvents((eventsResult.data ?? []) as EventQueryRow[]).map((event) => {
    const summary = checkinSummaryByEventId.get(event.id);
    return {
      ...event,
      attendeeCount: summary?.checkedIn ?? 0,
      reservationCount: summary?.totalReservations ?? 0,
    };
  });

  // Review stats — RLS scopes to user's events via event_reviews_creator_read
  const reviews = (reviewsResult.data ?? []) as Array<{ rating: number | null }>;
  const avgRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
            reviews.length) *
            10,
        ) / 10
      : 0;

  // Ticket count — RLS scopes to user's events via tickets_creator_read
  const totalTickets = ticketsResult.count ?? 0;

  // Revenue — RLS scopes to user's events via payments_creator_read
  const payments = (paymentsResult.data ?? []) as Array<{ amount_cents: number; currency: string }>;
  const totalRevenueCents = payments.reduce(
    (sum, p) => sum + (p.amount_cents ?? 0),
    0,
  );
  const mainCurrency = payments[0]?.currency.trim() ?? "USD";

  const totalAttendees = checkinSummary.reduce((sum, event) => sum + event.checkedIn, 0);

  const stats: Stats = {
    totalEvents: events.length,
    totalAttendees,
    totalTickets,
    avgRating,
    totalRevenue: totalRevenueCents / 100,
    totalRevenueFormatted: formatMoney(totalRevenueCents, mainCurrency),
  };

  return {
    stats,
    recentEvents: events.slice(0, 6),
  };
}
