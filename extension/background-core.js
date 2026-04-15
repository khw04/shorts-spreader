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

    function emitState() {
      onStateChange?.({
        connectionStatus,
        lastError,
        reconnectAttempt,
        reconnectDelayMs: reconnectAttempt > 0
          ? Math.min(shared.BASE_RECONNECT_DELAY_MS * (2 ** (reconnectAttempt - 1)), shared.MAX_RECONNECT_DELAY_MS)
          : 0,
        isConnected: connectionStatus === 'connected'
      });
    }

    function setStatus(nextStatus, errorMessage = null) {
      connectionStatus = nextStatus;
      lastError = errorMessage;
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

      setStatus('reconnecting');
      reconnectTimer = setTimeoutFn(() => {
        reconnectTimer = null;
        connect();
      }, delayMs);
    }

    function connect() {
      if (!url || socket) {
        return socket;
      }

      clearReconnectTimer();
      setStatus(hasConnected ? 'reconnecting' : 'connecting');
      const nextSocket = createSocket(url);
      socket = nextSocket;

      nextSocket.onopen = () => {
        if (socket !== nextSocket) {
          return;
        }

        hasConnected = true;
        reconnectAttempt = 0;
        setStatus('connected');
        sendRegistration();
        sendActiveTabSnapshot();
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

        setStatus('error', 'websocket_error');
      };

      nextSocket.onclose = () => {
        if (socket !== nextSocket) {
          return;
        }

        clearSocketHandlers(nextSocket);
        socket = null;
        scheduleReconnect();
      };

      return nextSocket;
    }

    return {
      connect,
      getState() {
        return {
          connectionStatus,
          lastError,
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
