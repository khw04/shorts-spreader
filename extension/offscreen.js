(function initOffscreenDocument(globalScope) {
  const { createBackgroundConnectionManager } = globalScope.ShortsSpreaderBackgroundCore;

  let manager = null;
  let currentConfig = {
    websocketUrl: '',
    fallbackUrls: [],
    registrationPayload: null,
    activeTabPayload: null
  };

  function sameJson(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function postToBackground(message) {
    chrome.runtime.sendMessage(message, () => {
      void chrome.runtime.lastError;
    });
  }

  function buildManagerConfig(payload) {
    return {
      url: payload.websocketUrl,
      fallbackUrls: Array.isArray(payload.fallbackUrls) ? payload.fallbackUrls : [],
      getRegistrationPayload: () => currentConfig.registrationPayload,
      getActiveTabPayload: () => currentConfig.activeTabPayload,
      onMessage: (message) => {
        postToBackground({
          type: 'offscreen_socket_message',
          payload: message
        });
      },
      onStateChange: (nextState) => {
        postToBackground({
          type: 'offscreen_state_changed',
          payload: nextState
        });
      }
    };
  }

  function recreateManager(payload) {
    manager?.disconnect?.();
    currentConfig = {
      websocketUrl: payload.websocketUrl,
      fallbackUrls: Array.isArray(payload.fallbackUrls) ? payload.fallbackUrls : [],
      registrationPayload: payload.registrationPayload || null,
      activeTabPayload: payload.activeTabPayload || null
    };
    manager = createBackgroundConnectionManager(buildManagerConfig(payload));
    manager.connect();
  }

  function syncManager(payload) {
    const normalizedPayload = {
      websocketUrl: payload.websocketUrl,
      fallbackUrls: Array.isArray(payload.fallbackUrls) ? payload.fallbackUrls : [],
      registrationPayload: payload.registrationPayload || null,
      activeTabPayload: payload.activeTabPayload || null
    };

    const shouldReconnect =
      !manager ||
      payload.reconnect === true ||
      normalizedPayload.websocketUrl !== currentConfig.websocketUrl ||
      !sameJson(normalizedPayload.fallbackUrls, currentConfig.fallbackUrls) ||
      !sameJson(normalizedPayload.registrationPayload, currentConfig.registrationPayload);

    if (shouldReconnect) {
      recreateManager(normalizedPayload);
      return;
    }

    currentConfig = normalizedPayload;
    manager?.resendActiveTabSnapshot?.();

    const currentState = manager?.getState?.();
    if (currentState) {
      postToBackground({
        type: 'offscreen_state_changed',
        payload: currentState
      });
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'offscreen_sync') {
      syncManager(message.payload || {});
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === 'offscreen_send') {
      const ok = manager?.send?.(message.payload) || false;
      sendResponse({ ok });
      return false;
    }

    if (message?.type === 'offscreen_disconnect') {
      manager?.disconnect?.();
      sendResponse({ ok: true });
      return false;
    }

    return false;
  });

  postToBackground({ type: 'offscreen_ready' });
})(typeof globalThis !== 'undefined' ? globalThis : this);
