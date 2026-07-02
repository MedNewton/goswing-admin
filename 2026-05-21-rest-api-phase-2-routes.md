# GoSwing — REST API Phase 2 Route Specs

**Date:** 2026-05-21
**Status:** Draft — ready to hand to OPTIDEEP
**Branch:** `claude/plan-api-migration-BDgRw`
**Complements:** `2026-05-20-rest-api-read-side-migration.md` (the live Phase 1 routes)

This document specifies **every additional REST route the GoSwing mobile app needs** so we can decommission Supabase entirely. Phase 1 wired the 7 read-only event-discovery routes. Phase 2 covers everything else the app uses today — user profile, settings, payment methods, organizers, favorites, reservations, reviews, song suggestions, stories, and the supporting catalogs.

Routes are numbered starting at **8** so the full set (1–59) reads as one contiguous catalog. Phase 1 routes (1–7) are repeated as a quick reference table at the top of § B.

---

## A. Conventions

### A.1 Base & auth

- Base URL: `https://web.gooswing.com` (same as Phase 1).
- Every route requires `Authorization: Bearer <clerk_jwt>` issued by the same Clerk instance the API validates against. Routes with no per-user state (catalog listings) still require a valid signed JWT.
- The JWT's `sub` claim is the canonical user id (`clerk_user_id`). The API derives the acting user from the JWT and **never trusts a `userId` in the request body**.

### A.2 IDs

- All resource ids are UUID v4 strings unless explicitly noted as a slug (`externalId`) or as a Clerk user id (which starts with `user_`).
- Path params accept the UUID. Where Phase 1 already accepts a slug fallback (e.g. `/v1/events/:id`), Phase 2 routes mirror that — any `:eventId` accepts UUID **or** the `externalId` slug.
- `clerk_user_id` is opaque to the client; the API exposes only the JWT-derived user via `/v1/me/*` routes.

### A.3 JSON conventions

- All keys are `camelCase`.
- Timestamps are ISO 8601 UTC strings with millisecond precision (`"2026-06-15T19:00:00.000Z"`).
- Money is integer **cents** (`priceCents: 4500`) plus a `currency` (ISO 4217, uppercase, e.g. `"USD"`, `"EUR"`, `"MAD"`).
- Booleans are real booleans, never `"true"` strings.
- Optional fields use `null`, not omitted keys, when the field is semantically "no value" (Phase 1 mixes these — Phase 2 standardizes on explicit `null`).
- Arrays default to `[]` when empty, never `null`.

### A.4 Error envelope (unchanged from Phase 1)

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": null
  }
}
```

Reserved `code` values:

| Code                   | HTTP | When                                                                          |
| ---------------------- | ---- | ----------------------------------------------------------------------------- |
| `unauthenticated`      | 401  | Missing / invalid / expired JWT                                               |
| `forbidden`            | 403  | Authenticated, but not allowed to act on this resource                        |
| `not_found`            | 404  | Resource doesn't exist (or user can't see it)                                 |
| `validation_failed`    | 400  | Request body / query failed validation — `details` carries `{ field: "…" }`   |
| `conflict`             | 409  | Duplicate / state-violation (e.g. already favorited, already reviewed)        |
| `unprocessable`        | 422  | Request was well-formed but cannot be applied (e.g. ticket sold out, no seats)|
| `rate_limited`         | 429  | Caller is sending too many requests                                           |
| `payment_required`     | 402  | Reserved for future paid flows (not used in Phase 2)                          |
| `upstream_unavailable` | 502  | Odoo or a downstream system is unreachable                                    |
| `internal_error`       | 500  | Unhandled server error                                                        |

Validation responses carry per-field info:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "rating must be between 1 and 5",
    "details": { "field": "rating", "min": 1, "max": 5 }
  }
}
```

### A.5 HTTP status codes

| Method          | Success | Notes                                              |
| --------------- | ------- | -------------------------------------------------- |
| `GET`           | 200     | Resource(s) returned as JSON                        |
| `POST` (create) | 201     | Returns the created resource in the body            |
| `POST` (action) | 200     | Returns action outcome                              |
| `PATCH` / `PUT` | 200     | Returns the updated resource                        |
| `DELETE`        | 204     | No body. (Use 200 + body if there's a useful echo.) |

### A.6 Pagination

Listings that can grow unbounded use **cursor-based** pagination:

- Request: `?limit=20&cursor=<opaque>`
- Response wrapper:
  ```json
  {
    "items": [ ... ],
    "nextCursor": "string | null",
    "hasMore": true
  }
  ```
- Bounded listings (e.g. ticket types for one event) return a **plain array** like Phase 1.
- Default `limit` is documented per route; max `limit` is **100** unless noted.

### A.7 Idempotency for writes

- All `POST` routes that create rows accept an optional `Idempotency-Key` HTTP header (UUID string). When the same key is replayed within 24h, the API returns the original response without creating a duplicate.
- Critical for reservations (§ L.1) to avoid double-bookings on retry.

### A.8 Caching headers

- Catalog routes (`/v1/tags`, `/v1/events`, `/v1/organizers/:id`) may set `Cache-Control: private, max-age=60`.
- User-state routes (`/v1/me/*`, `/v1/me/favorites`, `/v1/me/reservations`) must set `Cache-Control: no-store`.

### A.9 Soft-deleted users

- When a user is deactivated (`accountStatus = "deactivated"`), reads succeed but writes return `403 forbidden` with `code: "account_deactivated"`.
- When deleted (`accountStatus = "deleted"`), every route returns `403 forbidden` with `code: "account_deleted"`.

---

## B. Phase 1 routes (already live — reference only)

| # | Method | Path                                              | Returns                                    |
| - | ------ | ------------------------------------------------- | ------------------------------------------ |
| 1 | GET    | `/v1/events`                                      | `ApiEvent[]`                               |
| 2 | GET    | `/v1/events/:id`                                  | `ApiEvent`                                 |
| 3 | GET    | `/v1/events/:id/ticket-types`                     | `ApiTicketType[]`                          |
| 4 | GET    | `/v1/organizers/:organizerId/events`              | `ApiMiniEvent[]`                           |
| 5 | GET    | `/v1/events/:id/similar`                          | `ApiMiniEvent[]`                           |
| 6 | GET    | `/v1/events/upcoming-by-venue-or-organizer`       | `ApiMiniEvent[]` (with venue)              |
| 7 | GET    | `/v1/events/:id/attendees`                        | `{ attendees: ApiAttendee[], totalCount }` |

Phase 2 extends route **4** with optional `?when=upcoming|past|all` and richer item fields — see § I.5.

---

## C. Profile (current user)

The mobile app shows a profile screen, an edit-profile screen, and an onboarding gate that needs to persist initial profile fields right after sign-up.

### C.1 GET `/v1/me/profile`

Returns the current user's profile (or initialises a stub on first call — see § C.2 for the explicit init route).

**Response 200**

```json
{
  "id": "user_2abc123XYZ",
  "displayName": "Med Ben",
  "avatarUrl": "https://cdn.gooswing.com/avatars/abc.jpg",
  "email": "med@example.com",
  "phone": "+212600000000",
  "phoneVerified": true,
  "city": "Tangier",
  "countryCode": "MA",
  "occupation": "Designer",
  "profileVisibility": "public",
  "accountStatus": "active",
  "interests": [
    { "tagId": "55b0…", "tagLabel": "Live Music", "tagSlug": "live-music" }
  ],
  "stats": {
    "attendedCount": 4,
    "savedCount": 12,
    "reviewsCount": 2
  },
  "createdAt": "2026-04-01T09:30:00.000Z",
  "updatedAt": "2026-05-21T14:12:00.000Z",
  "deactivatedAt": null,
  "deletedAt": null
}
```

**Notes**

- `id` is the Clerk user id (`sub` of the JWT). Echoed for the client's convenience.
- `profileVisibility` ∈ `"public" | "private"`.
- `accountStatus` ∈ `"active" | "deactivated" | "deleted"`.
- `stats` is computed on the server (joins reservations, favorites, reviews).
- `interests` is sorted by `tagLabel` ascending.

**Errors:** `401 unauthenticated`.

---

### C.2 POST `/v1/me/profile/init`

Idempotent upsert — called once right after sign-up to seed the profile + defaults. Safe to call multiple times; subsequent calls do **not** overwrite existing values.

**Request body**

```json
{
  "displayName": "Med Ben",
  "email": "med@example.com",
  "avatarUrl": "https://example.com/img.jpg",
  "phone": "+212600000000",
  "location": "Tangier"
}
```

All fields optional. The API also:

- Creates the matching `user_settings` row with defaults (see § D).
- Creates the matching `notification_preferences` row with defaults (see § E).

**Response 200** — Returns the resulting `Profile` (same shape as § C.1).

**Errors:** `401`, `400 validation_failed`.

---

### C.3 PATCH `/v1/me/profile`

Partial update.

**Request body** — any subset of:

```json
{
  "displayName": "string",
  "avatarUrl": "string | null",
  "email": "string | null",
  "phone": "string | null",
  "phoneVerified": true,
  "city": "string | null",
  "countryCode": "string (ISO-3166-1 alpha-2) | null",
  "occupation": "string | null",
  "profileVisibility": "public | private"
}
```

**Response 200** — Returns the updated profile (§ C.1 shape).

**Errors:** `401`, `400 validation_failed`, `403 forbidden`.

---

### C.4 POST `/v1/me/profile/onboarding-complete`

Convenience route used by `updateProfileFromOnboarding`. Applies phone + location + initial pref toggles in one call. Distinct from PATCH because it also touches `user_settings`.

**Request body**

```json
{
  "phone": "string | null",
  "location": "string | null",
  "pushNotificationsEnabled": true,
  "locationServicesEnabled": false
}
```

All fields optional.

**Response 200**

```json
{
  "profile": { ... },        // § C.1 shape
  "settings": { ... }        // § D.1 shape
}
```

**Errors:** `401`, `400 validation_failed`.

---

### C.5 POST `/v1/me/profile/deactivate`

Marks the user as `deactivated`. Reservations remain valid; the user can reactivate by signing in via Clerk and calling `PATCH /v1/me/profile { profileVisibility: "public" }` plus a server-side `reactivate` flag (out of scope here — the mobile app doesn't currently expose reactivation).

**Request body:** none.

**Response 200**

```json
{
  "accountStatus": "deactivated",
  "deactivatedAt": "2026-05-21T14:30:00.000Z"
}
```

**Errors:** `401`, `409 conflict` if already deactivated.

---

### C.6 POST `/v1/me/profile/delete`

Marks the account as `deleted`. The API should also:

- Cancel any future reservations (server side).
- Soft-delete (or anonymize) reviews, song suggestions, stories.
- Wipe payment methods.

**Request body:** none. (Optional: `{ "reason": "string" }` for analytics.)

**Response 200**

```json
{
  "accountStatus": "deleted",
  "deletedAt": "2026-05-21T14:30:00.000Z"
}
```

**Errors:** `401`, `409 conflict` if already deleted.

---

## D. User settings

Quick-toggle settings (push notifs, location, payment defaults).

### D.1 GET `/v1/me/settings`

**Response 200**

```json
{
  "userId": "user_2abc123XYZ",
  "pushNotificationsEnabled": true,
  "locationServicesEnabled": false,
  "loginNotificationsEnabled": false,
  "savePaymentInfo": true,
  "autoReloadWallet": false,
  "emailReceipts": true,
  "createdAt": "2026-04-01T09:30:00.000Z",
  "updatedAt": "2026-05-21T14:12:00.000Z"
}
```

If the row doesn't exist, the API returns the defaults defined in `types/domain.ts:DEFAULT_USER_SETTINGS` (still 200, with `createdAt`/`updatedAt` either `null` or the row creation time after lazy-init).

**Errors:** `401`.

---

### D.2 PATCH `/v1/me/settings`

Partial update.

**Request body** — any subset of the 6 boolean fields above.

**Response 200** — Updated settings (§ D.1 shape).

**Errors:** `401`, `400 validation_failed`.

---

## E. Notification preferences

Granular push / email / SMS toggles and quiet hours.

### E.1 GET `/v1/me/notification-preferences`

**Response 200**

```json
{
  "userId": "user_2abc123XYZ",
  "pushEnabled": true,
  "pushEventReminders": true,
  "pushEventUpdates": true,
  "pushNewFollowers": true,
  "pushEventRecommendations": true,
  "emailEnabled": true,
  "emailWeeklyDigest": true,
  "emailEventInvites": true,
  "emailPromotions": false,
  "emailNewsletter": false,
  "smsEnabled": false,
  "smsUrgentUpdates": false,
  "smsEventCancellations": true,
  "personalizedAds": true,
  "locationBasedSuggestions": true,
  "quietHoursEnabled": false,
  "quietHoursStart": null,
  "quietHoursEnd": null,
  "createdAt": "2026-04-01T09:30:00.000Z",
  "updatedAt": "2026-05-21T14:12:00.000Z"
}
```

`quietHoursStart` / `quietHoursEnd` are `"HH:MM"` strings (24h) or `null`.

**Errors:** `401`.

---

### E.2 PATCH `/v1/me/notification-preferences`

Partial update — any subset of the boolean / time fields.

**Validation**

- `quietHoursStart` / `quietHoursEnd` must match `^([01]\d|2[0-3]):[0-5]\d$` when not null.
- If `quietHoursEnabled` is `true`, both start and end must be non-null.

**Response 200** — Updated preferences (§ E.1 shape).

**Errors:** `401`, `400 validation_failed`.

---

## F. Payment methods

The app stores a card listing (last 4 digits, brand, exp, default flag). The actual PCI data lives in Stripe (or similar) — this endpoint stores the display info only.

### F.1 GET `/v1/me/payment-methods`

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "user_2abc123XYZ",
      "provider": "stripe",
      "providerPaymentMethodId": "pm_1OZxYz…",
      "cardBrand": "visa",
      "cardLastFour": "4242",
      "cardExpMonth": 12,
      "cardExpYear": 2029,
      "cardholderName": "MED BEN",
      "isDefault": true,
      "createdAt": "2026-04-12T10:00:00.000Z",
      "updatedAt": "2026-04-12T10:00:00.000Z"
    }
  ]
}
```

- `provider` ∈ `"stripe" | "other"`.
- `cardBrand` ∈ `"visa" | "mastercard" | "amex" | "discover" | "other"`.
- Items sorted by `isDefault desc, createdAt desc`.

**Errors:** `401`.

---

### F.2 POST `/v1/me/payment-methods`

**Request body**

```json
{
  "provider": "stripe",
  "providerPaymentMethodId": "pm_1OZxYz…",
  "cardBrand": "visa",
  "cardLastFour": "4242",
  "cardExpMonth": 12,
  "cardExpYear": 2029,
  "cardholderName": "MED BEN",
  "isDefault": true
}
```

If `isDefault: true`, the API must unset `isDefault` on every other card for this user (single-default invariant).

**Response 201** — Returns the created payment method (§ F.1 item shape).

**Errors:** `401`, `400 validation_failed`, `409 conflict` (duplicate `providerPaymentMethodId`).

---

### F.3 POST `/v1/me/payment-methods/:id/default`

Sets the given payment method as the default. Unsets the previous default.

**Response 200** — Updated payment method.

**Errors:** `401`, `404 not_found`.

---

### F.4 DELETE `/v1/me/payment-methods/:id`

**Response 204**.

If the deleted method was the default and any other methods remain, the API should promote the most-recently-created remaining method to default.

**Errors:** `401`, `404 not_found`.

---

## G. Login history

Read-only feed of sign-in events for the security tab. The recording side (writing rows on each sign-in) is server-side and out of this client spec.

### G.1 GET `/v1/me/login-history`

**Query params**

| Name     | Type    | Default | Notes                |
| -------- | ------- | ------- | -------------------- |
| `limit`  | integer | 20      | 1..100               |
| `cursor` | string  | —       | Opaque, from prev response |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "user_2abc123XYZ",
      "loggedInAt": "2026-05-21T08:14:23.000Z",
      "ipAddress": "82.13.45.6",
      "userAgent": "GoSwing/1.0 iOS",
      "deviceType": "mobile",
      "location": "Tangier, MA",
      "sessionId": "sess_abc…",
      "wasSuccessful": true,
      "failureReason": null
    }
  ],
  "nextCursor": "string | null",
  "hasMore": false
}
```

`deviceType` ∈ `"mobile" | "desktop" | "tablet" | "unknown"`.

**Errors:** `401`.

---

## H. User interests

Tag-based interests. The catalog of tags is § H' below (route 27). User interests reference catalog tag ids.

### H.1 GET `/v1/me/interests`

**Response 200**

```json
{
  "items": [
    {
      "userId": "user_2abc123XYZ",
      "tagId": "uuid",
      "tagLabel": "Live Music",
      "tagSlug": "live-music",
      "createdAt": "2026-04-12T10:00:00.000Z"
    }
  ]
}
```

Sorted by `tagLabel` ascending. Always returns 200 with an array (possibly empty); never 404.

**Errors:** `401`.

---

### H.2 PUT `/v1/me/interests`

Replace the user's full interest set in one call (matches the onboarding flow).

**Request body**

```json
{ "tagIds": ["uuid", "uuid", "..."] }
```

The API validates that every id exists in the tag catalog and has `type = "interest"` (or whatever tag-type filter applies).

**Response 200** — Returns the resulting interest list (§ H.1 shape).

**Errors:** `401`, `400 validation_failed` (`details.field: "tagIds"`, `details.invalidIds: [...]`).

---

### H.3 POST `/v1/me/interests/:tagId`

Add a single interest (idempotent — re-adding succeeds with 200).

**Response 200** — Returns the resulting interest list.

**Errors:** `401`, `404 not_found` (tag doesn't exist).

---

### H.4 DELETE `/v1/me/interests/:tagId`

Remove a single interest.

**Response 204**.

**Errors:** `401`, `404 not_found`.

---

## H'. Tags catalog (route 27)

Used by the interests selection page and (optionally) for filter UIs.

### 27. GET `/v1/tags`

**Query params**

| Name   | Type   | Default | Notes                                                          |
| ------ | ------ | ------- | -------------------------------------------------------------- |
| `type` | string | —       | Optional. One of `interest`, `category`, `music`, `party`, `access`. Omit to return all. |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "live-music",
      "label": "Live Music",
      "type": "interest",
      "emoji": "🎵"
    }
  ]
}
```

Sorted by `label` ascending. `emoji` is optional (`string | null`).

**Errors:** `401`, `400 validation_failed` if `type` is unknown.

---

## I. Organizers

Phase 1 returns organizer name + id embedded on each event. Phase 2 adds the full organizer profile, gallery, reviews, follow state, and similar-organizer suggestions.

### I.1 GET `/v1/organizers/:id`

Full organizer profile + computed stats + follow state for the current user.

**Response 200**

```json
{
  "id": "uuid",
  "name": "Tanjazz Productions",
  "tagline": "Bringing world music to Morocco",
  "about": "Long-form bio HTML or plain string…",
  "logoUrl": "https://cdn.gooswing.com/orgs/tanjazz/logo.png",
  "coverImageUrl": "https://cdn.gooswing.com/orgs/tanjazz/cover.jpg",
  "establishedYear": 2003,
  "isVerified": true,
  "city": "Tangier",
  "countryCode": "MA",
  "phone": "+212600000000",
  "email": "contact@tanjazz.ma",
  "websiteUrl": "https://tanjazz.ma",
  "instagramHandle": "@tanjazz",
  "facebookHandle": "tanjazzofficial",
  "tiktokHandle": null,
  "youtubeHandle": null,
  "twitterHandle": null,
  "pinterestHandle": null,
  "snapchatHandle": null,
  "googleBusinessUrl": null,
  "specialties": ["jazz", "world-music", "festivals"],
  "cancellationPolicy": "Full refund up to 48h before…",
  "refundPolicy": "Standard refund policy applies.",
  "responseTimeHours": 12,
  "customPolicies": [
    { "title": "Photo policy", "body": "No flash photography." }
  ],
  "stats": {
    "avgRating": 4.6,
    "reviewCount": 38,
    "eventCount": 12,
    "followerCount": 1240,
    "totalAttendees": 4520,
    "successRate": 91.7
  },
  "isFollowing": true,
  "createdAt": "2025-01-15T08:00:00.000Z",
  "updatedAt": "2026-05-10T14:00:00.000Z"
}
```

`isFollowing` is computed against the JWT subject. Unauthenticated callers shouldn't reach this route (auth is required), but the field is included so the client doesn't need an extra request.

**Validation**

- `responseTimeHours` is an integer in `1..168` or `null`.
- `establishedYear` is an integer in `1900..currentYear` or `null`.
- Social handles are stored verbatim (`@tanjazz` or plain `tanjazz`) — client renders as-is.

**Errors:** `401`, `404 not_found`.

---

### I.2 GET `/v1/organizers/:id/summary`

Lightweight summary used by EventDetailsPage's "Organizer" section. Smaller payload than § I.1.

**Response 200**

```json
{
  "organizerId": "uuid",
  "logoUrl": "https://…",
  "followerCount": 1240,
  "avgRating": 4.6,
  "isFollowing": true,
  "cancellationPolicy": "string | null",
  "refundPolicy": "string | null"
}
```

**Errors:** `401`, `404 not_found`.

---

### I.3 GET `/v1/organizers/:id/gallery`

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "imageUrl": "https://cdn.gooswing.com/orgs/tanjazz/g1.jpg",
      "caption": "Tanjazz 2024 — opening night",
      "createdAt": "2024-07-12T20:00:00.000Z",
      "mediaType": "image"
    },
    {
      "id": "uuid",
      "imageUrl": "https://cdn.gooswing.com/orgs/tanjazz/v1.mp4",
      "caption": null,
      "createdAt": "2024-07-12T20:00:00.000Z",
      "mediaType": "video"
    }
  ]
}
```

`mediaType` ∈ `"image" | "video"`. Sorted by organizer-defined `sortOrder asc`, then `createdAt desc` as tie-breaker.

**Errors:** `401`, `404 not_found`.

---

### I.4 GET `/v1/organizers/:id/reviews`

Aggregates reviews across all of this organizer's events.

**Query params**

| Name     | Type    | Default | Notes               |
| -------- | ------- | ------- | ------------------- |
| `limit`  | integer | 50      | 1..100              |
| `cursor` | string  | —       | Opaque              |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "user_2abc…",
      "userName": "Alice",
      "userAvatarUrl": "https://…",
      "rating": 5,
      "comment": "Incredible night!",
      "eventId": "uuid",
      "eventTitle": "Tanjazz Festival 2024",
      "createdAt": "2024-07-13T08:00:00.000Z"
    }
  ],
  "nextCursor": "string | null",
  "hasMore": false
}
```

`rating` ∈ `1..5`. Sorted by `createdAt desc`. Excludes drafts (`comment` blank) and reviews on cancelled events.

**Errors:** `401`, `404 not_found`.

---

### I.5 GET `/v1/organizers/:id/events` (extended from Phase 1 Route 4)

Phase 1 returned the mini-card shape with optional `?limit` and `?exclude`. Phase 2 adds:

**Additional query params**

| Name     | Type   | Default     | Notes                                                            |
| -------- | ------ | ----------- | ---------------------------------------------------------------- |
| `when`   | string | `"all"`     | `"upcoming"` (starts_at >= now), `"past"` (ends_at < now), `"all"` |
| `expand` | string | —           | `"details"` to include venue/city/externalId in the item shape   |

**Response 200 (when `expand=details`)**

```json
[
  {
    "id": "uuid",
    "externalId": "tanjazz-festival",
    "title": "Tanjazz Festival 2026",
    "imageUrl": "https://…",
    "startsAtIso": "2026-07-12T20:00:00.000Z",
    "endsAtIso": "2026-07-15T02:00:00.000Z",
    "priceLabel": "From $20",
    "attendeeCount": 320,
    "venue": "Plaza del Toro",
    "city": "Tangier"
  }
]
```

When `expand` is absent the response stays Phase-1-compatible (`{ id, title, imageUrl, startsAtIso, priceLabel, attendeeCount }`).

**Errors:** `401`, `400 validation_failed`, `404 not_found`.

---

### I.6 GET `/v1/organizers/:id/similar`

**Query params**

| Name    | Type    | Default | Notes |
| ------- | ------- | ------- | ----- |
| `limit` | integer | 5       | 1..20 |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Cap Spartel Productions",
      "logoUrl": "https://…",
      "avgRating": 4.4,
      "eventCount": 8,
      "followerCount": 620
    }
  ]
}
```

Algorithm: same `specialties` overlap, then same `city`, then global popularity. Excludes the queried organizer.

**Errors:** `401`, `404 not_found`.

---

## J. Organizer follows

### J.1 PUT `/v1/me/followed-organizers/:organizerId`

Follow an organizer (idempotent).

**Response 200**

```json
{
  "organizerId": "uuid",
  "isFollowing": true,
  "followedAt": "2026-05-21T14:30:00.000Z",
  "followerCount": 1241
}
```

**Errors:** `401`, `404 not_found`.

---

### J.2 DELETE `/v1/me/followed-organizers/:organizerId`

Unfollow (idempotent).

**Response 200**

```json
{
  "organizerId": "uuid",
  "isFollowing": false,
  "followerCount": 1240
}
```

**Errors:** `401`, `404 not_found`.

---

### J.3 GET `/v1/me/followed-organizers`

Powers the SavedPage "Organizers" tab.

**Query params**

| Name     | Type    | Default | Notes |
| -------- | ------- | ------- | ----- |
| `limit`  | integer | 50      | 1..100 |
| `cursor` | string  | —       | Opaque |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Tanjazz Productions",
      "logoUrl": "https://…",
      "followedAt": "2026-05-21T14:30:00.000Z"
    }
  ],
  "nextCursor": "string | null",
  "hasMore": false
}
```

Sorted by `followedAt desc`.

**Errors:** `401`.

---

## K. Event favorites

### K.1 GET `/v1/me/favorites`

Returns favorited events with enough denormalized fields to render the saved card without an extra fetch per event.

**Query params**

| Name     | Type    | Default | Notes |
| -------- | ------- | ------- | ----- |
| `limit`  | integer | 50      | 1..100 |
| `cursor` | string  | —       | Opaque |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Tanjazz Festival 2026",
      "organizer": "Tanjazz Productions",
      "venue": "Plaza del Toro",
      "city": "Tangier",
      "startsAtIso": "2026-07-12T20:00:00.000Z",
      "imageUrl": "https://…",
      "priceLabel": "From $20",
      "favorite": true
    }
  ],
  "nextCursor": "string | null",
  "hasMore": false
}
```

`favorite` is always `true` in this list (kept for client convenience). Sorted by `event_favorites.created_at desc`.

**Errors:** `401`.

---

### K.2 GET `/v1/me/favorites/ids`

Compact id-only listing for hydrating heart icons across the app.

**Response 200**

```json
{ "eventIds": ["uuid", "uuid", "uuid"] }
```

Order matches `created_at desc`.

**Errors:** `401`.

---

### K.3 PUT `/v1/me/favorites/:eventId`

Favorite an event (idempotent). `:eventId` accepts UUID or slug.

**Response 200**

```json
{
  "eventId": "uuid",
  "favorite": true,
  "favoritedAt": "2026-05-21T14:30:00.000Z"
}
```

**Errors:** `401`, `404 not_found`.

---

### K.4 DELETE `/v1/me/favorites/:eventId`

Unfavorite (idempotent — deleting a non-favorite returns 200 with `favorite: false`).

**Response 200**

```json
{ "eventId": "uuid", "favorite": false }
```

**Errors:** `401`, `404 not_found`.

---

## L. Reservations & checkout

The most critical Phase 2 surface. The server is the source of truth for pricing and ticket availability — never trust client prices.

### L.1 POST `/v1/reservations`

Create a reservation with line items, attendees, and billing details. The API:

1. Resolves the event by id-or-slug.
2. Looks up the requested ticket types and their **current** prices.
3. Verifies seat availability for each line.
4. Computes totals server-side (subtotal + service fee + grand total).
5. Inserts `reservation` + `reservation_items` + `tickets` + `ticket_holders` in a single transaction.
6. Sets `status` based on the event's `approvalMode` (`auto` → `confirmed`; anything else → `pending`), unless the caller explicitly pins `status` (and is allowed to — typically `"pending"` is fine).

**Request body**

```json
{
  "eventId": "uuid-or-slug",
  "quantities": {
    "ticket-type-uuid-1": 2,
    "ticket-type-uuid-2": 1
  },
  "attendees": [
    {
      "ticketTypeId": "ticket-type-uuid-1",
      "index": 1,
      "firstName": "Alice",
      "lastName": "Doe",
      "email": "alice@example.com",
      "phoneNumber": "+212600000001",
      "dietaryRestrictions": "vegetarian",
      "emergencyContact": "Bob — +212600000002"
    },
    { "ticketTypeId": "ticket-type-uuid-1", "index": 2, "firstName": "Bob", "lastName": "Doe", "email": "bob@example.com" },
    { "ticketTypeId": "ticket-type-uuid-2", "index": 1, "firstName": "Carol", "lastName": "Doe", "email": "carol@example.com" }
  ],
  "billing": {
    "email": "alice@example.com",
    "firstName": "Alice",
    "lastName": "Doe"
  },
  "status": "pending"
}
```

**Validation rules**

- Every key in `quantities` must be a ticket type belonging to `eventId` and currently inside its sales window.
- `quantities[id]` is an integer ≥ 0; sum of quantities ≥ 1.
- `attendees.length === sum(quantities)`; per-`ticketTypeId` count matches.
- Per attendee: `firstName`, `lastName`, `email` required; email loose-validated.
- `billing.{email, firstName, lastName}` required.
- `status` optional — if present, must be one of `"draft" | "pending" | "confirmed"`. Server may downgrade `"confirmed"` to `"pending"` based on approval mode.
- `Idempotency-Key` header (UUID) **strongly recommended**; replays return the same response.

**Response 201**

```json
{
  "reservationId": "uuid",
  "status": "pending",
  "totals": {
    "totalTickets": 3,
    "subtotalCents": 9000,
    "serviceFeeCents": 1500,
    "totalCents": 10500,
    "currency": "USD"
  }
}
```

**Errors**

| HTTP | Code                  | Trigger                                                      |
| ---- | --------------------- | ------------------------------------------------------------ |
| 400  | `validation_failed`   | Schema / count mismatch                                      |
| 401  | `unauthenticated`     | No JWT                                                       |
| 404  | `not_found`           | Unknown event id                                             |
| 409  | `conflict`            | Idempotency-Key collision with a *different* payload         |
| 422  | `unprocessable`       | `details.reason: "sold_out"` `details.ticketTypeId: "…"` or `details.reason: "outside_sales_window"` |
| 502  | `upstream_unavailable`| Backing system unreachable                                   |

---

### L.2 GET `/v1/me/reservations`

Returns the user's reservations split into active vs past.

**Query params**

| Name        | Type    | Default | Notes                                       |
| ----------- | ------- | ------- | ------------------------------------------- |
| `include`   | string  | —       | `"qr"` to include `qrValue` and `qrCaption` on each ticket. Omitting saves bytes for the listing screen. |
| `limit`     | integer | 50      | Applies to **each** of active and past arrays |
| `cursor`    | string  | —       | Opaque — paginates the **past** list (active is small)      |

**Response 200**

```json
{
  "active": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "eventExternalId": "tanjazz-festival",
      "status": "confirmed",
      "title": "Tanjazz Festival 2026",
      "startsAtIso": "2026-07-12T20:00:00.000Z",
      "endsAtIso": "2026-07-15T02:00:00.000Z",
      "venueName": "Plaza del Toro",
      "venueCity": "Tangier",
      "currency": "USD",
      "totalAmountCents": 10500,
      "savingsCents": 0,
      "orderedAt": "2026-05-21T14:30:00.000Z",
      "totalTickets": 3,
      "items": [
        {
          "id": "uuid",
          "ticketTypeId": "uuid",
          "ticketTypeName": "Early Bird",
          "quantity": 2,
          "unitPriceCents": 3000,
          "lineTotalCents": 6000
        }
      ],
      "tickets": [
        {
          "id": "uuid",
          "reservationItemId": "uuid",
          "ticketNo": 1,
          "ticketCode": "TKT-XYZ123-1716200000000",
          "ticketTypeName": "Early Bird",
          "holder": {
            "firstName": "Alice",
            "lastName": "Doe",
            "email": "alice@example.com"
          }
        }
      ]
    }
  ],
  "past": [ /* same item shape */ ],
  "nextCursor": "string | null",
  "hasMore": false
}
```

When `include=qr` is set, each `tickets[].qrValue` and `tickets[].qrCaption` is included (see § L.3 for the format).

**Splitting rule:** `now < startsAtIso` → active. `now >= endsAtIso` → past. Missing `endsAtIso` → active. Cancelled reservations go to past.

**Errors:** `401`.

---

### L.3 GET `/v1/reservations/:id`

Full reservation detail including QR payload per ticket. Only the owning user can fetch.

**Response 200**

```json
{
  "id": "uuid",
  "status": "confirmed",
  "currency": "USD",
  "totalAmountCents": 10500,
  "subtotalCents": 9000,
  "serviceFeeCents": 1500,
  "orderedAt": "2026-05-21T14:30:00.000Z",
  "event": {
    "id": "uuid",
    "externalId": "tanjazz-festival",
    "title": "Tanjazz Festival 2026",
    "startsAtIso": "2026-07-12T20:00:00.000Z",
    "endsAtIso": "2026-07-15T02:00:00.000Z",
    "venueName": "Plaza del Toro",
    "venueCity": "Tangier",
    "imageUrl": "https://…"
  },
  "items": [
    {
      "id": "uuid",
      "ticketTypeId": "uuid",
      "ticketTypeName": "Early Bird",
      "quantity": 2,
      "unitPriceCents": 3000,
      "lineTotalCents": 6000,
      "benefits": ["Welcome drink", "Priority entry"]
    }
  ],
  "tickets": [
    {
      "id": "uuid",
      "reservationItemId": "uuid",
      "ticketNo": 1,
      "ticketCode": "TKT-XYZ123-1716200000000",
      "ticketTypeName": "Early Bird",
      "unitPriceCents": 3000,
      "currency": "USD",
      "holder": {
        "firstName": "Alice",
        "lastName": "Doe",
        "email": "alice@example.com",
        "phoneNumber": "+212600000001"
      },
      "qrValue": "GSV1:res=uuid;tkt=uuid;n=1;code=TKT-XYZ123-1716200000000",
      "qrCaption": "#1",
      "checkedInAt": null
    }
  ]
}
```

**Notes**

- `qrValue` format is the client's existing `buildTicketQr` payload (`GSV1:...`). The server returns it pre-built so a single round trip is enough to render the ticket modal.
- `tickets[].checkedInAt` is non-null once a door scanner marks the ticket as used.
- `items[].benefits` is the snapshot at purchase time (not the live ticket-type benefits).

**Errors:** `401`, `403 forbidden` (someone else's reservation), `404 not_found`.

---

### L.4 POST `/v1/reservations/:id/cancel`

Currently the mobile app doesn't expose a cancel button. **Optional** for Phase 2 — include if cancellation flows are planned soon. Skip if not.

**Request body**

```json
{ "reason": "string | null" }
```

**Response 200**

```json
{
  "id": "uuid",
  "status": "cancelled",
  "cancelledAt": "2026-05-21T14:30:00.000Z"
}
```

**Errors:** `401`, `403`, `404`, `409 conflict` (already cancelled / refunded / event has started).

---

## M. Event access (current user's reservation state for one event)

Powers the "progress card" on EventDetailsPage (Tickets Purchased → Confirmed → Checked In) and gates the Story / Review / Suggest-songs CTAs.

### M.1 GET `/v1/events/:id/my-access`

`:id` accepts UUID or slug.

**Response 200**

```json
{
  "eventId": "uuid",
  "hasReservation": true,
  "reservationId": "uuid",
  "statusRaw": "confirmed",
  "status": "confirmed",
  "steps": {
    "ticketsPurchased": true,
    "reservationConfirmed": true,
    "checkedIn": false
  },
  "canUseCheckedInActions": false
}
```

**Logic**

- The API picks the user's **best** reservation for that event by status score: `checkedIn(3) > confirmed(2) > pending/unknown(1) > cancelled/refunded(0)`.
- `status` ∈ `"none" | "pending" | "confirmed" | "checkedIn" | "cancelled" | "refunded" | "unknown"`.
- `statusRaw` is the literal DB / Odoo value.
- `canUseCheckedInActions` is `status === "checkedIn"`.

When there's no reservation, the response keeps the same shape with `hasReservation: false`, `reservationId: null`, `status: "none"`, etc.

**Errors:** `401`, `404 not_found` (event doesn't exist).

---

## N. Event reviews

The mobile app supports rating + comment + admin-reply-display.

### N.1 POST `/v1/events/:id/reviews`

Create a review for an event. Per existing schema, **one review per user per event** (unique constraint).

**Request body**

```json
{
  "rating": 5,
  "comment": "string | null",
  "reservationId": "uuid | null"
}
```

`rating` ∈ `1..5`. `comment` ≤ 2000 chars.

**Authorization:** the user must have a `confirmed` or `completed` reservation for the event (verified server-side). Otherwise return `403 forbidden` with `code: "review_not_eligible"`.

**Response 201**

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "userId": "user_2abc…",
  "rating": 5,
  "comment": "Amazing event!",
  "createdAt": "2026-05-21T14:30:00.000Z"
}
```

**Errors:** `401`, `403 forbidden`, `404 not_found`, `409 conflict` (duplicate — user already reviewed).

---

### N.2 GET `/v1/events/:id/reviews/mine`

Returns the current user's review for this event, or `null`.

**Response 200**

```json
{
  "review": {
    "id": "uuid",
    "rating": 5,
    "comment": "Amazing event!",
    "createdAt": "2026-05-21T14:30:00.000Z",
    "updatedAt": "2026-05-21T14:30:00.000Z"
  }
}
```

Or:

```json
{ "review": null }
```

**Errors:** `401`, `404 not_found` (event missing).

---

### N.3 GET `/v1/me/reviews`

All reviews authored by the current user, with the event denormalized for the My Reviews screen.

**Query params**

| Name     | Type    | Default | Notes |
| -------- | ------- | ------- | ----- |
| `limit`  | integer | 50      | 1..100 |
| `cursor` | string  | —       | Opaque |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "eventTitle": "Tanjazz Festival 2026",
      "eventImageUrl": "https://…",
      "eventStartsAtIso": "2026-07-12T20:00:00.000Z",
      "organizerName": "Tanjazz Productions",
      "rating": 5,
      "comment": "Amazing event!",
      "images": ["https://…/a.jpg"],
      "createdAt": "2026-05-21T14:30:00.000Z",
      "updatedAt": "2026-05-21T14:30:00.000Z",
      "helpfulCount": 0,
      "isDraft": false,
      "adminLiked": false,
      "adminReply": "Thank you!",
      "adminReplyAt": "2026-05-22T10:00:00.000Z"
    }
  ],
  "totals": {
    "publishedCount": 12,
    "draftCount": 1,
    "averageRating": 4.6
  },
  "nextCursor": "string | null",
  "hasMore": false
}
```

**Definitions**

- `isDraft`: `comment` is blank or whitespace-only.
- `images`: future use, return `[]` until image attachments ship.
- `helpfulCount`: future use, return `0` until that feature ships.
- `adminLiked`, `adminReply`, `adminReplyAt` come from organizer/admin moderation.
- `totals.averageRating` covers `published` only.

**Errors:** `401`.

---

### N.4 PATCH `/v1/reviews/:id`

Update an existing review.

**Request body** — any subset of:

```json
{ "rating": 5, "comment": "string | null" }
```

**Response 200** — Updated review (same shape as § N.1 response).

**Errors:** `401`, `403 forbidden` (not the author), `404 not_found`.

---

### N.5 DELETE `/v1/reviews/:id`

**Response 204**.

**Errors:** `401`, `403`, `404`.

---

## O. Song suggestions

Users can suggest Deezer tracks for an event (typically while or after attending).

### O.1 POST `/v1/events/:id/song-suggestions`

**Request body**

```json
{
  "deezerTrackId": "string",
  "trackTitle": "Hozho - Rolling on Cliffs",
  "artistName": "Hozho",
  "deezerArtistId": "string | null",
  "deezerAlbumId": "string | null",
  "albumTitle": "string | null",
  "artworkUrl": "https://e-cdns-images.dzcdn.net/images/cover/abc/250x250-000000-80-0-0.jpg",
  "deezerLink": "https://www.deezer.com/track/1234567",
  "reservationId": "uuid | null"
}
```

**Validation**

- `deezerTrackId`, `trackTitle`, `artistName` required.
- One suggestion per `(eventId, userId, deezerTrackId)` — duplicates return 409.

**Authorization:** same as reviews — user must have a confirmed/completed reservation for the event (or admin override).

**Response 201**

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "deezerTrackId": "string",
  "trackTitle": "Hozho - Rolling on Cliffs",
  "artistName": "Hozho",
  "deezerArtistId": "string | null",
  "deezerAlbumId": "string | null",
  "albumTitle": "string | null",
  "artworkUrl": "https://…",
  "deezerLink": "https://…",
  "createdAt": "2026-05-21T14:30:00.000Z"
}
```

**Errors:** `401`, `403 forbidden`, `404 not_found`, `409 conflict`.

---

### O.2 GET `/v1/events/:id/song-suggestions/mine`

Lists the current user's suggestions for one event.

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "deezerTrackId": "string",
      "trackTitle": "string",
      "artistName": "string",
      "deezerArtistId": "string | null",
      "deezerAlbumId": "string | null",
      "albumTitle": "string | null",
      "artworkUrl": "string | null",
      "deezerLink": "string | null",
      "createdAt": "2026-05-21T14:30:00.000Z"
    }
  ]
}
```

Sorted by `createdAt desc`.

**Errors:** `401`, `404 not_found`.

---

### O.3 DELETE `/v1/song-suggestions/:id`

**Response 204**.

**Errors:** `401`, `403 forbidden` (not the author), `404 not_found`.

---

## P. Event stories

Stories are short photo posts that auto-expire after 24h. The original Supabase implementation uploaded to `story-photos` bucket. The new API needs to (a) accept a multipart upload and (b) handle the auto-expiry.

### P.1 POST `/v1/events/:id/stories` — multipart

**Content-Type:** `multipart/form-data` with two parts:

| Part name | Type | Required | Notes                                                       |
| --------- | ---- | -------- | ----------------------------------------------------------- |
| `photo`   | file | yes      | JPEG or PNG, max 8 MB, max 4096×4096                        |
| `meta`    | application/json | yes  | `{ "caption": "string | null", "reservationId": "uuid | null" }` |

**Authorization:** same as reviews / song suggestions — user must have a confirmed/completed reservation for the event.

**Server actions**

1. Validate file (MIME, dimensions, size).
2. Store at `stories/{eventId}/{storyId}.{ext}` (bucket choice is server's — R2 / Supabase Storage / etc.).
3. Insert `event_stories` row with `expiresAt = createdAt + 24h`.
4. Return the row with the public photo URL.

**Response 201**

```json
{
  "id": "uuid",
  "userId": "user_2abc…",
  "eventId": "uuid",
  "photoUrl": "https://cdn.gooswing.com/stories/uuid.jpg",
  "caption": "Pre-show vibes",
  "createdAt": "2026-05-21T14:30:00.000Z",
  "expiresAt": "2026-05-22T14:30:00.000Z"
}
```

**Errors:** `400 validation_failed`, `401`, `403 forbidden`, `404 not_found`, `413 payload_too_large` (with `code: "validation_failed"`, `details.field: "photo"`).

---

### P.2 GET `/v1/events/:id/stories`

Active stories for an event (not expired).

**Query params**

| Name     | Type    | Default | Notes |
| -------- | ------- | ------- | ----- |
| `limit`  | integer | 50      | 1..200 |
| `cursor` | string  | —       | Opaque |

**Response 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "user_2abc…",
      "eventId": "uuid",
      "photoUrl": "https://…",
      "caption": "string | null",
      "createdAt": "2026-05-21T14:30:00.000Z",
      "expiresAt": "2026-05-22T14:30:00.000Z",
      "userName": "Alice",
      "userAvatarUrl": "https://…"
    }
  ],
  "nextCursor": "string | null",
  "hasMore": false
}
```

`userName` and `userAvatarUrl` are denormalized from the author's profile at fetch time (so a profile update reflects on next viewer fetch). Sorted by `createdAt desc`.

**Errors:** `401`, `404 not_found`.

---

### P.3 GET `/v1/events/:id/stories/mine`

The current user's active story for this event (one per user per event by current convention).

**Response 200**

```json
{
  "story": {
    "id": "uuid",
    "photoUrl": "https://…",
    "caption": "string | null",
    "createdAt": "2026-05-21T14:30:00.000Z",
    "expiresAt": "2026-05-22T14:30:00.000Z"
  }
}
```

Or:

```json
{ "story": null }
```

**Errors:** `401`, `404 not_found` (event missing).

---

### P.4 GET `/v1/events/:id/stories/count`

Lightweight active-story count — used by the map pins to show a "n stories" badge without fetching the full list.

**Response 200**

```json
{ "count": 7 }
```

**Errors:** `401`, `404 not_found`.

---

### P.5 DELETE `/v1/stories/:id`

Deletes the story row and removes the underlying file.

**Response 204**.

**Authorization:** only the author can delete.

**Errors:** `401`, `403 forbidden`, `404 not_found`.

---

### P.6 (optional) Pre-signed upload variant

If the operations team prefers offloading the upload from the API to direct-to-storage:

1. `POST /v1/stories/upload-intent` → returns `{ uploadUrl, uploadFields, publicUrl, storyId }`.
2. Client `PUT`s the photo bytes to `uploadUrl`.
3. Client calls `POST /v1/events/:id/stories/finalize { storyId, caption, reservationId }`.

The mobile-app side is happy with either pattern — pick whichever is simpler to operate. Phase 2 implementation should pick **one**, not both.

---

## Q. Validation summary

| Field group                | Constraint                                                          |
| -------------------------- | ------------------------------------------------------------------- |
| Emails                     | Loose RFC-5321 check; max 320 chars                                 |
| Phones                     | E.164 (`+<country><digits>`), 8..15 digits after `+`                |
| Names (first/last)         | 1..80 chars, trimmed                                                |
| Captions / comments        | 0..2000 chars                                                       |
| Ratings                    | Integer 1..5                                                        |
| Currencies                 | ISO 4217, uppercase                                                 |
| Money (`*Cents`)           | Non-negative integer, ≤ `Number.MAX_SAFE_INTEGER`                   |
| Limit params               | 1..100 (1..200 for `/stories`, 1..50 for organizer events)           |
| Slugs (`externalId`)        | `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$`                            |
| Time-of-day (quiet hours)  | `^([01]\d|2[0-3]):[0-5]\d$`                                         |
| Photo (stories)            | MIME `image/jpeg` or `image/png`; max 8 MB; max 4096×4096           |

Failed validation returns:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "rating must be between 1 and 5",
    "details": { "field": "rating", "min": 1, "max": 5 }
  }
}
```

For multi-field failures, return the **first** error (single `field` in details). Bulk reporting is out of scope.

---

## R. Authorization summary

The JWT's `sub` claim is the identity. The API enforces:

| Resource             | Read                     | Write                                        |
| -------------------- | ------------------------ | -------------------------------------------- |
| `/v1/me/*`           | self only                 | self only                                    |
| `/v1/favorites`      | self only                 | self only                                    |
| `/v1/reservations`   | self only                 | self only (creation always uses JWT `sub`)   |
| `/v1/reviews/:id`    | any authenticated user    | author only                                  |
| `/v1/song-suggestions/:id` | any authenticated user | author only                                  |
| `/v1/stories/:id`    | any authenticated user (until expiry) | author only                                  |
| `/v1/organizers/:id` | any authenticated user    | (organizer side — not in this client spec)   |
| `/v1/events/:id`     | any authenticated user    | (organizer side — not in this client spec)   |

`forbidden (403)` is the response for any cross-user write. **Never** include "you're not the owner" details about another user's data in the error body.

For review / song suggestion / story creation, the API additionally checks **eligibility** (`confirmed`/`completed` reservation for the target event) and returns `403 forbidden` with one of the codes:

- `code: "review_not_eligible"`
- `code: "song_suggestion_not_eligible"`
- `code: "story_not_eligible"`

---

## S. Open questions for OPTIDEEP / the API team

1. **Storage choice for stories** (§ P.1) — multipart through the API, or direct-to-R2/S3 via pre-signed URLs (§ P.6)? Multipart is simpler for the mobile client.

2. **Cancel reservations** (§ L.4) — is cancellation in Phase 2 scope or punted to Phase 3? The mobile app doesn't currently expose a cancel button but the schema implies a state machine.

3. **Email verification & password reset** — Phase 2 currently assumes Clerk owns this entirely. Confirm.

4. **Notification delivery** — § E stores preferences; actual push / email / SMS delivery is not specified here. Confirm a separate worker / service owns that.

5. **Organizer-side admin** — `customPolicies`, `adminLiked`, `adminReply` etc. imply an organizer-facing app. Confirm out of scope for this spec.

6. **Webhooks** — Stripe webhooks for payment confirmation, ticket scanner check-in events. The 2026-04-28 doc flagged these as TBD; still TBD here. Need a Phase 2.1 spec for whichever applies.

7. **Tag types** (§ H'.27) — confirm the canonical list (`interest`, `category`, `music`, `party`, `access`) matches the schema OPTIDEEP plans to expose.

8. **Stats freshness** (§ I.1 `stats`) — are these live aggregates per request, or cached / nightly-computed? Either is fine for the client; document the staleness budget.

9. **`successRate` formula** (§ I.1) — currently computed client-side as `publishedEvents / totalEvents * 100`. Is the server's definition the same?

10. **i18n** — error messages currently come back as English strings. The mobile app uses `i18next` and could map error `code` → translated string on the client. Confirm we should keep error messages English-only on the server.

---

## T. Implementation order (recommended)

If the API team needs to ship incrementally, this is the dependency-ordered slicing:

| Slice | Routes                            | Unblocks                                          |
| ----- | --------------------------------- | ------------------------------------------------- |
| **P2-A** | C.* (profile), D.* (settings), E.* (notif prefs) | ProfilePage, AccountSettingsPage, NotificationsPage. Replaces all profile hook stubs. |
| **P2-B** | I.* (organizers) + J.* (follows)  | OrganizerProfilePage, EventDetailsPage org section, SavedPage organizers tab. |
| **P2-C** | K.* (favorites)                   | Heart buttons, SavedPage events tab.              |
| **P2-D** | H.* + H'.27 (interests + tags)    | InterestsSelectionPage onboarding, profile interests display. |
| **P2-E** | F.* (payments), G.* (login history) | PaymentMethodsPage, AccountSettingsPage history section. |
| **P2-F** | L.* (reservations) + M.* (access) | CheckoutPage, ReservationsPage, ReservationDetailsPage, EventDetailsPage progress card. **The biggest single unlock — restores ticketing.** |
| **P2-G** | N.* (reviews)                     | EventDetailsPage review modal, MyReviewsPage.     |
| **P2-H** | O.* (songs), P.* (stories)        | Suggest-songs modal, Capture-story modal, StoriesHeroSlider, story map pins. |

After all slices land, the spec from `2026-04-28-odoo-migration-design.md` § 7 Slice 5 (decommission Supabase) becomes a code-only PR on the mobile side.

---

## U. Quick request/response cheat sheet

| #  | Method | Path                                                        | Returns / 201 body                                            |
| -- | ------ | ----------------------------------------------------------- | ------------------------------------------------------------- |
| 8  | GET    | `/v1/me/profile`                                            | Profile                                                       |
| 9  | POST   | `/v1/me/profile/init`                                       | Profile                                                       |
| 10 | PATCH  | `/v1/me/profile`                                            | Profile                                                       |
| 11 | POST   | `/v1/me/profile/onboarding-complete`                        | `{ profile, settings }`                                       |
| 12 | POST   | `/v1/me/profile/deactivate`                                 | `{ accountStatus, deactivatedAt }`                            |
| 13 | POST   | `/v1/me/profile/delete`                                     | `{ accountStatus, deletedAt }`                                |
| 14 | GET    | `/v1/me/settings`                                           | UserSettings                                                  |
| 15 | PATCH  | `/v1/me/settings`                                           | UserSettings                                                  |
| 16 | GET    | `/v1/me/notification-preferences`                           | NotificationPreferences                                       |
| 17 | PATCH  | `/v1/me/notification-preferences`                           | NotificationPreferences                                       |
| 18 | GET    | `/v1/me/payment-methods`                                    | `{ items: PaymentMethod[] }`                                  |
| 19 | POST   | `/v1/me/payment-methods`                                    | PaymentMethod                                                 |
| 20 | POST   | `/v1/me/payment-methods/:id/default`                        | PaymentMethod                                                 |
| 21 | DELETE | `/v1/me/payment-methods/:id`                                | 204                                                           |
| 22 | GET    | `/v1/me/login-history`                                      | `{ items: LoginHistoryEntry[], nextCursor, hasMore }`         |
| 23 | GET    | `/v1/me/interests`                                          | `{ items: UserInterest[] }`                                   |
| 24 | PUT    | `/v1/me/interests`                                          | `{ items: UserInterest[] }`                                   |
| 25 | POST   | `/v1/me/interests/:tagId`                                   | `{ items: UserInterest[] }`                                   |
| 26 | DELETE | `/v1/me/interests/:tagId`                                   | 204                                                           |
| 27 | GET    | `/v1/tags`                                                  | `{ items: Tag[] }`                                            |
| 28 | GET    | `/v1/organizers/:id`                                        | Organizer (full)                                              |
| 29 | GET    | `/v1/organizers/:id/summary`                                | OrganizerSummary                                              |
| 30 | GET    | `/v1/organizers/:id/gallery`                                | `{ items: OrganizerGalleryImage[] }`                          |
| 31 | GET    | `/v1/organizers/:id/reviews`                                | `{ items: OrganizerReview[], nextCursor, hasMore }`           |
| 32 | GET    | `/v1/organizers/:id/events` (extended)                      | `MiniEvent[]` or `OrganizerEvent[]` per `expand`              |
| 33 | GET    | `/v1/organizers/:id/similar`                                | `{ items: SimilarOrganizer[] }`                               |
| 34 | PUT    | `/v1/me/followed-organizers/:organizerId`                   | `{ organizerId, isFollowing, followedAt, followerCount }`     |
| 35 | DELETE | `/v1/me/followed-organizers/:organizerId`                   | `{ organizerId, isFollowing, followerCount }`                 |
| 36 | GET    | `/v1/me/followed-organizers`                                | `{ items: FollowedOrganizer[], nextCursor, hasMore }`         |
| 37 | GET    | `/v1/me/favorites`                                          | `{ items: SavedEvent[], nextCursor, hasMore }`                |
| 38 | GET    | `/v1/me/favorites/ids`                                      | `{ eventIds: string[] }`                                      |
| 39 | PUT    | `/v1/me/favorites/:eventId`                                 | `{ eventId, favorite, favoritedAt }`                          |
| 40 | DELETE | `/v1/me/favorites/:eventId`                                 | `{ eventId, favorite }`                                       |
| 41 | POST   | `/v1/reservations`                                          | `{ reservationId, status, totals }`                           |
| 42 | GET    | `/v1/me/reservations`                                       | `{ active, past, nextCursor, hasMore }`                       |
| 43 | GET    | `/v1/reservations/:id`                                      | ReservationDetails                                            |
| 44 | POST   | `/v1/reservations/:id/cancel` (optional)                    | `{ id, status, cancelledAt }`                                 |
| 45 | GET    | `/v1/events/:id/my-access`                                  | EventAccess                                                   |
| 46 | POST   | `/v1/events/:id/reviews`                                    | Review                                                        |
| 47 | GET    | `/v1/events/:id/reviews/mine`                               | `{ review: Review | null }`                                   |
| 48 | GET    | `/v1/me/reviews`                                            | `{ items, totals, nextCursor, hasMore }`                      |
| 49 | PATCH  | `/v1/reviews/:id`                                           | Review                                                        |
| 50 | DELETE | `/v1/reviews/:id`                                           | 204                                                           |
| 51 | POST   | `/v1/events/:id/song-suggestions`                           | SongSuggestion                                                |
| 52 | GET    | `/v1/events/:id/song-suggestions/mine`                      | `{ items: SongSuggestion[] }`                                 |
| 53 | DELETE | `/v1/song-suggestions/:id`                                  | 204                                                           |
| 54 | POST   | `/v1/events/:id/stories` (multipart)                        | EventStory                                                    |
| 55 | GET    | `/v1/events/:id/stories`                                    | `{ items: EventStoryWithUser[], nextCursor, hasMore }`        |
| 56 | GET    | `/v1/events/:id/stories/mine`                               | `{ story: EventStory | null }`                                |
| 57 | GET    | `/v1/events/:id/stories/count`                              | `{ count }`                                                   |
| 58 | DELETE | `/v1/stories/:id`                                           | 204                                                           |
| 59 | *(optional)* POST `/v1/stories/upload-intent` + finalize    | See § P.6                                                     |

**Total: 51 new routes** (52 with the optional cancel), bringing the API surface to **58–59 endpoints** including Phase 1.

---

## V. Mapping back to the mobile codebase

For traceability — each Phase 2 route replaces one or more functions currently stubbed in `lib/supabase/*` or `hooks/*`:

| Routes        | Replaces (file → function)                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| 8–13          | `lib/supabase/profile.ts` (initialize, updateProfileFromOnboarding) + `hooks/profile/useProfile.ts`     |
| 14–15         | `hooks/profile/useSettings.ts`                                                                          |
| 16–17         | `hooks/profile/useNotificationPreferences.ts`                                                           |
| 18–21         | `hooks/profile/usePaymentMethods.ts`                                                                    |
| 22            | `hooks/profile/useLoginHistory.ts`                                                                      |
| 23–26         | `hooks/profile/useUserInterests.ts`                                                                     |
| 27            | `pages/InterestsSelectionPage.tsx` (current `supabase.from('tags')` direct query)                       |
| 28            | `lib/supabase/organizers.ts:getOrganizerById`                                                           |
| 29            | `lib/supabase/organizers.ts:getOrganizerSummaryForEvent`                                                |
| 30            | `lib/supabase/organizers.ts:getOrganizerGallery`                                                        |
| 31            | `lib/supabase/organizers.ts:getOrganizerReviews`                                                        |
| 32            | `lib/supabase/organizers.ts:getOrganizerEvents` (extended Route 4)                                     |
| 33            | `lib/supabase/organizers.ts:getSimilarOrganizers`                                                       |
| 34            | `lib/supabase/organizers.ts:followOrganizer`                                                            |
| 35            | `lib/supabase/organizers.ts:unfollowOrganizer`                                                          |
| 36            | `lib/supabase/organizers.ts:listFollowedOrganizers`                                                     |
| 37            | `lib/supabase/saved.ts:listFavoriteEvents`                                                              |
| 38            | `lib/supabase/saved.ts:listFavoriteEventIds`                                                            |
| 39            | `lib/supabase/saved.ts:addFavorite` + `hooks/useEventFavorites.ts:toggle(true)`                         |
| 40            | `lib/supabase/saved.ts:removeFavorite` + `hooks/useEventFavorites.ts:toggle(false)`                     |
| 41            | `lib/supabase/checkout.ts:createReservation`                                                            |
| 42            | `lib/supabase/myReservations.ts:getMyReservations`                                                      |
| 43            | `lib/supabase/reservationDetails.ts:getReservationDetails`                                              |
| 44            | (optional — no current client function; introduces cancellation UI)                                    |
| 45            | `lib/supabase/eventAccess.ts:getEventAccess`                                                            |
| 46            | `lib/supabase/reviews.ts:createEventReview`                                                             |
| 47            | `lib/supabase/reviews.ts:getMyReviewForEvent`                                                           |
| 48            | `lib/supabase/reviews.ts:getMyReviews`                                                                  |
| 49            | `lib/supabase/reviews.ts:updateReview`                                                                  |
| 50            | `lib/supabase/reviews.ts:deleteReview`                                                                  |
| 51            | `lib/supabase/songSuggestions.ts:createDeezerSongSuggestion`                                            |
| 52            | `lib/supabase/songSuggestions.ts:getMySongSuggestionsForEvent`                                          |
| 53            | `lib/supabase/songSuggestions.ts:deleteMySongSuggestionById`                                            |
| 54            | `lib/supabase/stories.ts:createEventStory`                                                              |
| 55            | `lib/supabase/stories.ts:getStoriesWithUserInfo` (+ `getStoriesForEvent` as the lighter variant)        |
| 56            | `lib/supabase/stories.ts:getMyStoryForEvent`                                                            |
| 57            | `lib/supabase/stories.ts:getStoryCountForEvent`                                                         |
| 58            | `lib/supabase/stories.ts:deleteStory`                                                                   |

When every route on the left lands, every function on the right can flip from `[STUB]` back to a real implementation — and Phase 1's `lib/supabase/client.ts` + `lib/SupabaseClerkBridge.tsx` become removable.

---

## Review checklist (for the API team)

- [ ] Auth: confirm the Clerk instance the API trusts. Phase 1 uses `easy-snapper-18.clerk.accounts.dev`. The mobile app is currently on `accurate-magpie-7.clerk.accounts.dev` — this **must** be reconciled before any of these routes are useful end-to-end.
- [ ] Error envelope + code set in § A.4 — agree?
- [ ] Pagination shape in § A.6 — agree?
- [ ] § L.1 — server-side price computation + idempotency-key — agree?
- [ ] § P.1 vs § P.6 — pick one storage flow.
- [ ] § L.4 — in scope?
- [ ] § R — authorization matrix and eligibility checks acceptable?
- [ ] § S — answer the 10 open questions.
- [ ] Confirm timeline / sequencing per § T.
