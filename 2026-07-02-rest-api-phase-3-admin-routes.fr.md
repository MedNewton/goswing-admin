# GoSwing — Spécifications des routes REST API Phase 3 (Tableau de bord admin)

**Date :** 2026-07-02
**Statut :** Brouillon — prêt à être remis à OPTIDEEP
**Application :** `goswing-admin` (tableau de bord organisateur/admin Next.js + site public de découverte)
**Complète :** `2026-05-21-rest-api-phase-2-routes.md` (application mobile, routes 1–59)

Ce document spécifie **chaque route REST dont le tableau de bord admin GoSwing a besoin** afin que cette application puisse abandonner entièrement Supabase, de la même manière que l'application mobile l'a fait lors des Phases 1–2. Il couvre l'intégralité de la surface admin — résolution de session/rôle, provisioning, onboarding, profil organisateur, CRUD des événements, CRUD des lieux, commandes, participants/check-ins, finance (transactions, versements (payouts), moyens de paiement), modération des avis, suggestions de morceaux, gestion d'équipe, la vue d'ensemble du tableau de bord, uploads de médias — **plus** les pages publiques de découverte (non authentifiées) que cette application sert sur `/discover`.

Les routes sont numérotées à partir de **60** afin que le catalogue complet de l'API GoSwing (1–127) se lise comme un ensemble contigu : 1–7 Phase 1, 8–59 Phase 2, 60–127 Phase 3.

Chaque route ci-dessous est tracée jusqu'à la fonction exacte de ce dépôt qu'elle remplace — voir § U à la fin.

---

## A. Conventions

Toutes les conventions de la Phase 2 s'appliquent sans changement, sauf si elles sont remplacées ici. Bref récapitulatif plus les ajouts de la Phase 3 :

### A.1 Base, authentification & espaces de noms

- URL de base : `https://web.gooswing.com` (identique aux Phases 1–2).
- **`/v1/admin/*`** — requiert `Authorization: Bearer <clerk_jwt>`. Le `sub` du JWT est l'utilisateur admin agissant. L'API dérive l'**organisateur** de l'utilisateur agissant à partir de cette identité (voir § A.2) et ne fait jamais confiance à un `organizerId` dans un corps de requête.
- **`/v1/public/*`** — **aucune authentification requise.** Ces routes alimentent les pages publiques `/discover` (rendues côté serveur, visiteurs invités). Si l'équipe API le préfère, un en-tête de clé API statique (`X-Api-Key`) peut être exigé pour celles-ci ; l'application admin peut en envoyer une côté serveur. L'accès anonyme depuis le navigateur n'est *pas* nécessaire — toutes les routes publiques sont appelées depuis le serveur Next.js.
- La même question d'instance Clerk que dans la Phase 2 s'applique : l'application admin doit valider contre la même instance Clerk que celle à laquelle l'API fait confiance.

### A.2 Identité, périmètre organisateur & rôles

Aujourd'hui, le schéma Supabase restreint les données admin de deux manières différentes :

1. `organizers.owner_user_id = <clerk_user_id>` — "l'organisateur que je possède" (utilisé pour l'équipe, les moyens de paiement, l'onboarding, le préremplissage du contact).
2. `events.created_by_user_id` / `venues.created_by_user_id = <clerk_user_id>` — "les lignes que j'ai créées" (utilisé pour le CRUD des événements & des lieux).

Pour l'API, **fusionner les deux en une seule règle : chaque ressource `/v1/admin/*` est restreinte à l'organisateur de l'appelant**, résolu ainsi :

- l'organisateur où `owner_user_id = jwt.sub`, ou
- l'organisateur dont l'appelant est membre (`organizer_members`).

C'est délibéré : cela permet aux membres d'équipe (pas seulement au propriétaire) de voir les événements/lieux de l'organisateur, ce que le filtre actuel par créateur empêche accidentellement. Signalé dans les questions ouvertes du § T — si l'équipe API souhaite plutôt conserver un périmètre strict par créateur, dites-le et nous garderons la parité.

**Rôles** (issus de `organizer_members.role`) : `admin | dj | entrance_manager | finance_manager`.

Règle de résolution (doit correspondre au comportement actuel) :

1. Si l'utilisateur a une ligne `organizer_members` → le `role` de cette ligne (les valeurs invalides sont ramenées à `admin`).
2. Sinon, si l'utilisateur **possède** un organisateur → `admin`.
3. Sinon → `dj` (repli le plus restreint).

L'accès aux routes en fonction du rôle est résumé au § S. Toute route appelée avec un rôle insuffisant renvoie `403 forbidden` avec `code: "role_forbidden"`.

### A.3 Conventions JSON (identiques à la Phase 2)

- clés en camelCase ; horodatages ISO-8601 UTC avec millisecondes ; montants en **cents** entiers + `currency` ISO-4217 en majuscules ; vrais booléens ; `null` explicite pour "pas de valeur" ; `[]` pour les tableaux vides.
- L'interface admin formate toutes les dates/tous les prix côté client — l'API renvoie **uniquement des valeurs brutes** (pas de chaînes préformatées `"$45.00"`, pas de dates préformatées).

### A.4 Enveloppe d'erreur (inchangée par rapport à la Phase 2 § A.4)

Même enveloppe, mêmes codes réservés (`unauthenticated`, `forbidden`, `not_found`, `validation_failed`, `conflict`, `unprocessable`, `rate_limited`, `upstream_unavailable`, `internal_error`). La Phase 3 ajoute deux valeurs de `code` utilisées avec HTTP 403 :

| Code              | HTTP | Quand                                                                  |
| ----------------- | ---- | ---------------------------------------------------------------------- |
| `role_forbidden`  | 403  | Authentifié, mais le rôle de l'appelant ne peut pas utiliser cette route |
| `no_organizer`    | 403  | L'appelant n'a pas d'organisateur (ne devrait pas arriver après le provisioning) |

Et une avec HTTP 422 :

| Code          | HTTP | Quand                                                                     |
| ------------- | ---- | -------------------------------------------------------------------------- |
| `tier_in_use` | 422  | Suppression d'un palier de billets qui a déjà des réservations/billets (§ G) |

### A.5 Pagination

Les jeux de données admin sont restreints à l'organisateur et de petite taille, et l'interface actuelle charge les listes complètes. Donc **les routes de liste de la Phase 3 renvoient des tableaux complets** (`{ "items": [...] }`) sans curseur. Réserver un `?limit=` optionnel sur chaque route de liste pour l'avenir ; si l'équipe API souhaite des plafonds stricts dès le premier jour, plafonner à 1000 et le signaler — le tableau de bord effectue le filtrage/tri côté client et a besoin d'une sémantique "tout".

### A.6 Écritures

- `POST` création → 201 avec la ressource créée (ou son id). `PATCH` → 200 avec la ressource mise à jour. `DELETE` → 204 sans corps.
- Les écritures multi-lignes qui s'étalent aujourd'hui sur plusieurs appels Supabase (événement + paliers + tags + galerie ; onboarding) **doivent être transactionnelles** côté API — tout ou rien.
- En-tête `Idempotency-Key` optionnel sur tous les POST, même sémantique que la Phase 2 § A.7.

---

## B. Session, rôle & provisioning

Remplace : `src/lib/data/role.ts:getUserRole`, `src/app/api/me/role/route.ts`, `src/middleware.ts:checkOnboardingNeeded/getUserRole`, `src/lib/data/events.ts:getOrganizerForCurrentUser`, `src/lib/actions/events.ts:fetchOrganizerContact`, `src/lib/provisioning/userProvisioning.ts:provisionUser`.

### B.1 — Route 60 — GET `/v1/admin/me/context`

Un seul appel qui répond à tout ce dont le middleware et le layout ont besoin à chaque requête : qui suis-je, quel est mon rôle, ai-je besoin de l'onboarding, quel est mon organisateur.

**Réponse 200**

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

**Logique**

- `role` selon la règle de résolution du § A.2.
- `needsOnboarding` vaut `true` quand l'appelant n'a **pas d'organisateur** ou que le champ `city` de l'organisateur est null (c'est l'heuristique actuelle — l'assistant d'onboarding renseigne `city`).
- `organizer` est `null` uniquement quand l'utilisateur n'a jamais été provisionné (alors `needsOnboarding: true`, `role: "dj"`).

Cette route est appelée par le middleware sur la plupart des requêtes — elle doit être **rapide** (mise en cache par utilisateur pendant ~30 s acceptable, `Cache-Control: private, max-age=30`).

**Erreurs :** `401`.

---

### B.2 — Route 61 — POST `/v1/admin/me/provision`

Idempotente. Appelée une seule fois juste après la connexion (l'application la déclenche depuis le navigateur au premier rendu authentifié). Initialise tout ce dont un nouvel utilisateur admin a besoin.

**Corps de la requête** (tout est optionnel — l'API doit privilégier les valeurs dérivées du JWT/de Clerk lorsqu'elles sont présentes) :

```json
{
  "email": "med@example.com",
  "firstName": "Med",
  "lastName": "Ben",
  "imageUrl": "https://img.clerk.com/…"
}
```

**Actions côté serveur (transactionnelles, idempotentes) :**

1. Upsert du profil admin de l'utilisateur : `displayName` = `"firstName lastName"` ou `"User <8 derniers caractères du userId>"`, `initials` (premières lettres de 2 mots du nom au maximum, en majuscules), `email`, `avatarUrl`.
2. Si l'utilisateur ne possède aucun organisateur : créer un organisateur provisoire nommé `"<displayName> Organizer <6 derniers caractères du userId>"` (en cas de collision de nom, ajouter un suffixe à 4 chiffres et réessayer une fois).
3. Garantir une ligne d'adhésion `admin` liant l'utilisateur à cet organisateur.

**Réponse 200**

```json
{ "needsOnboarding": true }
```

`needsOnboarding` suit la même règle que la Route 60.

**Erreurs :** `401`, `409 conflict` uniquement si la création d'organisateur entre en collision deux fois (devrait être pratiquement impossible).

---

## C. Profil admin (utilisateur courant)

Remplace : `src/lib/actions/profile.ts:fetchProfile/updateProfileAction`.

### C.1 — Route 62 — GET `/v1/admin/me/profile`

**Réponse 200**

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

Tous les champs sauf `userId` et `displayName` sont `string | null`.

**Erreurs :** `401`, `404 not_found` (jamais provisionné).

---

### C.2 — Route 63 — PATCH `/v1/admin/me/profile`

**Corps de la requête** — n'importe quel sous-ensemble de :

```json
{
  "displayName": "string (1..100)",
  "email": "string (valid email)",
  "phone": "string (<=30) | null",
  "occupation": "string (<=100) | null",
  "avatarUrl": "string | null"
}
```

**Réponse 200** — profil mis à jour (forme du § C.1).

**Erreurs :** `401`, `400 validation_failed`.

---

## D. Onboarding

Remplace : `src/lib/actions/organizer.ts:fetchOrganizerForOnboarding/completeOnboardingAction`.

L'assistant d'onboarding collecte les informations personnelles, les informations de l'organisateur, le premier lieu et une galerie d'images optionnelle, puis soumet le tout en une seule fois.

### D.1 — Route 64 — GET `/v1/admin/me/onboarding`

Données de préremplissage pour l'assistant. L'API doit se replier sur les valeurs dérivées de Clerk (nom complet, avatar) lorsque les champs du profil sont vides.

**Réponse 200**

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

`organizer` et `venue` sont `null` lorsqu'ils n'existent pas encore. `capacity`, `lat`, `lng` sont `number | null`.

**Erreurs :** `401`.

---

### D.2 — Route 65 — POST `/v1/admin/me/onboarding`

Soumet l'assistant complet. **Transactionnelle.**

**Corps de la requête**

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

Requis : `personal.displayName`, `organizer.name`, `venue.name`. Tout le reste est optionnel/nullable. `organizer.city` se replie sur `venue.city` et vice-versa (dans les deux sens — c'est le comportement actuel).

**Actions côté serveur (dans l'ordre, une seule transaction) :**

1. Mettre à jour le profil de l'appelant (`displayName`, `initials` dérivées, `phone`, `avatarUrl`).
2. Mettre à jour l'organisateur de l'appelant avec tous les champs organisateur. Nom d'organisateur en double → `409 conflict`, `code: "conflict"`, message "An organization with this name already exists".
3. Garantir que la ligne d'adhésion `admin` de l'appelant existe.
4. Upsert du lieu de l'organisateur : si l'organisateur n'a pas encore de lieu, le créer (lié à l'organisateur + l'appelant comme créateur) ; sinon mettre à jour celui qui existe.
5. Si `galleryImageUrls` est présent (non null) : **remplacer** la galerie de l'organisateur — supprimer toutes les lignes, en insérer une par URL avec `mediaType: "image"` et `sortOrder` = index du tableau.

**Réponse 200**

```json
{ "organizerId": "uuid", "venueId": "uuid" }
```

**Erreurs :** `401`, `400 validation_failed`, `409 conflict` (nom d'organisateur en double).

---

## E. Profil organisateur & ressources

Remplace : `src/lib/data/venueStats.ts:getVenueOrganizer`, `src/lib/actions/venueEdit.ts:updateOrganizerAction/fetchOrganizerGallery/addGalleryImage/removeGalleryImage/fetchOrganizerTags/syncOrganizerTags`, `src/lib/data/gallery.ts` (moitié organisateur), `src/lib/data/tags.ts:getOrganizerTags/setOrganizerTags`.

Toutes les routes de cette section opèrent sur **l'organisateur de l'appelant** (dérivé du JWT — pas de `:organizerId` dans le chemin, pas de surface IDOR).

### E.1 — Route 66 — GET `/v1/admin/organizer`

Profil organisateur complet.

**Réponse 200**

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

`specialties` est `string[] | null` ; `establishedYear` `number | null` ; `isVerified` `boolean | null`.

**Erreurs :** `401`, `403 no_organizer`.

---

### E.2 — Route 67 — PATCH `/v1/admin/organizer`

Mise à jour partielle. **Rôle : `admin` uniquement** (propriétaire, membre admin de l'organisation, ou — parité actuelle — le créateur de l'un des lieux de l'organisateur ; nous recommandons de simplifier en propriétaire/admin de l'organisation, signalé au § T).

**Corps de la requête** — n'importe quel sous-ensemble des champs du § E.1 sauf `id`, `isVerified`, `createdAt` :

`name`, `tagline`, `about`, `logoUrl`, `coverImageUrl`, `city`, `countryCode`, `email`, `phone`, `websiteUrl`, `googleBusinessUrl`, `instagramHandle`, `tiktokHandle`, `facebookHandle`, `snapchatHandle`, `twitterHandle`, `youtubeHandle`, `pinterestHandle`, `cancellationPolicy`, `refundPolicy`, `customPolicies`, `specialties`, `establishedYear`.

**Réponse 200** — organisateur mis à jour (forme du § E.1).

**Erreurs :** `401`, `403 role_forbidden`, `400 validation_failed`, `409 conflict` (nom en double).

---

### E.3 — Route 68 — GET `/v1/admin/organizer/gallery`

**Réponse 200**

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

`mediaType` ∈ `"image" | "video"`. Trié par `sortOrder` croissant.

**Erreurs :** `401`, `403 no_organizer`.

---

### E.4 — Route 69 — POST `/v1/admin/organizer/gallery`

**Rôle : `admin`.**

**Corps de la requête**

```json
{
  "url": "https://…",
  "mediaType": "image",
  "caption": "string | null",
  "sortOrder": 3
}
```

`url` requis ; le reste optionnel (`mediaType` vaut `"image"` par défaut, `sortOrder` vaut par défaut la fin de la liste).

**Réponse 201** — l'élément créé (forme d'élément du § E.3).

**Erreurs :** `401`, `403 role_forbidden`, `400 validation_failed`.

---

### E.5 — Route 70 — DELETE `/v1/admin/organizer/gallery/:itemId`

**Rôle : `admin`.** L'élément doit appartenir à l'organisateur de l'appelant.

**Réponse 204.**

**Erreurs :** `401`, `403`, `404 not_found`.

---

### E.6 — Route 71 — GET `/v1/admin/organizer/tags`

Tags liés à l'organisateur de l'appelant.

**Réponse 200**

```json
{
  "items": [
    { "id": "uuid", "label": "Live Music", "slug": "live-music", "type": "music_style" }
  ]
}
```

**Erreurs :** `401`, `403 no_organizer`.

---

### E.7 — Route 72 — PUT `/v1/admin/organizer/tags`

Sémantique de remplacement intégral (supprimer les liens existants, insérer l'ensemble fourni). **Rôle : `admin`.**

**Corps de la requête**

```json
{ "tagIds": ["uuid", "uuid"] }
```

Chaque id doit exister dans le catalogue de tags ; ids invalides → `400 validation_failed` avec `details.invalidIds`.

**Réponse 200** — liste résultante (forme du § E.6).

**Erreurs :** `401`, `403 role_forbidden`, `400 validation_failed`.

---

## F. Catalogue de tags

Remplace : `src/lib/data/events.ts:getTags`, `src/lib/data/tags.ts:getTagsByType`, `src/lib/actions/events.ts:createCustomTagAction`.

### F.1 — Route 73 — GET `/v1/admin/tags`

**Paramètres de requête**

| Nom    | Type   | Défaut  | Notes                                                                    |
| ------ | ------ | ------- | ------------------------------------------------------------------------ |
| `type` | string | —       | Optionnel. L'un de `category`, `party_type`, `music_style`, `extra_service`. Omettre pour tout obtenir. |

**Réponse 200**

```json
{
  "items": [
    { "id": "uuid", "label": "Techno", "slug": "techno", "type": "music_style" }
  ]
}
```

Trié par `type` croissant, `label` croissant.

> ⚠️ Le document de la Phase 2 (§ H'.27, `/v1/tags`) listait les types de tags comme `interest | category | music | party | access`. L'application admin utilise `category | party_type | music_style | extra_service`. Ces listes doivent être réconciliées en **une seule** liste de types canonique — voir § T. Si `/v1/tags` renvoie déjà les bonnes données, la Route 73 peut simplement être `/v1/tags` et ce numéro de route est libéré.

**Erreurs :** `401`, `400 validation_failed` (`type` inconnu).

---

### F.2 — Route 74 — POST `/v1/admin/tags`

Obtenir ou créer un tag personnalisé. Tout utilisateur connecté de l'application admin peut l'appeler (c'est le comportement actuel).

**Corps de la requête**

```json
{ "type": "party_type", "label": "Rooftop Party" }
```

- `type` ∈ `party_type | music_style | extra_service` (les tags `category` personnalisés ne sont **pas** autorisés).
- `label` 1..80 caractères. Le serveur le slugifie (minuscules, tirets, 60 caractères max).
- Si un tag avec le même couple `(type, slug)` existe → le renvoyer avec **200** (pas de doublon).

**Réponse 201** (créé) ou **200** (existait déjà)

```json
{ "id": "uuid", "label": "Rooftop Party", "slug": "rooftop-party", "type": "party_type" }
```

**Erreurs :** `401`, `400 validation_failed`.

---

## G. Événements (CRUD admin + analytique)

Remplace : `src/lib/data/events.ts:getEvents/getEvent/getEventOverview/createEvent/updateEvent/deleteEvent`, `src/lib/actions/events.ts:createEventAction/updateEventAction/deleteEventAction/fetchEventForEdit`.

**Rôle : `admin`** pour toutes les Routes 75–80.

### G.1 — Route 75 — GET `/v1/admin/events`

La page de liste des événements. Restreint à l'organisateur de l'appelant. Trié par `startsAt` décroissant. Inclut les agrégats par événement affichés par les cartes de la liste — calculés côté serveur afin qu'une seule requête suffise à afficher la page.

**Réponse 200**

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

**Définitions des agrégats (calculés côté serveur) :**

- `reservationCount` — réservations avec le statut `confirmed` pour l'événement.
- `songSuggestionsCount` — total des suggestions de chansons pour l'événement.
- `checkedInCount` — check-ins de billets avec le résultat `accepted` pour les billets de l'événement.
- `reviewScore` — note moyenne des avis, arrondie à 1 décimale, `null` s'il n'y a aucun avis.
- `status` ∈ `published | draft | completed | cancelled | live`.
- `partyTypes` / `musicStyles` / `extraServices` — libellés de tags répartis selon le `type` du tag ; `tags` = tous les libellés.

**Erreurs :** `401`, `403 role_forbidden`.

---

### G.2 — Route 76 — GET `/v1/admin/events/:id`

Détail complet de l'événement — une seule route alimente à la fois la page de détail et le formulaire d'édition (champs de l'événement + paliers de billets + ids de tags + galerie + lieu + instantané de l'organisateur).

**Réponse 200**

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

`venue` et `organizer` valent `null` lorsqu'ils ne sont pas définis. `capacity`, `benefits` par palier : `number | null` et `string[]`.

**Erreurs :** `401`, `403 role_forbidden`, `404 not_found` (n'existe pas **ou** n'appartient pas à l'appelant — même 404, ne pas divulguer d'information).

---

### G.3 — Route 77 — GET `/v1/admin/events/:id/overview`

La page d'analytique par événement. Tous les chiffres sont calculés côté serveur.

**Réponse 200**

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

**Définitions :**

- `reservationsCount` — réservations `confirmed`.
- `totalRevenueCents` — somme des totaux des réservations `confirmed`. `currency` provient de ces réservations (à défaut, celle de l'événement).
- `totalTicketsSold` / `ticketSalesBreakdown` — à partir des lignes de réservation des réservations `confirmed`, hors lignes supprimées, regroupées par l'instantané du nom du type de billet.
- `cancellationRate` — `cancelled / (confirmed + cancelled) * 100`, arrondi à 1 décimale, `null` en l'absence de réservations.
- `reviewScore` — moyenne à 1 décimale, `null` s'il n'y a aucun avis.
- `checkedInCount` — check-ins de billets acceptés.

**Erreurs :** `401`, `403 role_forbidden`, `404 not_found`.

---

### G.4 — Route 78 — POST `/v1/admin/events`

Crée un événement avec ses paliers, tags et galerie en **un seul appel transactionnel**.

**Corps de la requête**

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

- `title` requis. `startsAt` doit être dans le futur. `endsAt`, s'il est présent, doit être ≥ 30 minutes après `startsAt`.
- `approvalMode` ∈ `auto | manual`. `publish: true` → statut `published`, sinon `draft`.
- `priceCents` du palier ≥ 0 ; un palier avec `isFree: true` enregistre un prix de 0.
- `venueId`, s'il est présent, doit être un lieu de l'organisateur de l'appelant.

**Dérivé côté serveur (jamais envoyé par le client) :** slug `externalId`, `minPriceCents` (prix minimal des paliers), `isFree` au niveau de l'événement (prix minimal égal à 0), `organizerId`, identité du créateur, `sortOrder` de la galerie (ordre du tableau).

**Réponse 201**

```json
{ "eventId": "uuid" }
```

**Erreurs :** `401`, `403 role_forbidden`, `400 validation_failed`, `404 not_found` (`venueId` invalide).

---

### G.5 — Route 79 — PATCH `/v1/admin/events/:id`

Soumission complète du formulaire d'édition. Même corps que § G.4 (tous les champs optionnels, plus les ids de paliers), avec la sémantique suivante :

- `ticketTiers` — **liste faisant autorité**. Les paliers avec un `id` sont mis à jour ; les paliers sans `id` sont créés ; les paliers existants absents de la liste sont **supprimés**. La suppression d'un palier ayant déjà des réservations ou des billets émis → `422 unprocessable`, `code: "tier_in_use"`, `details.ticketTypeId`.
- `tagIds` — remplacement intégral.
- `galleryItems` — remplacement intégral (`sortOrder` = ordre du tableau).
- `publish` correspond à `status` de la même manière ; envoyer une valeur `"status"` explicite (`published | draft | completed | cancelled`) est également acceptable — choisir une convention et s'y tenir.

**Réponse 200** — le détail complet mis à jour (forme du § G.2).

**Erreurs :** `401`, `403`, `404`, `400`, `422 tier_in_use`.

---

### G.6 — Route 80 — DELETE `/v1/admin/events/:id`

**Réponse 204.** Le serveur doit refuser (`409 conflict`) si l'événement a des réservations confirmées — le comportement actuel des FK Supabase bloque effectivement ce cas ; rendre la règle explicite.

**Erreurs :** `401`, `403`, `404`, `409`.

---

## H. Lieux (CRUD admin + données de la page de détail)

Remplace : `src/lib/data/venues.ts` (tout), `src/lib/data/venueStats.ts:getVenueStats/getVenueEvents/getSimilarVenues`, `src/lib/data/venueReviews.ts`, `src/lib/actions/venues.ts`, `src/lib/actions/venueDetail.ts`.

**Rôle : `admin`** pour l'ensemble du § H.

### H.1 — Route 81 — GET `/v1/admin/venues`

**Paramètres de requête**

| Nom    | Type   | Défaut   | Notes                                                       |
| ------ | ------ | -------- | ------------------------------------------------------------ |
| `view` | string | `"full"` | `"select"` renvoie la forme allégée `{id, name, city}` pour les listes déroulantes, triée par `name` croissant. |

**Réponse 200 (full)** — triée par `createdAt` décroissant :

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

`coverImageUrl` est dénormalisé à partir de l'image de couverture de l'organisateur propriétaire (c'est ce que les cartes de lieux affichent aujourd'hui).

**Réponse 200 (`view=select`)**

```json
{ "items": [ { "id": "uuid", "name": "Plaza del Toro", "city": "Tangier" } ] }
```

**Erreurs :** `401`, `403 role_forbidden`.

---

### H.2 — Route 82 — POST `/v1/admin/venues`

**Corps de la requête**

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

`name` requis (sans espaces superflus, non vide) ; tout le reste est nullable. Le serveur rattache le lieu à l'organisateur de l'appelant et enregistre le créateur.

**Réponse 201**

```json
{ "venueId": "uuid" }
```

**Erreurs :** `401`, `403`, `400 validation_failed`.

---

### H.3 — Route 83 — GET `/v1/admin/venues/:id`

**Réponse 200** — un élément complet du § H.1.

**Erreurs :** `401`, `403`, `404 not_found` (introuvable ou n'appartenant pas à l'appelant).

---

### H.4 — Route 84 — PATCH `/v1/admin/venues/:id`

Tout sous-ensemble des champs du § H.2. **Réponse 200** — le lieu mis à jour.

**Erreurs :** `401`, `403`, `404`, `400`.

---

### H.5 — Route 85 — DELETE `/v1/admin/venues/:id`

**Réponse 204.** Refuser avec `409 conflict` si des événements référencent le lieu.

**Erreurs :** `401`, `403`, `404`, `409`.

---

### H.6 — Route 86 — GET `/v1/admin/venues/:id/stats`

Statistiques d'en-tête de la page de détail du lieu.

**Réponse 200**

```json
{
  "eventCount": 12,
  "totalAttendees": 4520,
  "reviewScore": 4.4,
  "reviewCount": 31,
  "followerCount": 1240
}
```

**Définitions :** `eventCount` — événements ayant lieu dans ce lieu. `totalAttendees` — somme des nombres de participants de ces événements. `reviewScore`/`reviewCount` — avis d'**événements** portant sur les événements tenus dans le lieu (⚠️ pas la table `venue_reviews` — c'est le comportement actuel et intentionnel), moyenne à 1 décimale, `null` en l'absence d'avis. `followerCount` — abonnés de l'organisateur du lieu (0 en l'absence d'organisateur).

**Erreurs :** `401`, `403`, `404`.

---

### H.7 — Route 87 — GET `/v1/admin/venues/:id/events`

Événements dans ce lieu, regroupés pour la section à onglets.

**Réponse 200**

```json
{
  "live": [ { "id": "uuid", "title": "…", "heroImageUrl": "string | null", "startsAt": "…", "endsAt": "… | null", "status": "published", "attendeeCount": 320, "minPriceCents": 4500, "isFree": false, "currency": "MAD" } ],
  "upcoming": [ "same item shape" ],
  "past": [ "same item shape" ],
  "all": [ "same item shape — the full list, startsAt desc" ]
}
```

**Règles de regroupement (par rapport à `now`) :**

- `live` — statut `live`, **ou** statut `published` avec `startsAt <= now` et (`endsAt` null ou `> now`).
- `upcoming` — statut `published` ou `draft`, avec `startsAt > now`.
- `past` — statut `completed`, ou `endsAt <= now`.

**Erreurs :** `401`, `403`, `404`.

---

### H.8 — Route 88 — GET `/v1/admin/venues/:id/similar`

Autres lieux de l'organisateur de l'appelant dans la même ville.

**Paramètres de requête :** `limit` (défaut 6, max 20).

**Réponse 200**

```json
{
  "items": [
    { "id": "uuid", "name": "string", "city": "string | null", "venueType": "string | null", "capacity": 500 }
  ]
}
```

Tableau vide lorsque le lieu n'a pas de ville. Exclut le lieu interrogé.

**Erreurs :** `401`, `403`, `404`.

---

### H.9 — Route 89 — GET `/v1/admin/venues/:id/reviews`

Avis sur le lieu (la table `venue_reviews`) + statistiques agrégées, triés par `createdAt` décroissant.

**Réponse 200**

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

`userName` retombe sur `"Anonymous"` lorsque l'auteur de l'avis n'a pas de profil. `average` est une moyenne à 1 décimale (0 lorsque vide).

**Erreurs :** `401`, `403`, `404`.

---

## I. Commandes & participants

Remplace : `src/lib/data/orders.ts:getOrders/getOrderDetail`, `src/lib/actions/orders.ts:updateReservationStatusAction`, `src/lib/data/attendees.ts:getAttendees/getCheckinSummary`.

**Rôles : `admin` et `entrance_manager`.** Périmètre : les réservations sur les événements de l'organisateur de l'appelant.

### I.1 — Route 90 — GET `/v1/admin/orders`

**Paramètres de requête**

| Nom       | Type   | Notes                                                                       |
| --------- | ------ | ---------------------------------------------------------------------------- |
| `eventId` | uuid   | Optionnel — un seul événement                                                |
| `status`  | string | Optionnel — statut brut : `draft \| pending \| confirmed \| checkedIn \| cancelled \| expired \| refunded` |
| `from`    | ISO ts | Optionnel — `orderedAt >= from`                                               |
| `to`      | ISO ts | Optionnel — `orderedAt <= to`                                                 |

**Réponse 200** — triée par `orderedAt` décroissant :

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

`billing.firstName/lastName/email` sont `string | null` (l'UI affiche "Guest" quand les deux noms sont null).

**Erreurs :** `401`, `403 role_forbidden`.

---

### I.2 — Route 91 — GET `/v1/admin/orders/:id`

Détail complet de la commande (vue tiroir/détail).

**Réponse 200**

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

**Erreurs :** `401`, `403`, `404 not_found` (introuvable ou ne portant pas sur les événements de l'appelant).

---

### I.3 — Route 92 — POST `/v1/admin/orders/:id/status`

Changement de statut manuel (approuver les réservations en attente, marquer comme check-in effectué).

**Corps de la requête**

```json
{ "status": "confirmed" }
```

`status` ∈ `pending | confirmed | checkedIn` — exactement ces trois valeurs (comportement admin actuel ; les annulations/remboursements ne sont pas encore exposés dans le tableau de bord).

**Réponse 200**

```json
{ "id": "uuid", "status": "confirmed" }
```

**Erreurs :** `401`, `403`, `404`, `400 validation_failed` (valeur de statut invalide).

---

### I.4 — Route 93 — GET `/v1/admin/attendees`

Liste des participants ayant effectué leur check-in (la page Participants n'affiche que les réservations avec le statut `checkedIn`).

**Paramètres de requête :** `eventId` (optionnel).

**Réponse 200** — triée par heure de check-in décroissante :

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

- `name` à partir du prénom+nom de facturation (le repli `"Guest"` est géré côté client — renvoyer les noms `null` tels quels via un objet de type `billing` si préféré ; la forme chaîne montrée ici correspond au besoin actuel de l'UI).
- `ticketSummary` — un seul type de billet → son nom ; plusieurs → `"Name xQty"` joints par des virgules ; composé côté serveur (ou renvoyer le tableau brut des lignes — les deux conviennent, en choisir un et le documenter).
- `checkedInAt` — le moment où la réservation est passée à `checkedIn` (aujourd'hui approximé par l'`updatedAt` de la ligne ; si le pipeline du scanner enregistre des horodatages de check-in précis, les préférer).

**Erreurs :** `401`, `403 role_forbidden`.

---

### I.5 — Route 94 — GET `/v1/admin/attendees/checkin-summary`

Compteurs de check-in par événement (alimente aussi la vue d'ensemble du tableau de bord).

**Réponse 200** — événements triés par `startsAt` décroissant, **uniquement les événements avec ≥ 1 réservation** :

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

**Erreurs :** `401`, `403 role_forbidden`.

---

## J. Finance

Remplace : `src/lib/data/finance.ts`, `src/lib/data/payouts.ts`, `src/lib/data/paymentMethods.ts`, `src/lib/actions/paymentMethods.ts`.

**Rôles : `admin` et `finance_manager`.** Portée : l'organisateur de l'appelant.

### J.1 — Route 95 — GET `/v1/admin/finance/transactions`

La liste des transactions + les cartes de statistiques, en un seul appel.

**Paramètres de requête**

| Nom       | Type   | Notes                                                        |
| --------- | ------ | ------------------------------------------------------------- |
| `eventId` | uuid   | Optionnel                                                     |
| `status`  | string | Optionnel — statut **normalisé** : `completed \| pending \| failed` |

**Règle de normalisation (côté serveur) :** statut de réservation `confirmed`/`checkedIn` → `completed` ; `cancelled`/`expired`/`refunded` → `failed` ; tout le reste → `pending`.

**Réponse 200** — trié par `orderedAt` décroissant :

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

- `grossCents` = total de la réservation ; `platformFeeCents` = frais de service ; `netCents` = brut − frais.
- Les totaux de `stats` ne couvrent que les transactions **completed** ; `transactionCount` compte **toutes** les transactions retournées (cette asymétrie correspond au comportement actuel — à conserver).
- `stats` est calculé sur le même ensemble filtré que celui reflété par `items`.

**Erreurs :** `401`, `403 role_forbidden`.

---

### J.2 — Route 96 — GET `/v1/admin/finance/payouts`

**Paramètres de requête :** `status` (optionnel : `pending | processing | completed | failed`).

**Réponse 200** — trié par `createdAt` décroissant :

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

`scheduledAt`, `completedAt`, `periodStart`, `periodEnd` sont de type `string | null`.

**Erreurs :** `401`, `403 role_forbidden`.

---

### J.3 — Route 97 — GET `/v1/admin/finance/payouts/upcoming`

Même forme d'élément que § J.2, filtré sur le statut `pending | processing`, trié par `scheduledAt` croissant.

**Erreurs :** `401`, `403 role_forbidden`.

---

### J.4 — Route 98 — GET `/v1/admin/finance/payment-methods`

**Paramètres de requête :** `type` (optionnel : `payment | withdrawal`).

**Réponse 200** — trié par `createdAt` décroissant :

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

`details` est un objet JSON libre (informations d'affichage uniquement — aucune donnée PCI).

**Erreurs :** `401`, `403 role_forbidden`.

---

### J.5 — Route 99 — POST `/v1/admin/finance/payment-methods`

**Corps de la requête**

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

`methodType` requis (`payment | withdrawal`) ; `provider` vaut `"stripe"` par défaut ; `details` vaut `{}` par défaut. L'organisateur est celui de l'appelant — jamais dans le corps. Si `isDefault: true`, retirer le statut par défaut du précédent moyen de paiement du même `methodType`.

**Réponse 201** — le moyen de paiement créé (forme d'élément du § J.4).

**Erreurs :** `401`, `403`, `400 validation_failed`.

---

### J.6 — Route 100 — POST `/v1/admin/finance/payment-methods/:id/default`

Définit ce moyen de paiement comme défaut ; retire le statut par défaut du précédent **du même `methodType`**.

**Réponse 200** — moyen de paiement mis à jour.

**Erreurs :** `401`, `403`, `404`.

---

### J.7 — Route 101 — DELETE `/v1/admin/finance/payment-methods/:id`

**Réponse 204.**

**Erreurs :** `401`, `403`, `404`.

---

## K. Modération des avis

Remplace : `src/lib/data/reviews.ts:getReviews/getReviewsWithStats`, `src/lib/actions/reviews.ts` (les 5 actions).

**Rôle : `admin`.** Portée : les avis sur les événements / lieux de l'organisateur de l'appelant.

### K.1 — Route 102 — GET `/v1/admin/reviews`

Avis sur les événements + statistiques agrégées.

**Paramètres de requête**

| Nom         | Type    | Notes                          |
| ----------- | ------- | ------------------------------ |
| `eventId`   | uuid    | Optionnel                      |
| `minRating` | integer | Optionnel, 1..5 (`rating >=`)  |

**Réponse 200** — trié par `createdAt` décroissant :

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

`userName` retombe sur `"Anonymous"` par défaut. `stats` couvre le même ensemble filtré que `items`.

**Erreurs :** `401`, `403 role_forbidden`.

---

### K.2 — Route 103 — POST `/v1/admin/reviews/:id/like-toggle`

Bascule le ❤️ de l'organisateur sur un avis.

**Réponse 200**

```json
{ "id": "uuid", "adminLiked": true }
```

**Erreurs :** `401`, `403`, `404`.

---

### K.3 — Route 104 — PUT `/v1/admin/reviews/:id/reply`

**Corps de la requête**

```json
{ "reply": "Thank you! (trimmed, 1..2000 chars)" }
```

**Réponse 200**

```json
{ "id": "uuid", "adminReply": "Thank you!", "adminReplyAt": "2026-07-02T10:00:00.000Z" }
```

**Erreurs :** `401`, `403`, `404`, `400 validation_failed`.

---

### K.4 — Route 105 — DELETE `/v1/admin/reviews/:id/reply`

Efface la réponse (`adminReply`/`adminReplyAt` → null).

**Réponse 200**

```json
{ "id": "uuid", "adminReply": null, "adminReplyAt": null }
```

**Erreurs :** `401`, `403`, `404`.

---

### K.5 — Route 106 — POST `/v1/admin/venue-reviews/:id/like-toggle`

Même contrat que § K.2, appliqué aux avis sur les lieux.

---

### K.6 — Route 107 — PUT `/v1/admin/venue-reviews/:id/reply`

Même contrat que § K.3, appliqué aux avis sur les lieux. Un `DELETE /v1/admin/venue-reviews/:id/reply` correspondant n'existe pas dans l'application actuelle mais devrait être implémenté par symétrie (l'UI en aura besoin à terme).

---

## L. Musique

Remplace : `src/lib/data/music.ts:getSongSuggestions`.

**Rôles : `admin` et `dj`.**

### L.1 — Route 108 — GET `/v1/admin/song-suggestions`

Toutes les suggestions de morceaux sur l'ensemble des événements de l'organisateur de l'appelant.

**Paramètres de requête :** `eventId` (optionnel).

**Réponse 200** — trié par `createdAt` décroissant :

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

**Erreurs :** `401`, `403 role_forbidden`.

---

## M. Gestion d'équipe

Remplace : `src/lib/data/team.ts:getTeamMembers/searchAvailableUsers`, `src/lib/actions/team.ts` (en totalité).

**Rôle : propriétaire de l'organisateur uniquement** (comportement actuel — les mutations résolvent l'organisateur via la propriété, donc les membres org-admin ne peuvent pas gérer l'équipe ; conserver la parité, signalé au § T).

### M.1 — Route 109 — GET `/v1/admin/team`

**Réponse 200** — trié par `joinedAt` croissant :

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

`displayName` retombe sur `"Unknown"` par défaut ; `email`/`avatarUrl` sont de type `string | null`. `role` ∈ l'union des 4 rôles.

**Erreurs :** `401`, `403`.

---

### M.2 — Route 110 — GET `/v1/admin/team/user-search`

Rechercher des utilisateurs de la plateforme à ajouter à l'équipe.

**Paramètres de requête :** `q` (requis, min 2 caractères — en deçà, retourne `{ "items": [] }`).

**Réponse 200** — max 20, **en excluant les membres d'équipe existants** :

```json
{
  "items": [
    { "userId": "user_2abc…", "displayName": "Sara K", "email": "sara@example.com", "avatarUrl": "string | null" }
  ]
}
```

Correspond sur `displayName` ou `email`, sous-chaîne insensible à la casse. ⚠️ Cette recherche porte sur **tous les utilisateurs de la plateforme** (y compris les consommateurs de l'application mobile) — question de confidentialité signalée au § T.

**Erreurs :** `401`, `403`.

---

### M.3 — Route 111 — POST `/v1/admin/team`

**Corps de la requête**

```json
{ "userId": "user_2abc…", "role": "entrance_manager" }
```

`role` ∈ `admin | dj | entrance_manager | finance_manager`. L'API enregistre l'auteur de l'invitation (sub du JWT).

**Réponse 201** — le membre créé (forme d'élément du § M.1).

**Erreurs :** `401`, `403`, `400 validation_failed`, `404 not_found` (utilisateur inconnu), `409 conflict` (déjà membre).

---

### M.4 — Route 112 — PATCH `/v1/admin/team/:memberId`

**Corps de la requête :** `{ "role": "dj" }`.

**Réponse 200** — membre mis à jour.

**Erreurs :** `401`, `403`, `404`, `400`.

---

### M.5 — Route 113 — DELETE `/v1/admin/team/:memberId`

**Réponse 204.** La ligne d'appartenance du propriétaire lui-même ne doit pas pouvoir être supprimée (`409 conflict`).

**Erreurs :** `401`, `403`, `404`, `409`.

---

## N. Vue d'ensemble du tableau de bord

Remplace : `src/lib/data/overview.ts:getOverview`.

**Rôle : `admin`.**

### N.1 — Route 114 — GET `/v1/admin/overview`

Tout ce dont le tableau de bord d'accueil a besoin, en un seul appel.

**Réponse 200**

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

**Définitions (toutes limitées à l'organisateur de l'appelant) :**

- `totalEvents` — nombre total d'événements.
- `totalAttendees` — somme des réservations pointées (checked-in) sur l'ensemble des événements.
- `totalTickets` — nombre total de billets émis.
- `avgRating` — moyenne à 1 décimale sur l'ensemble des avis d'événements (0 s'il n'y en a aucun).
- `totalRevenueCents` — somme des **paiements aboutis** (le registre `payments`, pas les totaux de réservation — voir la note du § T sur les deux définitions du revenu).
- `recentEvents` — les 6 événements les plus récents (trié par `startsAt` décroissant) ; pour chaque élément, `attendeeCount` = nombre de pointés (checked-in), `reservationCount` = total des réservations.

**Erreurs :** `401`, `403 role_forbidden`.

---

## O. Uploads de médias

Remplace : `src/lib/actions/events.ts:uploadEventImageAction/uploadEventMediaAction`, `src/lib/actions/organizer.ts:uploadOrganizerImageAction`. (Aujourd'hui : bucket Supabase Storage `event-images`, préfixes `event-images/`, `event-gallery/`, `organizer-images/`.)

### O.1 — Route 115 — POST `/v1/admin/uploads` — multipart

**Content-Type :** `multipart/form-data`

| Partie | Type | Requis | Notes                                            |
| ------ | ---- | ------ | ------------------------------------------------ |
| `file` | file | oui    | Voir les limites ci-dessous                      |
| `kind` | text | oui    | `eventHero` \| `eventGallery` \| `organizerImage` |

**Limites**

- Images (tous les `kind`) : `image/jpeg`, `image/png`, `image/webp`, `image/gif` — max **5 Mo**.
- Vidéos (**`eventGallery` uniquement**) : `video/mp4`, `video/webm`, `video/quicktime` — max **50 Mo**.

Le serveur stocke le fichier sous un nom UUID (jamais le nom de fichier du client) et retourne une **URL publique permanente**. Le backend de stockage est au choix du serveur (R2/S3/pièces jointes Odoo) — le client ne conserve que l'URL et la transmet ensuite dans `heroImageUrl` / `galleryItems[].url` / les champs d'image de l'organisateur.

**Réponse 201**

```json
{ "url": "https://cdn.gooswing.com/event-images/9b1f….jpg", "mediaType": "image" }
```

`mediaType` ∈ `"image" | "video"`.

**Erreurs :** `401`, `403 role_forbidden`, `400 validation_failed` (type/kind), `413` avec `code: "validation_failed"` (taille).

> Note : les uploads ne font **pas** l'objet d'un nettoyage (garbage collection) aujourd'hui (supprimer une ligne de galerie n'a jamais supprimé l'objet de stockage). Si l'API veut récupérer les orphelins, c'est une préoccupation côté serveur — le contrat client se résume à URL en entrée / URL en sortie.

---

## P. Routes publiques discover (sans auth)

Remplace : `src/lib/data/discover.ts` (en totalité), `src/lib/data/gallery.ts:getEventGallery`.

L'app admin sert également le **site public marketing/discover** (`/discover`, pages villes, pages publiques d'événements et de lieux). Ces pages sont rendues côté serveur pour les visiteurs non connectés, donc les routes ci-dessous doivent fonctionner **sans JWT utilisateur** (voir § A.1 pour l'alternative optionnelle par clé API).

Plusieurs de ces routes recoupent dans l'esprit les routes de la Phase 1 (1–7) mais diffèrent par leur forme et leurs filtres. Si l'équipe API préfère étendre une route de la Phase 1 plutôt que d'en ajouter une nouvelle, c'est acceptable — les formes ci-dessous constituent le contrat dont l'app admin a besoin ; les chemins sont négociables.

**Forme partagée — `PublicEventCard` :**

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

**Forme partagée — `PublicVenue` :**

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

Toutes les listes publiques d'événements ne renvoient que les événements **publiés et à venir** (`startsAt >= now`) triés par `startsAt` croissant, sauf mention contraire.

### P.1 — Route 116 — GET `/v1/public/events`

**Paramètres de requête**

| Nom         | Type    | Notes                                                       |
| ----------- | ------- | ---------------------------------------------------------- |
| `city`      | string  | Correspondance par sous-chaîne insensible à la casse sur la ville du lieu |
| `partyType` | string  | **Slug** de tag ; conserve les événements portant ce tag de type party-type |
| `isFree`    | boolean | `true` → événements gratuits uniquement                     |
| `search`    | string  | Correspondance par sous-chaîne insensible à la casse sur le titre |
| `limit`     | integer | Défaut 50, max 100                                          |
| `offset`    | integer | Pagination par offset (les pages publiques utilisent des numéros de page) |

**Réponse 200 :** `{ "items": [ PublicEventCard ] }`

**Erreurs :** `400 validation_failed`.

---

### P.2 — Route 117 — GET `/v1/public/events/featured`

Événements du carrousel hero : publiés, à venir, **avec une image hero**, triés par `startsAt` croissant.

**Paramètres de requête :** `limit` (défaut 6, max 20).

**Réponse 200 :** `{ "items": [ PublicEventCard ] }`

---

### P.3 — Route 118 — GET `/v1/public/events/:id`

Page publique d'événement. Événements publiés uniquement — un événement en brouillon/annulé renvoie 404.

**Réponse 200**

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

`organizer` / `venue` valent `null` lorsqu'ils ne sont pas définis.

**Erreurs :** `404 not_found`.

---

### P.4 — Route 119 — GET `/v1/public/events/:id/gallery`

**Réponse 200**

```json
{
  "items": [
    { "id": "uuid", "url": "https://…", "mediaType": "image", "caption": "string | null", "sortOrder": 0 }
  ]
}
```

Trié par `sortOrder` croissant.

**Erreurs :** `404 not_found`.

---

### P.5 — Route 120 — GET `/v1/public/events/:id/similar`

Événements publiés à venir, en excluant l'événement interrogé, **même ville de lieu de préférence** (lorsque le lieu de l'événement a une ville, filtrer sur celle-ci).

**Paramètres de requête :** `limit` (défaut 6, max 20).

**Réponse 200 :** `{ "items": [ PublicEventCard ] }`

**Erreurs :** `404 not_found`.

---

### P.6 — Route 121 — GET `/v1/public/venues`

**Paramètres de requête**

| Nom         | Type    | Notes                                         |
| ----------- | ------- | --------------------------------------------- |
| `venueType` | string  | Correspondance exacte insensible à la casse   |
| `city`      | string  | Correspondance exacte insensible à la casse   |
| `search`    | string  | Correspondance par sous-chaîne insensible à la casse sur le nom |
| `limit`     | integer | Défaut 50, max 100                            |
| `offset`    | integer | Pagination par offset                         |

**Réponse 200 :** `{ "items": [ PublicVenue ] }` trié par `name` croissant.

---

### P.7 — Route 122 — GET `/v1/public/venues/:id`

Page publique de lieu.

**Réponse 200**

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

**Erreurs :** `404 not_found`.

---

### P.8 — Route 123 — GET `/v1/public/venues/:id/events`

Événements publiés à venir dans ce lieu, triés par `startsAt` croissant.

**Réponse 200 :** `{ "items": [ PublicEventCard ] }`

**Erreurs :** `404 not_found`.

---

### P.9 — Route 124 — GET `/v1/public/venues/:id/similar`

Lieux dans la même ville (insensible à la casse), en excluant le lieu interrogé. Vide lorsque le lieu n'a pas de ville.

**Paramètres de requête :** `limit` (défaut 6, max 20).

**Réponse 200 :** `{ "items": [ PublicVenue ] }`

**Erreurs :** `404 not_found`.

---

### P.10 — Route 125 — GET `/v1/public/organizers/:id/events`

Événements publiés d'un organisateur (section publique organisateur sur les pages d'événements).

**Paramètres de requête :** `exclude` (uuid d'événement, optionnel), `limit` (défaut 6, max 20).

**Réponse 200 :** `{ "items": [ PublicEventCard ] }` trié par `startsAt` croissant.

**Erreurs :** `404 not_found`.

---

### P.11 — Route 126 — GET `/v1/public/cities`

Villes avec du contenu, pour les cartes de villes / pages villes.

**Réponse 200** — trié par `(eventCount + venueCount)` décroissant :

```json
{
  "items": [
    { "city": "Tangier", "eventCount": 14, "venueCount": 6 }
  ]
}
```

`eventCount` compte les événements publiés à venir dont le lieu est dans la ville ; `venueCount` compte les lieux dans la ville.

---

### P.12 — Route 127 — GET `/v1/public/tags`

**Paramètres de requête :** `type` (requis — même liste de types que la Route 73).

**Réponse 200 :** `{ "items": [ { "id", "label", "slug", "type" } ] }` trié par `label` croissant.

**Erreurs :** `400 validation_failed`.

---

## Q. Récapitulatif de validation

Le § Q de la Phase 2 s'applique (emails, téléphones, montants, devises, slugs). Ajouts de la Phase 3 :

| Groupe de champs               | Contrainte                                                            |
| ------------------------------ | -------------------------------------------------------------------- |
| `displayName`                  | 1..100 caractères, sans espaces superflus                            |
| `occupation`                   | 0..100 caractères                                                    |
| `phone` (profil admin)         | ≤ 30 caractères (plus permissif que le mobile — données héritées)     |
| `label` de tag                 | 1..80 caractères ; slug ≤ 60 caractères `^[a-z0-9-]+$`               |
| `startsAt` d'événement         | Doit être dans le futur (à la création uniquement)                    |
| `endsAt` d'événement           | ≥ 30 minutes après `startsAt` lorsqu'il est présent                   |
| `approvalMode`                 | `auto \| manual`                                                     |
| Statut de commande (Route 92)  | `pending \| confirmed \| checkedIn`                                  |
| Rôles                          | `admin \| dj \| entrance_manager \| finance_manager`                 |
| `methodType`                   | `payment \| withdrawal`                                              |
| Réponse admin                  | 1..2000 caractères, sans espaces superflus                           |
| Images uploadées               | jpeg/png/webp/gif, ≤ 5 Mo                                            |
| Vidéos uploadées (`eventGallery`) | mp4/webm/quicktime, ≤ 50 Mo                                        |
| `lat` / `lng`                  | −90..90 / −180..180, ou `null`                                       |
| `capacity`                     | Entier positif ou `null`                                             |

---

## R. Aide-mémoire requêtes/réponses

| #   | Méthode | Chemin                                            | Renvoie / corps                                             | Rôles                    |
| --- | ------ | ------------------------------------------------- | ---------------------------------------------------------- | ------------------------ |
| 60  | GET    | `/v1/admin/me/context`                            | `{ userId, role, needsOnboarding, organizer }`             | tous                     |
| 61  | POST   | `/v1/admin/me/provision`                          | `{ needsOnboarding }`                                      | tous                     |
| 62  | GET    | `/v1/admin/me/profile`                            | AdminProfile                                               | tous                     |
| 63  | PATCH  | `/v1/admin/me/profile`                            | AdminProfile                                               | tous                     |
| 64  | GET    | `/v1/admin/me/onboarding`                         | `{ personal, organizer, venue }`                           | admin                    |
| 65  | POST   | `/v1/admin/me/onboarding`                         | `{ organizerId, venueId }`                                 | admin                    |
| 66  | GET    | `/v1/admin/organizer`                             | Organizer (complet)                                        | tous                     |
| 67  | PATCH  | `/v1/admin/organizer`                             | Organizer                                                  | admin                    |
| 68  | GET    | `/v1/admin/organizer/gallery`                     | `{ items: GalleryItem[] }`                                 | tous                     |
| 69  | POST   | `/v1/admin/organizer/gallery`                     | GalleryItem                                                | admin                    |
| 70  | DELETE | `/v1/admin/organizer/gallery/:itemId`             | 204                                                        | admin                    |
| 71  | GET    | `/v1/admin/organizer/tags`                        | `{ items: Tag[] }`                                         | tous                     |
| 72  | PUT    | `/v1/admin/organizer/tags`                        | `{ items: Tag[] }`                                         | admin                    |
| 73  | GET    | `/v1/admin/tags`                                  | `{ items: Tag[] }`                                         | tous                     |
| 74  | POST   | `/v1/admin/tags`                                  | Tag (récupère-ou-crée)                                     | tous                     |
| 75  | GET    | `/v1/admin/events`                                | `{ items: AdminEvent[] }`                                  | admin                    |
| 76  | GET    | `/v1/admin/events/:id`                            | `{ event, tagIds, ticketTypes, gallery, venue, organizer }`| admin                    |
| 77  | GET    | `/v1/admin/events/:id/overview`                   | EventOverview                                              | admin                    |
| 78  | POST   | `/v1/admin/events`                                | `{ eventId }`                                              | admin                    |
| 79  | PATCH  | `/v1/admin/events/:id`                            | Détail complet (comme 76)                                  | admin                    |
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
| 109 | GET    | `/v1/admin/team`                                  | `{ items: TeamMember[] }`                                  | propriétaire             |
| 110 | GET    | `/v1/admin/team/user-search?q=`                   | `{ items: UserMatch[] }`                                   | propriétaire             |
| 111 | POST   | `/v1/admin/team`                                  | TeamMember                                                 | propriétaire             |
| 112 | PATCH  | `/v1/admin/team/:memberId`                        | TeamMember                                                 | propriétaire             |
| 113 | DELETE | `/v1/admin/team/:memberId`                        | 204                                                        | propriétaire             |
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

**Total : 68 nouvelles routes**, portant l'API GoSwing complète à **127 endpoints** sur les trois phases.

---

## S. Matrice d'autorisation rôle → route

Reflète le RBAC actuel du middleware (`src/middleware.ts`). "tous" = tout utilisateur authentifié de l'app admin.

| Groupe de routes                        | admin | dj  | entrance_manager | finance_manager |
| -------------------------------------- | ----- | --- | ---------------- | --------------- |
| 60–63 (contexte, provisioning, profil) | ✅    | ✅  | ✅               | ✅              |
| 64–65 (onboarding)                     | ✅    | —   | —                | —               |
| 66, 68, 71, 73 (lectures organisateur/tags) | ✅ | ✅  | ✅               | ✅              |
| 67, 69–70, 72, 74 (écritures organisateur) | ✅ | —   | —                | —               |
| 75–80 (événements)                     | ✅    | —   | —                | —               |
| 81–89 (lieux)                          | ✅    | —   | —                | —               |
| 90–94 (commandes, participants)        | ✅    | —   | ✅               | —               |
| 95–101 (finance)                       | ✅    | —   | —                | ✅              |
| 102–107 (avis)                         | ✅    | —   | —                | —               |
| 108 (suggestions de chansons)          | ✅    | ✅  | —                | —               |
| 109–113 (équipe)                       | propriétaire uniquement                      |||
| 114 (vue d'ensemble)                   | ✅    | —   | —                | —               |
| 115 (uploads)                          | ✅    | —   | —                | —               |
| 116–127 (public)                       | sans auth                                    |||

Le client applique aussi ces règles (gardes de routes + redirections : dj → `/music`, entrance_manager → `/orders`, finance_manager → `/finance`), mais l'API reste la source de vérité — renvoyer `403 role_forbidden` quel que soit le comportement du client.

---

## T. Questions ouvertes pour OPTIDEEP / l'équipe API

1. **Scoping par organisateur vs scoping par créateur** (§ A.2) — le code Supabase actuel restreint les événements/lieux par `created_by_user_id` (seul l'utilisateur créateur les voit), tandis que l'équipe/la finance sont restreintes par organisateur. Nous recommandons que l'API restreigne tout par **organisateur**. Confirmez, sinon nous conservons la parité par créateur.

2. **Réconciliation des types de tags** (§ F.1) — la route 27 de la Phase 2 documentait les types de tags `interest | category | music | party | access` ; cette app utilise `category | party_type | music_style | extra_service`. Une seule liste canonique, s'il vous plaît — et dites-nous si les Routes 73/127 fusionnent avec le `/v1/tags` de la Phase 2.

3. **Deux définitions du chiffre d'affaires** (§ N.1 vs § G.3/J.1) — la vue d'ensemble du dashboard additionne les **paiements aboutis**, tandis que la vue d'ensemble d'événement + la finance additionnent les **totaux des réservations confirmées**. Si Odoo dispose d'un unique registre de paiements, décidez laquelle est canonique et utilisez-la pour les deux (nous n'avons pas de préférence, seulement un besoin de cohérence).

4. **Autorisation de `PATCH /v1/admin/organizer`** (§ E.2) — le code actuel accorde aussi l'accès en écriture sur l'organisateur à "l'utilisateur qui a créé l'un des lieux de l'organisateur" (une bizarrerie de défense en profondeur). Nous recommandons de la supprimer et de n'autoriser que le propriétaire + les membres org-admin. Confirmez.

5. **Gestion d'équipe : propriétaire uniquement vs org-admins** (§ M) — aujourd'hui, seul le *propriétaire* de l'organisateur peut gérer l'équipe. Les membres org-admin devraient-ils y être autorisés aussi ?

6. **Confidentialité de la recherche d'utilisateurs** (§ M.2) — la Route 110 recherche par sous-chaîne parmi **tous** les utilisateurs de la plateforme par nom/email. Acceptable pour l'instant ? Alternatives : recherche par email exact uniquement, ou flux d'invitation par email.

7. **Horodatages de check-in des participants** (§ I.4) — aujourd'hui, "l'heure de check-in" est approximée par le `updatedAt` de la réservation. Odoo enregistre-t-il des horodatages de scan par ticket (`ticket_checkins.scanned_at` existe dans le schéma et est utilisé par les agrégats d'événements) ? Si oui, la Route 93 devrait utiliser les heures de scan réelles.

8. **`checkedIn` comme statut de réservation** — l'app admin traite le check-in comme un *statut* de réservation (`pending → confirmed → checkedIn`), tandis que le schéma comporte aussi des check-ins par ticket. Confirmez le modèle Odoo, puisque la Route 92 écrit ce statut directement.

9. **Auth des routes publiques** (§ A.1) — aucune / clé API statique / autre chose ? Confirmez aussi les en-têtes de cache pour les routes publiques (`Cache-Control: public, max-age=60` convient pour tout le § P).

10. **Payouts** (§ J.2) — la table `payouts` existe mais nous ignorons si quelque chose l'alimente aujourd'hui. Les données de payouts sont-elles réelles dans Odoo, ou les routes 96–97 doivent-elles renvoyer des tableaux vides tant que le pipeline de payouts n'existe pas ?

11. **Déclencheur de provisioning** (§ B.2) — l'app provisionne actuellement au premier chargement de page authentifié. Si l'équipe API préfère un flux webhook Clerk → Odoo à la place, la Route 61 devient un fallback sans effet ; les deux conviennent, mais la Route 60 ne doit jamais renvoyer 500 pour un utilisateur qui vient de s'inscrire.

12. **Uploads** (§ O.1) — multipart direct vers l'API, ou URLs pré-signées comme au § P.6 de la Phase 2 ? Le multipart est plus simple pour nous ; choisissez-en un.

---

## U. Correspondance avec le code de l'app admin

Pour la traçabilité — chaque route remplace ces fonctions (toutes sous `src/`) :

| Routes  | Remplace (fichier → fonction)                                                                                     |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| 60      | `lib/data/role.ts:getUserRole`, `app/api/me/role/route.ts`, `middleware.ts:checkOnboardingNeeded/getUserRole`, `lib/data/events.ts:getOrganizerForCurrentUser`, `lib/actions/events.ts:fetchOrganizerContact` |
| 61      | `lib/provisioning/userProvisioning.ts:provisionUser` (+ `/api/provision/me`, déclencheur `SupabaseClerkBridge.tsx`) |
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
| 116     | `lib/data/discover.ts:getPublishedEvents` (+ composition `getCityData`)                                          |
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

Lorsque toutes les routes seront livrées, les éléments suivants deviendront supprimables de ce dépôt : `lib/supabase/*` (admin/client/server/middleware/mutations/token), `lib/SupabaseClerkBridge.tsx`, les clients Supabase inline dans `src/middleware.ts` et `src/app/api/me/role/route.ts`, et les dépendances `@supabase/*` — ainsi que les variables d'environnement `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (et leurs fallbacks).

**Surface Supabase mise hors service :** 17 tables (`profiles`, `organizers`, `organizer_members`, `organizer_tags`, `organizer_gallery`, `organizer_follows`, `organizer_payment_methods`, `venues`, `venue_reviews`, `events`, `event_tags`, `tags`, `event_gallery`, `event_reviews`, `event_song_suggestions`, `reservations`, `reservation_items`, plus `tickets`, `ticket_checkins`, `payments`, `payouts` en lecture seule), 1 bucket de stockage (`event-images`), 0 RPC.

---

## V. Ordre d'implémentation (recommandé)

| Lot      | Routes            | Débloque                                                                            |
| -------- | ----------------- | ---------------------------------------------------------------------------------- |
| **P3-A** | 60–63             | Middleware/RBAC + paramètres de profil. **Tout le reste dépend de la Route 60.**    |
| **P3-B** | 61, 64–65         | Flux inscription → onboarding pour les nouveaux organisateurs.                      |
| **P3-C** | 73–74, 81–85, 115 | CRUD des lieux + sélecteurs de tags + uploads (prérequis à la création d'événements). |
| **P3-D** | 75–80             | Pages événements — le cœur du dashboard.                                            |
| **P3-E** | 90–94             | Commandes + participants (+ le rôle entrance_manager devient utilisable).           |
| **P3-F** | 95–101            | Finance (+ rôle finance_manager).                                                   |
| **P3-G** | 102–108           | Modération des avis + page musique (+ rôle dj).                                     |
| **P3-H** | 66–72, 86–89      | Pages profil organisateur et détail des lieux.                                      |
| **P3-I** | 114, 77           | Dashboards (nécessitent de toute façon les agrégats des lots précédents).           |
| **P3-J** | 116–127           | Site public discover — indépendant de tout ce qui précède, peut être livré à tout moment. |

---

## Checklist de revue (pour l'équipe API)

- [ ] § A.2 — décision sur le scoping par organisateur (vs par créateur).
- [ ] § A.1 — décision sur l'auth des routes publiques.
- [ ] Réutilisation de l'enveloppe d'erreur + les 3 nouveaux codes (§ A.4) — d'accord ?
- [ ] § A.5 — listes en tableau complet (sans curseurs) acceptables ?
- [ ] Écritures transactionnelles pour les Routes 65, 78, 79 — confirmées ?
- [ ] § F — liste des types de tags réconciliée avec la route 27 de la Phase 2.
- [ ] § T — répondre aux 12 questions ouvertes.
- [ ] Confirmer le séquencement selon le § V.
- [ ] Même instance Clerk que pour les Phases 1–2 (voir la checklist de la Phase 2 — la question de réconciliation qui s'y trouve reste posée).
