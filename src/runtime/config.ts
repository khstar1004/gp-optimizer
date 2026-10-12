/**
 * 런타임 설정 — 키는 `.env` 한 곳에만 둔다.
 *
 * server.cts 가 `.env` 를 읽어 `/config.js` 로 `globalThis.__GP_CONFIG__` 를 내려보내고
 * (index.html 이 runtime/main.ts 보다 먼저 로드), 이 모듈이 그 값을 읽는다.
 * 서버에서만 쓰는 ITS 키는 여기 오지 않는다 — `/its/` 프록시가 주입한다.
 */
type GpRuntimeConfig = {
  VWORLD_KEY?: string;
  VWORLD_DOMAIN?: string;
  MAPTILER_KEY?: string;
  ARCGIS_KEY?: string;
  /** 서버가 로컬 Ollama 에 물어 고른 모델 — 없으면 빈 문자열(미가동). */
  OLLAMA_MODEL?: string;
};

const cfg = (globalThis as typeof globalThis & { __GP_CONFIG__?: GpRuntimeConfig }).__GP_CONFIG__ ?? {};

if (!cfg.VWORLD_KEY) {
  console.warn('[config] VWORLD_API_KEY 가 비어 있습니다 — .env 를 확인하세요.');
}

export const VWORLD_KEY = cfg.VWORLD_KEY ?? '';
export const VWORLD_DOMAIN = cfg.VWORLD_DOMAIN ?? 'localhost';
export const MAPTILER_KEY = cfg.MAPTILER_KEY ?? '';
export const ARCGIS_KEY = cfg.ARCGIS_KEY ?? '';
export const OLLAMA_MODEL = cfg.OLLAMA_MODEL ?? '';

