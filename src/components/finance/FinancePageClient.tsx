"use client";

import { useRef, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { DollarIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { formatMoney, formatStatus, statusVariant } from "@/lib/utils/format";
import { generateCsv, downloadCsv } from "@/lib/utils/csv";
import type { Transaction } from "@/types";

interface FinancePageClientProps {
  transactions: Transaction[];
  stats: {
    transactionCount: number;
    totalGross: number;
    totalFees: number;
    totalNet: number;
  };
}

function computeDailyRevenue(transactions: Transaction[]): Array<{
  label: string;
  date: string;
  value: number;
  reservationCount: number;
  isToday: boolean;
}> {
  // Build a map of date -> revenue from ALL transactions
  const dailyMap: Record<string, { value: number; reservationCount: number }> = {};
  for (const tx of transactions) {
    const iso = tx.orderedAt ?? tx.date;
    const parsed = new Date(iso);
    if (isNaN(parsed.getTime())) continue;
    // Use local date to avoid timezone shift
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    dailyMap[key] ??= { value: 0, reservationCount: 0 };
    dailyMap[key].value += tx.grossAmount;
    dailyMap[key].reservationCount += 1;
  }

  // Generate 29 days: -14 ... 0 ... +14
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Array<{
    label: string;
    date: string;
    value: number;
    reservationCount: number;
    isToday: boolean;
  }> = [];

  for (let offset = -14; offset <= 14; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayNum = d.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const label = offset === 0 ? "Today" : `${monthNames[d.getMonth()]} ${dayNum}`;
    const formattedDate = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const dayData = dailyMap[key] ?? { value: 0, reservationCount: 0 };
    days.push({
      label,
      date: formattedDate,
      value: dayData.value,
      reservationCount: dayData.reservationCount,
      isToday: offset === 0,
    });
  }

  return days;
}

export function FinancePageClient({ transactions, stats }: FinancePageClientProps) {
  const currency = transactions[0]?.currency ?? "USD";
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    item: {
      date: string;
      value: number;
      reservationCount: number;
    };
    x: number;
    y: number;
  } | null>(null);

  const statCards = [
    {
      label: "Total Revenue",
      value: formatMoney(stats.totalGross, currency),
      icon: <DollarIcon className="h-6 w-6 text-green-600" />,
      iconBgColor: "bg-green-50",
    },
    {
      label: "Net Revenue",
      value: formatMoney(stats.totalNet, currency),
      icon: <DollarIcon className="h-6 w-6 text-blue-600" />,
      iconBgColor: "bg-blue-50",
    },
    {
      label: "Transactions",
      value: String(stats.transactionCount),
      icon: <DollarIcon className="h-6 w-6 text-yellow-600" />,
      iconBgColor: "bg-yellow-50",
    },
    {
      label: "Platform Fees",
      value: formatMoney(stats.totalFees, currency),
      icon: <DollarIcon className="h-6 w-6 text-purple-600" />,
      iconBgColor: "bg-purple-50",
    },
  ];

  const dailyData = computeDailyRevenue(transactions);

  const handleExportStatement = () => {
    const csv = generateCsv(transactions, [
      { key: "id", header: "Transaction ID" },
      { key: "eventName", header: "Event" },
      { key: "grossFormatted", header: "Gross Amount" },
      { key: "feeFormatted", header: "Platform Fee" },
      { key: "netFormatted", header: "Net Amount" },
      { key: "date", header: "Date" },
      { key: "status", header: "Status" },
    ]);
    downloadCsv(csv, `finance-statement-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleTaxReport = () => {
    // Group by month for tax summary
    const monthlyMap: Record<string, { gross: number; fees: number; net: number; count: number }> = {};
    for (const tx of transactions) {
      const parsed = new Date(tx.date);
      if (isNaN(parsed.getTime())) continue;
      const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] ??= { gross: 0, fees: 0, net: 0, count: 0 };
      monthlyMap[key].gross += tx.grossAmount;
      monthlyMap[key].fees += tx.platformFee;
      monthlyMap[key].net += tx.netAmount;
      monthlyMap[key].count += 1;
    }

    const rows = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        transactions: data.count,
        grossRevenue: formatMoney(data.gross, currency),
        platformFees: formatMoney(data.fees, currency),
        netRevenue: formatMoney(data.net, currency),
      }));

    const csv = generateCsv(rows, [
      { key: "month", header: "Month" },
      { key: "transactions", header: "Transactions" },
      { key: "grossRevenue", header: "Gross Revenue" },
      { key: "platformFees", header: "Platform Fees" },
      { key: "netRevenue", header: "Net Revenue" },
    ]);
    downloadCsv(csv, `tax-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Export Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" size="sm" onClick={handleExportStatement}>
          Export Statement
        </Button>
        <Button variant="outline" size="sm" onClick={handleTaxReport}>
          Tax Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Revenue Trends — 29-day window centred on today */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Revenue Trends</h3>
        {(() => {
          const maxValue = Math.max(...dailyData.map((d) => d.value), 1);
          return (
            <div
              ref={chartRef}
              className="relative h-64"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {hoveredPoint && (
                <div
                  className="pointer-events-none absolute z-10 w-max rounded-md bg-gray-950 px-3 py-2 text-xs text-white shadow-lg"
                  style={{
                    left: hoveredPoint.x + 12,
                    top: hoveredPoint.y + 12,
                  }}
                >
                  <p className="font-medium">{hoveredPoint.item.date}</p>
                  <p>Total: {formatMoney(hoveredPoint.item.value, currency)}</p>
                  <p>
                    {hoveredPoint.item.reservationCount}{" "}
                    {hoveredPoint.item.reservationCount === 1 ? "reservation" : "reservations"}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 flex items-end gap-px">
                {dailyData.map((item, i) => {
                  const heightPct = (item.value / maxValue) * 100;
                  // Show label for today, first, last, and every 7th day
                  const showLabel = item.isToday || i === 0 || i === dailyData.length - 1 || i % 7 === 0;
                  return (
                    <div
                      key={i}
                      className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                      onMouseMove={(event) => {
                        const rect = chartRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        setHoveredPoint({
                          item: {
                            date: item.date,
                            value: item.value,
                            reservationCount: item.reservationCount,
                          },
                          x: event.clientX - rect.left,
                          y: event.clientY - rect.top,
                        });
                      }}
                    >
                      <div
                        className={`w-full rounded-t transition-all ${
                          item.isToday
                            ? "bg-green-600"
                            : item.value > 0
                              ? "bg-green-400"
                              : "bg-gray-200"
                        }`}
                        style={{ height: `${Math.max(heightPct, item.value > 0 ? 4 : 2)}%` }}
                      />
                      {showLabel ? (
                        <span className={`whitespace-nowrap text-[10px] ${item.isToday ? "font-bold text-gray-900" : "text-gray-900"}`}>
                          {item.label}
                        </span>
                      ) : (
                        <span className="text-[10px] text-transparent">.</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Recent Transactions */}
      <Card padding="none">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
        </div>
        {transactions.length === 0 ? (
          <p className="px-6 pb-6 text-center text-gray-500">No transactions yet.</p>
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
                  <TableCell className="font-medium text-gray-900">{tx.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-gray-900">{tx.eventName}</TableCell>
                  <TableCell className="text-gray-900">{tx.grossFormatted}</TableCell>
                  <TableCell className="text-gray-600">{tx.feeFormatted}</TableCell>
                  <TableCell className="font-medium text-green-600">{tx.netFormatted}</TableCell>
                  <TableCell className="text-gray-600">{tx.date}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(tx.status)}>{formatStatus(tx.status)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
