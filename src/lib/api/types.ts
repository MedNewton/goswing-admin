/**
 * Raw response shapes of the Gooswing REST API Phase 3 routes (60–127).
 * Contract: rest-api-phase-3-admin-routes.md + gooswing-staging.postman_collection3.json.
 * All keys camelCase; timestamps ISO-8601 UTC; money in integer cents.
 */

export type AdminRole = "admin" | "dj" | "entrance_manager" | "finance_manager";

// ── Session / profile / onboarding (60–65) ─────────────────────────────────

export type ApiAdminContext = Readonly<{
  userId: string;
  role: AdminRole;
  needsOnboarding: boolean;
  organizer: Readonly<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  }> | null;
}>;

export type ApiProvisionResult = Readonly<{ needsOnboarding: boolean }>;

export type ApiAdminProfile = Readonly<{
  userId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  occupation: string | null;
}>;

export type ApiCustomPolicy = Readonly<{ title: string; description: string }>;

export type ApiOnboardingData = Readonly<{
  personal: Readonly<{
    displayName: string | null;
    phone: string | null;
    avatarUrl: string | null;
  }>;
  organizer: Readonly<{
    id: string;
    name: string;
    tagline: string | null;
    about: string | null;
    city: string | null;
    countryCode: string | null;
    email: string | null;
    phone: string | null;
    websiteUrl: string | null;
    instagramHandle: string | null;
    facebookHandle: string | null;
    tiktokHandle: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    customPolicies: ApiCustomPolicy[];
  }> | null;
  venue: Readonly<{
    id: string;
    name: string;
    venueType: string | null;
    description: string | null;
    freeAccess: boolean;
    freeForLadies: boolean;
    addressLine1: string | null;
    city: string | null;
    region: string | null;
    countryCode: string | null;
    postalCode: string | null;
    capacity: number | null;
    lat: number | null;
    lng: number | null;
  }> | null;
}>;

export type ApiOnboardingResult = Readonly<{
  organizerId: string;
  venueId: string;
}>;

// ── Organizer & assets (66–72) ─────────────────────────────────────────────

export type ApiAdminOrganizer = Readonly<{
  id: string;
  name: string;
  tagline: string | null;
  about: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  city: string | null;
  countryCode: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  facebookHandle: string | null;
  tiktokHandle: string | null;
  snapchatHandle: string | null;
  youtubeHandle: string | null;
  twitterHandle: string | null;
  pinterestHandle: string | null;
  googleBusinessUrl: string | null;
  cancellationPolicy: string | null;
  refundPolicy: string | null;
  customPolicies: ApiCustomPolicy[];
  specialties: string[] | null;
  establishedYear: number | null;
  isVerified: boolean | null;
  createdAt: string;
}>;

export type ApiGalleryItem = Readonly<{
  id: string;
  url: string;
  mediaType: "image" | "video";
  caption: string | null;
  sortOrder: number;
}>;

export type ApiTag = Readonly<{
  id: string;
  label: string;
  slug: string;
  type: string;
}>;

// ── Events (75–80) ─────────────────────────────────────────────────────────

export type ApiAdminEvent = Readonly<{
  id: string;
  title: string;
  description: string | null;
  heroImageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  status: string;
  venueId: string | null;
  venueName: string | null;
  venueCity: string | null;
  organizerId: string;
  organizerName: string | null;
  currency: string;
  minPriceCents: number;
  isFree: boolean;
  attendeeCount: number;
  waitlistEnabled: boolean;
  approvalMode: string;
  sharingEnabled: boolean;
  policies: ApiCustomPolicy[];
  tags: string[];
  partyTypes: string[];
  musicStyles: string[];
  extraServices: string[];
  reservationCount: number;
  songSuggestionsCount: number;
  checkedInCount: number;
  reviewScore: number | null;
}>;

export type ApiAdminEventDetailEvent = ApiAdminEvent &
  Readonly<{ externalId: string | null; createdAt: string }>;

export type ApiAdminTicketType = Readonly<{
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  capacity: number | null;
  benefits: string[];
  salesStartAt: string | null;
  salesEndAt: string | null;
  isFree: boolean;
  freeForLadies: boolean;
}>;

export type ApiAdminEventVenue = Readonly<{
  id: string;
  name: string;
  city: string | null;
  addressLine1: string | null;
  region: string | null;
  countryCode: string | null;
  timezone: string | null;
  venueType: string | null;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
}>;

export type ApiAdminEventOrganizer = Readonly<{
  id: string;
  name: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  tagline: string | null;
  about: string | null;
  establishedYear: number | null;
  isVerified: boolean | null;
  city: string | null;
  countryCode: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  facebookHandle: string | null;
  specialties: string[] | null;
  cancellationPolicy: string | null;
  refundPolicy: string | null;
}>;

export type ApiAdminEventDetail = Readonly<{
  event: ApiAdminEventDetailEvent;
  tagIds: string[];
  ticketTypes: ApiAdminTicketType[];
  gallery: ApiGalleryItem[];
  venue: ApiAdminEventVenue | null;
  organizer: ApiAdminEventOrganizer | null;
}>;

export type ApiEventOverview = Readonly<{
  eventId: string;
  reservationsCount: number;
  songSuggestionsCount: number;
  checkedInCount: number;
  reviewScore: number | null;
  reviewCount: number;
  totalTicketsSold: number;
  totalRevenueCents: number;
  currency: string;
  cancellationRate: number | null;
  ticketSalesBreakdown: ReadonlyArray<
    Readonly<{
      ticketTypeName: string;
      ticketsSold: number;
      revenueCents: number;
    }>
  >;
}>;

export type ApiTicketTierInput = Readonly<{
  id?: string;
  name: string;
  priceCents: number;
  currency?: string;
  description?: string | null;
  capacity?: number | null;
  isFree?: boolean;
  freeForLadies?: boolean;
}>;

export type ApiGalleryItemInput = Readonly<{
  url: string;
  mediaType?: "image" | "video";
  caption?: string | null;
}>;

export type ApiCreateEventInput = Readonly<{
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  venueId?: string | null;
  heroImageUrl?: string | null;
  publish?: boolean;
  currency?: string;
  approvalMode?: "auto" | "manual";
  sharingEnabled?: boolean;
  policies?: ApiCustomPolicy[];
  ticketTiers?: ApiTicketTierInput[];
  tagIds?: string[];
  galleryItems?: ApiGalleryItemInput[];
}>;

// ── Venues (81–89) ─────────────────────────────────────────────────────────

export type ApiAdminVenue = Readonly<{
  id: string;
  name: string;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  countryCode: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  venueType: string | null;
  timezone: string | null;
  capacity: number | null;
  organizerId: string | null;
  description: string | null;
  freeAccess: boolean;
  freeForLadies: boolean;
  coverImageUrl: string | null;
  createdAt: string;
}>;

export type ApiVenueSelectItem = Readonly<{
  id: string;
  name: string;
  city: string | null;
}>;

export type ApiVenueStats = Readonly<{
  eventCount: number;
  totalAttendees: number;
  reviewScore: number | null;
  reviewCount: number;
  followerCount: number;
}>;

export type ApiVenueEventItem = Readonly<{
  id: string;
  title: string;
  heroImageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  status: string;
  attendeeCount: number;
  minPriceCents: number;
  isFree: boolean;
  currency: string;
}>;

export type ApiVenueEvents = Readonly<{
  live: ApiVenueEventItem[];
  upcoming: ApiVenueEventItem[];
  past: ApiVenueEventItem[];
  all: ApiVenueEventItem[];
}>;

export type ApiSimilarVenue = Readonly<{
  id: string;
  name: string;
  city: string | null;
  venueType: string | null;
  capacity: number | null;
}>;

export type ApiReviewStats = Readonly<{
  count: number;
  average: number;
  distribution: Readonly<Record<"1" | "2" | "3" | "4" | "5", number>>;
}>;

export type ApiVenueReview = Readonly<{
  id: string;
  venueId: string;
  userName: string;
  userAvatarUrl: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  adminLiked: boolean;
  adminReply: string | null;
  adminReplyAt: string | null;
}>;

// ── Orders & attendees (90–94) ─────────────────────────────────────────────

export type ApiOrderBilling = Readonly<{
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}>;

export type ApiOrderListItem = Readonly<{
  id: string;
  eventId: string;
  eventTitle: string;
  status: string;
  billing: ApiOrderBilling;
  totalAmountCents: number;
  currency: string;
  orderedAt: string;
  items: ReadonlyArray<
    Readonly<{
      ticketTypeName: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
    }>
  >;
}>;

export type ApiOrderDetail = Readonly<{
  id: string;
  eventId: string;
  eventTitle: string;
  status: string;
  currency: string;
  subtotalCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalAmountCents: number;
  orderedAt: string;
  updatedAt: string | null;
  billing: ApiOrderBilling;
  items: ReadonlyArray<
    Readonly<{
      id: string;
      ticketTypeName: string;
      quantity: number;
      unitPriceCents: number;
      currency: string;
      lineTotalCents: number;
      benefits: string[];
    }>
  >;
}>;

export type ApiAttendee = Readonly<{
  reservationId: string;
  name: string | null;
  email: string | null;
  eventId: string;
  eventTitle: string;
  checkedInAt: string | null;
  ticketSummary: string | null;
}>;

export type ApiCheckinSummaryItem = Readonly<{
  eventId: string;
  eventTitle: string;
  totalReservations: number;
  checkedIn: number;
  cancelled: number;
}>;

// ── Finance (95–101) ───────────────────────────────────────────────────────

export type ApiTransaction = Readonly<{
  id: string;
  eventId: string;
  eventTitle: string;
  grossCents: number;
  platformFeeCents: number;
  netCents: number;
  currency: string;
  status: "completed" | "pending" | "failed";
  provider: string;
  orderedAt: string;
}>;

export type ApiTransactionStats = Readonly<{
  transactionCount: number;
  totalGrossCents: number;
  totalFeesCents: number;
  totalNetCents: number;
  currency: string;
}>;

export type ApiTransactionsResponse = Readonly<{
  items: ApiTransaction[];
  stats: ApiTransactionStats;
}>;

export type ApiPayout = Readonly<{
  id: string;
  organizerId: string;
  amountCents: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  provider: string;
  scheduledAt: string | null;
  completedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}>;

export type ApiFinancePaymentMethod = Readonly<{
  id: string;
  organizerId: string;
  methodType: "payment" | "withdrawal";
  provider: string;
  providerAccountId: string | null;
  label: string | null;
  isDefault: boolean;
  details: Record<string, unknown>;
  createdAt: string;
}>;

// ── Review moderation (102–107) ────────────────────────────────────────────

export type ApiAdminReview = Readonly<{
  id: string;
  eventId: string;
  eventTitle: string;
  userName: string;
  userAvatarUrl: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  adminLiked: boolean;
  adminReply: string | null;
  adminReplyAt: string | null;
}>;

export type ApiLikeToggleResult = Readonly<{ id: string; adminLiked: boolean }>;

export type ApiReplyResult = Readonly<{
  id: string;
  adminReply: string | null;
  adminReplyAt: string | null;
}>;

// ── Music (108) ────────────────────────────────────────────────────────────

export type ApiSongSuggestion = Readonly<{
  id: string;
  eventId: string;
  eventTitle: string;
  trackTitle: string;
  artistName: string;
  albumTitle: string | null;
  artworkUrl: string | null;
  deezerLink: string | null;
  createdAt: string;
}>;

// ── Team (109–113) ─────────────────────────────────────────────────────────

export type ApiTeamMember = Readonly<{
  memberId: string;
  userId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: AdminRole;
  joinedAt: string;
}>;

export type ApiUserMatch = Readonly<{
  userId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
}>;

// ── Dashboard overview (114) ───────────────────────────────────────────────

export type ApiOverview = Readonly<{
  stats: Readonly<{
    totalEvents: number;
    totalAttendees: number;
    totalTickets: number;
    avgRating: number;
    totalRevenueCents: number;
    currency: string;
  }>;
  recentEvents: ApiAdminEvent[];
}>;

// ── Uploads (115) ──────────────────────────────────────────────────────────

export type ApiUploadKind = "eventHero" | "eventGallery" | "organizerImage";

export type ApiUploadResult = Readonly<{
  url: string;
  mediaType: "image" | "video";
}>;

// ── Public discover (116–127) ──────────────────────────────────────────────

export type ApiPublicEventCard = Readonly<{
  id: string;
  title: string;
  description: string | null;
  heroImageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  venueName: string | null;
  venueCity: string | null;
  organizerName: string | null;
  currency: string;
  minPriceCents: number;
  isFree: boolean;
  attendeeCount: number;
  tags: string[];
  partyTypes: string[];
  musicStyles: string[];
  extraServices: string[];
}>;

export type ApiPublicTicketType = Readonly<{
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  capacity: number | null;
}>;

export type ApiPublicOrganizer = Readonly<{
  id: string;
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  about: string | null;
  coverImageUrl: string | null;
  city: string | null;
  countryCode: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  facebookHandle: string | null;
  tiktokHandle?: string | null;
  snapchatHandle?: string | null;
  specialties: string[] | null;
}>;

export type ApiPublicVenue = Readonly<{
  id: string;
  name: string;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  countryCode: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  venueType: string | null;
  timezone: string | null;
  capacity: number | null;
  organizerId: string | null;
  description: string | null;
  freeAccess: boolean;
  freeForLadies: boolean;
  coverImageUrl: string | null;
}>;

export type ApiPublicEventDetail = Readonly<{
  event: ApiPublicEventCard;
  ticketTypes: ApiPublicTicketType[];
  organizer: ApiPublicOrganizer | null;
  venue: Readonly<{
    id: string;
    name: string;
    city: string | null;
    addressLine1: string | null;
    region: string | null;
    countryCode: string | null;
    timezone: string | null;
    venueType: string | null;
    lat: number | null;
    lng: number | null;
  }> | null;
}>;

export type ApiPublicVenueDetail = Readonly<{
  venue: ApiPublicVenue;
  organizer: ApiPublicOrganizer | null;
}>;

export type ApiCityInfo = Readonly<{
  city: string;
  eventCount: number;
  venueCount: number;
}>;

/** Generic `{ items: [...] }` envelope used by every Phase 3 list route. */
export type ApiItems<T> = Readonly<{ items: T[] }>;
