(function initPopupState(globalScope) {
  function getPersonalCountersForClient(state) {
    if (!state?.clientId) {
      return {
        totalSpreads: 0,
        totalHits: 0
      };
    }

    const counters = state.personalCounters;

    if (!counters || counters.clientId !== state.clientId) {
      return {
        totalSpreads: 0,
        totalHits: 0
      };
    }

    return {
      totalSpreads: Number(counters.totalSpreads) || 0,
      totalHits: Number(counters.totalHits) || 0
    };
  }

  function formatConnectionLabel(connectionStatus) {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting…';
      case 'reconnecting':
        return 'Reconnecting…';
      case 'error':
        return 'Disconnected';
      default:
        return 'Disconnected';
    }
  }

  function derivePopupViewModel(state) {
    const counters = getPersonalCountersForClient(state);
    const connectionStatus = state?.connectionStatus || 'disconnected';
    const isConnected = connectionStatus === 'connected';

    return {
      clientId: state?.clientId || '',
      connectionLabel: formatConnectionLabel(connectionStatus),
      connectionTone: isConnected ? 'connected' : 'disconnected',
      dashboardUrl: state?.dashboardUrl || '',
      nickname: state?.nickname || '',
      totalHits: counters.totalHits,
      totalSpreads: counters.totalSpreads,
      isConnected
    };
  }

  const popupStateApi = {
    derivePopupViewModel,
    formatConnectionLabel,
    getPersonalCountersForClient
  };

  globalScope.ShortsSpreaderPopupState = popupStateApi;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = popupStateApi;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
