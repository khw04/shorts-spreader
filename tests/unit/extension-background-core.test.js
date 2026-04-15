const { createBackgroundConnectionManager } = require('../../extension/background-core.js');

describe('extension background connection manager', () => {
  function createMockSocket(url) {
    return {
      url,
      readyState: WebSocket.CONNECTING,
      sent: [],
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send(message) {
        this.sent.push(JSON.parse(message));
      },
      emitOpen() {
        this.readyState = WebSocket.OPEN;
        this.onopen?.();
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

  it('keeps one socket active and registers once for each successful open', () => {
    const sockets = [];
    const manager = createBackgroundConnectionManager({
      url: 'ws://localhost:3000',
      createSocket: (url) => {
        const socket = createMockSocket(url);
        sockets.push(socket);
        return socket;
      },
      getRegistrationPayload: () => ({
        clientId: 'client-a',
        nickname: 'Quiet Otter'
      }),
      getActiveTabPayload: () => ({
        clientId: 'client-a',
        tabId: 12,
        pageUrl: 'https://example.com/article',
        pageTitle: 'Article',
        siteDomain: 'example.com',
        isEligible: true,
        ineligibleReason: null
      })
    });

    manager.connect();
    manager.connect();

    expect(sockets).toHaveLength(1);

    sockets[0].emitOpen();

    expect(sockets[0].sent).toEqual([
      {
        type: 'register_client',
        payload: {
          clientId: 'client-a',
          nickname: 'Quiet Otter'
        }
      },
      {
        type: 'set_active_tab',
        payload: {
          clientId: 'client-a',
          tabId: 12,
          pageUrl: 'https://example.com/article',
          pageTitle: 'Article',
          siteDomain: 'example.com',
          isEligible: true,
          ineligibleReason: null
        }
      }
    ]);

    sockets[0].emitClose();
    vi.advanceTimersByTime(1000);

    expect(sockets).toHaveLength(2);

    sockets[1].emitOpen();

    expect(sockets[1].sent.filter((message) => message.type === 'register_client')).toHaveLength(1);
  });

  it('uses exponential reconnect backoff capped at 30 seconds', () => {
    const sockets = [];
    const manager = createBackgroundConnectionManager({
      url: 'ws://localhost:3000',
      createSocket: (url) => {
        const socket = createMockSocket(url);
        sockets.push(socket);
        return socket;
      },
      getRegistrationPayload: () => ({
        clientId: 'client-a',
        nickname: 'Quiet Otter'
      })
    });

    manager.connect();
    sockets[0].emitClose();

    vi.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);

    sockets[1].emitClose();
    vi.advanceTimersByTime(1999);
    expect(sockets).toHaveLength(2);

    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(3);

    sockets[2].emitClose();
    vi.advanceTimersByTime(4000);
    expect(sockets).toHaveLength(4);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      sockets.at(-1).emitClose();
      vi.advanceTimersByTime(30000);
    }

    expect(sockets.length).toBeGreaterThan(4);
    expect(manager.getState().reconnectAttempt).toBeGreaterThan(0);
  });
});
