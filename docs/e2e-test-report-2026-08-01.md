# E2E Test Report — goswing-admin

**Date:** 2026-08-01
**Method:** Live browser test (Chrome) against `npm run dev` on localhost:3000, backed by the real staging API (`https://web.gooswing.com`) and the `gooswing-staging` Clerk instance.
**Account:** med.benmoussa.dev@gmail.com (fresh Google sign-up, onboarded during the test)

## Coverage

| Area | Result |
|---|---|
| Login / auth redirect (`/overview` → `/login`) | ✅ Works |
| Onboarding wizard (2 steps, creates organizer + venue) | ✅ Works (with data-loss bug, see B3) |
| Overview dashboard | ✅ Zero-state renders, `/api/provision/me` 200, no console errors |
| Events list + calendar toggle | ✅ Empty state renders |
| **Event create** | ❌ **Blocked by backend bug B1** |
| Event detail / edit | ⏸ Untestable — no event can be created |
| Venues list | ✅ Works |
| Venue detail | ✅ Works (bugs B4, B5) |
| Venue edit + save round-trip | ✅ Works — street address persisted |
| Venue create page | ✅ Renders (submit not tested to avoid noise) |
| Venue guest view | ✅ Renders (bugs B6) |
| Orders | ✅ Zero-state renders |
| Attendees | ✅ Zero-state renders |
| Finance + transactions + payment methods | ✅ Zero-states render |
| Reviews | ✅ Zero-state renders |
| Music | ✅ Zero-state renders |
| Marketing | ✅ Intentional "Bientôt disponible" overlay |
| Team | ✅ Renders member list |
| Analytics | ✅ Zero-state renders |
| Settings (profile) | ✅ Prefilled from Clerk |
| Help center | ✅ Renders |
| Discover: home, events, venues, cities, categories, venue detail | ✅ All render with live staging data; test venue appears publicly |

## Bugs found (ordered by severity)

### B1 — CRITICAL (backend): event creation impossible — `startsAt` rejected
`POST /v1/admin/events` rejects **every** ISO 8601 datetime with `400 validation_failed — "startsAt must be an ISO datetime" {"field":"startsAt"}`.

Probed formats (all sent through the app's own server action with a valid Clerk token):
- `2026-08-15T19:00:00.000Z` → rejected (this is the format in the API docs AND the postman collection)
- `2026-08-15T19:00:00Z` → rejected
- `2026-08-15T19:00:00` → rejected
- `2026-08-15T19:00:00+00:00` → rejected
- `2026-08-15 19:00:00` (Odoo style) → **passes validation** but then `500 Internal server error`

The frontend payload is correct per the documented contract (`rest-api-phase-3-admin-routes.md` §POST /v1/admin/events). No client-side change can make event creation work; the backend validator (and the handler behind it) must be fixed.

### B2 — HIGH (frontend): create-event failure is silent
When `createEventAction` returns `{success:false}`, the UI shows no toast/error near the submit button. The user clicks "Enregistrer" and nothing visibly happens. (`src/app/events/create/` form + `src/lib/actions/events.ts`)

### B3 — HIGH (frontend): onboarding drops street address & region
Onboarding step 2 collects street address ("12 Rue de la Republique") and region ("Ile-de-France"), but after submit the venue has only city+country ("Paris, FR" / "No street address set"). Saving the same street via **venue edit** persists fine, so the loss is in the onboarding submission path. (`src/app/onboarding/`)

### B4 — MEDIUM (frontend): venue description renders raw HTML tags
Backend returns descriptions as HTML (`<p>…</p>`, Odoo HTML field). Venue detail, venue edit form, and admin views display the literal tags. Round-trip: saving plain text from the edit form comes back wrapped in `<p>` again. Needs sanitize-and-render (or strip) on display and unwrap on edit.

### B5 — MEDIUM (frontend): untranslated i18n key
Venue detail back-link renders the raw key **`venues.title`**.

### B6 — MEDIUM (frontend): venue guest/public view mapping gaps
- Type shows generic "établissement" although the venue type is `club`.
- Capacity shows "Non défini" although capacity 150 is set (visible in the edit header).

### B7 — LOW (frontend/backend): admin tag lists empty on event create
"Types de soirée", "Styles musicaux", "Services supplémentaires" dropdowns show "Aucun … disponible", while the public categories page lists tags (Brunch, Club night, Concert, …). Several POSTs during create-page load returned 503, suggesting the admin tag-list calls fail/time out against staging while the public tag endpoint works. Custom tag add ("Ajouter le vôtre") works.

### B8 — LOW: mixed FR/EN strings
Examples: "ORDERS LIST", "30 jours window", "Revenue Amount / Reservations", "SORT", "Trié par most recent", "AVERAGE/REVIEWS" chips, English help-center article titles, edit-venue page fully English while the rest is French.

### B9 — LOW: venue edit header shows "Type not set" though type=club is saved (badge shows correctly in list).

## Test data created on staging (cleanup candidates)
- Organizer: "Mohamed Benmoussa Organizer OEj8jV" (auto-named)
- Venue: **"E2E Test Venue"** (id `b9352700-0360-45b1-920b-d40e0e3660df`) — **publicly visible** on /discover/venues
- Tag: "E2E Party" (custom party type, created via the create-event form)
- No events were created (blocked by B1).

## Environment notes
- A stale service worker from a previous localhost:3000 project ("SiteLab") initially hijacked the page; resolved after server restart/new tab.
- Staging API showed intermittent `ETIMEDOUT` / 503 responses during the session.
