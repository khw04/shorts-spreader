<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# extension

## Purpose
Chrome MV3 browser extension that connects clients to the Shorts Spreader server. Handles client registration, active tab reporting, WebSocket connection management with exponential backoff, spread triggering from YouTube Shorts pages, and hit delivery (DOM replacement/overlay) on victim tabs.

## Key Files

| File | Description |
|------|-------------|
| `manifest.json` | MV3 manifest — declares service worker, content scripts, permissions (offscreen, storage, tabs, scripting, declarativeNetRequest) |
| `shared.js` | IIFE module exporting constants (default URLs, reconnect delays, storage keys) and utilities (nickname generation, client ID, eligibility checks) |
| `background-core.js` | IIFE module providing `createBackgroundConnectionManager` — WebSocket lifecycle with auto-reconnect, registration, and active tab snapshot sending |
| `background.js` | Service worker entry — orchestrates client ID/nickname persistence, tab tracking, popup messaging, spread forwarding, and hit confirmation flow |
| `content.js` | Content script — reports active tab eligibility, injects spread button on YouTube Shorts pages, handles `deliver_hit` by replacing DOM elements or attaching overlay |
| `content.css` | Styles for the spread button and hit overlay injected by the content script |
| `popup.html` | Popup UI markup — connection status indicator, personal counters, nickname display |
| `popup.js` | Popup logic — fetches state from background, renders connection status and counters |
| `popup-state.js` | State management for popup — normalizes and validates state from background messages |
| `offscreen.html` | Offscreen document (placeholder for future use) |
| `offscreen.js` | Offscreen script (placeholder) |
| `rules.json` | DeclarativeNetRequest rules (currently empty `[]`) |
| `icon.png` | 16px extension icon |
| `icon128.png` | 128px extension icon |

## For AI Agents

### Working In This Directory
- Files use an IIFE pattern `(function init(globalScope) { ... })(globalThis)` for dual browser/Node.js compatibility
- `shared.js` must be loaded before `content.js` and `background-core.js` (declared in manifest content_scripts order)
- Default server URLs are hardcoded to `ws://127.0.0.1:3000` / `http://127.0.0.1:3000` in `shared.js`
- Content Security Policy in manifest restricts connections to localhost:3000
- The hit delivery flow: server sends `hit` -> background forwards `deliver_hit` to content script -> content script applies DOM change and responds -> background sends `hit_confirm` back to server

### Testing Requirements
- `tests/unit/extension-background-core.test.js` — tests for `createBackgroundConnectionManager`
- `tests/unit/extension-popup-state.test.js` — tests for popup state normalization
- No browser-based extension tests yet; test logic via Node.js by leveraging the IIFE/CommonJS dual export

### Common Patterns
- IIFE with `globalScope` parameter and conditional `module.exports` for testability
- Chrome extension APIs: `chrome.runtime.sendMessage`, `chrome.storage.local`, `chrome.tabs`
- WebSocket reconnect with exponential backoff: `BASE_RECONNECT_DELAY_MS * 2^(attempt-1)`, capped at `MAX_RECONNECT_DELAY_MS`
- Messages between content script and background use `{ type, payload }` format (distinct from server protocol types)

## Dependencies

### Internal
- Communicates with server via WebSocket protocol defined in `src/lib/protocol.js`
- `shared.js` constants align with server expectations

### External
- Chrome Extensions API (MV3) — service workers, storage, tabs, scripting, offscreen, declarativeNetRequest
- No npm dependencies; pure vanilla JS

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
