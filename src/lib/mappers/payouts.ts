import type { PayoutRow } from "@/types/database";
import type { Payout } from "@/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

export function mapPayout(row: PayoutRow): Payout {
  return {
    id: row.id,
    organizerId: row.organizer_id,
    amountCents: row.amount_cents,
    amountFormatted: formatMoney(row.amount_cents, row.currency.trim()),
    currency: row.currency.trim(),
    status: row.status,
    scheduledAt: row.scheduled_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    provider: row.provider,
    periodStart: row.period_start ?? undefined,
    periodEnd: row.period_end ?? undefined,
    createdAt: formatDate(row.created_at),
  };
}

export function mapPayouts(rows: PayoutRow[]): Payout[] {
  return rows.map(mapPayout);
}
