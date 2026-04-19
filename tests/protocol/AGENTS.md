<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# protocol

## Purpose
Protocol-level integration tests that verify end-to-end message flows through the server runtime — bootstrap sequences, invalid message rejection, and runtime event broadcasting.

## Key Files

| File | Description |
|------|-------------|
| `bootstrap.test.js` | Tests the full client registration and initial stats update flow |
| `invalid-messages.test.js` | Tests that malformed, unknown, and invalid messages are rejected correctly |
| `runtime-events.test.js` | Tests spread -> hit -> broadcast event sequences with multiple connected clients |

## For AI Agents

### Working In This Directory
- Config: `vitest.protocol.config.js` at project root
- These tests create mock WebSocket server/client pairs to simulate real message flows
- They test the interaction between `protocol.js`, `state.js`, and `server-runtime.js` together
- More integration-oriented than unit tests; cover multi-step scenarios

### Common Patterns
- Setup: create mock WSS + sockets, wire through `createServerRuntime`
- Verify: check sent messages on mock sockets, assert state mutations

## Dependencies

### Internal
- `src/lib/protocol.js`, `src/lib/state.js`, `src/lib/server-runtime.js`

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
