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

This is a real-time ride-hailing **simulator** (Vietnamese-language UI, Leaflet map of drivers/users/trips) — a purely client-side, in-memory simulation with no backend database. There is no persistence layer of any kind; reloading the page starts from an empty slate.

### Server (`server/server.ts`)
- Single Express app with no API routes — it only serves the app. In dev, Vite runs in middleware mode inside the same process (no separate Vite dev server); in production it serves the built `dist/` static files with an SPA catch-all.

### Client (`src/`)
- `App.tsx` is the single source of truth for all simulation state (drivers, users, trips, logs, UI mode) — there is no state management library or context; state and handlers are passed down as props to `Header`, `Sidebar`, and `LeafletMap`.
- The app starts completely empty (no drivers/users/trips) on load. All entities are created client-side/in-memory via UI actions: manually adding a driver/user, the "sinh nhanh"/"seed random" batch generators, or switching city presets — nothing is fetched from or persisted to any backend.
- A single `setInterval` tick loop in `App.tsx` (interval = `400 / simSpeed`) drives the whole simulation each frame: advances drivers along precomputed route waypoints, transitions trip status (`driver_en_route` → `in_progress` → `completed`), and makes idle drivers wander randomly. A separate effect implements auto-dispatch: matches `requesting` users to the closest `available` driver within 8km.
- When a trip is created, `App.tsx` calls `fetchRoadRoute` (`lib/utils/geo.ts`) to get a real road-snapped path from the public OSRM API for both the driver→pickup and pickup→dropoff legs, falling back to synthetic `generateRouteWaypoints` jitter if the OSRM request fails.
- The Header's location search box calls `geocodeAddress` (`lib/utils/geo.ts`, public Nominatim/OSM API) to pan the map to a searched place — this only moves the viewport, it does not touch existing driver/user data.
- `src/components/Sidebar/` is tabbed (`DriversTab`, `UsersTab`, `TripsTab`, `LogsTab`, `MockDataTab`), each tab receiving the relevant slice of state/handlers as props from `Sidebar.tsx`.
- `src/components/LeafletMap.tsx` renders driver/user/trip markers and handles map-click interactions, driven by `mapClickMode` (`'none' | 'add_user' | 'add_driver' | 'set_pickup' | 'set_dropoff'`) which is also owned by `App.tsx`. Long-pressing a user marker reveals a preview pin for that user's destination.

### Shared logic (`lib/`)
- `lib/types/simulation.ts` — all domain types (`Driver`, `User`, `Trip`, `CityPreset`, status enums, etc.).
- `lib/utils/geo.ts` — pure geo math (distance, bearing, fare calculation, reverse-geocoding approximation, random location generation) plus `generateRouteWaypoints` (synthetic fallback path), `fetchRoadRoute` (OSRM API call), and `geocodeAddress` (Nominatim API call) — the non-pure/networked exports in this module.
- `lib/utils/presets.ts` — city presets (`CITY_PRESETS`), vehicle configs, and random data generators (names, plates, phone numbers) used both for initial seed data and the "seed random" UI actions.

### Path aliases
- `@/*` maps to the repo root (configured in both `tsconfig.json` and `vite.config.ts`), e.g. `@/lib/types/simulation`.

### Environment
- `GEMINI_API_KEY` — present in `.env.example` but not currently wired into any server route; `@google/genai` is a dependency for future/planned use. No other environment variables are required.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.