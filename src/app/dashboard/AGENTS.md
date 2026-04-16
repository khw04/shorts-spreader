<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# dashboard

## Purpose
Real-time spread monitoring dashboard page. Bootstraps with an HTTP snapshot from `/api/stats`, then subscribes to WebSocket events for incremental updates.

## Key Files

| File | Description |
|------|-------------|
| `page.jsx` | Client component (`'use client'`) — orchestrates data fetching, WebSocket subscription, and renders StatCards, LiveFeed, NetworkGraph, and Leaderboard components |

## For AI Agents

### Working In This Directory
- This is a `'use client'` component — all hooks and browser APIs are available
- Data flow: `fetchDashboardData()` via `/api/stats` -> `normalizeDashboardData()` -> state; then WebSocket `onMessage` -> `applyRealtimeMessage()` merges incrementally
- Queued messages pattern: events arriving during HTTP fetch are queued in `queuedMessagesRef` and merged after fetch completes
- WebSocket registers as `register_dashboard` on connect
- On reconnect, re-fetches the full snapshot to avoid missed events

### Common Patterns
- `useWebSocket` hook for connection lifecycle
- `useCallback`/`useMemo` for performance
- Ref-based hydration flag (`isHydratingRef`) to buffer events during initial load

## Dependencies

### Internal
- `../../components/StatCards`, `LiveFeed`, `NetworkGraph`, `Leaderboard`
- `../../hooks/useWebSocket`
- `../../lib/dashboard-state` — normalization and merge utilities
- `../../components/task4-ui.module.css` — shared styles

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
