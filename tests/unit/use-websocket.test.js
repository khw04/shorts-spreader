describe('useWebSocket session controller', () => {
  async function loadModule() {
    return import('../../src/hooks/useWebSocket.js');
  }

  function createMockSocket(url) {
    return {
      url,
      readyState: WebSocket.CONNECTING,
      sent: [],
      closeCalls: 0,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send(message) {
        this.sent.push(message);
      },
      close() {
        this.closeCalls += 1;
        this.readyState = WebSocket.CLOSED;
      },
      emitOpen() {
        this.readyState = WebSocket.OPEN;
        this.onopen?.();
      },
      emitMessage(message) {
        this.onmessage?.({ data: message });
      },
      emitClose() {
        this.readyState = WebSocket.CLOSED;
        this.onclose?.();
      }
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reconnects with one fresh socket and one registration per successful reopen', async () => {
    const { createWebSocketSession } = await loadModule();
    const sockets = [];
    const reconnects = [];
    const statuses = [];

    const session = createWebSocketSession({
      url: 'ws://localhost:3000',
      reconnectDelayMs: 250,
      createSocket: (url) => {
        const socket = createMockSocket(url);

        sockets.push(socket);

        return socket;
      },
      onStatusChange: (status) => {
        statuses.push(status);
      },
      onOpen: (socket) => {
        socket.send(JSON.stringify({ type: 'register_dashboard' }));
      },
      onReconnect: () => {
        reconnects.push('open');
      }
    });

    session.start();
    session.start();

    expect(sockets).toHaveLength(1);
    expect(statuses.at(-1)).toBe('connecting');

    sockets[0].emitOpen();

    expect(sockets[0].sent).toEqual([JSON.stringify({ type: 'register_dashboard' })]);
    expect(reconnects).toEqual([]);

    sockets[0].emitClose();
    sockets[0].emitClose();

    expect(statuses.at(-1)).toBe('reconnecting');

    vi.advanceTimersByTime(249);
    expect(sockets).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);

    sockets[1].emitOpen();

    expect(reconnects).toEqual(['open']);
    expect(sockets[1].sent).toEqual([JSON.stringify({ type: 'register_dashboard' })]);
    expect(statuses.at(-1)).toBe('open');
  });

  it('ignores invalid payloads and stops reconnect scheduling after teardown', async () => {
    const { createWebSocketSession, safeParseWebSocketMessage } = await loadModule();
    const sockets = [];
    const messages = [];

    const session = createWebSocketSession({
      url: 'ws://localhost:3000',
      reconnectDelayMs: 150,
      createSocket: (url) => {
        const socket = createMockSocket(url);

        sockets.push(socket);

        return socket;
      },
      onMessage: (message) => {
        messages.push(message);
      }
    });

    expect(safeParseWebSocketMessage('not-json')).toBeNull();
    expect(safeParseWebSocketMessage(JSON.stringify({ type: 'stats_update' }))).toEqual({ type: 'stats_update' });

    session.start();
    sockets[0].emitOpen();
    sockets[0].emitMessage('not-json');
    sockets[0].emitMessage(JSON.stringify({ type: 'spread_event', payload: { spreadId: 'spread-1' } }));

    expect(messages).toEqual([{ type: 'spread_event', payload: { spreadId: 'spread-1' } }]);

    session.stop();

    expect(sockets[0].closeCalls).toBe(1);

    vi.advanceTimersByTime(200);

    expect(sockets).toHaveLength(1);
  });
});
