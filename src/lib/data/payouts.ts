import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapPayouts } from "@/lib/mappers/payouts";
import type { PayoutRow } from "@/types/database";

/** Fetch all payouts for the current organizer. */
export async function getPayouts(filters?: {
  status?: string;
}) {
  const sb = await createSupabaseServerClient();

  let query = sb
    .from("payouts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return mapPayouts((data ?? []) as PayoutRow[]);
}

/** Fetch only upcoming (pending/processing) payouts. */
export async function getUpcomingPayouts() {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("payouts")
    .select("*")
    .in("status", ["pending", "processing"])
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return mapPayouts((data ?? []) as PayoutRow[]);
}
