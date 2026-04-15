importScripts('shared.js', 'background-core.js');

const {
  DEFAULT_DASHBOARD_URL,
  DEFAULT_WEBSOCKET_URL,
  STORAGE_KEYS,
  buildEligibility,
  createDefaultNickname,
  generateClientId,
  getSiteDomain,
  sanitizeNickname
} = self.ShortsSpreaderShared;
const { createBackgroundConnectionManager } = self.ShortsSpreaderBackgroundCore;

const state = {
  clientId: null,
  nickname: '',
  connectionStatus: 'idle',
  personalCounters: null,
  activeTab: null,
  dashboardUrl: DEFAULT_DASHBOARD_URL,
  websocketUrl: DEFAULT_WEBSOCKET_URL,
  lastError: null
};

let manager = null;
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
    websocketUrl: state.websocketUrl,
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
  state.connectionStatus = nextState.connectionStatus;
  state.lastError = nextState.lastError;
  broadcastState();
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
  }, () => {
    void chrome.runtime.lastError;
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
  manager?.resendActiveTabSnapshot();
  broadcastState();
}

async function handleContentSnapshot(message, sender) {
  const activeTab = await queryActiveTab();
  const senderTabId = sender.tab?.id;

  if (!activeTab?.id || !senderTabId || activeTab.id !== senderTabId) {
    return { ok: false, ignored: true };
  }

  state.activeTab = normalizeTabSnapshot(message.payload, senderTabId);
  manager?.resendActiveTabSnapshot();
  broadcastState();

  return { ok: true, activeTab: clone(state.activeTab) };
}

async function handleNicknameUpdate(nextNickname) {
  const nickname = sanitizeNickname(nextNickname) || createDefaultNickname();
  await saveIdentity({ clientId: state.clientId, nickname });
  broadcastState();
  return getPopupState();
}

async function initialize() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    await ensureIdentity();

    manager = createBackgroundConnectionManager({
      url: state.websocketUrl,
      getRegistrationPayload: buildRegistrationPayload,
      getActiveTabPayload: () => buildActiveTabPayload(),
      onMessage: handleSocketMessage,
      onStateChange: setConnectionState
    });

    manager.connect();
    await refreshActiveTabSnapshot();
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

  return false;
});

initialize();
