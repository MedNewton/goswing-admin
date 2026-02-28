import { MainLayout } from "@/components/layout/MainLayout";
import { getOrders } from "@/lib/data/orders";
import { OrdersPageClient } from "@/components/orders/OrdersPageClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  let orders: Awaited<ReturnType<typeof getOrders>> = [];

  try {
    orders = await getOrders();
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout title="Orders">
      <OrdersPageClient orders={orders} />
    </MainLayout>
  );
}
