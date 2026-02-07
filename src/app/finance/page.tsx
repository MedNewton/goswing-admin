import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/StatCard";
import { BarChart } from "@/components/charts/BarChart";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { DollarIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";

const stats = [
  {
    label: "Total Revenue",
    value: "€45,250",
    icon: <DollarIcon className="h-6 w-6 text-green-600" />,
    iconBgColor: "bg-green-50",
    trend: { value: "23.1% vs last month", isPositive: true },
  },
  {
    label: "Total Sales",
    value: "€9,750",
    icon: <DollarIcon className="h-6 w-6 text-blue-600" />,
    iconBgColor: "bg-blue-50",
    trend: { value: "18.5% vs last month", isPositive: true },
  },
  {
    label: "Pending Payouts",
    value: "€2,400",
    icon: <DollarIcon className="h-6 w-6 text-yellow-600" />,
    iconBgColor: "bg-yellow-50",
  },
  {
    label: "Platform Fees",
    value: "€1,250",
    icon: <DollarIcon className="h-6 w-6 text-purple-600" />,
    iconBgColor: "bg-purple-50",
  },
];

const transactions = [
  { id: "TXN001", event: "Summer Music Festival", gross: 450, fee: 22.5, net: 427.5, date: "2024-06-15", status: "completed" as const },
  { id: "TXN002", event: "Wine Tasting Evening", gross: 250, fee: 17.5, net: 232.5, date: "2024-06-14", status: "completed" as const },
  { id: "TXN003", event: "Tech Startup Meetup", gross: 250, fee: 12.5, net: 237.5, date: "2024-06-13", status: "pending" as const },
  { id: "TXN004", event: "Food Truck Rally", gross: 180, fee: 9, net: 171, date: "2024-06-12", status: "completed" as const },
];

export default function FinancePage() {
  return (
    <MainLayout
      title="Finance Dashboard"
      actions={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            ⬇️ Export Statement
          </Button>
          <Button variant="outline" size="sm">
            📋 Tax Report
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Revenue Trends */}
        <BarChart title="Revenue Trends" />

        {/* Recent Transactions */}
        <Card padding="none">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Transactions
              </h2>
              <Button variant="ghost" size="sm">
                View All Transactions →
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Gross Amount</TableHead>
              <TableHead>Platform Fee</TableHead>
              <TableHead>Net Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium text-gray-900">{tx.id}</TableCell>
                  <TableCell className="text-gray-900">{tx.event}</TableCell>
                  <TableCell className="text-gray-900">€{tx.gross}</TableCell>
                  <TableCell className="text-gray-600">€{tx.fee}</TableCell>
                  <TableCell className="font-medium text-green-600">€{tx.net}</TableCell>
                  <TableCell className="text-gray-600">{tx.date}</TableCell>
                  <TableCell>
                    <Badge variant={tx.status}>{tx.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </MainLayout>
  );
}
