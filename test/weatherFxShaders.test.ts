/**
 * 셰이더 uniform 정합 시험.
 *
 * GLSL 은 여기서 컴파일할 수 없다. 하지만 이 코드가 조용히 망가지는 가장 흔한
 * 방식은 문법 오류가 아니라 **이름 어긋남**이다 — 셰이더는 `uResidual` 을 선언했는데
 * JS 가 `uResidualBeta` 에 대입하면, Cesium 은 아무 말 없이 기본값으로 렌더한다.
 * 안개가 안 걷히는 화면만 남고 콘솔은 조용하다.
 *
 * 그래서 원본 텍스트를 읽어 선언과 대입을 양방향으로 맞춰 본다. 컴파일 대신이
 * 아니라, 컴파일이 잡아주지 않는 것을 잡는 것이다.
 *
 * (2026-09-07) `PRECIP_FS`/`gp_precip` 는 더 이상 존재하지 않는다 — 강수는
 * 화면 위 포스트프로세스 대신 `PrecipField`(BillboardCollection 기반 실제 3D
 * 알갱이)로 바뀌었다(weatherFx.ts 상단 주석 참고). 지금 실제로 존재하는 화면
 * 포스트프로세스 셰이더는 `FOG_FS`·`LENS_FS`·`FLASH_FS`·`GODRAY_FS` 넷이라
 * 이 시험도 그 넷을 검사한다.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync(new URL('../src/runtime/weatherFx.ts', import.meta.url), 'utf8');

/** Cesium 이 PostProcessStage 에 알아서 넣어주는 것 — 우리가 대입하지 않는다. */
const PROVIDED = new Set(['colorTexture', 'depthTexture']);

/** 셰이더 상수명 → 그 셰이더를 쓰는 인스턴스 필드명. */
const STAGE_VAR: Record<string, string> = {
  gp_fog_depth: 'fogStage',
  gp_lens_droplets: 'lensStage',
  gp_lightning_flash: 'flashStage',
  gp_godrays: 'godrayStage',
};

function shaderBlock(name: string) {
  const match = SOURCE.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`));
  assert.ok(match, `${name} 셰이더 원본을 찾지 못했다`);
  return match[1];
}

function declaredUniforms(glsl: string) {
  return new Set(
    [...glsl.matchAll(/^\s*uniform\s+\w+\s+(\w+)\s*;/gm)].map((m) => m[1]),
  );
}

/**
 * `uniforms: { ... }` 초기값과, 이 스테이지에 대한 모든 대입(`this.<stage>.uniforms.X =`
 * 직접 대입, 또는 `const u = this.<stage>.uniforms` 별칭을 통한 `u.X =`)을 모은다.
 *
 * 대입은 파일 어디서 일어나든 잡는다 — 예를 들어 `lensStage` 의 `uTime` 은 스테이지를
 * 만드는 메서드가 아니라 생성자의 `preRender` 펌프에서 대입되는데(코드 순서상 스테이지
 * 생성 지점보다 *앞*에 온다), 위치 기반 범위로 자르면 이런 대입을 놓친다.
 */
function assignedUniforms(stageName: string) {
  const stageVar = STAGE_VAR[stageName];
  assert.ok(stageVar, `${stageName} 에 대응하는 필드명을 모른다`);

  const start = SOURCE.indexOf(`name: '${stageName}'`);
  assert.ok(start > 0, `${stageName} 단계 생성 지점을 찾지 못했다`);
  const initial = SOURCE.slice(start).match(/uniforms:\s*\{([\s\S]*?)\}\s*,/);
  assert.ok(initial, `${stageName} 초기 uniforms 블록을 찾지 못했다`);
  const names = new Set([...initial[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]));

  for (const m of SOURCE.matchAll(new RegExp(`\\bthis\\.${stageVar}\\.uniforms\\.(\\w+)\\s*=`, 'g'))) {
    names.add(m[1]);
  }
  const alias = SOURCE.match(new RegExp(`const\\s+(\\w+)\\s*=\\s*this\\.${stageVar}\\.uniforms\\s*;`));
  if (alias) {
    for (const m of SOURCE.matchAll(new RegExp(`\\b${alias[1]}\\.(\\w+)\\s*=`, 'g'))) {
      names.add(m[1]);
    }
  }
  return names;
}

const SHADER_STAGES = [
  ['FOG_FS', 'gp_fog_depth'],
  ['LENS_FS', 'gp_lens_droplets'],
  ['FLASH_FS', 'gp_lightning_flash'],
  ['GODRAY_FS', 'gp_godrays'],
] as const;

for (const [shader, stage] of SHADER_STAGES) {
  test(`${stage}: 선언한 uniform 을 빠짐없이 대입한다`, () => {
    const declared = declaredUniforms(shaderBlock(shader));
    assert.ok(declared.size > 1, `${shader} 에서 uniform 을 못 찾았다`);
    const assigned = assignedUniforms(stage);
    for (const name of declared) {
      if (PROVIDED.has(name)) continue;
      assert.ok(assigned.has(name), `${shader} 가 ${name} 을 선언했는데 아무도 대입하지 않는다`);
    }
  });

  test(`${stage}: 선언되지 않은 uniform 에 대입하지 않는다`, () => {
    const declared = declaredUniforms(shaderBlock(shader));
    for (const name of assignedUniforms(stage)) {
      assert.ok(declared.has(name), `${name} 에 대입하는데 ${shader} 에는 그런 uniform 이 없다`);
    }
  });
}

test('FOG_FS 는 깊이를 읽는다 — 그것이 이 고도화의 핵심이다', () => {
  // LENS_FS·FLASH_FS 는 의도적으로 깊이를 읽지 않는다 — 카메라 유리에 맺힌
  // 물방울이나 번개 섬광은 장면 깊이와 무관한 순수 화면공간 효과다. 깊이를
  // 요구하는 건 「고도별로 층을 이루는 안개」뿐이다.
  const glsl = shaderBlock('FOG_FS');
  assert.match(glsl, /czm_readDepth\(depthTexture, v_textureCoordinates\)/,
    'FOG_FS 가 깊이를 읽지 않으면 예전과 같은 화면 위 무늬로 돌아간다');
  assert.match(glsl, /czm_windowToEyeCoordinates/, 'FOG_FS 가 거리를 복원하지 않는다');
  // 하늘(depth 1.0)을 지형과 같이 취급하면 하늘 전체가 안개색으로 덮인다.
  assert.match(glsl, /depth >= 1\.0 - 0\.000001|depth < 1\.0 - 0\.000001/,
    'FOG_FS 가 하늘 분기를 두지 않았다');
});

test('중괄호가 맞는다 — 붙여쓴 GLSL 에서 가장 흔한 사고', () => {
  for (const [shader] of SHADER_STAGES) {
    const glsl = shaderBlock(shader);
    for (const [open, close] of [['{', '}'], ['(', ')']]) {
      const opened = (glsl.match(new RegExp(`\\${open}`, 'g')) ?? []).length;
      const closed = (glsl.match(new RegExp(`\\${close}`, 'g')) ?? []).length;
      assert.equal(opened, closed, `${shader}: ${open}${close} 짝이 안 맞는다`);
    }
    // 템플릿 리터럴 안에 ${} 가 있으면 JS 가 먼저 먹어버려 셰이더가 깨진다.
    assert.ok(!glsl.includes('${'), `${shader} 안에 템플릿 보간이 섞였다`);
  }
});

/**
 * GLSL 판(version) 시험 — 이 시험이 없어서 지도 전체가 한 번 죽었다.
 *
 * Cesium 1.119 는 WebGL2 컨텍스트에 `#version 300 es` 를 붙인 뒤 우리 소스를
 * 그대로 이어 붙인다. 거기에 `varying` 이 있으면 「예약어」 오류로 컴파일이
 * 실패하고, 그 실패는 `postProcessStages.add()` 가 아니라 **첫 렌더**에서 난다.
 * 그래서 단계 생성부의 try/catch 로는 절대 잡히지 않고, Cesium 기본 렌더 루프가
 * 스스로를 끄면서 3D 화면 전체가 정지한다 — 안개만 사라지는 게 아니다.
 *
 * 옛 문법은 눈으로는 멀쩡해 보이고 단위시험도 통과하므로, 텍스트로 막는다.
 */
const LEGACY_GLSL: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bvarying\b/, 'varying → in (GLSL ES 3.00 에서 varying 은 예약어다)'],
  [/\battribute\b/, 'attribute → in'],
  [/\btexture2D\s*\(/, 'texture2D() → texture()'],
  [/\btextureCube\s*\(/, 'textureCube() → texture()'],
  [/\bgl_FragColor\b/, 'gl_FragColor → out_FragColor (Cesium 이 out 선언을 넣어 준다)'],
  [/\bgl_FragData\b/, 'gl_FragData → out_FragData_N'],
];

for (const [shader] of SHADER_STAGES) {
  test(`${shader}: GLSL ES 3.00 문법만 쓴다 — 옛 문법 하나면 렌더 루프가 멈춘다`, () => {
    const glsl = shaderBlock(shader);
    for (const [pattern, fix] of LEGACY_GLSL) {
      assert.ok(!pattern.test(glsl), `${shader} 에 옛 GLSL 문법이 남아 있다 — ${fix}`);
    }
    assert.match(glsl, /^\s*in\s+vec2\s+v_textureCoordinates\s*;/m,
      `${shader} 는 v_textureCoordinates 를 in 으로 받아야 한다`);
    assert.match(glsl, /\bout_FragColor\s*=/,
      `${shader} 가 출력에 아무것도 쓰지 않는다`);
  });
}
