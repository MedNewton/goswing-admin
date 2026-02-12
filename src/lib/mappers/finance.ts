import type { PaymentRow, ReservationRow, EventRow } from "@/types/database";
import type { Transaction } from "@/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

/** Shape returned by a payments query joined with reservation + event. */
export interface PaymentQueryRow extends PaymentRow {
  reservations?: Pick<ReservationRow, "event_id" | "service_fees_cents"> & {
    events?: Pick<EventRow, "title"> | null;
  } | null;
}

/** Map a single payment row to the UI Transaction view model. */
export function mapTransaction(row: PaymentQueryRow): Transaction {
  const gross = row.amount_cents;
  const fee = row.reservations?.service_fees_cents ?? 0;
  const net = gross - fee;
  const cur = row.currency.trim();

  return {
    id: row.id,
    eventId: row.reservations?.event_id ?? "",
    eventName: row.reservations?.events?.title ?? "Unknown Event",
    grossAmount: gross,
    platformFee: fee,
    netAmount: net,
    grossFormatted: formatMoney(gross, cur),
    feeFormatted: formatMoney(fee, cur),
    netFormatted: formatMoney(net, cur),
    currency: cur,
    date: formatDate(row.created_at),
    status: normalizePaymentStatus(row.status),
    provider: row.provider,
  };
}

export function mapTransactions(rows: PaymentQueryRow[]): Transaction[] {
  return rows.map(mapTransaction);
}

/** Compute finance KPIs from a set of transactions. */
export function computeFinanceStats(transactions: Transaction[]) {
  let totalGross = 0;
  let totalFees = 0;
  let totalNet = 0;

  for (const t of transactions) {
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

function normalizePaymentStatus(
  s: string,
): Transaction["status"] {
  const lower = s.toLowerCase();
  if (lower === "succeeded" || lower === "completed") return "completed";
  if (lower === "failed") return "failed";
  return "pending";
}
