// Core entity types based on UI designs

export interface Event {
  id: string;
  title: string;
  description?: string;
  image: string;
  date: string;
  location: string;
  venue?: string;
  capacity?: number;
  attendeeCount: number;
  status: "published" | "draft" | "completed" | "cancelled";
  category?: string;
  ticketsSold?: number;
  revenue?: number;
}

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

export interface Order {
  id: string;
  eventId: string;
  eventName: string;
  customerName: string;
  customerEmail?: string;
  offerType: string;
  amount: number;
  status: "confirmed" | "pending" | "cancelled";
  date: string;
}

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

export interface Song {
  id: string;
  title: string;
  artist: string;
  likes: number;
  plays?: number;
  genre?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songCount: number;
  eventName?: string;
  color: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: "email" | "social" | "paid";
  status: "active" | "paused" | "completed";
  reach: number;
  clicks: number;
  conversions: number;
}

export interface Transaction {
  id: string;
  eventId: string;
  eventName: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  date: string;
  status: "completed" | "pending";
}

export interface Stats {
  totalEvents: number;
  totalAttendees: number;
  totalTickets: number;
  avgRating: number;
  pageViews?: number;
  formBookings?: number;
  conversionRate?: number;
  totalRevenue?: number;
}
