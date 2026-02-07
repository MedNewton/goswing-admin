import { MainLayout } from "@/components/layout/MainLayout";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

const orders = [
  { id: "OR0093", event: "Summer Jazz Night", customer: "Sophie Laurent", offerType: "Group Package", amount: 120, status: "confirmed" as const, date: "2024-06-12" },
  { id: "OR0092", event: "Wine Tasting Evening", customer: "Jean Martin", offerType: "Standard Ticket", amount: 25, status: "pending" as const, date: "2024-06-11" },
  { id: "OR0091", event: "Summer Jazz Night", customer: "Marie Dubois", offerType: "VIP Ticket", amount: 35, status: "confirmed" as const, date: "2024-06-10" },
];

export default function OrdersPage() {
  return (
    <MainLayout
      title="Orders"
      actions={
        <Button variant="outline" size="sm">
          📤 Export
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
                    {order.id}
                  </TableCell>
                  <TableCell className="text-gray-900">{order.event}</TableCell>
                  <TableCell className="text-gray-600">{order.customer}</TableCell>
                  <TableCell className="text-gray-600">{order.offerType}</TableCell>
                  <TableCell className="font-medium text-gray-900">
                    €{order.amount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.status}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">{order.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
