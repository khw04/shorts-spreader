const { derivePopupViewModel } = require('../../extension/popup-state.js');

describe('extension popup state helpers', () => {
  it('uses server personal counters only when they match the stored client id', () => {
    const mismatch = derivePopupViewModel({
      clientId: 'client-a',
      nickname: 'Quiet Otter',
      connectionStatus: 'connected',
      dashboardUrl: 'http://localhost:3000/dashboard',
      personalCounters: {
        clientId: 'someone-else',
        nickname: 'Different User',
        totalSpreads: 99,
        totalHits: 77
      }
    });

    expect(mismatch.totalSpreads).toBe(0);
    expect(mismatch.totalHits).toBe(0);

    const matching = derivePopupViewModel({
      clientId: 'client-a',
      nickname: 'Quiet Otter',
      connectionStatus: 'connected',
      dashboardUrl: 'http://localhost:3000/dashboard',
      personalCounters: {
        clientId: 'client-a',
        nickname: 'Quiet Otter',
        totalSpreads: 4,
        totalHits: 2
      }
    });

    expect(matching.totalSpreads).toBe(4);
    expect(matching.totalHits).toBe(2);
    expect(matching.connectionLabel).toBe('Connected');
  });

  it('marks non-open websocket states as disconnected in the popup', () => {
    const viewModel = derivePopupViewModel({
      clientId: 'client-a',
      nickname: 'Quiet Otter',
      connectionStatus: 'reconnecting',
      dashboardUrl: 'http://localhost:3000/dashboard'
    });

    expect(viewModel.isConnected).toBe(false);
    expect(viewModel.connectionTone).toBe('disconnected');
    expect(viewModel.connectionLabel).toBe('Reconnecting…');
  });
});
