<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# unit

## Purpose
Unit tests covering individual modules across the server-side libraries, API routes, extension logic, and React hooks. Run via `npm run test:unit`.

## Key Files

| File | Description |
|------|-------------|
| `state-protocol.test.js` | Tests for `src/lib/state.js` and `src/lib/protocol.js` — state mutations, validation, edge cases |
| `server-runtime.test.js` | Tests for `src/lib/server-runtime.js` — message handling, broadcast, heartbeat, spread/hit flows |
| `dashboard-state.test.js` | Tests for `src/lib/dashboard-state.js` — normalization, real-time merge, feed dedup, leaderboard updates |
| `api-routes.test.js` | Tests for Next.js API routes (`/api/stats`, `/api/logs`, `/api/leaderboard`) |
| `bootstrap.test.js` | Bootstrap/startup sanity tests |
| `extension-background-core.test.js` | Tests for `extension/background-core.js` — connection manager lifecycle, reconnect, registration |
| `extension-popup-state.test.js` | Tests for `extension/popup-state.js` — state normalization |
| `use-websocket.test.js` | Tests for `src/hooks/useWebSocket.js` — session creation, reconnection, message parsing |

## For AI Agents

### Working In This Directory
- Config: `vitest.unit.config.js` at project root
- Tests import source modules directly via relative paths
- Extension tests leverage the IIFE/CommonJS dual export (no browser environment needed)
- `state.js` tests should call `resetState()` in `beforeEach` to avoid state leakage

### Common Patterns
- `describe`/`it`/`expect` from Vitest
- Mock WebSocket objects with `readyState`, `send`, `on`, `ping`, `terminate` stubs
- `vi.fn()` for mock functions, `vi.useFakeTimers()` for time-dependent tests

## Dependencies

### Internal
- `src/lib/state.js`, `src/lib/protocol.js`, `src/lib/server-runtime.js`, `src/lib/dashboard-state.js`
- `src/hooks/useWebSocket.js`
- `src/app/api/*/route.js`
- `extension/background-core.js`, `extension/popup-state.js`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
