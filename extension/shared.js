(function initSharedScope(globalScope) {
  const STORAGE_KEYS = {
    clientId: 'clientId',
    nickname: 'nickname',
    serverOrigin: 'serverOrigin',
    websocketUrl: 'websocketUrl',
    dashboardUrl: 'dashboardUrl',
    hitVolume: 'hitVolume'
  };

  const DEFAULT_SERVER_ORIGIN = 'https://shorts-spread.w00.kr';
  const DEFAULT_WEBSOCKET_URL = 'wss://shorts-spread.w00.kr/ws/';
  const DEFAULT_DASHBOARD_URL = 'https://shorts-spread.w00.kr/dashboard';
  const MAX_RECONNECT_DELAY_MS = 30000;
  const BASE_RECONNECT_DELAY_MS = 1000;
  const NICKNAME_ADJECTIVES = ['Amber', 'Velvet', 'Solar', 'Mellow', 'Quiet', 'Lucky', 'Fable', 'Gentle'];
  const NICKNAME_NOUNS = ['Otter', 'Comet', 'Lantern', 'Harbor', 'Meadow', 'Panda', 'Falcon', 'Clover'];

  function pickRandomItem(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '';
    }

    if (globalScope.crypto?.getRandomValues) {
      const buffer = new Uint32Array(1);
      globalScope.crypto.getRandomValues(buffer);
      return items[buffer[0] % items.length];
    }

    return items[Math.floor(Math.random() * items.length)];
  }

  function sanitizeNickname(value) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.replace(/\s+/g, ' ').trim().slice(0, 40);
  }

  function createDefaultNickname() {
    return `${pickRandomItem(NICKNAME_ADJECTIVES)} ${pickRandomItem(NICKNAME_NOUNS)}`.trim();
  }

  function generateClientId() {
    if (typeof globalScope.crypto?.randomUUID === 'function') {
      return globalScope.crypto.randomUUID();
    }

    return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function parseUrl(url) {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  }

  function getSiteDomain(url) {
    const parsedUrl = parseUrl(url);
    return parsedUrl?.hostname || 'unknown';
  }

  function buildEligibility(url) {
    const parsedUrl = parseUrl(url);

    if (!parsedUrl) {
      return {
        isEligible: false,
        ineligibleReason: 'invalid_url'
      };
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isEligible: false,
        ineligibleReason: 'unsupported_protocol'
      };
    }

    const youtubeHosts = ['www.youtube.com', 'youtube.com', 'm.youtube.com'];
    if (youtubeHosts.includes(parsedUrl.hostname) && parsedUrl.pathname.startsWith('/shorts/')) {
      return {
        isEligible: false,
        ineligibleReason: 'youtube_shorts_tab'
      };
    }

    return {
      isEligible: true,
      ineligibleReason: null
    };
  }

  const sharedApi = {
    BASE_RECONNECT_DELAY_MS,
    DEFAULT_DASHBOARD_URL,
    DEFAULT_SERVER_ORIGIN,
    DEFAULT_WEBSOCKET_URL,
    MAX_RECONNECT_DELAY_MS,
    STORAGE_KEYS,
    buildEligibility,
    createDefaultNickname,
    generateClientId,
    getSiteDomain,
    sanitizeNickname
  };

  globalScope.ShortsSpreaderShared = sharedApi;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = sharedApi;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
