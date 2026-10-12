// @ts-nocheck
/**
 * 렌더 루프 파수꾼 — 한 번의 렌더 예외로 지도 전체가 죽지 않게 한다.
 *
 * Cesium 의 기본 렌더 루프는 예외를 한 번 만나면 `useDefaultRenderLoop = false`
 * 로 스스로를 끄고 붉은 오류 패널만 남긴다. 되살아나는 경로가 없다. 그런데
 * 실제로 여기서 터지는 것은 대개 **우리가 얹은 포스트프로세스 단계 하나**다
 * (셰이더 컴파일 실패는 add() 시점이 아니라 첫 렌더에서 난다 — 그래서
 * 단계 생성부의 try/catch 는 이걸 절대 잡지 못한다).
 *
 * 그렇다면 답은 하나다: 죽으면 **우리가 얹은 것부터 걷어내고 다시 돌린다.**
 * 지도가 없는 화면보다 안개 없는 지도가 낫다.
 *
 * 걷어낼 후보는 `register()` 로 스스로 등록한다 — 파수꾼이 Cesium 내장 단계
 * (fxaa·bloom·ambientOcclusion)를 건드리면 그때는 진짜로 화면이 망가진다.
 */

const MAX_ATTEMPTS = 4;

export function installRenderGuard(viewer, { toast } = {}) {
  const scene = viewer.scene;
  const candidates = [];       // { label, stage, onDropped }
  let lastError = null;
  let attempts = 0;
  let stopped = false;

  scene.renderError.addEventListener((_scene, error) => { lastError = error; });

  /** 이 단계는 죽으면 걷어내도 되는 것이다 — 얹는 쪽이 직접 등록한다. */
  const register = (label, stage, onDropped) => {
    if (stage) candidates.push({ label, stage, onDropped });
  };

  const dismissErrorPanel = () => {
    for (const el of document.querySelectorAll('.cesium-widget-errorPanel')) el.remove();
  };

  const dropOne = () => {
    // 마지막에 얹은 것부터 — 방금 추가한 단계가 범인일 확률이 가장 높다.
    while (candidates.length) {
      const c = candidates.pop();
      if (!scene.postProcessStages.contains?.(c.stage) && !c.stage.isDestroyed?.()) {
        // 이미 빠진 단계는 후보에서만 지운다
      }
      try { scene.postProcessStages.remove(c.stage); } catch { /* 이미 제거됨 */ }
      try { c.onDropped?.(lastError); } catch { /* noop */ }
      return c.label;
    }
    return null;
  };

  const timer = setInterval(() => {
    if (stopped || viewer.isDestroyed?.() || viewer.useDefaultRenderLoop) return;
    if (attempts >= MAX_ATTEMPTS) {
      stopped = true;
      clearInterval(timer);
      return;
    }
    attempts++;
    const dropped = dropOne();
    dismissErrorPanel();
    viewer.useDefaultRenderLoop = true;
    const why = String(lastError?.message ?? lastError ?? '알 수 없는 렌더 오류').split('\n')[0];
    console.warn('[renderGuard] 렌더 루프 복구', { dropped, why });
    if (dropped) toast?.(`화면 효과 「${dropped}」에서 오류가 나 그 효과만 끄고 계속합니다`, 5200);
    else toast?.('렌더 오류에서 복구했습니다 — 화면이 계속 이상하면 새로고침하세요', 5200);
  }, 400);

  return {
    register,
    get lastError() { return lastError; },
    get attempts() { return attempts; },
    destroy() { stopped = true; clearInterval(timer); },
  };
}
