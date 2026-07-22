import { adminApiCall } from "@/lib/api/client";
import type {
  ApiItems,
  ApiOrderDetail,
  ApiOrderListItem,
} from "@/lib/api/types";
import type { OrderQueryRow } from "@/lib/mappers/orders";
import type { Order } from "@/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

function normalizeOrderStatus(s: string): Order["status"] {
  const lower = s.toLowerCase();
  if (lower === "confirmed") return "confirmed";
  if (lower === "checkedin") return "checkedIn";
  if (lower === "pending") return "pending";
  if (lower === "cancelled" || lower === "canceled") return "cancelled";
  if (lower === "expired") return "expired";
  if (lower === "refunded") return "refunded";
  return "draft";
}

function mapApiOrder(item: ApiOrderListItem): Order {
  const items = item.items ?? [];
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const offerType =
    items.length === 1
      ? items[0]!.ticketTypeName
      : items.length > 1
        ? `${items.length} types`
        : "—";

  const customerName =
    [item.billing.firstName, item.billing.lastName].filter(Boolean).join(" ") ||
    "Guest";

  return {
    id: item.id,
    eventId: item.eventId,
    eventName: item.eventTitle,
    customerName,
    customerEmail: item.billing.email ?? undefined,
    offerType,
    amount: item.totalAmountCents,
    amountFormatted: formatMoney(item.totalAmountCents, item.currency),
    currency: item.currency.trim(),
    status: normalizeOrderStatus(item.status),
    date: formatDate(item.orderedAt),
    orderedAt: item.orderedAt,
    itemCount,
  };
}

/** Fetch all reservations (orders) for events owned by current user. */
export async function getOrders(filters?: {
  eventId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const { items } = await adminApiCall<ApiItems<ApiOrderListItem>>(
    "/v1/admin/orders",
    {
      query: {
        eventId: filters?.eventId,
        status: filters?.status,
        from: filters?.fromDate,
        to: filters?.toDate,
      },
    },
  );

  // Client-side safety net mirroring the API filters
  let rows = items;
  if (filters?.eventId) rows = rows.filter((r) => r.eventId === filters.eventId);
  if (filters?.status) rows = rows.filter((r) => r.status === filters.status);
  if (filters?.fromDate) rows = rows.filter((r) => r.orderedAt >= filters.fromDate!);
  if (filters?.toDate) rows = rows.filter((r) => r.orderedAt <= filters.toDate!);

  return rows.map(mapApiOrder);
}

/** Fetch a single order by ID with full details. */
export async function getOrderDetail(orderId: string) {
  const detail = await adminApiCall<ApiOrderDetail>(
    `/v1/admin/orders/${orderId}`,
  );

  // Shape a Supabase-row-compatible object for the order detail page.
  const row: OrderQueryRow & {
    reservation_items: Array<{
      id: string;
      ticket_type_name_snapshot: string;
      quantity: number;
      unit_price_cents: number;
      currency: string;
      line_total_cents: number;
      benefits_snapshot: unknown[];
    }>;
  } = {
    id: detail.id,
    user_id: "",
    event_id: detail.eventId,
    status: detail.status,
    ordered_at: detail.orderedAt,
    expires_at: null,
    price_locked_at: null,
    currency: detail.currency,
    subtotal_cents: detail.subtotalCents,
    service_fees_cents: detail.serviceFeeCents,
    tax_cents: detail.taxCents,
    discount_cents: 0,
    savings_cents: 0,
    total_amount_cents: detail.totalAmountCents,
    terms_accepted_at: null,
    terms_accepted_ip: null,
    billing_email: detail.billing.email,
    billing_first_name: detail.billing.firstName,
    billing_last_name: detail.billing.lastName,
    billing_zip: null,
    billing_country: null,
    payment_provider: null,
    payment_ref: null,
    metadata: {},
    created_at: detail.orderedAt,
    updated_at: detail.updatedAt ?? detail.orderedAt,
    events: { title: detail.eventTitle },
    reservation_items: detail.items.map((item) => ({
      id: item.id,
      ticket_type_name_snapshot: item.ticketTypeName,
      quantity: item.quantity,
      unit_price_cents: item.unitPriceCents,
      currency: item.currency,
      line_total_cents: item.lineTotalCents,
      benefits_snapshot: [...item.benefits],
    })),
  };

  return row;
}
