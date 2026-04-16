import styles from './task4-ui.module.css';
import { buildFeedEntryKey } from '../lib/dashboard-state';

function formatLogMessage(entry) {
  if (!entry || typeof entry !== 'object') {
    return 'Unknown event.';
  }

  if (entry.type === 'hit') {
    const targetSite = entry.siteDomain || '알 수 없는 사이트';
    const viewerName = entry.victimName || entry.victimClientId || '알 수 없는 시청자';
    const deliveryMode = entry.deliveryMode || '알 수 없는 방식';

    return `${viewerName}이(가) ${deliveryMode}을(를) 통해 ${targetSite}에서 적중을 등록했습니다.`;
  }

  const spreaderName = entry.spreaderName || entry.clientId || '알 수 없는 살포자';
  const spreadTargetCount = Number.isFinite(Number(entry.victimCount))
    ? Number(entry.victimCount)
    : Array.isArray(entry.victimClientIds)
      ? entry.victimClientIds.length
      : 0;
  const shortLabel = entry.shortsTitle || entry.shortsUrl || entry.spreadId || '알 수 없는 쇼츠';

  return `${spreaderName}이(가) ${shortLabel}을(를) ${spreadTargetCount}명에게 살포했습니다.`;
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
            <span className={styles.eyebrow}>실시간 로그</span>
            <h2 className={styles.sectionTitle}>실시간 피드</h2>
          </div>
        </div>
        <p className={styles.emptyState}>이벤트 불러오는 중...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>실시간 로그</span>
            <h2 className={styles.sectionTitle}>실시간 피드</h2>
          </div>
        </div>
        <p className={styles.emptyState}>이벤트를 불러올 수 없습니다.</p>
      </section>
    );
  }

  if (logs.length === 0) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>실시간 로그</span>
            <h2 className={styles.sectionTitle}>실시간 피드</h2>
          </div>
        </div>
        <p className={styles.emptyState}>아직 이벤트가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>실시간 로그</span>
          <h2 className={styles.sectionTitle}>실시간 피드</h2>
        </div>
        <p className={styles.subtleText}>최신 웹소켓 이벤트가 앞에 추가되며 목록 크기는 제한됩니다.</p>
      </div>
      <ul className={styles.feedList}>
        {logs.slice(0, 10).map((entry, index) => {
          const entryKey = buildFeedEntryKey(entry, index);

          return (
            <li className={styles.feedItem} key={entryKey}>
              <div className={styles.feedItemHeader}>
                <span className={styles.feedBadge} data-event={entry.type === 'hit' ? 'hit' : 'spread'}>
                  {entry.type === 'hit' ? '적중' : '살포'}
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
