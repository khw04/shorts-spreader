import styles from './task4-ui.module.css';
import { buildFeedEntryKey } from '../lib/dashboard-state';

function formatLogMessage(entry) {
  if (!entry || typeof entry !== 'object') {
    return 'Unknown event.';
  }

  if (entry.type === 'hit') {
    const targetSite = entry.siteDomain || 'an unknown site';
    const viewerName = entry.victimName || entry.victimClientId || 'Unknown viewer';
    const deliveryMode = entry.deliveryMode || 'unknown mode';

    return `${viewerName} registered a hit on ${targetSite} via ${deliveryMode}.`;
  }

  const spreaderName = entry.spreaderName || entry.clientId || 'Unknown spreader';
  const spreadTargetCount = Number.isFinite(Number(entry.victimCount))
    ? Number(entry.victimCount)
    : Array.isArray(entry.victimClientIds)
      ? entry.victimClientIds.length
      : 0;
  const shortLabel = entry.shortsTitle || entry.shortsUrl || entry.spreadId || 'an unknown short';

  return `${spreaderName} spread ${shortLabel} to ${spreadTargetCount} target${spreadTargetCount === 1 ? '' : 's'}.`;
}

function formatLogTimestamp(entry) {
  const timestamp = entry?.timestamp || entry?.createdAt;

  return timestamp ? ` (${timestamp})` : '';
}

export function LiveFeed({ logs = [], isLoading = false, errorMessage = '' }) {
  if (isLoading) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>Realtime log</span>
            <h2 className={styles.sectionTitle}>Live feed</h2>
          </div>
        </div>
        <p className={styles.emptyState}>Loading events...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>Realtime log</span>
            <h2 className={styles.sectionTitle}>Live feed</h2>
          </div>
        </div>
        <p className={styles.emptyState}>Unable to load events.</p>
      </section>
    );
  }

  if (logs.length === 0) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>Realtime log</span>
            <h2 className={styles.sectionTitle}>Live feed</h2>
          </div>
        </div>
        <p className={styles.emptyState}>No events yet.</p>
      </section>
    );
  }

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Realtime log</span>
          <h2 className={styles.sectionTitle}>Live feed</h2>
        </div>
        <p className={styles.subtleText}>Newest websocket events are prepended and the list stays capped.</p>
      </div>
      <ul className={styles.feedList}>
        {logs.slice(0, 10).map((entry, index) => {
          const entryKey = buildFeedEntryKey(entry, index);

          return (
            <li className={styles.feedItem} key={entryKey}>
              <div className={styles.feedItemHeader}>
                <span className={styles.feedBadge} data-event={entry.type === 'hit' ? 'hit' : 'spread'}>
                  {entry.type === 'hit' ? 'hit' : 'spread'}
                </span>
                <span className={styles.feedMeta}>{formatLogTimestamp(entry)}</span>
              </div>
              <div className={styles.feedBody}>{formatLogMessage(entry)}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
