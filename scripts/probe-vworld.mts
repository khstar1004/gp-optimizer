/**
 * VWorld 데이터 API 레이어 커버리지 탐색 — GP 지역에서 실제로 자료가 있는 레이어를 찾는다.
 *
 *   tsx scripts/probe-vworld.mts [bbox]
 *
 * VWorld 는 짧은 간격의 연속 호출에 INCORRECT_KEY 로 응답한다(키 오류 아님, 호출 제한).
 * 그래서 요청 사이에 간격을 두고, 실패는 재시도한다.
 */
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean)
    .map((l) => l.split('=')).map(([k, ...v]) => [k.trim(), v.join('=').trim()]),
);
const KEY = env.VWORLD_API_KEY;
const DOMAIN = env.VWORLD_DOMAIN || 'localhost';
const BBOX = process.argv[2] || '128.06,38.27,128.19,38.39';

// 후보 레이어 — GP(산악·접경) 상황에 의미 있는 것 위주
const CANDIDATES = [
  ['LT_C_WKMSTRM', '하천망'],
  ['LT_C_WKMBBSN', '대권역'],
  ['LT_L_MOCTLINK', '도로구간(교통DB)'],
  ['LT_L_N3A0020000', '도로중심선(수치지형도)'],
  ['LT_C_UO301', '용도지역'],
  ['LT_C_UP401', '급경사지 재해예방'],
  ['LT_C_FSDIFRSTS', '산림입지도'],
  ['LT_C_ASITSOILDRA', '토양 배수등급'],
  ['LT_C_ASITSOILDEP', '토양 유효토심'],
  ['LT_C_ASITSSOILSLOPE', '토양 경사'],
  ['LT_C_LHBLPN', '토지피복(대분류)'],
  ['LT_C_TDWAREA', '토지이용현황'],
  ['LT_C_ADSIDO_INFO', '시도 경계'],
  ['LT_C_ADSIGG_INFO', '시군구 경계'],
  ['LT_C_ADEMD_INFO', '읍면동 경계'],
  ['LT_C_SPBD', '건물'],
  ['LT_C_UQ111', '국토계획 용도지역'],
  ['LT_L_STEELWAY', '철도중심선'],
  ['LT_C_DAMDAN', '댐'],
  ['LT_C_WGISNRPCT', '자연공원'],
  ['LT_C_FRSTCLIMATE', '산림기후'],
  ['LT_C_UD801', '개발제한구역'],
];

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function probe(dataId: string, attempt = 1) {
  const url = new URL('https://api.vworld.kr/req/data');
  url.search = new URLSearchParams({
    service: 'data', version: '2.0', request: 'GetFeature', format: 'json',
    size: '3', page: '1', geometry: 'true', attribute: 'true', crs: 'EPSG:4326',
    data: dataId, geomFilter: `BOX(${BBOX})`, key: KEY, domain: DOMAIN,
  }).toString();
  const res = await fetch(url, { headers: { Referer: `http://${DOMAIN}/` } });
  const json = await res.json().catch(() => null);
  const r = json?.response;
  const code = r?.error?.code;
  // 호출 제한은 키 오류로 위장해서 온다 — 간격을 늘려 재시도
  if (code === 'INCORRECT_KEY' && attempt <= 3) {
    await sleep(1500 * attempt);
    return probe(dataId, attempt + 1);
  }
  const total = Number(r?.record?.total ?? 0);
  const feature = r?.result?.featureCollection?.features?.[0];
  return {
    dataId,
    status: r?.status ?? 'FAIL',
    code: code ?? '',
    total,
    geomType: feature?.geometry?.type ?? null,
    attrs: feature ? Object.keys(feature.properties ?? {}).slice(0, 8) : [],
  };
}

console.log(`BBOX(${BBOX}) · key ${KEY.slice(0, 8)}…\n`);
const hits = [];
for (const [dataId, label] of CANDIDATES) {
  const r = await probe(dataId);
  const mark = r.total > 0 ? '●' : r.status === 'OK' || r.code === 'NOT_FOUND' ? '·' : '✕';
  console.log(`${mark} ${label.padEnd(18)} ${dataId.padEnd(20)} ${String(r.total).padStart(6)}건  ${r.geomType ?? ''} ${r.code}`);
  if (r.total > 0) hits.push({ ...r, label });
  await sleep(900);
}

console.log(`\n자료 있는 레이어 ${hits.length}개:`);
hits.forEach((h) => console.log(`  ${h.label} (${h.dataId}) ${h.total}건 · ${h.geomType} · 속성 ${h.attrs.join(',')}`));
