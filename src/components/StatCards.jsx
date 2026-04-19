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
      label: '총 살포 수',
      value: formatNumber(totalSpreads),
      meta: '런타임이 감지한 모든 성공적인 살포 브로드캐스트.',
      accent: 'hot',
      progress: Math.min(totalSpreads * 8, 100)
    },
    {
      label: '총 적중 수',
      value: formatNumber(totalHits),
      meta: '서버 계약으로 돌아온 피해자 확인 수.',
      accent: 'warm',
      progress: Math.min(totalHits * 12, 100)
    },
    {
      label: '활성 사용자',
      value: formatNumber(activeUsers),
      meta: `최대 동시 접속 ${formatNumber(peakActiveUsers)}`,
      accent: 'live',
      progress: peakActiveUsers > 0 ? Math.min((activeUsers / peakActiveUsers) * 100, 100) : 0
    },
    {
      label: '전환율',
      value: formatPercentage(stats?.conversionRate || 0),
      meta: '실시간 공개 통계 페이로드의 적중 / 살포 비율.',
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
            <span className={styles.eyebrow}>스냅샷</span>
            <h2 className={styles.sectionTitle}>통계 카드</h2>
          </div>
        </div>
        <p className={styles.emptyState}>통계 불러오는 중...</p>
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
        <p className={styles.emptyState}>통계를 불러올 수 없습니다.</p>
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
        <p className={styles.emptyState}>아직 통계가 없습니다.</p>
      </section>
    );
  }

  const metricItems = buildMetricItems(stats);

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>스냅샷</span>
          <h2 className={styles.sectionTitle}>통계 카드</h2>
        </div>
        <p className={styles.subtleText}>부트스트랩 후 실시간 카운터가 초기화되고, 이후 `stats_update`로 계속 갱신됩니다.</p>
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
