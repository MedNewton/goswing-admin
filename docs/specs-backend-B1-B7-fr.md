# Specs backend (Odoo REST) — Bugs B1 & B7

**Date :** 2026-08-01
**Contexte :** Tests E2E complets de l'admin GoSwing (Next.js) contre l'API de staging `https://web.gooswing.com`, authentification Clerk (instance `gooswing-staging`). Deux bugs bloquants ont été identifiés **côté backend**. Le frontend envoie des payloads conformes au contrat documenté (`rest-api-phase-3-admin-routes.md` et collection Postman `gooswing-staging.postman_collection3.json`) — aucune correction côté frontend ne peut contourner ces problèmes.

---

## B1 — CRITIQUE : La création d'événement est impossible (`startsAt` systématiquement rejeté)

### Résumé

`POST /v1/admin/events` rejette **toutes** les variantes ISO 8601 du champ `startsAt` avec une erreur `400 validation_failed`, y compris le format exact donné dans la documentation de l'API et dans la collection Postman. Le seul format qui passe la validation (format Odoo `"YYYY-MM-DD HH:MM:SS"`) provoque ensuite une **erreur 500**. Conséquence : **aucun événement ne peut être créé via l'API**, ce qui bloque le flux principal du produit (création d'événement → billets → commandes → participants → analytics).

### Endpoint concerné

```
POST /v1/admin/events
Authorization: Bearer <token Clerk>
Content-Type: application/json
```

### Payload envoyé par le frontend (conforme au contrat)

```json
{
  "title": "E2E Test Event",
  "description": null,
  "startsAt": "2026-08-15T19:00:00.000Z",
  "endsAt": null,
  "venueId": null,
  "heroImageUrl": null,
  "publish": false,
  "currency": "MAD",
  "approvalMode": "auto",
  "sharingEnabled": true,
  "policies": [],
  "ticketTiers": [
    {
      "name": "Standard",
      "priceCents": 0,
      "currency": "MAD",
      "description": null,
      "capacity": null,
      "isFree": false,
      "freeForLadies": false
    }
  ],
  "tagIds": [],
  "galleryItems": []
}
```

### Résultats des tests de formats (probe exhaustif)

Chaque format a été envoyé dans le même payload que ci-dessus, via l'action serveur du frontend avec un token Clerk valide (utilisateur provisionné, rôle organisateur confirmé — les autres endpoints admin répondent correctement avec ce même token) :

| # | Valeur `startsAt` envoyée | Réponse backend |
|---|---|---|
| 1 | `2026-08-15T19:00:00.000Z` *(format de la doc et de Postman)* | `400 validation_failed` — `"startsAt must be an ISO datetime"`, `details: {"field":"startsAt"}` |
| 2 | `2026-08-15T19:00:00Z` | `400 validation_failed` — même erreur |
| 3 | `2026-08-15T19:00:00` | `400 validation_failed` — même erreur |
| 4 | `2026-08-15T19:00:00+00:00` | `400 validation_failed` — même erreur |
| 5 | `2026-08-15 19:00:00` *(format Odoo, espace au lieu du `T`)* | ✅ passe la validation… puis `500 Internal server error` |

### Analyse

Deux problèmes distincts et cumulés :

1. **Le validateur de `startsAt` (et probablement `endsAt`) n'accepte pas l'ISO 8601.** Le message d'erreur (« must be an ISO datetime ») dit l'inverse de ce que fait le code : il semble que le validateur attende en réalité le format datetime Odoo (`%Y-%m-%d %H:%M:%S`) tout en affichant un message parlant d'ISO. À vérifier dans le contrôleur REST : la fonction de parsing/validation des champs datetime.
2. **Le handler derrière la validation crashe (500)** quand la validation passe (test #5). Le crash est donc indépendant du problème de format — il faut récupérer la stack trace côté serveur pour ce cas (probablement conversion de date, création des ticket tiers, ou insertion de l'événement). Les logs Odoo de staging autour du 2026-08-01 ~22h–23h UTC+1 contiennent l'occurrence.

### Contrat attendu (rappel de la doc `rest-api-phase-3-admin-routes.md`)

- `startsAt` : datetime ISO 8601 UTC, ex. `"2026-07-12T20:00:00.000Z"` — **doit être accepté avec ou sans millisecondes, avec suffixe `Z`**.
- `endsAt` : même format, nullable ; si présent, ≥ 30 minutes après `startsAt`.
- `startsAt` doit être dans le futur (la valeur testée `2026-08-15` était bien dans le futur au moment du test).
- Réponse attendue : `201` avec `{ "eventId": "uuid" }`.

### Critères d'acceptation

1. `POST /v1/admin/events` avec le payload d'exemple ci-dessus et `startsAt = "2026-08-15T19:00:00.000Z"` retourne `201 { "eventId": "<uuid>" }`.
2. Les variantes `...T19:00:00Z` (sans millisecondes) sont également acceptées.
3. L'événement créé apparaît dans `GET /v1/admin/events` avec `startsAt` correctement stocké (`2026-08-15T19:00:00.000Z` en UTC).
4. Un `startsAt` réellement invalide (ex. `"pas-une-date"`, `"2026-13-45T99:99:99Z"`) retourne bien `400 validation_failed` avec `details: {"field":"startsAt"}`.
5. Un `startsAt` dans le passé retourne une `400` avec un **message distinct** (ex. « startsAt must be in the future ») — pas le message de format.
6. Même comportement pour `endsAt` (formats acceptés + règle des 30 minutes).
7. Aucun `500` sur l'ensemble des cas ci-dessus.
8. Vérifier au passage `PUT/PATCH /v1/admin/events/:id` : le même validateur y est probablement utilisé — la mise à jour d'événement est très probablement cassée de la même façon.

### Note

Ne pas « corriger » en documentant le format Odoo `"YYYY-MM-DD HH:MM:SS"` : le contrat public de l'API, la collection Postman et le frontend utilisent tous l'ISO 8601 avec `Z`. C'est le backend qui doit s'aligner.

---

## B7 — HAUTE : Les endpoints admin de tags répondent 503 (listes vides dans le formulaire de création d'événement)

### Résumé

Au chargement de la page de création d'événement, le frontend charge les listes de tags admin (types de soirée, styles musicaux, services supplémentaires). Pendant les tests, ces appels ont reçu des **503** de manière répétée, laissant les trois menus déroulants vides (« Aucun type de soirée disponible », etc.). Dans le même temps, l'endpoint **public** des tags fonctionne parfaitement (la page publique `/discover/categories` affiche Brunch, Club night, Concert, Festival, Lounge, Music night…). Le problème est donc spécifique à la route admin (ou à sa charge), pas aux données.

### Endpoints concernés

- `GET /v1/admin/tags` (ou routes équivalentes par catégorie de tags — à confirmer selon l'implémentation : le frontend appelle `getTags()` dans `src/lib/data/events.ts` côté serveur)
- Pour référence, l'endpoint public équivalent qui fonctionne : celui qui alimente `/discover/categories` (tags visibles publiquement avec les mêmes données)

### Comportement observé

1. Ouverture de `/events/create` dans l'admin → le serveur Next.js déclenche les chargements de tags.
2. Plusieurs requêtes reçoivent `503 Service Unavailable` (observé de façon répétée pendant la session de test du 2026-08-01, ~21h45–23h UTC+1).
3. Conséquence UX : les trois selects affichent « Aucun … disponible ». L'organisateur ne peut associer aucun tag existant à son événement (seule la création d'un tag personnalisé fonctionne — `POST` de création de tag OK, le tag « E2E Party » a été créé avec succès pendant le test).
4. À noter aussi : des timeouts réseau généraux (`ETIMEDOUT`) ont été observés par intermittence sur l'API staging pendant la même session — les 503 peuvent être liés à un problème d'infra/worker plutôt qu'au code de la route.

### Pistes d'investigation

1. Vérifier les logs de staging pour les requêtes `GET /v1/admin/tags` du 2026-08-01 (~21h45–23h UTC+1) : le 503 vient-il d'Odoo lui-même (worker saturé, timeout de cursor, exception au niveau du middleware d'auth) ou d'un reverse proxy devant Odoo ?
2. Comparer avec l'implémentation de la route publique des tags qui, elle, répond correctement — différence probable : la vérification du token Clerk / la résolution de l'organisateur qui échoue ou timeout sur la route admin.
3. Vérifier si la route admin fait des requêtes N+1 ou un join coûteux (la route publique est peut-être cachée/plus simple).

### Critères d'acceptation

1. `GET /v1/admin/tags` (avec token Clerk valide d'un organisateur provisionné) retourne `200` avec la liste des tags, de façon stable (0 erreur sur ~20 appels consécutifs).
2. Les trois catégories de tags attendues par le frontend sont présentes dans la réponse (types de soirée / styles musicaux / services supplémentaires — mêmes données que l'endpoint public, plus les éventuels tags privés de l'organisateur).
3. Sur `/events/create`, les trois menus déroulants se remplissent (vérifiable dès que le fix est déployé sur staging).
4. Si la cause est infra (worker/proxy), documenter la correction (config workers Odoo, timeout proxy) pour éviter la régression.

---

## Annexe — Conditions de test

- **Frontend :** goswing-admin (Next.js 15), commit `a45a51f`, `npm run dev` local.
- **API :** `https://web.gooswing.com` (staging), variable `GOOSWING_API_BASE_URL`.
- **Auth :** Clerk `gooswing-staging`, compte `med.benmoussa.dev@gmail.com`, organisateur provisionné via `/api/provision/me` (200) et onboarding complété.
- **Données de test créées sur staging pendant la session :** organisateur « Mohamed Benmoussa Organizer OEj8jV », lieu « E2E Test Venue » (id `b9352700-0360-45b1-920b-d40e0e3660df`), tag « E2E Party ». Aucun événement créé (bloqué par B1).
