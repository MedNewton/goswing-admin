-- ============================================================================
-- Phase 3: Additive RLS policies for organizer-scoped dashboard reads.
--
-- These policies allow event creators (organizers) to SELECT buyer-owned
-- commerce rows for events they own.  Existing user-owned policies are
-- NOT modified — this is additive only.
--
-- Run in the Supabase SQL editor or via `supabase db push`.
-- ============================================================================

-- Helper: check if a policy already exists before creating it.
-- (Supabase doesn't support CREATE POLICY IF NOT EXISTS natively.)

-- -------------------------------------------------------------------------
-- reservations: organizer can read reservations for their events
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'reservations_creator_read' AND tablename = 'reservations'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY reservations_creator_read ON public.reservations
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = reservations.event_id
              AND e.created_by_user_id = requesting_user_id()
          )
        )
    $pol$;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- reservation_items: organizer can read items via reservation -> event
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'reservation_items_creator_read' AND tablename = 'reservation_items'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY reservation_items_creator_read ON public.reservation_items
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.reservations r
              JOIN public.events e ON e.id = r.event_id
            WHERE r.id = reservation_items.reservation_id
              AND e.created_by_user_id = requesting_user_id()
          )
        )
    $pol$;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- tickets: organizer can read tickets for their events
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tickets_creator_read' AND tablename = 'tickets'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY tickets_creator_read ON public.tickets
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = tickets.event_id
              AND e.created_by_user_id = requesting_user_id()
          )
        )
    $pol$;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- ticket_attendees: organizer can read via ticket -> event
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ticket_attendees_creator_read' AND tablename = 'ticket_attendees'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY ticket_attendees_creator_read ON public.ticket_attendees
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.tickets t
              JOIN public.events e ON e.id = t.event_id
            WHERE t.id = ticket_attendees.ticket_id
              AND e.created_by_user_id = requesting_user_id()
          )
        )
    $pol$;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- ticket_holders: organizer can read via ticket -> event
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ticket_holders_creator_read' AND tablename = 'ticket_holders'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY ticket_holders_creator_read ON public.ticket_holders
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.tickets t
              JOIN public.events e ON e.id = t.event_id
            WHERE t.id = ticket_holders.ticket_id
              AND e.created_by_user_id = requesting_user_id()
          )
        )
    $pol$;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- ticket_checkins: organizer can read + insert for their events
-- (Currently has NO policies at all.)
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ticket_checkins_creator_read' AND tablename = 'ticket_checkins'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY ticket_checkins_creator_read ON public.ticket_checkins
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.tickets t
              JOIN public.events e ON e.id = t.event_id
            WHERE t.id = ticket_checkins.ticket_id
              AND e.created_by_user_id = requesting_user_id()
          )
        )
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ticket_checkins_creator_insert' AND tablename = 'ticket_checkins'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY ticket_checkins_creator_insert ON public.ticket_checkins
        FOR INSERT TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.tickets t
              JOIN public.events e ON e.id = t.event_id
            WHERE t.id = ticket_checkins.ticket_id
              AND e.created_by_user_id = requesting_user_id()
          )
        )
    $pol$;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- payments: organizer can read payments via reservation -> event
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'payments_creator_read' AND tablename = 'payments'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY payments_creator_read ON public.payments
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.reservations r
              JOIN public.events e ON e.id = r.event_id
            WHERE r.id = payments.reservation_id
              AND e.created_by_user_id = requesting_user_id()
          )
        )
    $pol$;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- event_reviews: organizer can read reviews for their events
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'event_reviews_creator_read' AND tablename = 'event_reviews'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY event_reviews_creator_read ON public.event_reviews
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_reviews.event_id
              AND e.created_by_user_id = requesting_user_id()
          )
        )
    $pol$;
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- event_song_suggestions: organizer can read suggestions for their events
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'event_song_suggestions_creator_read' AND tablename = 'event_song_suggestions'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY event_song_suggestions_creator_read ON public.event_song_suggestions
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_song_suggestions.event_id
              AND e.created_by_user_id = requesting_user_id()
          )
        )
    $pol$;
  END IF;
END $$;
