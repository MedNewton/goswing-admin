-- ============================================================
-- GoSwing Admin — Establishment Enhancements Migration
-- Run in Supabase SQL Editor
-- Date: 2026-03-28
-- ============================================================

BEGIN;

-- ============================================================
-- 1. profiles — add occupation for onboarding
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS occupation text;

-- ============================================================
-- 2. organizers — add missing social account fields
-- ============================================================
ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS youtube_handle text,
  ADD COLUMN IF NOT EXISTS twitter_handle text,
  ADD COLUMN IF NOT EXISTS pinterest_handle text,
  ADD COLUMN IF NOT EXISTS snapchat_handle text,
  ADD COLUMN IF NOT EXISTS google_business_url text;

-- ============================================================
-- 3. organizer_gallery — support videos (media_type)
-- ============================================================
ALTER TABLE public.organizer_gallery
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';

COMMENT ON COLUMN public.organizer_gallery.media_type IS 'image or video';

-- ============================================================
-- 4. venues — postal_code, capacity, link to organizer (1:1)
-- ============================================================
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS organizer_id uuid;

-- Foreign key: venue belongs to one organizer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'venues_organizer_id_fkey'
      AND table_name = 'venues'
  ) THEN
    ALTER TABLE public.venues
      ADD CONSTRAINT venues_organizer_id_fkey
      FOREIGN KEY (organizer_id) REFERENCES public.organizers(id);
  END IF;
END $$;

-- Unique constraint: one venue per organizer (one establishment per account)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'venues_organizer_id_unique'
      AND table_name = 'venues'
  ) THEN
    ALTER TABLE public.venues
      ADD CONSTRAINT venues_organizer_id_unique UNIQUE (organizer_id);
  END IF;
END $$;

-- ============================================================
-- 5. events — waitlist, approval mode, sharing, policies
-- ============================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS sharing_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS policies jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.events.approval_mode IS 'auto or manual';
COMMENT ON COLUMN public.events.policies IS 'Array of {title, description} objects — e.g. dress code';

-- ============================================================
-- 6. ticket_types — free ticket & free-for-ladies support
-- ============================================================
ALTER TABLE public.ticket_types
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_for_ladies boolean NOT NULL DEFAULT false;

-- ============================================================
-- 7. NEW TABLE: organizer_tags — link establishments to tags
--    (category, party_type, music_style, extra_service)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizer_tags (
  organizer_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organizer_tags_pkey PRIMARY KEY (organizer_id, tag_id),
  CONSTRAINT organizer_tags_organizer_id_fkey FOREIGN KEY (organizer_id)
    REFERENCES public.organizers(id) ON DELETE CASCADE,
  CONSTRAINT organizer_tags_tag_id_fkey FOREIGN KEY (tag_id)
    REFERENCES public.tags(id) ON DELETE CASCADE
);

-- ============================================================
-- 8. NEW TABLE: event_gallery — images & videos per event
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  caption text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT event_gallery_pkey PRIMARY KEY (id),
  CONSTRAINT event_gallery_event_id_fkey FOREIGN KEY (event_id)
    REFERENCES public.events(id) ON DELETE CASCADE
);

COMMENT ON COLUMN public.event_gallery.media_type IS 'image or video';

-- ============================================================
-- 9. SEED: tags for categories, party types, music styles,
--    and extra services
-- ============================================================

-- Categories (venue/establishment types)
INSERT INTO public.tags (type, slug, label) VALUES
  ('category', 'nightclub',    'Nightclub'),
  ('category', 'bar',          'Bar'),
  ('category', 'lounge',       'Lounge'),
  ('category', 'restaurant',   'Restaurant'),
  ('category', 'beach-club',   'Beach Club'),
  ('category', 'rooftop',      'Rooftop'),
  ('category', 'pub',          'Pub'),
  ('category', 'concert-hall', 'Concert Hall'),
  ('category', 'event-space',  'Event Space'),
  ('category', 'hotel-venue',  'Hotel Venue')
ON CONFLICT DO NOTHING;

-- Party types
INSERT INTO public.tags (type, slug, label) VALUES
  ('party_type', 'dj-night',       'DJ Night'),
  ('party_type', 'ladies-night',   'Ladies Night'),
  ('party_type', 'pool-party',     'Pool Party'),
  ('party_type', 'live-music',     'Live Music'),
  ('party_type', 'theme-party',    'Theme Party'),
  ('party_type', 'karaoke-night',  'Karaoke Night'),
  ('party_type', 'brunch-party',   'Brunch Party'),
  ('party_type', 'after-party',    'After Party'),
  ('party_type', 'cocktail-night', 'Cocktail Night'),
  ('party_type', 'open-mic',       'Open Mic'),
  ('party_type', 'festival',       'Festival'),
  ('party_type', 'private-event',  'Private Event')
ON CONFLICT DO NOTHING;

-- Music styles
INSERT INTO public.tags (type, slug, label) VALUES
  ('music_style', 'hip-hop',     'Hip Hop'),
  ('music_style', 'edm',         'EDM'),
  ('music_style', 'techno',      'Techno'),
  ('music_style', 'house',       'House'),
  ('music_style', 'rnb',         'R&B'),
  ('music_style', 'latin',       'Latin'),
  ('music_style', 'afrobeats',   'Afrobeats'),
  ('music_style', 'pop',         'Pop'),
  ('music_style', 'reggaeton',   'Reggaeton'),
  ('music_style', 'jazz',        'Jazz'),
  ('music_style', 'rock',        'Rock'),
  ('music_style', 'dancehall',   'Dancehall'),
  ('music_style', 'amapiano',    'Amapiano'),
  ('music_style', 'disco',       'Disco'),
  ('music_style', 'drum-n-bass', 'Drum & Bass'),
  ('music_style', 'funk',        'Funk')
ON CONFLICT DO NOTHING;

-- Extra services
INSERT INTO public.tags (type, slug, label) VALUES
  ('extra_service', 'vip-section',      'VIP Section'),
  ('extra_service', 'bottle-service',   'Bottle Service'),
  ('extra_service', 'valet-parking',    'Valet Parking'),
  ('extra_service', 'coat-check',       'Coat Check'),
  ('extra_service', 'photography',      'Photography'),
  ('extra_service', 'private-rooms',    'Private Rooms'),
  ('extra_service', 'food-service',     'Food Service'),
  ('extra_service', 'hookah',           'Hookah'),
  ('extra_service', 'dj-booth-rental',  'DJ Booth Rental'),
  ('extra_service', 'event-decoration', 'Event Decoration')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. RLS POLICIES for new tables
-- ============================================================

-- organizer_tags: same pattern as event_tags
ALTER TABLE public.organizer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer owners can manage their tags"
  ON public.organizer_tags
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

CREATE POLICY "Anyone can read organizer tags"
  ON public.organizer_tags
  FOR SELECT
  USING (true);

-- event_gallery: same pattern as events
ALTER TABLE public.event_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event creators can manage gallery"
  ON public.event_gallery
  FOR ALL
  USING (
    event_id IN (
      SELECT id FROM public.events
      WHERE created_by_user_id = requesting_user_id()
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT id FROM public.events
      WHERE created_by_user_id = requesting_user_id()
    )
  );

CREATE POLICY "Anyone can read event gallery"
  ON public.event_gallery
  FOR SELECT
  USING (true);

-- ============================================================
-- 11. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_organizer_tags_organizer
  ON public.organizer_tags (organizer_id);

CREATE INDEX IF NOT EXISTS idx_organizer_tags_tag
  ON public.organizer_tags (tag_id);

CREATE INDEX IF NOT EXISTS idx_event_gallery_event
  ON public.event_gallery (event_id);

CREATE INDEX IF NOT EXISTS idx_venues_organizer
  ON public.venues (organizer_id);

COMMIT;
