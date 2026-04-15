const MAX_FEED_ENTRIES = 18;
const EMPTY_LEADERBOARD = {
  spreaders: [],
  hitters: [],
  sites: []
};

const EMPTY_CLIENTS = {
  extensions: [],
  dashboards: []
};

export const EMPTY_DASHBOARD_DATA = {
  stats: null,
  logs: [],
  leaderboard: EMPTY_LEADERBOARD,
  clients: EMPTY_CLIENTS
};

export const WEBSOCKET_EVENT_TYPES = new Set(['stats_update', 'spread_event', 'hit_event']);

function normalizeNumber(value) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function normalizeStats(stats) {
  if (!stats || typeof stats !== 'object') {
    return null;
  }

  return {
    totalSpreads: normalizeNumber(stats.totalSpreads),
    totalHits: normalizeNumber(stats.totalHits),
    activeUsers: normalizeNumber(stats.activeUsers),
    peakActiveUsers: normalizeNumber(stats.peakActiveUsers),
    conversionRate: normalizeNumber(stats.conversionRate)
  };
}

export function normalizeLeaderboard(leaderboard) {
  if (!leaderboard || typeof leaderboard !== 'object') {
    return EMPTY_LEADERBOARD;
  }

  return {
    spreaders: Array.isArray(leaderboard.spreaders) ? leaderboard.spreaders : [],
    hitters: Array.isArray(leaderboard.hitters) ? leaderboard.hitters : [],
    sites: Array.isArray(leaderboard.sites) ? leaderboard.sites : []
  };
}

export function normalizeClients(clients) {
  if (!clients || typeof clients !== 'object') {
    return EMPTY_CLIENTS;
  }

  return {
    extensions: Array.isArray(clients.extensions) ? clients.extensions : [],
    dashboards: Array.isArray(clients.dashboards) ? clients.dashboards : []
  };
}

export function normalizeLogEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const entryType = entry.type === 'hit' ? 'hit' : 'spread';
  const victimClientIds = Array.isArray(entry.victimClientIds) ? entry.victimClientIds : [];

  return {
    ...entry,
    type: entryType,
    victimClientIds,
    victimCount: normalizeNumber(entry.victimCount ?? victimClientIds.length),
    timestamp: entry.timestamp || entry.createdAt || null,
    createdAt: entry.createdAt || entry.timestamp || null
  };
}

export function buildFeedEntryKey(entry, index = 0) {
  if (!entry || typeof entry !== 'object') {
    return `empty-${index}`;
  }

  if (entry.type === 'hit') {
    return [
      'hit',
      entry.idempotencyKey || '',
      entry.spreadId || 'spread',
      entry.victimClientId || entry.victimName || 'viewer',
      entry.timestamp || entry.createdAt || index
    ].join(':');
  }

  return [
    'spread',
    entry.idempotencyKey || '',
    entry.spreadId || '',
    entry.spreaderName || entry.clientId || 'spreader',
    entry.timestamp || entry.createdAt || index
  ].join(':');
}

function hasFeedEntry(entries, nextEntry) {
  const nextKey = buildFeedEntryKey(nextEntry);

  return entries.some((entry, index) => buildFeedEntryKey(entry, index) === nextKey);
}

export function mergeFeedEntry(entries, nextEntry) {
  const normalizedEntry = normalizeLogEntry(nextEntry);

  if (!normalizedEntry) {
    return entries.slice(0, MAX_FEED_ENTRIES);
  }

  const nextKey = buildFeedEntryKey(normalizedEntry);
  const dedupedEntries = entries.filter((entry, index) => buildFeedEntryKey(entry, index) !== nextKey);

  return [normalizedEntry, ...dedupedEntries].slice(0, MAX_FEED_ENTRIES);
}

export function incrementLeaderboardEntry(entries, name, valueKey) {
  if (!name) {
    return entries;
  }

  const nextEntries = Array.isArray(entries)
    ? entries.map((entry) => ({ ...entry }))
    : [];
  const existingEntry = nextEntries.find((entry) => entry.name === name);

  if (existingEntry) {
    existingEntry[valueKey] = normalizeNumber(existingEntry[valueKey]) + 1;
  } else {
    nextEntries.push({ name, [valueKey]: 1 });
  }

  return nextEntries
    .sort((left, right) => normalizeNumber(right[valueKey]) - normalizeNumber(left[valueKey]) || left.name.localeCompare(right.name))
    .slice(0, 5);
}

export function applyRealtimeMessage(currentData, message) {
  if (!message || typeof message !== 'object' || !WEBSOCKET_EVENT_TYPES.has(message.type)) {
    return currentData;
  }

  const payload = message.payload && typeof message.payload === 'object' ? message.payload : {};

  if (message.type === 'stats_update') {
    return {
      ...currentData,
      stats: normalizeStats(payload)
    };
  }

  if (message.type === 'spread_event') {
    const eventEntry = {
      type: 'spread',
      spreadId: payload.spreadId,
      spreaderName: payload.spreaderName,
      shortsTitle: payload.shortsTitle,
      victimCount: payload.victimCount,
      timestamp: payload.timestamp
    };
    const alreadyPresent = hasFeedEntry(currentData.logs, eventEntry);

    return {
      ...currentData,
      logs: mergeFeedEntry(currentData.logs, eventEntry),
      leaderboard: alreadyPresent
        ? currentData.leaderboard
        : {
            ...currentData.leaderboard,
            spreaders: incrementLeaderboardEntry(currentData.leaderboard.spreaders, payload.spreaderName, 'totalSpreads')
          }
    };
  }

  if (message.type === 'hit_event') {
    const eventEntry = {
      type: 'hit',
      spreadId: payload.spreadId,
      victimClientId: payload.victimClientId,
      victimName: payload.victimName,
      replacedTagType: payload.replacedTagType,
      siteDomain: payload.siteDomain,
      deliveryMode: payload.deliveryMode,
      timestamp: payload.timestamp
    };
    const alreadyPresent = hasFeedEntry(currentData.logs, eventEntry);

    return {
      ...currentData,
      logs: mergeFeedEntry(currentData.logs, eventEntry),
      leaderboard: alreadyPresent
        ? currentData.leaderboard
        : {
            ...currentData.leaderboard,
            hitters: incrementLeaderboardEntry(currentData.leaderboard.hitters, payload.victimName, 'totalHits'),
            sites: incrementLeaderboardEntry(currentData.leaderboard.sites, payload.siteDomain, 'totalHits')
          }
    };
  }

  return currentData;
}

export function normalizeDashboardData(data) {
  const source = data && typeof data === 'object' ? data : {};

  return {
    stats: normalizeStats(source.stats),
    logs: (Array.isArray(source.logs) ? source.logs : Array.isArray(source.spreadLog) ? source.spreadLog : [])
      .map(normalizeLogEntry)
      .filter(Boolean)
      .slice(0, MAX_FEED_ENTRIES),
    leaderboard: normalizeLeaderboard(source.leaderboard),
    clients: normalizeClients(source.clients)
  };
}

export function mergeRealtimeMessages(currentData, messages) {
  return messages.reduce(applyRealtimeMessage, currentData);
}

export function enqueueRealtimeMessage(queue, message) {
  return [...queue, message].slice(-MAX_FEED_ENTRIES);
}

export { MAX_FEED_ENTRIES };
