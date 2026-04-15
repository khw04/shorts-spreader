importScripts('shared.js');

const {
  DEFAULT_DASHBOARD_URL,
  DEFAULT_SERVER_ORIGIN,
  DEFAULT_WEBSOCKET_URL,
  STORAGE_KEYS,
  buildEligibility,
  createDefaultNickname,
  generateClientId,
  getSiteDomain,
  sanitizeNickname
} = self.ShortsSpreaderShared;

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

const state = {
  clientId: null,
  nickname: '',
  connectionStatus: 'idle',
  personalCounters: null,
  activeTab: null,
  dashboardUrl: DEFAULT_DASHBOARD_URL,
  serverOrigin: DEFAULT_SERVER_ORIGIN,
  websocketUrl: DEFAULT_WEBSOCKET_URL,
  websocketActiveUrl: DEFAULT_WEBSOCKET_URL,
  httpProbeUrl: DEFAULT_DASHBOARD_URL.replace(/\/dashboard$/, '/api/stats'),
  httpProbeStatus: 'idle',
  lastError: null
};

let initPromise = null;

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function getPopupState() {
  return {
    clientId: state.clientId,
    nickname: state.nickname,
    connectionStatus: state.connectionStatus,
    personalCounters: clone(state.personalCounters),
    activeTab: clone(state.activeTab),
    dashboardUrl: state.dashboardUrl,
    serverOrigin: state.serverOrigin,
    websocketUrl: state.websocketUrl,
    websocketActiveUrl: state.websocketActiveUrl,
    httpProbeUrl: state.httpProbeUrl,
    httpProbeStatus: state.httpProbeStatus,
    lastError: state.lastError
  };
}

function broadcastState() {
  chrome.runtime.sendMessage({
    type: 'background_state_changed',
    payload: getPopupState()
  }, () => {
    void chrome.runtime.lastError;
  });
}

function setConnectionState(nextState) {
  state.connectionStatus = nextState.connectionStatus || 'disconnected';
  state.lastError = nextState.lastError || null;
  state.websocketActiveUrl = nextState.activeUrl || state.websocketUrl;
  broadcastState();
}

function buildFallbackUrls(primaryUrl) {
  if (primaryUrl === 'ws://127.0.0.1:3000') {
    return ['ws://localhost:3000'];
  }

  if (primaryUrl === 'ws://localhost:3000') {
    return ['ws://127.0.0.1:3000'];
  }

  return [];
}

function normalizeUrl(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  try {
    return new URL(value.trim()).toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function normalizeServerOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return DEFAULT_SERVER_ORIGIN;
  }

  const trimmed = value.trim();
  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  try {
    const url = new URL(withProtocol);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return DEFAULT_SERVER_ORIGIN;
    }

    return `${url.protocol}//${url.host}`;
  } catch {
    return DEFAULT_SERVER_ORIGIN;
  }
}

function deriveConnectionUrls(serverOrigin) {
  const normalizedOrigin = normalizeServerOrigin(serverOrigin);
  const serverUrl = new URL(normalizedOrigin);
  const wsProtocol = serverUrl.protocol === 'https:' ? 'wss:' : 'ws:';

  return {
    serverOrigin: normalizedOrigin,
    websocketUrl: `${wsProtocol}//${serverUrl.host}`,
    dashboardUrl: `${serverUrl.protocol}//${serverUrl.host}/dashboard`
  };
}

async function loadConnectionSettings() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.serverOrigin, STORAGE_KEYS.websocketUrl, STORAGE_KEYS.dashboardUrl]);
  const legacyWebsocketUrl = normalizeUrl(stored[STORAGE_KEYS.websocketUrl], DEFAULT_WEBSOCKET_URL);
  const legacyDashboardUrl = normalizeUrl(stored[STORAGE_KEYS.dashboardUrl], DEFAULT_DASHBOARD_URL);
  const derived = stored[STORAGE_KEYS.serverOrigin]
    ? deriveConnectionUrls(stored[STORAGE_KEYS.serverOrigin])
    : deriveConnectionUrls(new URL(legacyDashboardUrl).origin || legacyWebsocketUrl.replace(/^ws/, 'http'));

  state.serverOrigin = derived.serverOrigin;
  state.websocketUrl = derived.websocketUrl;
  state.dashboardUrl = derived.dashboardUrl;
  state.websocketActiveUrl = state.websocketUrl;
  state.httpProbeUrl = state.dashboardUrl.replace(/\/dashboard$/, '/api/stats');
}

async function saveConnectionSettings({ serverOrigin }) {
  const derived = deriveConnectionUrls(serverOrigin);

  state.serverOrigin = derived.serverOrigin;
  state.websocketUrl = derived.websocketUrl;
  state.dashboardUrl = derived.dashboardUrl;
  state.websocketActiveUrl = state.websocketUrl;
  state.httpProbeUrl = state.dashboardUrl.replace(/\/dashboard$/, '/api/stats');

  await chrome.storage.local.set({
    [STORAGE_KEYS.serverOrigin]: state.serverOrigin,
    [STORAGE_KEYS.websocketUrl]: state.websocketUrl,
    [STORAGE_KEYS.dashboardUrl]: state.dashboardUrl
  });
}

async function probeHttpServer() {
  const probeCandidates = [
    state.dashboardUrl.replace(/\/dashboard$/, '/api/stats'),
    ...(
      state.dashboardUrl === 'http://127.0.0.1:3000/dashboard'
        ? ['http://localhost:3000/api/stats']
        : state.dashboardUrl === 'http://localhost:3000/dashboard'
          ? ['http://127.0.0.1:3000/api/stats']
          : []
    )
  ];

  for (const url of probeCandidates) {
    try {
      const response = await fetch(url, { method: 'GET' });
      state.httpProbeUrl = url;
      state.httpProbeStatus = `http_${response.status}`;
      broadcastState();
      return;
    } catch (error) {
      state.httpProbeUrl = url;
      state.httpProbeStatus = `http_error:${error?.message || 'unknown'}`;
      broadcastState();
    }
  }
}

async function ensureOffscreenDocument() {
  if (!chrome.offscreen?.createDocument) {
    state.lastError = 'offscreen_api_unavailable';
    broadcastState();
    return false;
  }

  if (typeof chrome.runtime.getContexts === 'function') {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });

    if (existingContexts.length > 0) {
      return true;
    }
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['WORKERS'],
    justification: 'Keep the websocket connection alive outside the service worker lifecycle.'
  });

  return true;
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      resolve(response || { ok: true });
    });
  });
}

function buildRegistrationPayload() {
  return {
    clientId: state.clientId,
    nickname: state.nickname
  };
}

function buildActiveTabPayload(snapshot = state.activeTab) {
  if (!snapshot?.tabId || !state.clientId) {
    return null;
  }

  return {
    clientId: state.clientId,
    tabId: snapshot.tabId,
    pageUrl: snapshot.pageUrl,
    pageTitle: snapshot.pageTitle,
    siteDomain: snapshot.siteDomain,
    isEligible: snapshot.isEligible,
    ineligibleReason: snapshot.ineligibleReason
  };
}

async function syncOffscreenConnection(options = {}) {
  const ensured = await ensureOffscreenDocument();

  if (!ensured) {
    return { ok: false, error: 'offscreen_unavailable' };
  }

  state.connectionStatus = 'connecting';
  if (options.reconnect === true) {
    state.lastError = null;
  }
  state.websocketActiveUrl = state.websocketUrl;
  broadcastState();

  return sendRuntimeMessage({
    type: 'offscreen_sync',
    payload: {
      websocketUrl: state.websocketUrl,
      fallbackUrls: buildFallbackUrls(state.websocketUrl),
      registrationPayload: buildRegistrationPayload(),
      activeTabPayload: buildActiveTabPayload(),
      reconnect: options.reconnect === true
    }
  });
}

async function sendSocketMessage(message) {
  const ensured = await ensureOffscreenDocument();

  if (!ensured) {
    return false;
  }

  const response = await sendRuntimeMessage({
    type: 'offscreen_send',
    payload: message
  });

  return response?.ok === true;
}

function updatePersonalCounters(counters) {
  if (!counters || counters.clientId !== state.clientId) {
    state.personalCounters = null;
    return;
  }

  state.personalCounters = {
    clientId: counters.clientId,
    nickname: counters.nickname,
    totalSpreads: counters.totalSpreads,
    totalHits: counters.totalHits
  };
}

function deliverHitToActiveTab(payload) {
  const tabId = state.activeTab?.tabId;

  if (!tabId) {
    return;
  }

  chrome.tabs.sendMessage(tabId, {
    type: 'deliver_hit',
    payload
  }, async (response) => {
    if (chrome.runtime.lastError) {
      return;
    }

    const replacedTagType = response?.replacedTagType;
    const deliveryMode = response?.deliveryMode;

    if (!response?.ok || !response?.delivered || !replacedTagType || !deliveryMode) {
      return;
    }

    if (!['img', 'video'].includes(replacedTagType) || !['replace', 'overlay'].includes(deliveryMode)) {
      return;
    }

    await sendSocketMessage({
      type: 'hit_confirm',
      payload: {
        spreadId: payload.spreadId,
        victimClientId: state.clientId,
        victimName: state.nickname,
        replacedTagType,
        pageUrl: response.pageUrl || state.activeTab?.pageUrl || 'http://localhost/',
        siteDomain: response.siteDomain || state.activeTab?.siteDomain || 'unknown',
        deliveryMode,
        idempotencyKey: `${payload.spreadId}:${state.clientId}:${Date.now()}`
      }
    });
  });
}

function handleSocketMessage(message) {
  if (message?.type === 'stats_update') {
    updatePersonalCounters(message.payload?.personalCounters);
    broadcastState();
    return;
  }

  if (message?.type === 'hit') {
    deliverHitToActiveTab(message.payload);
  }
}

async function saveIdentity(identity) {
  state.clientId = identity.clientId;
  state.nickname = identity.nickname;

  await chrome.storage.local.set({
    [STORAGE_KEYS.clientId]: identity.clientId,
    [STORAGE_KEYS.nickname]: identity.nickname
  });
}

async function ensureIdentity() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.clientId, STORAGE_KEYS.nickname]);
  const clientId = stored[STORAGE_KEYS.clientId] || generateClientId();
  const nickname = sanitizeNickname(stored[STORAGE_KEYS.nickname]) || createDefaultNickname();

  await saveIdentity({ clientId, nickname });
}

function normalizeTabSnapshot(snapshot, tabIdOverride) {
  const pageUrl = snapshot?.pageUrl || '';
  const siteDomain = snapshot?.siteDomain || getSiteDomain(pageUrl);
  const eligibility = typeof snapshot?.isEligible === 'boolean'
    ? {
        isEligible: snapshot.isEligible,
        ineligibleReason: snapshot.ineligibleReason ?? null
      }
    : buildEligibility(pageUrl);

  return {
    tabId: Number(tabIdOverride ?? snapshot?.tabId ?? 0),
    pageUrl,
    pageTitle: snapshot?.pageTitle || 'Untitled page',
    siteDomain,
    isEligible: eligibility.isEligible,
    ineligibleReason: eligibility.ineligibleReason
  };
}

async function queryActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function requestActiveTabSnapshot(tabId) {
  if (!tabId) {
    return false;
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'request_active_tab_snapshot' }, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

async function refreshActiveTabSnapshot() {
  const activeTab = await queryActiveTab();

  if (!activeTab?.id) {
    state.activeTab = null;
    broadcastState();
    await syncOffscreenConnection();
    return;
  }

  const requested = await requestActiveTabSnapshot(activeTab.id);

  if (requested) {
    return;
  }

  state.activeTab = normalizeTabSnapshot({
    tabId: activeTab.id,
    pageUrl: activeTab.url || '',
    pageTitle: activeTab.title || 'Untitled page'
  }, activeTab.id);
  broadcastState();
  await syncOffscreenConnection();
}

async function handleContentSnapshot(message, sender) {
  const activeTab = await queryActiveTab();
  const senderTabId = sender.tab?.id;

  if (!activeTab?.id || !senderTabId || activeTab.id !== senderTabId) {
    return { ok: false, ignored: true };
  }

  state.activeTab = normalizeTabSnapshot(message.payload, senderTabId);
  broadcastState();
  await syncOffscreenConnection();

  return { ok: true, activeTab: clone(state.activeTab) };
}

async function handleNicknameUpdate(nextNickname) {
  const nickname = sanitizeNickname(nextNickname) || createDefaultNickname();
  await saveIdentity({ clientId: state.clientId, nickname });
  await syncOffscreenConnection({ reconnect: true });
  broadcastState();
  return getPopupState();
}

async function buildSpreadPayloadFromActiveTab() {
  const activeTab = await queryActiveTab();
  const pageUrl = activeTab?.url || '';
  let parsedUrl;

  try {
    parsedUrl = new URL(pageUrl);
  } catch {
    return { ok: false, error: 'Active tab does not have a valid URL.' };
  }

  const isShortsPage = ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsedUrl.hostname)
    && parsedUrl.pathname.startsWith('/shorts/');

  if (!isShortsPage) {
    return { ok: false, error: 'Open a YouTube Shorts tab first.' };
  }

  const shortsTitle = (activeTab?.title || 'YouTube Shorts').replace(/\s*-\s*YouTube\s*$/, '').trim();

  return {
    ok: true,
    payload: {
      shortsUrl: parsedUrl.toString(),
      shortsTitle: shortsTitle || 'YouTube Shorts',
      spreaderName: state.nickname
    }
  };
}

function normalizeShortsRequest(payload) {
  const shortsUrl = typeof payload?.shortsUrl === 'string' ? payload.shortsUrl.trim() : '';
  const providedTitle = typeof payload?.shortsTitle === 'string' ? payload.shortsTitle.trim() : '';

  if (!shortsUrl) {
    return { ok: false, error: 'Shorts URL is required.' };
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(shortsUrl);
  } catch {
    return { ok: false, error: 'Shorts URL must be valid.' };
  }

  const isYoutubeHost = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsedUrl.hostname);

  if (!isYoutubeHost) {
    return { ok: false, error: 'Use a YouTube Shorts URL.' };
  }

  const derivedTitle = providedTitle || `Shorts ${parsedUrl.pathname.split('/').filter(Boolean).at(-1) || 'clip'}`;

  return {
    ok: true,
    payload: {
      shortsUrl: parsedUrl.toString(),
      shortsTitle: derivedTitle.slice(0, 120),
      spreaderName: state.nickname
    }
  };
}

async function handleSpreadRequest(rawPayload) {
  const normalized = rawPayload
    ? normalizeShortsRequest(rawPayload)
    : await buildSpreadPayloadFromActiveTab();

  if (!normalized.ok) {
    return normalized;
  }

  if (state.connectionStatus !== 'connected') {
    return { ok: false, error: 'WebSocket is not connected yet.' };
  }

  const sent = await sendSocketMessage({
    type: 'spread',
    payload: normalized.payload
  });

  if (!sent) {
    return { ok: false, error: 'Spread send failed. Try again after reconnect.' };
  }

  return {
    ok: true,
    message: `Spread queued as ${normalized.payload.spreaderName}.`
  };
}

async function initialize() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    await ensureIdentity();
    await loadConnectionSettings();
    await probeHttpServer();
    await ensureOffscreenDocument();
    await refreshActiveTabSnapshot();
    await syncOffscreenConnection({ reconnect: true });
    broadcastState();
  })();

  return initPromise;
}

chrome.runtime.onInstalled.addListener(() => {
  initialize();
});

chrome.runtime.onStartup.addListener(() => {
  initialize();
});

chrome.tabs.onActivated.addListener(() => {
  initialize().then(refreshActiveTabSnapshot);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title)) {
    initialize().then(() => requestActiveTabSnapshot(tabId));
  }
});

chrome.tabs.onRemoved.addListener(() => {
  initialize().then(refreshActiveTabSnapshot);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'bootstrap_ping') {
    sendResponse({ ok: true, from: 'background', tabId: sender.tab?.id ?? null });
    return false;
  }

  if (message?.type === 'offscreen_ready') {
    initialize().then(() => syncOffscreenConnection({ reconnect: true }));
    return false;
  }

  if (message?.type === 'offscreen_state_changed') {
    setConnectionState(message.payload || {});
    return false;
  }

  if (message?.type === 'offscreen_socket_message') {
    handleSocketMessage(message.payload);
    return false;
  }

  if (message?.type === 'popup_get_state') {
    initialize().then(() => {
      sendResponse(getPopupState());
    });
    return true;
  }

  if (message?.type === 'popup_set_nickname') {
    initialize().then(() => handleNicknameUpdate(message.nickname)).then(sendResponse);
    return true;
  }

  if (message?.type === 'active_tab_snapshot') {
    initialize().then(() => handleContentSnapshot(message, sender)).then(sendResponse);
    return true;
  }

  if (message?.type === 'popup_trigger_spread') {
    initialize().then(() => handleSpreadRequest(message.payload)).then(sendResponse);
    return true;
  }

  if (message?.type === 'content_trigger_spread') {
    initialize().then(() => handleSpreadRequest(message.payload)).then(sendResponse);
    return true;
  }

  return false;
});

initialize();
