# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install         # or npm install — bun.lock is present
npm run dev          # start dev server (tsx server/server.ts, Vite in middleware mode, PORT env var or 3000)
npm run build        # vite build + esbuild bundle of server/server.ts -> dist/server.cjs
npm run start        # run production build (node dist/server.cjs)
npm run lint         # tsc --noEmit (type-checking only, no separate lint rule set)
```

There is no test suite/runner configured in this repo.

## Architecture

This is a real-time ride-hailing simulation dashboard (Vietnamese-language UI, Leaflet map of drivers/users/trips) with a thin Express + Postgres backend.

### Server (`server/server.ts`)
- Single Express app. In dev, Vite runs in middleware mode inside the same process (no separate Vite dev server); in production it serves the built `dist/` static files with an SPA catch-all.
- `pg.Pool` connects to a Supabase Postgres instance using `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASS`/`DATABASE`/`DB_SSLMODE` env vars (see `.env.example`); SSL uses `rejectUnauthorized: false`.
- API surface is currently minimal and read-only: `GET /api/health`, `GET /api/users`, `GET /api/vehicles` — both query tables directly and return raw rows (no ORM/migrations layer).

### Client (`src/`)
- `App.tsx` is the single source of truth for all simulation state (drivers, users, trips, logs, UI mode) — there is no state management library or context; state and handlers are passed down as props to `Header`, `Sidebar`, and `LeafletMap`.
- On mount, `App.tsx` fetches real `users`/`vehicles` rows from the backend (`fetchInitialData`) and maps DB shape (`id_user`, `driver_id`, `location` as JSON lat/lng) into the frontend `User`/`Driver` types. All other simulation entities (trips, additional drivers/users added via UI, random seeding) are purely client-side/in-memory — nothing is persisted back to the DB.
- A single `setInterval` tick loop in `App.tsx` (interval = `400 / simSpeed`) drives the whole simulation each frame: advances drivers along precomputed route waypoints, transitions trip status (`driver_en_route` → `in_progress` → `completed`), and makes idle drivers wander randomly. A separate effect implements auto-dispatch: matches `requesting` users to the closest `available` driver within 8km.
- `src/components/Sidebar/` is tabbed (`DriversTab`, `UsersTab`, `TripsTab`, `LogsTab`, `MockDataTab`), each tab receiving the relevant slice of state/handlers as props from `Sidebar.tsx`.
- `src/components/LeafletMap.tsx` renders driver/user/trip markers and handles map-click interactions, driven by `mapClickMode` (`'none' | 'add_user' | 'add_driver' | 'set_pickup' | 'set_dropoff'`) which is also owned by `App.tsx`.

### Shared logic (`lib/`)
- `lib/types/simulation.ts` — all domain types (`Driver`, `User`, `Trip`, `CityPreset`, status enums, etc.), shared by client and (implicitly) server response shapes.
- `lib/utils/geo.ts` — pure geo math: distance, bearing, route waypoint generation, fare calculation, reverse-geocoding approximation, random location generation. No side effects/state — safe to unit-test in isolation if tests are ever added.
- `lib/utils/presets.ts` — city presets (`CITY_PRESETS`), vehicle configs, and random data generators (names, plates, phone numbers) used both for initial seed data and the "seed random" UI actions.

### Path aliases
- `@/*` maps to the repo root (configured in both `tsconfig.json` and `vite.config.ts`), e.g. `@/lib/types/simulation`.

### Environment
- `GEMINI_API_KEY` — present in `.env.example` but not currently wired into any server route; `@google/genai` is a dependency for future/planned use.
- DB vars (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DATABASE`, `DB_SSLMODE`) must be set for `/api/users` and `/api/vehicles` to work; without them the app still runs but initial data fetch fails gracefully (logs an error, keeps empty state).
