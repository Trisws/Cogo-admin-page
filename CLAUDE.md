# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A ride-hailing (Grab/Gojek-style) simulation admin dashboard for Ho Chi Minh City, built on a Leaflet map. Simulated users and drivers move around the map, get auto-dispatched into trips, and the sidebar shows live logs/stats. Data is optionally backed by a Supabase Postgres database. UI strings and log messages are in Vietnamese.

This originated as a Google AI Studio project (see `metadata.json`), which is why `vite.config.ts` has AI-Studio-specific HMR/watch handling via `DISABLE_HMR`.

## Commands

Package manager is `bun` (see `bun.lock`), but npm scripts work too.

```bash
bun install
```

- `npm run dev` / `bun run dev` — starts the Express server (`server/server.ts`) via `tsx`, which itself boots Vite in middleware mode. Serves the whole app (frontend + API) on `http://localhost:3000`.
- `npm run build` — builds the frontend with `vite build`, then bundles `server/server.ts` into `dist/server.cjs` with esbuild (Node/CJS target).
- `npm run start` — runs the production build (`node dist/server.cjs`); expects `NODE_ENV=production` and static files in `dist/`.
- `npm run lint` — `tsc --noEmit` (no separate linter/formatter is configured).

There is no test runner configured in this repo.

## Environment

Copy `.env.example` to `.env`. Required vars:
- `GEMINI_API_KEY` — for `@google/genai` calls (AI Studio injects this automatically in that environment).
- `DB_HOST`, `DB_PORT` (default 6543), `DB_USER`, `DB_PASS`, `DATABASE`, `DB_SSLMODE` — Supabase Postgres connection, consumed by the `pg.Pool` in `server/server.ts`.

## Architecture

**Single server process, two responsibilities** (`server/server.ts`):
1. Exposes REST endpoints under `/api/*` (`/api/health`, `/api/users`, `/api/vehicles`) that query Postgres directly via a shared `pg.Pool` (`export const pool`).
2. Hosts the frontend — in dev via Vite's middleware mode (`createViteServer({ middlewareMode: true })`), in production by serving the built `dist/` static files with an SPA fallback to `index.html`.

There is no separate API server/port — everything is one Express app on port 3000.

**Frontend data flow** (`src/App.tsx`):
- `App.tsx` is one large component owning almost all state: `drivers`, `users`, `trips`, `logs`, simulation settings (`isSimulating`, `simSpeed`, `autoDispatch`), and UI state (selection, `mapClickMode`, theme, current city/tile layer). It passes state and handlers down as props to `Header`, `Sidebar`, and `LeafletMap` — there is no separate state management library or context.
- On mount, `fetchInitialData()` hits `/api/users` and `/api/vehicles` and maps DB rows (`id_user`, `driver_id`, `location` JSON columns, etc.) into the frontend's `User`/`Driver` shapes defined in `src/types/simulation.ts`.
- After that initial load, the simulation is entirely client-side and in-memory: an interval-driven tick loop (in `App.tsx`) advances drivers/users along precomputed route waypoints, and a separate effect auto-dispatches `requesting` users to the nearest `available` driver within 8km. None of the simulated movement/dispatch/trip actions are persisted back to the database.
- `src/utils/geo.ts` provides the geo/fare math (distance, bearing, route waypoint generation, fare calculation). `src/utils/presets.ts` provides city presets and random data generators (names, plates, phone numbers) used to seed/mutate simulation entities. `src/types/simulation.ts` is the single source of truth for all domain types (`Driver`, `User`, `Trip`, `CityPreset`, status enums, etc.).
- UI is organized as `Header` (top control bar: city/theme/tile-layer/sim-speed controls), `Sidebar/` (tabbed panels: `UsersTab`, `DriversTab`, `TripsTab`, `LogsTab`, `MockDataTab`), and `LeafletMap` (the map itself, markers, click-mode handling for placing users/drivers).

`server/server.ts` reads its listen port from `process.env.PORT` (falling back to 3000) — required for hosts like Render that assign the port dynamically.

## Deployment (Render)

`render.yaml` defines a single Node web service: `npm install && npm run build` to build, `npm run start` to run the bundled `dist/server.cjs`. On Render:
- Deploy via Blueprint (New → Blueprint, pick this repo) so `render.yaml` is picked up automatically, or create a Web Service manually with the same build/start commands.
- Set the `sync: false` env vars in the Render dashboard (they're secrets, not committed): `GEMINI_API_KEY`, `DB_HOST`, `DB_USER`, `DB_PASS`, `DATABASE`.
- `NODE_ENV=production`, `DB_PORT`, and `DB_SSLMODE` are already set in `render.yaml`.
