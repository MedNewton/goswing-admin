import { adminApiCall } from "@/lib/api/client";
import type { ApiTransaction, ApiTransactionsResponse } from "@/lib/api/types";
import type { Transaction } from "@/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

function mapApiTransaction(item: ApiTransaction): Transaction {
  const cur = item.currency.trim();
  return {
    id: item.id,
    eventId: item.eventId,
    eventName: item.eventTitle,
    grossAmount: item.grossCents,
    platformFee: item.platformFeeCents,
    netAmount: item.netCents,
    grossFormatted: formatMoney(item.grossCents, cur),
    feeFormatted: formatMoney(item.platformFeeCents, cur),
    netFormatted: formatMoney(item.netCents, cur),
    currency: cur,
    date: formatDate(item.orderedAt),
    orderedAt: item.orderedAt,
    status: item.status,
    provider: item.provider,
  };
}

/** Fetch all reservations as financial transactions. */
export async function getTransactions(filters?: {
  eventId?: string;
  status?: string;
}) {
  const { items } = await adminApiCall<ApiTransactionsResponse>(
    "/v1/admin/finance/transactions",
    { query: { eventId: filters?.eventId, status: filters?.status } },
  );

  let transactions = items.map(mapApiTransaction);

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
