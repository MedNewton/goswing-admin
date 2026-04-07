"use client";

import { useState, useMemo, useEffect } from "react";
import { getClientLocale, translate } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import {
  ChartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DollarIcon,
} from "@/components/icons";
import { generateCsv, downloadCsv } from "@/lib/utils/csv";
import { formatMoney, formatStatus, statusVariant } from "@/lib/utils/format";
import type { Transaction } from "@/types";

type SortMode = "newest" | "oldest" | "highest" | "lowest";

interface TransactionsPageClientProps {
  transactions: Transaction[];
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
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${accentClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function TransactionsPageClient({ transactions }: TransactionsPageClientProps) {
  const [locale, setLocale] = useState<Locale>("fr");
  useEffect(() => { setLocale(getClientLocale()); }, []);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [eventFilter, setEventFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const currency = transactions[0]?.currency ?? "USD";

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of transactions) {
      if (t.eventId && t.eventName) map.set(t.eventId, t.eventName);
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (eventFilter !== "all") {
      result = result.filter((t) => t.eventId === eventFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.eventName.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q),
      );
    }

    switch (sortMode) {
      case "newest":
        result = [...result].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "oldest":
        result = [...result].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "highest":
        result = [...result].sort((a, b) => b.grossAmount - a.grossAmount);
        break;
      case "lowest":
        result = [...result].sort((a, b) => a.grossAmount - b.grossAmount);
        break;
    }

    return result;
  }, [transactions, search, sortMode, eventFilter, statusFilter]);

  const totalGross = filteredTransactions.reduce((s, t) => s + t.grossAmount, 0);
  const totalFees = filteredTransactions.reduce((s, t) => s + t.platformFee, 0);
  const totalNet = filteredTransactions.reduce((s, t) => s + t.netAmount, 0);

  const handleExport = () => {
    const csv = generateCsv(filteredTransactions, [
      { key: "id", header: "Transaction ID" },
      { key: "eventName", header: "Event" },
      { key: "grossFormatted", header: "Gross Amount" },
      { key: "feeFormatted", header: "Platform Fee" },
      { key: "netFormatted", header: "Net Amount" },
      { key: "date", header: "Date" },
      { key: "status", header: "Status" },
    ]);
    downloadCsv(csv, `transactions-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-800 p-8 text-white shadow-xl shadow-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.22),_transparent_34%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div>
            <Link
              href="/finance"
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-100/75 hover:text-white"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              {translate(locale, "transactionsPage.backToFinance")}
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
              <ChartIcon className="h-6 w-6" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100/80">
              {translate(locale, "transactionsPage.eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {translate(locale, "transactionsPage.subtitle")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              {translate(locale, "transactionsPage.description")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {filteredTransactions.length.toLocaleString()} {translate(locale, "transactionsPage.shown")}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard icon={DollarIcon} label={translate(locale, "financePage.revenue")} value={formatMoney(totalGross, currency)} accentClass="bg-emerald-50 text-emerald-700" />
            <SummaryCard icon={DollarIcon} label={translate(locale, "financePage.netRevenue")} value={formatMoney(totalNet, currency)} accentClass="bg-sky-50 text-sky-700" />
            <SummaryCard icon={ChartIcon} label={translate(locale, "financePage.transactions")} value={String(filteredTransactions.length)} accentClass="bg-amber-50 text-amber-700" />
            <SummaryCard icon={DollarIcon} label={translate(locale, "financePage.platformFees")} value={formatMoney(totalFees, currency)} accentClass="bg-rose-50 text-rose-700" />
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
              {translate(locale, "transactionsPage.eyebrow")}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-950">
              {translate(locale, "transactionsPage.title")}
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="rounded-full border-gray-200 px-4">
            <ChevronRightIcon className="h-4 w-4" />
            {translate(locale, "transactionsPage.exportCsv")}
          </Button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px_200px_200px] lg:items-end">
          <SearchBar
            placeholder={translate(locale, "transactionsPage.searchPlaceholder")}
            className="max-w-none [&_input]:h-12 [&_input]:rounded-2xl [&_input]:border-gray-200 [&_input]:pr-4 [&_input]:shadow-sm"
            value={search}
            onChange={setSearch}
          />
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              {translate(locale, "transactionsPage.event")}
            </span>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="all">{translate(locale, "transactionsPage.allEvents")}</option>
              {eventOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              {translate(locale, "transactionsPage.status")}
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="all">{translate(locale, "transactionsPage.allStatuses")}</option>
              <option value="completed">{translate(locale, "common.completed")}</option>
              <option value="pending">{translate(locale, "common.active")}</option>
              <option value="failed">{translate(locale, "common.cancelled")}</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Sort
            </span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              <option value="newest">{translate(locale, "transactionsPage.sortNewest")}</option>
              <option value="oldest">{translate(locale, "transactionsPage.sortOldest")}</option>
              <option value="highest">{translate(locale, "transactionsPage.sortHighest")}</option>
              <option value="lowest">{translate(locale, "transactionsPage.sortLowest")}</option>
            </select>
          </label>
        </div>
      </section>

      {/* Transactions Table */}
      <Card className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
        {filteredTransactions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <ChartIcon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-base font-medium text-gray-900">
              {translate(locale, "transactionsPage.noTransactions")}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableHead className="px-6 py-4">{translate(locale, "transactionsPage.transactionId")}</TableHead>
              <TableHead className="px-6 py-4">{translate(locale, "transactionsPage.event")}</TableHead>
              <TableHead className="px-6 py-4">{translate(locale, "transactionsPage.grossAmount")}</TableHead>
              <TableHead className="px-6 py-4">{translate(locale, "transactionsPage.platformFee")}</TableHead>
              <TableHead className="px-6 py-4">{translate(locale, "transactionsPage.netAmount")}</TableHead>
              <TableHead className="px-6 py-4">{translate(locale, "transactionsPage.date")}</TableHead>
              <TableHead className="px-6 py-4">{translate(locale, "transactionsPage.status")}</TableHead>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="transition-colors hover:bg-slate-50/80">
                  <TableCell className="font-mono text-sm font-medium text-gray-900">
                    {transaction.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="whitespace-normal text-gray-900">
                    {transaction.eventName}
                  </TableCell>
                  <TableCell className="text-gray-900">{transaction.grossFormatted}</TableCell>
                  <TableCell className="text-gray-600">{transaction.feeFormatted}</TableCell>
                  <TableCell className="font-medium text-emerald-600">{transaction.netFormatted}</TableCell>
                  <TableCell className="text-gray-600">{transaction.date}</TableCell>
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
