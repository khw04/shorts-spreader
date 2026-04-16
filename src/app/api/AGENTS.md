<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# api

## Purpose
Next.js API route handlers that expose the in-memory server state as HTTP JSON endpoints. Used by the dashboard for initial data bootstrapping before WebSocket events take over.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `stats/` | `GET /api/stats` — full state snapshot (stats, clients, logs, leaderboard) |
| `logs/` | `GET /api/logs` — recent spread log entries |
| `leaderboard/` | `GET /api/leaderboard` — top spreaders, hitters, and hit sites |

## For AI Agents

### Working In This Directory
- Each subdirectory contains a single `route.js` with a named `GET` export (Next.js App Router convention)
- All routes import directly from `src/lib/state.js` and return `{ ok: true, data: ... }` JSON responses
- No authentication or rate limiting — these are internal endpoints for the dashboard

### Testing Requirements
- `tests/unit/api-routes.test.js` covers all three endpoints

### Common Patterns
- `NextResponse.json({ ok: true, data })` response format
- Direct state reads — no database queries

## Dependencies

### Internal
- `src/lib/state.js` — `getStateSnapshot()`, `getSpreadLog()`, `getLeaderboardSnapshot()`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
