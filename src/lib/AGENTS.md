<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# lib

## Purpose
Core libraries shared across server and client. Contains the in-memory state store, WebSocket message protocol validation, server-side runtime logic, and client-side dashboard state normalization/merge utilities.

## Key Files

| File | Description |
|------|-------------|
| `state.js` | In-memory state — client registry, dashboard registry, spread log, hit dedup, stats counters, leaderboard. Singleton `sharedState` object. CommonJS. |
| `protocol.js` | Message protocol — validates inbound (`register_client`, `register_dashboard`, `set_active_tab`, `spread`, `hit_confirm`) and outbound (`stats_update`, `spread_event`, `hit_event`, `hit`) message envelopes and payloads. CommonJS. |
| `server-runtime.js` | WebSocket server runtime — `createServerRuntime` factory that handles connection, message routing, spread targeting, hit confirmation, stats broadcasting, and heartbeat. CommonJS. |
| `dashboard-state.js` | Client-side dashboard state — normalizes API snapshots, merges real-time WebSocket events incrementally, manages feed dedup and leaderboard updates. ES modules. |

## For AI Agents

### Working In This Directory
- `state.js`, `protocol.js`, `server-runtime.js` are **CommonJS** (`module.exports`) — they run in Node.js only
- `dashboard-state.js` is **ES modules** (`export`) — bundled by Next.js for the browser
- `state.js` uses a module-level singleton (`sharedState`); call `resetState()` in tests to clear
- `protocol.js` uses a result-type pattern: `{ ok: true, value }` / `{ ok: false, error }` — never throws
- `server-runtime.js` accepts injectable dependencies (`generateSpreadId`, `setIntervalFn`, etc.) for testability
- The spread flow: `spread` message -> `collectVictimSockets` -> `recordSpread` -> send `hit` to victims -> broadcast `spread_event` + `stats_update`
- Hit confirmation flow: `hit_confirm` -> idempotency check -> `recordHitConfirm` -> broadcast `hit_event` + `stats_update`

### Testing Requirements
- `tests/unit/state-protocol.test.js` — state and protocol validation
- `tests/unit/server-runtime.test.js` — runtime message handling and broadcast logic
- `tests/unit/dashboard-state.test.js` — normalization, merge, and feed dedup
- `tests/protocol/*.test.js` — end-to-end protocol scenarios

### Common Patterns
- Result type: `ok(value)` / `fail(reason)` throughout `protocol.js`
- Idempotency key: `${spreadId}::${victimClientId}` prevents duplicate hit processing
- Spread log capped at 200 entries (`MAX_SPREAD_LOG_SIZE`)
- Feed entries capped at 18 on client side (`MAX_FEED_ENTRIES`)
- Leaderboard top-5 with alphabetical tiebreak

## Dependencies

### Internal
- `server-runtime.js` imports from `protocol.js` and `state.js`
- `dashboard-state.js` is independent (client-side only)
- `server.js` (root) imports `server-runtime.js`
- API routes import `state.js` directly

### External
- `ws` — WebSocket constants in `server-runtime.js`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
