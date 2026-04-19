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
        return '연결됨';
      case 'connecting':
        return '연결 중…';
      case 'reconnecting':
        return '재연결 중…';
      case 'error':
        return '연결 끊김';
      default:
        return '연결 끊김';
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
      serverOrigin: state?.serverOrigin || '',
      websocketUrl: state?.websocketUrl || '',
      websocketActiveUrl: state?.websocketActiveUrl || state?.websocketUrl || '',
      httpProbeUrl: state?.httpProbeUrl || '',
      httpProbeStatus: state?.httpProbeStatus || 'idle',
      lastError: state?.lastError || '',
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
