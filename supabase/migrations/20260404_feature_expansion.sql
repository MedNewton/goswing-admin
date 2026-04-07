-- ============================================================
-- GoSwing Admin — Feature Expansion Migration
-- Run in Supabase SQL Editor
-- Date: 2026-04-04
-- ============================================================

BEGIN;

-- ============================================================
-- 1. event_reviews — admin interaction (like + reply)
-- ============================================================
ALTER TABLE public.event_reviews
  ADD COLUMN IF NOT EXISTS admin_liked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS admin_reply_at timestamp with time zone;

COMMENT ON COLUMN public.event_reviews.admin_liked IS 'Organizer liked this review';
COMMENT ON COLUMN public.event_reviews.admin_reply IS 'Organizer reply text';
COMMENT ON COLUMN public.event_reviews.admin_reply_at IS 'When organizer replied';

-- ============================================================
-- 2. venues — description, free access settings
-- ============================================================
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS free_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_for_ladies boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.venues.free_access IS 'Venue has free entry';
COMMENT ON COLUMN public.venues.free_for_ladies IS 'Free entry applies only to ladies (when free_access = true)';

-- ============================================================
-- 3. organizers — custom policies (beyond cancellation/refund)
-- ============================================================
ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS custom_policies jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.organizers.custom_policies IS 'Array of {title, description} objects — additional venue policies';

-- ============================================================
-- 4. NEW TABLE: venue_reviews — reviews for the venue itself
--    (separate from event_reviews which are per-event)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.venue_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL,
  clerk_user_id text NOT NULL DEFAULT (auth.jwt() ->> 'sub'::text),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  admin_liked boolean NOT NULL DEFAULT false,
  admin_reply text,
  admin_reply_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT venue_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT venue_reviews_venue_id_fkey FOREIGN KEY (venue_id)
    REFERENCES public.venues(id) ON DELETE CASCADE,
  CONSTRAINT venue_reviews_clerk_user_id_fkey FOREIGN KEY (clerk_user_id)
    REFERENCES public.profiles(user_id)
);

-- ============================================================
-- 5. NEW TABLE: payouts — payout tracking for organizers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  amount_cents integer NOT NULL,
  currency character NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  provider text NOT NULL DEFAULT 'stripe',
  provider_payout_id text,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payouts_pkey PRIMARY KEY (id),
  CONSTRAINT payouts_organizer_id_fkey FOREIGN KEY (organizer_id)
    REFERENCES public.organizers(id) ON DELETE CASCADE,
  CONSTRAINT payouts_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

COMMENT ON COLUMN public.payouts.status IS 'pending, processing, completed, failed';

-- ============================================================
-- 6. NEW TABLE: organizer_payment_methods — payment & withdrawal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizer_payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL,
  method_type text NOT NULL,
  provider text NOT NULL DEFAULT 'stripe',
  provider_account_id text,
  label text,
  is_default boolean NOT NULL DEFAULT false,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organizer_payment_methods_pkey PRIMARY KEY (id),
  CONSTRAINT organizer_payment_methods_organizer_id_fkey FOREIGN KEY (organizer_id)
    REFERENCES public.organizers(id) ON DELETE CASCADE,
  CONSTRAINT organizer_payment_methods_type_check CHECK (method_type IN ('payment', 'withdrawal'))
);

COMMENT ON COLUMN public.organizer_payment_methods.method_type IS 'payment or withdrawal';
COMMENT ON COLUMN public.organizer_payment_methods.details IS 'Provider-specific details (bank name, last4, etc.)';

-- ============================================================
-- 7. RLS POLICIES for new tables
-- ============================================================

-- venue_reviews
ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read venue reviews"
  ON public.venue_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create venue reviews"
  ON public.venue_reviews
  FOR INSERT
  WITH CHECK (clerk_user_id = requesting_user_id());

CREATE POLICY "Venue owners can update reviews (like/reply)"
  ON public.venue_reviews
  FOR UPDATE
  USING (
    venue_id IN (
      SELECT v.id FROM public.venues v
      JOIN public.organizers o ON o.id = v.organizer_id
      WHERE o.owner_user_id = requesting_user_id()
    )
  );

-- payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer owners can read their payouts"
  ON public.payouts
  FOR SELECT
  USING (
    organizer_id IN (
      SELECT id FROM public.organizers
      WHERE owner_user_id = requesting_user_id()
    )
  );

-- organizer_payment_methods
ALTER TABLE public.organizer_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer owners can manage their payment methods"
  ON public.organizer_payment_methods
  FOR ALL
  USING (
    organizer_id IN (
      SELECT id FROM public.organizers
      WHERE owner_user_id = requesting_user_id()
    )
  )
  WITH CHECK (
    organizer_id IN (
      SELECT id FROM public.organizers
      WHERE owner_user_id = requesting_user_id()
    )
  );

-- ============================================================
-- 8. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_venue_reviews_venue
  ON public.venue_reviews (venue_id);

CREATE INDEX IF NOT EXISTS idx_venue_reviews_user
  ON public.venue_reviews (clerk_user_id);

CREATE INDEX IF NOT EXISTS idx_payouts_organizer
  ON public.payouts (organizer_id);

CREATE INDEX IF NOT EXISTS idx_payouts_status
  ON public.payouts (status);

CREATE INDEX IF NOT EXISTS idx_organizer_payment_methods_organizer
  ON public.organizer_payment_methods (organizer_id);

CREATE INDEX IF NOT EXISTS idx_event_reviews_admin_liked
  ON public.event_reviews (admin_liked) WHERE admin_liked = true;

COMMIT;
