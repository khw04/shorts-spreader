<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-15 | Updated: 2026-04-15 -->

# components

## Purpose
React UI components for the Shorts Spreader dashboard. Each component renders a specific section of the monitoring interface: stat cards, live event feed, leaderboard rankings, and network visualization.

## Key Files

| File | Description |
|------|-------------|
| `StatCards.jsx` | Displays key metrics — active users, total spreads, total hits, peak users, conversion rate |
| `LiveFeed.jsx` | Scrolling list of recent spread and hit events with timestamps |
| `Leaderboard.jsx` | Top spreaders, hitters, and hit sites ranked by count |
| `NetworkGraph.jsx` | Visual shell for spread network — currently a leaderboard/log-based visualization placeholder |
| `task4-ui.module.css` | Shared CSS module used by all pages and components — dark glass-panel aesthetic |

## For AI Agents

### Working In This Directory
- All components are client-side React (`'use client'` in their consumers)
- Components receive data as props from `dashboard/page.jsx`; they do not fetch data themselves
- `task4-ui.module.css` is the single shared stylesheet — imported by pages and all components
- `NetworkGraph.jsx` is a visualization shell, not a full graph implementation

### Testing Requirements
- No dedicated component unit tests yet; components are tested indirectly through the dashboard page
- When modifying component props, update `dashboard/page.jsx` accordingly

### Common Patterns
- Functional components with destructured props
- Loading/error state handling via `isLoading` and `errorMessage` props
- CSS module class names from `task4-ui.module.css`

## Dependencies

### Internal
- Consumed by `src/app/dashboard/page.jsx`
- Data shapes defined by `src/lib/dashboard-state.js` normalization functions

### External
- `react` — component rendering

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
