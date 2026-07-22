import { adminApiCall } from "@/lib/api/client";
import type { ApiItems, ApiPayout } from "@/lib/api/types";
import type { Payout } from "@/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

function mapApiPayout(item: ApiPayout): Payout {
  const cur = item.currency.trim();
  return {
    id: item.id,
    organizerId: item.organizerId,
    amountCents: item.amountCents,
    amountFormatted: formatMoney(item.amountCents, cur),
    currency: cur,
    status: item.status,
    scheduledAt: item.scheduledAt ?? undefined,
    completedAt: item.completedAt ?? undefined,
    provider: item.provider,
    periodStart: item.periodStart ?? undefined,
    periodEnd: item.periodEnd ?? undefined,
    createdAt: formatDate(item.createdAt),
  };
}

/** Fetch all payouts for the current organizer. */
export async function getPayouts(filters?: {
  status?: string;
}) {
  const { items } = await adminApiCall<ApiItems<ApiPayout>>(
    "/v1/admin/finance/payouts",
    { query: { status: filters?.status } },
  );
  return items.map(mapApiPayout);
}

/** Fetch only upcoming (pending/processing) payouts. */
export async function getUpcomingPayouts() {
  const { items } = await adminApiCall<ApiItems<ApiPayout>>(
    "/v1/admin/finance/payouts/upcoming",
  );
  return items.map(mapApiPayout);
}
