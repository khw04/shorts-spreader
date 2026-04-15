(function initBackgroundCore(globalScope) {
  const shared = globalScope.ShortsSpreaderShared || require('./shared.js');

  function safeParseMessage(rawMessage) {
    const source = typeof rawMessage === 'string' ? rawMessage : rawMessage?.toString?.() || '';

    if (!source) {
      return null;
    }

    try {
      return JSON.parse(source);
    } catch {
      return null;
    }
  }

  function createBackgroundConnectionManager({
    url = shared.DEFAULT_WEBSOCKET_URL,
    fallbackUrls = [],
    createSocket = (socketUrl) => new WebSocket(socketUrl),
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    getRegistrationPayload,
    getActiveTabPayload,
    onMessage,
    onStateChange
  } = {}) {
    let socket = null;
    let reconnectTimer = null;
    let reconnectAttempt = 0;
    let hasConnected = false;
    let connectionStatus = 'idle';
    let lastError = null;
    let activeUrl = url;
    let urlCursor = 0;
    const candidateUrls = [url, ...fallbackUrls].filter((value, index, list) => typeof value === 'string' && value && list.indexOf(value) === index);

    function emitState() {
      onStateChange?.({
        connectionStatus,
        lastError,
        activeUrl,
        reconnectAttempt,
        reconnectDelayMs: reconnectAttempt > 0
          ? Math.min(shared.BASE_RECONNECT_DELAY_MS * (2 ** (reconnectAttempt - 1)), shared.MAX_RECONNECT_DELAY_MS)
          : 0,
        isConnected: connectionStatus === 'connected'
      });
    }

    function setStatus(nextStatus, errorMessage = null) {
      connectionStatus = nextStatus;
      if (errorMessage !== null) {
        lastError = errorMessage;
      }
      emitState();
    }

    function clearReconnectTimer() {
      if (!reconnectTimer) {
        return;
      }

      clearTimeoutFn(reconnectTimer);
      reconnectTimer = null;
    }

    function clearSocketHandlers(targetSocket) {
      if (!targetSocket) {
        return;
      }

      targetSocket.onopen = null;
      targetSocket.onmessage = null;
      targetSocket.onerror = null;
      targetSocket.onclose = null;
    }

    function send(message) {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }

      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    }

    function sendRegistration() {
      const payload = getRegistrationPayload?.();

      if (!payload?.clientId || !payload?.nickname) {
        return false;
      }

      return send({
        type: 'register_client',
        payload
      });
    }

    function sendActiveTabSnapshot() {
      const payload = getActiveTabPayload?.();

      if (!payload) {
        return false;
      }

      return send({
        type: 'set_active_tab',
        payload
      });
    }

    function scheduleReconnect() {
      clearReconnectTimer();
      reconnectAttempt += 1;
      const delayMs = Math.min(shared.BASE_RECONNECT_DELAY_MS * (2 ** (reconnectAttempt - 1)), shared.MAX_RECONNECT_DELAY_MS);

      setStatus('reconnecting', lastError);
      reconnectTimer = setTimeoutFn(() => {
        reconnectTimer = null;
        connect();
      }, delayMs);
    }

    function connect() {
      if (!candidateUrls.length || socket) {
        return socket;
      }

      clearReconnectTimer();
      setStatus(hasConnected ? 'reconnecting' : 'connecting');
      activeUrl = candidateUrls[urlCursor % candidateUrls.length];
      let nextSocket;

      try {
        nextSocket = createSocket(activeUrl);
      } catch (error) {
        socket = null;
        lastError = error?.message || 'websocket_constructor_error';
        urlCursor = (urlCursor + 1) % candidateUrls.length;
        scheduleReconnect();
        return null;
      }

      socket = nextSocket;

      nextSocket.onopen = () => {
        if (socket !== nextSocket) {
          return;
        }

        hasConnected = true;
        reconnectAttempt = 0;
        lastError = null;
        setStatus('connected');
        sendRegistration();
        sendActiveTabSnapshot();
        console.info('[ShortsSpreader] websocket connected', activeUrl);
      };

      nextSocket.onmessage = (event) => {
        if (socket !== nextSocket) {
          return;
        }

        const parsed = safeParseMessage(event?.data);

        if (parsed) {
          onMessage?.(parsed);
        }
      };

      nextSocket.onerror = () => {
        if (socket !== nextSocket) {
          return;
        }

        setStatus('error', `websocket_error:${activeUrl}`);
        console.error('[ShortsSpreader] websocket error', activeUrl);
      };

      nextSocket.onclose = (event) => {
        if (socket !== nextSocket) {
          return;
        }

        clearSocketHandlers(nextSocket);
        socket = null;
        urlCursor = (urlCursor + 1) % candidateUrls.length;
        lastError = `websocket_close:${activeUrl}:${event?.code ?? 'unknown'}:${event?.reason || 'no_reason'}`;
        console.warn('[ShortsSpreader] websocket closed', {
          url: activeUrl,
          code: event?.code ?? 'unknown',
          reason: event?.reason || 'no_reason'
        });
        scheduleReconnect();
      };

      return nextSocket;
    }

    return {
      connect,
      disconnect() {
        clearReconnectTimer();

        if (!socket) {
          return;
        }

        const targetSocket = socket;
        clearSocketHandlers(targetSocket);
        socket = null;

        if (typeof targetSocket.close === 'function' && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.close(1000, 'manual_disconnect');
        }
      },
      getState() {
        return {
          connectionStatus,
          lastError,
          activeUrl,
          reconnectAttempt,
          hasConnected,
          isConnected: connectionStatus === 'connected'
        };
      },
      resendActiveTabSnapshot() {
        return sendActiveTabSnapshot();
      },
      send,
      safeParseMessage
    };
  }

  const backgroundCoreApi = {
    createBackgroundConnectionManager,
    safeParseMessage
  };

  globalScope.ShortsSpreaderBackgroundCore = backgroundCoreApi;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = backgroundCoreApi;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
