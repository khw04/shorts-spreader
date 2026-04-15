import styles from './task4-ui.module.css';

const SPREADER_POINTS = [
  { x: 20, y: 18 },
  { x: 14, y: 42 },
  { x: 22, y: 70 }
];

const SITE_POINTS = [
  { x: 80, y: 18 },
  { x: 86, y: 42 },
  { x: 78, y: 70 }
];

const HITTER_POINTS = [
  { x: 34, y: 86 },
  { x: 50, y: 92 },
  { x: 66, y: 86 }
];

const GROUP_COLORS = {
  spreader: 'var(--accent-hot)',
  site: 'var(--accent-warm)',
  hitter: 'var(--accent-live)'
};

function buildNodes(entries, points, valueKey, group) {
  return entries.slice(0, points.length).map((entry, index) => ({
    ...points[index],
    group,
    label: entry.name,
    value: entry[valueKey]
  }));
}

function shortenLabel(value) {
  if (typeof value !== 'string') {
    return 'unknown';
  }

  return value.length > 10 ? `${value.slice(0, 10)}…` : value;
}

export function NetworkGraph({ leaderboard, logs = [], stats = null }) {
  const normalizedLeaderboard = leaderboard && typeof leaderboard === 'object'
    ? leaderboard
    : { spreaders: [], hitters: [], sites: [] };
  const nodes = [
    ...buildNodes(Array.isArray(normalizedLeaderboard.spreaders) ? normalizedLeaderboard.spreaders : [], SPREADER_POINTS, 'totalSpreads', 'spreader'),
    ...buildNodes(Array.isArray(normalizedLeaderboard.sites) ? normalizedLeaderboard.sites : [], SITE_POINTS, 'totalHits', 'site'),
    ...buildNodes(Array.isArray(normalizedLeaderboard.hitters) ? normalizedLeaderboard.hitters : [], HITTER_POINTS, 'totalHits', 'hitter')
  ];
  const activityBursts = logs.slice(0, 4).map((entry, index) => ({
    color: entry?.type === 'hit' ? GROUP_COLORS.hitter : GROUP_COLORS.spreader,
    radius: 16 + index * 6
  }));

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Topology</span>
          <h2 className={styles.sectionTitle}>Network graph</h2>
        </div>
        <p className={styles.subtleText}>Inline SVG only: spreaders left, sites right, hitters below the live hub.</p>
      </div>
      <div className={styles.graphWrap}>
        <svg aria-label="Realtime network graph" className={styles.graphSvg} viewBox="0 0 100 100">
          <defs>
            <radialGradient id="graph-hub-glow">
              <stop offset="0%" stopColor="var(--accent-hot)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--accent-hot)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect fill="transparent" height="100" width="100" />

          {activityBursts.map((burst) => (
            <circle
              cx="50"
              cy="46"
              fill="none"
              key={`burst-${burst.radius}`}
              r={burst.radius}
              stroke={burst.color}
              strokeDasharray="2 5"
              strokeOpacity="0.35"
              strokeWidth="0.5"
            />
          ))}

          {nodes.map((node) => (
            <g key={`${node.group}-${node.label}`}>
              <line
                stroke={GROUP_COLORS[node.group]}
                strokeOpacity="0.42"
                strokeWidth="0.65"
                x1="50"
                x2={node.x}
                y1="46"
                y2={node.y}
              />
              <circle cx={node.x} cy={node.y} fill={GROUP_COLORS[node.group]} fillOpacity="0.18" r="5.5" />
              <circle cx={node.x} cy={node.y} fill={GROUP_COLORS[node.group]} r="2.1" />
              <text fill="var(--text-primary)" fontSize="3.1" textAnchor="middle" x={node.x} y={node.y - 7.5}>
                {shortenLabel(node.label)}
              </text>
              <text fill="var(--text-secondary)" fontSize="2.7" textAnchor="middle" x={node.x} y={node.y + 9}>
                {node.value}
              </text>
            </g>
          ))}

          <circle cx="50" cy="46" fill="url(#graph-hub-glow)" r="14" />
          <circle cx="50" cy="46" fill="var(--surface-base)" r="8" stroke="var(--surface-line-strong)" strokeWidth="0.8" />
          <circle cx="50" cy="46" fill="var(--accent-hot)" r="3.25" />
          <text fill="var(--text-primary)" fontSize="3.6" textAnchor="middle" x="50" y="48.5">
            LIVE
          </text>
        </svg>
      </div>
      <ul className={styles.graphLegend}>
        <li className={styles.graphLegendItem}>
          <span className={styles.graphLegendDot} style={{ '--legend-color': GROUP_COLORS.spreader }} />
          spreaders
        </li>
        <li className={styles.graphLegendItem}>
          <span className={styles.graphLegendDot} style={{ '--legend-color': GROUP_COLORS.site }} />
          sites
        </li>
        <li className={styles.graphLegendItem}>
          <span className={styles.graphLegendDot} style={{ '--legend-color': GROUP_COLORS.hitter }} />
          hitters
        </li>
      </ul>
      <p className={styles.graphCaption}>
        Active users {stats?.activeUsers || 0} · total spreads {stats?.totalSpreads || 0} · total hits {stats?.totalHits || 0}
      </p>
    </section>
  );
}
