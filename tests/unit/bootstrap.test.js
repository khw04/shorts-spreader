const fs = require('fs');
const path = require('path');
const { getStateSnapshot, resetState } = require('../../src/lib/state');

const projectRoot = path.resolve(__dirname, '..', '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'));
}

describe('bootstrap state', () => {
  beforeEach(() => {
    resetState();
  });

  it('returns the shared state snapshot shape expected by the stats api', () => {
    expect(getStateSnapshot()).toMatchObject({
      stats: {
        totalSpreads: 0,
        totalHits: 0,
        activeUsers: 0,
        peakActiveUsers: 0,
        conversionRate: 0,
        spreadsPerUser: {},
        hitsPerUser: {},
        hitSites: {}
      },
      clients: {
        extensions: [],
        dashboards: []
      },
      spreadLog: [],
      logs: [],
      leaderboard: {
        spreaders: [],
        hitters: [],
        sites: []
      }
    });
  });

  it('defines the required bootstrap npm scripts, including package:extension', () => {
    const packageJson = readJson('package.json');

    expect(packageJson.scripts).toMatchObject({
      dev: expect.any(String),
      build: expect.any(String),
      start: expect.any(String),
      lint: expect.any(String),
      'test:unit': expect.any(String),
      'test:protocol': expect.any(String),
      'test:e2e': expect.any(String),
      package: expect.any(String),
      'package:extension': expect.any(String)
    });
  });

  it('wires logs and leaderboard routes to the shared state selectors', () => {
    const logsRouteSource = fs.readFileSync(path.join(projectRoot, 'src', 'app', 'api', 'logs', 'route.js'), 'utf8');
    const leaderboardRouteSource = fs.readFileSync(path.join(projectRoot, 'src', 'app', 'api', 'leaderboard', 'route.js'), 'utf8');

    expect(logsRouteSource).toContain("getSpreadLog");
    expect(logsRouteSource).toContain('data: getSpreadLog()');
    expect(leaderboardRouteSource).toContain('getLeaderboardSnapshot');
    expect(leaderboardRouteSource).toContain('data: getLeaderboardSnapshot()');
  });
});
