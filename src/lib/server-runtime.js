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

  function handleConnection(socket) {
    socket.clientMeta = null;
    socket.isAlive = true;

    if (typeof socket.on === 'function') {
      socket.on('pong', () => {
        socket.isAlive = true;
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

    if (type === 'register_client') {
      registerClient(payload);
      socket.clientMeta = {
        role: 'extension',
        clientId: payload.clientId,
        nickname: payload.nickname,
        activeTab: socket.clientMeta?.activeTab || null
      };
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
          if (typeof socket.terminate === 'function') {
            socket.terminate();
          }

          return;
        }

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
