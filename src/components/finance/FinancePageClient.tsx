"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  CalendarIcon,
  ChartIcon,
  ChevronRightIcon,
  DollarIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import {
  formatDate,
  formatMoney,
  formatStatus,
  statusVariant,
} from "@/lib/utils/format";
import { generateCsv, downloadCsv } from "@/lib/utils/csv";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
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

type PeriodOption = 7 | 30 | 90;
type ChartMetric = "amount" | "reservations";

type ChartPoint = {
  dateKey: string;
  fullDate: string;
  shortLabel: string;
  value: number;
  reservationCount: number;
  isToday: boolean;
};

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function buildChartData(
  transactions: Transaction[],
  periodDays: PeriodOption,
  windowEnd: Date,
) {
  const normalizedEnd = startOfDay(windowEnd);
  const windowStart = addDays(normalizedEnd, -(periodDays - 1));
  const todayKey = toDateKey(startOfDay(new Date()));
  const dailyMap: Record<string, { value: number; reservationCount: number }> = {};

  for (const transaction of transactions) {
    const parsed = new Date(transaction.orderedAt ?? transaction.date);
    if (Number.isNaN(parsed.getTime())) continue;

    const day = startOfDay(parsed);
    if (day < windowStart || day > normalizedEnd) continue;

    const key = toDateKey(day);
    dailyMap[key] ??= { value: 0, reservationCount: 0 };
    dailyMap[key].value += transaction.grossAmount;
    dailyMap[key].reservationCount += 1;
  }

  const points: ChartPoint[] = [];

  for (let offset = 0; offset < periodDays; offset++) {
    const day = addDays(windowStart, offset);
    const key = toDateKey(day);
    const dayData = dailyMap[key] ?? { value: 0, reservationCount: 0 };

    points.push({
      dateKey: key,
      fullDate: day.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      shortLabel:
        periodDays <= 7
          ? day.toLocaleDateString("en-US", { weekday: "short" })
          : day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: dayData.value,
      reservationCount: dayData.reservationCount,
      isToday: key === todayKey,
    });
  }

  return { points, windowStart, windowEnd: normalizedEnd };
}

function inRange(transaction: Transaction, windowStart: Date, windowEnd: Date) {
  const parsed = new Date(transaction.orderedAt ?? transaction.date);
  if (Number.isNaN(parsed.getTime())) return false;
  const day = startOfDay(parsed);
  return day >= windowStart && day <= windowEnd;
}

function calculateVisibleStats(transactions: Transaction[]) {
  let gross = 0;
  let fees = 0;
  let net = 0;
  let completedCount = 0;

  for (const transaction of transactions) {
    if (transaction.status !== "completed") continue;
    gross += transaction.grossAmount;
    fees += transaction.platformFee;
    net += transaction.netAmount;
    completedCount += 1;
  }

  return {
    completedCount,
    gross,
    fees,
    net,
  };
}

function periodLabel(periodDays: PeriodOption) {
  switch (periodDays) {
    case 7:
      return "7 Days";
    case 30:
      return "30 Days";
    case 90:
      return "90 Days";
  }
}

function formatChartMoney(cents: number, currency: string) {
  const value = cents / 100;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatMoney(cents, currency);
  }
}

function buildAreaPath(
  points: Array<{ x: number; y: number }>,
  baselineY: number,
) {
  if (points.length === 0) return "";

  const linePath = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || !lastPoint) return "";

  return `${linePath} L ${lastPoint.x.toFixed(2)} ${baselineY.toFixed(2)} L ${firstPoint.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: typeof DollarIcon;
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${accentClass}`}
      >
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function FinancePageClient({
  transactions,
  stats,
}: FinancePageClientProps) {
  const currency = transactions[0]?.currency ?? "USD";
  const today = startOfDay(new Date());
  const todayKey = toDateKey(today);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartViewportRef = useRef<HTMLDivElement>(null);

  const [periodDays, setPeriodDays] = useState<PeriodOption>(30);
  const [chartMetric, setChartMetric] = useState<ChartMetric>("amount");
  const [windowEndKey, setWindowEndKey] = useState(todayKey);
  const [chartViewportWidth, setChartViewportWidth] = useState(0);
  const [hoveredPoint, setHoveredPoint] = useState<{
    item: ChartPoint;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const element = chartViewportRef.current;
    if (!element) return;

    const updateWidth = () => {
      setChartViewportWidth(element.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const windowEnd = fromDateKey(windowEndKey);
  const { points, windowStart, windowEnd: normalizedWindowEnd } = buildChartData(
    transactions,
    periodDays,
    windowEnd,
  );
  const visibleTransactions = transactions.filter((transaction) =>
    inRange(transaction, windowStart, normalizedWindowEnd),
  );
  const visibleStats = calculateVisibleStats(visibleTransactions);
  const visibleReservations = points.reduce(
    (sum, point) => sum + point.reservationCount,
    0,
  );
  const chartValues = points.map((point) =>
    chartMetric === "amount" ? point.value : point.reservationCount,
  );
  const maxValue = Math.max(...chartValues, 1);
  const chartHeight = 320;
  const minStepWidth =
    periodDays === 7 ? 88 : periodDays === 30 ? 34 : 18;
  const chartPadding = { top: 16, right: 20, bottom: 46, left: 76 };
  const minimumChartWidth = Math.max(
    points.length * minStepWidth + chartPadding.left + chartPadding.right,
    760,
  );
  const chartWidth = Math.max(chartViewportWidth, minimumChartWidth);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const stepWidth = plotWidth / points.length;
  const yAxisTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
    ratio,
    label:
      chartMetric === "amount"
        ? formatChartMoney(Math.round(maxValue * ratio), currency)
        : String(Math.round(maxValue * ratio)),
  }));
  const canMoveForward = windowEndKey < todayKey;
  const linePoints = points.map((point, index) => {
    const x =
      chartPadding.left +
      index * stepWidth +
      Math.max(stepWidth / 2, periodDays === 90 ? 9 : 14);
    const currentValue =
      chartMetric === "amount" ? point.value : point.reservationCount;
    const y =
      chartPadding.top + plotHeight - (currentValue / maxValue) * plotHeight;

    return {
      ...point,
      currentValue,
      x,
      y,
    };
  });
  const plotBottomY = chartPadding.top + plotHeight;
  const linePath = linePoints
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");
  const areaPath = buildAreaPath(linePoints, plotBottomY);
  const metricStrokeColor = chartMetric === "amount" ? "#059669" : "#2563eb";
  const metricFillColor = chartMetric === "amount" ? "#34d399" : "#60a5fa";
  const metricActiveColor = chartMetric === "amount" ? "#047857" : "#1d4ed8";

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
    downloadCsv(
      csv,
      `finance-statement-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const handleTaxReport = () => {
    const monthlyMap: Record<
      string,
      { gross: number; fees: number; net: number; count: number }
    > = {};

    for (const transaction of transactions) {
      const parsed = new Date(transaction.date);
      if (Number.isNaN(parsed.getTime())) continue;

      const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] ??= { gross: 0, fees: 0, net: 0, count: 0 };
      monthlyMap[key].gross += transaction.grossAmount;
      monthlyMap[key].fees += transaction.platformFee;
      monthlyMap[key].net += transaction.netAmount;
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

  const moveWindow = (direction: -1 | 1) => {
    const nextDate = addDays(windowEnd, direction * periodDays);
    const boundedDate = direction > 0 && nextDate > today ? today : nextDate;
    setWindowEndKey(toDateKey(startOfDay(boundedDate)));
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-800 p-8 text-white shadow-xl shadow-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.22),_transparent_34%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
              <DollarIcon className="h-6 w-6" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100/80">
              Finance Overview
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Revenue, transaction health, and timeline performance in one place.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              Review total revenue, inspect specific time windows, and track daily performance including days with zero reservations.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {stats.transactionCount.toLocaleString()} total transactions
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {periodLabel(periodDays)} window
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard
              icon={DollarIcon}
              label="Revenue"
              value={formatMoney(stats.totalGross, currency)}
              accentClass="bg-emerald-50 text-emerald-700"
            />
            <SummaryCard
              icon={DollarIcon}
              label="Net Revenue"
              value={formatMoney(stats.totalNet, currency)}
              accentClass="bg-sky-50 text-sky-700"
            />
            <SummaryCard
              icon={ChartIcon}
              label="Transactions"
              value={String(stats.transactionCount)}
              accentClass="bg-amber-50 text-amber-700"
            />
            <SummaryCard
              icon={DollarIcon}
              label="Platform Fees"
              value={formatMoney(stats.totalFees, currency)}
              accentClass="bg-rose-50 text-rose-700"
            />
          </div>
        </div>
      </section>

      <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                  Revenue Timeline
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                  Daily revenue and reservations
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDate(windowStart.toISOString())} to{" "}
                  {formatDate(normalizedWindowEnd.toISOString())}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportStatement}
                  className="rounded-full border-gray-200 px-4"
                >
                  Export Statement
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTaxReport}
                  className="rounded-full border-gray-200 px-4"
                >
                  Tax Report
                </Button>
                <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  {formatMoney(visibleStats.gross, currency)} gross
                </div>
                <div className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
                  {visibleReservations} reservations
                </div>
                <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                  {visibleTransactions.length} transactions
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4">
              <div className="grid gap-4 xl:grid-cols-[auto,auto] xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Metric
                  </div>
                  <div className="inline-flex w-fit rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setChartMetric("amount")}
                      className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
                        chartMetric === "amount"
                          ? "bg-emerald-600 text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Revenue Amount
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric("reservations")}
                      className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
                        chartMetric === "reservations"
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      Reservations
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 xl:items-end">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Period & Date
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                      {[7, 30, 90].map((days) => {
                        const isActive = periodDays === days;
                        return (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setPeriodDays(days as PeriodOption)}
                            className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors ${
                              isActive
                                ? "bg-gray-950 text-white"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {periodLabel(days as PeriodOption)}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => moveWindow(-1)}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      <ChevronRightIcon className="h-4 w-4 rotate-180" />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setWindowEndKey(todayKey)}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => moveWindow(1)}
                      disabled={!canMoveForward}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                    <label className="flex min-h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={windowEndKey}
                        max={todayKey}
                        onChange={(event) => setWindowEndKey(event.target.value)}
                        className="bg-transparent text-sm focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Gross
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-950">
                {formatMoney(visibleStats.gross, currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Net
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-950">
                {formatMoney(visibleStats.net, currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Fees
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-950">
                {formatMoney(visibleStats.fees, currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Completed
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-950">
                {visibleStats.completedCount}
              </p>
            </div>
          </div>

          <div ref={chartRef} className="relative" onMouseLeave={() => setHoveredPoint(null)}>
            {hoveredPoint && (
              <div
                className="pointer-events-none absolute z-20 w-max rounded-2xl bg-gray-950 px-3 py-2 text-xs text-white shadow-lg"
                style={{
                  left: Math.min(hoveredPoint.x + 14, (chartRef.current?.clientWidth ?? 0) - 180),
                  top: Math.max(hoveredPoint.y - 72, 0),
                }}
              >
                <p className="font-semibold">{hoveredPoint.item.fullDate}</p>
                <p>
                  {chartMetric === "amount"
                    ? `Total: ${formatMoney(hoveredPoint.item.value, currency)}`
                    : `Reservations: ${hoveredPoint.item.reservationCount}`}
                </p>
                <p>
                  {hoveredPoint.item.reservationCount}{" "}
                  {hoveredPoint.item.reservationCount === 1
                    ? "reservation"
                    : "reservations"}
                </p>
              </div>
            )}

            <div
              ref={chartViewportRef}
              className="overflow-x-auto rounded-[1.5rem] border border-gray-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
            >
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="block h-[22rem]"
                style={{ width: `${chartWidth}px` }}
                aria-label="Finance chart"
              >
                {yAxisTicks.map((tick) => {
                  const y = chartPadding.top + (1 - tick.ratio) * plotHeight;

                  return (
                    <g key={tick.ratio}>
                      <line
                        x1={chartPadding.left}
                        y1={y}
                        x2={chartWidth - chartPadding.right}
                        y2={y}
                        stroke="#d1d5db"
                        strokeDasharray="4 6"
                      />
                      <text
                        x={chartPadding.left - 12}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-gray-500 text-[11px]"
                      >
                        {tick.label}
                      </text>
                    </g>
                  );
                })}

                <line
                  x1={chartPadding.left}
                  y1={plotBottomY}
                  x2={chartWidth - chartPadding.right}
                  y2={plotBottomY}
                  stroke="#9ca3af"
                />

                <path
                  d={areaPath}
                  fill={`url(#${chartMetric === "amount" ? "amountGradient" : "reservationGradient"})`}
                  opacity="0.22"
                />
                <path
                  d={linePath}
                  fill="none"
                  stroke={metricStrokeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <defs>
                  <linearGradient id="amountGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="reservationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {linePoints.map((point, index) => {
                  const showLabel =
                    periodDays <= 7 ||
                    point.isToday ||
                    index === 0 ||
                    index === points.length - 1 ||
                    index % Math.ceil(points.length / 6) === 0;

                  return (
                    <g key={point.dateKey}>
                      <rect
                        x={point.x - stepWidth / 2}
                        y={chartPadding.top}
                        width={stepWidth}
                        height={plotHeight}
                        rx="16"
                        fill="transparent"
                        onMouseMove={(event) => {
                          const rect = chartRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          setHoveredPoint({
                            item: point,
                            x: event.clientX - rect.left,
                            y: event.clientY - rect.top,
                          });
                        }}
                        onFocus={() => {
                          const rect = chartRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          setHoveredPoint({
                            item: point,
                            x: rect.width / 2,
                            y: rect.height / 2,
                          });
                        }}
                      />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={
                          point.currentValue > 0
                            ? point.isToday
                              ? 6
                              : 5
                            : hoveredPoint?.item.dateKey === point.dateKey
                              ? 4
                              : 3
                        }
                        fill={
                          point.isToday
                            ? metricActiveColor
                            : point.currentValue > 0
                              ? metricFillColor
                              : "#ffffff"
                        }
                        stroke={
                          point.currentValue > 0
                            ? metricStrokeColor
                            : "#9ca3af"
                        }
                        strokeWidth="2.5"
                      />
                      {showLabel && (
                        <text
                          x={point.x}
                          y={chartPadding.top + plotHeight + 22}
                          textAnchor="middle"
                          className={point.isToday ? "fill-gray-950 text-[11px] font-semibold" : "fill-gray-600 text-[11px]"}
                        >
                          {point.shortLabel}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-gray-600">
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  {chartMetric === "amount" ? "Amount view" : "Reservations view"}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-gray-600">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    chartMetric === "amount" ? "bg-emerald-600" : "bg-blue-600"
                  }`}
                />
                Selected line
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full border border-gray-400 bg-white" />
                Zero day
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    chartMetric === "amount" ? "bg-emerald-700" : "bg-blue-700"
                  }`}
                />
                Today
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                Transactions
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                Transactions in selected window
              </h2>
            </div>
            <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600">
              {visibleTransactions.length.toLocaleString()} transactions
            </div>
          </div>
        </div>

        {visibleTransactions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <ChartIcon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-base font-medium text-gray-900">
              No transactions in this period
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Try a different period or move the date window to inspect another range.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableHead className="px-6 py-4">Transaction ID</TableHead>
              <TableHead className="px-6 py-4">Event</TableHead>
              <TableHead className="px-6 py-4">Gross Amount</TableHead>
              <TableHead className="px-6 py-4">Platform Fee</TableHead>
              <TableHead className="px-6 py-4">Net Amount</TableHead>
              <TableHead className="px-6 py-4">Date</TableHead>
              <TableHead className="px-6 py-4">Status</TableHead>
            </TableHeader>
            <TableBody>
              {visibleTransactions.map((transaction) => (
                <TableRow
                  key={transaction.id}
                  className="transition-colors hover:bg-slate-50/80"
                >
                  <TableCell className="font-mono text-sm font-medium text-gray-900">
                    {transaction.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="whitespace-normal text-gray-900">
                    {transaction.eventName}
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {transaction.grossFormatted}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {transaction.feeFormatted}
                  </TableCell>
                  <TableCell className="font-medium text-emerald-600">
                    {transaction.netFormatted}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {transaction.date}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(transaction.status)}>
                      {formatStatus(transaction.status)}
                    </Badge>
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
