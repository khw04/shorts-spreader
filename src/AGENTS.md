<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# src

## Purpose
Application source code for the Shorts Spreader web app. Contains Next.js pages and API routes, React dashboard components, custom hooks, and the core server-side libraries (state management, protocol validation, WebSocket runtime).

## Key Files

| File | Description |
|------|-------------|

*(No files directly in `src/` — all code lives in subdirectories.)*

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router — pages and API route handlers (see `app/AGENTS.md`) |
| `components/` | React UI components for the dashboard (see `components/AGENTS.md`) |
| `hooks/` | Custom React hooks (see `hooks/AGENTS.md`) |
| `lib/` | Core libraries — state, protocol validation, server runtime, dashboard state (see `lib/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `lib/` modules are used by both the server (`server.js`) and the Next.js API routes; they run in Node.js only
- `components/`, `hooks/`, and `app/dashboard/` are client-side React code (`'use client'`)
- `app/page.jsx` (landing) is a server component; `app/dashboard/page.jsx` is a client component
- `lib/dashboard-state.js` uses ES module exports (consumed by Next.js bundler); `lib/state.js`, `lib/protocol.js`, `lib/server-runtime.js` use CommonJS

### Testing Requirements
- Unit tests for lib modules: `tests/unit/state-protocol.test.js`, `tests/unit/server-runtime.test.js`, `tests/unit/dashboard-state.test.js`
- Unit tests for hooks: `tests/unit/use-websocket.test.js`
- API route tests: `tests/unit/api-routes.test.js`

### Common Patterns
- Server-side libs use CommonJS `module.exports`
- Client-side code uses ES module `import`/`export`
- Dashboard data flows: HTTP snapshot (`/api/stats`) bootstraps, then WebSocket events merge incrementally

## Dependencies

### Internal
- `server.js` imports from `lib/server-runtime.js`
- Dashboard page imports from `components/`, `hooks/`, `lib/dashboard-state.js`

### External
- `next` — routing and SSR
- `react` — UI components
- `ws` — WebSocket (server-runtime only)

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
