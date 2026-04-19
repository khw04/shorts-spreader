<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# tests

## Purpose
Test suites organized by scope: unit tests for individual modules, protocol tests for message validation and runtime event handling, and E2E tests for full-stack integration via Playwright.

## Key Files

| File | Description |
|------|-------------|

*(No files directly in `tests/` — all tests live in subdirectories.)*

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `unit/` | Unit tests for state, protocol, API routes, extension modules, hooks, and dashboard state (see `unit/AGENTS.md`) |
| `protocol/` | Protocol-level tests — bootstrap flow, invalid message handling, runtime event sequences (see `protocol/AGENTS.md`) |
| `e2e/` | End-to-end tests via Playwright — landing page and asset verification (see `e2e/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Unit tests: `npm run test:unit` (vitest with `vitest.unit.config.js`)
- Protocol tests: `npm run test:protocol` (vitest with `vitest.protocol.config.js`)
- E2E tests: `npm run test:e2e` (playwright with `playwright.config.js`)
- Tests import source files directly via relative paths; no build step required
- Extension tests use the IIFE/CommonJS dual export to test in Node.js without a browser

### Testing Requirements
- All three test commands should pass before merging
- When adding new source modules, add corresponding unit tests

### Common Patterns
- Vitest `describe`/`it`/`expect` assertions
- Mock WebSocket servers for protocol and runtime tests
- Direct function imports from `src/lib/` and `extension/` modules

## Dependencies

### Internal
- Imports from `src/lib/`, `extension/`, `src/app/api/`

### External
- `vitest` — test runner for unit and protocol suites
- `@playwright/test` — E2E test runner

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
