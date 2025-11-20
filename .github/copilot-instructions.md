## Contexte rapide

Ce mono-repo contient trois applications principales :

- `vacxcare-frontend/` — frontend Next.js (React 19, Next 15). Voir `vacxcare-frontend/package.json`.
- `vacxcare-backend/` — API Node/TypeScript (Express, Socket.io, MongoDB). Entrée : `vacxcare-backend/src/server.ts`.
- `vacxcare_mobile/` — application mobile Flutter. Entrée : `vacxcare_mobile/lib/main.dart`.

Travail attendu d'un agent : fournir des modifications ciblées (fixes, composants, endpoints, petits tests), respecter les scripts et les conventions décrites ci-dessous.

## Commandes de dev & build (exemples)

- Frontend (Next.js) :
  - Installation : `cd vacxcare-frontend && npm install`
  - Dev server : `npm run dev` (écoute la conf Next, voir `package.json`)
  - Build prod : `npm run build && npm run start`
- Backend (Node/TypeScript) :
  - Installation : `cd vacxcare-backend && npm install`
  - Dev : `npm run dev` (utilise `ts-node-dev`, fichier d'entrée `src/server.ts`)
  - Build prod : `npm run build` (tsc) puis `npm run start` (exécute `dist/server.js`)
  - Attention : la connexion MongoDB est lue via `.env` (dotenv). Rechercher `.env` ou exemples dans le dossier backend.
- Mobile (Flutter) :
  - Install deps : `cd vacxcare_mobile && flutter pub get`
  - Lancer : `flutter run -d <device>`

## Patterns et conventions projet (importants pour l'IA)

- API prefixes : toutes les routes d'API sont sous `/api/*`. Exemple : `/api/vaccine-calendar`, `/api/children`, `/api/auth` (voir `src/server.ts`).
- Socket.io : le backend expose `io` sur `app.locals.io` et envoie des événements (ex. `io.to('parent').emit(...)`). Le client front et mobile utilisent `socket.io-client` / `socket_io_client`.
- CORS : la logique d'autorisation CORS est définie dans `src/server.ts` — elle autorise `localhost`, `127.0.0.1` et `192.168.x.x` (utile pour tester avec des devices physiques). Pour tests, respecter cette logique ou modifier explicitement.
- Assets & uploads : backend sert `/uploads` en statique (vérifier `express.static`). Le mobile et le frontend utilisent `assets/` et `images/` locaux (voir `vacxcare_mobile/pubspec.yaml` et `vacxcare-frontend/public/`).
- Cron & tâches : le backend démarre un cron d'alertes (`cron/stockAlertsCron`). Éviter les modifications qui empêchent le lancement du cron sans le remplacer correctement.

## Points d'intégration critiques

- Swagger est exposé à `/api-docs` (config dans `config/swagger`). Utile pour générer ou vérifier les contrats d'API.
- Base de données : MongoDB via `config/db`. Les seeds et scripts de peuplement se trouvent dans `vacxcare-backend/src` et à la racine `vacxcare-backend` (ex : `seed.ts`, `seedVaccinations.ts`, `create-test-users.js`).
- Auth : JWT & cookies (voir `auth` routes et middlewares). Modifier les endpoints d'auth implique de mettre à jour frontend et mobile.

## Exemples concrets à citer dans les PRs ou patches

- Quand tu modifies une route API, référence le fichier de route (ex. `vacxcare-backend/src/routes/vaccination.ts`) et ajoute/mettre à jour les tests ou la doc Swagger.
- Si tu changes un event socket, indique la chaîne émise (ex. `newNotification`) et mettre à jour les listeners côté client (frontend: `vacxcare-frontend/src/...`, mobile: `vacxcare_mobile/lib/...`).

## Comportements attendus et erreurs fréquentes

- Toujours vérifier `.env` et connections DB avant de lancer `npm run dev` sur le backend.
- CORS bloquant : si le front/mobile se plaint d'accès, inspecter la fonction CORS dans `src/server.ts` (origins autorisés).
- Typescript build : utiliser `npm run build` dans le backend pour valider les types/compilation (TS 5.x).

## Petites règles de style & bonnes pratiques identifiables dans le code

- Routes organisées par domaines (`routes/*`), logique métier dans `controllers/*` et accès DB dans `models/*` — suivre cette séparation.
- Frontend Next.js utilise les routes app (voir `vacxcare-frontend/src/app/`), respecter le pattern de components et `src/utils` existants.
- Mobile : usage de `provider` pour l'état, assets déclarés dans `pubspec.yaml`, ne pas déplacer les images sans mettre à jour ce fichier.

## Où chercher pour plus de contexte

- Backend serveur et routes : `vacxcare-backend/src/server.ts`, `vacxcare-backend/src/routes/`.
- Frontend : `vacxcare-frontend/package.json` et `vacxcare-frontend/src/app/`.
- Mobile : `vacxcare_mobile/pubspec.yaml` et `vacxcare_mobile/lib/`.
- Scripts utilitaires et seeds : `vacxcare-backend/` (fichiers JS/TS en racine comme `seed.ts`).

---

Si tu veux, j'intègre des extraits plus détaillés (ex. liste des routes importantes ou exemples de payloads pour `newNotification`) — dis-moi quelles sections approfondir ou si tu préfères la version en anglais.
