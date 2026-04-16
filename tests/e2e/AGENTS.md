<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# e2e

## Purpose
End-to-end tests using Playwright that verify the full-stack application from a browser perspective.

## Key Files

| File | Description |
|------|-------------|
| `bootstrap.spec.js` | Verifies the landing page loads, extension download link exists, dashboard link works, and key static assets are present |

## For AI Agents

### Working In This Directory
- Config: `playwright.config.js` at project root
- Tests require the dev server to be running (Playwright config may handle `webServer` setup)
- Currently shallow — checks asset existence, not full spread->hit flow
- Add deeper E2E scenarios here when the extension spread/hit UI is implemented

### Common Patterns
- Playwright `test`/`expect` with page navigation and element assertions

## Dependencies

### External
- `@playwright/test` — browser automation

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
