describe('extension background bootstrap sync', () => {
  let onMessageListener = null;
  let sentMessages;
  let contexts = [];

  async function flushAsyncWork() {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  function loadBackground() {
    delete require.cache[require.resolve('../../extension/shared.js')];
    delete require.cache[require.resolve('../../extension/background.js')];
    require('../../extension/background.js');
  }

  beforeEach(() => {
    sentMessages = [];
    contexts = [];
    onMessageListener = null;

    global.self = global;

    global.importScripts = () => {
      global.ShortsSpreaderShared = require('../../extension/shared.js');
    };

    global.fetch = vi.fn(async () => ({ status: 200 }));

    global.chrome = {
      runtime: {
        lastError: null,
        sendMessage(message, callback) {
          sentMessages.push(message);
          callback?.({ ok: true });
        },
        getURL(path) {
          return `chrome-extension://extension-id/${path}`;
        },
        getContexts: vi.fn(async () => contexts),
        onMessage: {
          addListener(listener) {
            onMessageListener = listener;
          }
        },
        onInstalled: { addListener: vi.fn() },
        onStartup: { addListener: vi.fn() }
      },
      offscreen: {
        createDocument: vi.fn(async () => {
          contexts = [{}];
        })
      },
      storage: {
        local: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => ({}))
        }
      },
      tabs: {
        query: vi.fn(async () => [{ id: 1, url: 'https://example.com/post', title: 'Example' }]),
        sendMessage: vi.fn((tabId, message, callback) => {
          callback?.({ ok: true });
        }),
        onActivated: { addListener: vi.fn() },
        onUpdated: { addListener: vi.fn() },
        onRemoved: { addListener: vi.fn() }
      }
    };
  });

  afterEach(() => {
    delete global.importScripts;
    delete global.chrome;
    delete global.fetch;
    delete global.self;
    delete global.ShortsSpreaderShared;
    delete require.cache[require.resolve('../../extension/shared.js')];
    delete require.cache[require.resolve('../../extension/background.js')];
  });

  it('keeps bootstrap syncs idempotent without forcing reconnect', async () => {
    loadBackground();
    await flushAsyncWork();

    const initialSyncMessages = sentMessages.filter((message) => message?.type === 'offscreen_sync');
    expect(initialSyncMessages.length).toBeGreaterThan(0);
    expect(initialSyncMessages.every((message) => message.payload?.reconnect === false)).toBe(true);

    onMessageListener({ type: 'offscreen_ready' }, {}, () => {});
    await flushAsyncWork();

    const syncMessages = sentMessages.filter((message) => message?.type === 'offscreen_sync');
    expect(syncMessages.length).toBeGreaterThanOrEqual(2);
    expect(syncMessages.every((message) => message.payload?.reconnect === false)).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns popup state without triggering a second HTTP probe', async () => {
    loadBackground();
    await flushAsyncWork();

    expect(global.fetch).toHaveBeenCalledTimes(1);

    let responsePayload;
    const keepChannelOpen = onMessageListener({ type: 'popup_get_state' }, {}, (response) => {
      responsePayload = response;
    });

    expect(keepChannelOpen).toBe(true);
    await flushAsyncWork();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(responsePayload).toMatchObject({
      httpProbeStatus: 'http_200',
      websocketUrl: 'ws://127.0.0.1:3000'
    });
  });
});
