import { MainLayout } from "@/components/layout/MainLayout";
import { getOrders } from "@/lib/data/orders";
import { OrdersPageClient } from "@/components/orders/OrdersPageClient";
import { getLocale, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const locale = await getLocale();
  let orders: Awaited<ReturnType<typeof getOrders>> = [];

  try {
    orders = await getOrders();
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t(locale, "ordersPage.title")}</h1>
      <OrdersPageClient orders={orders} />
    </MainLayout>
  );
}
