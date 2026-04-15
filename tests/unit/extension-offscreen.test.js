describe('extension offscreen connection sync', () => {
  let messageListener = null;
  let createManager;
  let managerInstances;
  let postedMessages;

  function loadOffscreen() {
    delete require.cache[require.resolve('../../extension/offscreen.js')];
    require('../../extension/offscreen.js');
  }

  function dispatchRuntimeMessage(message) {
    let responsePayload;
    const sendResponse = (response) => {
      responsePayload = response;
    };

    messageListener?.(message, {}, sendResponse);
    return responsePayload;
  }

  beforeEach(() => {
    managerInstances = [];
    postedMessages = [];

    createManager = vi.fn((config) => {
      const manager = {
        config,
        state: { connectionStatus: 'connected' },
        connect: vi.fn(),
        disconnect: vi.fn(),
        resendActiveTabSnapshot: vi.fn(),
        getState: vi.fn(() => manager.state)
      };

      managerInstances.push(manager);
      return manager;
    });

    global.ShortsSpreaderBackgroundCore = {
      createBackgroundConnectionManager: createManager
    };

    global.chrome = {
      runtime: {
        onMessage: {
          addListener(listener) {
            messageListener = listener;
          }
        },
        sendMessage(message, callback) {
          postedMessages.push(message);
          callback?.({ ok: true });
        }
      }
    };

    loadOffscreen();
  });

  afterEach(() => {
    delete global.chrome;
    delete global.ShortsSpreaderBackgroundCore;
    delete require.cache[require.resolve('../../extension/offscreen.js')];
  });

  it('does not recreate a healthy manager for a duplicate reconnect sync', () => {
    const payload = {
      websocketUrl: 'ws://127.0.0.1:3000',
      fallbackUrls: ['ws://localhost:3000'],
      registrationPayload: { clientId: 'client-a', nickname: 'Quiet Otter' },
      activeTabPayload: { clientId: 'client-a', tabId: 7 },
      reconnect: true
    };

    expect(postedMessages).toContainEqual({ type: 'offscreen_ready' });

    expect(dispatchRuntimeMessage({ type: 'offscreen_sync', payload })).toEqual({ ok: true });
    expect(createManager).toHaveBeenCalledTimes(1);
    expect(managerInstances[0].connect).toHaveBeenCalledTimes(1);

    expect(dispatchRuntimeMessage({ type: 'offscreen_sync', payload })).toEqual({ ok: true });
    expect(createManager).toHaveBeenCalledTimes(1);
    expect(managerInstances[0].disconnect).not.toHaveBeenCalled();
    expect(managerInstances[0].resendActiveTabSnapshot).toHaveBeenCalledTimes(1);
  });

  it('recreates the manager when reconnect is requested and the current manager is unhealthy', () => {
    const payload = {
      websocketUrl: 'ws://127.0.0.1:3000',
      fallbackUrls: ['ws://localhost:3000'],
      registrationPayload: { clientId: 'client-a', nickname: 'Quiet Otter' },
      activeTabPayload: { clientId: 'client-a', tabId: 7 },
      reconnect: true
    };

    dispatchRuntimeMessage({ type: 'offscreen_sync', payload });
    managerInstances[0].state = { connectionStatus: 'disconnected' };

    dispatchRuntimeMessage({ type: 'offscreen_sync', payload });

    expect(createManager).toHaveBeenCalledTimes(2);
    expect(managerInstances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(managerInstances[1].connect).toHaveBeenCalledTimes(1);
  });
});
