<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# hooks

## Purpose
Custom React hooks for the Shorts Spreader web app.

## Key Files

| File | Description |
|------|-------------|
| `useWebSocket.js` | WebSocket hook and session manager — handles connect/reconnect lifecycle, JSON message parsing, and exposes `{ status, isConnected, sendMessage }` to components |

## For AI Agents

### Working In This Directory
- `useWebSocket.js` exports both the hook (`useWebSocket`) and the underlying `createWebSocketSession` factory for testability
- `safeParseWebSocketMessage` is also exported for reuse
- The hook uses a ref-based callback pattern (`latestCallbacksRef`) to avoid stale closures
- Reconnect delay defaults to 1500ms; configurable via `options.reconnectDelayMs`

### Testing Requirements
- `tests/unit/use-websocket.test.js` covers session lifecycle, reconnection, and message parsing

### Common Patterns
- `createWebSocketSession` accepts injectable `createSocket`, `setTimeoutFn`, `clearTimeoutFn` for testability
- Status lifecycle: `idle` -> `connecting` -> `open` -> `reconnecting` -> `open` (or `closed`/`error`)

## Dependencies

### Internal
- Consumed by `src/app/dashboard/page.jsx`

### External
- `react` — `useState`, `useEffect`, `useCallback`, `useRef`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
