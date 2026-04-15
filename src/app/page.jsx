import Link from 'next/link';
import styles from '../components/task4-ui.module.css';

const INSTALL_STEPS = [
  {
    title: 'extension.zip 다운로드',
    copy: '운영 중인 번들을 바로 받을 수 있게 `/extension.zip`을 첫 번째 CTA로 노출합니다.'
  },
  {
    title: '크롬 확장 관리 페이지에서 로드',
    copy: '압축을 해제한 뒤 개발자 모드에서 로드해 여러 클라이언트에 쇼츠 살포 흐름을 붙입니다.'
  },
  {
    title: '대시보드로 연결 상태 확인',
    copy: '실시간 통계, 히트 피드, 네트워크 셸은 `/dashboard`에서 같은 서버 포트 기준으로 즉시 확인합니다.'
  }
];

export default function HomePage() {
  return (
    <main className={styles.surface}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroPanel}>
            <span className={styles.eyebrow}>Task 4 / launch surface</span>
            <h1 className={styles.heroTitle}>🔥 쇼츠 살포기</h1>
            <p className={styles.heroLead}>
              크롬 확장을 내려받고, 세 단계로 설치하고, 실시간 대시보드에서 spreads / hits / 활성 사용자 흐름을 한눈에 확인하는
              작업용 랜딩 셸입니다.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.buttonPrimary} download href="/extension.zip">
                /extension.zip 다운로드
              </a>
              <Link className={styles.buttonGhost} href="/dashboard">
                대시보드 열기
              </Link>
            </div>
          </div>

          <aside className={styles.previewCard}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeading}>
                <span className={styles.eyebrow}>Realtime shell</span>
                <h2 className={styles.sectionTitle}>설치 직후 확인할 핵심 화면</h2>
              </div>
            </div>
            <div className={styles.previewGrid}>
              <div>
                <div className={styles.previewLabel}>Download</div>
                <div className={styles.previewValue} data-accent="hot">
                  ZIP
                </div>
                <p className={styles.subtleText}>즉시 배포 가능한 압축 패키지</p>
              </div>
              <div>
                <div className={styles.previewLabel}>Install</div>
                <div className={styles.previewValue} data-accent="warm">
                  3 STEP
                </div>
                <p className={styles.subtleText}>복잡한 설정 없이 바로 로드</p>
              </div>
              <div>
                <div className={styles.previewLabel}>Feed</div>
                <div className={styles.previewValue} data-accent="live">
                  LIVE
                </div>
                <p className={styles.subtleText}>spread / hit 이벤트 실시간 반영</p>
              </div>
              <div>
                <div className={styles.previewLabel}>Tone</div>
                <div className={styles.previewValue} data-accent="cool">
                  MONO
                </div>
                <p className={styles.subtleText}>어두운 유리 패널 + 콘솔성 디스플레이 감도</p>
              </div>
            </div>
          </aside>
        </section>

        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeading}>
              <span className={styles.eyebrow}>Install guide</span>
              <h2 className={styles.sectionTitle}>3단계 설치 가이드</h2>
            </div>
            <Link className={styles.buttonGhost} href="/dashboard">
              라이브 셸 미리 보기
            </Link>
          </div>
          <div className={styles.installGrid}>
            {INSTALL_STEPS.map((step, index) => (
              <article className={styles.installCard} key={step.title}>
                <span className={styles.installIndex}>0{index + 1}</span>
                <h3 className={styles.installTitle}>{step.title}</h3>
                <p className={styles.installCopy}>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
