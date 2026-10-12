// @ts-nocheck
import { svgIcon } from './icons';
/**
 * 참여형 사용설명서 v2 — 인터랙티브 튜토리얼 엔진 + 코스 + 컨텍스트 도움말
 *
 * v2 업그레이드:
 *  · 스포트라이트: 타깃 주변만 밝히는 딤 오버레이 (클릭 방해 없음, 매 폴마다 추적)
 *  · 퀴즈 체크포인트: 코스 말미 1문항 — 오답이면 해설, 정답이면 진행
 *  · 이어하기: 코스/스텝 위치 자동 저장 → 설명서 탭 「이어서 하기」
 *  · 코스 체이닝: 완료 카드에서 다음 미완료 코스 바로 시작
 *  · 진행 바 + 이전 단계 + 코치 접기(—)
 *  · 컨텍스트 도움말: 각 섹션 제목 옆 ? 뱃지 → 설명 팝오버 + 관련 코스 실행
 *
 * step 스키마: { say, tab?, target?, hint?, until(state,mem)?|click?, onEnter?(state,mem),
 *               optional?, quiz?: {options:[..], answer:idx, explain} }
 *
 * ★ 유지보수 규약: 새 기능을 추가하면 반드시
 *    ① NEW_FEATURES 맨 앞에 항목 추가(area 태그 포함)  ② 해당 코스 step 갱신  ③ 필요 시 HELP_TOPICS 갱신
 */

const LS_DONE = 'gp_tut_done_v1';
const LS_POS = 'gp_tut_pos_v1';

// ═══════════ 신기능 로그 (최신순) — area 는 설명서 탭 필터 칩 라벨 ═══════════
export const NEW_FEATURES = [
  { date: '2026-09-07', title: '정밀타격 — 폭발음 · 데미지 넘버 · 전투 로그 · 결과 화면', course: null, desc: '게임처럼 다듬었습니다. ①<b>절차적 폭발음</b>: 파일 없이 WebAudio 로 합성합니다(저역 럼블+서브 붐+크랙). <b>소리는 빛보다 늦게 옵니다</b> — 카메라에서 폭심까지 거리÷343m/s. 카메라를 멀리 빼면 늦게, 먹먹하게 들립니다. ②<b>데미지 넘버</b>: 맞은 구조물 위로 −41% 가 튀어오릅니다. ③<b>전투 로그</b>: 탄착·등급 변화·유폭이 오른쪽에 쌓입니다. ④<b>탄착 슬로모</b>: 탄착 전후 1.5초가 0.25배로 늘어납니다(판정·물리는 그대로). ⑤<b>전투 결과 화면</b>: 재생이 끝나면 S~D 등급이 뜹니다 — 많이 부순 쪽이 아니라 <b>적은 발수로 필요한 것만</b> 부순 쪽이 이깁니다. HUD 의 ♪·◐ 로 소리와 슬로모를 끕니다.' },
  { date: '2026-09-07', title: '정밀타격 — 지형 차폐 · 탄약고 유폭 · 취약 조준점 분석', course: null, desc: '①<b>지형 차폐</b>: 폭심과 표적 사이에 능선이 있으면 Maekawa 회절식으로 최대 24dB(압력 1/16)까지 감쇠시킵니다 — 반사면에 둔 시설이 정면에 둔 시설보다 덜 맞습니다. 폭약량이 클수록 펄스가 길어 능선이 덜 막아 줍니다. ②<b>탄약고 유폭</b>: 탄약고가 완파되면 저장 탄약이 함께 터집니다(50t → TNT 환산 7,500kg · 완파 71m · 유리 477m). 탄약고 이격이 왜 가장 값싼 보완인지 화면이 보여 줍니다. ③<b>취약 조준점 분석</b>: 후보 격자 21×21 을 훑어 「적이 노릴 자리」를 히트맵으로 깔고 그 점으로 조준점을 옮깁니다. 구조물 머리 위 HP 막대에 차폐·형상 단계·완파 필요발수가 함께 뜹니다.' },
  { date: '2026-09-07', title: '설명서 탭 고도화 — 화력 코스 신설 · 신기능 영역 필터', course: 'fires', area: 'UX', desc: '그동안 코스가 없던 <b>화력 탭</b>에 탄착점 지정부터 연속사격까지 직접 해보는 코스를 추가했습니다. 이 「새로 추가된 기능」 목록도 위 칩으로 영역별로 걸러보고, 기본은 최신 8개만 보이며 「더 보기」로 전체를 펼칩니다. 화력 탭 위협권·타격자산·보고서 섹션에도 <b>?</b> 컨텍스트 도움말을 달았습니다.' },
  { date: '2026-09-06', title: '정밀타격 — 몇 발까지 버티는가 (누적 손상) + VISTA 폭발 효과', course: 'fires', area: '화력', desc: '화력 탭에서 <b>1~12발 연속사격</b>을 걸 수 있습니다. 발마다 CEP 만큼 흩어진 자리에 재장전 간격을 두고 떨어지고, 한 발의 손상 D=(과압/완파문턱)^1.4 를 더해 ΣD≥1 이면 완파로 봅니다(Palmgren–Miner 선형 누적손상). 「이 시설은 몇 발까지 버티는가」는 CEP 산포를 넣은 500회 몬테카를로의 중앙값과 90% 값으로 나옵니다. 건물은 누적 손상만큼 실제로 주저앉아, 한 발 맞고 버틴 동이 반쯤 기운 채 서 있다가 다음 발에 마저 무너집니다. 폭발 표현은 VISTA 배치 런타임의 스프라이트 시트(explosion/flash 9프레임 · impact_smoke/dust)를 그대로 이식했고, 섬광·화구 2겹·충격파 고리·연기 기둥·잔류 화재를 층으로 쌓았습니다. HUD 「효과」에서 연출 크기를 조절합니다 — 피해 반경과 등급 판정에는 관여하지 않습니다.' },
  { date: '2026-09-06', title: '화력 탭 — 정밀타격 효과 시뮬레이션 (실지도)', course: 'fires', area: '화력', desc: '별도의 「피해 시각화」 탭을 없애고 화력 탭 맨 위로 합쳤습니다. 이제 타격은 가상 세트가 아니라 **VWorld 위성영상 + 실지형 위**에서 일어납니다 — 지도를 클릭해 탄착점을 찍고 탄종(대전차유도탄 3kg ~ 전술지대지유도탄 200kg 8종)과 신관(순발/지연/공중폭발)을 고르면, 탄두 순폭약량 하나에서 계산한 피해 반경(완파·중파·경파·유리·파편)이 지형에 그려지고 그 안에 실제로 들어 있는 배치 시설·감시자산·감시탑이 등급을 받아 화면에서 무너집니다. 입방근 법칙 + Brode 과압식 기반이며, 부수피해 안전거리는 아래 KAIROS CDE 원표로 검증합니다. 배치를 고치면 판정이 따라 바뀝니다.' },
  { date: '2026-09-04', title: '감시 탭 — 자산 직접 배치 · 날씨별 가시성', course: 'assets', area: '감시', desc: '감시자산을 팔레트에서 지도로 끌어다 원하는 자리에 직접 세우고(마스트고·지향·시야 조절, 지도에서 끌어 이동), 지형 가시선 × 실효 유효거리로 합동 탐지확률 커버리지를 굽습니다. 부채꼴은 지금 이 날씨에서 실제로 보는 범위이고 뒤의 점선이 맑았으면 봤을 범위 — 눈이 오면 앞의 것이 줄어드는 게 눈으로 보입니다. 6종 날씨 × 강도 3단 스윕 표로 「눈이 오면 얼마나 안 보이나」를 한 장에서 비교(레이더 > 열상 > 가시 순으로 버팁니다).' },
  { date: '2026-09-04', title: '센서 피드 다중 창 · 날씨 반영 · 표적 자동판정', course: 'assets', area: '감시', desc: '피드 창을 최대 4개까지 띄워 2×2로 정렬 — 같은 표적이 EO에서 지워지고 IR에서는 남고 레이더 PPI에는 그대로 찍히는 것을 나란히 봅니다. 창마다 안개·조도·강수가 본 화면과 동일하게 적용되고 파장대별 감쇠 베일·강수 입자·저조도 그레인이 얹힙니다. 시야각·유효거리·지형 LOS를 모두 통과한 표적에는 브래킷과 D/R/I 등급·탐지확률이 붙고, 지향 자동 주사(스캔) 모드도 있습니다.' },
  { date: '2026-09-04', title: '위협 축선 작도', course: 'infil', area: '침투', desc: '침투 탭 「새 침투 축선 작도」— 계획관이 판단한 위협 축선을 지도에 직접 클릭으로 그리면 지형 클램프·경사 분석을 거쳐 고정 축선과 동일하게 리허설·작전분석·워게임 판정·보고서에 반영됩니다. 자동저장·삭제 지원.' },
  { date: '2026-09-04', title: '센서 피드 PIP — 자산의 눈', course: 'assets', area: '감시', desc: `자산 거치를 클릭해 「${svgIcon('video')} 뷰」— EO/IR(화이트핫 열상)/K6 조준경은 실지형 시점 팝업(드래그 슬루·휠 배율·더블클릭 초기화), 레이더는 스윕 도는 PPI 스코프, 드론은 궤도 짐벌. 침투 리허설을 재생하면 피드에 표적이 실시간으로 지나갑니다.` },
  { date: '2026-09-03', title: '탐지·교전 판정 (워게임 AAR)', course: 'infil', area: '침투', desc: '침투 탭 — 자산·환경(조도/가시거리/바람) 기반 글림프스 누적 탐지확률로 전 축선 판정: 탐지 50%/90% 시각, 판정 공백, 타격 결심 여유, 축선 판정색 채색, AAR 곡선 카드와 보강 권고.' },
  { date: '2026-09-03', title: '지도 우클릭 메뉴 + 정밀 니지', course: 'field', area: '지도·카메라', desc: '지도 아무 곳이나 우클릭 → 「여기서 1인칭 보기」(임시 마스트 2~25m로 부감시소 후보 검토)·GP 제원/MGRS 복사·시설 즉석 배치·카메라 이동. 선택한 시설은 화살표 키 2m(Shift 8m) 정밀 이동, R 회전.' },
  { date: '2026-09-03', title: '작전계획 종합 보고서', course: 'build', area: '배치', desc: '배치 탭 「작전계획 종합 보고서」— 사업개요·배치계획도·시설일람·축선 평가표·결심 타임라인(NAI/DP/TAI 도달 시각과 타격 결심 여유)·도식·자산을 인쇄용 A4 문서로 묶어 인쇄/HTML 저장.' },
  { date: '2026-09-03', title: '맵 다이렉트 인스펙터', course: 'tower', area: '배치', desc: '3D 지도에서 감시탑·시설·자산 거치를 직접 클릭 → 그 자리에 설정 팝업(타워 높이 슬라이더, 시설 인원/층/회전/철거, 거치 정보/끄기). 오브젝트에 마우스를 올리면 이름 칩이 뜹니다.' },
  { date: '2026-09-03', title: '작전 브리핑 모드', course: 'basics', area: '지도·카메라', desc: '트윈 탭 「작전 브리핑」— 현 계획 데이터(시설·사업비·축선 점수·도식·자산)로 상황→지형→위협→방책 순 카메라 브리핑을 자동 구성. Space/화살표 이동, 자동 재생 지원.' },
  { date: '2026-09-03', title: 'COA 전술 스케치', course: null, area: '작전분석', desc: '작전분석 탭 하단 — 적/아군 공격축 화살표·방어선(전방 틱)·통제선 PL·장애물지대 지그재그·목표 OBJ를 지도에 직접 작도. 자동저장.' },
  { date: '2026-09-03', title: '커맨드 브리지 셸 (UX 개편)', course: 'basics', area: 'UX', desc: '탭 아이콘 레일 · 섹션 접기/펴기(더블클릭=이 섹션만 솔로) · 지도 하단 퀵 액션 독(단축키 1~6, 활성 모드는 하이라이트되며 다시 누르면 종료 ✕) · 패널 폭 드래그 조절.' },
  { date: '2026-09-03', title: '실무 GIS 콘솔 크롬', course: 'basics', area: 'UX', desc: '좌상단 도구 툴바(홈·탑다운·북정렬·격자·미니맵·캡처·전체화면)·나침반·동적 축척바·MGRS 군사격자·상황도 미니맵·DTG 군사일시각.' },
  { date: '2026-09-03', title: '명령 팔레트 Ctrl+K', course: 'basics', area: 'UX', desc: '모든 기능을 검색해 바로 실행 — 탭 이동·시점·측정·지도·계획 30여 명령. 상단바 ⌘K 버튼으로도 열립니다.' },
  { date: '2026-09-03', title: 'MIL-STD 군대부호', course: null, area: '작전분석', desc: '작전분석 NAI/TAI 구역박스·DP 마름모·적성 부대 마름모(병과·제대) — 군사 표준 도식으로 교체.' },
  { date: '2026-09-03', title: '면적 측정 · 계획안 슬롯', course: 'build', area: '배치', desc: '지도 탭 면적 측정(㎡/평/둘레), 배치 탭 계획안 다중 저장으로 안(案)별 동수·사업비 비교.' },
  { date: '2026-09-03', title: '참여형 설명서 v2', course: 'basics', area: 'UX', desc: '스포트라이트 가이드·퀴즈 체크포인트·이어하기·섹션별 ? 도움말. 이 설명서 자체가 업그레이드됐습니다.' },
  { date: '2026-09-03', title: '참모 결심 판단 (결심 탭)', course: 'decision', area: '결심', desc: '상황 시나리오를 고르면 KAIROS 결심엔진이 현 배치·가시영역·축선 데이터로 참모 판단을 산출합니다.' },
  { date: '2026-09-03', title: 'GP 실사 3D (지도 탭)', course: null, area: '지도·카메라', desc: 'GP 주변 1km를 실물 나무 2.4만 그루로 재현 — 지도 탭 「GP 실사 3D」 버튼.' },
  { date: '2026-09-03', title: '합동 배치 최적화 v2', course: 'assets', area: '감시', desc: '자산 위치×지향각 동시 탐색, 탐지확률 가중 합동 커버리지(37→45%), 조기경보선 사각 분석, 커버리지 드레이프.' },
  { date: '2026-09-03', title: '시설 자동배치 10종 + 동선망', course: 'build', area: '배치', desc: '역할 기반(전방 초소·게이트 위병소·인접성·탄약 안전이격) 전 시설 자동배치와 도로망.' },
  { date: '2026-09-03', title: '자산 거치 실물 3D 6종', course: 'assets', area: '감시', desc: '카메라 마스트·레이더 트레일러·음향 어레이·재머·중화기 진지·조명탄 발사대 — 토글 연동 배치.' },
  { date: '2026-09-02', title: '배치 시설 실물 3D 20모듈', course: 'build', area: '배치', desc: '10종 시설 전부 실물 모델 — 층수 스택·인원 스케일·내부 진입 시 벽체 숨김.' },
  { date: '2026-09-02', title: '감시탑 실물 3D', course: 'tower', area: '배치', desc: '격자 트러스 모듈 스택 — 높이 슬라이더 실시간 증고, 태극기·레이돔·서치라이트.' },
  { date: '2026-09-02', title: 'AI 배치', course: 'build', area: '배치', desc: '배치 탭 하단 자연어 입력 → 소요 판단 → 배치 프로그램 자동 생성.' },
];

// ═══════════ 컨텍스트 도움말 (sec-title 텍스트 → 설명) ═══════════
export const HELP_TOPICS = {
  '지금 대기 상태': { desc: '카탈로그 사거리는 맑은 날 기준(청천 제원)입니다. 여기 숫자는 지금 시각·계절·날씨를 넣어 실제로 통과시킨 값입니다 — 가시광은 Koschmieder 대비감쇠, 열상(LWIR)은 대기 소광비, 레이더는 ITU-R P.838 강수감쇠를 각각 적용합니다. 안개·눈이 오면 이 값이 줄고, 아래 배치 목록의 「실효」거리도 함께 줄어듭니다.', course: null },
  '1인칭 관측': { desc: '1인칭은 관측점을 하나 고르는 일입니다 — 감시탑만의 것이 아닙니다. 감시탑·부감시소·배치한 초소의 층·자산 거치대, 지도에서 찍은 임의의 능선 한 점까지 전부 같은 화면으로 들어갑니다. 승탑 중에도 아래 칩으로 관측점을 갈아타고, 높이 슬라이더로 증고/감고하며 시야·비용 변화를 확인할 수 있습니다.', course: 'field' },
  '가시영역': { desc: '현재 타워 높이에서 지형 광선추적으로 관측 가능(초록)/사각(빨강)을 계산합니다. 침투 관측 판정과 작전분석의 근거 데이터입니다.', course: 'tower' },
  '카메라': { desc: '시네마틱 투어와 주요 시점 바로가기. 길을 잃으면 「GP 상공」으로 복귀하세요.', course: 'basics' },
  '감시·화기 자산 가시거리': { desc: '자산을 켜면 사거리·DRI 링과 실물 거치 3D가 함께 표시됩니다. 「자산 배치 최적화」는 위치와 지향각을 팀으로 최적화해 사각을 메웁니다.', course: 'assets' },
  '환경': { desc: '시각·계절·날씨를 넣으면 태양 위치(NOAA)·하늘·조도·안개(Koschmieder)·적설이 계산되어 나오고, 그 상태가 영상감시·지상기동·통신·무인기 운용의 가능/제한/불가를 함께 판정합니다. 표면에 박아 둔 값이 아니라 모델이라서, 계절 슬라이더를 밀면 일출·일몰도 같이 움직입니다.', course: null },
  '자동 배치': { desc: '10종 시설을 역할 기반으로 자동 배치하고 동선 도로망을 그립니다. 기존 배치는 유지됩니다.', course: 'build' },
  '계획 관리 (SitePlan)': { desc: '배치안 자동저장·불러오기·실행취소(Ctrl+Z). 초기화는 저장본까지 지웁니다.', course: 'build' },
  '계획안 슬롯 — 안(案) 비교': { desc: '현 배치를 이름 붙여 여러 안으로 저장하고, 목록에서 동수·총사업비를 비교하며 전환합니다. 전환 직전 상태는 Ctrl+Z로 복귀됩니다.', course: 'build' },
  '측정': { desc: '표면거리·고도 프로파일(가시선 판정 포함)·면적(㎡/평/둘레) 측정. 우클릭으로 종료/폐합합니다. Ctrl+K 팔레트에서도 실행됩니다.', course: null },
  '침투 수단': { desc: '도보/구보/차량별 속도·한계경사가 다릅니다. 차량은 경사 24° 초과 축선 기동 불가.', course: 'infil' },
  '리허설': { desc: '침투 유닛을 축선에 올리고 타임라인으로 재생 — 타워 관측권 진입 순간이 기록됩니다.', course: 'infil' },
  '축선 상태': { desc: '축선별 경사 P95/최대·거리·예상 소요시간과 기동 가능 판정.', course: 'infil' },
  '타워 관측 이벤트': { desc: '리허설 중 타워가 유닛을 처음 관측한 지점·거리의 로그 — 조기경보 성능의 기록입니다.', course: 'infil' },
  '위협 축선 작도': { desc: '계획관이 판단한 침투 축선을 지도에 직접 그립니다 — 시작점(원거리)부터 GP 방향으로 클릭, 우클릭 완성, Esc 취소. 지형 클램프·경사 P95 분석을 거쳐 고정 축선과 동일하게 리허설·IPB 채점·워게임 판정·결심 타임라인·보고서에 반영되고, 새로고침 후에도 유지됩니다.', course: 'infil' },
  '탐지·교전 판정 (워게임 AAR)': { desc: '가동 자산과 환경(조도·가시거리·바람)으로 축선 전 구간 탐지확률을 글림프스(6초) 누적 판정합니다. 탐지 50%/90% 시각, 판정 공백 구간, 타격 결심 여유(TAI 도달 − 탐지 − 사격절차 6분)를 산출하고 축선을 초록(판정권)/빨강(공백)으로 칠합니다. 야간·안개로 바꿔 재판정하면 센서 구성의 가치가 숫자로 비교됩니다.', course: 'infil' },
  '참모 결심 판단 (KAIROS 결심엔진)': { desc: '상황 시나리오를 고르면 현재 배치·가시영역·축선 데이터를 입력으로 참모 판단(권고·근거·리스크)을 산출합니다.', course: 'decision' },
  '전술 스케치 (COA 도식)': { desc: '방책 도식(공격축·방어선·통제선·장애물지대·목표)을 지도에 직접 그립니다. 꼭짓점 클릭 후 우클릭으로 완성, Esc로 취소. 자동저장되어 새로고침 후 유지됩니다.', course: null },
  '정밀타격 효과 시뮬레이션': { desc: '지도에서 탄착점을 찍고 탄종·신관을 고르면, 탄두 순폭약량 하나에서 계산한 피해 반경이 실지형에 그려지고 그 안에 실제로 배치된 시설·감시자산이 등급을 받아 무너집니다. 배치를 옮기면 판정도 그대로 따라 바뀝니다.', course: 'fires' },
  '위협권 표출 (실무기체계)': { desc: 'VISTA threatCoverage 원본 프로파일 — 사거리·탐지호가 제조사·방사청 공개 출처값인 GP 스케일(≤12km) 위협 무기체계의 도달권을 지도에 표출합니다.', course: 'fires' },
  '타격자산 · 사격계획 원표': { desc: 'KAIROS 사격계획·타격자산 원본 데이터 — 어떤 부대가 어떤 탄종으로 어디를 맡는지의 원표입니다.', course: null },
  '종합 평가보고서 (LLM)': { desc: '가시영역 → 적 이동경로 채점 → 지형분석 → 위협권 → 화력판단을 순서대로 산출한 뒤, 그 결과를 로컬 LLM이 해석·권고해 브리핑 카드로 띄웁니다. 수치는 전부 엔진이 계산한 값입니다.', course: null },
  '작전 보고서': { desc: '현재 배치·비용·축선·IPB·지형분석·화력 판단을 묶어 War ground 원본 렌더러로 인쇄용 보고서를 만듭니다. 임무·대상·등급·시계를 고르면 그에 맞춰 문체와 분량이 바뀝니다.', course: null },
  '참여형 사용설명서': { desc: '지금 보고 있는 이 탭입니다. 코스를 시작해 보세요!', course: null },
};

// ═══════════ 코스 정의 ═══════════
export const COURSES = [
  {
    id: 'basics', icon: svgIcon('compass'), title: '첫 5분 — 화면과 카메라', minutes: 3,
    goal: '화면 구성을 파악하고 3D 카메라를 다뤄 봅니다.',
    steps: [
      { say: '환영합니다! 화면은 셋으로 나뉩니다 — ① 명령 패널(탭·버튼) ② 3D 전장 ③ 하단 상태바(마우스 위치의 MGRS 좌표·표고). 이 가이드는 실제로 눌러보며 진행됩니다. 코치 카드는 「—」로 접을 수 있어요.' },
      { say: '각 섹션 제목 옆의 <b style="color:var(--accent)">?</b> 뱃지를 누르면 그 기능의 설명과 관련 코스를 바로 볼 수 있습니다. 섹션 <b>제목 자체를 클릭하면 접기/펴기</b> — 안 쓰는 섹션은 접어두면 패널이 한결 넓어집니다 (상태는 기억됩니다).' },
      { say: '지도 하단 가운데 <b>퀵 액션 독</b>이 보이나요? 투어·승탑·도보·드론·최적화·자동배치 — 어느 탭에 있든 <b>숫자키 1~6</b>으로도 실행됩니다. 승탑/도보/드론은 켜져 있으면 버튼이 하이라이트되고 <b>다시 누르면 종료(✕)</b>됩니다. 섹션 제목 <b>더블클릭</b>은 그 섹션만 남기고 다 접는 솔로 모드, 패널 오른쪽 모서리 드래그는 폭 조절.' },
      { say: '지도 좌상단 <b>도구 툴바</b>를 보세요 — 홈 뷰·정사 탑다운·북 정렬·MGRS 군사격자·미니맵·화면 캡처·전체화면이 모여 있습니다. 나침반을 클릭하면 언제든 북쪽이 위로 정렬됩니다. 하단 가운데 축척바는 카메라에 따라 실시간으로 바뀝니다.' },
      { say: '<b>Ctrl+K</b>(또는 상단바 ⌘K 버튼)를 누르면 명령 팔레트가 열립니다 — 탭 이동·시점 전환·측정·격자·계획 등 모든 기능을 검색해 바로 실행할 수 있어요. 기능이 어디 있는지 잊었을 때 가장 빠른 길입니다.' },
      { tab: 'twin', target: '#fly-tour', click: true, say: '먼저 전장을 한 바퀴 둘러봅시다.', hint: '「◈ 시네마틱 투어」를 눌러보세요' },
      { say: '투어 중에도 카메라는 언제든 직접 조작할 수 있습니다 — 좌드래그: 이동 · 휠: 줌 · 우드래그(또는 Ctrl+드래그): 회전/틸트. 지금 지도를 몇 번 움직여 보세요.' },
      { tab: 'twin', target: '#fly-gp', click: true, say: '길을 잃으면 언제든 기준 시점으로 돌아올 수 있습니다.', hint: '「GP 상공」을 눌러 복귀하세요' },
      { say: '마지막 확인!', quiz: { q: '3D 지도에서 길을 잃었을 때 가장 빠른 복귀 방법은?', options: ['브라우저 새로고침', '「GP 상공」 버튼', '휠을 계속 굴린다'], answer: 1, explain: '카메라 섹션의 「GP 상공」이 기준 시점으로 즉시 복귀시켜 줍니다.' } },
    ],
  },
  {
    id: 'tower', icon: svgIcon('tower'), title: '감시탑과 가시영역', minutes: 4,
    goal: '타워 높이를 바꾸면 시야와 공사비가 어떻게 변하는지 확인합니다.',
    steps: [
      { tab: 'twin', target: '#twin-height', say: '감시탑은 실물 격자 트러스 모델입니다. 높이를 올리면 4m 트러스가 실시간으로 쌓입니다. <b>팁: 3D 지도의 타워를 직접 클릭</b>해도 높이 조절 팝업이 그 자리에 뜹니다.', hint: '타워 높이 슬라이더를 28m 이상으로 올려보세요 (지도의 타워를 클릭해 팝업 슬라이더를 써도 됩니다)', until: (s) => s.ents.towerHeight >= 28 },
      { tab: 'twin', target: '#run-viewshed', say: '이 높이에서 실제 지형 기준으로 어디가 보이는지 광선추적합니다 (약 10초 소요).', hint: '「가시영역 계산·표시」를 누르고 잠시 기다리세요', until: (s) => !!s.grid && s.gridHeight === s.ents.towerHeight },
      { say: '지도의 초록 = 타워에서 관측 가능, 빨강 = 지형에 가린 사각. 높이를 바꾸면 이 그림과 왼쪽의 공사비가 함께 변합니다 — "10m 더 올리면 얼마에 얼마나 더 보이나"가 이 도구의 핵심 답변입니다.' },
      { tab: 'twin', target: '#twin-height', say: '비교해 봅시다.', hint: '슬라이더를 12m 이하로 내렸다가 다시 계산해 보세요 (선택)', until: (s) => s.ents.towerHeight <= 12, optional: true },
      { say: '체크포인트!', quiz: { q: '가시영역 지도에서 빨간색의 의미는?', options: ['적 점령 지역', '지형에 가려 타워에서 안 보이는 사각', '사격 금지 구역'], answer: 1, explain: '빨강은 능선 등 지형 차폐로 타워에서 관측 불가한 사각지대입니다. 이 사각을 센서로 메우는 것이 다음 코스 주제입니다.' } },
    ],
  },
  {
    id: 'assets', icon: svgIcon('antenna'), title: '감시·화기 자산과 합동 최적화', minutes: 5,
    goal: '자산을 켜고, 합동 배치 최적화로 최적 거치·지향을 찾습니다.',
    steps: [
      { tab: 'twin', target: '[data-asset="radar"]', say: '자산 체크박스를 켜면 사거리 시각화와 함께 실물 거치 3D(레이더 트레일러)가 GP 옆에 배치됩니다.', hint: '「지상감시레이더」를 체크하세요', until: (s) => s.assets.isOn('radar') },
      { tab: 'twin', target: '[data-asset="hmg"]', say: '화기는 유효사거리 링으로, 광학은 DRI(탐지·인지·식별) 3중 링으로 표시됩니다 — "가시거리"는 하나가 아닙니다.', hint: '「K6 중기관총」도 체크하세요', until: (s) => s.assets.isOn('hmg') },
      { tab: 'twin', target: '#asset-optimize', say: '핵심 기능 — 자산들의 위치와 지향각을 팀으로 최적화합니다. 서로 못 보는 사각을 메우도록 배치됩니다 (수 초 소요).', hint: '「◈ 자산 배치 최적화」를 누르고 기다리세요', until: (s) => !!s.assets.lastOptimization },
      { say: '리포트 읽는 법: 「합동 커버리지 37%→45%」= 최적화 이득. 자산별 「기여 +N%」= 그 자산이 팀에 더한 몫. 「조기경보선 사각」이 빨갛게 뜨면 그 방위는 어떤 자산도 못 봅니다. 드레이프: 청록=고밀 · 노랑=희박 · 빨강=사각.' },
      { say: `이제 <b>자산의 눈으로</b> 봅시다 — 3D 지도의 거치 모델(레이더 트레일러 등)을 클릭하고 팝업의 <b>「${svgIcon('video')} 뷰」</b>를 누르면 그 센서의 실지형 시점이 PIP 창으로 뜹니다. EO/IR(열상)/조준경은 드래그 슬루·휠 배율, 레이더는 스윕 도는 PPI 스코프, 하단 칩으로 드론 짐벌까지 전환됩니다. 침투 리허설을 재생해 두면 피드에 표적이 지나갑니다.` },
      { say: '체크포인트!', quiz: { q: '단독 커버 18%인 EO의 「기여」가 +4%뿐인 이유는?', options: ['EO 성능이 나빠서', '레이더가 이미 커버한 영역과 겹쳐서', '계산 오류'], answer: 1, explain: '합동 최적화는 겹침을 빼고 팀에 새로 더한 몫(한계기여)만 셉니다. 그래서 EO는 남들이 못 보는 방향으로 지향을 틀게 됩니다.' } },
    ],
  },
  {
    id: 'build', icon: svgIcon('build'), title: '시설 배치와 비용', minutes: 6,
    goal: '건물을 직접 놓아 보고, 인스펙터와 자동배치를 사용합니다.',
    steps: [
      { tab: 'build', say: '배치 탭입니다. 왼쪽 카탈로그의 시설 카드는 전부 실물 3D 모델로 배치되며, 놓는 순간 그 지형의 절·성토량으로 공사비가 산출됩니다.' },
      { tab: 'build', say: '직접 하나 놓아 봅시다.', hint: '카탈로그에서 「생활 구역」 카드를 지도 위로 끌어다 놓으세요', onEnter: (s, m) => { m.n0 = s.placer.items.length; }, until: (s, m) => s.placer.items.length > m.n0 },
      { tab: 'build', say: '배치된 건물을 클릭하면 아래에 인스펙터가 열립니다. 인원을 바꾸면 면적·건물이 즉시 다시 지어지고 비용이 재산출됩니다.', hint: '건물 클릭 → 인스펙터의 「수용 인원」 슬라이더를 움직여 보세요', onEnter: (s, m) => { m.cost0 = s.placer.totalKrw(); }, until: (s, m) => s.placer.items.length && Math.abs(s.placer.totalKrw() - m.cost0) > 1 },
      { tab: 'build', target: '#auto-layout', say: '10종 표준 세트를 역할 기반으로 자동 배치합니다 — 전방 초소는 능선에, 위병소는 후방 접근로에, 탄약고는 생활동에서 50m 이상 이격. 완료되면 동선 도로망도 그려집니다 (십수 초 소요).', hint: '「◈ 표준 GP 세트 자동배치」를 누르고 기다리세요', onEnter: (s, m) => { m.n0 = s.placer.items.length; }, until: (s, m) => s.placer.items.length >= m.n0 + 5 },
      { say: '팁: 건물은 클릭한 채 드래그로 이동(비용 자동 재산출), Delete로 철거, Ctrl+Z 실행취소. 탭 하단의 AI 배치에 자연어("보병 40명 주둔지")를 입력하는 방법도 있습니다.' },
      { say: '체크포인트!', quiz: { q: '자동배치가 탄약고를 생활동에서 50m 이상 떼어 놓는 이유는?', options: ['공사비 절감', '탄약 유폭 대비 안전이격', '전파 간섭 방지'], answer: 1, explain: '탄약고 유폭 시 인명 피해를 막기 위한 안전이격 규칙입니다. 위생·복지·의무는 반대로 생활동 가까이 붙습니다.' } },
    ],
  },
  {
    id: 'infil', icon: svgIcon('infil'), title: '침투 리허설', minutes: 5,
    goal: '적 침투를 재생하고 타워가 언제 처음 보는지 확인합니다.',
    steps: [
      { tab: 'infil', target: '[data-mode="vehicle"]', say: '침투 수단에 따라 기동 가능한 축선이 다릅니다.', hint: '「차량 침투」를 선택해 기동불가 축선을 확인하세요', until: (s) => s.infil.mode === 'vehicle' },
      { tab: 'infil', target: '[data-mode="walk"]', say: '도보는 어디든 갑니다.', hint: '「도보 침투」로 되돌리세요', until: (s) => s.infil.mode === 'walk' },
      { tab: 'infil', target: '#run-infil', say: '축선을 따라 침투 유닛을 준비시킵니다. 가시영역이 없으면 자동으로 먼저 계산합니다.', hint: '「침투 리허설 실행」을 누르세요', until: () => { const el = document.querySelector('#timeline-bar'); return el && !el.classList.contains('hidden'); } },
      { target: '#sim-play', say: '하단 타임라인이 열렸습니다.', hint: '▶ 재생을 누르세요 — 유닛이 타워 관측권(앰버)에 들어오는 순간 경보가 뜹니다', until: (s) => !!s.playing },
      { say: '팁: 「추적」 버튼으로 유닛 추적 카메라, 침투 유닛을 직접 클릭하면 교전 제원 카드(방위각·고저각 밀 단위, 사용 가능 화기)가 열립니다.' },
      { tab: 'infil', target: '#route-sketch-begin', say: '고정 4개 축선이 전부가 아닙니다 — <b>계획관이 판단한 위협 축선을 직접 그릴 수 있습니다</b>. 시작점(원거리)부터 GP 방향으로 클릭하고 우클릭으로 완성하면, 지형 클램프·경사 분석을 거쳐 리허설·작전분석·워게임에 즉시 반영됩니다.', hint: '「새 침투 축선 작도」로 축선 하나를 그려보세요 (선택)', until: (s) => s.routeSketch?.defs.length > 0, optional: true },
      { tab: 'infil', target: '#run-wargame', say: '재생이 눈이라면 <b>판정은 숫자</b>입니다 — 「탐지·교전 판정」은 현재 자산·환경(조도/가시거리/바람)으로 축선 전 구간의 탐지확률을 누적 계산해, 탐지 50%/90% 시각·판정 공백·타격 결심 여유를 산출하고 축선을 판정색으로 칠합니다. 환경 패널에서 야간·안개로 바꿔 다시 판정해 보면 레이더의 가치가 숫자로 보입니다.', hint: '「전 축선 탐지·교전 판정 실행」을 눌러 AAR 카드를 확인하세요 (선택)', until: (s) => !!s.wargameResults, optional: true },
      { say: '체크포인트!', quiz: { q: '차량 침투가 일부 축선에서 「기동불가」인 기준은?', options: ['거리 5km 초과', '경사 24° 초과 구간 존재', '교량 부재'], answer: 1, explain: '축선 경사 프로파일의 P95가 차량 한계경사 24°를 넘으면 기동불가로 판정합니다. 도보(38°)는 대부분 통과합니다.' } },
    ],
  },
  {
    id: 'field', icon: svgIcon('medal'), title: '현장 점검 — 1인칭', minutes: 6,
    goal: '타워에 올라가 보고, 도보로 부지를 걸어봅니다.',
    steps: [
      { tab: 'twin', target: '#vantage-list', say: '설계 수치가 아니라 병사의 눈으로 확인합니다. 1인칭은 관측점을 하나 고르는 일입니다 — 목록에는 감시탑뿐 아니라 배치한 초소·부감시소·자산 거치대가 함께 올라옵니다.', hint: '관측점을 고르고 「선택 관측점 1인칭 진입 ▶」을 누르세요', until: (s) => s.fpv.active },
      { say: '드래그로 둘러보고, 휠을 당기면 쌍안경 배율이 올라갑니다.', hint: '휠로 4× 이상 확대해 보세요', until: (s) => s.fpv.active && s.fpv.fov < 16 },
      { say: '승탑 상태에서 높이 슬라이더로 증고/감고에 따른 시야 변화를, 아래 칩으로는 관측점 자체를 갈아타며 「이 초소에서는 무엇이 보이는가」를 비교할 수 있습니다.', hint: 'ESC 또는 「종료」로 내려오세요', until: (s) => !s.fpv.active },
      { tab: 'twin', target: '#enter-walk', say: '이번엔 도보 정찰입니다.', hint: '「도보 정찰 (WASD)」을 누르세요', until: (s) => s.walk.active },
      { say: 'WASD 이동 · Shift 질주. 이동하면 순찰 트랙이 기록됩니다.', hint: '10m 이상 걸어보세요', onEnter: (s, m) => { m.p0 = { ...s.walk.pos }; }, until: (s, m) => s.walk.active && Math.hypot((s.walk.pos.lon - m.p0.lon) * 90000, (s.walk.pos.lat - m.p0.lat) * 111000) > 10 },
      { say: '도보 중 도구: B 쌍안경(밀·MGRS 판독) · T 현위치 가시영역 · F 피탐 체크(타워에서 내가 보이는가) · E 건물/타워 진입. 체험 후 ESC로 종료하세요.', hint: 'ESC로 종료', until: (s) => !s.walk.active },
      { say: '체크포인트!', quiz: { q: '도보 정찰 중 「F」 키의 기능은?', options: ['사격', '피탐 체크 — 타워에서 내 위치가 보이는지 역산', '플래시라이트'], answer: 1, explain: '침투자 관점의 역질문입니다 — 내가 여기 서 있으면 타워가 나를 보는가. 순찰로 설계에 씁니다.' } },
    ],
  },
  {
    id: 'fires', icon: svgIcon('fires'), title: '화력 — 정밀타격 시뮬레이션', minutes: 5,
    goal: '지도에서 탄착점을 찍어 피해 반경과 배치 시설의 생존성을 확인합니다.',
    steps: [
      { tab: 'fires', say: '화력 탭입니다. 예전에는 좌표 없는 가짜 단지에서 재생했지만, 지금은 <b>실제 VWorld 위성영상·지형 위</b>, 여러분이 배치 탭에서 지은 바로 그 시설들 사이에서 타격이 일어납니다. 아래 KAIROS 교리 표(탄약효과·CDE·사격부대)도 이 화면과 같은 표적을 봅니다.' },
      { tab: 'fires', target: '#sk-pick', click: true, say: '탄착점부터 찍어봅시다.', hint: '「지도에서 지정 ▶」을 누르세요' },
      { say: '이제 지도 위 아무 지점이나 클릭해 탄착점을 확정합니다.', hint: '지형 위를 클릭하세요', until: () => !!document.querySelector('#sk-impact .kv') },
      { tab: 'fires', target: '#sk-muns', say: '탄종은 대전차유도탄(3kg)부터 전술지대지유도탄(200kg)까지 8종 — 순폭약량이 클수록 완파·중파·경파·유리·파편 반경이 함께 커집니다.', hint: '탄종 카드를 하나 눌러 골라보세요' },
      { tab: 'fires', target: '#sk-fuze', say: '신관은 순발·지연·공중폭발 — 지연신관은 관통 후 내부에서 터져, 방호 시설이 갖는 「3.2배 과압 필요」의 이점을 없애 버립니다.' },
      { tab: 'fires', target: '#sk-run', click: true, say: '쏴 봅시다.', hint: '지도 위 HUD의 「▶ 타격 재생」을 누르세요' },
      { say: '반경 안에 실제로 들어 있는 배치 시설·감시자산만 등급을 받아 화면에서 무너집니다 — 판정 표는 아래 「⑦ 피해 판정」, 안전거리 검증은 「⑧ 부수피해 검증」에서 KAIROS CDE 원표와 대조됩니다.' },
      { tab: 'fires', target: '#sk-rounds', say: '한 발로 안 끝나면 어떨까요? 발수를 올리면 발마다 CEP 만큼 흩어진 자리에 재장전 간격을 두고 떨어지고, 손상이 (과압/완파문턱)^1.4 로 누적됩니다(Palmgren–Miner). 「필요 발수」는 CEP 산포를 반영한 500회 몬테카를로의 중앙값·90% 값입니다.', hint: '연속사격을 2발 이상으로 올려보세요 (선택)', until: () => { const el = document.querySelector('#sk-rounds-val'); return !!el && parseInt(el.textContent, 10) > 1; }, optional: true },
      { say: '체크포인트!', quiz: { q: '방호 시설이 일반 시설과 같은 등급으로 무너지려면?', options: ['같은 과압으로 충분하다', '3.2배의 과압이 필요하다 (관통탄두+지연신관에는 그 이점이 사라진다)', '탄종과 무관하게 항상 버틴다'], answer: 1, explain: '방호 시설은 같은 손상에 이르는 데 3.2배의 과압이 필요합니다(반경은 그만큼 줄어듭니다) — 다만 관통탄두 + 지연신관 조합에는 그 이점이 사라집니다.' } },
    ],
  },
  {
    id: 'decision', icon: svgIcon('decision'), title: '참모 결심 판단', minutes: 4,
    goal: '상황을 골라 결심엔진의 참모 판단을 받아 봅니다.',
    steps: [
      { tab: 'decision', say: '결심 탭은 지금까지 만든 데이터(배치·가시영역·축선·자산·화력판단)를 입력으로, 상황별 참모 판단을 산출합니다. 배치나 가시영역이 있을수록 판단 근거가 풍부해집니다.' },
      { tab: 'decision', target: '#d-scenario', say: '먼저 상황을 고릅니다.', hint: '시나리오 드롭다운에서 아무 상황이나 골라보세요 (그대로 둬도 됩니다)' },
      { tab: 'decision', target: '#d-run', say: '판단을 산출합니다.', hint: '「판단 산출 ▶」을 누르고 잠시 기다리세요', until: () => { const el = document.querySelector('#d-out-sec'); return el && el.style.display !== 'none'; } },
      { say: '결과는 권고 방책과 그 근거(현 배치·커버리지·축선 위협)로 구성됩니다. 「14개 전체」는 모든 시나리오를 한 번에 훑어 취약한 상황을 찾을 때 씁니다.' },
      { say: '✅ 완료! 이로써 설계 → 검증 → 체감 → 화력 → 결심까지, 이 앱의 전 루프를 다 배웠습니다.' },
    ],
  },
];

// ═══════════ 엔진 ═══════════
export class Tutorial {
  /** ctx: { getState: ()=>state, switchTab(name), toast(msg) } */
  constructor(ctx) {
    this.ctx = ctx;
    this.course = null;
    this.idx = 0;
    this.mem = {};
    this._timer = null;
    this._clickHandler = null;
    this._lastTarget = null;
    this._min = false;
    this.onProgress = null;
  }

  static doneMap() {
    try { return JSON.parse(localStorage.getItem(LS_DONE) || '{}'); } catch { return {}; }
  }

  static savedPos() {
    try { return JSON.parse(localStorage.getItem(LS_POS) || 'null'); } catch { return null; }
  }

  start(courseId, fromIdx = 0) {
    this.stop(false, true);
    this.course = COURSES.find((c) => c.id === courseId);
    if (!this.course) return;
    this.idx = Math.min(fromIdx, this.course.steps.length - 1);
    this.mem = {};
    this._min = false;
    this._enterStep();
  }

  resume() {
    const pos = Tutorial.savedPos();
    if (pos) this.start(pos.course, pos.idx);
  }

  stop(mark = false, silent = false) {
    if (mark && this.course) {
      const done = Tutorial.doneMap();
      done[this.course.id] = true;
      try { localStorage.setItem(LS_DONE, JSON.stringify(done)); } catch { /* noop */ }
    }
    try { localStorage.removeItem(LS_POS); } catch { /* noop */ }
    clearInterval(this._timer);
    this._timer = null;
    if (this._clickHandler) { document.removeEventListener('click', this._clickHandler, true); this._clickHandler = null; }
    this._unhighlight();
    document.querySelector('#tut-coach')?.remove();
    document.querySelector('#tut-spot')?.classList.add('hidden');
    this.course = null;
    if (!silent) this.onProgress?.();
  }

  next() {
    if (!this.course) return;
    this.idx++;
    if (this.idx >= this.course.steps.length) return this._finish();
    this._enterStep();
  }

  prev() {
    if (!this.course || this.idx === 0) return;
    this.idx--;
    this._enterStep();
  }

  /** 완료 카드 — 다음 미완료 코스 체이닝 */
  _finish() {
    const finished = this.course;
    const done = Tutorial.doneMap();
    done[finished.id] = true;
    try {
      localStorage.setItem(LS_DONE, JSON.stringify(done));
      localStorage.removeItem(LS_POS);
    } catch { /* noop */ }
    clearInterval(this._timer);
    this._timer = null;
    if (this._clickHandler) { document.removeEventListener('click', this._clickHandler, true); this._clickHandler = null; }
    this._unhighlight();
    document.querySelector('#tut-spot')?.classList.add('hidden');

    const nextCourse = COURSES.find((c) => !Tutorial.doneMap()[c.id]);
    const allDone = !nextCourse;
    const card = this._coachEl();
    card.innerHTML = `
      <div class="tc-head"><span>${svgIcon('graduate')} 코스 완료!</span><span class="tc-prog">✓</span></div>
      <div class="tc-body"><b>「${finished.title}」</b>를 마쳤습니다.
        ${allDone ? `<br><b style="color:var(--accent)">${svgIcon('trophy')} 전 코스 완료 — 설명서 마스터!</b> 이제 이 앱의 모든 흐름을 아는 겁니다.`
    : `<br>다음 추천: ${nextCourse.icon} <b>${nextCourse.title}</b> (~${nextCourse.minutes}분)`}</div>
      <div class="tc-actions">
        ${allDone ? '' : `<button class="btn primary" id="tut-chain">${nextCourse.icon} 다음 코스 시작 →</button>`}
        <button class="btn" id="tut-quit">닫기</button>
      </div>`;
    card.querySelector('#tut-chain')?.addEventListener('click', () => this.start(nextCourse.id));
    card.querySelector('#tut-quit')?.addEventListener('click', () => { this.course = null; this.stop(false); });
    this.course = null;
    this.onProgress?.();
    this.ctx.toast(allDone ? '🏆 전 코스 완료 — 설명서 마스터!' : `🎓 「${finished.title}」 완료!`, 4200);
  }

  _enterStep() {
    const step = this.course.steps[this.idx];
    const s = this.ctx.getState();
    if (step.tab) this.ctx.switchTab(step.tab);
    this.mem = {};
    step.onEnter?.(s, this.mem);
    try { localStorage.setItem(LS_POS, JSON.stringify({ course: this.course.id, idx: this.idx })); } catch { /* noop */ }

    clearInterval(this._timer);
    if (this._clickHandler) { document.removeEventListener('click', this._clickHandler, true); this._clickHandler = null; }
    this._unhighlight();
    this._renderCoach(step, false);

    if (step.click && step.target) {
      this._clickHandler = (e) => {
        if (e.target.closest?.(step.target)) this._complete();
      };
      document.addEventListener('click', this._clickHandler, true);
    }
    this._timer = setInterval(() => {
      if (step.target) this._highlight(step.target);
      this._spotlight(step.target);
      if (step.until) {
        try {
          if (step.until(this.ctx.getState(), this.mem)) this._complete();
        } catch { /* 상태 미준비 */ }
      }
    }, 400);
    if (step.target) {
      this._highlight(step.target, true);
      this._spotlight(step.target);
    } else {
      this._spotlight(null);
    }
  }

  _complete() {
    clearInterval(this._timer);
    this._timer = null;
    if (this._clickHandler) { document.removeEventListener('click', this._clickHandler, true); this._clickHandler = null; }
    const step = this.course?.steps[this.idx];
    if (step) this._renderCoach(step, true);
    setTimeout(() => this.next(), 750);
  }

  // ── 시각 요소 ──
  _spotlight(sel) {
    let spot = document.querySelector('#tut-spot');
    if (!spot) {
      spot = document.createElement('div');
      spot.id = 'tut-spot';
      document.body.appendChild(spot);
    }
    const el = sel ? document.querySelector(sel) : null;
    if (!el || this._min) { spot.classList.add('hidden'); return; }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { spot.classList.add('hidden'); return; }
    spot.classList.remove('hidden');
    const pad = 6;
    spot.style.left = `${r.left - pad}px`;
    spot.style.top = `${r.top - pad}px`;
    spot.style.width = `${r.width + pad * 2}px`;
    spot.style.height = `${r.height + pad * 2}px`;
  }

  _highlight(sel, scroll = false) {
    const el = document.querySelector(sel);
    if (!el) return;
    if (this._lastTarget && this._lastTarget !== el) this._lastTarget.classList.remove('tut-glow');
    el.classList.add('tut-glow');
    this._lastTarget = el;
    if (scroll) el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }

  _unhighlight() {
    document.querySelectorAll('.tut-glow').forEach((el) => el.classList.remove('tut-glow'));
    this._lastTarget = null;
  }

  _coachEl() {
    let card = document.querySelector('#tut-coach');
    if (!card) {
      card = document.createElement('div');
      card.id = 'tut-coach';
      document.body.appendChild(card);
    }
    return card;
  }

  _renderCoach(step, completed) {
    const card = this._coachEl();
    const n = this.course.steps.length;
    const waiting = !!(step.until || step.click);
    const pct = Math.round(((this.idx + (completed ? 1 : 0)) / n) * 100);
    card.classList.toggle('minimized', this._min);

    let body = `<div class="tc-body">${step.say}</div>`;
    let hintHtml = step.hint
      ? `<div class="tc-hint ${completed ? 'done' : ''}">${completed ? '✅ 완료!' : `${svgIcon('arrow-right')} ${step.hint}`}</div>` : '';
    let actions;

    if (step.quiz && !completed) {
      body = `<div class="tc-body"><b>Q.</b> ${step.quiz.q}</div>
        <div class="tc-quiz">${step.quiz.options.map((o, i) =>
    `<button class="btn tc-opt" data-opt="${i}">${i + 1}. ${o}</button>`).join('')}</div>
        <div class="tc-hint hidden" id="tc-explain"></div>`;
      actions = '<button class="btn" id="tut-quit">종료</button>';
      hintHtml = '';
    } else {
      actions = `
        ${this.idx > 0 && !completed ? '<button class="btn" id="tut-prev">←</button>' : ''}
        ${waiting && !completed
    ? `<button class="btn" id="tut-skip">${step.optional ? '건너뛰기' : '건너뛰기 →'}</button>`
    : (!completed ? '<button class="btn primary" id="tut-next">다음 →</button>' : '')}
        <button class="btn" id="tut-quit">종료</button>`;
    }

    card.innerHTML = `
      <div class="tc-head">
        <span>${this.course.icon} ${this.course.title}</span>
        <span>
          <button class="tc-min" id="tut-min" title="접기/펴기">${this._min ? '▣' : '—'}</button>
          <span class="tc-prog">${Math.min(this.idx + 1, n)}/${n}</span>
        </span>
      </div>
      <div class="tc-bar"><div class="tc-bar-fill" style="width:${pct}%"></div></div>
      <div class="tc-content">${body}${hintHtml}<div class="tc-actions">${actions}</div></div>`;

    card.querySelector('#tut-next')?.addEventListener('click', () => this.next());
    card.querySelector('#tut-skip')?.addEventListener('click', () => this.next());
    card.querySelector('#tut-prev')?.addEventListener('click', () => this.prev());
    card.querySelector('#tut-quit')?.addEventListener('click', () => this.stop(false));
    card.querySelector('#tut-min')?.addEventListener('click', () => {
      this._min = !this._min;
      this._renderCoach(step, completed);
    });
    if (step.quiz && !completed) {
      card.querySelectorAll('.tc-opt').forEach((b) => {
        b.addEventListener('click', () => {
          const pick = +b.dataset.opt;
          if (pick === step.quiz.answer) {
            b.classList.add('correct');
            this._complete();
          } else {
            b.classList.add('wrong');
            const ex = card.querySelector('#tc-explain');
            if (ex) {
              ex.classList.remove('hidden');
              ex.textContent = `💡 ${step.quiz.explain}`;
            }
          }
        });
      });
    }
  }
}

// ═══════════ 컨텍스트 도움말 (? 뱃지 + 팝오버) ═══════════
let _helpWired = false;

export function injectHelpBadges(root, tutorial) {
  root.querySelectorAll('.sec-title').forEach((el) => {
    if (el.querySelector('.help-q')) return;
    if (el.closest('#page-guide')) return;
    const key = el.childNodes[0]?.textContent?.trim() ?? el.textContent.trim();
    if (!HELP_TOPICS[key]) return;
    const q = document.createElement('span');
    q.className = 'help-q';
    q.textContent = '?';
    q.dataset.help = key;
    el.appendChild(q);
  });
  if (_helpWired) return;
  _helpWired = true;
  document.addEventListener('click', (e) => {
    const pop = document.querySelector('#help-pop');
    const badge = e.target.closest?.('.help-q');
    if (!badge) {
      if (pop && !e.target.closest('#help-pop')) pop.classList.add('hidden');
      return;
    }
    const key = badge.dataset.help;
    const topic = HELP_TOPICS[key];
    if (!topic) return;
    let p = pop;
    if (!p) {
      p = document.createElement('div');
      p.id = 'help-pop';
      document.body.appendChild(p);
    }
    const course = topic.course ? COURSES.find((c) => c.id === topic.course) : null;
    p.innerHTML = `
      <div class="hp-title">${key}</div>
      <div class="hp-desc">${topic.desc}</div>
      ${course ? `<button class="btn primary" id="hp-course">${course.icon} 관련 코스 해보기 (~${course.minutes}분)</button>` : ''}`;
    const r = badge.getBoundingClientRect();
    p.classList.remove('hidden');
    p.style.left = `${Math.min(r.left, window.innerWidth - 300)}px`;
    p.style.top = `${r.bottom + 6}px`;
    p.querySelector('#hp-course')?.addEventListener('click', () => {
      p.classList.add('hidden');
      tutorial?.start(topic.course);
    });
  });
}

