import styles from './task4-ui.module.css';

function LeaderboardList({ entries, emptyMessage, title, valueKey }) {
  return (
    <article className={styles.leaderboardBlock}>
      <h3 className={styles.listTitle}>{title}</h3>
      {entries.length === 0 ? (
        <p className={styles.emptyState}>{emptyMessage}</p>
      ) : (
        <ol className={styles.leaderboardList}>
          {entries.map((entry, index) => (
            <li className={styles.leaderboardItem} key={`${title}-${entry.name}`}>
              <div className={styles.leaderboardIdentity}>
                <span className={styles.rankBadge}>{index + 1}</span>
                <span className={styles.leaderboardName}>{entry.name}</span>
              </div>
              <span className={styles.leaderboardValue}>{entry[valueKey]}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export function Leaderboard({ leaderboard, isLoading = false, errorMessage = '' }) {
  if (isLoading) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>순위</span>
            <h2 className={styles.sectionTitle}>리더보드</h2>
          </div>
        </div>
        <p className={styles.emptyState}>리더보드 불러오는 중...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>순위</span>
            <h2 className={styles.sectionTitle}>리더보드</h2>
          </div>
        </div>
        <p className={styles.emptyState}>리더보드를 불러올 수 없습니다.</p>
      </section>
    );
  }

  const normalizedLeaderboard = leaderboard && typeof leaderboard === 'object'
    ? leaderboard
    : { spreaders: [], hitters: [], sites: [] };

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>순위</span>
          <h2 className={styles.sectionTitle}>리더보드</h2>
        </div>
        <p className={styles.subtleText}>스냅샷 새로고침 사이에 로컬 델타가 살포자, 적중자, 적중 사이트를 갱신합니다.</p>
      </div>
      <div className={styles.leaderboardGrid}>
      <LeaderboardList
        emptyMessage="아직 살포 순위가 없습니다."
        entries={Array.isArray(normalizedLeaderboard.spreaders) ? normalizedLeaderboard.spreaders : []}
        title="살포 순위"
        valueKey="totalSpreads"
      />
      <LeaderboardList
        emptyMessage="아직 적중 순위가 없습니다."
        entries={Array.isArray(normalizedLeaderboard.hitters) ? normalizedLeaderboard.hitters : []}
        title="적중 순위"
        valueKey="totalHits"
      />
      <LeaderboardList
        emptyMessage="아직 사이트 순위가 없습니다."
        entries={Array.isArray(normalizedLeaderboard.sites) ? normalizedLeaderboard.sites : []}
        title="사이트 순위"
        valueKey="totalHits"
      />
      </div>
    </section>
  );
}
