<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# shorts-spreader

## Purpose
Experimental MVP that spreads YouTube Shorts across multiple browser clients in real time. The system consists of a **Next.js web app + custom Node/WebSocket server + Chrome MV3 extension**, providing a landing page, real-time monitoring dashboard, and a browser extension that connects clients, selects spread targets, and confirms hit deliveries.

## Key Files

| File | Description |
|------|-------------|
| `server.js` | Entry point — spins up Next.js HTTP server and `ws` WebSocket server together, wires the server runtime |
| `package.json` | Dependencies (Next 14, React 18, ws) and scripts (dev, build, test:unit, test:protocol, test:e2e, package) |
| `next.config.js` | Next.js configuration |
| `vitest.unit.config.js` | Vitest config for unit tests |
| `vitest.protocol.config.js` | Vitest config for protocol-level tests |
| `playwright.config.js` | Playwright config for E2E tests |
| `README.md` | Project overview and implementation status (Korean) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Application source — Next.js pages, API routes, React components, hooks, and core libraries (see `src/AGENTS.md`) |
| `extension/` | Chrome MV3 browser extension — background worker, popup, content script, shared utilities (see `extension/AGENTS.md`) |
| `tests/` | Test suites — unit, protocol, and E2E (see `tests/AGENTS.md`) |
| `scripts/` | Build/packaging utilities (see `scripts/AGENTS.md`) |
| `public/` | Static assets served by Next.js (favicon, screenshots, extension.zip placeholder) |

## For AI Agents

### Working In This Directory
- `server.js` is the single entry point — it boots both Next.js and the WebSocket server; do not create separate server files
- All state is in-memory (`src/lib/state.js`); there is no database or persistence layer
- The extension and web app communicate exclusively via WebSocket using a strict validated protocol (`src/lib/protocol.js`)
- UI text is in Korean; preserve the language when editing user-facing strings
- Hardcoded localhost URLs in `extension/shared.js` — adjust if deploying remotely

### Testing Requirements
- `npm run test:unit` — unit tests via Vitest (covers state, protocol, API routes, extension logic, hooks)
- `npm run test:protocol` — protocol-level tests via Vitest (message validation, runtime events)
- `npm run test:e2e` — E2E tests via Playwright (landing page asset checks)
- Run all three test suites before committing changes that touch core libraries

### Common Patterns
- Result type pattern: functions return `{ ok: true, value }` or `{ ok: false, error }` (see `protocol.js`)
- IIFE module pattern in extension files for dual CommonJS/global scope compatibility
- WebSocket messages follow strict `{ type, payload }` envelope validated by `protocol.js`
- Inbound types: `register_client`, `register_dashboard`, `set_active_tab`, `spread`, `hit_confirm`
- Outbound types: `stats_update`, `spread_event`, `hit_event`, `hit`

## Dependencies

### External
- `next` 14.2.x — React framework and HTTP server
- `react` / `react-dom` 18.3.x — UI rendering
- `ws` 8.18.x — WebSocket server
- `vitest` 3.2.x — Unit/protocol testing
- `@playwright/test` 1.54.x — E2E testing
- `eslint` + `eslint-config-next` — Linting

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
