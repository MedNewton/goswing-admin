/**
 * View-model types consumed by UI components.
 *
 * These are intentionally separate from database row types
 * (see database.ts). Domain mappers convert DB rows -> view models.
 */

// Re-export database types for convenience
export type {
  Database,
  Row,
  Insert,
  Update,
  TableName,
} from "./database";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export interface Event {
  id: string;
  title: string;
  description?: string;
  image: string;
  date: string;             // formatted start date
  startsAt?: string;        // ISO (optional until pages wired)
  endsAt?: string;          // ISO
  location: string;         // venue name + city
  venue?: string;
  capacity?: number;
  attendeeCount: number;
  status: "published" | "draft" | "completed" | "cancelled";
  category?: string;
  ticketsSold?: number;
  revenue?: number;         // formatted / display value
  currency?: string;
  minPrice?: string;        // formatted
  isFree?: boolean;
  organizerId?: string;
  organizerName?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------
export interface Venue {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  region: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  venueType: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Attendees
// ---------------------------------------------------------------------------
export interface Attendee {
  id: string;
  name: string;
  email: string;
  eventId: string;
  eventName: string;
  checkedIn: boolean;
  checkInTime?: string;
  ticketType?: string;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export interface Order {
  id: string;
  eventId: string;
  eventName: string;
  customerName: string;
  customerEmail?: string;
  offerType: string;        // ticket type name snapshot
  amount: number;           // total in cents
  amountFormatted?: string; // e.g. "$45.00"
  currency?: string;
  status: "confirmed" | "pending" | "cancelled" | "draft" | "expired" | "refunded" | "checkedIn";
  date: string;             // formatted ordered_at
  orderedAt?: string;       // ISO
  itemCount?: number;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export interface Review {
  id: string;
  eventId?: string;
  eventName?: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
}

// ---------------------------------------------------------------------------
// Songs / Music
// ---------------------------------------------------------------------------
export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  deezerLink?: string;
  likes: number;
  plays?: number;
  genre?: string;
  eventId?: string;
  eventName?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songCount: number;
  eventName?: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Marketing (static / non-MVP)
// ---------------------------------------------------------------------------
export interface Campaign {
  id: string;
  name: string;
  type: "email" | "social" | "paid";
  status: "active" | "paused" | "completed";
  reach: number;
  clicks: number;
  conversions: number;
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------
export interface Transaction {
  id: string;
  eventId: string;
  eventName: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  grossFormatted: string;
  feeFormatted: string;
  netFormatted: string;
  currency: string;
  date: string;
  orderedAt?: string;       // ISO timestamp for precise date operations
  status: "completed" | "pending" | "failed";
  provider: string;
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------
export interface Stats {
  totalEvents: number;
  totalAttendees: number;
  totalTickets: number;
  avgRating: number;
  pageViews?: number;
  formBookings?: number;
  conversionRate?: number;
  totalRevenue?: number;
  totalRevenueFormatted?: string;
}
