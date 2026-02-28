/**
 * Supabase database types for GoSwing.
 *
 * Hand-written from public/context/schema.md (generated 2026-02-07).
 * Regenerate with `supabase gen types typescript` once the CLI is wired up.
 */

// ---------------------------------------------------------------------------
// Helper aliases
// ---------------------------------------------------------------------------
type Timestamp = string; // ISO-8601 timestamptz
type Json = Record<string, unknown>;
type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

// ---------------------------------------------------------------------------
// Database type map (Supabase convention)
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, ProfileInsert, ProfileUpdate>;
      organizers: TableDef<OrganizerRow, OrganizerInsert, OrganizerUpdate>;
      events: TableDef<EventRow, EventInsert, EventUpdate>;
      venues: TableDef<VenueRow, VenueInsert, VenueUpdate>;
      ticket_types: TableDef<TicketTypeRow, TicketTypeInsert, TicketTypeUpdate>;
      tickets: TableDef<TicketRow, TicketInsert, TicketUpdate>;
      ticket_attendees: TableDef<TicketAttendeeRow, TicketAttendeeInsert, TicketAttendeeUpdate>;
      ticket_holders: TableDef<TicketHolderRow, TicketHolderInsert, TicketHolderUpdate>;
      ticket_checkins: TableDef<TicketCheckinRow, TicketCheckinInsert, TicketCheckinUpdate>;
      reservations: TableDef<ReservationRow, ReservationInsert, ReservationUpdate>;
      reservation_items: TableDef<ReservationItemRow, ReservationItemInsert, ReservationItemUpdate>;
      payments: TableDef<PaymentRow, PaymentInsert, PaymentUpdate>;
      event_reviews: TableDef<EventReviewRow, EventReviewInsert, EventReviewUpdate>;
      event_song_suggestions: TableDef<EventSongSuggestionRow, EventSongSuggestionInsert, EventSongSuggestionUpdate>;
      tags: TableDef<TagRow, TagInsert, TagUpdate>;
      event_tags: TableDef<EventTagRow, EventTagInsert, EventTagUpdate>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------
export interface ProfileRow {
  user_id: string;
  display_name: string | null;
  initials: string | null;
  created_at: Timestamp;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  location: string | null;
  profile_visibility: "public" | "private";
  account_status: "active" | "deactivated" | "deleted";
  deactivated_at: Timestamp | null;
  deleted_at: Timestamp | null;
  updated_at: Timestamp;
}
export interface ProfileInsert {
  user_id: string;
  display_name?: string | null;
  initials?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  phone_verified?: boolean;
  location?: string | null;
  profile_visibility?: "public" | "private";
  account_status?: "active" | "deactivated" | "deleted";
  deactivated_at?: Timestamp | null;
  deleted_at?: Timestamp | null;
}
export interface ProfileUpdate {
  display_name?: string | null;
  initials?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  phone_verified?: boolean;
  location?: string | null;
  profile_visibility?: "public" | "private";
  account_status?: "active" | "deactivated" | "deleted";
  deactivated_at?: Timestamp | null;
  deleted_at?: Timestamp | null;
}

// ---------------------------------------------------------------------------
// organizers
// ---------------------------------------------------------------------------
export interface OrganizerRow {
  id: string;
  name: string;
  owner_user_id: string | null;
  created_at: Timestamp;
  tagline: string | null;
  about: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  established_year: number | null;
  is_verified: boolean | null;
  city: string | null;
  country_code: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  facebook_handle: string | null;
  specialties: string[] | null;
  cancellation_policy: string | null;
  refund_policy: string | null;
  response_time_hours: number | null;
  updated_at: Timestamp | null;
}
export interface OrganizerInsert {
  name: string;
  owner_user_id?: string | null;
  tagline?: string | null;
  about?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  established_year?: number | null;
  is_verified?: boolean | null;
  city?: string | null;
  country_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website_url?: string | null;
  instagram_handle?: string | null;
  facebook_handle?: string | null;
  specialties?: string[] | null;
  cancellation_policy?: string | null;
  refund_policy?: string | null;
  response_time_hours?: number | null;
}
export interface OrganizerUpdate {
  name?: string;
  tagline?: string | null;
  about?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  established_year?: number | null;
  is_verified?: boolean | null;
  city?: string | null;
  country_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website_url?: string | null;
  instagram_handle?: string | null;
  facebook_handle?: string | null;
  specialties?: string[] | null;
  cancellation_policy?: string | null;
  refund_policy?: string | null;
  response_time_hours?: number | null;
}

// ---------------------------------------------------------------------------
// venues
// ---------------------------------------------------------------------------
export interface VenueRow {
  id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  venue_type: string | null;
  created_by_user_id: string | null;
  created_at: Timestamp;
}
export interface VenueInsert {
  name: string;
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  lat?: number | null;
  lng?: number | null;
  timezone?: string | null;
  venue_type?: string | null;
  created_by_user_id?: string | null;
}
export interface VenueUpdate {
  name?: string;
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  country_code?: string | null;
  lat?: number | null;
  lng?: number | null;
  timezone?: string | null;
  venue_type?: string | null;
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------
export interface EventRow {
  id: string;
  external_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  organizer_id: string;
  venue_id: string | null;
  hero_image_url: string | null;
  starts_at: Timestamp;
  ends_at: Timestamp | null;
  status: string;
  currency: string;
  min_price_cents: number | null;
  is_free: boolean;
  attendee_count: number;
  created_by_user_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
export interface EventInsert {
  title: string;
  organizer_id: string;
  starts_at: Timestamp;
  description?: string | null;
  category?: string | null;
  external_id?: string | null;
  venue_id?: string | null;
  hero_image_url?: string | null;
  ends_at?: Timestamp | null;
  status?: string;
  currency?: string;
  min_price_cents?: number | null;
  is_free?: boolean;
  created_by_user_id?: string | null;
}
export interface EventUpdate {
  title?: string;
  description?: string | null;
  category?: string | null;
  organizer_id?: string;
  venue_id?: string | null;
  hero_image_url?: string | null;
  starts_at?: Timestamp;
  ends_at?: Timestamp | null;
  status?: string;
  currency?: string;
  min_price_cents?: number | null;
  is_free?: boolean;
}

// ---------------------------------------------------------------------------
// ticket_types
// ---------------------------------------------------------------------------
export interface TicketTypeRow {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  benefits: Json[];
  capacity: number | null;
  sales_start_at: Timestamp | null;
  sales_end_at: Timestamp | null;
  created_at: Timestamp;
}
export interface TicketTypeInsert {
  event_id: string;
  name: string;
  price_cents: number;
  currency: string;
  description?: string | null;
  benefits?: Json[];
  capacity?: number | null;
  sales_start_at?: Timestamp | null;
  sales_end_at?: Timestamp | null;
}
export interface TicketTypeUpdate {
  name?: string;
  description?: string | null;
  price_cents?: number;
  currency?: string;
  benefits?: Json[];
  capacity?: number | null;
  sales_start_at?: Timestamp | null;
  sales_end_at?: Timestamp | null;
}

// ---------------------------------------------------------------------------
// tickets
// ---------------------------------------------------------------------------
export interface TicketRow {
  id: string;
  reservation_id: string;
  reservation_item_id: string;
  event_id: string;
  ticket_type_id: string;
  ticket_no: number;
  status: string;
  issued_at: Timestamp | null;
  price_cents: number;
  currency: string;
  ticket_code: string | null;
  qr_secret_hash: string | null;
  qr_payload_version: number;
  ticket_type_name_snapshot: string;
  benefits_snapshot: Json[];
  created_at: Timestamp;
}
export interface TicketInsert {
  reservation_id: string;
  reservation_item_id: string;
  event_id: string;
  ticket_type_id: string;
  ticket_no: number;
  price_cents: number;
  currency: string;
  ticket_type_name_snapshot: string;
  status?: string;
  issued_at?: Timestamp | null;
  ticket_code?: string | null;
  qr_secret_hash?: string | null;
  qr_payload_version?: number;
  benefits_snapshot?: Json[];
}
export interface TicketUpdate {
  status?: string;
  issued_at?: Timestamp | null;
  ticket_code?: string | null;
  qr_secret_hash?: string | null;
}

// ---------------------------------------------------------------------------
// ticket_attendees
// ---------------------------------------------------------------------------
export interface TicketAttendeeRow {
  id: string;
  ticket_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  dietary_restrictions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: Timestamp;
}
export interface TicketAttendeeInsert {
  ticket_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  dietary_restrictions?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}
export interface TicketAttendeeUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  dietary_restrictions?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

// ---------------------------------------------------------------------------
// ticket_holders
// ---------------------------------------------------------------------------
export interface TicketHolderRow {
  id: string;
  reservation_id: string;
  ticket_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  dietary_restrictions: string | null;
  emergency_contact: string | null;
  created_at: Timestamp;
}
export interface TicketHolderInsert {
  reservation_id: string;
  ticket_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string | null;
  dietary_restrictions?: string | null;
  emergency_contact?: string | null;
}
export interface TicketHolderUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string | null;
  dietary_restrictions?: string | null;
  emergency_contact?: string | null;
}

// ---------------------------------------------------------------------------
// ticket_checkins
// ---------------------------------------------------------------------------
export interface TicketCheckinRow {
  id: string;
  ticket_id: string;
  scanned_at: Timestamp;
  scanner_user_id: string | null;
  location: string | null;
  result: string;
  reason: string | null;
}
export interface TicketCheckinInsert {
  ticket_id: string;
  result?: string;
  scanner_user_id?: string | null;
  location?: string | null;
  reason?: string | null;
}
export interface TicketCheckinUpdate {
  result?: string;
  reason?: string | null;
}

// ---------------------------------------------------------------------------
// reservations
// ---------------------------------------------------------------------------
export interface ReservationRow {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  ordered_at: Timestamp;
  expires_at: Timestamp | null;
  price_locked_at: Timestamp | null;
  currency: string;
  subtotal_cents: number;
  service_fees_cents: number;
  tax_cents: number;
  discount_cents: number;
  savings_cents: number;
  total_amount_cents: number;
  terms_accepted_at: Timestamp | null;
  terms_accepted_ip: string | null;
  billing_email: string | null;
  billing_first_name: string | null;
  billing_last_name: string | null;
  billing_zip: string | null;
  billing_country: string | null;
  payment_provider: string | null;
  payment_ref: string | null;
  metadata: Json;
  created_at: Timestamp;
  updated_at: Timestamp;
}
export interface ReservationInsert {
  event_id: string;
  currency: string;
  user_id?: string;
  status?: string;
  subtotal_cents?: number;
  service_fees_cents?: number;
  tax_cents?: number;
  discount_cents?: number;
  savings_cents?: number;
  total_amount_cents?: number;
  expires_at?: Timestamp | null;
  price_locked_at?: Timestamp | null;
  terms_accepted_at?: Timestamp | null;
  terms_accepted_ip?: string | null;
  billing_email?: string | null;
  billing_first_name?: string | null;
  billing_last_name?: string | null;
  billing_zip?: string | null;
  billing_country?: string | null;
  payment_provider?: string | null;
  payment_ref?: string | null;
  metadata?: Json;
}
export interface ReservationUpdate {
  status?: string;
  subtotal_cents?: number;
  service_fees_cents?: number;
  tax_cents?: number;
  discount_cents?: number;
  savings_cents?: number;
  total_amount_cents?: number;
  expires_at?: Timestamp | null;
  price_locked_at?: Timestamp | null;
  terms_accepted_at?: Timestamp | null;
  terms_accepted_ip?: string | null;
  billing_email?: string | null;
  billing_first_name?: string | null;
  billing_last_name?: string | null;
  billing_zip?: string | null;
  billing_country?: string | null;
  payment_provider?: string | null;
  payment_ref?: string | null;
  metadata?: Json;
}

// ---------------------------------------------------------------------------
// reservation_items
// ---------------------------------------------------------------------------
export interface ReservationItemRow {
  id: string;
  reservation_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price_cents: number;
  currency: string;
  line_total_cents: number;
  ticket_type_name_snapshot: string;
  benefits_snapshot: Json[];
  is_removed: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}
export interface ReservationItemInsert {
  reservation_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price_cents: number;
  currency: string;
  line_total_cents: number;
  ticket_type_name_snapshot: string;
  benefits_snapshot?: Json[];
  is_removed?: boolean;
}
export interface ReservationItemUpdate {
  quantity?: number;
  unit_price_cents?: number;
  line_total_cents?: number;
  is_removed?: boolean;
}

// ---------------------------------------------------------------------------
// payments
// ---------------------------------------------------------------------------
export interface PaymentRow {
  id: string;
  reservation_id: string;
  provider: string;
  provider_intent_id: string;
  status: string;
  amount_cents: number;
  currency: string;
  payment_method_type: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
export interface PaymentInsert {
  reservation_id: string;
  provider: string;
  provider_intent_id: string;
  status: string;
  amount_cents: number;
  currency: string;
  payment_method_type?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
}
export interface PaymentUpdate {
  status?: string;
  payment_method_type?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
}

// ---------------------------------------------------------------------------
// event_reviews
// ---------------------------------------------------------------------------
export interface EventReviewRow {
  id: string;
  event_id: string;
  reservation_id: string | null;
  clerk_user_id: string;
  rating: number;
  comment: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
export interface EventReviewInsert {
  event_id: string;
  rating: number;
  clerk_user_id?: string;
  reservation_id?: string | null;
  comment?: string | null;
}
export interface EventReviewUpdate {
  rating?: number;
  comment?: string | null;
}

// ---------------------------------------------------------------------------
// event_song_suggestions
// ---------------------------------------------------------------------------
export interface EventSongSuggestionRow {
  id: string;
  event_id: string;
  clerk_user_id: string;
  reservation_id: string | null;
  deezer_track_id: string;
  track_title: string;
  artist_name: string;
  deezer_artist_id: string | null;
  deezer_album_id: string | null;
  album_title: string | null;
  artwork_url: string | null;
  deezer_link: string | null;
  created_at: Timestamp;
}
export interface EventSongSuggestionInsert {
  event_id: string;
  deezer_track_id: string;
  track_title: string;
  artist_name: string;
  clerk_user_id?: string;
  reservation_id?: string | null;
  deezer_artist_id?: string | null;
  deezer_album_id?: string | null;
  album_title?: string | null;
  artwork_url?: string | null;
  deezer_link?: string | null;
}
export interface EventSongSuggestionUpdate {
  track_title?: string;
  artist_name?: string;
  album_title?: string | null;
  artwork_url?: string | null;
  deezer_link?: string | null;
}

// ---------------------------------------------------------------------------
// tags
// ---------------------------------------------------------------------------
export interface TagRow {
  id: string;
  type: string;
  slug: string;
  label: string;
  created_at: Timestamp;
}
export interface TagInsert {
  type: string;
  slug: string;
  label: string;
}
export interface TagUpdate {
  type?: string;
  slug?: string;
  label?: string;
}

// ---------------------------------------------------------------------------
// event_tags (junction)
// ---------------------------------------------------------------------------
export interface EventTagRow {
  event_id: string;
  tag_id: string;
  created_at: Timestamp;
}
export interface EventTagInsert {
  event_id: string;
  tag_id: string;
}
export type EventTagUpdate = never; // junction rows are only inserted/deleted

// ---------------------------------------------------------------------------
// Convenience row-type aliases
// ---------------------------------------------------------------------------
export type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T]["Row"];
export type Insert<T extends TableName> = Tables[T]["Insert"];
export type Update<T extends TableName> = Tables[T]["Update"];
