// @ts-nocheck
/**
 * 렌더링 품질 프리셋 — 「돌아가는 장비」를 고를 수 있게 한다.
 *
 * 이 데모는 기본값이 후하다: MSAA 4× · 블룸 · HDR · 배율 1.0. 4090 에서는 공짜지만
 * 노트북 내장그래픽이나 원격 데스크톱(소프트웨어 래스터라이저)에서는 그 값들 때문에
 * 프레임이 한 자리로 떨어진다. 그러면 「무거운 앱」이 아니라 **고장난 앱**으로 보인다.
 *
 * 그래서 세 프리셋으로 접는다. 끄는 순서는 체감 대비 비용이 큰 것부터다 —
 * 블룸/HDR(풀스크린 패스) → MSAA(샘플 수) → 해상도 배율 → 지형 LOD.
 *
 * `requestRenderMode` 는 쓰지 않는다. 이 앱은 날씨 입자·드로우온·도보 이동처럼
 * 매 프레임 갱신되는 것이 많아, 그 모드에서는 requestRender() 를 빠뜨린 곳이
 * 그대로 「멈춘 화면」이 된다 — 성능보다 신뢰를 먼저 잃는다.
 */

const LS_KEY = 'gp_render_quality_v1';

export const QUALITY_PRESETS = [
  {
    id: 'high', name: '고품질', hint: '외장 GPU · 시연용',
    msaa: 4, fxaa: true, bloom: true, hdr: true, resolution: 1.0, terrainError: 2,
  },
  {
    id: 'balanced', name: '균형', hint: '노트북 · 내장그래픽',
    msaa: 2, fxaa: true, bloom: false, hdr: false, resolution: 1.0, terrainError: 3,
  },
  {
    id: 'low', name: '저사양', hint: '원격데스크톱 · 소프트웨어 렌더',
    msaa: 0, fxaa: false, bloom: false, hdr: false, resolution: 0.75, terrainError: 6,
  },
];

export const QUALITY_BY_ID = Object.fromEntries(QUALITY_PRESETS.map((p) => [p.id, p]));

export function savedQualityId() {
  try { return localStorage.getItem(LS_KEY) || 'high'; } catch { return 'high'; }
}

export function applyQuality(viewer, id) {
  const p = QUALITY_BY_ID[id] ?? QUALITY_BY_ID.high;
  const scene = viewer.scene;
  try {
    scene.msaaSamples = p.msaa;
    scene.postProcessStages.fxaa.enabled = p.fxaa;
    scene.postProcessStages.bloom.enabled = p.bloom;
    scene.highDynamicRange = p.hdr;
    viewer.resolutionScale = p.resolution;
    scene.globe.maximumScreenSpaceError = p.terrainError;
  } catch (error) {
    console.warn('[quality] 일부 설정을 적용하지 못했습니다', error);
  }
  try { localStorage.setItem(LS_KEY, p.id); } catch { /* noop */ }
  return p;
}

/**
 * 프레임률 계측 — 프리셋을 바꾸면 무엇이 달라지는지 숫자로 보여야 고를 수 있다.
 * postRender 마다 세고 500ms 창으로 평균한다.
 */
export function startFpsMeter(viewer, onSample) {
  let frames = 0;
  let t0 = performance.now();
  let last = 0;
  const off = viewer.scene.postRender.addEventListener(() => {
    frames += 1;
    const now = performance.now();
    if (now - t0 < 500) return;
    last = (frames * 1000) / (now - t0);
    frames = 0;
    t0 = now;
    onSample?.(last);
  });
  return { stop: off, get fps() { return last; } };
}
