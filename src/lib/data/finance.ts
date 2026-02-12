import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapTransactions, computeFinanceStats, type PaymentQueryRow } from "@/lib/mappers/finance";

/** Fetch all payments for events owned by current user. */
export async function getTransactions(filters?: {
  eventId?: string;
  status?: string;
}) {
  const sb = await createSupabaseServerClient();

  let query = sb
    .from("payments")
    .select(`
      *,
      reservations (
        event_id,
        service_fees_cents,
        events ( title )
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  let transactions = mapTransactions((data ?? []) as PaymentQueryRow[]);

  // Client-side event filter (since the join doesn't support direct .eq on nested)
  if (filters?.eventId) {
    transactions = transactions.filter((t) => t.eventId === filters.eventId);
  }

  return transactions;
}

/** Fetch transactions and compute finance KPIs in one call. */
export async function getFinanceOverview(filters?: {
  eventId?: string;
}) {
  const transactions = await getTransactions(filters);
  const stats = computeFinanceStats(transactions);
  return { transactions, stats };
}
