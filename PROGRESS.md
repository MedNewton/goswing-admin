# MVP Implementation Progress

## Task 6: Fix All Chart Components
- [x] 6.1 Fix BarChart — uses `data` prop, shows empty state, hover values, configurable color
- [x] 6.2 Fix LineChart — SVG polyline, data-driven, grid lines, hover tooltips
- [x] 6.3 Fix AreaChart — SVG path + gradient fill, data-driven, unique gradient IDs

## Task 4: Finance BarChart + Exports
- [x] 4.1 Compute monthly revenue data from transactions
- [x] 4.2 Wire BarChart with real monthly data + formatMoney
- [x] 4.3 Wire Export Statement (CSV of all transactions)
- [x] 4.4 Wire Tax Report (CSV grouped by month with totals)
- [x] 4.5 Create reusable CSV utility (`src/lib/utils/csv.ts`)

## Task 1: Orders Page Filters & Search
- [x] 1.1 Create `OrdersPageClient` component
- [x] 1.2 Wire SearchBar (search by ID, event, customer, email)
- [x] 1.3 Wire sort toggle (Newest/Oldest first)
- [x] 1.4 Wire status filter dropdown (All/Confirmed/Pending/Cancelled/Expired/Refunded)
- [x] 1.5 Wire Export button (CSV with all order columns)

## Task 2: Attendees Page Search & Buttons
- [x] 2.1 Create `AttendeesPageClient` component
- [x] 2.2 Wire SearchBar (search by name, email, event)
- [x] 2.3 Wire "View Details" button → links to `/events/[eventId]`
- [x] 2.4 Wire Export button (CSV: Name, Email, Event, Ticket Type, Checked In, Check-in Time)
- [x] 2.5 Differentiate stat card icons (CalendarIcon for Events)

## Task 3: Reviews Page Sort & Buttons
- [x] 3.1 Create `ReviewsPageClient` component
- [x] 3.2 Wire sort dropdown (Most Recent, Highest Rated, Lowest Rated)
- [x] 3.3 Wire Export Reviews button (CSV)
- [x] 3.4 Clean up ReviewCard — removed dead Helpful/Reply buttons, kept display-only helpful count

## Task 8: Venues Page Search
- [x] 8.1 Create `VenuesPageClient` component
- [x] 8.2 Wire SearchBar (search by name, address, city, region, type)

## Task 7: Wire Decorative Buttons
- [x] 7.1 SongListItem — show artwork image (fallback to icon), add "Listen" link to Deezer
- [x] 7.2 Music page — removed dead "Add Playlist" button (no DB schema)
- [x] 7.3 Event detail — removed dead "View Profile" organizer button
- [x] 7.4 Event detail — real Google Maps embed when lat/lng available
- [x] 7.5 Music page — pass artworkUrl, deezerLink, eventName to SongListItem

## Task 5: Event Edit Flow
- [x] 5.1 Create Edit Event page (`/events/[id]/edit`)
- [x] 5.2 Create `updateEventAction` server action (Zod validation, update event + replace ticket types)
- [x] 5.3 Create `deleteEventAction` server action
- [x] 5.4 Create `fetchEventForEdit` server action (returns raw venue_id for dropdown)
- [x] 5.5 Wire "Edit Event" button on detail page → links to `/events/[id]/edit`
- [x] 5.6 Add delete event with confirmation dialog

## Task 9: Organizer Onboarding Flow
- [x] 9.1 Modify `provisionUser()` to return `{ needsOnboarding: boolean }` (checks if organizer city is NULL)
- [x] 9.2 Update `/api/provision/me` to return `needsOnboarding` in response
- [x] 9.3 Update `SupabaseClerkBridge` to redirect to `/onboarding` when `needsOnboarding` is true
- [x] 9.4 Create `src/lib/actions/organizer.ts` — server actions: `completeOnboardingAction`, `getOnboardingStatus`, `fetchOrganizerForOnboarding`
- [x] 9.5 Create `/onboarding` page — standalone form (no sidebar) with org name, tagline, about, city, country, email, phone, website, socials
- [x] 9.6 Onboarding page checks status on mount — redirects to `/` if already completed

## Build Status
- TypeScript: 0 errors (`npx tsc --noEmit` passes cleanly)
- ESLint: Pre-existing lint warnings in venue files, create page, etc. (same as before changes)
- Build: Pre-existing ESLint-as-errors prevent `next build` (same before & after — no new errors introduced)

## Files Created
| File | Purpose |
|---|---|
| `src/components/orders/OrdersPageClient.tsx` | Client component for orders filtering/search/export |
| `src/components/attendees/AttendeesPageClient.tsx` | Client component for attendees search/export |
| `src/components/reviews/ReviewsPageClient.tsx` | Client component for reviews sorting/export |
| `src/components/finance/FinancePageClient.tsx` | Client component for finance chart/exports |
| `src/components/venues/VenuesPageClient.tsx` | Client component for venues search |
| `src/lib/utils/csv.ts` | Reusable CSV generation + download utility |
| `src/app/events/[id]/edit/page.tsx` | Edit event page with full form |
| `src/app/onboarding/page.tsx` | Organizer onboarding form (standalone, no sidebar) |
| `src/lib/actions/organizer.ts` | Server actions for onboarding (complete, status check, fetch) |

## Files Modified
- `src/components/charts/BarChart.tsx` — Rewrote to use data prop
- `src/components/charts/LineChart.tsx` — Rewrote with SVG polyline
- `src/components/charts/AreaChart.tsx` — Rewrote with dynamic SVG path
- `src/app/orders/page.tsx` — Slimmed to server fetch + client component
- `src/app/attendees/page.tsx` — Slimmed to server fetch + client component
- `src/app/reviews/page.tsx` — Slimmed to server fetch + client component
- `src/app/finance/page.tsx` — Slimmed to server fetch + client component
- `src/app/venues/page.tsx` — Slimmed to server fetch + client component
- `src/app/music/page.tsx` — Removed dead button, pass new props to SongListItem
- `src/app/events/[id]/page.tsx` — Wired Edit button link, real map embed, removed dead button
- `src/components/songs/SongListItem.tsx` — Artwork image, Deezer link, removed dead like/play
- `src/components/reviews/ReviewCard.tsx` — Removed dead Helpful/Reply buttons
- `src/lib/data/events.ts` — Added lat/lng to venue query
- `src/lib/actions/events.ts` — Added updateEventAction, deleteEventAction, fetchEventForEdit
- `src/lib/provisioning/userProvisioning.ts` — Returns `{ needsOnboarding }` based on organizer city
- `src/app/api/provision/me/route.ts` — Passes `needsOnboarding` in JSON response
- `src/lib/SupabaseClerkBridge.tsx` — Reads provision response, redirects to `/onboarding` if needed
