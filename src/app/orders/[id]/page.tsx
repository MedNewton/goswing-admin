import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ChevronLeftIcon,
  DollarIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "@/components/icons";
import { getOrderDetail } from "@/lib/data/orders";
import { formatMoney, formatDateTime } from "@/lib/utils/format";
import { getLocale, t } from "@/lib/i18n";
import { checkRoleAccess } from "@/lib/auth/requireAdmin";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

export const dynamic = "force-dynamic";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function StatusBadgeVariant(status: string): "confirmed" | "checkedIn" | "pending" | "cancelled" | "draft" | "error" | "info" | "secondary" {
  switch (status) {
    case "confirmed": return "confirmed";
    case "checkedIn": case "checkedin": return "checkedIn";
    case "pending": return "pending";
    case "cancelled": case "canceled": return "cancelled";
    case "expired": return "error";
    case "refunded": return "info";
    case "draft": return "draft";
    default: return "secondary";
  }
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const denied = await checkRoleAccess(["admin", "entrance_manager"]);
  if (denied) return denied;

  const locale = await getLocale();

  let order: Awaited<ReturnType<typeof getOrderDetail>> | null = null;

  try {
    order = await getOrderDetail(id);
  } catch {
    notFound();
  }

  if (!order) notFound();

  const customerName = [order.billing_first_name, order.billing_last_name]
    .filter(Boolean)
    .join(" ") || "Guest";

  const items = order.reservation_items ?? [];
  const eventName = order.events?.title ?? "Unknown Event";

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/orders"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {t(locale, "orderDetail.backToOrders")}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {t(locale, "orderDetail.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {order.id.slice(0, 8)} &bull; {eventName}
            </p>
          </div>
          <Badge variant={StatusBadgeVariant(order.status)}>
            {order.status === "checkedIn" || order.status === "checkedin"
              ? "Checked In"
              : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer Info */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {t(locale, "orderDetail.customer")}
            </h2>
            <div className="space-y-2">
              <InfoRow label={t(locale, "common.name")} value={customerName} />
              <InfoRow label={t(locale, "common.email")} value={order.billing_email} />
              {order.billing_zip && (
                <InfoRow label="ZIP" value={order.billing_zip} />
              )}
              {order.billing_country && (
                <InfoRow label="Country" value={order.billing_country} />
              )}
            </div>
          </Card>

          {/* Order Items */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {t(locale, "orderDetail.items")}
            </h2>
            {items.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t(locale, "orderDetail.noItems")}
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.ticket_type_name_snapshot}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.quantity} &times;{" "}
                        {formatMoney(item.unit_price_cents, order.currency)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatMoney(item.line_total_cents, order.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Info */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {t(locale, "orderDetail.orderInfo")}
            </h2>
            <div className="space-y-2">
              <InfoRow
                label={t(locale, "orderDetail.orderId")}
                value={order.id.slice(0, 12)}
              />
              <InfoRow
                label={t(locale, "orderDetail.status")}
                value={
                  order.status === "checkedIn" || order.status === "checkedin"
                    ? "Checked In"
                    : order.status.charAt(0).toUpperCase() +
                      order.status.slice(1)
                }
              />
              <InfoRow
                label={t(locale, "orderDetail.date")}
                value={formatDateTime(order.ordered_at)}
              />
            </div>
          </Card>

          {/* Payment */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {t(locale, "orderDetail.payment")}
            </h2>
            <div className="space-y-2">
              {order.payment_provider && (
                <InfoRow
                  label={t(locale, "orderDetail.paymentProvider")}
                  value={order.payment_provider}
                />
              )}
              {order.payment_ref && (
                <InfoRow
                  label={t(locale, "orderDetail.paymentRef")}
                  value={order.payment_ref}
                />
              )}
            </div>
          </Card>

          {/* Order Summary */}
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {t(locale, "orderDetail.summary")}
            </h2>
            <div className="space-y-2">
              <InfoRow
                label={t(locale, "orderDetail.subtotal")}
                value={formatMoney(order.subtotal_cents, order.currency)}
              />
              {order.service_fees_cents > 0 && (
                <InfoRow
                  label={t(locale, "orderDetail.serviceFees")}
                  value={formatMoney(
                    order.service_fees_cents,
                    order.currency,
                  )}
                />
              )}
              {order.tax_cents > 0 && (
                <InfoRow
                  label={t(locale, "orderDetail.tax")}
                  value={formatMoney(order.tax_cents, order.currency)}
                />
              )}
              <div className="flex items-center justify-between rounded-xl border border-gray-900 bg-gray-900 px-4 py-3">
                <span className="text-sm font-semibold text-white">
                  {t(locale, "orderDetail.total")}
                </span>
                <span className="text-lg font-bold text-white">
                  {formatMoney(order.total_amount_cents, order.currency)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
