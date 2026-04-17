import styles from './landing.module.css';

export default function LandingPage() {
  return (
    <main className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.title}>쇼츠 살포기</h1>
        <p className={styles.subtitle}>
          YouTube Shorts를 친구들에게 실시간으로 살포하세요!
        </p>
        <p className={styles.description}>
          확장 프로그램을 설치하면, 누군가 쇼츠를 살포할 때<br />
          당신이 보고 있는 웹페이지의 이미지가 그 쇼츠로 바뀝니다.
        </p>
        <div className={styles.buttons}>
          <a href="/extension.zip" className={styles.downloadBtn}>
            다운로드 (.zip)
          </a>
          <a href="/dashboard" className={styles.dashboardBtn}>
            실시간 대시보드
          </a>
        </div>
      </section>

      <section className={styles.guide}>
        <h2 className={styles.guideTitle}>설치 방법</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>ZIP 다운로드</h3>
            <p>위 버튼을 눌러 ZIP 파일을 다운로드하고 압축을 해제하세요.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>개발자 모드 ON</h3>
            <p>
              Chrome에서 <code>chrome://extensions</code> 접속 후<br />
              우측 상단 <strong>개발자 모드</strong>를 켜세요.
            </p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>확장 프로그램 로드</h3>
            <p>
              <strong>압축해제된 확장 프로그램을 로드합니다</strong> 클릭 후<br />
              압축 해제한 폴더를 선택하세요.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.howto}>
        <h2 className={styles.guideTitle}>사용법</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepEmoji}>🔥</div>
            <h3>살포하기</h3>
            <p>YouTube Shorts 페이지에서 &quot;살포하기&quot; 버튼을 누르세요.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepEmoji}>💥</div>
            <h3>피격당하기</h3>
            <p>다른 사람이 살포하면 당신의 웹페이지 이미지가 쇼츠로 바뀝니다!</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepEmoji}>📊</div>
            <h3>전적 확인</h3>
            <p>대시보드에서 실시간 살포/피격 현황을 확인하세요.</p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Made with 🔥 for Hackathon</p>
      </footer>
    </main>
  );
}
