import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = 'http://localhost:8917';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    host: 'localhost',
    port: 5173,
    watch: {
      // data/tile-cache 는 타일 캐시 파일이 39만+ 개라 기본 chokidar 전체
      // 스캔이 여기서 몇 분씩 멈춘다(dev 서버가 무응답으로 보이는 원인이었음).
      // 이 폴더들은 소스가 아니라 런타임 산출물이므로 감시할 필요가 없다.
      ignored: ['**/data/**', '**/artifacts/**'],
    },
    proxy: {
      '/api': backend,
      '/config.js': backend,
      '/its': backend,
      '/vworld': backend,
      '/xdworld': backend,
      '/ollama': backend,
      '/arcgis-img': backend,
      '/maptiler-terrain': backend,
      '/arcgis-elevation': backend,
      // js/vendor/ 안의 .ts·.bundle.js 는 프로젝트 안 파일이라 Vite가 직접 서빙·변환해야
      // 한다(여기 전체를 백엔드로 넘기면 서버가 .ts를 몰라 application/octet-stream으로
      // 내려보내고, 브라우저 모듈 로더가 MIME 체크에서 막혀 부팅 자체가 실패한다).
      // 3d-bundles만 프로젝트 밖(VISTA_BUNDLES_DIR)이라 백엔드 프록시가 실제로 필요하다.
      '/js/vendor/3d-bundles': backend,
      '/assets': backend,
      '/data': backend,
      '/vendor': backend,
    },
  },
});
