# GoSwing Admin -> Supabase Functionalization Plan

## Objective
Make the current static Next.js admin dashboard fully functional against the Supabase database defined in `public/context/schema.md` (generated at `2026-02-07T17:37:41.940613+00:00`), with secure auth, RLS-compatible data access, CRUD flows, and production-ready UX states.

## Re-evaluation Summary
- UI is complete but fully mock-driven (`src/app/**/page.tsx` hardcoded arrays/objects).
- No Supabase integration exists yet (no `@supabase/*` dependencies, no clients, no queries/mutations).
- `.env` now contains required base keys (Clerk + Supabase URL/key).
- Schema is mature and RLS-heavy. Core app tables exist (`events`, `reservations`, `tickets`, `ticket_types`, `event_reviews`, `event_song_suggestions`, `payments`, etc.).
- Critical auth detail: `public.requesting_user_id()` reads JWT claims `clerk_user_id` or `user_id` (not `sub`).
- Important access gap: organizer-facing dashboard pages (orders/attendees/finance) need creator-level read policies for buyer-owned tables.

## Architecture Decisions (to implement)
1. Keep **App Router** and build a typed Supabase data layer (server-first reads, client mutations).
2. Use **Clerk auth + Supabase JWT template** so RLS policies using `requesting_user_id()` work without rewriting every policy.
3. Keep RLS as primary authorization; avoid exposing service role in browser.
4. Add additive SQL migrations for missing organizer read access and check-ins policies.
5. Convert each page to real async state: loading, error, empty, success.

## Phase 0: Foundation and Guardrails
### Tasks
1. Install dependencies.
- `@supabase/supabase-js`
- `@supabase/ssr`
- `@clerk/nextjs` (if not already installed)
- `react-hook-form` + `@hookform/resolvers` (form UX)

2. Normalize env contract in `src/env.js`.
- Add required variables for Supabase + Clerk.
- Support current key names in `.env` and map to canonical internal names.

3. Add `.env.example` placeholders for all required vars.

### Deliverables
- Build succeeds with strict env validation.
- No secrets logged in client/server output.

## Phase 1: Supabase + Auth Wiring
### Tasks
1. Create typed Supabase clients.
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/middleware.ts` (if route protection needed)

2. Configure Clerk provider in App Router layout.
- Wrap app with Clerk provider.
- Add signed-in guard for admin routes.

3. Configure Clerk -> Supabase JWT template.
- Template includes at minimum:
  - `role: "authenticated"`
  - `aud: "authenticated"`
  - `clerk_user_id: <clerk user id>`
- Ensure token is supplied to Supabase client requests.

4. Add auth diagnostics endpoint/page.
- Call `debug_auth_context()` once for verification during setup.

5. Add signup provisioning (Clerk -> Supabase).
- On every new user signup, create or upsert a row in `profiles` with `user_id = clerk user id`.
- On every new user signup, create a row in `organizers` and set `owner_user_id = clerk user id`.
- Enforce idempotency so retries do not create duplicates.
- Preferred trigger: Clerk webhook (`user.created`) handled by server route + Supabase service role.
- Add a fallback "self-heal on first login" upsert path for missing rows.
- Store minimal defaults for organizer (`name`, `owner_user_id`) then allow edits in UI.

### Deliverables
- Authenticated user can read/write rows gated by `requesting_user_id()` policies.
- Anonymous requests only see policy-allowed public data.
- Newly signed-up users are always provisioned in `profiles` and `organizers`.

## Phase 2: Type Safety and Domain Layer
### Tasks
1. Generate DB types from Supabase schema.
- `src/types/database.ts` (generated)

2. Add domain mappers (DB row -> UI model).
- `src/lib/mappers/events.ts`
- `src/lib/mappers/orders.ts`
- `src/lib/mappers/attendees.ts`
- `src/lib/mappers/reviews.ts`
- `src/lib/mappers/finance.ts`

3. Replace current ad-hoc UI types with schema-aligned models.
- Keep view models separate from DB rows.

4. Add formatting utilities.
- Money from cents + currency
- Date/time/timezone formatting
- Status normalization

### Deliverables
- No page consumes raw DB rows directly.
- All pages typecheck with strict TypeScript.

## Phase 3: RLS and SQL Migration Backlog (Critical)
### Why this phase is required
Current policies are user-owned for many commerce tables (`reservations`, `tickets`, `payments`). Organizer dashboard pages need access scoped by event ownership.

### Tasks
1. Add creator-scoped `SELECT` policies for organizer/admin dashboard flows.
- `reservations`: allow select where reservation event belongs to creator.
- `reservation_items`: allow select via reservation -> event owner.
- `tickets`: allow select via ticket event owner.
- `ticket_attendees` / `ticket_holders`: allow select via ticket event owner.
- `payments`: allow select via reservation event owner.

2. Add missing policies for `ticket_checkins` (currently no policies).
- Insert/select policy for authorized scanner role and/or event creator scope.

3. Keep existing user-owned policies intact (additive changes only).

4. Add indexes if query plans degrade after policy joins.

### Deliverables
- Organizer can view orders/attendees/finance for own events only.
- Buyers still only access their own private commerce records.

## Phase 4: Implement Data Modules (Queries + Mutations)
### Tasks
1. Events module.
- List events (creator + optional published)
- Event details with organizer, venue, ticket types, tags
- Create event + ticket tiers + event tags
- Update event status/details

2. Orders module.
- Reservations list with reservation items, totals, buyer identity snapshots
- Filters: date range, status, event

3. Attendees module.
- Ticket attendee list by event
- Check-ins feed and status
- Export shape for CSV

4. Reviews module.
- Aggregates (avg + distribution)
- Paginated reviews + filters

5. Music module.
- Read/write event song suggestions (`event_song_suggestions`)
- De-duplicate per unique constraint (`event_id`, `clerk_user_id`, `deezer_track_id`)

6. Finance module.
- Payments + reservation joins
- Gross/fees/net aggregations

7. Analytics module.
- Derived metrics from events/reservations/tickets/reviews/payments
- Time-bucketed series for charts

### Deliverables
- Every page backed by real Supabase data.
- All mutation paths return user-friendly errors.

## Phase 5: Page-by-Page Refactor Plan
1. `/` (Overview)
- Replace mock stats and recent events with live aggregates + latest events.

2. `/events`
- Server data fetch + search/filter/sort + pagination + URL query params.

3. `/events/[id]`
- Fetch real event, ticket types, organizer, reviews summary, related events.

4. `/events/create`
- Convert to controlled form (RHF + Zod).
- Submit transactional flow: create event -> ticket types -> tags.

5. `/orders`
- Real reservations table with status/date/event filters and pagination.

6. `/attendees`
- Event attendee counts, check-ins feed, and event drilldown.

7. `/reviews`
- Real review distribution and recent review list with sorting/filtering.

8. `/music`
- Bind cards/lists to `event_song_suggestions`; retain playlists as derived or mark as curated static until schema exists.

9. `/finance`
- Real payment transactions and financial KPIs.

10. `/analytics`
- Replace placeholder chart data with real timeseries and categorical data.

11. `/marketing`
- No direct campaigns table in current schema: either
- derive lightweight KPIs from events/favorites/follows, or
- explicitly scope page as non-MVP until marketing schema is added.

## Phase 6: Shared UI/UX Infrastructure
### Tasks
1. Add reusable async states.
- Skeletons
- Empty states
- Error states with retry action

2. Upgrade table primitives.
- Sortable headers
- Pagination controls
- Optional row actions

3. Improve form primitives.
- Field-level errors
- Disabled/loading submit buttons
- Toast/snackbar feedback

4. Improve accessibility and semantics.
- Replace passive icon buttons with labeled actions.
- Ensure keyboard navigation for filters/tables.

### Deliverables
- All data pages handle slow/failing network gracefully.

## Phase 7: Verification and Hardening
### Automated checks
1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`

### Functional checks
1. Signed-in user can CRUD own events.
2. Signed-in user sees only authorized orders/attendees/finance rows.
3. Anonymous access limited to public policies (`published` events, public venues, public reviews, etc.).
4. Create Event flow persists event + ticket tiers correctly.
5. Review/song suggestion uniqueness constraints handled gracefully.
6. Money/date rendering consistent across pages.

### Security checks
1. No service role key in client bundle.
2. Mutations use authenticated client with JWT.
3. RLS policy outcomes validated in-app.

## Execution Order (Recommended)
1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4 (events + orders + attendees first)
6. Phase 5 remaining pages
7. Phase 6
8. Phase 7

## MVP Cutline (when to call it functional)
Project is considered functional when these are live with real DB data and passing checks:
1. Overview
2. Events list/details/create
3. Orders
4. Attendees
5. Reviews
6. Finance

Analytics, Music enrichment, and Marketing can follow immediately after MVP if needed.
