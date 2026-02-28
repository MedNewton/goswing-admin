"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  ChevronRightIcon,
  DollarIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "@/components/icons";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatCompactNumber, formatStatus } from "@/lib/utils/format";
import { generateCsv, downloadCsv } from "@/lib/utils/csv";
import { updateReservationStatusAction } from "@/lib/actions/orders";
import type { Order } from "@/types";

interface OrdersPageClientProps {
  orders: Order[];
}

const STATUS_FILTER_OPTIONS = ["all", "pending", "confirmed", "checkedIn"] as const;

function StatusBadgeVariant(status: string): "confirmed" | "checkedIn" | "pending" | "cancelled" | "draft" | "error" | "info" | "secondary" {
  switch (status) {
    case "confirmed": return "confirmed";
    case "checkedIn": return "checkedIn";
    case "pending": return "pending";
    case "cancelled": return "cancelled";
    case "expired": return "error";
    case "refunded": return "info";
    case "draft": return "draft";
    default: return "secondary";
  }
}

function formatOrderStatus(status: string): string {
  if (status === "checkedIn") return "Checked In";
  return formatStatus(status);
}

const orderActionButtonClassName =
  "inline-flex min-h-10 min-w-[96px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50";

const confirmOrderButtonClassName = `${orderActionButtonClassName} border border-emerald-700 bg-emerald-600 text-white hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md active:translate-y-0`;

const checkInOrderButtonClassName = `${orderActionButtonClassName} border border-sky-700 bg-sky-600 text-white hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-md active:translate-y-0`;

function SummaryCard({
  icon: Icon,
  label,
  value,
  accentClass,
}: {
  icon: typeof ShoppingBagIcon;
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur">
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${accentClass}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function OrdersPageClient({ orders }: OrdersPageClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortAsc, setSortAsc] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    let result = orders;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.eventName.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.customerEmail?.toLowerCase().includes(q) ?? false),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    result = [...result].sort((a, b) => {
      const dateA = a.orderedAt ?? a.date;
      const dateB = b.orderedAt ?? b.date;
      return sortAsc
        ? dateA.localeCompare(dateB)
        : dateB.localeCompare(dateA);
    });

    return result;
  }, [orders, search, statusFilter, sortAsc]);

  const overview = useMemo(() => {
    const uniqueCustomers = new Set(
      orders
        .map((order) => order.customerEmail ?? order.customerName)
        .filter(Boolean),
    ).size;

    const filteredItems = filtered.reduce((sum, order) => sum + (order.itemCount ?? 0), 0);

    return {
      totalOrders: orders.length,
      uniqueCustomers,
      checkedInCount: orders.filter((order) => order.status === "checkedIn").length,
      filteredOrders: filtered.length,
      filteredItems,
    };
  }, [filtered, orders]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    setActionError(null);
    startTransition(async () => {
      try {
        const result = await updateReservationStatusAction(orderId, newStatus);
        if (result.success) {
          router.refresh();
        } else {
          setActionError(`Failed to update order ${orderId.slice(0, 8)}: ${result.error}`);
        }
      } catch {
        setActionError("An unexpected error occurred.");
      }
      setUpdatingId(null);
    });
  };

  const handleExport = () => {
    const csv = generateCsv(filtered, [
      { key: "id", header: "Order ID" },
      { key: "eventName", header: "Event" },
      { key: "customerName", header: "Customer" },
      { key: "customerEmail", header: "Email" },
      { key: "offerType", header: "Offer Type" },
      { key: "itemCount", header: "Qty" },
      { key: "amountFormatted", header: "Amount" },
      { key: "status", header: "Status" },
      { key: "date", header: "Date" },
    ]);
    downloadCsv(csv, `orders-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
          <button
            type="button"
            className="ml-3 font-medium underline hover:text-red-900"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-800 p-8 text-white shadow-xl shadow-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(45,212,191,0.22),_transparent_34%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-white backdrop-blur">
              <ShoppingBagIcon className="h-6 w-6" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-teal-100/75">
              Orders Overview
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Reservations, status actions, and export controls in one place.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              Review bookings across your events, filter by status, and update reservation progress without leaving the page.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {overview.totalOrders.toLocaleString()} total orders
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {statusFilter === "all" ? "All statuses" : formatOrderStatus(statusFilter)}
              </div>
              <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
                {sortAsc ? "Oldest first" : "Newest first"}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            <SummaryCard
              icon={ShoppingBagIcon}
              label="Orders"
              value={formatCompactNumber(overview.totalOrders)}
              accentClass="bg-amber-50 text-amber-700"
            />
            <SummaryCard
              icon={UsersIcon}
              label="Customers"
              value={formatCompactNumber(overview.uniqueCustomers)}
              accentClass="bg-emerald-50 text-emerald-700"
            />
            <SummaryCard
              icon={CalendarIcon}
              label="Checked In"
              value={formatCompactNumber(overview.checkedInCount)}
              accentClass="bg-sky-50 text-sky-700"
            />
            <SummaryCard
              icon={DollarIcon}
              label="Tickets"
              value={formatCompactNumber(overview.filteredItems)}
              accentClass="bg-rose-50 text-rose-700"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-gray-100">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
              Filters
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-950">
              Search and refine orders
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Narrow the list by event, customer, or reservation status before exporting or updating.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setSortAsc(!sortAsc)}
              className="rounded-full border-gray-200 px-4"
            >
              <CalendarIcon className="h-4 w-4" />
              {sortAsc ? "Oldest first" : "Newest first"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="rounded-full border-gray-200 px-4"
            >
              <ChevronRightIcon className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <SearchBar
            placeholder="Search orders, customers, events..."
            className="max-w-none [&_input]:h-12 [&_input]:rounded-2xl [&_input]:border-gray-200 [&_input]:pr-4 [&_input]:text-sm [&_input]:shadow-sm [&_input]:focus:border-gray-900 [&_input]:focus:ring-gray-900"
            value={search}
            onChange={setSearch}
          />
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              {STATUS_FILTER_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Statuses" : formatOrderStatus(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-gray-200 bg-white shadow-lg shadow-gray-100">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                Orders List
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                Reservation activity
              </h2>
            </div>
            <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600">
              Showing {overview.filteredOrders.toLocaleString()} of {overview.totalOrders.toLocaleString()}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white">
              <ShoppingBagIcon className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-medium text-gray-900">
              {orders.length === 0 ? "No orders yet." : "No orders match your filters."}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {orders.length === 0
                ? "Reservations will appear here once bookings start coming in."
                : "Try a different search term or clear the current status filter."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableHead className="px-6 py-4">Order ID</TableHead>
              <TableHead className="px-6 py-4">Event</TableHead>
              <TableHead className="px-6 py-4">Customer</TableHead>
              <TableHead className="px-6 py-4">Offer Type</TableHead>
              <TableHead className="px-6 py-4">Qty</TableHead>
              <TableHead className="px-6 py-4">Amount</TableHead>
              <TableHead className="px-6 py-4">Status</TableHead>
              <TableHead className="px-6 py-4">Date</TableHead>
              <TableHead className="px-6 py-4">Actions</TableHead>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => {
                const isUpdating = updatingId === order.id;

                return (
                  <TableRow key={order.id} className="transition-colors hover:bg-slate-50/80">
                    <TableCell className="font-mono text-sm font-medium text-gray-900">
                      {order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div>
                        <p className="font-medium text-gray-900">{order.eventName}</p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                          Event order
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div>
                        <p className="font-medium text-gray-900">{order.customerName}</p>
                        {order.customerEmail && (
                          <p className="mt-1 text-xs text-gray-500">{order.customerEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{order.offerType}</TableCell>
                    <TableCell className="text-gray-600">{order.itemCount ?? "—"}</TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {order.amountFormatted ?? `${order.amount}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={StatusBadgeVariant(order.status)}>
                        {formatOrderStatus(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">{order.date}</TableCell>
                    <TableCell>
                      {isUpdating ? (
                        <span className="text-xs text-gray-400">Updating...</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {order.status === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(order.id, "confirmed")}
                                disabled={isPending}
                                className={confirmOrderButtonClassName}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(order.id, "checkedIn")}
                                disabled={isPending}
                                className={checkInOrderButtonClassName}
                              >
                                Check In
                              </button>
                            </>
                          )}
                          {order.status === "confirmed" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "checkedIn")}
                              disabled={isPending}
                              className={checkInOrderButtonClassName}
                            >
                              Check In
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
