const fs = require('fs');
const path = require('path');
const {
  buildStatsUpdatePayload,
  getLeaderboardSnapshot,
  getSpreadLog,
  getStateSnapshot,
  recordHitConfirm,
  recordSpread,
  registerClient,
  registerDashboard,
  resetState,
  setActiveTab
} = require('../../src/lib/state');

const projectRoot = path.resolve(__dirname, '..', '..');

function readRouteSource(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('api route selectors stay aligned with shared state', () => {
  beforeEach(() => {
    resetState();
  });

  it('keeps /api/stats wired to the shared snapshot whose stats match emitted stats_update counters', () => {
    registerClient({ clientId: 'spreader', nickname: 'Spreader' });
    registerClient({ clientId: 'victim-a', nickname: 'Victim A' });
    registerDashboard({ dashboardId: 'dashboard-a' });
    setActiveTab({
      clientId: 'victim-a',
      tabId: 77,
      pageUrl: 'https://example.com/post',
      pageTitle: 'Post',
      siteDomain: 'example.com',
      isEligible: true,
      ineligibleReason: null
    });
    recordSpread({
      spreadId: 'spread-1',
      clientId: 'spreader',
      shortsUrl: 'https://www.youtube.com/shorts/abc123',
      shortsTitle: 'Demo Shorts',
      spreaderName: 'Spreader',
      victimClientIds: ['victim-a']
    });
    recordHitConfirm({
      spreadId: 'spread-1',
      victimClientId: 'victim-a',
      victimName: 'Victim A',
      replacedTagType: 'img',
      pageUrl: 'https://example.com/post',
      siteDomain: 'example.com',
      deliveryMode: 'replace',
      idempotencyKey: 'spread-1:victim-a:1'
    });

    const statsRouteSource = readRouteSource('src/app/api/stats/route.js');
    const snapshot = getStateSnapshot();

    expect(statsRouteSource).toContain('getStateSnapshot');
    expect(statsRouteSource).toContain('data: getStateSnapshot()');
    expect(snapshot.stats).toMatchObject({
      ...buildStatsUpdatePayload(),
      spreadsPerUser: {
        Spreader: 1
      },
      hitsPerUser: {
        'Victim A': 1
      },
      hitSites: {
        'example.com': 1
      }
    });
  });

  it('keeps /api/logs and /api/leaderboard wired to the same shared selectors that reflect mutations', () => {
    registerClient({ clientId: 'spreader', nickname: 'Spreader' });
    registerClient({ clientId: 'victim-a', nickname: 'Victim A' });
    recordSpread({
      spreadId: 'spread-1',
      clientId: 'spreader',
      shortsUrl: 'https://www.youtube.com/shorts/abc123',
      shortsTitle: 'Demo Shorts',
      spreaderName: 'Spreader',
      victimClientIds: ['victim-a']
    });
    recordHitConfirm({
      spreadId: 'spread-1',
      victimClientId: 'victim-a',
      victimName: 'Victim A',
      replacedTagType: 'img',
      pageUrl: 'https://example.com/post',
      siteDomain: 'example.com',
      deliveryMode: 'overlay',
      idempotencyKey: 'spread-1:victim-a:1'
    });

    const logsRouteSource = readRouteSource('src/app/api/logs/route.js');
    const leaderboardRouteSource = readRouteSource('src/app/api/leaderboard/route.js');

    expect(logsRouteSource).toContain('getSpreadLog');
    expect(logsRouteSource).toContain('data: getSpreadLog()');
    expect(leaderboardRouteSource).toContain('getLeaderboardSnapshot');
    expect(leaderboardRouteSource).toContain('data: getLeaderboardSnapshot()');
    expect(getSpreadLog()).toMatchObject([
      expect.objectContaining({
        type: 'hit',
        spreadId: 'spread-1',
        victimClientId: 'victim-a'
      }),
      expect.objectContaining({
        type: 'spread',
        spreadId: 'spread-1',
        victimClientIds: ['victim-a']
      })
    ]);
    expect(getLeaderboardSnapshot()).toEqual({
      spreaders: [{ name: 'Spreader', totalSpreads: 1 }],
      hitters: [{ name: 'Victim A', totalHits: 1 }],
      sites: [{ name: 'example.com', totalHits: 1 }]
    });
  });
});
