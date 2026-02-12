import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/StatCard";
import { BarChart } from "@/components/charts/BarChart";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { DollarIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { getFinanceOverview } from "@/lib/data/finance";
import { formatMoney, formatStatus, statusVariant } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  let transactions: Awaited<ReturnType<typeof getFinanceOverview>>["transactions"] = [];
  let financeStats = { transactionCount: 0, totalGross: 0, totalFees: 0, totalNet: 0 };

  try {
    const data = await getFinanceOverview();
    transactions = data.transactions;
    financeStats = data.stats;
  } catch {
    // Will show empty state
  }

  // Determine currency from first transaction or default
  const currency = transactions[0]?.currency ?? "USD";

  const statCards = [
    {
      label: "Total Revenue",
      value: formatMoney(financeStats.totalGross, currency),
      icon: <DollarIcon className="h-6 w-6 text-green-600" />,
      iconBgColor: "bg-green-50",
    },
    {
      label: "Net Revenue",
      value: formatMoney(financeStats.totalNet, currency),
      icon: <DollarIcon className="h-6 w-6 text-blue-600" />,
      iconBgColor: "bg-blue-50",
    },
    {
      label: "Transactions",
      value: String(financeStats.transactionCount),
      icon: <DollarIcon className="h-6 w-6 text-yellow-600" />,
      iconBgColor: "bg-yellow-50",
    },
    {
      label: "Platform Fees",
      value: formatMoney(financeStats.totalFees, currency),
      icon: <DollarIcon className="h-6 w-6 text-purple-600" />,
      iconBgColor: "bg-purple-50",
    },
  ];

  return (
    <MainLayout
      title="Finance Dashboard"
      actions={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            Export Statement
          </Button>
          <Button variant="outline" size="sm">
            Tax Report
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
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
            </div>
          </div>
          {transactions.length === 0 ? (
            <p className="px-6 pb-6 text-center text-gray-500">
              No transactions yet.
            </p>
          ) : (
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
                    <TableCell className="font-medium text-gray-900">
                      {tx.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-gray-900">{tx.eventName}</TableCell>
                    <TableCell className="text-gray-900">{tx.grossFormatted}</TableCell>
                    <TableCell className="text-gray-600">{tx.feeFormatted}</TableCell>
                    <TableCell className="font-medium text-green-600">{tx.netFormatted}</TableCell>
                    <TableCell className="text-gray-600">{tx.date}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(tx.status)}>
                        {formatStatus(tx.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
