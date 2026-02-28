/**
 * Shared formatting utilities for the admin dashboard.
 */

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** Convert cents integer + ISO 4217 currency code to a human-readable string. */
export function formatMoney(cents: number, currency: string): string {
  const value = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.trim(),
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback if the currency code is invalid
    return `${value.toFixed(2)} ${currency.trim()}`;
  }
}

/** Shorthand for "Free" vs formatted price. */
export function formatPrice(
  cents: number | null | undefined,
  currency: string,
  isFree?: boolean,
): string {
  if (isFree || cents == null || cents === 0) return "Free";
  return formatMoney(cents, currency);
}

// ---------------------------------------------------------------------------
// Dates & Times
// ---------------------------------------------------------------------------

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const DATETIME_FORMAT: Intl.DateTimeFormatOptions = {
  ...DATE_FORMAT,
  hour: "numeric",
  minute: "2-digit",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

/** Format an ISO timestamp to a short date (e.g. "Feb 7, 2026"). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", DATE_FORMAT);
}

/** Format an ISO timestamp to date + time (e.g. "Feb 7, 2026, 8:30 PM"). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", DATETIME_FORMAT);
}

/** Format an ISO timestamp to time only (e.g. "8:30 PM"). */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", TIME_FORMAT);
}

/** Relative time label (e.g. "2 hours ago", "in 3 days"). */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const absDiff = Math.abs(diffMs);
  const future = diffMs < 0;

  const minutes = Math.floor(absDiff / 60_000);
  const hours = Math.floor(absDiff / 3_600_000);
  const days = Math.floor(absDiff / 86_400_000);

  let label: string;
  if (minutes < 1) label = "just now";
  else if (minutes < 60) label = `${minutes}m`;
  else if (hours < 24) label = `${hours}h`;
  else if (days < 30) label = `${days}d`;
  else label = formatDate(iso);

  if (label === "just now" || days >= 30) return label;
  return future ? `in ${label}` : `${label} ago`;
}

// ---------------------------------------------------------------------------
// Status normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise a DB status string to a consistent badge variant.
 * This covers events, reservations, tickets, and payments.
 */
export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "secondary";

const STATUS_MAP: Record<string, BadgeVariant> = {
  // events
  published: "success",
  draft: "secondary",
  completed: "default",
  cancelled: "error",
  // reservations / tickets
  confirmed: "success",
  checkedin: "info",
  pending: "warning",
  expired: "error",
  refunded: "info",
  // payments
  succeeded: "success",
  failed: "error",
  requires_action: "warning",
  // ticket checkins
  accepted: "success",
  rejected: "error",
};

export function statusVariant(status: string | null | undefined): BadgeVariant {
  if (!status) return "default";
  return STATUS_MAP[status.toLowerCase()] ?? "default";
}

/** Title-case a status string for display. */
export function formatStatus(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** Compact number (e.g. 1200 -> "1.2K"). */
export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Percentage with one decimal (e.g. 0.876 -> "87.6%"). */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
