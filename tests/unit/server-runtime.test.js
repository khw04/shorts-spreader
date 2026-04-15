const { WebSocket } = require('ws');
const { getStateSnapshot, resetState } = require('../../src/lib/state');
const { createServerRuntime } = require('../../src/lib/server-runtime');

function createMockSocket(label) {
  const handlers = new Map();

  return {
    label,
    readyState: WebSocket.OPEN,
    clientMeta: null,
    isAlive: false,
    sent: [],
    pingCalls: 0,
    terminateCalls: 0,
    on(event, handler) {
      handlers.set(event, handler);
    },
    emit(event, ...args) {
      const handler = handlers.get(event);

      if (handler) {
        handler(...args);
      }
    },
    send(message) {
      this.sent.push(JSON.parse(message));
    },
    ping() {
      this.pingCalls += 1;
    },
    terminate() {
      this.terminateCalls += 1;
      this.readyState = WebSocket.CLOSED;
    },
    clearMessages() {
      this.sent = [];
    }
  };
}

function createRuntimeHarness(options = {}) {
  const wss = { clients: new Set() };
  let heartbeatTick;
  let clearedHeartbeat;

  const runtime = createServerRuntime({
    wss,
    generateSpreadId: options.generateSpreadId || (() => 'spread-fixed'),
    heartbeatIntervalMs: 50,
    setIntervalFn: (callback) => {
      heartbeatTick = callback;
      return { timer: 'heartbeat' };
    },
    clearIntervalFn: (timer) => {
      clearedHeartbeat = timer;
    }
  });

  function attachSocket(socket) {
    wss.clients.add(socket);
    runtime.handleConnection(socket);
    return socket;
  }

  return {
    attachSocket,
    clearedHeartbeat: () => clearedHeartbeat,
    heartbeatTick: () => heartbeatTick,
    runtime,
    wss
  };
}

function registerExtension(runtime, socket, payload) {
  return runtime.handleMessage(socket, JSON.stringify({
    type: 'register_client',
    payload
  }));
}

function registerDashboard(runtime, socket) {
  return runtime.handleMessage(socket, JSON.stringify({
    type: 'register_dashboard'
  }));
}

function setActiveTab(runtime, socket, payload) {
  return runtime.handleMessage(socket, JSON.stringify({
    type: 'set_active_tab',
    payload
  }));
}

function spread(runtime, socket, payload) {
  return runtime.handleMessage(socket, JSON.stringify({
    type: 'spread',
    payload
  }));
}

function hitConfirm(runtime, socket, payload) {
  return runtime.handleMessage(socket, JSON.stringify({
    type: 'hit_confirm',
    payload
  }));
}

describe('server runtime routing', () => {
  beforeEach(() => {
    resetState();
  });

  it('sends bootstrap_ready on connection and heartbeats sockets with ping/pong tracking', () => {
    const harness = createRuntimeHarness();
    const socket = harness.attachSocket(createMockSocket('client-a'));

    expect(socket.sent[0]).toEqual({
      type: 'bootstrap_ready',
      message: 'WebSocket server bootstrap is running.'
    });

    harness.runtime.startHeartbeat();
    harness.heartbeatTick()();

    expect(socket.isAlive).toBe(false);
    expect(socket.pingCalls).toBe(1);

    socket.emit('pong');

    expect(socket.isAlive).toBe(true);

    harness.heartbeatTick()();
    harness.heartbeatTick()();

    expect(socket.terminateCalls).toBe(1);

    harness.runtime.stopHeartbeat();

    expect(harness.clearedHeartbeat()).toEqual({ timer: 'heartbeat' });
  });

  it('registers extension and dashboard roles while keeping dashboards out of activeUsers', () => {
    const harness = createRuntimeHarness();
    const extensionSocket = harness.attachSocket(createMockSocket('extension-a'));
    const dashboardSocket = harness.attachSocket(createMockSocket('dashboard-a'));

    registerExtension(harness.runtime, extensionSocket, {
      clientId: 'client-a',
      nickname: 'Alpha'
    });
    registerDashboard(harness.runtime, dashboardSocket);

    expect(extensionSocket.clientMeta).toMatchObject({
      role: 'extension',
      clientId: 'client-a',
      nickname: 'Alpha'
    });
    expect(dashboardSocket.clientMeta).toMatchObject({
      role: 'dashboard',
      dashboardId: expect.any(String)
    });
    expect(getStateSnapshot({ clientId: 'client-a' }).stats).toMatchObject({
      activeUsers: 1,
      personalCounters: {
        clientId: 'client-a',
        nickname: 'Alpha',
        totalSpreads: 0,
        totalHits: 0
      }
    });
    expect(extensionSocket.sent.filter((message) => message.type === 'stats_update')).toHaveLength(2);
    expect(dashboardSocket.sent.filter((message) => message.type === 'stats_update')).toHaveLength(1);
  });

  it('rejects set_active_tab from dashboards or mismatched client identities', () => {
    const harness = createRuntimeHarness();
    const extensionSocket = harness.attachSocket(createMockSocket('extension-a'));
    const dashboardSocket = harness.attachSocket(createMockSocket('dashboard-a'));

    registerExtension(harness.runtime, extensionSocket, {
      clientId: 'client-a',
      nickname: 'Alpha'
    });
    registerDashboard(harness.runtime, dashboardSocket);
    extensionSocket.clearMessages();
    dashboardSocket.clearMessages();

    const dashboardAttempt = setActiveTab(harness.runtime, dashboardSocket, {
      clientId: 'client-a',
      tabId: 1,
      pageUrl: 'https://example.com/dashboard',
      pageTitle: 'Dashboard',
      siteDomain: 'example.com',
      isEligible: true,
      ineligibleReason: null
    });
    const mismatchedAttempt = setActiveTab(harness.runtime, extensionSocket, {
      clientId: 'someone-else',
      tabId: 1,
      pageUrl: 'https://example.com/article',
      pageTitle: 'Article',
      siteDomain: 'example.com',
      isEligible: true,
      ineligibleReason: null
    });

    expect(dashboardAttempt).toMatchObject({ handled: false, reason: 'unauthorized_active_tab' });
    expect(mismatchedAttempt).toMatchObject({ handled: false, reason: 'unauthorized_active_tab' });
    expect(getStateSnapshot().clients.extensions[0].activeTab).toBeNull();
    expect(extensionSocket.sent).toEqual([]);
    expect(dashboardSocket.sent).toEqual([]);
  });

  it('routes spread hit only to eligible extension victims and broadcasts spread_event to dashboards', () => {
    const harness = createRuntimeHarness();
    const spreader = harness.attachSocket(createMockSocket('spreader'));
    const victim = harness.attachSocket(createMockSocket('victim'));
    const ineligibleVictim = harness.attachSocket(createMockSocket('ineligible'));
    const dashboard = harness.attachSocket(createMockSocket('dashboard'));

    registerExtension(harness.runtime, spreader, { clientId: 'spreader', nickname: 'Spreader' });
    registerExtension(harness.runtime, victim, { clientId: 'victim-a', nickname: 'Victim A' });
    registerExtension(harness.runtime, ineligibleVictim, { clientId: 'victim-b', nickname: 'Victim B' });
    registerDashboard(harness.runtime, dashboard);

    setActiveTab(harness.runtime, spreader, {
      clientId: 'spreader',
      tabId: 11,
      pageUrl: 'https://example.com/spreader',
      pageTitle: 'Spreader Page',
      siteDomain: 'example.com',
      isEligible: true,
      ineligibleReason: null
    });
    setActiveTab(harness.runtime, victim, {
      clientId: 'victim-a',
      tabId: 12,
      pageUrl: 'https://example.com/victim',
      pageTitle: 'Victim Page',
      siteDomain: 'example.com',
      isEligible: true,
      ineligibleReason: null
    });
    setActiveTab(harness.runtime, ineligibleVictim, {
      clientId: 'victim-b',
      tabId: 13,
      pageUrl: 'https://www.youtube.com/watch?v=blocked',
      pageTitle: 'YouTube',
      siteDomain: 'youtube.com',
      isEligible: false,
      ineligibleReason: 'youtube_tab'
    });

    spreader.clearMessages();
    victim.clearMessages();
    ineligibleVictim.clearMessages();
    dashboard.clearMessages();

    const result = spread(harness.runtime, spreader, {
      shortsUrl: 'https://www.youtube.com/shorts/abc123',
      shortsTitle: 'Demo Shorts',
      spreaderName: 'Spreader'
    });

    expect(result).toMatchObject({
      handled: true,
      type: 'spread',
      spreadEntry: {
        spreadId: 'spread-fixed',
        victimClientIds: ['victim-a']
      }
    });
    expect(spreader.sent.some((message) => message.type === 'hit')).toBe(false);
    expect(victim.sent.find((message) => message.type === 'hit')).toEqual({
      type: 'hit',
      payload: {
        spreadId: 'spread-fixed',
        spreaderName: 'Spreader',
        shortsTitle: 'Demo Shorts',
        shortsId: 'abc123'
      }
    });
    expect(ineligibleVictim.sent.some((message) => message.type === 'hit')).toBe(false);
    expect(dashboard.sent.some((message) => message.type === 'hit')).toBe(false);
    expect(dashboard.sent.find((message) => message.type === 'spread_event')).toMatchObject({
      type: 'spread_event',
      payload: {
        spreadId: 'spread-fixed',
        spreaderName: 'Spreader',
        shortsTitle: 'Demo Shorts',
        victimCount: 1
      }
    });
    expect(getStateSnapshot().stats).toMatchObject({
      totalSpreads: 1,
      totalHits: 0
    });
  });

  it('accepts hit_confirm once for a targeted victim and ignores duplicates', () => {
    const harness = createRuntimeHarness();
    const spreader = harness.attachSocket(createMockSocket('spreader'));
    const victim = harness.attachSocket(createMockSocket('victim'));
    const dashboard = harness.attachSocket(createMockSocket('dashboard'));

    registerExtension(harness.runtime, spreader, { clientId: 'spreader', nickname: 'Spreader' });
    registerExtension(harness.runtime, victim, { clientId: 'victim-a', nickname: 'Victim A' });
    registerDashboard(harness.runtime, dashboard);
    setActiveTab(harness.runtime, victim, {
      clientId: 'victim-a',
      tabId: 22,
      pageUrl: 'https://example.com/post',
      pageTitle: 'Post',
      siteDomain: 'example.com',
      isEligible: true,
      ineligibleReason: null
    });

    spread(harness.runtime, spreader, {
      shortsUrl: 'https://www.youtube.com/shorts/abc123',
      shortsTitle: 'Demo Shorts',
      spreaderName: 'Spreader'
    });

    spreader.clearMessages();
    victim.clearMessages();
    dashboard.clearMessages();

    const first = hitConfirm(harness.runtime, victim, {
      spreadId: 'spread-fixed',
      victimClientId: 'victim-a',
      victimName: 'Victim A',
      replacedTagType: 'img',
      pageUrl: 'https://example.com/post',
      siteDomain: 'example.com',
      deliveryMode: 'replace',
      idempotencyKey: 'spread-fixed:victim-a:1'
    });
    const duplicate = hitConfirm(harness.runtime, victim, {
      spreadId: 'spread-fixed',
      victimClientId: 'victim-a',
      victimName: 'Victim A',
      replacedTagType: 'img',
      pageUrl: 'https://example.com/post',
      siteDomain: 'example.com',
      deliveryMode: 'replace',
      idempotencyKey: 'spread-fixed:victim-a:2'
    });

    expect(first).toMatchObject({ handled: true, type: 'hit_confirm' });
    expect(duplicate).toMatchObject({ handled: false, reason: 'duplicate_hit' });
    expect(dashboard.sent.filter((message) => message.type === 'hit_event')).toHaveLength(1);
    expect(spreader.sent.filter((message) => message.type === 'stats_update')).toHaveLength(1);
    expect(getStateSnapshot().stats).toMatchObject({
      totalSpreads: 1,
      totalHits: 1,
      hitSites: {
        'example.com': 1
      }
    });
  });

  it('rejects hit_confirm from an untargeted client', () => {
    const harness = createRuntimeHarness();
    const spreader = harness.attachSocket(createMockSocket('spreader'));
    const targetedVictim = harness.attachSocket(createMockSocket('victim-a'));
    const untargetedVictim = harness.attachSocket(createMockSocket('victim-b'));

    registerExtension(harness.runtime, spreader, { clientId: 'spreader', nickname: 'Spreader' });
    registerExtension(harness.runtime, targetedVictim, { clientId: 'victim-a', nickname: 'Victim A' });
    registerExtension(harness.runtime, untargetedVictim, { clientId: 'victim-b', nickname: 'Victim B' });
    setActiveTab(harness.runtime, targetedVictim, {
      clientId: 'victim-a',
      tabId: 31,
      pageUrl: 'https://example.com/target',
      pageTitle: 'Target',
      siteDomain: 'example.com',
      isEligible: true,
      ineligibleReason: null
    });

    spread(harness.runtime, spreader, {
      shortsUrl: 'https://www.youtube.com/shorts/abc123',
      shortsTitle: 'Demo Shorts',
      spreaderName: 'Spreader'
    });

    targetedVictim.clearMessages();
    untargetedVictim.clearMessages();

    const result = hitConfirm(harness.runtime, untargetedVictim, {
      spreadId: 'spread-fixed',
      victimClientId: 'victim-b',
      victimName: 'Victim B',
      replacedTagType: 'img',
      pageUrl: 'https://example.com/wrong',
      siteDomain: 'example.com',
      deliveryMode: 'replace',
      idempotencyKey: 'spread-fixed:victim-b:1'
    });

    expect(result).toMatchObject({ handled: false, reason: 'untargeted_victim' });
    expect(getStateSnapshot().stats.totalHits).toBe(0);
    expect(targetedVictim.sent).toEqual([]);
    expect(untargetedVictim.sent).toEqual([]);
  });

  it('unregisters sockets on close and rebroadcasts stats', () => {
    const harness = createRuntimeHarness();
    const extensionSocket = harness.attachSocket(createMockSocket('extension-a'));
    const peerSocket = harness.attachSocket(createMockSocket('extension-b'));
    const dashboardSocket = harness.attachSocket(createMockSocket('dashboard-a'));

    registerExtension(harness.runtime, extensionSocket, { clientId: 'client-a', nickname: 'Alpha' });
    registerExtension(harness.runtime, peerSocket, { clientId: 'client-b', nickname: 'Beta' });
    registerDashboard(harness.runtime, dashboardSocket);

    extensionSocket.clearMessages();
    peerSocket.clearMessages();
    dashboardSocket.clearMessages();

    expect(harness.runtime.handleClose(extensionSocket)).toEqual({ handled: true, role: 'extension' });
    expect(getStateSnapshot().stats.activeUsers).toBe(1);
    expect(peerSocket.sent.filter((message) => message.type === 'stats_update')).toHaveLength(1);
    expect(dashboardSocket.sent.filter((message) => message.type === 'stats_update')).toHaveLength(1);

    peerSocket.clearMessages();
    dashboardSocket.clearMessages();

    expect(harness.runtime.handleClose(dashboardSocket)).toEqual({ handled: true, role: 'dashboard' });
    expect(getStateSnapshot().stats.activeUsers).toBe(1);
    expect(peerSocket.sent.filter((message) => message.type === 'stats_update')).toHaveLength(1);
  });
});
