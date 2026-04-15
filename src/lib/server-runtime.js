const { WebSocket } = require('ws');
const { validateInboundMessage, validateOutboundMessage } = require('./protocol');
const {
  buildStatsUpdatePayload,
  recordHitConfirm,
  recordSpread,
  registerClient,
  registerDashboard,
  setActiveTab,
  sharedState,
  unregisterClient,
  unregisterDashboard
} = require('./state');

function safeJsonParse(rawMessage) {
  try {
    return JSON.parse(rawMessage.toString());
  } catch {
    return null;
  }
}

function extractShortsId(shortsUrl) {
  try {
    const parsedUrl = new URL(shortsUrl);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);

    return segments[segments.length - 1] || shortsUrl;
  } catch {
    return shortsUrl;
  }
}

function buildSpreadEventPayload(spreadEntry) {
  return {
    spreadId: spreadEntry.spreadId,
    spreaderName: spreadEntry.spreaderName,
    shortsTitle: spreadEntry.shortsTitle,
    victimCount: spreadEntry.victimClientIds.length,
    timestamp: spreadEntry.createdAt
  };
}

function buildHitEventPayload(hitEntry) {
  return {
    spreadId: hitEntry.spreadId,
    victimClientId: hitEntry.victimClientId,
    victimName: hitEntry.victimName,
    replacedTagType: hitEntry.replacedTagType,
    siteDomain: hitEntry.siteDomain,
    deliveryMode: hitEntry.deliveryMode,
    timestamp: hitEntry.timestamp
  };
}

function buildHitPayload(spreadEntry) {
  return {
    spreadId: spreadEntry.spreadId,
    spreaderName: spreadEntry.spreaderName,
    shortsTitle: spreadEntry.shortsTitle,
    shortsId: extractShortsId(spreadEntry.shortsUrl)
  };
}

function sendValidatedMessage(socket, message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  const validated = validateOutboundMessage(message);

  if (!validated.ok) {
    throw new Error(validated.error);
  }

  socket.send(JSON.stringify(validated.value));

  return true;
}

function sendStatsUpdate(socket) {
  if (!socket?.clientMeta) {
    return false;
  }

  const clientId = socket.clientMeta.role === 'extension' ? socket.clientMeta.clientId : undefined;

  return sendValidatedMessage(socket, {
    type: 'stats_update',
    payload: buildStatsUpdatePayload({ clientId })
  });
}

function broadcastToRegisteredClients(wss, buildMessage, options = {}) {
  const excludedSockets = new Set(options.excludeSockets || []);

  wss.clients.forEach((clientSocket) => {
    if (excludedSockets.has(clientSocket)) {
      return;
    }

    if (!clientSocket.clientMeta || clientSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    sendValidatedMessage(clientSocket, buildMessage(clientSocket));
  });
}

function broadcastStatsUpdate(wss, options = {}) {
  broadcastToRegisteredClients(
    wss,
    (clientSocket) => ({
      type: 'stats_update',
      payload: buildStatsUpdatePayload({
        clientId: clientSocket.clientMeta.role === 'extension' ? clientSocket.clientMeta.clientId : undefined
      })
    }),
    options
  );
}

function broadcastEvent(wss, type, payload, options = {}) {
  broadcastToRegisteredClients(wss, () => ({ type, payload }), options);
}

function collectVictimSockets(wss, spreaderClientId) {
  const victims = [];

  wss.clients.forEach((clientSocket) => {
    if (clientSocket.readyState !== WebSocket.OPEN || clientSocket.clientMeta?.role !== 'extension') {
      return;
    }

    const activeTab = clientSocket.clientMeta.activeTab;

    if (!activeTab?.isEligible || clientSocket.clientMeta.clientId === spreaderClientId) {
      return;
    }

    victims.push(clientSocket);
  });

  return victims;
}

function defaultGenerateSpreadId() {
  return `spread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createServerRuntime({
  wss,
  generateSpreadId = defaultGenerateSpreadId,
  heartbeatIntervalMs = 30000,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval
}) {
  if (!wss) {
    throw new Error('createServerRuntime requires a WebSocket server instance');
  }

  let heartbeatTimer = null;
  let socketSequence = 0;

  function describeSocket(socket) {
    const socketId = socket.__debugSocketId || 'socket-unknown';
    const clientId = socket.clientMeta?.clientId || 'unregistered';
    const role = socket.clientMeta?.role || 'unknown';
    return { socketId, clientId, role };
  }

  function updateSocketDebug(socket, patch) {
    socket.__debugContext = {
      connectedAt: socket.__debugContext?.connectedAt || new Date().toISOString(),
      requestPath: socket.__debugContext?.requestPath || 'unknown',
      remoteAddress: socket.__debugContext?.remoteAddress || 'unknown',
      lastMessageType: socket.__debugContext?.lastMessageType || null,
      ...patch
    };
  }

  function logSuspiciousSocketClose(socket) {
    const connectedAt = socket.__debugContext?.connectedAt;
    const lifetimeMs = connectedAt ? Date.now() - new Date(connectedAt).getTime() : null;
    const isShortLived = typeof lifetimeMs === 'number' && lifetimeMs < 5000;
    const isDashboard = socket.clientMeta?.role === 'dashboard';
    const isUnregistered = !socket.clientMeta;

    if (!isDashboard && !isUnregistered && !isShortLived) {
      return;
    }

    console.warn('[ws] suspicious_close', {
      ...describeSocket(socket),
      connectedAt: connectedAt || 'unknown',
      lifetimeMs: lifetimeMs ?? 'unknown',
      requestPath: socket.__debugContext?.requestPath || 'unknown',
      remoteAddress: socket.__debugContext?.remoteAddress || 'unknown',
      lastMessageType: socket.__debugContext?.lastMessageType || 'none'
    });
  }

  function handleConnection(socket, request) {
    socketSequence += 1;
    socket.__debugSocketId = `socket-${socketSequence}`;
    socket.clientMeta = null;
    socket.isAlive = true;
    updateSocketDebug(socket, {
      requestPath: request?.url || 'unknown',
      remoteAddress: request?.socket?.remoteAddress || 'unknown'
    });

    console.info('[ws] connection', describeSocket(socket));

    if (typeof socket.on === 'function') {
      socket.on('pong', () => {
        socket.isAlive = true;
        console.info('[ws] pong', describeSocket(socket));
      });
    }

    socket.send(
      JSON.stringify({
        type: 'bootstrap_ready',
        message: 'WebSocket server bootstrap is running.'
      })
    );
  }

  function handleMessage(socket, rawMessage) {
    const parsedMessage = safeJsonParse(rawMessage);

    if (!parsedMessage) {
      return { handled: false, reason: 'invalid_json' };
    }

    const validatedMessage = validateInboundMessage(parsedMessage);

    if (!validatedMessage.ok) {
      return { handled: false, reason: 'invalid_message', error: validatedMessage.error };
    }

    const { type, payload } = validatedMessage.value;
    updateSocketDebug(socket, { lastMessageType: type });

    if (type === 'register_client') {
      registerClient(payload);
      socket.clientMeta = {
        role: 'extension',
        clientId: payload.clientId,
        nickname: payload.nickname,
        activeTab: socket.clientMeta?.activeTab || null
      };
      console.info('[ws] register_client', describeSocket(socket));
      sendStatsUpdate(socket);
      broadcastStatsUpdate(wss, { excludeSockets: [socket] });
      return { handled: true, type };
    }

    if (type === 'register_dashboard') {
      const dashboard = registerDashboard();
      socket.clientMeta = {
        role: 'dashboard',
        dashboardId: dashboard.dashboardId
      };
      console.info('[ws] register_dashboard', {
        ...describeSocket(socket),
        dashboardId: dashboard.dashboardId
      });
      sendStatsUpdate(socket);
      broadcastStatsUpdate(wss, { excludeSockets: [socket] });
      return { handled: true, type };
    }

    if (type === 'set_active_tab') {
      if (socket.clientMeta?.role !== 'extension' || socket.clientMeta.clientId !== payload.clientId) {
        return { handled: false, reason: 'unauthorized_active_tab' };
      }

      const activeTab = setActiveTab(payload);
      socket.clientMeta = {
        ...socket.clientMeta,
        activeTab
      };
      console.info('[ws] set_active_tab', {
        ...describeSocket(socket),
        tabId: activeTab.tabId,
        isEligible: activeTab.isEligible,
        siteDomain: activeTab.siteDomain
      });
      broadcastStatsUpdate(wss);
      return { handled: true, type, activeTab };
    }

    if (type === 'spread') {
      if (socket.clientMeta?.role !== 'extension') {
        return { handled: false, reason: 'unauthorized_spread' };
      }

      const victimSockets = collectVictimSockets(wss, socket.clientMeta.clientId);
      const spreadEntry = recordSpread({
        spreadId: generateSpreadId(),
        clientId: socket.clientMeta.clientId,
        shortsUrl: payload.shortsUrl,
        shortsTitle: payload.shortsTitle,
        spreaderName: payload.spreaderName,
        victimClientIds: victimSockets.map((victimSocket) => victimSocket.clientMeta.clientId)
      });

      const spreadEventPayload = buildSpreadEventPayload(spreadEntry);
      const hitPayload = buildHitPayload(spreadEntry);

      victimSockets.forEach((victimSocket) => {
        sendValidatedMessage(victimSocket, {
          type: 'hit',
          payload: hitPayload
        });
      });

      broadcastEvent(wss, 'spread_event', spreadEventPayload);
      broadcastStatsUpdate(wss);
      return { handled: true, type, spreadEntry };
    }

    if (type === 'hit_confirm') {
      if (socket.clientMeta?.role !== 'extension' || socket.clientMeta.clientId !== payload.victimClientId) {
        return { handled: false, reason: 'unauthorized_hit_confirm' };
      }

      const spread = sharedState.spreads.get(payload.spreadId);

      if (!spread || !spread.victimClientIds.includes(payload.victimClientId)) {
        return { handled: false, reason: 'untargeted_victim' };
      }

      const result = recordHitConfirm(payload);

      if (!result.accepted || !result.hit) {
        return {
          handled: false,
          reason: result.duplicate ? 'duplicate_hit' : 'rejected_hit',
          result
        };
      }

      broadcastEvent(wss, 'hit_event', buildHitEventPayload(result.hit));
      broadcastStatsUpdate(wss);
      return { handled: true, type, result };
    }

    return { handled: false, reason: 'unsupported_type', type };
  }

  function handleClose(socket) {
    console.warn('[ws] close', describeSocket(socket));
    logSuspiciousSocketClose(socket);

    if (socket.clientMeta?.role === 'extension') {
      unregisterClient(socket.clientMeta.clientId);
      broadcastStatsUpdate(wss, { excludeSockets: [socket] });
      return { handled: true, role: 'extension' };
    }

    if (socket.clientMeta?.role === 'dashboard') {
      unregisterDashboard(socket.clientMeta.dashboardId);
      broadcastStatsUpdate(wss, { excludeSockets: [socket] });
      return { handled: true, role: 'dashboard' };
    }

    return { handled: false, reason: 'unregistered_socket' };
  }

  function startHeartbeat() {
    if (heartbeatTimer) {
      return heartbeatTimer;
    }

    heartbeatTimer = setIntervalFn(() => {
      wss.clients.forEach((socket) => {
        if (socket.readyState !== WebSocket.OPEN) {
          return;
        }

        if (socket.isAlive === false) {
          console.warn('[ws] terminate', describeSocket(socket));
          if (typeof socket.terminate === 'function') {
            socket.terminate();
          }

          return;
        }

        console.info('[ws] ping', {
          ...describeSocket(socket),
          isAlive: socket.isAlive
        });
        socket.isAlive = false;

        if (typeof socket.ping === 'function') {
          socket.ping();
        }
      });
    }, heartbeatIntervalMs);

    return heartbeatTimer;
  }

  function stopHeartbeat() {
    if (!heartbeatTimer) {
      return;
    }

    clearIntervalFn(heartbeatTimer);
    heartbeatTimer = null;
  }

  return {
    handleClose,
    handleConnection,
    handleMessage,
    startHeartbeat,
    stopHeartbeat
  };
}

module.exports = {
  buildHitEventPayload,
  buildHitPayload,
  buildSpreadEventPayload,
  broadcastEvent,
  broadcastStatsUpdate,
  broadcastToRegisteredClients,
  collectVictimSockets,
  createServerRuntime,
  extractShortsId,
  safeJsonParse,
  sendStatsUpdate,
  sendValidatedMessage
};
