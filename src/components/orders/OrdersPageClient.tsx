"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/SearchBar";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatStatus } from "@/lib/utils/format";
import { generateCsv, downloadCsv } from "@/lib/utils/csv";
import { updateReservationStatusAction } from "@/lib/actions/orders";
import type { Order } from "@/types";

interface OrdersPageClientProps {
  orders: Order[];
}

const STATUS_FILTER_OPTIONS = ["all", "pending", "confirmed", "checkedIn", "cancelled", "expired", "refunded", "draft"] as const;

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

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <SearchBar
          placeholder="Search orders, customers, events..."
          className="flex-1 max-w-lg"
          value={search}
          onChange={setSearch}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          {STATUS_FILTER_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All Statuses" : formatOrderStatus(s)}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          onClick={() => setSortAsc(!sortAsc)}
        >
          {sortAsc ? "Oldest first" : "Newest first"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          Export
        </Button>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg bg-white shadow-sm">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-gray-500">
            {orders.length === 0 ? "No orders yet." : "No orders match your filters."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Order ID</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Offer Type</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => {
                const isUpdating = updatingId === order.id;

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm text-gray-900">{order.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-gray-900">{order.eventName}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-gray-900">{order.customerName}</p>
                        {order.customerEmail && (
                          <p className="text-xs text-gray-500">{order.customerEmail}</p>
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
                        <div className="flex gap-2">
                          {order.status === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(order.id, "confirmed")}
                                disabled={isPending}
                                className="rounded-md border border-green-600 bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-green-700 active:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(order.id, "checkedIn")}
                                disabled={isPending}
                                className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                              className="rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>
    </div>
  );
}
