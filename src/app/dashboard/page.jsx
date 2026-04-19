'use client';
import useWebSocket from '../../hooks/useWebSocket';
import './dashboard.css';

const SPREADER_POINTS = [{ x: 20, y: 25 }, { x: 14, y: 50 }, { x: 22, y: 75 }];
const SITE_POINTS = [{ x: 80, y: 25 }, { x: 86, y: 50 }, { x: 78, y: 75 }];
const HITTER_POINTS = [{ x: 34, y: 88 }, { x: 50, y: 92 }, { x: 66, y: 88 }];
const GROUP_COLORS = { spreader: '#ff9500', site: '#ff3b30', hitter: '#30ff50' };

function shortenLabel(value) {
  if (typeof value !== 'string') return 'unknown';
  return value.length > 10 ? `${value.slice(0, 10)}…` : value;
}

function NetworkGraph({ leaderboard, stats }) {
  const lb = leaderboard || { spreaders: [], hitters: [], sites: [] };
  const buildNodes = (entries, points, valueKey, group) =>
    (Array.isArray(entries) ? entries : []).slice(0, points.length).map((entry, i) => ({
      ...points[i], group, label: entry.name, value: entry[valueKey],
    }));

  const nodes = [
    ...buildNodes(lb.spreaders, SPREADER_POINTS, 'totalSpreads', 'spreader'),
    ...buildNodes(lb.sites, SITE_POINTS, 'totalHits', 'site'),
    ...buildNodes(lb.hitters, HITTER_POINTS, 'totalHits', 'hitter'),
  ];

  return (
    <div className="card network-graph-container">
      <h3 className="section-title">🌐 네트워크 토폴로지</h3>
      <div className="network-svg-wrap">
        <svg aria-label="실시간 네트워크 그래프" className="network-svg" viewBox="0 0 100 100">
          <defs>
            <radialGradient id="hub-glow-ng">
              <stop offset="0%" stopColor="#ff3b30" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ff3b30" stopOpacity="0" />
            </radialGradient>
          </defs>
          {nodes.map((node) => (
            <g key={`${node.group}-${node.label}`}>
              <line
                stroke={GROUP_COLORS[node.group]} strokeOpacity="0.45" strokeWidth="0.6"
                x1="50" x2={node.x} y1="50" y2={node.y}
              />
              <circle cx={node.x} cy={node.y} fill={GROUP_COLORS[node.group]} fillOpacity="0.2" r="5.5" />
              <circle cx={node.x} cy={node.y} fill={GROUP_COLORS[node.group]} r="2.2" />
              <text fill="#ffffff" fontSize="3" textAnchor="middle" x={node.x} y={node.y - 7.5}>
                {shortenLabel(node.label)}
              </text>
              <text fill="#888" fontSize="2.6" textAnchor="middle" x={node.x} y={node.y + 9}>
                {node.value}
              </text>
            </g>
          ))}
          <circle cx="50" cy="50" fill="url(#hub-glow-ng)" r="15" />
          <circle cx="50" cy="50" fill="#0a0a0f" r="9" stroke="#ff9500" strokeWidth="0.8" />
          <circle cx="50" cy="50" fill="#ff3b30" r="3.5" />
          <text fill="#ffffff" fontSize="3.6" fontWeight="700" textAnchor="middle" x="50" y="52.5">LIVE</text>
        </svg>
      </div>
      <div className="network-legend">
        <span className="legend-item"><span className="legend-dot" style={{ background: GROUP_COLORS.spreader }} />살포자</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: GROUP_COLORS.site }} />사이트</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: GROUP_COLORS.hitter }} />적중자</span>
      </div>
      <p className="network-caption">
        접속자 {stats?.activeUsers || 0} · 총 살포 {stats?.totalSpreads || 0} · 총 피격 {stats?.totalHits || 0}
      </p>
    </div>
  );
}

function StatCard({ emoji, label, value, color }) {
  return (
    <div className="stat-card" style={{ borderColor: color }}>
      <div className="stat-emoji">{emoji}</div>
      <div className="stat-value" style={{ color }} key={value}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function LiveFeed({ events }) {
  return (
    <div className="card feed-container">
      <h3 className="section-title">실시간 피드</h3>
      <div className="feed-list">
        {events.length === 0 && (
          <p className="feed-empty">아직 살포 기록이 없습니다. 첫 살포를 기다리는 중...</p>
        )}
        {events.map((event) => {
          const time = new Date(event.timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
          });
          if (event.type === 'spread') {
            return (
              <div key={event.id} className="feed-item feed-spread">
                <span className="feed-time">[{time}]</span>
                <span className="feed-icon">🔥</span>
                <span><strong>{event.spreaderName}</strong> → {event.shortsTitle || '쇼츠'}</span>
                <span className="feed-badge">{event.victimCount}명에게</span>
              </div>
            );
          }
          return (
            <div key={event.id} className="feed-item feed-hit">
              <span className="feed-time">[{time}]</span>
              <span className="feed-icon">💥</span>
              <span><strong>{event.victimName}</strong> 피격!</span>
              <span className="feed-site">({event.siteDomain})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Leaderboard({ leaderboard }) {
  const medals = ['🥇', '🥈', '🥉'];
  const spreaders = (leaderboard?.spreaders || []).map((e) => ({ name: e.name, count: e.totalSpreads || 0 }));
  const hitters = (leaderboard?.hitters || []).map((e) => ({ name: e.name, count: e.totalHits || 0 }));
  const maxSpread = spreaders[0]?.count || 1;
  const maxHit = hitters[0]?.count || 1;

  return (
    <div className="leaderboard-container">
      <div className="card leaderboard">
        <h3 className="section-title">🔥 살포왕 TOP 5</h3>
        {spreaders.length === 0 && <p className="feed-empty">데이터 없음</p>}
        {spreaders.map((entry, i) => (
          <div key={entry.name} className="lb-row">
            <span className="lb-rank">{medals[i] || `${i + 1}.`}</span>
            <span className="lb-name">{entry.name}</span>
            <div className="lb-bar-bg">
              <div className="lb-bar lb-bar-spread" style={{ width: `${(entry.count / maxSpread) * 100}%` }} />
            </div>
            <span className="lb-count">{entry.count}</span>
          </div>
        ))}
      </div>
      <div className="card leaderboard">
        <h3 className="section-title">💥 피격왕 TOP 5</h3>
        {hitters.length === 0 && <p className="feed-empty">데이터 없음</p>}
        {hitters.map((entry, i) => (
          <div key={entry.name} className="lb-row">
            <span className="lb-rank">{medals[i] || `${i + 1}.`}</span>
            <span className="lb-name">{entry.name}</span>
            <div className="lb-bar-bg">
              <div className="lb-bar lb-bar-hit" style={{ width: `${(entry.count / maxHit) * 100}%` }} />
            </div>
            <span className="lb-count">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { stats, events, isConnected } = useWebSocket();
  const [leaderboard, setLeaderboard] = useState({ spreaders: [], hitters: [], sites: [] });
  const debounceRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const fetchLeaderboard = () => {
      fetch('/api/leaderboard')
        .then((r) => r.json())
        .then((data) => {
          const payload = data?.ok && data.data ? data.data : data || {};
          setLeaderboard({
            spreaders: payload.spreaders || [],
            hitters: payload.hitters || [],
            sites: payload.sites || [],
          });
        })
        .catch(() => {});
    };

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      fetchLeaderboard();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchLeaderboard, 3000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [stats.totalSpreads, stats.totalHits]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>쇼츠 살포기 <span className="header-sub">LIVE</span></h1>
        <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 연결됨' : '🔴 연결 중...'}
        </div>
      </header>

      <div className="stats-grid">
        <StatCard emoji="🟢" label="접속자" value={stats.activeUsers} color="var(--neon-green)" />
        <StatCard emoji="🔥" label="총 살포" value={stats.totalSpreads} color="var(--orange)" />
        <StatCard emoji="💥" label="총 피격" value={stats.totalHits} color="var(--red)" />
        <StatCard emoji="🏆" label="최고 접속자" value={stats.peakActiveUsers} color="var(--purple)" />
      </div>

      <div className="main-grid">
        <LiveFeed events={events} />
        <NetworkGraph leaderboard={leaderboard} stats={stats} />
      </div>

      <Leaderboard leaderboard={leaderboard} />
    </div>
  );
}
