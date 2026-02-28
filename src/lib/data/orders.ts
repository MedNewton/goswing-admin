import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapOrders, type OrderQueryRow } from "@/lib/mappers/orders";

/** Fetch all reservations (orders) for events owned by current user. */
export async function getOrders(filters?: {
  eventId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const sb = await createSupabaseServerClient();

  let query = sb
    .from("reservations")
    .select(`
      *,
      events ( title ),
      reservation_items ( ticket_type_name_snapshot, quantity, unit_price_cents, line_total_cents )
    `)
    .order("ordered_at", { ascending: false });

  if (filters?.eventId) {
    query = query.eq("event_id", filters.eventId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.fromDate) {
    query = query.gte("ordered_at", filters.fromDate);
  }
  if (filters?.toDate) {
    query = query.lte("ordered_at", filters.toDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return mapOrders((data ?? []) as OrderQueryRow[]);
}
