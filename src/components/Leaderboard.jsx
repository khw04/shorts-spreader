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
            <span className={styles.eyebrow}>Rankings</span>
            <h2 className={styles.sectionTitle}>Leaderboard</h2>
          </div>
        </div>
        <p className={styles.emptyState}>Loading leaderboard...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>Rankings</span>
            <h2 className={styles.sectionTitle}>Leaderboard</h2>
          </div>
        </div>
        <p className={styles.emptyState}>Unable to load leaderboard.</p>
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
          <span className={styles.eyebrow}>Rankings</span>
          <h2 className={styles.sectionTitle}>Leaderboard</h2>
        </div>
        <p className={styles.subtleText}>Local deltas update spreaders, hitters, and hit sites between snapshot refreshes.</p>
      </div>
      <div className={styles.leaderboardGrid}>
      <LeaderboardList
        emptyMessage="No spread rankings yet."
        entries={Array.isArray(normalizedLeaderboard.spreaders) ? normalizedLeaderboard.spreaders : []}
        title="Top Spreaders"
        valueKey="totalSpreads"
      />
      <LeaderboardList
        emptyMessage="No hit rankings yet."
        entries={Array.isArray(normalizedLeaderboard.hitters) ? normalizedLeaderboard.hitters : []}
        title="Top Hitters"
        valueKey="totalHits"
      />
      <LeaderboardList
        emptyMessage="No site rankings yet."
        entries={Array.isArray(normalizedLeaderboard.sites) ? normalizedLeaderboard.sites : []}
        title="Top Sites"
        valueKey="totalHits"
      />
      </div>
    </section>
  );
}
