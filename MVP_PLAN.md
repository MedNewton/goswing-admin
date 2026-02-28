# MVP Completion Plan

> Legend: 🗄️ = Needs DB changes | 💻 = Code only (no DB changes)

---

## 1. Wire Orders Page Filters & Search
**💻 Code only**

### 1.1 Convert Orders page to client+server pattern
- The page is currently a server component with no interactivity
- Create `src/components/orders/OrdersPageClient.tsx` (client component)
- Move table rendering, search bar, and filters into it
- Server page fetches all orders, passes them as props

### 1.2 Wire SearchBar on Orders
- Add client state for search query
- Filter orders by: Order ID, event name, customer name (case-insensitive substring match)
- Filter is applied client-side on the already-fetched list

### 1.3 Wire "Newest first" sort toggle
- Toggle between ascending/descending by `orderedAt`
- Default: newest first (current behavior from DB)

### 1.4 Wire status filter
- Replace the "All time" button with a status dropdown: All, Confirmed, Pending, Cancelled, Expired, Refunded
- Filter client-side by `order.status`

### 1.5 Wire Export button
- Generate CSV from current filtered orders list
- Columns: Order ID, Event, Customer, Email, Offer Type, Amount, Status, Date
- Trigger browser download of the CSV file

**Files to modify:**
- `src/app/orders/page.tsx` — slim down to data fetch + pass to client component
- `src/components/orders/OrdersPageClient.tsx` — **new file**
- `src/lib/utils/csv.ts` — **new file** (reusable CSV export helper)

---

## 2. Wire Attendees Page Search, Filter & Buttons
**💻 Code only**

### 2.1 Convert Attendees page to client+server pattern
- Create `src/components/attendees/AttendeesPageClient.tsx` (client component)
- Server page fetches attendees + checkinSummary, passes as props

### 2.2 Add SearchBar
- Search across attendee name, email, event name
- Client-side filter

### 2.3 Wire "View Details" button
- Navigate to `/events/[eventId]` for the relevant event (detail already exists)

### 2.4 Wire Export button
- CSV export: Name, Email, Event, Ticket Type, Checked In, Check-in Time

**Files to modify:**
- `src/app/attendees/page.tsx` — slim down to data fetch
- `src/components/attendees/AttendeesPageClient.tsx` — **new file**
- `src/lib/utils/csv.ts` — reuse from task 1

---

## 3. Wire Reviews Page Sort & Buttons
**💻 Code only**

### 3.1 Convert Reviews page to client+server pattern
- Create `src/components/reviews/ReviewsPageClient.tsx` (client component)
- Server page fetches reviews + stats, passes as props

### 3.2 Wire sort dropdown
- Options: Most Recent (default), Highest Rated, Lowest Rated
- Sort the reviews array client-side by `date` (desc) or `rating` (asc/desc)

### 3.3 Wire Export Reviews button
- CSV export: Reviewer, Event, Rating, Comment, Date

### 3.4 Remove non-functional "Helpful" and "Reply" buttons
- These have no DB backing (no `helpful` column, no replies table)
- Remove them from `ReviewCard` to avoid dead UI — OR keep "Helpful" as display-only count if we want the UI shape, but remove the clickable `<button>` wrapper

**Files to modify:**
- `src/app/reviews/page.tsx` — slim down to data fetch
- `src/components/reviews/ReviewsPageClient.tsx` — **new file**
- `src/components/reviews/ReviewCard.tsx` — remove/disable dead buttons
- `src/lib/utils/csv.ts` — reuse

---

## 4. Fix Finance BarChart (Real Data)
**💻 Code only**

### 4.1 Compute monthly revenue data in Finance page
- Group transactions by month (from `date` field)
- Sum `grossAmount` per month for the last 6 months
- Pass as `data` prop to `BarChart`

### 4.2 Fix BarChart component to use real data
- Remove the hardcoded `data` array inside the component
- Use the `data` prop that's already in the interface but currently ignored
- Add empty state when no data

### 4.3 Wire Export Statement & Tax Report buttons
- Export Statement: CSV of all transactions (same columns as the table)
- Tax Report: CSV summary grouped by month with totals

**Files to modify:**
- `src/app/finance/page.tsx` — compute monthly data, pass to BarChart, wire exports
- `src/components/charts/BarChart.tsx` — use `data` prop instead of hardcoded values
- Convert finance page to client+server pattern (`src/components/finance/FinancePageClient.tsx` — **new file**)
- `src/lib/utils/csv.ts` — reuse

---

## 5. Event Edit Flow
**💻 Code only**

### 5.1 Create Edit Event page
- Create `src/app/events/[id]/edit/page.tsx`
- Reuse the same form structure as `events/create/page.tsx`
- Pre-populate all fields from existing event data (fetched via `getEvent(id)`)
- Fields: title, description, image, date/time, venue, ticket tiers, currency, status, contact info

### 5.2 Create `updateEventAction` server action
- Add to `src/lib/actions/events.ts`
- Zod validation (same schema as create, but `id` is required)
- Call `updateEvent()` from data layer
- Handle ticket type updates (upsert: update existing, insert new, delete removed)

### 5.3 Wire "Edit Event" button on event detail page
- Change the dead `<Button>` to a `<Link href={/events/${id}/edit}>`

### 5.4 Add delete event functionality
- Add a "Delete Event" button on the edit page (with confirmation)
- Create `deleteEventAction` server action
- Redirect to `/events` after deletion

**Files to modify:**
- `src/app/events/[id]/edit/page.tsx` — **new file**
- `src/app/events/[id]/page.tsx` — wire Edit button href
- `src/lib/actions/events.ts` — add `updateEventAction`, `deleteEventAction`

---

## 6. Fix All Chart Components
**💻 Code only**

### 6.1 Fix BarChart
- (Covered in task 4.2) Use `data` prop, remove hardcoded values
- Add Y-axis labels (formatted money values)
- Ensure proper responsive scaling

### 6.2 Fix LineChart
- Accept and render real `data` prop: `Array<{ label: string; value: number }>`
- Replace hardcoded heights with computed values from data
- Render actual connected line via SVG `<polyline>` or CSS
- Add axis labels

### 6.3 Fix AreaChart
- Accept `data` prop: `Array<{ label: string; value: number }>`
- Compute SVG path dynamically from data points
- Keep the gradient fill effect but make it data-driven
- Add axis labels

### 6.4 Ensure PieChart is consistent
- PieChart already works — no changes needed
- Just verify it handles edge cases (0 total, single item, etc.)

**Files to modify:**
- `src/components/charts/BarChart.tsx` — (from task 4)
- `src/components/charts/LineChart.tsx` — rewrite to use data prop
- `src/components/charts/AreaChart.tsx` — rewrite to use data prop

---

## 7. Wire Decorative Buttons Across Pages
**💻 Code only**

### 7.1 Music page — wire song artwork & Deezer link
- `SongListItem` already receives `title`/`artist` but the mapper has `artworkUrl` and `deezerLink`
- Pass `artworkUrl` and `deezerLink` to `SongListItem`
- Show artwork image instead of generic purple icon (fallback to icon if no artwork)
- Make the play button open `deezerLink` in a new tab (if available)
- Remove the like button (no DB backing) — OR make it display-only showing `0`

### 7.2 Music page — remove "Add Playlist" button
- No playlist schema exists in the DB
- Remove the button to avoid dead UI
- `PlaylistCard` component can remain for future use

### 7.3 Event detail page — wire "View Profile" organizer button
- Currently dead — link to a filtered events view: `/events?organizer={organizerId}`
- OR simply remove the button if organizer profiles aren't a feature

### 7.4 Event detail page — add real map
- Venue data already has `lat`/`lng` from Google Places
- Replace the gray "Map View" placeholder with a Google Maps iframe embed
- Same approach already used on `/venues/[id]` page — reuse that pattern

### 7.5 Attendees page — differentiate stat card icons
- Currently all 4 stat cards use `UsersIcon`
- Use distinct icons: UsersIcon (total), CheckIcon (checked in), ClockIcon (pending), CalendarIcon (events)

**Files to modify:**
- `src/components/songs/SongListItem.tsx` — add artwork, deezer link, remove like
- `src/app/music/page.tsx` — pass extra props to SongListItem
- `src/app/events/[id]/page.tsx` — wire map embed, fix organizer button
- `src/app/attendees/page.tsx` (or client component) — fix stat card icons
- `src/components/icons/index.tsx` — add CheckIcon, ClockIcon if missing

---

## 8. Wire Venues Page Search
**💻 Code only**

### 8.1 Convert Venues page to client+server pattern
- Create `src/components/venues/VenuesPageClient.tsx` (client component)
- Server page fetches venues, passes as props

### 8.2 Wire SearchBar
- Filter venues by name, address, city (case-insensitive substring match)
- Client-side filter on already-fetched data

**Files to modify:**
- `src/app/venues/page.tsx` — slim down to data fetch
- `src/components/venues/VenuesPageClient.tsx` — **new file**

---

## Execution Order (Recommended)

1. **Task 6** — Fix chart components (unblocks task 4)
2. **Task 4** — Finance BarChart + exports
3. **Task 1** — Orders page filters
4. **Task 2** — Attendees page search/filter
5. **Task 3** — Reviews page sort
6. **Task 8** — Venues search
7. **Task 7** — Wire decorative buttons
8. **Task 5** — Event edit flow (biggest task, do last)

---

## New Files Summary

| File | Purpose |
|---|---|
| `src/components/orders/OrdersPageClient.tsx` | Client component for orders filtering |
| `src/components/attendees/AttendeesPageClient.tsx` | Client component for attendees filtering |
| `src/components/reviews/ReviewsPageClient.tsx` | Client component for reviews sorting |
| `src/components/finance/FinancePageClient.tsx` | Client component for finance exports |
| `src/components/venues/VenuesPageClient.tsx` | Client component for venues search |
| `src/lib/utils/csv.ts` | Reusable CSV export utility |
| `src/app/events/[id]/edit/page.tsx` | Edit event page |

## Summary

- **Total tasks: 8 major, ~30 subtasks**
- **DB changes needed: 0** — all tasks are code-only
- **New files: 7**
- **Modified files: ~20**
