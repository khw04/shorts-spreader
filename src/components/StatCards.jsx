import styles from './task4-ui.module.css';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

function formatPercentage(value) {
  return `${value}%`;
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(value);
}

function buildMetricItems(stats) {
  const totalSpreads = stats?.totalSpreads || 0;
  const totalHits = stats?.totalHits || 0;
  const activeUsers = stats?.activeUsers || 0;
  const peakActiveUsers = stats?.peakActiveUsers || 0;

  return [
    {
      label: 'Total spreads',
      value: formatNumber(totalSpreads),
      meta: 'All successful spread broadcasts seen by the runtime.',
      accent: 'hot',
      progress: Math.min(totalSpreads * 8, 100)
    },
    {
      label: 'Total hits',
      value: formatNumber(totalHits),
      meta: 'Victim confirmations landing back on the server contract.',
      accent: 'warm',
      progress: Math.min(totalHits * 12, 100)
    },
    {
      label: 'Active users',
      value: formatNumber(activeUsers),
      meta: `Peak active users ${formatNumber(peakActiveUsers)}`,
      accent: 'live',
      progress: peakActiveUsers > 0 ? Math.min((activeUsers / peakActiveUsers) * 100, 100) : 0
    },
    {
      label: 'Conversion',
      value: formatPercentage(stats?.conversionRate || 0),
      meta: 'Hit / spread ratio from the live public stats payload.',
      accent: 'cool',
      progress: Math.min(stats?.conversionRate || 0, 100)
    }
  ];
}

export function StatCards({ stats, isLoading = false, errorMessage = '' }) {
  if (isLoading) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>Snapshot</span>
            <h2 className={styles.sectionTitle}>Stat cards</h2>
          </div>
        </div>
        <p className={styles.emptyState}>Loading stats...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>Snapshot</span>
            <h2 className={styles.sectionTitle}>Stat cards</h2>
          </div>
        </div>
        <p className={styles.emptyState}>Unable to load stats.</p>
      </section>
    );
  }

  if (!stats) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>Snapshot</span>
            <h2 className={styles.sectionTitle}>Stat cards</h2>
          </div>
        </div>
        <p className={styles.emptyState}>No stats available yet.</p>
      </section>
    );
  }

  const metricItems = buildMetricItems(stats);

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Snapshot</span>
          <h2 className={styles.sectionTitle}>Stat cards</h2>
        </div>
        <p className={styles.subtleText}>Live counters settle from bootstrap first, then `stats_update` keeps them moving.</p>
      </div>
      <div className={styles.metricsGrid}>
        {metricItems.map((item) => (
          <article className={styles.metricCard} key={item.label}>
            <span className={styles.metricLabel}>{item.label}</span>
            <strong className={styles.metricValue} data-accent={item.accent}>
              {item.value}
            </strong>
            <div className={styles.meterTrack}>
              <div className={styles.meterFill} style={{ '--metric-fill': `${item.progress}%` }} />
            </div>
            <span className={styles.metricMeta}>{item.meta}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
