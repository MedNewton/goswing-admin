import { adminApiCall } from "@/lib/api/client";
import type { ApiAdminEvent, ApiOverview } from "@/lib/api/types";
import type { Event, Stats } from "@/types";
import { formatDate, formatMoney, formatPrice } from "@/lib/utils/format";

// Local copy of the shared event mapping (see src/lib/mappers/events.ts) —
// kept self-contained so overview does not depend on files being rewritten.
function normalizeEventStatus(
  s: string,
): "published" | "draft" | "completed" | "cancelled" | "live" {
  const lower = s.toLowerCase();
  if (lower === "published") return "published";
  if (lower === "draft") return "draft";
  if (lower === "completed") return "completed";
  if (lower === "cancelled" || lower === "canceled") return "cancelled";
  if (lower === "live") return "live";
  return "draft";
}

function mapApiEvent(e: ApiAdminEvent): Event {
  const venueName = e.venueName ?? "";
  const city = e.venueCity ?? "";
  const location = [venueName, city].filter(Boolean).join(", ");

  return {
    id: e.id,
    title: e.title,
    description: e.description ?? undefined,
    image: e.heroImageUrl ?? "/placeholder-event.png",
    date: formatDate(e.startsAt),
    startsAt: e.startsAt,
    endsAt: e.endsAt ?? undefined,
    location: location || "TBA",
    venue: venueName || undefined,
    attendeeCount: e.attendeeCount,
    reservationCount: e.reservationCount,
    status: normalizeEventStatus(e.status),
    currency: e.currency.trim(),
    minPrice: formatPrice(e.minPriceCents, e.currency, e.isFree),
    isFree: e.isFree,
    organizerId: e.organizerId,
    organizerName: e.organizerName ?? undefined,
    tags: [...e.tags],
    partyTypes: [...e.partyTypes],
    musicStyles: [...e.musicStyles],
    extraServices: [...e.extraServices],
    songSuggestionsCount: e.songSuggestionsCount,
    checkedInCount: e.checkedInCount,
    reviewScore: e.reviewScore,
    waitlistEnabled: e.waitlistEnabled,
    approvalMode: e.approvalMode,
    sharingEnabled: e.sharingEnabled,
    policies: e.policies.map((p) => ({ title: p.title, description: p.description })),
  };
}

/** Fetch dashboard overview stats + recent events. */
export async function getOverview() {
  const data = await adminApiCall<ApiOverview>("/v1/admin/overview");

  const stats: Stats = {
    totalEvents: data.stats.totalEvents,
    totalAttendees: data.stats.totalAttendees,
    totalTickets: data.stats.totalTickets,
    avgRating: data.stats.avgRating,
    totalRevenue: data.stats.totalRevenueCents / 100,
    totalRevenueFormatted: formatMoney(
      data.stats.totalRevenueCents,
      data.stats.currency,
    ),
  };

  return {
    stats,
    recentEvents: data.recentEvents.map(mapApiEvent),
  };
}
