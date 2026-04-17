'use client';
import { useState, useEffect, useRef } from 'react';
import useWebSocket from '../../hooks/useWebSocket';
import './dashboard.css';

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

function UserCloud({ stats }) {
  const count = stats.activeUsers || 0;
  const circles = Array.from({ length: Math.min(count, 20) }, (_, i) => i);

  return (
    <div className="card user-cloud-container">
      <h3 className="section-title">접속자 현황</h3>
      <div className="user-cloud">
        {count === 0 && <p className="feed-empty">접속자 없음</p>}
        {circles.map((i) => (
          <div
            key={i}
            className="user-node"
            style={{
              animationDelay: `${i * 0.15}s`,
              width: `${32 + (i * 7) % 20}px`,
              height: `${32 + (i * 11) % 20}px`,
            }}
          />
        ))}
        {count > 0 && (
          <div className="user-cloud-count">{count}명 접속 중</div>
        )}
      </div>
    </div>
  );
}

function Leaderboard({ stats }) {
  const [board, setBoard] = useState({ topSpreaders: [], topVictims: [] });
  const debounceRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const fetchBoard = () => {
      fetch('/api/leaderboard')
        .then((r) => r.json())
        .then((data) => {
          const payload = data?.ok && data.data ? data.data : data || {};
          const spreaders = (payload.spreaders || payload.topSpreaders || []).map((e) => ({
            name: e.name,
            count: e.count ?? e.totalSpreads ?? 0,
          }));
          const victims = (payload.hitters || payload.topVictims || []).map((e) => ({
            name: e.name,
            count: e.count ?? e.totalHits ?? 0,
          }));
          setBoard({ topSpreaders: spreaders, topVictims: victims });
        })
        .catch(() => {});
    };

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      fetchBoard();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchBoard, 3000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [stats.totalSpreads, stats.totalHits]);

  const medals = ['🥇', '🥈', '🥉'];
  const maxSpread = board.topSpreaders[0]?.count || 1;
  const maxVictim = board.topVictims[0]?.count || 1;

  return (
    <div className="leaderboard-container">
      <div className="card leaderboard">
        <h3 className="section-title">🔥 살포왕 TOP 5</h3>
        {board.topSpreaders.length === 0 && <p className="feed-empty">데이터 없음</p>}
        {board.topSpreaders.map((entry, i) => (
          <div key={entry.name} className="lb-row">
            <span className="lb-rank">{medals[i] || `${i + 1}.`}</span>
            <span className="lb-name">{entry.name}</span>
            <div className="lb-bar-bg">
              <div
                className="lb-bar lb-bar-spread"
                style={{ width: `${(entry.count / maxSpread) * 100}%` }}
              />
            </div>
            <span className="lb-count">{entry.count}</span>
          </div>
        ))}
      </div>
      <div className="card leaderboard">
        <h3 className="section-title">💥 피격왕 TOP 5</h3>
        {board.topVictims.length === 0 && <p className="feed-empty">데이터 없음</p>}
        {board.topVictims.map((entry, i) => (
          <div key={entry.name} className="lb-row">
            <span className="lb-rank">{medals[i] || `${i + 1}.`}</span>
            <span className="lb-name">{entry.name}</span>
            <div className="lb-bar-bg">
              <div
                className="lb-bar lb-bar-hit"
                style={{ width: `${(entry.count / maxVictim) * 100}%` }}
              />
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
        <UserCloud stats={stats} />
      </div>

      <Leaderboard stats={stats} />
    </div>
  );
}
