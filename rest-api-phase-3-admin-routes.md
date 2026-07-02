# GoSwing — REST API Phase 3 Route Specs (Admin Dashboard)

**Date:** 2026-07-02
**Status:** Draft — ready to hand to OPTIDEEP
**App:** `goswing-admin` (Next.js organizer/admin dashboard + public discover site)
**Complements:** `2026-05-21-rest-api-phase-2-routes.md` (mobile app, routes 1–59)

This document specifies **every REST route the GoSwing admin dashboard needs** so this app can drop Supabase entirely, the same way the mobile app did in Phases 1–2. It covers the full admin surface — session/role resolution, provisioning, onboarding, organizer profile, events CRUD, venues CRUD, orders, attendees/check-ins, finance (transactions, payouts, payment methods), review moderation, song suggestions, team management, the dashboard overview, media uploads — **plus** the public (unauthenticated) discover pages this app serves at `/discover`.

Routes are numbered starting at **60** so the full GoSwing API catalog (1–127) reads as one contiguous set: 1–7 Phase 1, 8–59 Phase 2, 60–127 Phase 3.

Every route below is traced back to the exact function in this repo it replaces — see § U at the end.

---

## A. Conventions

All Phase 2 conventions apply unchanged unless overridden here. Quick recap plus the Phase 3 additions:

### A.1 Base, auth & namespaces

- Base URL: `https://web.gooswing.com` (same as Phases 1–2).
- **`/v1/admin/*`** — requires `Authorization: Bearer <clerk_jwt>`. The JWT `sub` is the acting admin user. The API derives the acting user's **organizer** from that identity (see § A.2) and never trusts an `organizerId` in a request body.
- **`/v1/public/*`** — **no auth required.** These power the public `/discover` pages (server-rendered, guest visitors). If the API team prefers, a static API key header (`X-Api-Key`) can be required for these; the admin app can send one server-side. Anonymous browser access is *not* needed — all public routes are called from the Next.js server.
- Same Clerk instance question as Phase 2 applies: the admin app must validate against the same Clerk instance the API trusts.

### A.2 Identity, organizer scoping & roles

Today the Supabase schema scopes admin data two different ways:

1. `organizers.owner_user_id = <clerk_user_id>` — "the organizer I own" (used for team, payment methods, onboarding, contact prefill).
2. `events.created_by_user_id` / `venues.created_by_user_id = <clerk_user_id>` — "rows I created" (used for events & venues CRUD).

For the API, **collapse both into one rule: every `/v1/admin/*` resource is scoped to the caller's organizer**, resolved as:

- the organizer where `owner_user_id = jwt.sub`, or
- the organizer the caller is a member of (`organizer_members`).

This is deliberate: it lets team members (not just the owner) see the organizer's events/venues, which the current per-creator filter accidentally prevents. Flagged in § T open questions — if the API team wants to preserve strict per-creator scoping instead, say so and we'll keep parity.

**Roles** (from `organizer_members.role`): `admin | dj | entrance_manager | finance_manager`.

Resolution rule (must match current behavior):

1. If the user has an `organizer_members` row → that row's `role` (invalid values coerce to `admin`).
2. Else, if the user **owns** an organizer → `admin`.
3. Else → `dj` (most restricted fallback).

Role-based route access is summarized in § S. Any route called with an insufficient role returns `403 forbidden` with `code: "role_forbidden"`.

### A.3 JSON conventions (same as Phase 2)

- camelCase keys; ISO-8601 UTC timestamps with milliseconds; money in integer **cents** + ISO-4217 uppercase `currency`; real booleans; explicit `null` for "no value"; `[]` for empty arrays.
- The admin UI formats all dates/prices client-side — the API returns **raw values only** (no pre-formatted `"$45.00"` strings, no pre-formatted dates).

### A.4 Error envelope (unchanged from Phase 2 § A.4)

Same envelope, same reserved codes (`unauthenticated`, `forbidden`, `not_found`, `validation_failed`, `conflict`, `unprocessable`, `rate_limited`, `upstream_unavailable`, `internal_error`). Phase 3 adds two `code` values used with HTTP 403:

| Code              | HTTP | When                                                        |
| ----------------- | ---- | ----------------------------------------------------------- |
| `role_forbidden`  | 403  | Authenticated, but the caller's role can't use this route   |
| `no_organizer`    | 403  | Caller has no organizer (should not happen after provision) |

And one with HTTP 422:

| Code          | HTTP | When                                                              |
| ------------- | ---- | ----------------------------------------------------------------- |
| `tier_in_use` | 422  | Removing a ticket tier that already has reservations/tickets (§ G) |

### A.5 Pagination

Admin datasets are organizer-scoped and small, and the current UI loads full lists. So **Phase 3 list routes return complete arrays** (`{ "items": [...] }`) with no cursor. Reserve optional `?limit=` on each list route for the future; if the API team wants hard caps from day one, cap at 1000 and flag it — the dashboard does client-side filtering/sorting and needs "all" semantics.

### A.6 Writes

- `POST` create → 201 with the created resource (or its id). `PATCH` → 200 with the updated resource. `DELETE` → 204 no body.
- Multi-row writes that today span several Supabase calls (event + tiers + tags + gallery; onboarding) **must be transactional** on the API side — all-or-nothing.
- `Idempotency-Key` header optional on all POSTs, same semantics as Phase 2 § A.7.

---

## B. Session, role & provisioning

Replaces: `src/lib/data/role.ts:getUserRole`, `src/app/api/me/role/route.ts`, `src/middleware.ts:checkOnboardingNeeded/getUserRole`, `src/lib/data/events.ts:getOrganizerForCurrentUser`, `src/lib/actions/events.ts:fetchOrganizerContact`, `src/lib/provisioning/userProvisioning.ts:provisionUser`.

### B.1 — Route 60 — GET `/v1/admin/me/context`

One call that answers everything the middleware and layout need on every request: who am I, what's my role, do I need onboarding, what's my organizer.

**Response 200**

```json
{
  "userId": "user_2abc123XYZ",
  "role": "admin",
  "needsOnboarding": false,
  "organizer": {
    "id": "uuid",
    "name": "Tanjazz Productions",
    "email": "contact@tanjazz.ma",
    "phone": "+212600000000"
  }
}
```

**Logic**

- `role` per § A.2 resolution rule.
- `needsOnboarding` is `true` when the caller has **no organizer** or the organizer's `city` is null (that's the current heuristic — the onboarding wizard fills `city`).
- `organizer` is `null` only when the user has never been provisioned (then `needsOnboarding: true`, `role: "dj"`).

This route is called by the middleware on most requests — it must be **fast** (cacheable per user for ~30 s is fine, `Cache-Control: private, max-age=30`).

**Errors:** `401`.

---

### B.2 — Route 61 — POST `/v1/admin/me/provision`

Idempotent. Called once right after sign-in (the app fires it from the browser on first authenticated render). Seeds everything a fresh admin user needs.

**Request body** (all optional — the API should prefer JWT/Clerk-derived values when present):

```json
{
  "email": "med@example.com",
  "firstName": "Med",
  "lastName": "Ben",
  "imageUrl": "https://img.clerk.com/…"
}
```

**Server actions (transactional, idempotent):**

1. Upsert the user's admin profile: `displayName` = `"firstName lastName"` or `"User <last 8 of userId>"`, `initials` (first letters of up to 2 name words, uppercased), `email`, `avatarUrl`.
2. If the user owns no organizer: create a stub organizer named `"<displayName> Organizer <last 6 of userId>"` (on name collision, append a 4-digit suffix and retry once).
3. Ensure an `admin` membership row linking the user to that organizer.

**Response 200**

```json
{ "needsOnboarding": true }
```

`needsOnboarding` follows the same rule as Route 60.

**Errors:** `401`, `409 conflict` only if organizer creation collides twice (should be practically impossible).

---

## C. Admin profile (current user)

Replaces: `src/lib/actions/profile.ts:fetchProfile/updateProfileAction`.

### C.1 — Route 62 — GET `/v1/admin/me/profile`

**Response 200**

```json
{
  "userId": "user_2abc123XYZ",
  "displayName": "Med Ben",
  "email": "med@example.com",
  "phone": "+212600000000",
  "avatarUrl": "https://cdn.gooswing.com/avatars/abc.jpg",
  "occupation": "Event manager"
}
```

All fields except `userId` and `displayName` are `string | null`.

**Errors:** `401`, `404 not_found` (never provisioned).

---

### C.2 — Route 63 — PATCH `/v1/admin/me/profile`

**Request body** — any subset of:

```json
{
  "displayName": "string (1..100)",
  "email": "string (valid email)",
  "phone": "string (<=30) | null",
  "occupation": "string (<=100) | null",
  "avatarUrl": "string | null"
}
```

**Response 200** — updated profile (§ C.1 shape).

**Errors:** `401`, `400 validation_failed`.

---

## D. Onboarding

Replaces: `src/lib/actions/organizer.ts:fetchOrganizerForOnboarding/completeOnboardingAction`.

The onboarding wizard collects personal info, organizer info, the first venue, and an optional image gallery, then submits everything in one shot.

### D.1 — Route 64 — GET `/v1/admin/me/onboarding`

Prefill data for the wizard. The API should fall back to Clerk-derived values (full name, avatar) when profile fields are empty.

**Response 200**

```json
{
  "personal": {
    "displayName": "Med Ben",
    "phone": "+212600000000",
    "avatarUrl": "https://…"
  },
  "organizer": {
    "id": "uuid",
    "name": "Tanjazz Productions",
    "tagline": "string | null",
    "about": "string | null",
    "city": "string | null",
    "countryCode": "string | null",
    "email": "string | null",
    "phone": "string | null",
    "websiteUrl": "string | null",
    "instagramHandle": "string | null",
    "facebookHandle": "string | null",
    "tiktokHandle": "string | null",
    "logoUrl": "string | null",
    "coverImageUrl": "string | null",
    "customPolicies": [ { "title": "string", "description": "string" } ]
  },
  "venue": {
    "id": "uuid",
    "name": "string",
    "venueType": "string | null",
    "description": "string | null",
    "freeAccess": false,
    "freeForLadies": false,
    "addressLine1": "string | null",
    "city": "string | null",
    "region": "string | null",
    "countryCode": "string | null",
    "postalCode": "string | null",
    "capacity": 500,
    "lat": 35.7595,
    "lng": -5.8340
  }
}
```

`organizer` and `venue` are `null` when they don't exist yet. `capacity`, `lat`, `lng` are `number | null`.

**Errors:** `401`.

---

### D.2 — Route 65 — POST `/v1/admin/me/onboarding`

Submits the whole wizard. **Transactional.**

**Request body**

```json
{
  "personal": {
    "displayName": "Med Ben",
    "phone": "string | null",
    "avatarUrl": "string | null"
  },
  "organizer": {
    "name": "Tanjazz Productions",
    "tagline": "string | null",
    "about": "string | null",
    "city": "Tangier",
    "countryCode": "MA",
    "email": "contact@tanjazz.ma",
    "phone": "string | null",
    "websiteUrl": "string | null",
    "instagramHandle": "string | null",
    "facebookHandle": "string | null",
    "tiktokHandle": "string | null",
    "logoUrl": "string | null",
    "coverImageUrl": "string | null",
    "customPolicies": [ { "title": "string", "description": "string" } ]
  },
  "venue": {
    "name": "Plaza del Toro",
    "venueType": "string | null",
    "description": "string | null",
    "freeAccess": false,
    "freeForLadies": false,
    "addressLine1": "string | null",
    "city": "Tangier",
    "region": "string | null",
    "countryCode": "MA",
    "postalCode": "string | null",
    "capacity": 500,
    "lat": 35.7595,
    "lng": -5.8340
  },
  "galleryImageUrls": ["https://…", "https://…"]
}
```

Required: `personal.displayName`, `organizer.name`, `venue.name`. Everything else optional/nullable. `organizer.city` falls back to `venue.city` and vice-versa (both directions — that's the current behavior).

**Server actions (in order, one transaction):**

1. Update the caller's profile (`displayName`, derived `initials`, `phone`, `avatarUrl`).
2. Update the caller's organizer with all organizer fields. Duplicate organizer name → `409 conflict`, `code: "conflict"`, message "An organization with this name already exists".
3. Ensure the caller's `admin` membership row exists.
4. Upsert the organizer's venue: if the organizer has no venue yet, create it (linked to the organizer + the caller as creator); else update the existing one.
5. If `galleryImageUrls` is present (non-null): **replace** the organizer gallery — delete all rows, insert one per URL with `mediaType: "image"` and `sortOrder` = array index.

**Response 200**

```json
{ "organizerId": "uuid", "venueId": "uuid" }
```

**Errors:** `401`, `400 validation_failed`, `409 conflict` (duplicate organizer name).

---

## E. Organizer profile & assets

Replaces: `src/lib/data/venueStats.ts:getVenueOrganizer`, `src/lib/actions/venueEdit.ts:updateOrganizerAction/fetchOrganizerGallery/addGalleryImage/removeGalleryImage/fetchOrganizerTags/syncOrganizerTags`, `src/lib/data/gallery.ts` (organizer half), `src/lib/data/tags.ts:getOrganizerTags/setOrganizerTags`.

All routes here operate on **the caller's organizer** (derived from JWT — no `:organizerId` in the path, no IDOR surface).

### E.1 — Route 66 — GET `/v1/admin/organizer`

Full organizer profile.

**Response 200**

```json
{
  "id": "uuid",
  "name": "Tanjazz Productions",
  "tagline": "string | null",
  "about": "string | null",
  "logoUrl": "string | null",
  "coverImageUrl": "string | null",
  "city": "string | null",
  "countryCode": "string | null",
  "email": "string | null",
  "phone": "string | null",
  "websiteUrl": "string | null",
  "instagramHandle": "string | null",
  "facebookHandle": "string | null",
  "tiktokHandle": "string | null",
  "snapchatHandle": "string | null",
  "youtubeHandle": "string | null",
  "twitterHandle": "string | null",
  "pinterestHandle": "string | null",
  "googleBusinessUrl": "string | null",
  "cancellationPolicy": "string | null",
  "refundPolicy": "string | null",
  "customPolicies": [ { "title": "string", "description": "string" } ],
  "specialties": ["jazz", "festivals"],
  "establishedYear": 2003,
  "isVerified": true,
  "createdAt": "2025-01-15T08:00:00.000Z"
}
```

`specialties` is `string[] | null`; `establishedYear` `number | null`; `isVerified` `boolean | null`.

**Errors:** `401`, `403 no_organizer`.

---

### E.2 — Route 67 — PATCH `/v1/admin/organizer`

Partial update. **Role: `admin` only** (owner, org-admin member, or — current parity — the creator of one of the organizer's venues; recommend simplifying to owner/org-admin, flagged in § T).

**Request body** — any subset of the § E.1 fields except `id`, `isVerified`, `createdAt`:

`name`, `tagline`, `about`, `logoUrl`, `coverImageUrl`, `city`, `countryCode`, `email`, `phone`, `websiteUrl`, `googleBusinessUrl`, `instagramHandle`, `tiktokHandle`, `facebookHandle`, `snapchatHandle`, `twitterHandle`, `youtubeHandle`, `pinterestHandle`, `cancellationPolicy`, `refundPolicy`, `customPolicies`, `specialties`, `establishedYear`.

**Response 200** — updated organizer (§ E.1 shape).

**Errors:** `401`, `403 role_forbidden`, `400 validation_failed`, `409 conflict` (duplicate name).

---

### E.3 — Route 68 — GET `/v1/admin/organizer/gallery`

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "url": "https://cdn.gooswing.com/orgs/tanjazz/g1.jpg",
      "mediaType": "image",
      "caption": "string | null",
      "sortOrder": 0
    }
  ]
}
```

`mediaType` ∈ `"image" | "video"`. Sorted by `sortOrder asc`.

**Errors:** `401`, `403 no_organizer`.

---

### E.4 — Route 69 — POST `/v1/admin/organizer/gallery`

**Role: `admin`.**

**Request body**

```json
{
  "url": "https://…",
  "mediaType": "image",
  "caption": "string | null",
  "sortOrder": 3
}
```

`url` required; the rest optional (`mediaType` defaults `"image"`, `sortOrder` defaults to end of list).

**Response 201** — the created item (§ E.3 item shape).

**Errors:** `401`, `403 role_forbidden`, `400 validation_failed`.

---

### E.5 — Route 70 — DELETE `/v1/admin/organizer/gallery/:itemId`

**Role: `admin`.** The item must belong to the caller's organizer.

**Response 204.**

**Errors:** `401`, `403`, `404 not_found`.

---

### E.6 — Route 71 — GET `/v1/admin/organizer/tags`

Tags linked to the caller's organizer.

**Response 200**

```json
{
  "items": [
    { "id": "uuid", "label": "Live Music", "slug": "live-music", "type": "music_style" }
  ]
}
```

**Errors:** `401`, `403 no_organizer`.

---

### E.7 — Route 72 — PUT `/v1/admin/organizer/tags`

Replace-all semantics (delete existing links, insert the given set). **Role: `admin`.**

**Request body**

```json
{ "tagIds": ["uuid", "uuid"] }
```

Every id must exist in the tag catalog; invalid ids → `400 validation_failed` with `details.invalidIds`.

**Response 200** — resulting list (§ E.6 shape).

**Errors:** `401`, `403 role_forbidden`, `400 validation_failed`.

---

## F. Tags catalog

Replaces: `src/lib/data/events.ts:getTags`, `src/lib/data/tags.ts:getTagsByType`, `src/lib/actions/events.ts:createCustomTagAction`.

### F.1 — Route 73 — GET `/v1/admin/tags`

**Query params**

| Name   | Type   | Default | Notes                                                                    |
| ------ | ------ | ------- | ------------------------------------------------------------------------ |
| `type` | string | —       | Optional. One of `category`, `party_type`, `music_style`, `extra_service`. Omit for all. |

**Response 200**

```json
{
  "items": [
    { "id": "uuid", "label": "Techno", "slug": "techno", "type": "music_style" }
  ]
}
```

Sorted by `type asc, label asc`.

> ⚠️ The Phase 2 doc (§ H'.27, `/v1/tags`) listed tag types as `interest | category | music | party | access`. The admin app uses `category | party_type | music_style | extra_service`. These must be reconciled into **one** canonical type list — see § T. If `/v1/tags` already returns the right data, Route 73 can simply be `/v1/tags` and this route number is freed.

**Errors:** `401`, `400 validation_failed` (unknown `type`).

---

### F.2 — Route 74 — POST `/v1/admin/tags`

Get-or-create a custom tag. Any signed-in admin-app user may call it (that's current behavior).

**Request body**

```json
{ "type": "party_type", "label": "Rooftop Party" }
```

- `type` ∈ `party_type | music_style | extra_service` (custom `category` tags are **not** allowed).
- `label` 1..80 chars. The server slugifies it (lowercase, hyphens, max 60 chars).
- If a tag with the same `(type, slug)` exists → return it with **200** (no duplicate).

**Response 201** (created) or **200** (already existed)

```json
{ "id": "uuid", "label": "Rooftop Party", "slug": "rooftop-party", "type": "party_type" }
```

**Errors:** `401`, `400 validation_failed`.

---

## G. Events (admin CRUD + analytics)

Replaces: `src/lib/data/events.ts:getEvents/getEvent/getEventOverview/createEvent/updateEvent/deleteEvent`, `src/lib/actions/events.ts:createEventAction/updateEventAction/deleteEventAction/fetchEventForEdit`.

**Role: `admin`** for all Route 75–80.

### G.1 — Route 75 — GET `/v1/admin/events`

The events list page. Scoped to the caller's organizer. Sorted `startsAt desc`. Includes the per-event aggregates the list cards show — computed server-side so one request paints the page.

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Tanjazz Festival 2026",
      "description": "string | null",
      "heroImageUrl": "string | null",
      "startsAt": "2026-07-12T20:00:00.000Z",
      "endsAt": "2026-07-15T02:00:00.000Z",
      "status": "published",
      "venueId": "uuid | null",
      "venueName": "Plaza del Toro",
      "venueCity": "Tangier",
      "organizerId": "uuid",
      "organizerName": "Tanjazz Productions",
      "currency": "MAD",
      "minPriceCents": 4500,
      "isFree": false,
      "attendeeCount": 320,
      "waitlistEnabled": false,
      "approvalMode": "auto",
      "sharingEnabled": true,
      "policies": [ { "title": "string", "description": "string" } ],
      "tags": ["Techno", "Rooftop Party"],
      "partyTypes": ["Rooftop Party"],
      "musicStyles": ["Techno"],
      "extraServices": [],
      "reservationCount": 45,
      "songSuggestionsCount": 12,
      "checkedInCount": 38,
      "reviewScore": 4.6
    }
  ]
}
```

**Aggregate definitions (server-computed):**

- `reservationCount` — reservations with status `confirmed` for the event.
- `songSuggestionsCount` — total song suggestions for the event.
- `checkedInCount` — ticket check-ins with result `accepted` for the event's tickets.
- `reviewScore` — mean review rating, 1-decimal, `null` if no reviews.
- `status` ∈ `published | draft | completed | cancelled | live`.
- `partyTypes` / `musicStyles` / `extraServices` — tag labels split by tag `type`; `tags` = all labels.

**Errors:** `401`, `403 role_forbidden`.

---

### G.2 — Route 76 — GET `/v1/admin/events/:id`

Full event detail — one route feeds both the detail page and the edit form (event fields + ticket tiers + tag ids + gallery + venue + organizer snapshot).

**Response 200**

```json
{
  "event": {
    "…": "same fields as a § G.1 item (aggregates included)",
    "externalId": "tanjazz-festival",
    "createdAt": "2026-05-01T09:00:00.000Z"
  },
  "tagIds": ["uuid", "uuid"],
  "ticketTypes": [
    {
      "id": "uuid",
      "name": "Early Bird",
      "description": "string | null",
      "priceCents": 3000,
      "currency": "MAD",
      "capacity": 100,
      "benefits": ["Welcome drink"],
      "salesStartAt": "2026-06-01T00:00:00.000Z",
      "salesEndAt": "2026-07-12T18:00:00.000Z",
      "isFree": false,
      "freeForLadies": false
    }
  ],
  "gallery": [
    { "id": "uuid", "url": "https://…", "mediaType": "image", "caption": "string | null", "sortOrder": 0 }
  ],
  "venue": {
    "id": "uuid",
    "name": "Plaza del Toro",
    "city": "Tangier",
    "addressLine1": "string | null",
    "region": "string | null",
    "countryCode": "MA",
    "timezone": "Africa/Casablanca",
    "venueType": "string | null",
    "lat": 35.7595,
    "lng": -5.8340,
    "capacity": 500
  },
  "organizer": {
    "id": "uuid",
    "name": "Tanjazz Productions",
    "logoUrl": "string | null",
    "coverImageUrl": "string | null",
    "tagline": "string | null",
    "about": "string | null",
    "establishedYear": 2003,
    "isVerified": true,
    "city": "Tangier",
    "countryCode": "MA",
    "phone": "string | null",
    "email": "string | null",
    "websiteUrl": "string | null",
    "instagramHandle": "string | null",
    "facebookHandle": "string | null",
    "specialties": ["jazz"],
    "cancellationPolicy": "string | null",
    "refundPolicy": "string | null"
  }
}
```

`venue` and `organizer` are `null` when unset. `capacity`, `benefits` per tier: `number | null` and `string[]`.

**Errors:** `401`, `403 role_forbidden`, `404 not_found` (doesn't exist **or** not the caller's — same 404, don't leak).

---

### G.3 — Route 77 — GET `/v1/admin/events/:id/overview`

The per-event analytics page. All numbers computed server-side.

**Response 200**

```json
{
  "eventId": "uuid",
  "reservationsCount": 45,
  "songSuggestionsCount": 12,
  "checkedInCount": 38,
  "reviewScore": 4.6,
  "reviewCount": 17,
  "totalTicketsSold": 112,
  "totalRevenueCents": 504000,
  "currency": "MAD",
  "cancellationRate": 4.3,
  "ticketSalesBreakdown": [
    { "ticketTypeName": "Early Bird", "ticketsSold": 60, "revenueCents": 180000 },
    { "ticketTypeName": "Standard", "ticketsSold": 52, "revenueCents": 324000 }
  ]
}
```

**Definitions:**

- `reservationsCount` — `confirmed` reservations.
- `totalRevenueCents` — sum of `confirmed` reservations' totals. `currency` from those reservations (fallback the event's).
- `totalTicketsSold` / `ticketSalesBreakdown` — from reservation items of `confirmed` reservations, excluding removed items, grouped by ticket-type-name snapshot.
- `cancellationRate` — `cancelled / (confirmed + cancelled) * 100`, 1-decimal, `null` when no reservations.
- `reviewScore` — 1-decimal mean, `null` if no reviews.
- `checkedInCount` — accepted ticket check-ins.

**Errors:** `401`, `403 role_forbidden`, `404 not_found`.

---

### G.4 — Route 78 — POST `/v1/admin/events`

Create an event with tiers, tags and gallery in **one transactional call**.

**Request body**

```json
{
  "title": "Tanjazz Festival 2026",
  "description": "string | null",
  "startsAt": "2026-07-12T20:00:00.000Z",
  "endsAt": "2026-07-15T02:00:00.000Z",
  "venueId": "uuid | null",
  "heroImageUrl": "string | null",
  "publish": true,
  "currency": "MAD",
  "approvalMode": "auto",
  "sharingEnabled": true,
  "policies": [ { "title": "string", "description": "string" } ],
  "ticketTiers": [
    {
      "name": "Early Bird",
      "priceCents": 3000,
      "currency": "MAD",
      "description": "string | null",
      "capacity": 100,
      "isFree": false,
      "freeForLadies": false
    }
  ],
  "tagIds": ["uuid"],
  "galleryItems": [
    { "url": "https://…", "mediaType": "image", "caption": "string | null" }
  ]
}
```

**Validation**

- `title` required. `startsAt` must be in the future. `endsAt`, when present, ≥ 30 minutes after `startsAt`.
- `approvalMode` ∈ `auto | manual`. `publish: true` → status `published`, else `draft`.
- Tier `priceCents` ≥ 0; a tier with `isFree: true` stores price 0.
- `venueId`, when present, must be a venue of the caller's organizer.

**Server-derived (never client-sent):** `externalId` slug, `minPriceCents` (min tier price), event-level `isFree` (min price is 0), `organizerId`, creator identity, gallery `sortOrder` (array order).

**Response 201**

```json
{ "eventId": "uuid" }
```

**Errors:** `401`, `403 role_forbidden`, `400 validation_failed`, `404 not_found` (bad `venueId`).

---

### G.5 — Route 79 — PATCH `/v1/admin/events/:id`

Full edit-form submit. Same body as § G.4 (all fields optional, plus tier ids), with these semantics:

- `ticketTiers` — **authoritative list**. Tiers with an `id` are updated; tiers without an `id` are created; existing tiers absent from the list are **deleted**. Deleting a tier that already has reservations or issued tickets → `422 unprocessable`, `code: "tier_in_use"`, `details.ticketTypeId`.
- `tagIds` — replace-all.
- `galleryItems` — replace-all (`sortOrder` = array order).
- `publish` maps to `status` the same way; sending an explicit `"status"` value (`published | draft | completed | cancelled`) is also acceptable — pick one convention and keep it.

**Response 200** — the updated full detail (§ G.2 shape).

**Errors:** `401`, `403`, `404`, `400`, `422 tier_in_use`.

---

### G.6 — Route 80 — DELETE `/v1/admin/events/:id`

**Response 204.** Server should refuse (`409 conflict`) if the event has confirmed reservations — current Supabase FK behavior effectively blocks this; make the rule explicit.

**Errors:** `401`, `403`, `404`, `409`.

---

## H. Venues (admin CRUD + detail page data)

Replaces: `src/lib/data/venues.ts` (all), `src/lib/data/venueStats.ts:getVenueStats/getVenueEvents/getSimilarVenues`, `src/lib/data/venueReviews.ts`, `src/lib/actions/venues.ts`, `src/lib/actions/venueDetail.ts`.

**Role: `admin`** for all of § H.

### H.1 — Route 81 — GET `/v1/admin/venues`

**Query params**

| Name   | Type   | Default  | Notes                                                       |
| ------ | ------ | -------- | ------------------------------------------------------------ |
| `view` | string | `"full"` | `"select"` returns the slim `{id, name, city}` shape for dropdowns, sorted `name asc`. |

**Response 200 (full)** — sorted `createdAt desc`:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Plaza del Toro",
      "addressLine1": "string | null",
      "city": "Tangier",
      "region": "string | null",
      "countryCode": "MA",
      "postalCode": "string | null",
      "lat": 35.7595,
      "lng": -5.8340,
      "venueType": "club",
      "timezone": "Africa/Casablanca",
      "capacity": 500,
      "organizerId": "uuid | null",
      "description": "string | null",
      "freeAccess": false,
      "freeForLadies": false,
      "coverImageUrl": "string | null",
      "createdAt": "2026-01-10T09:00:00.000Z"
    }
  ]
}
```

`coverImageUrl` is denormalized from the owning organizer's cover image (that's what the venue cards show today).

**Response 200 (`view=select`)**

```json
{ "items": [ { "id": "uuid", "name": "Plaza del Toro", "city": "Tangier" } ] }
```

**Errors:** `401`, `403 role_forbidden`.

---

### H.2 — Route 82 — POST `/v1/admin/venues`

**Request body**

```json
{
  "name": "Plaza del Toro",
  "addressLine1": "string | null",
  "city": "string | null",
  "region": "string | null",
  "countryCode": "string | null",
  "postalCode": "string | null",
  "venueType": "string | null",
  "timezone": "string | null",
  "lat": 35.7595,
  "lng": -5.8340,
  "capacity": 500,
  "description": "string | null",
  "freeAccess": false,
  "freeForLadies": false
}
```

`name` required (trimmed, non-empty); everything else nullable. The server attaches the venue to the caller's organizer and records the creator.

**Response 201**

```json
{ "venueId": "uuid" }
```

**Errors:** `401`, `403`, `400 validation_failed`.

---

### H.3 — Route 83 — GET `/v1/admin/venues/:id`

**Response 200** — one § H.1 full item.

**Errors:** `401`, `403`, `404 not_found` (missing or not the caller's).

---

### H.4 — Route 84 — PATCH `/v1/admin/venues/:id`

Any subset of the § H.2 fields. **Response 200** — updated venue.

**Errors:** `401`, `403`, `404`, `400`.

---

### H.5 — Route 85 — DELETE `/v1/admin/venues/:id`

**Response 204.** Refuse with `409 conflict` if events reference the venue.

**Errors:** `401`, `403`, `404`, `409`.

---

### H.6 — Route 86 — GET `/v1/admin/venues/:id/stats`

Header stats on the venue detail page.

**Response 200**

```json
{
  "eventCount": 12,
  "totalAttendees": 4520,
  "reviewScore": 4.4,
  "reviewCount": 31,
  "followerCount": 1240
}
```

**Definitions:** `eventCount` — events at the venue. `totalAttendees` — sum of those events' attendee counts. `reviewScore`/`reviewCount` — **event** reviews of events held at the venue (⚠️ not the `venue_reviews` table — that's the current, intentional behavior), 1-decimal mean, `null` when none. `followerCount` — followers of the venue's organizer (0 when no organizer).

**Errors:** `401`, `403`, `404`.

---

### H.7 — Route 87 — GET `/v1/admin/venues/:id/events`

Events at this venue, grouped for the tabbed section.

**Response 200**

```json
{
  "live": [ { "id": "uuid", "title": "…", "heroImageUrl": "string | null", "startsAt": "…", "endsAt": "… | null", "status": "published", "attendeeCount": 320, "minPriceCents": 4500, "isFree": false, "currency": "MAD" } ],
  "upcoming": [ "same item shape" ],
  "past": [ "same item shape" ],
  "all": [ "same item shape — the full list, startsAt desc" ]
}
```

**Grouping rules (relative to `now`):**

- `live` — status `live`, **or** status `published` with `startsAt <= now` and (`endsAt` null or `> now`).
- `upcoming` — status `published` or `draft`, with `startsAt > now`.
- `past` — status `completed`, or `endsAt <= now`.

**Errors:** `401`, `403`, `404`.

---

### H.8 — Route 88 — GET `/v1/admin/venues/:id/similar`

Other venues of the caller's organizer in the same city.

**Query params:** `limit` (default 6, max 20).

**Response 200**

```json
{
  "items": [
    { "id": "uuid", "name": "string", "city": "string | null", "venueType": "string | null", "capacity": 500 }
  ]
}
```

Empty array when the venue has no city. Excludes the queried venue.

**Errors:** `401`, `403`, `404`.

---

### H.9 — Route 89 — GET `/v1/admin/venues/:id/reviews`

Venue reviews (the `venue_reviews` table) + aggregate stats, sorted `createdAt desc`.

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "venueId": "uuid",
      "userName": "Alice",
      "userAvatarUrl": "string | null",
      "rating": 5,
      "comment": "string",
      "createdAt": "2026-05-21T14:30:00.000Z",
      "adminLiked": false,
      "adminReply": "string | null",
      "adminReplyAt": "2026-05-22T10:00:00.000Z"
    }
  ],
  "stats": {
    "count": 31,
    "average": 4.4,
    "distribution": { "1": 0, "2": 1, "3": 4, "4": 12, "5": 14 }
  }
}
```

`userName` falls back to `"Anonymous"` when the reviewer has no profile. `average` is a 1-decimal mean (0 when empty).

**Errors:** `401`, `403`, `404`.

---

## I. Orders & attendees

Replaces: `src/lib/data/orders.ts:getOrders/getOrderDetail`, `src/lib/actions/orders.ts:updateReservationStatusAction`, `src/lib/data/attendees.ts:getAttendees/getCheckinSummary`.

**Roles: `admin` and `entrance_manager`.** Scope: reservations on the caller's organizer's events.

### I.1 — Route 90 — GET `/v1/admin/orders`

**Query params**

| Name      | Type   | Notes                                                                       |
| --------- | ------ | ---------------------------------------------------------------------------- |
| `eventId` | uuid   | Optional — one event only                                                    |
| `status`  | string | Optional — raw status: `draft \| pending \| confirmed \| checkedIn \| cancelled \| expired \| refunded` |
| `from`    | ISO ts | Optional — `orderedAt >= from`                                               |
| `to`      | ISO ts | Optional — `orderedAt <= to`                                                 |

**Response 200** — sorted `orderedAt desc`:

```json
{
  "items": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "eventTitle": "Tanjazz Festival 2026",
      "status": "confirmed",
      "billing": { "firstName": "Alice", "lastName": "Doe", "email": "alice@example.com" },
      "totalAmountCents": 10500,
      "currency": "MAD",
      "orderedAt": "2026-05-21T14:30:00.000Z",
      "items": [
        { "ticketTypeName": "Early Bird", "quantity": 2, "unitPriceCents": 3000, "lineTotalCents": 6000 }
      ]
    }
  ]
}
```

`billing.firstName/lastName/email` are `string | null` (the UI renders "Guest" when both names are null).

**Errors:** `401`, `403 role_forbidden`.

---

### I.2 — Route 91 — GET `/v1/admin/orders/:id`

Full order detail (drawer/detail view).

**Response 200**

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "eventTitle": "Tanjazz Festival 2026",
  "status": "confirmed",
  "currency": "MAD",
  "subtotalCents": 9000,
  "serviceFeeCents": 1500,
  "taxCents": 0,
  "totalAmountCents": 10500,
  "orderedAt": "2026-05-21T14:30:00.000Z",
  "updatedAt": "2026-05-21T15:00:00.000Z",
  "billing": { "firstName": "Alice", "lastName": "Doe", "email": "alice@example.com" },
  "items": [
    {
      "id": "uuid",
      "ticketTypeName": "Early Bird",
      "quantity": 2,
      "unitPriceCents": 3000,
      "currency": "MAD",
      "lineTotalCents": 6000,
      "benefits": ["Welcome drink", "Priority entry"]
    }
  ]
}
```

**Errors:** `401`, `403`, `404 not_found` (missing or not on the caller's events).

---

### I.3 — Route 92 — POST `/v1/admin/orders/:id/status`

Manual status change (approve pending reservations, mark checked-in).

**Request body**

```json
{ "status": "confirmed" }
```

`status` ∈ `pending | confirmed | checkedIn` — exactly these three (current admin behavior; cancellations/refunds are not exposed in the dashboard yet).

**Response 200**

```json
{ "id": "uuid", "status": "confirmed" }
```

**Errors:** `401`, `403`, `404`, `400 validation_failed` (bad status value).

---

### I.4 — Route 93 — GET `/v1/admin/attendees`

Checked-in attendees list (the Attendees page shows only reservations with status `checkedIn`).

**Query params:** `eventId` (optional).

**Response 200** — sorted by check-in time desc:

```json
{
  "items": [
    {
      "reservationId": "uuid",
      "name": "Alice Doe",
      "email": "alice@example.com",
      "eventId": "uuid",
      "eventTitle": "Tanjazz Festival 2026",
      "checkedInAt": "2026-07-12T20:45:00.000Z",
      "ticketSummary": "Early Bird x2, VIP x1"
    }
  ]
}
```

- `name` from billing first+last (`"Guest"` fallback lives client-side — return `null` names as-is via a `billing`-style object if preferred; the string form shown here matches the current UI need).
- `ticketSummary` — one ticket type → its name; several → `"Name xQty"` joined by commas; server-composed (or return the raw items array — either is fine, pick one and document it).
- `checkedInAt` — when the reservation flipped to `checkedIn` (today approximated by the row's `updatedAt`; if the scanner pipeline records precise check-in timestamps, prefer those).

**Errors:** `401`, `403 role_forbidden`.

---

### I.5 — Route 94 — GET `/v1/admin/attendees/checkin-summary`

Per-event check-in counters (also feeds the dashboard overview).

**Response 200** — events sorted `startsAt desc`, **only events with ≥ 1 reservation**:

```json
{
  "items": [
    {
      "eventId": "uuid",
      "eventTitle": "Tanjazz Festival 2026",
      "totalReservations": 48,
      "checkedIn": 38,
      "cancelled": 2
    }
  ]
}
```

**Errors:** `401`, `403 role_forbidden`.

---

## J. Finance

Replaces: `src/lib/data/finance.ts`, `src/lib/data/payouts.ts`, `src/lib/data/paymentMethods.ts`, `src/lib/actions/paymentMethods.ts`.

**Roles: `admin` and `finance_manager`.** Scope: the caller's organizer.

### J.1 — Route 95 — GET `/v1/admin/finance/transactions`

Transactions list + the stat cards, in one call.

**Query params**

| Name      | Type   | Notes                                                        |
| --------- | ------ | ------------------------------------------------------------- |
| `eventId` | uuid   | Optional                                                      |
| `status`  | string | Optional — **normalized** status: `completed \| pending \| failed` |

**Normalization rule (server-side):** reservation status `confirmed`/`checkedIn` → `completed`; `cancelled`/`expired`/`refunded` → `failed`; everything else → `pending`.

**Response 200** — sorted `orderedAt desc`:

```json
{
  "items": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "eventTitle": "Tanjazz Festival 2026",
      "grossCents": 10500,
      "platformFeeCents": 1500,
      "netCents": 9000,
      "currency": "MAD",
      "status": "completed",
      "provider": "stripe",
      "orderedAt": "2026-05-21T14:30:00.000Z"
    }
  ],
  "stats": {
    "transactionCount": 128,
    "totalGrossCents": 1240000,
    "totalFeesCents": 186000,
    "totalNetCents": 1054000,
    "currency": "MAD"
  }
}
```

- `grossCents` = reservation total; `platformFeeCents` = service fees; `netCents` = gross − fees.
- `stats` totals cover **completed** transactions only; `transactionCount` counts **all** returned transactions (that asymmetry is current behavior — keep it).
- `stats` is computed over the same filtered set the `items` reflect.

**Errors:** `401`, `403 role_forbidden`.

---

### J.2 — Route 96 — GET `/v1/admin/finance/payouts`

**Query params:** `status` (optional: `pending | processing | completed | failed`).

**Response 200** — sorted `createdAt desc`:

```json
{
  "items": [
    {
      "id": "uuid",
      "organizerId": "uuid",
      "amountCents": 250000,
      "currency": "MAD",
      "status": "completed",
      "provider": "stripe",
      "scheduledAt": "2026-06-01T00:00:00.000Z",
      "completedAt": "2026-06-02T10:00:00.000Z",
      "periodStart": "2026-05-01T00:00:00.000Z",
      "periodEnd": "2026-05-31T23:59:59.000Z",
      "createdAt": "2026-05-31T23:59:59.000Z"
    }
  ]
}
```

`scheduledAt`, `completedAt`, `periodStart`, `periodEnd` are `string | null`.

**Errors:** `401`, `403 role_forbidden`.

---

### J.3 — Route 97 — GET `/v1/admin/finance/payouts/upcoming`

Same item shape as § J.2, filtered to status `pending | processing`, sorted `scheduledAt asc`.

**Errors:** `401`, `403 role_forbidden`.

---

### J.4 — Route 98 — GET `/v1/admin/finance/payment-methods`

**Query params:** `type` (optional: `payment | withdrawal`).

**Response 200** — sorted `createdAt desc`:

```json
{
  "items": [
    {
      "id": "uuid",
      "organizerId": "uuid",
      "methodType": "withdrawal",
      "provider": "stripe",
      "providerAccountId": "acct_1OZ… | null",
      "label": "Main bank account | null",
      "isDefault": true,
      "details": { "iban": "…masked…" },
      "createdAt": "2026-04-12T10:00:00.000Z"
    }
  ]
}
```

`details` is a free-form JSON object (display info only — no PCI data).

**Errors:** `401`, `403 role_forbidden`.

---

### J.5 — Route 99 — POST `/v1/admin/finance/payment-methods`

**Request body**

```json
{
  "methodType": "withdrawal",
  "provider": "stripe",
  "providerAccountId": "string | null",
  "label": "string | null",
  "isDefault": false,
  "details": {}
}
```

`methodType` required (`payment | withdrawal`); `provider` defaults `"stripe"`; `details` defaults `{}`. The organizer is the caller's — never in the body. If `isDefault: true`, unset the previous default of the same `methodType`.

**Response 201** — the created method (§ J.4 item shape).

**Errors:** `401`, `403`, `400 validation_failed`.

---

### J.6 — Route 100 — POST `/v1/admin/finance/payment-methods/:id/default`

Sets this method as default; unsets the previous default **of the same `methodType`**.

**Response 200** — updated method.

**Errors:** `401`, `403`, `404`.

---

### J.7 — Route 101 — DELETE `/v1/admin/finance/payment-methods/:id`

**Response 204.**

**Errors:** `401`, `403`, `404`.

---

## K. Review moderation

Replaces: `src/lib/data/reviews.ts:getReviews/getReviewsWithStats`, `src/lib/actions/reviews.ts` (all 5 actions).

**Role: `admin`.** Scope: reviews on the caller's organizer's events / venues.

### K.1 — Route 102 — GET `/v1/admin/reviews`

Event reviews + aggregate stats.

**Query params**

| Name        | Type    | Notes                          |
| ----------- | ------- | ------------------------------ |
| `eventId`   | uuid    | Optional                       |
| `minRating` | integer | Optional, 1..5 (`rating >=`)   |

**Response 200** — sorted `createdAt desc`:

```json
{
  "items": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "eventTitle": "Tanjazz Festival 2026",
      "userName": "Alice",
      "userAvatarUrl": "string | null",
      "rating": 5,
      "comment": "string",
      "createdAt": "2026-05-21T14:30:00.000Z",
      "adminLiked": false,
      "adminReply": "string | null",
      "adminReplyAt": "2026-05-22T10:00:00.000Z"
    }
  ],
  "stats": {
    "count": 44,
    "average": 4.5,
    "distribution": { "1": 0, "2": 2, "3": 5, "4": 15, "5": 22 }
  }
}
```

`userName` falls back to `"Anonymous"`. `stats` covers the same filtered set as `items`.

**Errors:** `401`, `403 role_forbidden`.

---

### K.2 — Route 103 — POST `/v1/admin/reviews/:id/like-toggle`

Toggles the organizer's ❤️ on a review.

**Response 200**

```json
{ "id": "uuid", "adminLiked": true }
```

**Errors:** `401`, `403`, `404`.

---

### K.3 — Route 104 — PUT `/v1/admin/reviews/:id/reply`

**Request body**

```json
{ "reply": "Thank you! (trimmed, 1..2000 chars)" }
```

**Response 200**

```json
{ "id": "uuid", "adminReply": "Thank you!", "adminReplyAt": "2026-07-02T10:00:00.000Z" }
```

**Errors:** `401`, `403`, `404`, `400 validation_failed`.

---

### K.4 — Route 105 — DELETE `/v1/admin/reviews/:id/reply`

Clears the reply (`adminReply`/`adminReplyAt` → null).

**Response 200**

```json
{ "id": "uuid", "adminReply": null, "adminReplyAt": null }
```

**Errors:** `401`, `403`, `404`.

---

### K.5 — Route 106 — POST `/v1/admin/venue-reviews/:id/like-toggle`

Same contract as § K.2, against venue reviews.

---

### K.6 — Route 107 — PUT `/v1/admin/venue-reviews/:id/reply`

Same contract as § K.3, against venue reviews. A matching `DELETE /v1/admin/venue-reviews/:id/reply` doesn't exist in the current app but should be implemented for symmetry (the UI will grow it).

---

## L. Music

Replaces: `src/lib/data/music.ts:getSongSuggestions`.

**Roles: `admin` and `dj`.**

### L.1 — Route 108 — GET `/v1/admin/song-suggestions`

All song suggestions across the caller's organizer's events.

**Query params:** `eventId` (optional).

**Response 200** — sorted `createdAt desc`:

```json
{
  "items": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "eventTitle": "Tanjazz Festival 2026",
      "trackTitle": "Hozho - Rolling on Cliffs",
      "artistName": "Hozho",
      "albumTitle": "string | null",
      "artworkUrl": "string | null",
      "deezerLink": "string | null",
      "createdAt": "2026-05-21T14:30:00.000Z"
    }
  ]
}
```

**Errors:** `401`, `403 role_forbidden`.

---

## M. Team management

Replaces: `src/lib/data/team.ts:getTeamMembers/searchAvailableUsers`, `src/lib/actions/team.ts` (all).

**Role: organizer owner only** (current behavior — mutations resolve the organizer via ownership, so org-admin members can't manage the team; keep parity, flagged in § T).

### M.1 — Route 109 — GET `/v1/admin/team`

**Response 200** — sorted `joinedAt asc`:

```json
{
  "items": [
    {
      "memberId": "uuid",
      "userId": "user_2abc…",
      "displayName": "Sara K",
      "email": "sara@example.com",
      "avatarUrl": "string | null",
      "role": "entrance_manager",
      "joinedAt": "2026-03-01T09:00:00.000Z"
    }
  ]
}
```

`displayName` falls back to `"Unknown"`; `email`/`avatarUrl` are `string | null`. `role` ∈ the 4-role union.

**Errors:** `401`, `403`.

---

### M.2 — Route 110 — GET `/v1/admin/team/user-search`

Find platform users to add to the team.

**Query params:** `q` (required, min 2 chars — shorter returns `{ "items": [] }`).

**Response 200** — max 20, **excluding existing team members**:

```json
{
  "items": [
    { "userId": "user_2abc…", "displayName": "Sara K", "email": "sara@example.com", "avatarUrl": "string | null" }
  ]
}
```

Matches `displayName` or `email`, case-insensitive substring. ⚠️ This searches **all platform users** (including mobile-app consumers) — privacy question flagged in § T.

**Errors:** `401`, `403`.

---

### M.3 — Route 111 — POST `/v1/admin/team`

**Request body**

```json
{ "userId": "user_2abc…", "role": "entrance_manager" }
```

`role` ∈ `admin | dj | entrance_manager | finance_manager`. The API records the inviter (JWT sub).

**Response 201** — the created member (§ M.1 item shape).

**Errors:** `401`, `403`, `400 validation_failed`, `404 not_found` (unknown user), `409 conflict` (already a member).

---

### M.4 — Route 112 — PATCH `/v1/admin/team/:memberId`

**Request body:** `{ "role": "dj" }`.

**Response 200** — updated member.

**Errors:** `401`, `403`, `404`, `400`.

---

### M.5 — Route 113 — DELETE `/v1/admin/team/:memberId`

**Response 204.** The owner's own membership row must not be removable (`409 conflict`).

**Errors:** `401`, `403`, `404`, `409`.

---

## N. Dashboard overview

Replaces: `src/lib/data/overview.ts:getOverview`.

**Role: `admin`.**

### N.1 — Route 114 — GET `/v1/admin/overview`

Everything the landing dashboard needs in one call.

**Response 200**

```json
{
  "stats": {
    "totalEvents": 12,
    "totalAttendees": 4520,
    "totalTickets": 5100,
    "avgRating": 4.5,
    "totalRevenueCents": 1240000,
    "currency": "MAD"
  },
  "recentEvents": [
    {
      "…": "same shape as a § G.1 events-list item",
      "attendeeCount": 320,
      "reservationCount": 48
    }
  ]
}
```

**Definitions (all scoped to the caller's organizer):**

- `totalEvents` — total event count.
- `totalAttendees` — sum of checked-in reservations across all events.
- `totalTickets` — total issued tickets.
- `avgRating` — 1-decimal mean over all event reviews (0 when none).
- `totalRevenueCents` — sum of **succeeded payments** (the `payments` ledger, not reservation totals — see the § T note on the two revenue definitions).
- `recentEvents` — 6 most recent events (`startsAt desc`); each item's `attendeeCount` = checked-in count, `reservationCount` = total reservations.

**Errors:** `401`, `403 role_forbidden`.

---

## O. Media uploads

Replaces: `src/lib/actions/events.ts:uploadEventImageAction/uploadEventMediaAction`, `src/lib/actions/organizer.ts:uploadOrganizerImageAction`. (Today: Supabase Storage bucket `event-images`, prefixes `event-images/`, `event-gallery/`, `organizer-images/`.)

### O.1 — Route 115 — POST `/v1/admin/uploads` — multipart

**Content-Type:** `multipart/form-data`

| Part   | Type | Required | Notes                                            |
| ------ | ---- | -------- | ------------------------------------------------ |
| `file` | file | yes      | See limits below                                 |
| `kind` | text | yes      | `eventHero` \| `eventGallery` \| `organizerImage` |

**Limits**

- Images (all kinds): `image/jpeg`, `image/png`, `image/webp`, `image/gif` — max **5 MB**.
- Videos (**`eventGallery` only**): `video/mp4`, `video/webm`, `video/quicktime` — max **50 MB**.

The server stores the file under a UUID name (never the client filename) and returns a **permanent public URL**. Storage backend is the server's choice (R2/S3/Odoo attachments) — the client only keeps the URL and later passes it in `heroImageUrl` / `galleryItems[].url` / organizer image fields.

**Response 201**

```json
{ "url": "https://cdn.gooswing.com/event-images/9b1f….jpg", "mediaType": "image" }
```

`mediaType` ∈ `"image" | "video"`.

**Errors:** `401`, `403 role_forbidden`, `400 validation_failed` (type/kind), `413` with `code: "validation_failed"` (size).

> Note: uploads are **not** garbage-collected today (removing a gallery row never deleted the storage object). If the API wants to reclaim orphans, that's a server-side concern — the client contract is just URL-in/URL-out.

---

## P. Public discover routes (no auth)

Replaces: `src/lib/data/discover.ts` (all), `src/lib/data/gallery.ts:getEventGallery`.

The admin app also serves the **public marketing/discover site** (`/discover`, city pages, public event & venue pages). These render server-side for guests, so the routes below must work **without a user JWT** (see § A.1 for the optional API-key alternative).

Several of these overlap Phase 1 routes (1–7) in spirit but differ in shape and filters. Where the API team prefers to extend a Phase 1 route instead of adding a new one, that's fine — the shapes below are the contract the admin app needs; the paths are negotiable.

**Shared shape — `PublicEventCard`:**

```json
{
  "id": "uuid",
  "title": "Tanjazz Festival 2026",
  "description": "string | null",
  "heroImageUrl": "string | null",
  "startsAt": "2026-07-12T20:00:00.000Z",
  "endsAt": "2026-07-15T02:00:00.000Z",
  "venueName": "Plaza del Toro",
  "venueCity": "Tangier",
  "organizerName": "Tanjazz Productions",
  "currency": "MAD",
  "minPriceCents": 4500,
  "isFree": false,
  "attendeeCount": 320,
  "tags": ["Techno", "Rooftop Party"],
  "partyTypes": ["Rooftop Party"],
  "musicStyles": ["Techno"],
  "extraServices": []
}
```

**Shared shape — `PublicVenue`:**

```json
{
  "id": "uuid",
  "name": "Plaza del Toro",
  "addressLine1": "string | null",
  "city": "Tangier",
  "region": "string | null",
  "countryCode": "MA",
  "postalCode": "string | null",
  "lat": 35.7595,
  "lng": -5.8340,
  "venueType": "club",
  "timezone": "Africa/Casablanca",
  "capacity": 500,
  "organizerId": "uuid | null",
  "description": "string | null",
  "freeAccess": false,
  "freeForLadies": false,
  "coverImageUrl": "string | null"
}
```

All public event listings return **published, upcoming** events only (`startsAt >= now`) sorted `startsAt asc`, unless noted.

### P.1 — Route 116 — GET `/v1/public/events`

**Query params**

| Name        | Type    | Notes                                                     |
| ----------- | ------- | ---------------------------------------------------------- |
| `city`      | string  | Case-insensitive substring match on the venue city         |
| `partyType` | string  | Tag **slug**; keeps events carrying that party-type tag    |
| `isFree`    | boolean | `true` → free events only                                  |
| `search`    | string  | Case-insensitive substring match on title                  |
| `limit`     | integer | Default 50, max 100                                        |
| `offset`    | integer | Offset pagination (public pages use page numbers)          |

**Response 200:** `{ "items": [ PublicEventCard ] }`

**Errors:** `400 validation_failed`.

---

### P.2 — Route 117 — GET `/v1/public/events/featured`

Hero-carousel events: published, upcoming, **with a hero image**, `startsAt asc`.

**Query params:** `limit` (default 6, max 20).

**Response 200:** `{ "items": [ PublicEventCard ] }`

---

### P.3 — Route 118 — GET `/v1/public/events/:id`

Public event page. Published events only — a draft/cancelled event returns 404.

**Response 200**

```json
{
  "event": { "…": "PublicEventCard fields" },
  "ticketTypes": [
    { "id": "uuid", "name": "Early Bird", "description": "string | null", "priceCents": 3000, "currency": "MAD", "capacity": 100 }
  ],
  "organizer": {
    "id": "uuid",
    "name": "Tanjazz Productions",
    "logoUrl": "string | null",
    "tagline": "string | null",
    "about": "string | null",
    "coverImageUrl": "string | null",
    "city": "string | null",
    "countryCode": "string | null",
    "phone": "string | null",
    "email": "string | null",
    "websiteUrl": "string | null",
    "instagramHandle": "string | null",
    "facebookHandle": "string | null",
    "specialties": ["jazz"]
  },
  "venue": {
    "id": "uuid",
    "name": "Plaza del Toro",
    "city": "string | null",
    "addressLine1": "string | null",
    "region": "string | null",
    "countryCode": "string | null",
    "timezone": "string | null",
    "venueType": "string | null",
    "lat": 35.7595,
    "lng": -5.8340
  }
}
```

`organizer` / `venue` are `null` when unset.

**Errors:** `404 not_found`.

---

### P.4 — Route 119 — GET `/v1/public/events/:id/gallery`

**Response 200**

```json
{
  "items": [
    { "id": "uuid", "url": "https://…", "mediaType": "image", "caption": "string | null", "sortOrder": 0 }
  ]
}
```

Sorted `sortOrder asc`.

**Errors:** `404 not_found`.

---

### P.5 — Route 120 — GET `/v1/public/events/:id/similar`

Published upcoming events, excluding the queried one, **same venue city preferred** (when the event's venue has a city, filter to it).

**Query params:** `limit` (default 6, max 20).

**Response 200:** `{ "items": [ PublicEventCard ] }`

**Errors:** `404 not_found`.

---

### P.6 — Route 121 — GET `/v1/public/venues`

**Query params**

| Name        | Type    | Notes                                        |
| ----------- | ------- | --------------------------------------------- |
| `venueType` | string  | Case-insensitive exact match                  |
| `city`      | string  | Case-insensitive exact match                  |
| `search`    | string  | Case-insensitive substring match on name      |
| `limit`     | integer | Default 50, max 100                           |
| `offset`    | integer | Offset pagination                             |

**Response 200:** `{ "items": [ PublicVenue ] }` sorted `name asc`.

---

### P.7 — Route 122 — GET `/v1/public/venues/:id`

Public venue page.

**Response 200**

```json
{
  "venue": { "…": "PublicVenue fields" },
  "organizer": {
    "…": "same fields as § P.3 organizer",
    "tiktokHandle": "string | null",
    "snapchatHandle": "string | null"
  }
}
```

**Errors:** `404 not_found`.

---

### P.8 — Route 123 — GET `/v1/public/venues/:id/events`

Published upcoming events at this venue, `startsAt asc`.

**Response 200:** `{ "items": [ PublicEventCard ] }`

**Errors:** `404 not_found`.

---

### P.9 — Route 124 — GET `/v1/public/venues/:id/similar`

Venues in the same city (case-insensitive), excluding the queried one. Empty when the venue has no city.

**Query params:** `limit` (default 6, max 20).

**Response 200:** `{ "items": [ PublicVenue ] }`

**Errors:** `404 not_found`.

---

### P.10 — Route 125 — GET `/v1/public/organizers/:id/events`

Published events by an organizer (public organizer section on event pages).

**Query params:** `exclude` (event uuid, optional), `limit` (default 6, max 20).

**Response 200:** `{ "items": [ PublicEventCard ] }` sorted `startsAt asc`.

**Errors:** `404 not_found`.

---

### P.11 — Route 126 — GET `/v1/public/cities`

Cities with content, for the city cards / city pages.

**Response 200** — sorted by `(eventCount + venueCount) desc`:

```json
{
  "items": [
    { "city": "Tangier", "eventCount": 14, "venueCount": 6 }
  ]
}
```

`eventCount` counts published upcoming events whose venue is in the city; `venueCount` counts venues in the city.

---

### P.12 — Route 127 — GET `/v1/public/tags`

**Query params:** `type` (required — same type list as Route 73).

**Response 200:** `{ "items": [ { "id", "label", "slug", "type" } ] }` sorted `label asc`.

**Errors:** `400 validation_failed`.

---

## Q. Validation summary

Phase 2 § Q applies (emails, phones, money, currencies, slugs). Phase 3 additions:

| Field group                    | Constraint                                                          |
| ------------------------------ | -------------------------------------------------------------------- |
| `displayName`                  | 1..100 chars, trimmed                                                |
| `occupation`                   | 0..100 chars                                                         |
| `phone` (admin profile)        | ≤ 30 chars (looser than mobile — legacy data)                        |
| Tag `label`                    | 1..80 chars; slug ≤ 60 chars `^[a-z0-9-]+$`                          |
| Event `startsAt`               | Must be in the future (creation only)                                |
| Event `endsAt`                 | ≥ 30 minutes after `startsAt` when present                           |
| `approvalMode`                 | `auto \| manual`                                                     |
| Order status (Route 92)        | `pending \| confirmed \| checkedIn`                                  |
| Roles                          | `admin \| dj \| entrance_manager \| finance_manager`                 |
| `methodType`                   | `payment \| withdrawal`                                              |
| Admin reply                    | 1..2000 chars, trimmed                                               |
| Upload images                  | jpeg/png/webp/gif, ≤ 5 MB                                            |
| Upload videos (`eventGallery`) | mp4/webm/quicktime, ≤ 50 MB                                          |
| `lat` / `lng`                  | −90..90 / −180..180, or `null`                                       |
| `capacity`                     | Positive integer or `null`                                           |

---

## R. Quick request/response cheat sheet

| #   | Method | Path                                              | Returns / body                                            | Roles                    |
| --- | ------ | ------------------------------------------------- | ---------------------------------------------------------- | ------------------------ |
| 60  | GET    | `/v1/admin/me/context`                            | `{ userId, role, needsOnboarding, organizer }`             | any                      |
| 61  | POST   | `/v1/admin/me/provision`                          | `{ needsOnboarding }`                                      | any                      |
| 62  | GET    | `/v1/admin/me/profile`                            | AdminProfile                                               | any                      |
| 63  | PATCH  | `/v1/admin/me/profile`                            | AdminProfile                                               | any                      |
| 64  | GET    | `/v1/admin/me/onboarding`                         | `{ personal, organizer, venue }`                           | admin                    |
| 65  | POST   | `/v1/admin/me/onboarding`                         | `{ organizerId, venueId }`                                 | admin                    |
| 66  | GET    | `/v1/admin/organizer`                             | Organizer (full)                                           | any                      |
| 67  | PATCH  | `/v1/admin/organizer`                             | Organizer                                                  | admin                    |
| 68  | GET    | `/v1/admin/organizer/gallery`                     | `{ items: GalleryItem[] }`                                 | any                      |
| 69  | POST   | `/v1/admin/organizer/gallery`                     | GalleryItem                                                | admin                    |
| 70  | DELETE | `/v1/admin/organizer/gallery/:itemId`             | 204                                                        | admin                    |
| 71  | GET    | `/v1/admin/organizer/tags`                        | `{ items: Tag[] }`                                         | any                      |
| 72  | PUT    | `/v1/admin/organizer/tags`                        | `{ items: Tag[] }`                                         | admin                    |
| 73  | GET    | `/v1/admin/tags`                                  | `{ items: Tag[] }`                                         | any                      |
| 74  | POST   | `/v1/admin/tags`                                  | Tag (get-or-create)                                        | any                      |
| 75  | GET    | `/v1/admin/events`                                | `{ items: AdminEvent[] }`                                  | admin                    |
| 76  | GET    | `/v1/admin/events/:id`                            | `{ event, tagIds, ticketTypes, gallery, venue, organizer }`| admin                    |
| 77  | GET    | `/v1/admin/events/:id/overview`                   | EventOverview                                              | admin                    |
| 78  | POST   | `/v1/admin/events`                                | `{ eventId }`                                              | admin                    |
| 79  | PATCH  | `/v1/admin/events/:id`                            | Full detail (as 76)                                        | admin                    |
| 80  | DELETE | `/v1/admin/events/:id`                            | 204                                                        | admin                    |
| 81  | GET    | `/v1/admin/venues` (`?view=select`)               | `{ items: Venue[] }`                                       | admin                    |
| 82  | POST   | `/v1/admin/venues`                                | `{ venueId }`                                              | admin                    |
| 83  | GET    | `/v1/admin/venues/:id`                            | Venue                                                      | admin                    |
| 84  | PATCH  | `/v1/admin/venues/:id`                            | Venue                                                      | admin                    |
| 85  | DELETE | `/v1/admin/venues/:id`                            | 204                                                        | admin                    |
| 86  | GET    | `/v1/admin/venues/:id/stats`                      | VenueStats                                                 | admin                    |
| 87  | GET    | `/v1/admin/venues/:id/events`                     | `{ live, upcoming, past, all }`                            | admin                    |
| 88  | GET    | `/v1/admin/venues/:id/similar`                    | `{ items }`                                                | admin                    |
| 89  | GET    | `/v1/admin/venues/:id/reviews`                    | `{ items: VenueReview[], stats }`                          | admin                    |
| 90  | GET    | `/v1/admin/orders`                                | `{ items: Order[] }`                                       | admin, entrance_manager  |
| 91  | GET    | `/v1/admin/orders/:id`                            | OrderDetail                                                | admin, entrance_manager  |
| 92  | POST   | `/v1/admin/orders/:id/status`                     | `{ id, status }`                                           | admin, entrance_manager  |
| 93  | GET    | `/v1/admin/attendees`                             | `{ items: Attendee[] }`                                    | admin, entrance_manager  |
| 94  | GET    | `/v1/admin/attendees/checkin-summary`             | `{ items: CheckinSummary[] }`                              | admin, entrance_manager  |
| 95  | GET    | `/v1/admin/finance/transactions`                  | `{ items: Transaction[], stats }`                          | admin, finance_manager   |
| 96  | GET    | `/v1/admin/finance/payouts`                       | `{ items: Payout[] }`                                      | admin, finance_manager   |
| 97  | GET    | `/v1/admin/finance/payouts/upcoming`              | `{ items: Payout[] }`                                      | admin, finance_manager   |
| 98  | GET    | `/v1/admin/finance/payment-methods`               | `{ items: PaymentMethod[] }`                               | admin, finance_manager   |
| 99  | POST   | `/v1/admin/finance/payment-methods`               | PaymentMethod                                              | admin, finance_manager   |
| 100 | POST   | `/v1/admin/finance/payment-methods/:id/default`   | PaymentMethod                                              | admin, finance_manager   |
| 101 | DELETE | `/v1/admin/finance/payment-methods/:id`           | 204                                                        | admin, finance_manager   |
| 102 | GET    | `/v1/admin/reviews`                               | `{ items: Review[], stats }`                               | admin                    |
| 103 | POST   | `/v1/admin/reviews/:id/like-toggle`               | `{ id, adminLiked }`                                       | admin                    |
| 104 | PUT    | `/v1/admin/reviews/:id/reply`                     | `{ id, adminReply, adminReplyAt }`                         | admin                    |
| 105 | DELETE | `/v1/admin/reviews/:id/reply`                     | `{ id, adminReply: null, adminReplyAt: null }`             | admin                    |
| 106 | POST   | `/v1/admin/venue-reviews/:id/like-toggle`         | `{ id, adminLiked }`                                       | admin                    |
| 107 | PUT    | `/v1/admin/venue-reviews/:id/reply` (+DELETE)     | `{ id, adminReply, adminReplyAt }`                         | admin                    |
| 108 | GET    | `/v1/admin/song-suggestions`                      | `{ items: SongSuggestion[] }`                              | admin, dj                |
| 109 | GET    | `/v1/admin/team`                                  | `{ items: TeamMember[] }`                                  | owner                    |
| 110 | GET    | `/v1/admin/team/user-search?q=`                   | `{ items: UserMatch[] }`                                   | owner                    |
| 111 | POST   | `/v1/admin/team`                                  | TeamMember                                                 | owner                    |
| 112 | PATCH  | `/v1/admin/team/:memberId`                        | TeamMember                                                 | owner                    |
| 113 | DELETE | `/v1/admin/team/:memberId`                        | 204                                                        | owner                    |
| 114 | GET    | `/v1/admin/overview`                              | `{ stats, recentEvents }`                                  | admin                    |
| 115 | POST   | `/v1/admin/uploads` (multipart)                   | `{ url, mediaType }`                                       | admin                    |
| 116 | GET    | `/v1/public/events`                               | `{ items: PublicEventCard[] }`                             | public                   |
| 117 | GET    | `/v1/public/events/featured`                      | `{ items: PublicEventCard[] }`                             | public                   |
| 118 | GET    | `/v1/public/events/:id`                           | `{ event, ticketTypes, organizer, venue }`                 | public                   |
| 119 | GET    | `/v1/public/events/:id/gallery`                   | `{ items: GalleryItem[] }`                                 | public                   |
| 120 | GET    | `/v1/public/events/:id/similar`                   | `{ items: PublicEventCard[] }`                             | public                   |
| 121 | GET    | `/v1/public/venues`                               | `{ items: PublicVenue[] }`                                 | public                   |
| 122 | GET    | `/v1/public/venues/:id`                           | `{ venue, organizer }`                                     | public                   |
| 123 | GET    | `/v1/public/venues/:id/events`                    | `{ items: PublicEventCard[] }`                             | public                   |
| 124 | GET    | `/v1/public/venues/:id/similar`                   | `{ items: PublicVenue[] }`                                 | public                   |
| 125 | GET    | `/v1/public/organizers/:id/events`                | `{ items: PublicEventCard[] }`                             | public                   |
| 126 | GET    | `/v1/public/cities`                               | `{ items: CityInfo[] }`                                    | public                   |
| 127 | GET    | `/v1/public/tags?type=`                           | `{ items: Tag[] }`                                         | public                   |

**Total: 68 new routes**, bringing the full GoSwing API to **127 endpoints** across the three phases.

---

## S. Role → route authorization matrix

Mirrors the current middleware RBAC (`src/middleware.ts`). "any" = any authenticated admin-app user.

| Route group                            | admin | dj  | entrance_manager | finance_manager |
| -------------------------------------- | ----- | --- | ---------------- | --------------- |
| 60–63 (context, provision, profile)    | ✅    | ✅  | ✅               | ✅              |
| 64–65 (onboarding)                     | ✅    | —   | —                | —               |
| 66, 68, 71, 73 (organizer/tags reads)  | ✅    | ✅  | ✅               | ✅              |
| 67, 69–70, 72, 74 (organizer writes)   | ✅    | —   | —                | —               |
| 75–80 (events)                         | ✅    | —   | —                | —               |
| 81–89 (venues)                         | ✅    | —   | —                | —               |
| 90–94 (orders, attendees)              | ✅    | —   | ✅               | —               |
| 95–101 (finance)                       | ✅    | —   | —                | ✅              |
| 102–107 (reviews)                      | ✅    | —   | —                | —               |
| 108 (song suggestions)                 | ✅    | ✅  | —                | —               |
| 109–113 (team)                         | owner only                                   |||
| 114 (overview)                         | ✅    | —   | —                | —               |
| 115 (uploads)                          | ✅    | —   | —                | —               |
| 116–127 (public)                       | no auth                                      |||

The client also enforces this (route guards + redirects: dj → `/music`, entrance_manager → `/orders`, finance_manager → `/finance`), but the API is the source of truth — return `403 role_forbidden` regardless of what the client does.

---

## T. Open questions for OPTIDEEP / the API team

1. **Organizer scoping vs. creator scoping** (§ A.2) — the current Supabase code scopes events/venues by `created_by_user_id` (only the creating user sees them), while team/finance scope by organizer. We recommend the API scope everything by **organizer**. Confirm, or we keep per-creator parity.

2. **Tag type reconciliation** (§ F.1) — Phase 2 route 27 documented tag types `interest | category | music | party | access`; this app uses `category | party_type | music_style | extra_service`. One canonical list, please — and tell us whether Route 73/127 collapse into Phase 2's `/v1/tags`.

3. **Two revenue definitions** (§ N.1 vs § G.3/J.1) — the dashboard overview sums **succeeded payments**, while event overview + finance sum **confirmed reservation totals**. If Odoo has one payments ledger, decide which is canonical and use it for both (we have no preference, just consistency).

4. **`PATCH /v1/admin/organizer` authorization** (§ E.2) — current code also grants organizer-write access to "the user who created one of the organizer's venues" (a defense-in-depth quirk). We recommend dropping that and allowing only owner + org-admin members. Confirm.

5. **Team management: owner-only vs org-admins** (§ M) — today only the organizer *owner* can manage the team. Should org-admin members be allowed too?

6. **User search privacy** (§ M.2) — Route 110 substring-searches **all** platform users by name/email. Fine for now? Alternatives: exact-email lookup only, or invite-by-email flow.

7. **Attendee check-in timestamps** (§ I.4) — today "check-in time" is approximated by the reservation's `updatedAt`. Does Odoo record per-ticket scan timestamps (`ticket_checkins.scanned_at` exists in the schema and is used by the events aggregates)? If so, Route 93 should use real scan times.

8. **`checkedIn` as a reservation status** — the admin app treats check-in as a reservation *status* (`pending → confirmed → checkedIn`), while the schema also has per-ticket check-ins. Confirm the Odoo model, since Route 92 writes that status directly.

9. **Public routes auth** (§ A.1) — none / static API key / something else? Also confirm cache headers for public routes (`Cache-Control: public, max-age=60` is fine for all of § P).

10. **Payouts** (§ J.2) — the `payouts` table exists but we don't know if anything populates it today. Is payouts data real in Odoo, or should routes 96–97 return empty arrays until the payouts pipeline exists?

11. **Provisioning trigger** (§ B.2) — the app currently provisions on first authenticated page load. If the API team prefers a Clerk webhook → Odoo flow instead, Route 61 becomes a no-op fallback; both are fine, but Route 60 must never 500 for a just-signed-up user.

12. **Uploads** (§ O.1) — direct multipart to the API, or pre-signed URLs like Phase 2 § P.6? Multipart is simpler for us; pick one.

---

## U. Mapping back to the admin codebase

For traceability — each route replaces these functions (all under `src/`):

| Routes  | Replaces (file → function)                                                                                     |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| 60      | `lib/data/role.ts:getUserRole`, `app/api/me/role/route.ts`, `middleware.ts:checkOnboardingNeeded/getUserRole`, `lib/data/events.ts:getOrganizerForCurrentUser`, `lib/actions/events.ts:fetchOrganizerContact` |
| 61      | `lib/provisioning/userProvisioning.ts:provisionUser` (+ `/api/provision/me`, `SupabaseClerkBridge.tsx` trigger) |
| 62–63   | `lib/actions/profile.ts:fetchProfile/updateProfileAction`                                                        |
| 64–65   | `lib/actions/organizer.ts:fetchOrganizerForOnboarding/completeOnboardingAction`                                  |
| 66      | `lib/data/venueStats.ts:getVenueOrganizer`, `lib/actions/venueDetail.ts:fetchVenueOrganizer`                     |
| 67      | `lib/actions/venueEdit.ts:updateOrganizerAction`                                                                 |
| 68–70   | `lib/data/gallery.ts:getOrganizerGallery/addOrganizerGalleryItem/removeOrganizerGalleryItem`, `lib/actions/venueEdit.ts:fetchOrganizerGallery/addGalleryImage/removeGalleryImage` |
| 71–72   | `lib/data/tags.ts:getOrganizerTags/setOrganizerTags`, `lib/actions/venueEdit.ts:fetchOrganizerTags/syncOrganizerTags` |
| 73      | `lib/data/events.ts:getTags`, `lib/data/tags.ts:getTagsByType`, `lib/actions/events.ts:fetchTagsForSelect`, `lib/actions/venueEdit.ts:fetchTagsByType` |
| 74      | `lib/actions/events.ts:createCustomTagAction`                                                                    |
| 75      | `lib/data/events.ts:getEvents`                                                                                   |
| 76      | `lib/data/events.ts:getEvent`, `lib/actions/events.ts:fetchEventForEdit`                                         |
| 77      | `lib/data/events.ts:getEventOverview`                                                                            |
| 78      | `lib/actions/events.ts:createEventAction` (+ `lib/data/events.ts:createEvent`)                                   |
| 79      | `lib/actions/events.ts:updateEventAction`                                                                        |
| 80      | `lib/actions/events.ts:deleteEventAction` (+ `lib/data/events.ts:deleteEvent`)                                   |
| 81      | `lib/data/venues.ts:getVenues/getVenuesForSelect`, `lib/actions/venues.ts:fetchVenuesForSelect`                  |
| 82      | `lib/actions/venues.ts:createVenueAction` (+ `lib/data/venues.ts:createVenue`)                                   |
| 83      | `lib/data/venues.ts:getVenue/getVenueByOrganizer`, `lib/actions/venues.ts:fetchVenue`                            |
| 84      | `lib/actions/venues.ts:updateVenueAction` (+ `lib/data/venues.ts:updateVenue`)                                   |
| 85      | `lib/actions/venues.ts:deleteVenueAction` (+ `lib/data/venues.ts:deleteVenue`)                                   |
| 86      | `lib/data/venueStats.ts:getVenueStats`, `lib/actions/venueDetail.ts:fetchVenueStats`                             |
| 87      | `lib/data/venueStats.ts:getVenueEvents`, `lib/actions/venueDetail.ts:fetchVenueEvents`                           |
| 88      | `lib/data/venueStats.ts:getSimilarVenues`, `lib/actions/venueDetail.ts:fetchSimilarVenues`                       |
| 89      | `lib/data/venueReviews.ts:getVenueReviews/getVenueReviewsWithStats`, `lib/actions/venueDetail.ts:fetchVenueReviewsWithStats` |
| 90      | `lib/data/orders.ts:getOrders`                                                                                   |
| 91      | `lib/data/orders.ts:getOrderDetail`                                                                              |
| 92      | `lib/actions/orders.ts:updateReservationStatusAction`                                                            |
| 93      | `lib/data/attendees.ts:getAttendees`                                                                             |
| 94      | `lib/data/attendees.ts:getCheckinSummary`                                                                        |
| 95      | `lib/data/finance.ts:getTransactions/getFinanceOverview/computeFinanceStats`                                     |
| 96–97   | `lib/data/payouts.ts:getPayouts/getUpcomingPayouts`                                                              |
| 98      | `lib/data/paymentMethods.ts:getPaymentMethods/getPaymentMethodsByType`                                           |
| 99–101  | `lib/actions/paymentMethods.ts:createPaymentMethodAction/setDefaultPaymentMethodAction/deletePaymentMethodAction`|
| 102     | `lib/data/reviews.ts:getReviews/getReviewsWithStats`                                                             |
| 103–105 | `lib/actions/reviews.ts:toggleReviewLike/replyToReview/removeReviewReply`                                        |
| 106–107 | `lib/actions/reviews.ts:toggleVenueReviewLike/replyToVenueReview`                                                |
| 108     | `lib/data/music.ts:getSongSuggestions`                                                                           |
| 109     | `lib/data/team.ts:getTeamMembers`                                                                                |
| 110     | `lib/data/team.ts:searchAvailableUsers`, `lib/actions/team.ts:searchUsersAction`                                 |
| 111–113 | `lib/actions/team.ts:addTeamMemberAction/updateTeamMemberRoleAction/removeTeamMemberAction`                      |
| 114     | `lib/data/overview.ts:getOverview`                                                                               |
| 115     | `lib/actions/events.ts:uploadEventImageAction/uploadEventMediaAction`, `lib/actions/organizer.ts:uploadOrganizerImageAction` |
| 116     | `lib/data/discover.ts:getPublishedEvents` (+ `getCityData` composition)                                          |
| 117     | `lib/data/discover.ts:getFeaturedEvents`                                                                         |
| 118     | `lib/data/discover.ts:getPublishedEvent`                                                                         |
| 119     | `lib/data/gallery.ts:getEventGallery`                                                                            |
| 120     | `lib/data/discover.ts:getSimilarEvents`                                                                          |
| 121     | `lib/data/discover.ts:getPublishedVenues`                                                                        |
| 122     | `lib/data/discover.ts:getPublishedVenue/getPublishedVenueDetail`                                                 |
| 123     | `lib/data/discover.ts:getEventsAtVenue`                                                                          |
| 124     | `lib/data/discover.ts:getSimilarPublishedVenues`                                                                 |
| 125     | `lib/data/discover.ts:getEventsByOrganizer`                                                                      |
| 126     | `lib/data/discover.ts:getCitiesWithCounts`                                                                       |
| 127     | `lib/data/discover.ts:getPublicTags`                                                                             |

When every route lands, these become removable from this repo: `lib/supabase/*` (admin/client/server/middleware/mutations/token), `lib/SupabaseClerkBridge.tsx`, the inline Supabase clients in `src/middleware.ts` and `src/app/api/me/role/route.ts`, and the `@supabase/*` dependencies — plus the env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (and fallbacks).

**Supabase surface being decommissioned:** 17 tables (`profiles`, `organizers`, `organizer_members`, `organizer_tags`, `organizer_gallery`, `organizer_follows`, `organizer_payment_methods`, `venues`, `venue_reviews`, `events`, `event_tags`, `tags`, `event_gallery`, `event_reviews`, `event_song_suggestions`, `reservations`, `reservation_items`, plus `tickets`, `ticket_checkins`, `payments`, `payouts` read-only), 1 storage bucket (`event-images`), 0 RPCs.

---

## V. Implementation order (recommended)

| Slice    | Routes            | Unblocks                                                                          |
| -------- | ----------------- | ---------------------------------------------------------------------------------- |
| **P3-A** | 60–63             | Middleware/RBAC + profile settings. **Everything else depends on Route 60.**       |
| **P3-B** | 61, 64–65         | Sign-up → onboarding flow for new organizers.                                       |
| **P3-C** | 73–74, 81–85, 115 | Venue CRUD + tag pickers + uploads (create-event prerequisites).                    |
| **P3-D** | 75–80             | Events pages — the core of the dashboard.                                           |
| **P3-E** | 90–94             | Orders + attendees (+ entrance_manager role becomes usable).                        |
| **P3-F** | 95–101            | Finance (+ finance_manager role).                                                   |
| **P3-G** | 102–108           | Reviews moderation + music page (+ dj role).                                        |
| **P3-H** | 66–72, 86–89      | Organizer profile & venue detail pages.                                             |
| **P3-I** | 114, 77           | Dashboards (need aggregates from earlier slices anyway).                            |
| **P3-J** | 116–127           | Public discover site — independent of everything above, can ship anytime.           |

---

## Review checklist (for the API team)

- [ ] § A.2 — organizer-scoping (vs per-creator) decision.
- [ ] § A.1 — public-route auth decision.
- [ ] Error envelope reuse + the 3 new codes (§ A.4) — agree?
- [ ] § A.5 — full-array lists (no cursors) acceptable?
- [ ] Transactional writes for Routes 65, 78, 79 — confirmed?
- [ ] § F — tag-type list reconciled with Phase 2 route 27.
- [ ] § T — answer the 12 open questions.
- [ ] Confirm sequencing per § V.
- [ ] Same Clerk instance as Phases 1–2 (see Phase 2 checklist — the reconciliation question there still stands).



