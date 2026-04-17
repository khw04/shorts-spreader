'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export default function useWebSocket() {
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalSpreads: 0,
    totalHits: 0,
    peakActiveUsers: 0,
  });
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectDelay = useRef(1000);
  const isMounted = useRef(true);
  const reconnectTimer = useRef(null);

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
  }, [addEvent]);

  return { stats, events, isConnected };
}
