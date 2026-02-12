import type { ReservationRow, EventRow, ReservationItemRow } from "@/types/database";
import type { Order } from "@/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

/** Shape returned by a typical orders query with joins. */
export interface OrderQueryRow extends ReservationRow {
  events?: Pick<EventRow, "title"> | null;
  reservation_items?: Pick<ReservationItemRow, "ticket_type_name_snapshot" | "quantity">[];
}

/** Map a single reservation row to the UI Order view model. */
export function mapOrder(row: OrderQueryRow): Order {
  const items = row.reservation_items ?? [];
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const offerType =
    items.length === 1
      ? items[0]!.ticket_type_name_snapshot
      : items.length > 1
        ? `${items.length} types`
        : "—";

  const customerName = [row.billing_first_name, row.billing_last_name]
    .filter(Boolean)
    .join(" ") || "Guest";

  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.events?.title ?? "Unknown Event",
    customerName,
    customerEmail: row.billing_email ?? undefined,
    offerType,
    amount: row.total_amount_cents,
    amountFormatted: formatMoney(row.total_amount_cents, row.currency),
    currency: row.currency.trim(),
    status: normalizeOrderStatus(row.status),
    date: formatDate(row.ordered_at),
    orderedAt: row.ordered_at,
    itemCount,
  };
}

export function mapOrders(rows: OrderQueryRow[]): Order[] {
  return rows.map(mapOrder);
}

function normalizeOrderStatus(
  s: string,
): Order["status"] {
  const lower = s.toLowerCase();
  if (lower === "confirmed") return "confirmed";
  if (lower === "pending") return "pending";
  if (lower === "cancelled" || lower === "canceled") return "cancelled";
  if (lower === "expired") return "expired";
  if (lower === "refunded") return "refunded";
  return "draft";
}
