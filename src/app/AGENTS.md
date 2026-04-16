<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# app

## Purpose
Next.js App Router directory containing pages and API route handlers. The landing page (`page.jsx`) serves the extension download and install guide; the dashboard page (`dashboard/page.jsx`) provides real-time spread monitoring.

## Key Files

| File | Description |
|------|-------------|
| `page.jsx` | Landing page (server component) — extension download CTA, 3-step install guide, dashboard link |
| `layout.jsx` | Root layout — HTML shell with metadata |
| `globals.css` | Global styles |
| `icon.svg` | App favicon/icon |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `dashboard/` | Dashboard page — real-time spread/hit monitoring UI (see `dashboard/AGENTS.md`) |
| `api/` | API route handlers — stats, logs, leaderboard endpoints (see `api/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `page.jsx` is a server component (no `'use client'` directive)
- `dashboard/page.jsx` is a client component (`'use client'`)
- CSS module `../components/task4-ui.module.css` is shared across pages and components
- Korean UI text throughout; preserve language when editing

### Testing Requirements
- E2E: `tests/e2e/bootstrap.spec.js` checks landing page assets
- API routes: `tests/unit/api-routes.test.js`

## Dependencies

### Internal
- `../components/task4-ui.module.css` — shared CSS module
- `../components/` — dashboard UI components
- `../hooks/useWebSocket.js` — WebSocket hook (dashboard)
- `../lib/dashboard-state.js` — dashboard data normalization (dashboard)

### External
- `next/link` — client-side navigation

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
