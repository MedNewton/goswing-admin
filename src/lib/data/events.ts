// Event queries and mutations backed by the Gooswing REST API.

import { adminApiCall } from "@/lib/api/client";
import type {
  ApiAdminContext,
  ApiAdminEvent,
  ApiAdminEventDetail,
  ApiCreateEventInput,
  ApiEventOverview,
  ApiItems,
  ApiTag,
} from "@/lib/api/types";
import type { EventInsert, EventUpdate, TicketTypeInsert } from "@/types/database";
import type { Event, EventOverview, TicketSalesBreakdown } from "@/types";
import { formatDate, formatMoney, formatPrice } from "@/lib/utils/format";

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

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

/** Map an API admin event item to the UI view model. */
function mapApiAdminEventToUiEvent(item: ApiAdminEvent): Event {
  const venueName = item.venueName ?? "";
  const city = item.venueCity ?? "";
  const location = [venueName, city].filter(Boolean).join(", ");

  return {
    id: item.id,
    title: item.title,
    description: item.description ?? undefined,
    image: item.heroImageUrl ?? "/placeholder-event.png",
    date: formatDate(item.startsAt),
    startsAt: item.startsAt,
    endsAt: item.endsAt ?? undefined,
    location: location || "TBA",
    venue: venueName || undefined,
    attendeeCount: item.attendeeCount,
    reservationCount: item.reservationCount,
    status: normalizeEventStatus(item.status),
    currency: item.currency.trim(),
    minPrice: formatPrice(item.minPriceCents, item.currency, item.isFree),
    isFree: item.isFree,
    organizerId: item.organizerId,
    organizerName: item.organizerName ?? undefined,
    tags: [...item.tags],
    partyTypes: [...item.partyTypes],
    musicStyles: [...item.musicStyles],
    extraServices: [...item.extraServices],
    songSuggestionsCount: item.songSuggestionsCount,
    checkedInCount: item.checkedInCount,
    reviewScore: item.reviewScore,
    waitlistEnabled: item.waitlistEnabled,
    approvalMode: item.approvalMode,
    sharingEnabled: item.sharingEnabled,
    policies: item.policies.map((p) => ({ title: p.title, description: p.description })),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all events created by the current user, enriched with counts. */
export async function getEvents() {
  const { items } = await adminApiCall<ApiItems<ApiAdminEvent>>("/v1/admin/events");
  return items.map(mapApiAdminEventToUiEvent);
}

/** Fetch a single event by ID with full relations (only if owned by current user). */
export async function getEvent(id: string) {
  const detail = await adminApiCall<ApiAdminEventDetail>(`/v1/admin/events/${id}`);

  return {
    event: mapApiAdminEventToUiEvent(detail.event),
    ticketTypes: detail.ticketTypes.map((tt) => ({
      id: tt.id,
      name: tt.name,
      description: tt.description,
      price_cents: tt.priceCents,
      currency: tt.currency,
      benefits: tt.benefits as unknown[],
      capacity: tt.capacity,
      sales_start_at: tt.salesStartAt,
      sales_end_at: tt.salesEndAt,
      is_free: tt.isFree,
      free_for_ladies: tt.freeForLadies,
    })),
    organizer: detail.organizer
      ? {
          id: detail.organizer.id,
          name: detail.organizer.name,
          logo_url: detail.organizer.logoUrl,
          tagline: detail.organizer.tagline,
          about: detail.organizer.about,
          cover_image_url: detail.organizer.coverImageUrl,
          established_year: detail.organizer.establishedYear,
          is_verified: detail.organizer.isVerified,
          city: detail.organizer.city,
          country_code: detail.organizer.countryCode,
          phone: detail.organizer.phone,
          email: detail.organizer.email,
          website_url: detail.organizer.websiteUrl,
          instagram_handle: detail.organizer.instagramHandle,
          facebook_handle: detail.organizer.facebookHandle,
          specialties: detail.organizer.specialties
            ? [...detail.organizer.specialties]
            : null,
          cancellation_policy: detail.organizer.cancellationPolicy,
          refund_policy: detail.organizer.refundPolicy,
        }
      : null,
    venue: detail.venue
      ? {
          id: detail.venue.id,
          name: detail.venue.name,
          city: detail.venue.city,
          address_line1: detail.venue.addressLine1,
          region: detail.venue.region,
          country_code: detail.venue.countryCode,
          timezone: detail.venue.timezone,
          venue_type: detail.venue.venueType,
          lat: detail.venue.lat,
          lng: detail.venue.lng,
          capacity: detail.venue.capacity,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Event Overview (analytics for a single event)
// ---------------------------------------------------------------------------

/** Fetch full analytics overview for a single event (ownership verified). */
export async function getEventOverview(eventId: string): Promise<EventOverview> {
  const overview = await adminApiCall<ApiEventOverview>(
    `/v1/admin/events/${eventId}/overview`,
  );

  const ticketSalesBreakdown: TicketSalesBreakdown[] =
    overview.ticketSalesBreakdown.map((b) => ({
      ticketTypeName: b.ticketTypeName,
      ticketsSold: b.ticketsSold,
      revenue: b.revenueCents,
      revenueFormatted: formatMoney(b.revenueCents, overview.currency),
    }));

  return {
    eventId: overview.eventId,
    reservationsCount: overview.reservationsCount,
    songSuggestionsCount: overview.songSuggestionsCount,
    checkedInCount: overview.checkedInCount,
    reviewScore: overview.reviewScore,
    reviewCount: overview.reviewCount,
    totalTicketsSold: overview.totalTicketsSold,
    totalRevenue: overview.totalRevenueCents,
    totalRevenueFormatted: formatMoney(overview.totalRevenueCents, overview.currency),
    ticketSalesBreakdown,
    conversionRate: null, // requires page view tracking (not yet available)
    cancellationRate: overview.cancellationRate,
  };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

/** Fetch all tags for the multi-select dropdown. */
export async function getTags() {
  const { items } = await adminApiCall<ApiItems<ApiTag>>("/v1/admin/tags");
  return items.map((tag) => ({
    id: tag.id,
    label: tag.label,
    slug: tag.slug,
    type: tag.type,
  })) as Array<{ id: string; label: string; slug: string; type: string }>;
}

// ---------------------------------------------------------------------------
// Organizer helpers
// ---------------------------------------------------------------------------

/** Fetch the organizer row owned by the current authenticated user. */
export async function getOrganizerForCurrentUser() {
  const context = await adminApiCall<ApiAdminContext>("/v1/admin/me/context");
  if (!context.organizer) {
    throw new Error("No organizer found for current user");
  }
  return { id: context.organizer.id, name: context.organizer.name };
}

/** Create a venue and return its ID. */
export async function createVenue(venue: {
  name: string;
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
}) {
  const { venueId } = await adminApiCall<{ venueId: string }>("/v1/admin/venues", {
    method: "POST",
    body: {
      name: venue.name,
      addressLine1: venue.address_line1 ?? null,
      city: venue.city ?? null,
      region: venue.region ?? null,
      countryCode: venue.country_code ?? null,
    },
  });
  return venueId;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new event with ticket types. */
export async function createEvent(
  event: EventInsert,
  ticketTypes: Omit<TicketTypeInsert, "event_id">[],
  tagIds?: string[],
) {
  const body: ApiCreateEventInput = {
    title: event.title,
    description: event.description ?? null,
    startsAt: event.starts_at,
    endsAt: event.ends_at ?? null,
    venueId: event.venue_id ?? null,
    heroImageUrl: event.hero_image_url ?? null,
    publish: event.status === "published",
    currency: event.currency,
    approvalMode: event.approval_mode as "auto" | "manual" | undefined,
    sharingEnabled: event.sharing_enabled,
    policies: event.policies,
    ticketTiers: ticketTypes.map((tt) => ({
      name: tt.name,
      priceCents: tt.price_cents,
      currency: tt.currency,
      description: tt.description ?? null,
      capacity: tt.capacity ?? null,
      isFree: tt.is_free,
      freeForLadies: tt.free_for_ladies,
    })),
    tagIds,
  };

  const { eventId } = await adminApiCall<{ eventId: string }>("/v1/admin/events", {
    method: "POST",
    body,
  });
  return eventId;
}

/** Update an existing event (only if owned by current user). */
export async function updateEvent(id: string, updates: EventUpdate) {
  const body: Record<string, unknown> = {};
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.description !== undefined) body.description = updates.description;
  if (updates.starts_at !== undefined) body.startsAt = updates.starts_at;
  if (updates.ends_at !== undefined) body.endsAt = updates.ends_at;
  if (updates.venue_id !== undefined) body.venueId = updates.venue_id;
  if (updates.hero_image_url !== undefined) body.heroImageUrl = updates.hero_image_url;
  if (updates.status !== undefined) body.status = updates.status;
  if (updates.currency !== undefined) body.currency = updates.currency;
  if (updates.approval_mode !== undefined) body.approvalMode = updates.approval_mode;
  if (updates.sharing_enabled !== undefined) body.sharingEnabled = updates.sharing_enabled;
  if (updates.policies !== undefined) body.policies = updates.policies;

  await adminApiCall(`/v1/admin/events/${id}`, { method: "PATCH", body });
}

/** Delete an event (only if owned by current user). */
export async function deleteEvent(id: string) {
  await adminApiCall<void>(`/v1/admin/events/${id}`, { method: "DELETE" });
}
