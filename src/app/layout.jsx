import './globals.css';

export const metadata = {
  title: '🔥 쇼츠 살포기',
  description: '크롬 확장 설치와 실시간 확산 대시보드를 위한 Shorts Spreader 작업 공간입니다.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
