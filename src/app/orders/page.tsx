import { MainLayout } from "@/components/layout/MainLayout";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { getOrders } from "@/lib/data/orders";
import { formatStatus, statusVariant } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  let orders: Awaited<ReturnType<typeof getOrders>> = [];

  try {
    orders = await getOrders();
  } catch {
    // Will show empty state
  }

  return (
    <MainLayout
      title="Orders"
      actions={
        <Button variant="outline" size="sm">
          Export
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <SearchBar
            placeholder="Search orders, customers, events..."
            className="flex-1 max-w-lg"
          />
          <Button variant="outline">All time</Button>
          <Button variant="outline">Newest first</Button>
        </div>

        {/* Orders Table */}
        <div className="rounded-lg bg-white shadow-sm">
          {orders.length === 0 ? (
            <p className="py-12 text-center text-gray-500">
              No orders yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableHead>Order ID</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Offer Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-gray-900">
                      {order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-gray-900">{order.eventName}</TableCell>
                    <TableCell className="text-gray-600">{order.customerName}</TableCell>
                    <TableCell className="text-gray-600">{order.offerType}</TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {order.amountFormatted ?? `${order.amount}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(order.status)}>
                        {formatStatus(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">{order.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
