'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

function incrementEntry(entries, name, valueKey) {
  if (!name) return entries;
  const next = entries.map((e) => ({ ...e }));
  const existing = next.find((e) => e.name === name);
  if (existing) {
    existing[valueKey] = (existing[valueKey] || 0) + 1;
  } else {
    next.push({ name, [valueKey]: 1 });
  }
  return next
    .sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0) || a.name.localeCompare(b.name))
    .slice(0, 5);
}

export default function useWebSocket() {
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalSpreads: 0,
    totalHits: 0,
    peakActiveUsers: 0,
  });
  const [events, setEvents] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ spreaders: [], hitters: [], sites: [] });
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectDelay = useRef(1000);
  const isMounted = useRef(true);
  const reconnectTimer = useRef(null);

  const fetchSnapshot = useCallback(() => {
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

    fetch('/api/logs')
      .then((r) => r.json())
      .then((data) => {
        const logs = data?.ok && Array.isArray(data.data) ? data.data : [];
        const restored = logs.slice(0, 50).map((entry) => {
          if (entry.type === 'hit') {
            return {
              id: (entry.spreadId || '') + '_' + (entry.victimClientId || Date.now()),
              type: 'hit',
              victimName: entry.victimName || '',
              siteDomain: entry.siteDomain || '',
              replacedTagType: entry.replacedTagType || '',
              timestamp: entry.timestamp || entry.createdAt,
            };
          }
          return {
            id: entry.spreadId || '',
            type: 'spread',
            spreaderName: entry.spreaderName || '',
            shortsTitle: entry.shortsTitle || '',
            victimCount: entry.victimClientIds?.length || 0,
            timestamp: entry.createdAt || entry.timestamp,
          };
        });
        setEvents(restored);
      })
      .catch(() => {});
  }, []);

  const addEvent = useCallback((event) => {
    setEvents((prev) => [event, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    isMounted.current = true;

    function connect() {
      if (!isMounted.current) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted.current) { ws.close(); return; }
        setIsConnected(true);
        reconnectDelay.current = 1000;
        ws.send(JSON.stringify({ type: 'register_dashboard' }));
        fetchSnapshot();
      };

      ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }

        switch (msg.type) {
          case 'stats_update':
            setStats(msg.payload);
            break;
          case 'spread_event':
            addEvent({
              id: msg.payload.spreadId,
              type: 'spread',
              spreaderName: msg.payload.spreaderName,
              shortsTitle: msg.payload.shortsTitle,
              victimCount: msg.payload.victimCount,
              timestamp: msg.payload.timestamp,
            });
            setLeaderboard((prev) => ({
              ...prev,
              spreaders: incrementEntry(prev.spreaders, msg.payload.spreaderName, 'totalSpreads'),
            }));
            break;
          case 'hit_event':
            addEvent({
              id: msg.payload.spreadId + '_' + Date.now(),
              type: 'hit',
              victimName: msg.payload.victimName,
              siteDomain: msg.payload.siteDomain,
              replacedTagType: msg.payload.replacedTagType,
              timestamp: msg.payload.timestamp,
            });
            setLeaderboard((prev) => ({
              ...prev,
              hitters: incrementEntry(prev.hitters, msg.payload.victimName, 'totalHits'),
              sites: incrementEntry(prev.sites, msg.payload.siteDomain, 'totalHits'),
            }));
            break;
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!isMounted.current) return;
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(delay * 2, 30000);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      isMounted.current = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [addEvent, fetchSnapshot]);

  return { stats, events, leaderboard, isConnected };
}
