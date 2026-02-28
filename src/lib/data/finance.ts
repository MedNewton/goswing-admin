import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Transaction } from "@/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

type ReservationFinanceRow = {
  id: string;
  event_id: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  service_fees_cents: number;
  tax_cents: number;
  total_amount_cents: number;
  ordered_at: string;
  events: { title: string } | null;
  reservation_items: Array<{
    quantity: number;
    line_total_cents: number;
    ticket_type_name_snapshot: string;
  }>;
};

function normalizeFinanceStatus(s: string): Transaction["status"] {
  const lower = s.toLowerCase();
  if (lower === "confirmed" || lower === "checkedin") return "completed";
  if (lower === "cancelled" || lower === "canceled" || lower === "expired" || lower === "refunded")
    return "failed";
  return "pending";
}

function mapReservationToTransaction(row: ReservationFinanceRow): Transaction {
  const cur = row.currency.trim();
  const gross = row.total_amount_cents;
  const fee = row.service_fees_cents;
  const net = gross - fee;

  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.events?.title ?? "Unknown Event",
    grossAmount: gross,
    platformFee: fee,
    netAmount: net,
    grossFormatted: formatMoney(gross, cur),
    feeFormatted: formatMoney(fee, cur),
    netFormatted: formatMoney(net, cur),
    currency: cur,
    date: formatDate(row.ordered_at),
    status: normalizeFinanceStatus(row.status),
    provider: "stripe",
  };
}

/** Fetch all reservations as financial transactions. */
export async function getTransactions(filters?: {
  eventId?: string;
  status?: string;
}) {
  const sb = await createSupabaseServerClient();

  let query = sb
    .from("reservations")
    .select(`
      id,
      event_id,
      status,
      currency,
      subtotal_cents,
      service_fees_cents,
      tax_cents,
      total_amount_cents,
      ordered_at,
      events ( title ),
      reservation_items ( quantity, line_total_cents, ticket_type_name_snapshot )
    `)
    .order("ordered_at", { ascending: false });

  if (filters?.eventId) {
    query = query.eq("event_id", filters.eventId);
  }

  const { data, error } = await query;
  if (error) throw error;

  let transactions = ((data ?? []) as unknown as ReservationFinanceRow[]).map(
    mapReservationToTransaction,
  );

  if (filters?.status) {
    transactions = transactions.filter((t) => t.status === filters.status);
  }

  return transactions;
}

/** Compute finance KPIs from a set of transactions. */
export function computeFinanceStats(transactions: Transaction[]) {
  // Only count confirmed/checkedIn reservations for revenue totals
  const completed = transactions.filter((t) => t.status === "completed");

  let totalGross = 0;
  let totalFees = 0;
  let totalNet = 0;

  for (const t of completed) {
    totalGross += t.grossAmount;
    totalFees += t.platformFee;
    totalNet += t.netAmount;
  }

  return {
    transactionCount: transactions.length,
    totalGross,
    totalFees,
    totalNet,
  };
}

/** Fetch transactions and compute finance KPIs in one call. */
export async function getFinanceOverview(filters?: { eventId?: string }) {
  const transactions = await getTransactions(filters);
  const stats = computeFinanceStats(transactions);
  return { transactions, stats };
}
