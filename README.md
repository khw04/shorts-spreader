# shorts-spreader

Chrome extension + Next.js realtime dashboard MVP for spreading YouTube Shorts across connected clients.

## Current progress

- Next.js app, custom `server.js`, and WebSocket bootstrap are in place.
- Shared protocol validation and in-memory state model are implemented in `src/lib`.
- Landing page, dashboard shell, and bootstrap API routes have been added.
- MV3 extension scaffold, packaging script, and bootstrap test suites are in the repository.

## What is not finished yet

- Dashboard components are still mostly placeholder UI and are not wired to live data.
- `logs` and `leaderboard` API routes still return bootstrap data instead of full state-backed responses.
- Extension background/content/popup flows still need full protocol integration with the server.
- Persistence, production hardening, abuse controls, and deployment readiness are not implemented.

## Local development

```bash
npm install
npm run dev
```

Useful commands:

- `npm run build`
- `npm run test:unit`
- `npm run test:protocol`
- `npm run test:e2e`
- `npm run package`
