describe('dashboard realtime state helpers', () => {
  async function loadModule() {
    return import('../../src/lib/dashboard-state.js');
  }

  it('does not double-increment leaderboard entries when a snapshot already contains the replayed event', async () => {
    const { applyRealtimeMessage } = await loadModule();

    const snapshot = {
      stats: {
        totalSpreads: 1,
        totalHits: 1,
        activeUsers: 2,
        peakActiveUsers: 2,
        conversionRate: 100
      },
      logs: [
        {
          type: 'spread',
          spreadId: 'spread-1',
          spreaderName: 'Alpha',
          shortsTitle: 'Demo Shorts',
          victimCount: 1,
          timestamp: '2026-04-13T12:44:14.000Z'
        },
        {
          type: 'hit',
          spreadId: 'spread-1',
          victimClientId: 'victim-1',
          victimName: 'Victim',
          siteDomain: 'example.com',
          deliveryMode: 'replace',
          timestamp: '2026-04-13T12:45:14.000Z'
        }
      ],
      leaderboard: {
        spreaders: [{ name: 'Alpha', totalSpreads: 1 }],
        hitters: [{ name: 'Victim', totalHits: 1 }],
        sites: [{ name: 'example.com', totalHits: 1 }]
      },
      clients: {
        extensions: [],
        dashboards: []
      }
    };

    const afterSpreadReplay = applyRealtimeMessage(snapshot, {
      type: 'spread_event',
      payload: {
        spreadId: 'spread-1',
        spreaderName: 'Alpha',
        shortsTitle: 'Demo Shorts',
        victimCount: 1,
        timestamp: '2026-04-13T12:44:14.000Z'
      }
    });
    const afterHitReplay = applyRealtimeMessage(afterSpreadReplay, {
      type: 'hit_event',
      payload: {
        spreadId: 'spread-1',
        victimClientId: 'victim-1',
        victimName: 'Victim',
        replacedTagType: 'img',
        siteDomain: 'example.com',
        deliveryMode: 'replace',
        timestamp: '2026-04-13T12:45:14.000Z'
      }
    });

    expect(afterHitReplay.leaderboard).toEqual(snapshot.leaderboard);
    expect(afterHitReplay.logs).toHaveLength(2);
  });

  it('builds distinct keys for different hit victims on the same spread', async () => {
    const { buildFeedEntryKey } = await loadModule();

    const firstKey = buildFeedEntryKey({
      type: 'hit',
      spreadId: 'spread-1',
      victimClientId: 'victim-1',
      victimName: 'Victim One',
      timestamp: '2026-04-13T12:45:14.000Z'
    });
    const secondKey = buildFeedEntryKey({
      type: 'hit',
      spreadId: 'spread-1',
      victimClientId: 'victim-2',
      victimName: 'Victim Two',
      timestamp: '2026-04-13T12:45:14.000Z'
    });

    expect(firstKey).not.toBe(secondKey);
  });

  it('merges queued realtime messages over a snapshot deterministically', async () => {
    const { mergeRealtimeMessages, normalizeDashboardData } = await loadModule();

    const snapshot = normalizeDashboardData({
      stats: {
        totalSpreads: 1,
        totalHits: 0,
        activeUsers: 2,
        peakActiveUsers: 2,
        conversionRate: 0
      },
      logs: [],
      leaderboard: {
        spreaders: [{ name: 'Alpha', totalSpreads: 1 }],
        hitters: [],
        sites: []
      },
      clients: {
        extensions: [],
        dashboards: []
      }
    });

    const merged = mergeRealtimeMessages(snapshot, [
      {
        type: 'spread_event',
        payload: {
          spreadId: 'spread-2',
          spreaderName: 'Beta',
          shortsTitle: 'Another Shorts',
          victimCount: 2,
          timestamp: '2026-04-13T12:46:14.000Z'
        }
      },
      {
        type: 'hit_event',
        payload: {
          spreadId: 'spread-2',
          victimClientId: 'victim-1',
          victimName: 'Victim',
          replacedTagType: 'img',
          siteDomain: 'example.com',
          deliveryMode: 'replace',
          timestamp: '2026-04-13T12:47:14.000Z'
        }
      }
    ]);

    expect(merged.logs).toHaveLength(2);
    expect(merged.leaderboard.spreaders).toEqual([
      { name: 'Alpha', totalSpreads: 1 },
      { name: 'Beta', totalSpreads: 1 }
    ]);
    expect(merged.leaderboard.hitters).toEqual([{ name: 'Victim', totalHits: 1 }]);
    expect(merged.leaderboard.sites).toEqual([{ name: 'example.com', totalHits: 1 }]);
  });
});
