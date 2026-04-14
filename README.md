# shorts-spreader

여러 클라이언트에 유튜브 쇼츠를 퍼뜨리는 실험형 MVP입니다. 크롬 확장 프로그램과 Next.js 기반 실시간 대시보드를 함께 구성하는 방향으로 진행 중입니다.

## 현재 진행 상황

- Next.js 앱, 커스텀 `server.js`, WebSocket 부트스트랩이 잡혀 있습니다.
- `src/lib`에 공용 프로토콜 검증 로직과 인메모리 상태 모델이 구현되어 있습니다.
- 랜딩 페이지, 대시보드 셸, 기본 API 라우트가 추가되어 있습니다.
- MV3 확장 프로그램 스캐폴드, 패키징 스크립트, 부트스트랩 테스트 구성이 저장소에 들어와 있습니다.

## 아직 안 된 부분

- 대시보드 컴포넌트는 아직 placeholder 성격이 강하고 실시간 데이터와 연결되지 않았습니다.
- `logs`, `leaderboard` API는 아직 전체 상태 기반 응답이 아니라 부트스트랩 데이터만 반환합니다.
- 확장 프로그램의 background/content/popup 흐름은 서버 프로토콜과의 실제 연동이 더 필요합니다.
- 영속성, 운영 안정화, 악용 방지 장치, 배포 준비는 아직 구현되지 않았습니다.

## 로컬 개발

```bash
npm install
npm run dev
```

자주 쓰는 명령:

- `npm run build`
- `npm run test:unit`
- `npm run test:protocol`
- `npm run test:e2e`
- `npm run package`
