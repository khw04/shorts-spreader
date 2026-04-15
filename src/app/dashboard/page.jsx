'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Leaderboard } from '../../components/Leaderboard';
import { LiveFeed } from '../../components/LiveFeed';
import { NetworkGraph } from '../../components/NetworkGraph';
import { StatCards } from '../../components/StatCards';
import styles from '../../components/task4-ui.module.css';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  EMPTY_DASHBOARD_DATA,
  WEBSOCKET_EVENT_TYPES,
  applyRealtimeMessage,
  enqueueRealtimeMessage,
  normalizeDashboardData,
  mergeRealtimeMessages
} from '../../lib/dashboard-state';

function formatTimestamp(value) {
  if (!value) {
    return 'Waiting for first sync';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function buildSocketUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  return `${protocol}://${window.location.host}`;
}

async function fetchDashboardData(signal) {
  const response = await fetch('/api/stats', {
    cache: 'no-store',
    signal
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  const payload = await response.json();

  if (!payload?.ok) {
    throw new Error('Dashboard data request did not succeed.');
  }

  return normalizeDashboardData(payload.data);
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(EMPTY_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [socketUrl, setSocketUrl] = useState('');
  const isHydratingRef = useRef(true);
  const queuedMessagesRef = useRef([]);

  const loadDashboardData = useCallback(async ({ reason = 'manual', signal } = {}) => {
    const isInitialLoad = reason === 'initial';

    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage('');
    isHydratingRef.current = true;

    try {
      let nextDashboardData = await fetchDashboardData(signal);
      const pendingMessages = queuedMessagesRef.current;

      queuedMessagesRef.current = [];

      if (pendingMessages.length > 0) {
        nextDashboardData = mergeRealtimeMessages(nextDashboardData, pendingMessages);
      }

      setDashboardData(nextDashboardData);
      setLastUpdatedAt(new Date().toISOString());
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : 'Unable to load dashboard data.');
    } finally {
      isHydratingRef.current = false;

      if (!signal?.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  const handleRealtimeMessage = useCallback((message) => {
    if (!WEBSOCKET_EVENT_TYPES.has(message?.type)) {
      return;
    }

    if (isHydratingRef.current) {
      queuedMessagesRef.current = enqueueRealtimeMessage(queuedMessagesRef.current, message);
      return;
    }

    setDashboardData((currentData) => applyRealtimeMessage(currentData, message));
    setLastUpdatedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    setSocketUrl(buildSocketUrl());
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadDashboardData({ reason: 'initial', signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [loadDashboardData]);

  const { status: connectionStatus } = useWebSocket(socketUrl, {
    onMessage: handleRealtimeMessage,
    onOpen: (socket) => {
      socket.send(JSON.stringify({ type: 'register_dashboard' }));
    },
    onReconnect: () => {
      loadDashboardData({ reason: 'reconnect' });
    }
  });

  async function handleRefresh() {
    await loadDashboardData({ reason: 'manual' });
  }

  const dashboardMeta = useMemo(() => {
    return {
      extensionCount: dashboardData.clients.extensions.length,
      dashboardCount: dashboardData.clients.dashboards.length
    };
  }, [dashboardData.clients.dashboards.length, dashboardData.clients.extensions.length]);

  const refreshLabel = isLoading || isRefreshing ? 'Syncing...' : 'Snapshot refresh';

  return (
    <main className={styles.surface}>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderCopy}>
            <span className={styles.eyebrow}>Dashboard / live operations shell</span>
            <h1 className={styles.pageTitle}>Realtime spread monitor</h1>
            <p className={styles.sectionLead}>
              `/api/stats` 스냅샷으로 부트스트랩하고 websocket 이벤트로 이어 붙이는 Task 4 대시보드 셸입니다.
            </p>
            <div className={styles.dashboardMeta}>
              <span className={styles.metaChip}>extensions {dashboardMeta.extensionCount}</span>
              <span className={styles.metaChip}>dashboards {dashboardMeta.dashboardCount}</span>
              <span className={styles.metaChip}>last sync {formatTimestamp(lastUpdatedAt)}</span>
            </div>
          </div>

          <div className={styles.stack}>
            <div className={styles.statusBadge} data-status={connectionStatus}>
              <span className={styles.statusDot} />
              <span className={styles.statusLabel}>socket {connectionStatus}</span>
            </div>
            <div className={styles.dashboardActions}>
              <button className={styles.buttonRefresh} disabled={isLoading || isRefreshing} onClick={handleRefresh} type="button">
                {refreshLabel}
              </button>
              <Link className={styles.buttonGhost} href="/">
                설치 화면으로 이동
              </Link>
            </div>
          </div>
        </header>

        {errorMessage ? <p className={styles.errorBanner}>Unable to load dashboard data: {errorMessage}</p> : null}

        <div className={styles.stack}>
          <StatCards errorMessage={errorMessage} isLoading={isLoading} stats={dashboardData.stats} />
          <div className={styles.dashboardGrid}>
            <div className={styles.stack}>
              <LiveFeed errorMessage={errorMessage} isLoading={isLoading} logs={dashboardData.logs} />
              <NetworkGraph leaderboard={dashboardData.leaderboard} logs={dashboardData.logs} stats={dashboardData.stats} />
            </div>
            <Leaderboard errorMessage={errorMessage} isLoading={isLoading} leaderboard={dashboardData.leaderboard} />
          </div>
        </div>
      </div>
    </main>
  );
}
