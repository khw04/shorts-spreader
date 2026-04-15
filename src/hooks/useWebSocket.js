'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_RECONNECT_DELAY_MS = 1500;

function getJsonText(rawMessage) {
  if (typeof rawMessage === 'string') {
    return rawMessage;
  }

  if (rawMessage && typeof rawMessage.toString === 'function') {
    return rawMessage.toString();
  }

  return '';
}

export function safeParseWebSocketMessage(rawMessage) {
  const jsonText = getJsonText(rawMessage);

  if (!jsonText) {
    return null;
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

export function createWebSocketSession({
  url,
  createSocket = (socketUrl) => new WebSocket(socketUrl),
  reconnectDelayMs = DEFAULT_RECONNECT_DELAY_MS,
  onStatusChange,
  onMessage,
  onOpen,
  onReconnect,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout
}) {
  let activeSocket = null;
  let reconnectTimer = null;
  let hasConnected = false;
  let shouldReconnect = true;
  let reconnectAttempt = 0;

  function setStatus(nextStatus) {
    onStatusChange?.(nextStatus);
  }

  function clearReconnectTimer() {
    if (!reconnectTimer) {
      return;
    }

    clearTimeoutFn(reconnectTimer);
    reconnectTimer = null;
  }

  function detachSocket(socket) {
    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
  }

  function connect() {
    if (!url || activeSocket) {
      return activeSocket;
    }

    clearReconnectTimer();
    setStatus(hasConnected ? 'reconnecting' : 'connecting');

    const socket = createSocket(url);
    activeSocket = socket;

    socket.onopen = () => {
      if (activeSocket !== socket) {
        return;
      }

      const wasReconnect = hasConnected || reconnectAttempt > 0;

      hasConnected = true;
      reconnectAttempt = 0;
      setStatus('open');
      onOpen?.(socket);

      if (wasReconnect) {
        onReconnect?.(socket);
      }
    };

    socket.onmessage = (event) => {
      if (activeSocket !== socket) {
        return;
      }

      const parsedMessage = safeParseWebSocketMessage(event?.data);

      if (!parsedMessage) {
        return;
      }

      onMessage?.(parsedMessage, event);
    };

    socket.onerror = () => {
      if (activeSocket !== socket) {
        return;
      }

      setStatus('error');
    };

    socket.onclose = () => {
      if (activeSocket !== socket) {
        return;
      }

      detachSocket(socket);
      activeSocket = null;

      if (!shouldReconnect) {
        setStatus('closed');
        return;
      }

      reconnectAttempt += 1;
      setStatus('reconnecting');
      reconnectTimer = setTimeoutFn(() => {
        reconnectTimer = null;
        connect();
      }, reconnectDelayMs);
    };

    return socket;
  }

  function start() {
    shouldReconnect = true;
    connect();
  }

  function stop() {
    shouldReconnect = false;
    clearReconnectTimer();

    if (!activeSocket) {
      setStatus('closed');
      return;
    }

    const socket = activeSocket;

    detachSocket(socket);
    activeSocket = null;

    if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
      socket.close();
    }

    setStatus('closed');
  }

  function send(message) {
    if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      activeSocket.send(typeof message === 'string' ? message : JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  return {
    connect,
    send,
    start,
    stop
  };
}

export function useWebSocket(url, options = {}) {
  const [status, setStatus] = useState('idle');
  const sessionRef = useRef(null);
  const latestCallbacksRef = useRef({
    onMessage: options.onMessage,
    onOpen: options.onOpen,
    onReconnect: options.onReconnect
  });

  latestCallbacksRef.current = {
    onMessage: options.onMessage,
    onOpen: options.onOpen,
    onReconnect: options.onReconnect
  };

  const sendMessage = useCallback((message) => {
    if (!sessionRef.current) {
      return false;
    }

    return sessionRef.current.send(message);
  }, []);

  useEffect(() => {
    if (!url) {
      setStatus('idle');
      return undefined;
    }

    const session = createWebSocketSession({
      url,
      reconnectDelayMs: options.reconnectDelayMs,
      onStatusChange: setStatus,
      onMessage: (message, event) => {
        latestCallbacksRef.current.onMessage?.(message, event);
      },
      onOpen: (socket) => {
        latestCallbacksRef.current.onOpen?.(socket);
      },
      onReconnect: (socket) => {
        latestCallbacksRef.current.onReconnect?.(socket);
      }
    });

    sessionRef.current = session;
    session.start();

    return () => {
      session.stop();

      if (sessionRef.current === session) {
        sessionRef.current = null;
      }
    };
  }, [options.reconnectDelayMs, url]);

  return {
    isConnected: status === 'open',
    sendMessage,
    status
  };
}
