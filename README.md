# GP Digital Twin

VISTA · KAIROS · Scaffolda 세 코드베이스의 핵심 코드를 직접 이식해 융합한
GP(감시초소) 디지털트윈 데모. **합성 데모 데이터 — 실좌표·실기준 아님.**

## 실행

### 정밀타격 효과 시뮬레이션

**화력** 탭 맨 위 섹션입니다(예전 「피해 시각화」 탭은 여기로 합쳐졌고,
`?demo=damage` 주소로 들어오면 화력 탭이 열립니다).

VWorld 위성영상 + 실지형 위에서 타격 지점을 클릭해 지정하고, 탄종(대전차유도탄
순폭약량 3kg ~ 전술지대지유도탄 200kg, 8종)과 신관(순발·지연·공중폭발)을 고릅니다.
**탄두 순폭약량 하나**에서 계산한 피해 반경(탄공·완파·중파·경파·유리·파편)이 지형에
그려지고, 그 안에 실제로 들어 있는 배치 시설·감시자산·감시탑이 등급을 받아 화면에서
무너집니다. 배치를 고치면 판정이 따라 바뀝니다. 반경은 입방근 법칙 + Brode(1955)
과압식에서 역산하며, 부수피해 안전거리는 같은 탭 아래의 KAIROS CDE 원표로 검증합니다.
[기능 설명](docs/strike.md)을 참고하세요.

**몇 발까지 버티는가**도 함께 계산합니다. 1~12발 연속사격을 걸면 발마다 CEP 만큼
흩어진 자리에 떨어지고, 한 발의 손상 `D=(과압/완파문턱)^1.4`를 발마다 더해
`ΣD≥1`이면 완파로 봅니다(Palmgren–Miner 선형 누적손상). 필요 발수는 CEP 산포를 넣은
500회 몬테카를로의 중앙값과 90% 값으로 나오고, 건물은 누적 손상만큼 실제로 주저앉습니다 —
한 발 맞고 버틴 건물이 반쯤 기운 채 서 있다가 다음 발에 마저 무너집니다.
건물은 **HP 구간마다 다른 3D 메시**로 바뀝니다 — 원형 / 외피 손상(오버레이) /
구조 반파 / 완전 붕괴 3단계를 Blender로 구웠습니다. 폭발 표현은 VISTA 배치 런타임의
스프라이트 시트에 Cesium `ParticleSystem`(화염·연기·먼지·불티)과 충격파 화면 왜곡
포스트프로세스를 겹쳤습니다.

**지형 차폐**를 Maekawa 회절식으로 계산합니다 — 폭심과 표적을 잇는 직선 아래로 지형이
솟아 있으면 마루를 돌아가는 경로차를 재어 최대 24 dB(압력 1/16)까지 감쇠시킵니다.
폭약량이 클수록 펄스가 길어 능선이 덜 막아 줍니다. **탄약고가 완파되면 저장 탄약이 함께
터져**(50 t → TNT 환산 7,500 kg · 완파 71 m) 둘레를 통째로 지웁니다 — 탄약고 이격이 왜
가장 값싼 보완인지 화면이 보여 줍니다. **취약 조준점 분석**은 후보 격자를 훑어 「적이
노릴 자리」를 히트맵으로 깔고 그 점으로 조준점을 옮깁니다.

게임처럼 **절차적 폭발음**(WebAudio 합성 · 소리는 빛보다 거리÷343m/s 만큼 늦게 옵니다),
**데미지 넘버**, **전투 로그**, **탄착 슬로모**, 그리고 재생이 끝나면 뜨는 **전투 결과
화면**(S~D 등급 — 최소 필요 발수 대비 효율로 매김)이 붙어 있습니다.

건물 차폐와 건물 간 반사 증폭은 계산하지 않습니다. 사상자·금전손실·구조해석은 하지
않으며, 무장 제원은 공개출처 근사값입니다.

### 처음 한 번

```bash
npm install
cp .env.example .env   # VWORLD_API_KEY 등 실제 키 입력 (아래 "API 연동 방법" 참고)
```

### API 연동 방법 (3D 지도를 띄우려면)

3D 지도(위성영상·실지형·3D 건물)는 외부 타일 API를 씁니다. **키는 저장소에 없습니다** —
클론한 뒤 각자 발급받아 `.env`에 넣어야 지도가 제대로 보입니다. 지형 GLB·시설 모델·
사운드 등 3D 자산(`assets/`)과 벤더 번들(`js/vendor/*.bundle.js`)은 저장소에 포함돼 있습니다.

| `.env` 변수 | 발급처 | 쓰는 곳 | 없으면 |
|---|---|---|---|
| `VWORLD_API_KEY` | [브이월드 오픈API](https://www.vworld.kr/dev/v4dv_2ddataguide2_s001.do) → 인증키 발급 | 위성/야간 베이스맵(`/vworld/`), 지명·3D 건물, KAIROS 지형 벡터레이어(`/api/vworld/`) | VWorld 베이스맵·건물·보조 레이어 비어 보임 |
| `VWORLD_DOMAIN` | VWorld 키 발급 시 등록한 서비스 URL | 서버가 VWorld 요청 `Referer`로 사용 | 기본 `localhost` — 키 발급 때 `localhost`로 등록하면 그대로 |
| `MAPTILER_API_KEY` | [MapTiler Cloud](https://cloud.maptiler.com/account/keys/) (무료 플랜) | Cesium 지형 `terrain-quantized-mesh-v2`(`/maptiler-terrain` 프록시+캐시) | 지도 탭에서 지형 소스를 ArcGIS Terrain3D로 바꿔 사용 |
| `ARCGIS_API_KEY` | [ArcGIS Developer](https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/) — *Static basemap tiles* 권한만 | 기본 World Imagery 베이스맵(`/arcgis-img` 프록시+캐시) | 다른 베이스맵(VWorld·OpenTopoMap) 선택 |
| `ITS_API_KEY` (선택) | [국가교통정보센터 오픈API](https://www.its.go.kr/opendata/) | 기동로 점수 실측(`/its/` — 서버에서만 주입, 프런트 비노출) | 기동로 점수를 축선 경사 대체값으로 계산 |
| `OLLAMA_MODEL` (선택) | 로컬 [Ollama](https://ollama.com) 설치 | AI 배치 설계·종합 평가보고서(`/ollama/` 프록시) | 해당 기능만 비활성 |

동작 구조: 브라우저는 외부 API를 직접 부르지 않습니다. `server.cts`(기본 `127.0.0.1:8917`)가
`.env`를 읽어 브라우저용 키만 `/config.js`(`globalThis.__GP_CONFIG__`)로 내려주고,
타일·지형 요청은 같은 서버의 프록시 경로로 받아 디스크 캐시(`data/tile-cache/`,
`data/vworld-cache/`)에 쌓습니다. 그래서 **반드시 서버를 띄워서** 접속해야 합니다.

```bash
# 클론 직후 (Node.js 24 기준으로 검증 · Windows cmd 는 cp 대신 copy)
npm install
cp .env.example .env        # 위 표의 키 입력
npm start                   # 빌드 + 서버 → http://localhost:8917
```

연결 확인: `http://localhost:8917/api/health` 의 `checks`에서 `vworld`·`maptiler`가
`true`인지(= 키가 `.env`에 들어갔는지) 보거나, 화면 상단 API 상태 뱃지를 봅니다. 한 번 받은 타일은 캐시되므로
`GP_OFFLINE_TILES=1`로 두면 인터넷 없이 캐시만으로 띄울 수 있습니다(`npm run seed:offline`으로 미리 채움).

참고:
- `npm start`/`npm run build`는 그대로 동작합니다. Scaffolda·KAIROS 번들은 저장소에 포함돼 있어,
  저장소 밖 Scaffolda 원본(`../../Scaffolda-public` 또는 `SCAFFOLDA_DIR`)이 없으면 커밋된 번들을 씁니다.
- GitHub Pages 같은 정적 호스팅으로는 띄울 수 없습니다 — 키 주입·CORS 프록시를 서버가 맡기 때문이며,
  키를 프런트 코드에 박으면 공개 저장소에서 그대로 노출됩니다.
- VWorld 데이터 API가 `INCORRECT_KEY`를 돌려주면 키 오류가 아니라 호출 한도 초과입니다(아래 「외부 실데이터」).
- 전차·항공기·포병 등 무기체계 모델과 폭발 이펙트(VISTA `client/public/3d-bundles`, 322MB)는
  `js/vendor/3d-bundles/`에 포함돼 있어 따로 받을 것이 없습니다. VISTA 원본 폴더를 직접 쓰려면
  서버를 띄울 때 환경변수 `VISTA_BUNDLES_DIR`로 경로를 바꿉니다.
- 용량 문제로 런타임에 쓰지 않는 원본(`assets/models/*_raw.glb`, `assets/models/usd/`)과 Blender 지형 빌드 캐시
  (`data/blender_cache/`의 타일·중간 산출물 — 스크립트만 포함)는 저장소에서 뺐습니다. 완성된 지형 GLB는 `assets/models/`에 있습니다.

### 개발

Vite 개발 서버는 프런트만 서빙하고, `/api`·`/config.js`·`/assets`·`/js`·`/data` 요청은
전부 8917 백엔드로 프록시한다(`vite.config.mts`). **백엔드를 먼저/함께 띄우지 않으면
`ECONNREFUSED` 프록시 에러가 난다.**

```bash
npm run dev:all     # 백엔드(8917) + Vite(5173) 한 번에 기동, 터미널 하나로 충분
```

`Ctrl+C` 한 번으로 둘 다 종료된다(`scripts/dev.mts`가 한쪽이 죽으면 나머지도 같이 끈다).
로그를 프로세스별로 분리해서 보고 싶으면 터미널 두 개로 나눠 실행해도 된다:

```bash
# 터미널 1
npm run dev:server  # → http://localhost:8917  (빌드 없이 즉시 기동)
# 터미널 2
npm run dev         # → http://localhost:5173  (브라우저는 이 주소로 접속)
```

### 운영/배포 (단일 프로세스)

```bash
npm start        # production build(web+scaffolda+kairos) + API/static 서버 → http://localhost:8917
```

`npm start`는 빌드까지 매번 새로 하므로 개발 중 반복 실행에는 느리다 — 코드만 고치며
반복할 때는 위 개발 모드(`dev:server` + `dev`)를 쓰고, 배포·최종 확인 때만 `npm start`를 쓴다.
인터넷 필요(VWorld 위성영상·MapTiler 지형).

프런트 진입점은 `src/main.tsx`이며 React/TSX가 안정적인 애플리케이션 셸을
렌더링한다. Cesium 프레임 루프와 VISTA/KAIROS 컨트롤러는 `src/App.tsx`가
`src/runtime/main.ts` 경계 뒤에서 한 번만 로드한다. 패널·상태·API 계약은
TypeScript로 관리하면서도 3D 엔티티를 React 렌더 사이클에 넣지 않는다.
애플리케이션 소스는 `src/runtime/*.ts`와 `src/domain/*.ts`에 있으며,
`js/vendor/`에는 원본 VISTA/KAIROS/Scaffolda TypeScript 어댑터와 생성 번들만 격리해 둔다.

모든 애플리케이션·서버·빌드·시험 프로그램은 `.ts`, `.tsx`, `.mts`, `.cts`로
관리한다. `tsx`가 Node 측 TypeScript 실행을 담당하고, 브라우저 배포 시에만
esbuild/Vite가 `js/vendor/*.bundle.js`와 `dist/assets/*.js` 생성물을 만든다.
Blender 내부에서 실행되는 에셋 제작 자동화(`assets/blender`, `data/blender_cache`)는
Blender Python API가 요구하므로 Python으로 유지한다.

### Blender 빌드 파이프라인 MCP 서버

`assets/blender/build_*.py`를 화이트리스트로 안전하게 실행하고 QA 렌더(`render_*.png`)를
이미지로 돌려주는 로컬 MCP 서버가 `scripts/mcp-blender-pipeline.mts`에 있다. 인앱 Ollama 챗이나
`server.cts` 라우팅과는 무관한 순수 개발자 도구다.

```
npm run mcp:blender          # stdio MCP 서버 실행
npm run smoke:mcp-blender    # 툴 4종이 뜨는지만 확인(실제 Blender 실행 없음)
```

Blender 실행 파일은 기본적으로 `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`를
찾는다 — PATH에 없다면 `.env`의 `BLENDER_EXE`로 경로를 지정한다. Claude Code 등 MCP 클라이언트에
등록하려면 `tsx scripts/mcp-blender-pipeline.mts`를 저장소 루트에서 실행하는 `mcpServers` 항목을
추가하면 된다. 노출 툴: `list_builds`(화이트리스트+최신성), `run_build`(스크립트 1개 실행 후
변경된 GLB/렌더 파일 보고), `list_qa_renders`, `get_qa_render`(렌더 PNG를 이미지로 반환 — 창문
리세스·텍스처 이음매 같은 걸 에이전트가 직접 보고 검증할 수 있다).

### PolyHaven 실사 PBR 텍스처 (옵트인)

`npm run fetch:polyhaven`을 실행하면 PolyHaven(CC0, 키 불필요)에서 콘크리트·골강판·도장
플라스터 PBR 세트를 `assets/textures/pbr/<slug>/{color,orm,normal}.jpg`로 받아온다.
`build_facilities3.py`의 `tex_concrete()`/`tex_roofmetal()`은 이 파일이 있으면 그 실사 텍스처를
통째로 쓰고, `tex_panel()`은 건물별 틴트가 있어 통째로 못 쓰는 대신 사진의 휘도(얼룩·줄눈
디테일)만 취해 절차적 seam/height 조합식에 얹는다. 셋 다 파일이 없으면 기존 numpy 절차적
생성으로 그대로 폴백한다 — 안 받으면 기존 동작과 100% 동일하다. 반대로 `build_damage.py`의
파단면 잔해는 실사 텍스처를 일부러 안 쓴다 — 조각난 지오메트리라 스마트 UV 아일랜드마다 사진의
결이 다른 각도로 잘려 줄무늬로 보인다(등방성 절차적 노이즈만 안전).

### 지형 꾸미기 소품 (`build_scatter.py`)

HESCO 방벽 1유닛·모래주머니 벽 3m 구간·윤형(콘서티나) 철조망 3m 구간 등 배치 탭에서 GP
부지를 꾸미는 실척물은 `assets/blender/build_scatter.py`(MCP 화이트리스트의 `scatter` 키)에서
관리한다. 위장망(`fac_camonet.glb`)·흙 방호둑(`fac_revet.glb`)·장애물(`fac_obst_*.glb`)은
`build_facilities2.py`가 이미 소유하므로 여기서 다시 만들지 않는다. 재질은 UV 없이 Object
좌표 노이즈로 얼룩·러프니스를 얹는 `mk_weathered_mat()`(감시탑과 같은 구현)을 쓴다 — 가늘고
긴 부재든 작은 소품이든 형태와 무관하게 안전하고, AgX+Cycles 디노이즈 조합에서 눈대중
진폭으로는 거의 안 보이므로 렌더로 직접 맞춘 값을 그대로 재사용한다. 철조망은 코일 축을
진행방향으로 눕힌 토러스를 늘어놓아 근사(실제 나선은 아니지만 배치 탭 스케일에서 실루엣이
같다).

**키는 `.env` 한 곳에만 둔다.** `server.cts` 가 읽어서 브라우저용 키만 `/config.js` 로 내려보내고,
서버에서만 쓰는 키(ITS)는 프록시가 주입해 프런트에 노출하지 않는다. 코드에는 키가 없다.

```
MAPTILER_API_KEY=...
VWORLD_API_KEY=...
VWORLD_DOMAIN=localhost
ITS_API_KEY=...
```

처음 실행할 때는 저장소에 포함된 `.env.example`을 복사해 `.env`를 만들고,
실제 키만 입력한다. `.env`·계획 파일·로그는 커밋하지 않는다.

### 안전 실행 경계와 시나리오 계약

독립 서버는 인증이 없는 로컬 실행 경계이므로 기본적으로 `127.0.0.1:8917`에만
바인딩한다. 정적 파일은 `dist/`, `assets/`, `js/vendor/`의 허용된 런타임 자산만
제공하며 저장소 루트의 `.env`, `.git`, 서버 소스, 계획 저장소는 HTTP로 노출하지 않는다.
외부 사용이 필요하면 인증 역방향 프록시와 TLS를 먼저 배치하고 `HOST`를 명시한다.

`GET /api/health`는 서버 생존 여부뿐 아니라 계획 저장소, Ollama 모델, VWorld,
MapTiler, VISTA 3D 자산의 준비 상태를 `checks`로 반환한다. 화면 상단의 API 상태
뱃지는 이 결과를 사용해 전체 연결과 부분 연결을 구분한다.

실제 프로젝트 입력을 받을 경계는 `src/domain/missionContract.ts`의
`gp-digital-twin.mission` v1 계약이다. 사이트·임무 요구사항·위협 방향·환경·자료 출처와
provenance를 정규화하고 fingerprint를 만들며, 계획 스냅샷에도 선택적으로 포함된다.
현재 화면 계산은 여전히 기본 합성 GP-107 시나리오를 사용하므로, 실좌표·실제 제원으로
전환하려면 해당 계약을 UI 입력·검증·계산 엔진에 연결해야 한다.

TSX 웹 셸과 기존 벤더 번들을 함께 빌드한다:

```bash
npm install
npm run build:web          # src/**/*.ts(x) → dist/
npm run build:scaffolda   # Scaffolda-public/src/.../lib/**  →  js/vendor/scaffolda/scaffolda.bundle.js
npm run build              # 전체 빌드
```

검증 명령:

```bash
npm test                 # 순수 도메인 계약 테스트
npm run check            # 서버 문법 + 도메인 테스트
```

### 계획 저장 경계

Persistence reliability update:
- Mission-only edits now participate in autosave and undo/redo change detection.
- Serialized plans and history are detached JSON copies, protecting earlier revisions from nested live-object mutations.
- Applying a saved plan cancels an older pending autosave; page exit flushes pending changes synchronously to local storage.
- Failed local writes retain the pending snapshot for retry and display a storage warning.
- These changes retain the v2 file format. They do not yet unify separately stored sensor objects, custom routes, or live environment settings into a complete project revision. Browser exit does not guarantee remote delivery.
- Regression coverage: `test/sitePlanPersistence.test.ts`.

계획 스냅샷은 `gp-digital-twin.plan` v2 계약(`src/domain/planContract.ts`)으로
정규화되며 알고리즘 버전·지형 소스·생성 시각 provenance를 함께 보존한다.
브라우저 `localStorage`는 오프라인 폴백이고, 서버가 실행 중이면 다음 API와
동기화된다.

```
GET    /api/health
GET    /api/plans/:planId
PUT    /api/plans/:planId       (ETag / If-Match 낙관적 동시성)
DELETE /api/plans/:planId
```

현재 독립 실행 배포의 저장 어댑터는 `data/plans/` 파일이다. API 계약을
고정해 두었으므로 인증·PostgreSQL/PostGIS 저장소로 바꿔도 Cesium 화면과
최적화 엔진의 계약은 유지된다. 파일 저장 데이터는 런타임 산출물이어서 Git에
커밋하지 않는다. 현재 API에는 인증이 없으므로 localhost 독립 실행 범위에서만
사용하고, 외부 공개 전에는 기존 인증/RBAC 게이트 뒤에 배치해야 한다.

VISTA 3D 에셋(322MB, GLB 56개)은 `js/vendor/3d-bundles/`에 벤더링했고 `server.cts`가
`/js/vendor/3d-bundles/` 로 정적 마운트한다. 경로는 `VISTA_BUNDLES_DIR` 로 덮어쓸 수 있다.
딥링크: `?demo=fpv`(1인칭) · `?demo=infil`(침투 리허설) · `?demo=ipb`(NAI/DP/TAI 자동 도출)

## 10개 탭

| 탭 | 내용 |
|---|---|
| **트윈** | **광학 1인칭 관측**: 관측점을 고르면 그 **자산의 눈**으로 바뀐다 — TOD 는 열상(백열/흑열·NUC), EO 는 야간 자동 야시, 레이더는 PPI 스코프, 조준경은 탄도 사다리, 드론은 비행 계기. 공통으로 방위 테이프·부앙 사다리·레이저 측거·실효거리 막대·표적 브래킷. 배율은 단으로 전환. 가시영역 계산·드레이프, 시네마틱 투어, 주야간·안개 환경 |
| **지도** | **실전 GIS 계층**: 베이스맵 4종(VWorld 위성/야간 · ArcGIS World Imagery · OpenTopoMap), 오버레이(VWorld 지명 · ArcGIS Hillshade 음영기복 투명도 조절 · VWorld 3D 건물 LOD4), 지형 소스 전환(MapTiler↔ArcGIS Terrain3D — 전환 시 축선 경사·가시영역 자동 재분석), **지형분석 머티리얼**(기동성 경사램프·사면향·표고램프+등고선 합성, Cesium Sandcastle 이식), **태양·그림자 시뮬레이션**(날짜/시각 KST 슬라이더 + 지형 그림자 — 관측 음영시간 분석), 날씨 셰이더(비·눈), **측정**(표면거리 · ArcGIS식 고도 프로파일 차트+가시선 차폐 표시), **GeoJSON 내보내기**(QGIS/ArcGIS 호환) |
| **훈련근거** | **KCTC·Warrior Platform 훈련근거 목업**: 합성 반복훈련 데이터 수신·익명화 상태, JSON 계약 가져오기/내보내기, 50m 집계 히트맵·훈련 회차 슬라이더, 훈련손실·집결·대응/후송 지연·통신 단절 레이어, 반복 취약구역 근거 카드, 시설 소요와 후보지 도출, 기존 배치 엔진으로 전달 |
| **배치** | **건축물 드래그앤드랍**: Scaffolda 시설 카탈로그(4평/인)를 지형에 끌어다 놓으면 그 자리를 2m 격자로 샘플링해 절토·성토·옹벽(에지 프로브)·기초·건물비·난이도를 즉시 산출. 클릭-드래그 이동 시 재산출, 능선에 놓으면 "부지 재선정 권고" |
| **감시** | **감시자산 직접 배치 + 실효 가시성**: 8종 팔레트를 지도에 끌어다 놓거나 클릭으로 세우고 마스트고·지향을 그 자리에서 조절(지도에서 끌어 이동 시 지반고 재샘플). 지도의 부채꼴은 **지금 이 날씨에서 보는 범위**이고 뒤의 점선이 청천 제원 — 눈이 오면 줄어드는 게 눈으로 보인다. 지형 LOS × 실효 유효거리로 합동 탐지확률 커버리지 드레이프, 사각 방위, 초소별 한계기여, 축선 노출률. **6종 날씨 × 강도 3단 스윕 표**로 「눈이 오면 얼마나 안 보이나」를 한 장에 (레이더 > 열상 > 가시 순으로 버틴다) |
| **침투** | **도보/구보/차량 3D 리허설**: 축선별 경사 P95로 기동 가능성 자동 판정(차량 24° — 서측 저지대만 진입 가능). 병사/T-80 전차 모델이 지형을 따라 이동, VISTA 궤도 추적캠(드래그 회전·휠 줌), 타워 관측권 진입 이벤트 로그 |
| **결심** | **KAIROS 참모 결심 14종**: 원본 `sudoDecisionEngine`(3,013줄)을 현재 GP 상황(지형분석·침투·IPB·배치·ITS 도로)으로 구동 — 드론 표적식별 / 표적성질 / 표적규모 / 전투서열 / 부수피해 / AI 취약점 / 탄종·발수 / 사격부대 / 사태분석도(COA) / 감시자산 재배치 / 타격방법 / 통합화력운용도표 / ARTAS 대포병탐지 R/D / 타격결과 평가(BDA). 각 시나리오가 서술·지표·판단단계·근거 원표를 내며 전부 원본 출력 |
| **화력** | **정밀타격 효과 시뮬레이션(실지도)**: 지도를 클릭해 탄착점을 찍고 탄종 8종(순폭약량 3~200kg)·신관 3종을 고르면, 순폭약량에서 입방근 법칙 + Brode 과압식으로 역산한 피해 반경(탄공·완파·중파·경파·유리·파편)이 지형에 클램프되어 그려지고, 그 안의 배치 시설·감시자산·감시탑이 등급을 받아 실제로 무너진다. 종말유도 진입부터 화구·충격파·연기 기둥·탄공까지 되감기 가능한 시간축. 방호 시설은 반경이 32% 줄고 관통탄+지연신관에는 그 이점이 사라진다. 1~12발 연속사격을 걸면 Palmgren–Miner 누적손상으로 「이 시설은 몇 발까지 버티는가」를 CEP 산포 몬테카를로(중앙값/90%)로 답한다. 폭발 표현은 VISTA 스프라이트 시트 이식. 최근접 아군까지의 이격은 아래 CDE 원표로 검증 ([설명](docs/strike.md)). **KAIROS 교리 + 위협권 + 보고서**: 타격 6단계 절차, 탄약·발수 판단표(사거리대×지형×사격단위), 부수피해 CDE 27행, 사격부대 5개 제원, 타격자산 원표 — 전부 원본 데이터. 실무기체계 27종 중 GP 스케일 10종 위협권(사거리 원 + 탐지호 부채꼴) 표출과 드론 진출 한계 판정. 현재 상태를 War ground 원본 마크다운 렌더러로 작전 보고서 생성·내려받기 |
| **작전분석** | **KAIROS IPB**: 축선을 커버리지 0.34·공백 0.26·화력연계 0.18·기동로 0.22 가중치로 채점 → 최우선 축선에 **NAI 24% / DP 56% / TAI 82%** 지점 자동 배치(교전 링 300/360/480m), 종말 3정점 = 감시 취약구간, 드로우온 애니메이션, 수동 배치(⬠★■) |

## 종합 평가보고서 (LLM)

화력 탭 → **종합 분석 + 평가 ▶** 한 번으로 아래를 순서대로 산출하고, 그 결과를 로컬 LLM이 평가해
지도 위에 브리핑 카드로 띄운다 (VISTA 지형 브리핑과 같은 구성).

```
가시영역 광선추적 → 적 이동경로 채점(KAIROS scoreRouteOption) → NAI/DP/TAI
  → KAIROS 지형정보 분석 → 자산배치 위협권 + 드론 진출한계
  → 화력운용 판단(탄약효과·부수피해 CDE·사격부대) → 구조화 페이로드 → LLM
```

**수치는 전부 엔진이 계산하고 LLM은 해석·연결·권고만 한다.** VISTA 와 같은 계약이다 —
구조화 JSON 페이로드 + 한국어 지시 + 엄격한 응답 스키마(`format`)를
`POST /ollama/api/chat` 로 보내고 응답을 카드로 렌더한다.

프롬프트에 **용어 정의를 명시**한다. `routeAnalysis.routes` 는 적 침투 축선이고
`coveragePercent` 는 아군 감시탑이 관측 가능한 비율이라는 식으로 지표의 아군/적 방향을
못박지 않으면, 모델이 침투 축선을 아군 접근로로 뒤집어 읽는다(실제로 겪었다).

실행 예 (배치 19동 · 축선 4개 · 위협 10종 상태):

> **보완필요** — GP의 전반적인 시설 배치는 안정적이나, 동측 사면(축선 3)의 100% 감시 공백과
> 0% 화력 연계는 치명적인 방어 취약점입니다.
>
> - 최대 위협 축선: 축선 3 — score 17, 커버 12%, 감시공백 100%, 화력연계 0%
> - 상대적 안전: 축선 4 — score 84, 커버 91%, 감시공백 0%, 화력연계 69%
> - 공중 위협: `originInsideThreat: true`, Tor-M2(10km)가 제한 요인
> - 권고(높음): 축선 3 감시 공백 해소 → 화력 연계 보강 → 공중작전 제한

모델은 `/ollama/api/tags` 에서 조회해 고르고, 분석과 병행해 **미리 예열**한다(콜드스타트 은닉).
9GB급 모델은 구조화 출력에 1~3분이 걸려 프록시 타임아웃을 15분으로 둔다.

### 감시공백 자동 보완 — 지적에서 해답까지

평가가 "축선 3 감시공백 100% — 보완필요"라고만 하고 끝나면 쓸모가 없다.
**취약 축선 자동 보완 ▶** 은 그 지적을 입력으로 받아 엔진이 실제 해답을 계산한다
(`src/runtime/gapClosure.ts`):

1. 현 감시탑 가시격자에서 그 축선의 **미관측 지점**을 뽑고
2. GP 후방 반원(250~1,600m)에 부감시소 **후보 15곳**을 생성해 지형고를 샘플하고
3. 후보 × 미관측점 전 조합을 **지구곡률 보정 LOS** 로 일괄 판정하고
   (후보·표적·광선 중간점을 한 번의 `sampleTerrainMostDetailed` 로 묶는다)
4. 신규 확보 관측점(GP 근접부 가중) · 적 위협권 회피 · GP 이격으로 점수화해 최적안을 낸다

실측: 축선 3 (감시공백 100%, 커버 12%) → GP 동측 250m·표고 1,033m 부감시소(고 12m) 권고,
**커버리지 12% → 54%**, 공백 220지점 중 105지점 해소, 적 위협권 밖.

계산 결과는 지도에 부감시소 마스트 + 신규 확보 LOS 선으로 그려지고,
`gapClosureProposal` 로 평가 페이로드에 들어가 **다음 평가가 개선폭을 반영**한다.

## 벤더링한 원본 코드 (`js/vendor/`) — 54,033줄

로직을 옮겨 적지 않고 **원본 파일을 그대로 넣어 호출한다.**

| 경로 | 원본 | 규모 | 형태 |
|---|---|---|---|
| `js/vendor/vista/` | `VISTA_sudo/client/public/terrain-3d/` + `VISTA/client/public/tactical-sim/` | 8파일 23,990줄 | **무수정 사본** |
| `js/vendor/kairos/src/` | `VISTA_sudo/client/src/gui/sudo/` + `src/utils/` | 48파일 19,516줄 | **무수정 사본** (경로 별칭만 상대경로화) |
| `js/vendor/kairos/*.ts` | `terrain-3d/terrainIntel.ts` · `viewer.ts` · `gui/sudo/*.tsx` | 3파일 3,506줄 | 사본 + 함수 단위 verbatim 추출 |
| `js/vendor/warground/` | `War ground/frontend/src/utils/` | 41파일 7,021줄 | **무수정 사본** (외부 import 0개) |
| `js/vendor/scaffolda/scaffolda.bundle.js` | `Scaffolda-public/src/features/scaffolda/lib/**` | 원본 22모듈 · 230KB | esbuild 번들 |
| `js/vendor/kairos/kairos.bundle.js` | 위 `kairos/src/` | 원본 48모듈 · 593KB · 심볼 364개 | esbuild 번들 |

벤더링·번들은 스크립트로 재현한다 — 원본이 갱신되면 다시 돌리면 된다.

```bash
npm install
npm run vendor:kairos     # KAIROS 소스 트리 미러링 (import 그래프 전이 폐쇄)
npm run build             # Scaffolda + KAIROS 번들
```

### 원본이 담당하는 것 (재구현 없음)

**VISTA** — `createTerrainPlacementRuntime`: 유닛 모델 해석·실측 스케일·축 보정·헤딩 오프셋·
위치 스무딩(420~1600ms)·지면 그림자·선택 링·기동 먼지·차체/포신 방향선·경로 폴리라인.
3D 에셋 57종(624MB)은 복사하지 않고 `server.cts`가 `/js/vendor/3d-bundles/`로 정적 마운트한다.

**KAIROS 지형정보** — 고도/경사 격자 → 가시율·노출·은폐 점수, 차폐 히트맵, 포병 관측점,
LOS 사선, 도하 병목, `classifyTerrain`, VWorld 보조 레이어 조회.

**KAIROS 화력 교리** (화력 탭 · 교전 카드) — 전부 원본 데이터 표다.

| 데이터 | 원본 모듈 | 규모 |
|---|---|---|
| 탄약·발수 판단표 (사거리대 × 지형 × 사격단위 → 요망효과 10/20/30%) | `sudoMunitionEffectIntel` | 16행 |
| 부수피해평가 CDE (사거리별 탄종 안전거리) | `sudoCollateralCdeTable` | 27행 |
| 사격부대 제원 (사거리·생존성·탄약·CSR·민간피해) | `sudoFiringUnitIntel` | 5개 부대 |
| 타격 절차 (SEAD → CAS → TOT → BDA → 재타격) | `sudoStrikeSequence` | 6단계 |
| 사격계획·타격수단·타격자산 | `sudoFirePlanIntel` | 5·3·4행 |
| 실무기체계 사거리·탐지호 (공개출처 URL 포함) | `utils/threatCoverage` | 27종 |
| 결심 상수 (부수피해 요구 안전여유 300m 등) | `sudoDecisionEngine` | — |

**KAIROS 결심** — `scoreRouteOption`(가중치 0.34/0.26/0.18/0.22), `destinationPoint`,
`buildCirclePolygon`(96각), `clipLineCoordinates`.

**Scaffolda** — `generatePlacement`(2,971줄: 지형 난이도+친화도+산포 최소화, 자동 도로 Delaunay
가지치기·장애물 우회, 규칙 6종 검증), `computeEarthwork`(절·성토 균형 pad·2m 격자 체적적분·
옹벽/비탈면 변분류), `computeProjectCost`, `buildProgram`, `buildDifficultyGrid`,
시설 카탈로그 19종, 질문뱅크, Ollama 설계 대화.

**War ground** — `renderReportMarkdown`(작전 보고서 렌더), `missionProfile`(임무모드·대상·
비밀등급·시계 메타), `workflowStages`, `operationalAssurance`, `physicsReference`(ENU↔WGS84),
`fieldSimulation`.

### 외부 실데이터

| 소스 | 용도 | 상태 |
|---|---|---|
| MapTiler `terrain-quantized-mesh-v2` | Cesium 지형 | 정상 |
| VWorld 위성·야간 타일 | 베이스맵 (`/vworld/` 프록시) | 정상 |
| **국가교통정보센터(ITS)** `trafficInfo` | 기동로 점수(roadScore) 실측 — KAIROS `scoreRouteOption` 기동로 항 | **정상** (GP 인근 643링크·43개 도로) |
| **VWorld 데이터 API** (`req/data`) | KAIROS 지형정보 보조 벡터레이어 | **키 정상 · 호출 한도 상태** (아래) |

**VWorld 데이터 API 주의 — `INCORRECT_KEY` 는 키 오류가 아니다.**
VWorld 는 호출 한도를 넘기면 `INCORRECT_KEY`(인증키 정보가 올바르지 않습니다) 로 응답한다.
같은 키가 지오코더에서는 정상 동작하고, 한도 밖에서는 데이터 API도 정상 응답한다.
GP AOI(BOX 128.06,38.27,128.19,38.39)에서 실제로 확인한 커버리지:

| 레이어 | dataId | 건수 |
|---|---|---:|
| 하천망 | `LT_C_WKMSTRM` | 1 |
| **도로구간(교통DB)** | `LT_L_MOCTLINK` | **165** |
| 용도지역 | `LT_C_UO301` | 5 |
| 산림입지도 | `LT_C_FSDIFRSTS` | 36 |
| 토양 배수등급 | `LT_C_ASITSOILDRA` | 2 |
| 도로중심선(수치지형도) | `LT_L_N3A0020000` | 0 (접경 산악부 미수록) |
| 급경사지 재해예방 | `LT_C_UP401` | 0 |

이에 대응해 넣은 것:
- `server.cts` 가 데이터/WFS 응답을 버퍼링해 한도 신호를 감지하면 **지수 백오프 재시도**,
  성공 응답은 `data/vworld-cache/` 에 **디스크 캐시**(같은 레이어를 두 번 부르지 않는다).
- KAIROS 원본은 VWorld 오류가 `response` 아래 중첩돼 있어 못 잡고 조용히 빈 레이어로 넘긴다.
  어댑터(`src/runtime/terrainIntel.ts probeVworldData`)가 한 번만 찔러 **"호출 한도" 와 "자료 없음" 을 구분**해
  UI에 표시한다. 원본 코드는 그대로 둔다.
- KAIROS 기본 도로 레이어가 GP에 커버리지가 없으므로, 어댑터가 **교통DB 도로구간으로 대체**해
  원본 `layerResults` 계약에 맞춘 항목을 넣어준다(`buildTerrainIntelAnalysis` 가 그대로 소비).

### GP 고유로 남은 것

- 침투 축선 지형 클램프·경사 P95 기동판정, 가시권 세그먼트 오버레이, 궤도 추적캠
- 방호등급(hardened) 할증 — 원본 `EarthworkConfig.buildingCostPerPyeong`를 배수 조정해 주입
- NAI/DP/TAI 배치 규칙 — 원본이 React 컴포넌트(`SudoScenarioVisual.tsx` 32,065줄)에 박혀 있어
  함수 단위 추출이 불가, 규칙만 이식
- 위협권 배치 방위 — 원본에 진영 필드가 없어 GP 데모 상황(적 북측)으로 배치. 사거리·탐지호는 원본 값

## 이식 코드 출처 (초기 버전 — 현재는 위 벤더링으로 대체)

**VISTA** (`Desktop/VISTA/client/public/terrain-3d/`)
- `installTerrainModelAxisResolver` — Model.fromGltfAsync 축 보정 몽키패치 (placementRuntimeModels.ts)
- y-forward 모델 −90° 헤딩 오프셋 (soldier·T-80U 공통), RELATIVE_TO_GROUND + 2.4m 리프트
- tactical-sim 궤도 추적캠: lookAt+HeadingPitchRange, yaw ×0.32 / pitch ×0.18 [−68,−6] / 휠 ×0.06
- VWorld WMTS 연동 패턴, MapTiler quantized-mesh 지형, 3D 모델 6종(glb)

**KAIROS/SUDO** (`D:/VISTA_sudo/client/src/gui/sudo/` + `public/terrain-3d/`)
- `scoreRouteOption` 가중치(0.34/0.26/0.18/0.22)·정렬 규칙 (sudoDecisionEngine.ts)
- NAI 24%/DP 56%/TAI 82% 경로상 배치, 종말 3정점=감시 취약구간 (SudoScenarioVisual.tsx)
- `destinationPoint`·`buildCirclePolygon`(96각)·`clipLineCoordinates`+`easeOutCubic` 드로우온 (SudoJangdoTacticalMap.tsx)
- 감시⬠/결심★/타격■ 도식, TAI 480m·DP 360m 링, 톤 팔레트(#64dfff/#ffc857/#ff6969)
- classifyTerrain 경사 임계(급경사 15°) — 기동로 분류 (terrainIntel.ts)

**Scaffolda** (`orca/Scaffolda-public/src/features/scaffolda/lib/`)
- `createRecommendedZoneDimensions`(4평/인, 종횡비 1.5) — siteZoneProperties.ts 원본
- `computeEarthwork`: 절·성토 균형 pad, 2m 격자 체적적분, `classifyEdges` 에지 프로브
  옹벽 판정(경사 0.3·단차 0.3m), 난이도 밴딩(1인당 부지비용 3M/4.5M/7M) — earthworkModel.ts 원본
- 단가 전체(절토 8천/성토 1.2만/옹벽 25만/건물 200만/평/기초 15만+층당 22.5만/부대비 10%)
- `formatKrwShort`, 시설 카탈로그 GP 서브셋(GUARD_POST 10인·3층 포함) + 방호 할증 ×4.2(합성)

## 런타임 모듈 경계

```
src/main.tsx       React 진입점 + TypeScript 빌드
src/App.tsx        React 안정 셸 → TypeScript Cesium 런타임 경계
server.cts         정적 서빙 + VWorld 프록시 + plan API (TypeScript)
src/runtime/      Cesium/도메인 오케스트레이터와 기능 모듈 (TypeScript)
src/domain/       브라우저·서버가 공유하는 계획 계약
js/vendor/        원본 VISTA/KAIROS/Scaffolda 번들 (호환성 경계)
assets/            soldier·enemy_tank(T-80U)·apc·drone·ugv·tower.glb (VISTA)
```

## GIS 계층 이식 출처 (v5)

- **MGRS 군사좌표**: proj4js/mgrs(MIT) LLtoUTM·getLetter100kID 포팅 — 상태바 상시 표출,
  GeoJSON 피처 속성에 포함 (서울시청 52S CG 21424 59641 검증)
- **지형분석 머티리얼**: Cesium Sandcastle "Globe Materials" — ElevationRamp/SlopeRamp/AspectRamp
  + ElevationContour 합성 fabric. 경사 램프는 이동수단 한계(24°/30°/38°) 기동성 색상으로 도메인화
- **날씨**: 커뮤니티 표준 비/눈 PostProcessStage GLSL (cesium weather OSS 계열)
- **ArcGIS 서비스**: World Imagery · World Hillshade · World Elevation Terrain3D (키 불요 공개 서비스)
- **레이어 카탈로그 패턴**: Terria식 베이스맵/오버레이/투명도 관리

## v6 — 시점 모드 · 자산 가시거리 계층 · 교전 제원

**시점 모드 (전장 몰입)**
- **도보 정찰**: WASD+Shift 질주, 드래그 시선, 지형 밀착(getHeight→sampleHeight→캐시, VISTA 패턴).
  E키 상호작용: 타워 28m 이내 → 승탑(1인칭 전환), 건물 20m 이내 → **내부 진입**
- **건물 내부**: 배치한 건물 안에서 층별(R/Q) 외부 조망 — 총안구 시야 확인
- **드론 정찰** (우크라이나전 전훈): 책임구역 상공 자동 선회 + 드래그 짐벌 + 휠 고도(120–900m AGL)

**감시·화기 자산 가시거리 계층** — "가시거리는 하나가 아니다"
- 화기 유효사거리 링: K2 소총 460 / K3 800 / K6 1,800 / K4 유탄 2,200m
- 카메라 **DRI 3중 링** (FLIR 스펙 규약: Detection/Recognition/Identification): EO 3.5/1.2/0.6km, IR 2.8/0.95/0.48km
- 센서: 레이더 웨지 5km/120°, 음향 900m / **C-UAS 재머 반구 돔** 800m
- 자산별 실효 커버리지 % = 사거리·FOV ∩ 지형 가시영역 (책임구역 면적가중)

**교전 제원 카드 (FIRE MISSION)** — 침투 리허설 중 적 유닛 클릭
- 표적 MGRS · 사거리 · **방위각/고저각 6400분법(밀)** · 타워 관측 여부 · 사거리 내 가용화기 목록
- 검증 예: 1,984m · 5946밀 · −191밀 · 가용 K4 (소총·기관총 사거리 밖 → 화력지원 요청 표시)

## v8 — 현장점검 도구 · Scaffolda 상세 인스펙터 · 자동배치

**도보 정찰 현장점검 도구** (걸어다니며 전장을 직접 계산)
- **B 쌍안경**: FOV 12°(휠로 4~30° 배율) + 크로스헤어 표적 판독 — 거리·방위 밀(6400분법)·MGRS·표고를
  사격지휘 형식으로 실시간 표시
- **T 스팟 가시영역**: 현 위치 눈높이 1.7m에서 반경 2km 즉석 광선추적 → "여기 서면 뭐가 보이나" +
  지점 가시율 % (관측소 후보지 도보 답사)
- **F 피탐 체크**: 현 위치→타워 LOS 역산 — "내가 여기 있으면 GP에서 보이는가" (은폐 침투로 검증,
  차폐 능선 거리·표고 표시, 6초 시각화)
- **순찰 트랙**: 이동 경로 자동 브레드크럼 + 누적거리 HUD (C 초기화)

**Scaffolda 상세 인스펙터** (건물 선택 → 설정 즉시 재산출)
- 수용 인원 슬라이더(4평/인 원단위 → 풋프린트 자동 재계산), 층수 ±(기초단가 +22.5만/㎡·층 트레이드오프),
  방호 기준 토글(×4.2 — 30인 생활동 기준 22→73억 차이 실측), 배치 방위 15° 스냅, 복제(설정 승계),
  "이 건물로 걸어가기"(도보 모드 스폰)
- **총사업비 롤업** (projectCost.ts 원본): 공사비 + 설계비 76,000₩/㎡ + 인허가 수수료 연면적 티어
- **표준 GP 세트 자동배치**: 타워 후방 링 60후보 지형 샘플 → 국소경사 최소 지점 greedy 선정(이격 보장)
  → 지휘·생활·인프라·창고·위생 5동 자동 배치 (Scaffolda placementEngine 경사 스코어링 방식)

## v9 — 로컬 Ollama AI 배치 설계 (Scaffolda aiPlacement 원본 이식)

**원칙** (시스템 프롬프트 원문): *"좌표나 건물 위치는 절대 만들지 마세요. 그것은 시스템이 계산합니다."*
— LLM은 요구사항 추출·질문 선택만, 기하는 결정론 엔진.

**파이프라인** (배치 탭 AI 챗):
1. **Ollama 클라이언트** (ollamaClient.ts 원본): `/ollama/api/chat`(server.cts 프록시), stream:false,
   think:false, **format=JSON스키마 구속**(질문 id enum 포함), temperature 0.4.
   오류코드·한국어 안내문 원본. 모델 체인 gemma4:e4b→gemma3:1b(미검증 45s 컷 폴백 — 원본 무타임아웃에서 이탈).
2. **턴 정규화** (resolveDesignTurn 원본): 비차단 — 미상 enum 값은 버리고 흐름 유지. 상주>총원 보정.
3. **질문 뱅크** (questionBank.ts 원본 7종): LLM은 askQuestionIds 최대 2개만 지명, 선택지·효과(0.5|1|1.5)는
   코드 고정. 칩 답변→결정론 적용→즉시 재배치. 의문문 턴엔 배치 보류(isInterrogativeText 원본 정규식).
4. **buildProgram** (buildingProgram.ts 원본): 지휘 30%(60/40)·복지 15%·위생 20%·위성복지 10%·
   생활그룹 150명·의무/정비 ≤300 분할·출입 clamp[10,80]·훈련 보병 1.5배… 전 상수 원본.
   실측: 보병 40명 → 17유닛 프로그램.
5. **배치 엔진** (placementEngine.ts 코어): scoreCandidate = 지형(경사/0.3×4 + 상대고도×3) +
   cohesion(그룹 40m·범주 80m·의무친화 100m·최근접 60m spread²) + 출입 150m 클리어(1000) +
   anchor 이탈². 48스텝 그리드 스캔·양방향 회전·층수 사다리·2정렬 비교·UNPLACED 10.
   경계초소 둘레 간격 {0.5:1000, 1:700, 1.5:500} 12m 인셋. 실측: 19동 배치 총점 103.3.
6. 배치마다 지형 2m 격자 재샘플로 **실비용 산출** → 총사업비 롤업 자동 갱신.
7. Ollama 미가동 시 **오프라인 규칙 파서** 폴백(데모 지속 — Scaffolda엔 없는 추가).

## v11 — Scaffolda 잔여 핵심 기능 이식 (SitePlan·검증·리플·도면)

- **SitePlan 영속화** (src/runtime/sitePlan.ts): 모든 변이 800ms 디바운스 자동저장(localStorage,
  토공 결과 포함 — 원본 writeStoredEarthwork 방식이라 복원 시 재계산 없음), 새로고침 자동복원,
  저장본 불러오기/계획 초기화 버튼
- **Undo/Redo**: 변이마다 스냅샷 히스토리(상한 30) — Ctrl+Z / Ctrl+Y(또는 Ctrl+Shift+Z)
- **Scaffolda 키맵**: Ctrl+C/V 복사·붙여넣기(설정 승계 +8m), Delete 철거, Esc 선택해제 —
  입력 필드·시점 모드(FPV/도보/드론)에서는 비활성 (isEditableTarget 원본 패턴)
- **배치 검증** (validateSiteZone 이식): 회전 사각형 SAT 겹침 + 보행통로 4m 간격 +
  부지 반경 450m + 타워 기단 16m — 배치는 차단, 이동은 **원위치 복원**(handleUpdateZone 원본 동작)
- **경계초소 700m 커버 리플** (guardRipple.ts 원본 수치): 초소 선택 시 2400ms ease-out
  확산 링 반복 (fill α×0.12 / line α×0.8)
- **A3 배치계획도 내보내기** (src/runtime/blueprint.ts): Scaffolda 라이트 CAD 도면 스타일 PNG —
  자동 축척(1:N 표기)·10m 격자·방위표·축척바·방호시설 사선 해치·시설 라벨(치수·층)·
  IPB 도식(⬠★■)·사업개요표(동수·연면적·공사/설계/인허가/총사업비)·시설 일람·범례·표제란

## v12 — 배치 UX 고도화 (라이브 검증 고스트 · 계획 대시보드 · 도면 모달)

- **라이브 검증 고스트** (src/runtime/placement.ts showGhost): 드래그 중(카탈로그 드롭·건물 이동 모두)
  발자국 폴리곤이 실시간으로 배치 가능 여부를 색으로 표시 — 초록 `✓ 배치 가능 · W×Dm` /
  빨강 `⛔ 차단 사유`(겹침·통로 4m·경계 이탈·타워 기단, 한국어 사유 그대로 라벨).
  펄스 알파(ColorMaterialProperty+CallbackProperty) + 점선 외곽선, 드롭/취소 시 소거
- **부지 경계 시각화** (showBoundary): 드래그 시작 시 450m 앰버 점선 링 + 타워 기단 16m
  적색 링 자동 표출 → 어디까지 배치되는지 즉시 인지
- **계획 대시보드** (#plan-stats): 시설 동수·연면적·총사업비·방호/재선정권고 4타일 —
  Scaffolda sfSummaryGrid 헤어라인 그리드 스타일, 변이마다 갱신
- **비용 히스토그램 목록**: 배치 목록 각 행 배경에 최고비용 대비 비율 바(`--bar`) +
  난이도 점(녹/황/적) + 인원·층 서브라인 — 어느 시설이 예산을 먹는지 한눈에
- **Undo/Redo 툴바**: 히스토리 개수 배지 + 스택 비면 비활성(onHistoryChange 훅),
  자동저장 시각 칩(저장 시 녹색 펄스 애니메이션)
- **A3 도면 미리보기 모달** (#bp-modal): 다운로드 전 화면에서 도면 확인 —
  renderBlueprint/downloadBlueprint 분리, 축척·시설수·일자 메타 표시, PNG 다운로드/닫기/배경클릭 닫기

검증(orca eval 실측): 겹침 고스트 `⛔ …보행통로(4m)를 침범해 겹칩니다` #ed5d5d /
유효 위치 #3dd68c, 경계 링 on/off, 스탯 타일 4셀 갱신, 비용 바 100%, undo→0동·redo→1동,
모달 열기(1:1247 축척 캔버스)→닫기, 자동저장 칩 — 콘솔 오류 0.

## v13 — 실무 GIS 콘솔 크롬 (전문화 라운드)

- **지도 도구 툴바** (src/runtime/mapChrome.ts, 좌상단): 홈 뷰 · 정사 탑다운 전환 · 북 정렬 ·
  MGRS 격자 · 미니맵 · 화면 캡처 PNG · 전체화면 — ArcGIS/Terria 관례 배치
- **나침반 로즈**: 카메라 헤딩 실시간 회전 + 3자리 방위각, 클릭 = 북 정렬
- **동적 축척바**: 지면 픽 기반 m/px 실측 → 표준 눈금(10m~100km) 스냅, 격자 간격 배지 병기
- **MGRS 군사격자 오버레이** (src/runtime/mgrsGrid.ts): 카메라 고도 연동 1km/10km 자동 전환,
  100km(MGRS 100k) 경계 앰버 강조, 군사지도 주기(2자리) 라벨 — UTM 역변환(src/runtime/mgrs.ts UTMtoLL) 신규 포팅
- **상황도 미니맵**: ESRI 위성 z12 3×3 스티치 + 뷰 풋프린트 사각 + GP 마커, 클릭 = 이동
- **군사 일시각 DTG**: 상태바 `DTG 031508KSEP26` 형식 (군 표준 일시각군)
- **명령 팔레트 Ctrl+K** (src/runtime/palette.ts): 탭 이동·시점·측정·지도·계획 5그룹 30여 액션,
  부분일치 필터 + 방향키 탐색 — 상단바 ⌘K 버튼으로도 열림
- **MIL-STD-2525 군대부호** (src/runtime/milsym.ts): NAI/TAI 구역 박스·DP 마름모 통제도식 캔버스 부호,
  적 침투부대는 적성 마름모 프레임 + 병과(보병 X / 차량화 X+타원) + 제대점 — 이모지 도식 대체
- **면적 측정** (src/runtime/measure.ts 'area' 모드): 꼭짓점 클릭 → 우클릭 폐합, ㎡/평/둘레 산출
  (국지 미터 투영 shoelace)
- **계획안 슬롯 — 안(案) 비교** (src/runtime/sitePlan.ts listSlots/saveSlot): 현 배치를 이름 붙여
  다중 저장, 목록에서 동수·총사업비·일시 즉석 비교, 열기 시 직전 상태 히스토리 push
  (Ctrl+Z 복귀), applySnapshotWithHistory 신설

검증(orca eval 실측): 툴바 7버튼·나침반 000°·축척 2km/140px·DTG, MGRS 격자 62엔티티
(라벨 29, GRID 1km 배지)·해제 0, 미니맵 페인트+풋프린트, 팔레트 23행→'격자' 1행,
탑다운 pitch −90°, NAI/DP/TAI 빌보드 3/3 + 자동도출 적부호 "적 침투조 · 도보",
면적 86,880㎡(26,281평)·둘레 1.19km, 슬롯 "1동 · 15.7억" 저장→철거→열기→undo→redo→삭제 — 오류 0.

## v14 — 작전 브리핑 모드 · COA 전술 스케치

- **작전 브리핑** (src/runtime/briefing.ts + src/runtime/main.ts buildBriefingSteps): 트윈 탭 「📋 작전 브리핑」/
  Ctrl+K → 현 계획 라이브 데이터로 참모 브리핑 순서(① 임무·현황 ② 지형 감제 ③ 위협 축선
  ④ NAI/DP/TAI ⑤ 배치 계획 · 자산 · 결론)를 자동 구성 — 스텝마다 카메라 플라이 +
  캡션 카드(수치 kv), ◀▶/점 이동, Space/화살표, 자동 재생(9s), Esc 종료.
  축선 점수·도식·자산은 있으면 반영, 없으면 안내로 대체(가드).
- **COA 전술 스케치** (src/runtime/coaSketch.ts): 작전분석 탭 하단 6도구 —
  적 공격축/아군 반격축(PolylineArrow 화살표) · 방어선 FEBA(실선+전방 수직 틱) ·
  통제선 PL(점선+자동 문자명 PL A…) · 장애물지대(60m 톱니 지그재그, 철조망 관례) ·
  목표 OBJ(180m 원). 꼭짓점 클릭→우클릭 완성(목표는 1클릭), Esc 취소,
  localStorage 자동저장·부트 복원, 목록에서 개별 삭제.

검증(orca eval): COA 도구 6종, 공격축 3점+OBJ 작도 → 엔티티 4·목록 2행·저장 2건·삭제 OK,
브리핑 5스텝 열림→"① 임무·현황"→"② 지형 감제" 진행→끝까지 이동 시 자동 종료 — 오류 0.

## v15 — 작전계획 종합 보고서 · 결심 타임라인

- **작전계획 종합 보고서** (src/runtime/opReport.ts, 배치 탭 「🖨 작전계획 종합 보고서」/Ctrl+K):
  인쇄용 A4 패키지 — 통제 배너(합성 데모)·표지 헤더(DTG)·사업 개요·배치계획도(A3 도면
  PNG 임베드)·시설 일람표·위협 축선 평가표(KAIROS 가중 점수, 1순위 음영)·작전분석
  도식(NAI/DP/TAI + COA)·자산 운용(합동 최적화 요약)·서명란(작성/검토/승인).
  iframe srcdoc 라이트 인쇄 테마(@page A4) — 팝업 차단 무관, 모달에서 인쇄/HTML 저장.
- **결심 타임라인** (computeDecisionTimeline, 신규 분석): KAIROS 비율 규칙
  (NAI 24%/DP 56%/TAI 82%)을 수단별 속도로 시간축 환산 — 축선×수단별
  NAI/DP/TAI 도달 시각(H+분)과 **타격 결심 여유** = (TAI−DP 소요) − 표준 사격절차 6분.
  음수면 "⚠ 부족" (DP 관측 즉시 결심해도 화력운용이 늦음 → 전방 NAI 강화 권고).

검증(전용 탭 원자 eval): 축선 4개 분석 → 보고서 267KB, 테이블 10개, 도면 임베드,
타임라인 H+8/20/29분, 결심 여유 "+3분 충분", 서명란, 닫기 — 오류 0.
참고: orca 브라우저 탭은 타 세션과 공유되어 리로드로 메모리 상태(routeScores)가 날아갈 수
있음 — 다단계 검증은 전용 탭에서 단일 원자 eval로 실행.

## v16 — 탐지·교전 판정 워게임 + AAR

- **판정 엔진** (src/runtime/wargame.ts): 침투 탭 「◈ 전 축선 탐지·교전 판정」— 현재 침투 수단·
  가동 자산·환경으로 축선 전 구간 탐지확률을 **글림프스(6s) 누적** 판정.
  - 단발확률 p(d)=pmax/(1+(d/d50)^k) — 광학 k=3 · 레이더 k=4(R⁻⁴) · 음향 k=2
  - 환경 결합: EO=조도(lux 로그축)×가시거리, IR=가시거리(강수 감쇠, 연무 투과 우위),
    음향=바람·강수 소음, 레이더=기상 무관. 표적 계수 도보 1.0/구보 1.15/차량 1.6(음향 2.4)
  - LOS는 타워 가시격자 게이트(음향은 비LOS), 지향 자산은 aimAz±FOV/2 섹터 판정
- **산출**: 축선별 탐지 50%/90% 시각(H+분), 최초 기여 자산, 판정 공백 구간·비율,
  타격 결심 여유(TAI−t50−절차 6분), 4단 판정(미탐지/지연탐지/시간부족/교전확보) + 권고
- **지도 채색**: 축선을 판정색 세그먼트로(초록=판정권·앰버=희박·빨강=공백) + ⚑ 50/90% 마커
- **AAR 카드**: P누적 곡선(NAI/DP/TAI 위상선 오버레이) + 판정 요약 + 기여 상위 자산 + 권고,
  축선 카드 클릭으로 전환. 위험(늦은 탐지)순 정렬.

검증 실측: 주간·청명·레이더 → 전 축선 H+0분 즉시탐지(기여 radar 67%·tower 27%), 여유 +22분.
**야간·안개(가시 201m)·레이더 OFF** → 탐지 H+2~7분 지연, 판정 공백 44%,
"음향 어레이 보완" 권고 자동 생성 → **레이더 재가동 시 다시 H+0분** —
"악천후에선 레이더가 임무를 가름"이 숫자로 재현됨. 오류 0.


## v17 — 위협 축선 작도기 (사용자 지정 침투 축선)

- **작도기** (src/runtime/routeSketch.ts, 침투 탭 「✏ 새 침투 축선 작도」/Ctrl+K):
  지도에 웨이포인트 클릭(시작점→GP 방향) → 우클릭 완성 · Esc 취소. 클릭마다
  GP까지 잔여거리 표시, 번호 점 + 점선 프리뷰.
- **완전 통합이 핵심**: 완성 즉시 `addRoute()`로 routeCache에 등록 — 고정 4축선과
  같은 계약이라 **침투 리허설(VISTA 유닛)·IPB 채점(scoreRouteOption)·워게임 판정·
  결심 타임라인·작전계획 보고서**가 코드 수정 없이 전부 함께 소비.
  infiltration.ts에 prepareOneRoute/addRoute/removeRoute 신설.
- localStorage 자동저장(gp-digital-twin:customRoutes) + 부트/지형교체 시 재클램프 복원,
  목록에서 삭제 시 전 분석에서 제외. 최대 6개, 색상 팔레트 자동 배정.

검증 실측(빌드 후 dist): 동측 우회 5웨이포인트 작도 → 4.1km · 경사 P95 27.2° · 341점
클램프, 리허설 유닛 5개(c축선 포함), IPB 채점 포함(점수 17), **워게임 최위험 1순위**
(동측 센서 공백 — 타당), 리로드 복원 1건, 삭제 후 5→4축선 — 오류 0.
참고: 이 라운드부터 코드베이스가 Vite+React+TS(src/runtime/*.ts)로 전환됨(병렬 세션 작업).
수정 후 `npm run build:web` 필요. tsc 오류는 server/ 마이그레이션 진행분(타 세션)으로 기존재.


## v18 — 감시 탭: 자산 직접 배치 · 실효 가시성 · 날씨 스윕 · 다중 센서 피드

기존 「자산 가시거리 층위」는 **청천 제원**을 GP 기준으로 전시하는 것이었다. 이 라운드는
두 가지를 더한다 — 자산을 **원하는 자리에 직접 세우는 일**, 그리고 그 배치가 **지금 이
날씨에서 실제로 어디까지 보는지**.

### ① 실효성능 모델 (src/runtime/sensorPerformance.ts, 순수 함수)

카탈로그 사거리에 대기를 곱한다. 곱하는 양이 파장대마다 다르다는 것이 이 모듈의 전부다.

| 구분 | 근거 | 비고 |
|---|---|---|
| 가시(EO·육안) | Koschmieder β = 3.912/V + Duntley C(R)=C₀e^(−βR) | 과업별 임계대비 2/5/10 % 로 D·R·I 역산, 조도 배율 별도 |
| 장파장적외(IR) | β_LWIR = β_vis × K, 필요 겉보기 ΔT = NETD×SNR | K: 연무 0.12~0.22 / 안개 0.32~0.68 / 비 0.72~0.82 / **눈 0.86~0.94** |
| X대역 레이더 | ITU-R P.838-3 γ=0.01217·R^1.2571, SNR∝R⁻⁴·10^(−2γR/10) | 건설/습설 분리, 체적클러터 문턱 상승 |
| 음향 | 신설 흡음 + 풍잡음 마스킹 | 비가시선 — LOS 를 묻지 않는다 |
| C-UAS RF | 2.4/5.8 GHz 강우 감쇠 < 0.05 dB/km | 사실상 전천후 |
| 조명탄 | 역산란으로 반경 축소, 그 대신 EO·육안 조도 바닥값 제공 | |

**공표식과 우리 보정이 파일 안에서 구획으로 나뉘어 있다.** 위쪽(Koschmieder·Duntley·
P.838·레이더 방정식)은 문헌이고 재조정 대상이 아니며, 아래쪽(K_LWIR·C₀·ΔT·음향·육안
계수)은 데모 합성치다. `test/sensorPerformance.test.ts` 17항이 공표식 값과 파장대 우열
순위를 화면 없이 못박는다 (P.838 10 mm/h = 0.220 dB/km, Koschmieder 정의 왕복 등).

실측(GP-107 기준, 주간):

| 자산 | 맑음 | 폭설(V 700m) | 짙은안개(V 90m) |
|---|---|---|---|
| EO | 3.5 km | 576 m (16 %) | 54 m (2 %) |
| IR | 2.8 km | 604 m (22 %) | 84 m (3 %) |
| GSR (X) | 5.0 km | 4.1 km (83 %) | 5.0 km (100 %) |
| K6 육안 | 1.8 km | 576 m (32 %) | 54 m (3 %) |

눈송이는 파장보다 훨씬 커서 기하산란 — 가시와 열상을 가리지 않고 함께 깎는다(IR/EO 배율
1.05). 안개 물방울은 LWIR 파장과 같은 급이라 열상이 조금 더 버틴다. 레이더는 두 경우 모두
거의 그대로다. **악천후 감시의 기준선이 레이더인 이유가 이 표다.**

### ② 직접 배치 (src/runtime/sensorPosts.ts)

- 8종 팔레트(EO·IR·GSR·음향·C-UAS·조명탄·K6·K4)를 **지도로 끌어다 놓거나** 클릭 배치.
  드롭 전 고스트가 그 자리의 **실효 부채꼴**과 청천 반경을 미리 보여 준다.
- 세운 뒤: 마스트고(3~30 m)·지향(0~359°) 슬라이더, **지도에서 끌어 이동**(이동 시 지반고
  재샘플 — 능선을 넘기면 관측고가 통째로 바뀐다), 클릭 → 인스펙터 팝업, 철거.
- 지도의 부채꼴은 **지금 이 날씨에서 보는 범위**, 뒤의 점선이 **맑았으면 봤을 범위**.
  눈이 오면 앞의 것이 뒤의 것 안으로 줄어드는 게 눈으로 보인다. 인지·식별 호도 함께.
- 클릭 배치 모드는 지도 위 상주 배너로 표시된다 — 켜 둔 걸 잊어 엉뚱한 자산이 서는 일이 없게.
- 각 초소는 1인칭 관측점 목록에 그대로 올라온다(`post:<uid>`) — 마스트 꼭대기에서 본다.
- localStorage(`gp_sensor_posts_v1`) 자동 저장·복원, 최초 실행 시 기본 4종 시드.

### ③ 합동 커버리지 (src/runtime/postCoverage.ts)

두 계산의 **수명이 다르다**는 것이 설계 전부다:

- 지형 가시선(LOS) ← 위치·관측고가 바뀔 때만. 초소별 176² 마스크로 **캐시**.
- 탐지확률 P(d) ← 날씨마다. 캐시 위에서 곱셈만.

그래서 6종 날씨 × 강도 3단 = 18회 스윕이 광선추적 한 번 없이 즉답으로 나온다. LOS 는 기존
마스터 가시격자(`state.grid`)를 DEM 으로 재사용하므로 추가 지형 샘플링도 없다.
산출: 합동 탐지확률 드레이프, P≥0.3 커버 면적, 조기경보선(1.8 km) 사각 방위, 초소별
단독·**한계기여**(빼면 잃는 커버), 축선별 노출률·최장 연속사각·**GP 잔여거리 기준 최초탐지**.

### ④ 다중 센서 피드 (src/runtime/sensorFeed.ts 전면 개편)

- 최대 4창, 드래그 이동·그립 리사이즈·2×2 타일. 같은 표적이 EO에서 지워지고 IR에서 남고
  레이더 PPI에 그대로 찍히는 것을 나란히 놓고 본다.
- **날씨가 창 안에 산다**: `EnvironmentController.attachViewer()` 신설 — 피드 뷰어가 본
  화면과 동일한 태양·안개·조도·영상보정을 받는다. 그 위에 파장대별 감쇠 베일(중간거리
  투과율로 두께 결정), 강수 입자, 저조도 그레인(EO·육안만)이 얹힌다.
- **표적 자동 판정**: 시야각·유효거리·지형 LOS 를 모두 통과한 침투 유닛에 브래킷 +
  탐지/인지/식별 등급 + 탐지확률. 하단에 유효/청천 게이지와 제한요인.
- PPI: 강수 체적클러터 근거리 밴드 + 실효거리 한계 호(청천 대비 얼마나 줄었는지).
- 지향 자동 주사(스캔) 토글.

검증 실측(빌드 후 dist, 헤드리스 CDP): 팔레트 드롭·클릭 배치·지도 드래그 이동 각 1건,
마스트 9→30 m, 야간 EO 945 m(제한: 조도, NO_GO) → 조명탄 배치 후 2,462 m 회복,
가시성 분석 5개소 합동 23 % · 사각 2구간 · 축선 4개 노출 6~85 %, 날씨 스윕 18셀,
피드 2창 동시 구동, 1인칭 진입, localStorage 5건 복원 — **JS 오류 0**.

핵심 화면 한 줄: **맑음 → 폭설, 전 자산 합동 33 % → 23 %(−31 %)인데 레이더·재머를 빼면
12 % → 2 %(−87 %).** 두 줄이 다른 것이 결론이다 — 전천후 자산 한 대가 합동 수치를
떠받치는 동안 광학은 그 아래에서 무너진다.

## v19 — 전 기능 시나리오 점검 라운드 (좌측 패널 9탭 전수)

빌드 산출물(`dist`)을 헤드리스 CDP 로 띄워 9개 탭의 좌측 패널 조작을 시나리오별로
전수 구동했다(약 200개 스텝: 버튼·체크박스·슬라이더·셀렉트·드래그 대체 호출·단축키).
아래는 그 과정에서 **실제로 재현된 결함**과 그 수정, 그리고 같이 올린 개선이다.

### 치명 — 3D 화면이 부팅 직후 정지하고 있었다

`weatherFx.ts` 의 안개·강수 포스트프로세스 셰이더가 GLSL 1.00 문법(`varying`,
`texture2D`, `gl_FragColor`)으로 쓰여 있었다. Cesium 1.119 는 WebGL2 컨텍스트에
`#version 300 es` 를 붙여 그대로 이어 붙이므로 `varying` 이 **예약어 오류**가 되고,
Cesium 기본 렌더 루프는 첫 예외에서 `useDefaultRenderLoop = false` 로 스스로를 끈다.
즉 지도 전체가 21프레임에서 멈춰 있었다(RTX 4090/D3D11·SwiftShader 양쪽 재현).

- 두 셰이더를 GLSL ES 3.00(`in` / `texture()` / `out_FragColor`)으로 교체.
- 단계 생성부의 `try/catch` 는 이 실패를 **잡을 수 없다** — 컴파일은 `add()` 가 아니라
  첫 렌더에서 일어난다. 그래서 `src/runtime/renderGuard.ts` 를 신설했다: 렌더 루프가
  죽으면 **우리가 얹은 포스트프로세스 단계부터 최근 것 순으로 걷어내고 루프를 되살린다**
  (최대 4회). 지도가 없는 화면보다 안개 없는 지도가 낫다.
- 회귀 차단: `test/weatherFxShaders.test.ts` 에 옛 GLSL 문법 금지 시험 추가.

### 지형 소스를 「타원체」로 바꾸면 그 뒤 모든 조작이 실패했다

`Cesium.sampleTerrainMostDetailed` 는 공급자의 `availability` 를 곧바로 만지는데
`EllipsoidTerrainProvider` 에는 그 필드가 없다. 이 함수는 배치·가시영역·축선·측정·도보 등
14곳에서 불린다.

- `src/runtime/terrainSample.ts` 신설 — **돌아온 height 는 언제나 유한한 수**라는 계약
  하나로 전 호출부를 감쌌다(타원체면 0, 조회 실패면 호출자 대체값).
- 지형 소스를 바꾸면 감시탑·허브·배치 시설·감시자산·가설 관측점의 **지반고를 한 번의
  일괄 샘플로 다시 잰다**. 예전에는 옛 표고를 그대로 들고 있어 타워가 허공에 떴다.

### 조용히 틀린 값 · 사라지는 결과

| 증상 | 원인 | 수정 |
|---|---|---|
| 작전 브리핑·종합보고서의 시설 비용이 전부 0원 | `it.cost.totalCostKrw` — 실제 필드는 `cost.totalKrw` | 필드명 정정 (`opReport.ts`, `main.ts`) |
| AI 배치가 중간에 끊기고 `Cannot read properties of undefined` | `place()` 가 검증 차단 시 `{blocked}` 를 주는데 `it.cost` 를 바로 읽음 | 차단 항목 집계 후 요약에 `⛔ 배치 불가 n동` 으로 보고 |
| ITS 실도로 조회 결과가 표시되자마자 사라짐 | 결과를 쓴 **뒤에** `renderIpbTab()` 이 탭을 다시 그려 지움 | 재렌더를 먼저, 결과 기입을 나중에 |
| 보고서·LLM 평가의 「관측 커버리지」가 항상 비어 있음 | `state.coveragePct` 를 아무 데서도 대입하지 않음 | 가시격자를 구울 때 `sectorCoverage` 로 산출·갱신 |
| 평가 페이로드의 배치최적화 절이 항상 null | `state.lastPlacement` 미대입 | AI 배치 산출물 보존 |
| AI 배치·평가가 항상 오프라인 폴백 | `index.html` 에 `gemma3:4b` 하드코딩(미설치) | `server.cts` 가 로컬 Ollama 에 물어 실제 설치 모델을 `/config.js` 로 내려보냄 (`.env` 의 `OLLAMA_MODEL` 이 최우선) |
| 자동배치를 두 번 돌리면 앞 배치가 동선망에서 빠짐 | 이번 회차 결과만 이어 그림 | 지금 부지에 선 **전부**를 잇는다 |
| 수단을 바꿔도 앞의 워게임 판정이 남아 있음 | 판정 결과 무효화 없음 | 수단 변경 시 판정·AAR 해제 + 재실행 안내 |

### 레이아웃 — 세로 모니터와 좁은 창

- `html, body, #app { height:100% }` 에 **React 루트 `#root` 가 빠져** `#app` 의
  `height:100%` 가 기댈 부모를 잃고 auto 로 떨어졌다. 가로 모니터에서는 패널 내용이 길어
  우연히 화면을 채웠지만, 1080×1920 세로에서는 1699px 만 차고 아래 221px 이 검게 남았다.
- 파일 뒤쪽의 `#app { grid-template-columns: var(--panel-w,408px) 1fr }` 이 앞쪽
  반응형 미디어쿼리보다 **뒤에 와서 900px·1100px 분기를 통째로 덮고 있었다**. 880px 창에서
  패널·지도가 408px 에 갇히고 오른쪽 절반이 비었다 → 폭 변수를 기준 규칙으로 올리고
  중복 규칙 제거. 검증: 1920×1080 / 1600×1000 / 1366×768 / 1080×1920 / 1024×1366 /
  880×1400 / 800×600 전부 뷰포트 정확히 채움, 패널 그립(280~560px) 정상.
- 좁은 화면에서 HUD 카드가 좌상단 도구 툴바 뒤로 들어가던 겹침 해소.
- 감시 탭 아이콘 누락(`•` 로 표시되던 것) → 👁.

### 그밖의 개선

- **되돌리기 어려운 버튼은 두 번 눌러야 한다** — 「전체 철거」·「계획 초기화」(저장본·서버
  사본까지 지운다)를 첫 클릭에 무장시키고 4초 안에 다시 눌러야 실행. `confirm()` 은
  쓰지 않는다 — 그동안 Cesium 렌더 루프가 멈춰 화면이 얼어붙는다.
- 측정 도구(표면거리·프로파일·면적)의 **현재 모드가 패널 버튼에 표시**된다. 안내 토스트는
  곧 사라지는데 모드는 남아 있어서, 무엇이 켜졌는지 알 수 없었다.
- MGRS 격자를 켰는데 아무것도 안 나올 때(고도 160km 초과·화면 범위 3° 초과) **왜 안
  그리는지**를 축척바 배지에 적는다. 예전에는 빈 화면이라 고장으로 읽혔다.
- 명령 팔레트가 입력창 포커스를 잃어도 ESC 로 닫힌다.
- 시설 복제가 검증에 걸리면 무반응 대신 차단 사유를 알린다.
- 위협권 라벨이 겹쳐 읽히지 않던 것 — 아군 배치를 더 벌리고 라벨을 층으로 쌓는다.

### 검증 범위 (헤드리스 CDP, 빌드 산출물 기준)

트윈(관측점 5종·1인칭 진입/전환/종료·도보·드론·가시영역·투어·브리핑·자산 10종 토글·
합동 최적화·환경 프리셋 7종) · 지도(베이스맵 4 · 오버레이 2 × 투명도 · 3D 건물 ·
지형 소스 3 · 지형분석 5 · 측정 4 · GeoJSON · 블렌더 정밀지형 on/off) ·
배치(카탈로그 15 · 인스펙터 전 항목 · 복제 · 회전 · Ctrl+Z/Y/C/V · Delete · 자동배치 ×2 ·
슬롯 저장/열기/삭제 · A3 도면 · 종합보고서 · AI 대화) · 감시(팔레트 8종 · 클릭배치 ·
마스트/지향 · 가시성 분석 · 날씨 스윕 18셀 · 프리셋 5 · 센서 피드 4창 2×2 · 1인칭) ·
침투(수단 3 · 리허설 · 타임라인 재생/스크럽 · 추적캠 · 워게임 4축선 · AAR · 축선 작도) ·
작전분석(IPB 자동도출 · KAIROS 지형분석 · ITS 실도로 · 수동배치 · COA 6종) ·
화력(위협권 10종 · 탄약효과표 4구간 · CDE · 보고서 5종 · 취약축선 보완 · LLM 평가 완주) ·
결심(14 시나리오 전건 산출) · 설명서(코스 7종 진행·종료 · 도움말 뱃지) ·
셸(레일 · 아코디언 · 팔레트 35명령 · 툴바 7 · 퀵독 단축키 1~6 · 패널 그립).

렌더 파수꾼은 **고의로 깨진 셰이더를 주입해** 동작을 확인했다 — 루프가 죽고, 파수꾼이
그 단계를 걷어내고, 프레임이 다시 흐른다.

## v20 — 지도 상호작용 전수 점검 + 기능 고도화

v19 는 좌측 패널의 버튼·슬라이더를 훑었다. v20 은 **지도 위 조작**까지 내려간다 —
CDP `Input.dispatchMouseEvent` / `dispatchKeyEvent` 로 진짜 마우스·키보드를 쏘아
클릭·드래그·우클릭·휠을 실제 이벤트로 재현했다. 합성 DOM 이벤트로는 Cesium 의
`ScreenSpaceEventHandler` 가 반응하지 않으므로, 이 층은 그동안 시험된 적이 없었다.

### 그래서 드러난 것 — 지도에서 「눌러도 아무 일도 안 일어나던」 것들

| 증상 | 원인 | 수정 |
|---|---|---|
| 감시초소의 **커버 부채꼴을 눌러도 선택되지 않음** | 픽 정규식이 `-mast` / `-label` 만 알았다. 화면에서 가장 큰 `-fill`·`-edge`·`-dri`·`-dome`·`-spec` 은 전부 남이었다 | `POST_ENTITY_RE`(선택용, 전 엔티티) / `POST_HANDLE_RE`(드래그용, 작은 손잡이만) 로 규칙을 **한 곳에** 적고 갈라 씀 |
| 초소·건물 **드래그가 가끔 안 잡힘** | 드래그 시작이 단일 `scene.pick` — 다른 초소의 부채꼴이 위를 덮으면 그 아래 손잡이를 영영 못 집는다 | `drillPick(6)` 으로 몇 겹 뚫어 손잡이를 찾는다 |
| **COA 도식이 한 점에서 끝남** (두 번째 클릭이 안 먹음) | 첫 클릭에 맵 인스펙터 팝업이 열리고, 그 DOM 팝업이 캔버스 위에서 **다음 클릭을 삼켰다** | 작도 중에는 팝업·호버칩을 열지 않고 열려 있으면 닫는다 |
| 작도 중 우클릭이 **완성 대신 컨텍스트 메뉴**를 염 | `mapContext.busy()` 가 `state.coa.mode` / `state.sketch.mode` 를 봤는데 실제 필드는 `coa.tool` / `routeSketch.active` — 늘 false 였다 | `src/runtime/interactionMode.ts` 로 「지금 지도 클릭은 누구 것인가」 판정을 일원화 |
| **토공비가 화면에 「-」로만 나옴** | `placement.ts` 가 `costBreakdown.cutKrw + costBreakdown.fillKrw` 를 읽었는데 원본에는 그 두 필드가 없다. `undefined + undefined = NaN`, `fmtKrw(NaN) = '-'` — 예외도 경고도 없이 조용히 틀렸다 | 원본 필드 `costBreakdown.earthworkKrw` 로 정정 + `test/earthworkMapping.test.ts` 로 **원본 키와 대조하는 회귀 시험** 추가 |

마지막 항목은 새로 만든 A/B 비교표가 잡아냈다 — 두 안을 나란히 놓자 「토공비 −」가
눈에 띄었다. 화면을 하나 더 만들면 없던 눈이 하나 더 생긴다.

### 새 기능 ① 감시자산 자동 배치 (`src/runtime/postOptimizer.ts`)

감시 탭은 사각 방위를 알려주고 거기서 끝났다 — **그럼 어디에 세우나**는 운용자가
초소를 하나씩 끌어다 놓으며 손으로 찾아야 했다. 그 마지막 칸을 채운다.

```
후보 108곳(방위 20° × 거리 6링) × 유형 × 지향 8방위
  → 후보마다 LOS 마스크 1장 (유형이 아니라 자리가 가시선을 정한다)
  → 그리디: 매 스텝 한계기여 / 취득비 최대 조합 선택
  → 제안 → [이 안으로 배치] → [되돌리기]
```

- **예산(억)과 개수를 동시에** 받는다. 「4개까지, 40억 안에서」가 실제 질문의 형태다.
- **지금 날씨의 실효거리**로 계산한다 — 폭설의 답과 맑은 날의 답이 다르다.
- 「기존 배치 유지」를 끄면 백지에서 설계, 켜면 지금 배치 위에 증설한다.
- 탐색은 96² 성긴 격자로 돈다(본 화면은 176²). 실측: **백지 4개소 22.7억 → 합동 커버
  0 % → 49 %**, 적용 후 본 해상도 「가시성 분석」 검증에서 **48 %** — 근사 오차 1 %p.
  조기경보선 사각 `0~75°, 285~355°` → `60~75°`. 산출 2.9 초.
- 적용 직전 배치를 한 칸 기억해 **되돌리기**가 된다 (감시자산은 계획 슬롯과 별개 수명).

### 새 기능 ② 계획안 A/B 비교 (배치 탭)

「안(案) 비교」라고 써 놓고 정작 나란히 놓는 화면이 없었다. 슬롯의 **⇄** 를 누르면
현재 배치와 그 안을 12개 항목으로 대조한다 — 동수·인원·연면적·공사비·토공비·설계비·
인허가·총사업비·방호·재선정권고·타워고·전술도식. 차이 열은 **그 안으로 바꿀 때
유리한 방향**을 초록으로 칠한다(비용은 낮을수록, 규모는 클수록). 비교만으로는
배치가 바뀌지 않는다 — 바꾸려면 「열기」.

### 새 기능 ③ 계획 파일 내보내기 · 가져오기

GeoJSON 은 남에게 「보여 주는」 형식이라 되돌릴 수 없다(시설 제원·비용·타워고가 없다).
계획 자체를 주고받으려면 서버와 **같은 계약**(`gp-digital-twin.plan` v2)을 그대로 파일로 낸다.

- `⬇` → `gp-digital-twin-plan-<DTG>.gpplan.json`
- `⬆` → 스키마 검증 후 적용. **히스토리에 넣어 Ctrl+Z 로 들여오기 전으로 복귀**.
- 계약에 안 맞는 파일은 무엇이 틀렸는지 말하고 거부한다
  (`schema must be gp-digital-twin.plan · version must be 2`).

### 새 기능 ④ 렌더링 품질 프리셋 + 프레임률 (지도 탭)

기본값이 후하다(MSAA 4× · 블룸 · HDR · 배율 1.0). 4090 에서는 공짜지만 내장그래픽이나
원격 데스크톱에서는 그 값들 때문에 프레임이 한 자리로 떨어지고, 그러면 「무거운 앱」이
아니라 **고장난 앱**으로 보인다. 고품질 / 균형 / 저사양 세 단계로 접는다 — 끄는 순서는
체감 대비 비용이 큰 것부터(블룸·HDR → MSAA → 해상도 배율 → 지형 LOD). 현재 fps 를
옆에 띄워 고른 결과를 바로 확인한다. 선택은 localStorage 에 남아 **첫 프레임 전에**
적용된다(한 번 고품질로 그려 보고 나서 낮추면 그 한 번에 이미 인상을 남긴다).

`requestRenderMode` 는 쓰지 않는다 — 날씨 입자·드로우온·도보처럼 매 프레임 갱신되는
것이 많아, 그 모드에서는 `requestRender()` 를 빠뜨린 한 곳이 그대로 「멈춘 화면」이 된다.

### 새 기능 ⑤ 단축키 안내 오버레이 (`?`)

조작 목록이 설명서 탭 맨 아래 표에만 있었다 — 지도를 보고 있는 사람은 그 표를 못 본다.
`?` 키(또는 명령 팔레트 「조작 · 단축키 안내」)로 지도 위에 띄운다. 4개 그룹 22행이며,
**설명서 탭의 조작 요약도 같은 표를 읽어 그린다** — 두 벌로 두면 하나가 반드시 낡는다.

### 검증

실제 입력으로 확인: 우클릭 컨텍스트 메뉴(8항목·MGRS 복사·시설 배치) · 초소 클릭/부채꼴
클릭/드래그 이동 · 감시탑 팝업 · 거리 측정 2점 + 우클릭 종료 · 고도 프로파일(가시선 차폐
판정 포함) · 면적 3점 + 우클릭 폐합 · IPB 수동 배치 · COA 도식 작도(선/OBJ) · 침투 축선
작도(등록 → 리허설 5축선 → 삭제 4축선) · 상태바 MGRS/표고/카메라고도 갱신.
서버 계획 API 는 스키마 거부(400) · ETag 낙관적 동시성(409/200) · DELETE(204) 확인.
도메인 시험 **72건 통과**, 헤드리스 실행 중 **JS 오류 0 · 렌더 정지 0**.


---

## v19 — 광학 시점: 「그 자산의 눈으로 본다」

### 무엇이 문제였나

「감시자산 → 시점으로 보기」를 누르면 카메라가 그 자리로 옮겨 가고, 끝이었다. TOD
거치대의 좌표에 눈을 두어도 화면은 여전히 **컬러 위성사진**이었고, 계기라고는 상단의
방위 텍스트 한 줄뿐이었다. 그것은 TOD 시점이 아니라 지도를 낮은 데서 본 것이다.

실제로 그 장비를 들여다볼 때 눈에 들어오는 것은 풍경이 아니라 **풍경 위에 겹친
숫자들**이다 — 접안경 테두리, 방위 테이프, 부앙 사다리, 밀 눈금 조준선, 우하단의
유효거리 막대, 좌상단의 채널·극성·REC, 그리고 표적에 걸리는 브래킷. 그리고 열상은
애초에 **다른 그림**을 만든다: 반사광이 아니라 복사온도를 보므로 색이 사라지고,
초점면 배열의 고정패턴잡음이 얹히며, 수십 초마다 셔터가 닫힌다(NUC).

### 새 파일 3개 — 광학을 한 곳에 적는다

| 파일 | 하는 일 |
|---|---|
| `src/runtime/opticProfile.ts` | 「어느 자산의 눈인가」의 단일 출처. 파장대·×1 시야각·**배율 단**·접안 마스크·조준선·기본 극성·계기 묶음. 실효거리 제원은 `POST_TYPES` 에서 그대로 빌려 쓴다(숫자를 두 군데 적지 않는다). 9종: TOD · EO · GSR · ACU · CUAS · ILL · 조준경 · 드론짐벌 · 쌍안경/맨눈 |
| `src/runtime/opticFx.ts` | 화면 자체를 바꾸는 **깊이 인식 포스트프로세스**. 백열/흑열(LWIR) · 야시(I²) · 레이더 인광. 깊이를 쓰는 이유는 두 가지 — ① 하늘은 열상에서 가장 차다 ② 거리가 멀수록 경로복사가 열대비를 씻는다. 열대비 ΔT 가 낮으면 AGC 이득이 오르고 **그만큼 잡음도 오른다** |
| `src/runtime/opticHud.ts` | 계기판 캔버스 한 장. 접안 마스크 · 방위 테이프 · 부앙 사다리 · 조준선(밀/열상/탄도/짐벌/게이트/방위로즈) · 표적 브래킷 · LRF · 유효거리 막대 · 자산별 계기 |

`fpv.ts` 와 `walk.ts`(DroneCam)가 같은 엔진을 쓴다 — 계기 묶음만 다르다.

### 자산마다 다른 화면

- **TOD(열상)** — 백열/흑열 전환(`P`), 자동·수동 **NUC 셔터**(`N`, 52초 주기),
  열대비 ΔT·LWIR 소광비 계기. ΔT 가 1.4K 아래로 떨어지면 계기가 붉어지고 이득이
  올라가며 화면 잡음이 실제로 늘어난다 — 「열평형이라 안 보인다」가 화면에서 성립한다.
- **EO** — 조도가 8 lx 아래로 떨어지면 **야시(I²)로 자동 전환**. 조도가 낮을수록
  증폭이 커지고 산탄잡음이 화면을 채운다. 조도/시정 계기가 왜 실효거리가 청천의
  27 % 로 줄었는지를 같은 화면에서 답한다.
- **GSR(지상감시레이더)** — 인광 콘솔 + 화면 안 **PPI 스코프**(스윕·블립·실효거리
  한계호·강수 클러터), 거리게이트 조준선.
- **중화기 조준경** — **탄도 사다리**. 눈금 간격은 초속 890 m/s 에서 시작해 항력으로
  잔존속도가 주는 것을 근사한 뒤 그 비행시간의 자유낙하를 각도로 바꾼 값이다.
  `L` 로 거리를 재면 해당 눈금이 켜지고 고각·편류·비행시간이 뜬다.
- **드론 짐벌** — 조종석 계기: AGL/해발/대지속도/궤도반경/짐벌각/기수, 배터리와
  **잔여 체공시간**, 데이터링크(지연·대역·통제소 이격). EO↔IR 페이로드 전환(`P`).
- **감시탑·초소·가설 관측점** — 맨눈에서 시작해 `B` 로 쌍안경(1×~10×). 두 통이 겹친
  8자 마스크.

공통: 드래그 슬루 · **배율 단** 전환(휠 — 실물 광학은 연속 줌이 아니다) ·
레이저 측거(`L`, 조준선이 실제로 닿는 지형까지의 거리·표고·MGRS) ·
표적 브래킷(유효거리·시야각·지형 LOS 를 모두 통과한 침투 유닛만 D/R/I 등급과 Pd 로) ·
실효/청천 거리 막대와 제한 요인.

광학 시점에 들어가면 지도 크롬(툴바·나침반·HUD 카드·축척바)은 물러난다 — 카메라가
잠긴 동안 눌러도 소용이 없고, 그 자리에는 이미 광학 자신의 계기가 있다.

### 관제벽 (CCTV 화면)

감시 탭 「🖥 관제벽 열기」— 배치한 자산의 화면을 **최대 6채널** 한 번에 띄운다
(열상 → 광학 → 레이더 → 조준경 순, 3×2 정렬). 창마다 채널 태그·DTG·MGRS·AZ/EL/배율
**번인**, 배율 단, 극성 전환, 자동 주사, `⤢` 단일 채널 확대.

같은 순간 EO 는 눈 속에서 하얗게 지워지는데 TOD 에는 아직 사람이 남고 레이더 PPI
에는 블립이 찍힌다 — 그 대비는 나란히 놓았을 때만 보인다.

### 검증

헤드리스 Chrome 으로 실제 조작: TOD 진입(광학 tod·극성 wh) → 배율 단 ×1→×2(FOV
24°→12°) → LRF 4.56km 실측 → 흑열 전환 → NUC 셔터 → GSR PPI → 조준경 탄도 사다리 →
감시탑 쌍안경↔맨눈 → 01:00 야간 EO **야시 자동 전환**(실효 933m / 청천 3.5km, 제한:
조도) → 드론 조종석(대지속도 18.1 m/s·배터리·링크) → EO/IR 페이로드 전환 → 관제벽
4채널 → 극성·배율 → 단일 확대 → 확대 해제 복귀.
도메인 시험 **103건 통과**(탄도 8건·극성 규칙 6건 신설), **JS 오류 0 · 렌더 정지 0**.

## v21 — 배치물 3D 실물화: 「보이지 않던 시설」 5종과 늘어나던 구획

### 조용히 아무것도 안 그리던 시설 5종

카탈로그 15종 중 **사무·교육·훈련·주차·군용주차** 5종에 GLB 가 없었다.
`BuildingStack._plan()` 이 `null` 을 돌려주면 `update()` 가 즉시 빠져나가므로 —

> 목록에는 멀쩡히 들어 있고, 비용도 계산되고, 콘솔도 조용한데,
> **지도에는 공중에 뜬 핀과 라벨만 남는다.**

지도를 보지 않으면 알 수 없는 결함이었다. 5종을 만들고, 다시는 같은 일이 없도록
**범용 예비 모델**(`fac_generic_*`)을 두어 미등록 시설도 형체를 갖게 했다.

### 늘리면 안 되는 것들 — 「스트레치」에서 「배치」로

기존 조립은 캐노니컬 12×8m 모델 하나를 풋프린트 비율로 늘리는 방식이다. 건물은
줄눈·창문 열이 늘어나도 견디지만, 야외 구획은 견디지 못한다. 주차 구역 기본값은
**28.2×18.8m** — 캐노니컬을 2.35배 늘리면 **차도 2.35배가 되고 차선도 그만큼 두꺼워진다.**

그래서 훈련·주차·군용주차는 바닥(pad)만 늘리고, 그 위의 물건은 **실척 그대로** 놓는다.
몇 개를 어디에 놓을지는 부지 크기에서 계산한다 (`buildingModels.ts` 의 `YARD_PLANS`).

| 부지 | 결과 |
|---|---|
| 주차 28×19 | 주차면 10 · 승용 15 · 카포트 4 · 조명탑 2 |
| 주차 44×30 | 주차면 **18** — 면이 굵어진 게 아니라 **면이 늘었다** (2.5m 고정) |
| 군용주차 28×19 | 게비온 방호벽 2 · 5t 카고 6 · 위장망 캐노피 · 유류점 · 조명탑 2 |
| 훈련 45×30 | 레펠탑 · 장애물 레인 5종 · 사열대 · 장비창고 · 조명탑 4 |

프롭 상한은 시설당 34개. 이 값은 코드에 적혀 있고, 넘치면 뒤에서부터 잘린다.

### 신규 모델 28점 (`assets/blender/build_facilities2.py`)

기준 디테일은 **레펠탑**(`fac_rappel_tower.glb`, 8.4m)이다 — 4각 트러스에 X 브레이싱
4단, 4.2m 중간 데크와 8.0m 정상 데크, 난간, 등받이 케이지 사다리, 레펠 암 2본과 로프,
클라이밍 판과 홀드 18개, 착지 매트, 경고 표지. 감시탑과 같은 눈높이로 만들었다.

건물형 `fac_office_*`(띠창·태양광·옥탑기계실) · `fac_edu_*`(교실창·포치·게양대·박공지붕)
· `fac_generic_*` / 바닥 `fac_yard_asphalt`(연석·배수구) · `fac_yard_gravel` /
주차 `fac_stall`(2면 묶음) · `fac_carport` · `veh_sedan` · `veh_truck`(5t 카고) /
군용 `fac_revet`(게비온 2단+모래주머니) · `fac_camonet` · `fac_polpoint` /
훈련 `fac_obst_wall` · `_bars` · `_beam` · `_tires` · `fac_pullup` · `fac_stand` /
공용 `fac_lightmast`(9m·투광등 3) · `fac_shed` · `fac_stem`(기초)

**만들다 두 번 다시 만든 것**
- 위장망: 알파 0.55 짜리 평평한 격자는 렌더에서 **유리판 한 장**으로 읽혔다.
  처짐을 1.6m 로 키우고 **로프 격자를 실제 지오메트리로** 얹으니 그제야 망이 됐다.
- 방호둑: 사다리꼴 성토가 **콘크리트 상자**로 읽혔다. 각진 셀이 저폴리곤에서
  형태가 살아남는 **게비온(HESCO형)** 으로 바꿨다.

### 같은 모델을 쓰던 두 쌍

EO/IR 이 `sns_cam_mast.glb` 하나를, K6/K4 가 `sns_weapon_mount.glb` 하나를 같이 썼다.
지도에서 자산 종류를 눈으로 구분할 수 없다는 뜻이다. 갈라 놓았다 —
`sns_cam_mast_ir.glb`(대구경 게르마늄 창·차양 후드·LRF·냉각기),
`sns_weapon_agl.glb`(드럼 탄통·짧고 굵은 총열·넓은 삼각대). **8종 8모델, 공유 0.**

### 뜬 건물 · 묻힌 판 — 정지고를 고쳤다

바닥판을 `cost.pad`(Scaffolda 절·성토 **균형고**)에 얹고 있었다. 계산으로는 맞지만
화면에서는 틀린다 — Cesium 은 계산한 절토만큼 지형을 깎아 주지 않으므로,
**지형이 판을 대각선으로 잘라 절반이 언덕에 묻혔다.** 45×30m 훈련장에서 11.6m 가 묻혔다.

`_reground()` 는 정밀지형 모드에서 이미 **풋프린트 최고 지반**(`padTop`)을 쓰고 있었다.
두 경로가 달랐던 것이다. `_priceAt` 이 이미 뜨고 있던 표고 격자에서 `gmin`/`gmax` 를
재어 같은 규약으로 맞췄고, 내리막 쪽에 생기는 빈 공간은 `foundBottom` 까지 **런타임에서
Z 로 늘어나는 기초 플린스**(`fac_stem.glb`)가 메운다. 평지에서는 통째로 지하에 들어간다.

비용은 그대로 원본 `computeEarthwork` 결과를 쓴다 — 바뀐 것은 표시고뿐이고,
두 값이 0.5m 이상 어긋나면 인스펙터가 **둘 다 적는다**.

### 회귀 시험 (`test/facilityModels.test.ts` 6건)

① 카탈로그 전 시설이 모듈을 하나 이상 낸다 ② 미등록 시설도 예비 모델로 떨어진다
③ 모듈이 가리키는 GLB 가 디스크에 실재한다(파일명 오타도 같은 증상이다)
④ 야외 프롭이 부지 밖으로 나가지 않고 상한을 지킨다 ⑤ 부지를 넓히면 **개수가 는다**
⑥ 기초가 `foundBottom` 까지 내려간다.

옛 상태(예비 모델 제거 + 교육 구역 등록 해제)로 되돌려 **실제로 3건이 실패하는 것까지
확인**했다.

### 검증

헤드리스 Chrome 에서 15종 전수 배치 → 프리미티브 79개 전부 `ready`, **미생성 0종**.
프롭 좌표를 시설 ENU 로 되돌려 실측: 계획값과 0.1m 이내 일치, **방위 47° 회전에서도 동일**.
크기 변경(28×19 → 44×30) 재구성, 회전 시 프롭 26.4m 동반 이동, 철거 시 11개 프리미티브
전량 반환. 도메인 시험 **89건 통과**, 기존 헤드리스 전 구간(t3·t4·t12·t22·t24) **문제 0**.


---

## v20 — 작전 한 바퀴: 추적 → 인계 → 조명 → 보고

### 무엇이 빠져 있었나

v19 로 화면은 「그 자산의 눈」이 됐다. 그런데 거기서 할 수 있는 일이 **보는 것뿐**이었다.
표적에 브래킷이 걸려도 그것은 한 프레임의 판정이고, 다음 프레임이면 다시 계산된다.
관측반이 실제로 하는 일 — 잡고, 번호를 붙이고, 다른 자산에 넘기고, 안 보이면 밝히고,
보고를 올리는 것 — 은 하나도 없었다. 자산을 여러 개 세워 둔 이유가 화면을 여러 개
갖기 위해서가 아닌데도, 화면이 여러 개인 것으로 끝나 있었다.

### 새 파일 4개 — 전부 Cesium 을 만지지 않는 순수 모듈

| 파일 | 하는 일 | 시험 |
|---|---|---|
| `tracking.ts` | 항적부. 관측된 것에 **번호(T01…)** 를 발급하고 위치의 열을 보관한다. 속도·진로는 보관 구간의 처음과 끝으로 구한다(두 표본 미분은 지터가 그대로 속도가 된다). **접근률**은 전체 속도가 아니라 GP 를 향한 성분이고, 스쳐 가는 표적에는 도달시간이 없다 | 11건 |
| `crossCue.ts` | 교차표적지정. 배치 자산 하나하나에 ① 지향을 돌리면 시야 안인가 ② **지금 날씨의 실효** 거리 안인가 ③ 지형이 막지 않는가 를 묻고, 걸리면 **무엇에 걸렸는지**를 돌려준다(「안 보인다」가 아니라 「능선에 막혔다」여야 배치를 고친다) | 10건 |
| `fireSupport.ts` | 조명을 **시간을 가진 사건**으로. 연소 곡선·낙하산 강하·저시정 역산란 | 14건 |
| `spotrep.ts` | SALUTE 골격 관측보고. 모르는 것은 빈칸이 아니라 **「미상」**(빈칸은 0 으로 읽힌다) | 10건 |

`flareLayer.ts` 가 그 조명을 지도 위에 띄우고(강하하는 점광 · 지표 조명원 · 강하 흔적),
`opticHud.ts` 가 항적 계기 · 인계 결과 · 조명 배너 · **평면 미니맵**을 그린다.

### 화면 안에서 도는 한 바퀴

**T — 표적 추적.** 조준선 근처를 클릭하거나 `T`. 물면 항적 번호가 붙고 계기에
방위/거리 · 등급/Pd · **이동 양상과 속도** · 진로 · **GP 도달 예상시간**이 뜬다.
TOD·EO·GSR·드론은 자동추적이라 짐벌이 따라가는데, **최대 슬루 속도가 있다**(TOD 18°/s) —
무한히 빠르면 「놓친다」가 성립하지 않기 때문이다. 조종간을 잡으면(드래그) 추적은 끊긴다.
화기 조준경·쌍안경은 자동추적이 없어 **지시선**만 뜬다 — 사람이 조준하는 장비이므로.

추적 후보는 **화면이 아니라 감시 부채꼴**에서 고른다. ×8 로 당긴 TOD 의 화면은 3° 지만
그 거치대가 맡은 부채꼴은 60° 이고, 그 안에서 유효거리·지형 가시선을 통과한 것은 화면
밖에 있어도 탐지된 것이다 — 물면 짐벌이 그쪽으로 돌아간다.

**C — 교차표적지정.** 넘긴다는 것은 목록을 띄우는 일이 아니라 **부채꼴을 실제로 돌리는
일**이다. 지도의 부채꼴이 그 자리에서 회전하고, 가장 좋은 두 채널이 관제창으로 열린다.
이전 지향은 기억해 두고 `C` 를 다시 누르거나 시점을 나가면 **원래대로 돌아간다** —
인계로 돌려 둔 지향이 계획에 남으면 나중에 자기가 언제 바꿨는지 알 수 없다.

**I — 조명 요청.** 지금까지 실효거리 계산은 「조명탄 발사대가 배치되어 있으면 조명
지원 있음」이었다. 계획 단계에서는 능력 진술로서 맞지만, 지도의 부채꼴까지 그 규칙을
쓰면 발사대 한 기로 **밤새도록 조명이 떠 있는 GP** 가 된다. 조명탄은 32초짜리 사건이다.
이제 쏘면 켜지고, 밝기가 오르내리고, 꺼지면 되돌아간다 — 그 왕복이 화면에서 보인다.

| | 야간 EO-01 실효거리 |
|---|---|
| 조명 전 | **933 m** (제한: 조도) |
| 조명 중 | **2,461 m** |
| 소등 후 | **933 m** |

사거리(어디까지 올려 주는가, 2 km)와 **조명 반경**(그 한 발이 밝히는 원, 520 m)은 다른
수로 분리했다 — 같은 수로 쓰면 발사대 한 기가 전방 2 km 를 통째로 밝히게 되어 「어디에
쏠지」를 고르는 일이 사라진다. 판정 기준도 「관측점이 밝은가」가 아니라 **「내가 보는
땅이 밝은가」**(= 그 자산의 감시 부채꼴)다. 저시정에서는 역산란 경고가 붙고 반경이 준다.

**S — 관측보고(SPOTREP).** 화면 캡처(Cesium 캔버스 + HUD 캔버스 합성)와 SALUTE 보고문을
한 장으로. **「관측 조건」 절이 이 보고문의 핵심**이다 — 같은 표적을 같은 자산으로 봐도
눈이 오면 등급이 내려가므로, 받는 쪽은 그 판정이 어떤 조건에서 나왔는지를 알아야 믿을지
말지를 정할 수 있다. 「식별」 한 줄만 오는 보고는 검증할 수 없다. PNG·TXT 다운로드, 복사.

### 곁다리로 고친 것

- **HUD 계기가 한 카운터로 두 열을 굴리고 있었다** — 왼쪽 계기가 길어질수록 오른쪽 LRF
  가 화면 한가운데까지 밀려 내려왔다. 좌/우 열을 분리.
- **1인칭 프레임 예외를 통째로 삼키고 있었다** — 계기가 빈 채로 조용히 돌았다.
  뷰어 파괴 경합은 그대로 무시하되 처음 한 번은 반드시 `console.warn` 으로 남긴다.
- 육안(화기) 실효거리 문구가 조명 여부와 무관하게 「조명 지원 없이는 관측사격 불가」로
  고정돼 있었다 — 조명이 동적이 된 이상 그 문장도 상태를 따라가야 한다.
- 지형에 깔리는 `ellipse` 에 `outline` 을 주면 Cesium 이 경고하고 무시한다 —
  채움(ellipse)과 테두리(지형 클램프 폴리라인)를 나눴다.

### 검증

헤드리스 Chrome 실조작 한 바퀴: TOD 진입 → 부채꼴 안 2표적 탐지(T01·T02) → T02 추적
(속도 8.3 m/s · 진로 남 181° · **GP 도달 2:35** · 자동추적 편차 0°) → 인계 4자산
(K6·EO·IR 즉시 관측, **GSR 200°→1° 실제 회전**, ILL 관측 불가) → 야간 전환 → 조명 요청
(EO 933 m → **2,461 m**) → 관측보고 생성(PNG 2.1 MB · SALUTE 전 항목) → 소등(→ 933 m
복귀) → 시점 종료 시 **지향 200° 자동 복원**. 도메인 시험 **148건 통과**, JS 오류 0.


---

## v21 — 상시 감시: 시스템이 나에게 말한다

### 무엇이 빠져 있었나

v20 까지 표적 판정은 **1인칭 화면이 켜져 있을 때만** 일어났다. 그 화면을 닫으면
아무 일도 없었던 것이 된다. 그런데 GP 의 감시자산은 사람이 보든 말든 계속 서 있고,
관측반이 하는 일은 화면을 들여다보는 것이 아니라 **경보를 받는 것**이다. 그리고
「이 배치가 작동했는가」는 지금 화면을 보는 것으로는 답할 수 없다 — **누가 언제 처음
잡았고 어디서 놓쳤는가**의 열로만 답할 수 있다.

### 새 파일 2개

| 파일 | 하는 일 | 시험 |
|---|---|---|
| `watchEngine.ts` | 순수. 배치 자산 전체 × 표적 전체를 **지금 지향·지금 실효거리·지형 가시선**으로 판정하고(`evaluateWatch`), **바뀐 순간만** 사건으로 뽑는다(`diffWatch`). 같은 규칙으로 축선 전 구간을 걸어 시간축 공백도 낸다(`routeCoverage`) | 17건 |
| `watchRoom.ts` | 그것을 매초 돌리고 로그·경보로 옮긴다 | — |

`crossCue` 와 `evaluateWatch` 는 비슷해 보이지만 **다른 물음**이다 — 인계는 「지향을
돌리면 볼 수 있는가」, 감시는 「지금 그대로 보고 있는가」. 그 차이가 배치 평가의 전부라
감시는 부채꼴을 돌리지 않는다.

### ① 상시 감시 로그

배치된 자산은 화면을 안 열어도 매초 판정한다. 상태를 매초 찍어 두기만 하면 로그가
아니라 잡음이므로 **바뀐 순간만** 남긴다:

```
0828 10:00:19  축선 3            접촉 상실
0828 10:00:09  축선 3 · GSR-01   등급 상승   인지 3065m · Pd 0.81 · 2개 자산 접촉
0828 10:00:04  축선 4 · EO-01    최초 탐지   탐지 3172m · Pd 0.09 · 1개 자산 접촉
```

시각은 벽시계가 아니라 **시뮬레이션 DTG** 다 — 화면이 어두운 이유가 그 시각의 태양고도인데
벽시계를 찍으면 둘이 어긋난다. 행을 누르면 그 자산의 관제 화면이 열린다. 경보는
**최초 탐지**와 **식별 승급**만 울린다 — 전부 같은 무게로 울리면 아무것도 울리지 않는
것과 같다. 1인칭 안에서는 화면 상단에 경보 배너가 뜬다(다른 자산이 잡은 것을 알려
주지 않으면, 화면 하나에 매인 사람은 옆에서 벌어지는 일을 끝까지 모른다).

### ② 축선 시간축 감시 공백

합동 커버리지는 **어디가 보이는가**를 묻는다. 그런데 침투 부대는 한 점에 머물지
않는다 — **지나가는 동안 몇 %의 구간에서 잡혀 있었고 어디서 끊겼는가**가 성적표다.

| 축선 | 관측 | 최초 탐지 | 최장 공백 |
|---|---|---|---|
| 축선 1 | 85% | GSR · GP 3,412m | 478m (GP 2.2km 까지 접근) |
| 축선 2 | 53% | EO · GP 3,336m | 909m (GP 576m 까지 접근) |
| **축선 3** | **6%** | EO · GP 3,326m | **2.8km — GP 442m 까지 아무도 못 봄** |
| 축선 4 | 88% | GSR · GP 3,188m | 141m |

막대는 출발→GP 로 눕고 매 구간의 최고 등급으로 칠해진다(붉음 탐지 · 노랑 인지 ·
초록 식별), 흰 눈금이 최초 탐지 지점이다. 공백에는 **좌표가 붙고**(「어디가 비었나」는
좌표로 답해야 고칠 수 있다) 「⌖ 그 지점 보기」로 카메라가 그 자리로 간다.

지형 가시선 없이 돌리면 능선 뒤도 보인다고 나오므로 — **공백이 0 인 분석은 분석이
아니라 위안이다** — 분석 전에 가시영역 격자를 먼저 굽는다.

### ③ 예측 진로와 화기 진입

「사거리 밖」은 정지한 표적의 말이다. 움직이는 표적에는 **몇 초 뒤에 든다**가 답이고,
그 숫자가 있어야 조명 요청·사격 준비 시점을 정할 수 있다. 항적 계기에 배치된 화기별
`사거리 내 / N초 뒤 진입`이 뜨고, 평면 미니맵에 60초 예측 위치가 점선으로 눕는다.
곡선 예측은 근거가 없으므로 **등속 직선으로만** 민다. 그리고 1인칭 항적 계기에
**동시 접촉 자산**(`GSR:식별 · K6:탐지 · EO:탐지 · IR:탐지`)이 뜬다 — 인계의 결과가
숫자로 남는 자리다.

### 곁다리로 고친 것 — 순간이동은 이동이 아니다

리허설 시간축을 사람이 끌면(스크럽) 표적이 한 프레임에 2km 를 건너뛴다. 그것을 속도로
받아들이면 「도보 침투가 시속 200km」 가 되고, 그 뒤 수십 초 동안 속도·진로·도달시간이
통째로 거짓이 된다. 그래서 항적부가 불연속을 감지해 이력을 새로 시작한다.

다만 **속도만으로는 판별할 수 없다** — 리허설 표적 위치는 축선 표본(12m)에 물려 있어
몇 초에 한 칸씩 한 프레임 만에 12m 를 건너뛴다(순간속도 60 m/s). 처음엔 그것까지
순간이동으로 처리해 항적이 매 프레임 끊겼고, 속도가 영원히 나오지 않았다. 지금은
**절대 변위(250m 초과)와 불가능한 속도(35 m/s 초과)를 함께** 볼 때만 끊는다.

### 검증

헤드리스 Chrome: **아무 화면도 열지 않은 채** 침투를 진행 → 사건 8건 자동 생성
(최초 탐지 4 · 등급 상승 · 접촉 상실) · DTG·자산·등급·Pd 모두 기록 → 감시 탭에서
시간축 분석(가시영역 격자 포함) → 4축선 관측률 6~88%, 축선 3 에 GP 직전 2,779m 공백
검출 · 막대 렌더 확인 → 1인칭 추적 시 **동시 접촉 4자산 · 화기 진입 · 60초 예측** 표출.
도메인 시험 **180건 통과**, JS 오류 0.


---

## v22 — 자산 관리 창과 드론 편대

### ① 자산 관리 창 (팝업)

감시자산을 손보려면 감시 탭 목록으로 돌아가야 했고, 지도를 보면서 고칠 수는 없었다.
지도 팝업은 있었지만 손바닥만 해서 마스트와 지향 두 개가 전부였다. 그런데 자산 하나를
앞에 두고 실제로 묻는 것은 그것보다 많다 — **지금 무엇을 잡고 있고, 왜 그것밖에 못 보고,
얼마짜리이고, 어디로 옮길까.**

`managePanel.ts` 는 **떠 있는 채로 지도를 조작할 수 있는** 부유창이다(헤더를 끌어 옮긴다).
지도에서 자산 클릭 → `⚙ 관리`, 감시 탭 목록의 `⚙ 관리`, 명령 팔레트에서 연다.

- 실효/청천 거리 · 판정 · **제한 요인**을 큰 글씨로
- 좌표(MGRS) · 지반고 · GP 방위/거리 · 관측고 · 시야각 · D/R/I
- **호칭 변경** · 마스트 · 지향 슬라이더 · `⇄ 표적 지향`(지금 잡고 있는 표적 쪽으로 부채꼴을 돌린다)
- **현재 접촉** — 상시 감시가 판정해 둔 그 자산의 접촉 목록(등급·거리·Pd)
- `⧉ 복제` — 바로 옆에 같은 제원으로 한 대 더. 「하나 더 세우면 메워지나」를 즉시 시험한다
- 슬라이더를 잡고 있는 동안에는 다시 그리지 않는다 — 손에서 빠져나가면 못 쓴다

### ② 드론 편대

드론이 감시자산으로서 값어치가 있는 이유는 그 **유한함** 때문이다 — 40분 뜨고 25분
충전한다. 그래서 「지금 몇 대가 떠 있고 몇 분 남았고 다음 기체는 언제 뜨는가」가 계획의
일부가 된다. **무한히 떠 있는 드론은 자산이 아니라 배경이다.**

`droneModel.ts`(순수, 시험 16건)가 그 유한함만 담는다 — 상태기계(대기·이륙·임무·복귀·충전),
배터리, 선회 궤도. `droneFleet.ts` 가 지도에 띄우고(강하선·궤도환·짐벌 시선), 관리 창이 조작한다.

| | |
|---|---|
| 체공 / 충전 | 40분 / 25분 |
| 자동 복귀 | 배터리 25% 이하 — **사람이 잊어도 기체는 돌아온다** |
| 고도 / 궤도 | 120~900m / 250~2,200m |
| 페이로드 | EO 주간(2.6km) ↔ IR 열상(2.1km) |

**떠 있는 기체는 초소와 똑같은 감시자산이다.** 상시 감시 엔진이 같은 규칙(지금 짐벌
지향 · 지금 실효거리)으로 묻고, 탐지 로그와 축선 공백 분석에 함께 들어간다. 착륙해
충전 중인 기체는 자산 목록에서 빠진다 — 지상의 기체가 계속 감시한다고 적으면 그건
편대 관리가 아니다.

교차표적지정(`C`)도 드론을 포함한다. 드론에게 「지향 전환」은 부채꼴 회전이 아니라
**순찰 중심을 표적 위로 옮기는 것**이고, 복원하면 원래 순찰 지점으로 돌아간다.
공중의 기체에는 능선 차폐를 적용하지 않는다 — 그것이 드론을 띄우는 이유다.

드론 시점은 이제 「어딘가의 드론」이 아니라 **그 기체**다. 관리 창에서 고른 고도·반경·
순찰 중심·페이로드를 그대로 물고 들어가고, 시점 안에서 바꾼 값(`P` 페이로드, `[ ]` 반경,
휠 고도)은 **그 기체에 되돌아간다** — 화면만 열상인데 편대에는 EO 라고 적혀 있으면
둘 중 하나는 거짓말이다.

### 검증

헤드리스 Chrome: 관리 창 열기 → 마스트 9→30m·호칭 변경·복제(자산 4→5) 반영 확인 →
편대 관리 → 출격 → 상승 130m → **임무 전환 · 배터리 감소** → `watchAssets()` 등록 확인 →
순찰 중심을 축선으로 이동 후 **드론이 상시 감시 판정에 들어감**(축선 1 식별 · 축선 4 탐지) →
IR 페이로드 전환이 제원(lwir)과 화면 극성에 함께 반영 → 그 기체 시점 진입(bound UAS-01) →
복귀 → 착륙 → 충전 · 소티 1회 · **감시자산 목록에서 제외**.
도메인 시험 **199건 통과**, JS 오류 0.


---

## v23 — GP 에 있어야 할 자산들, 그리고 전원

### ① 빠져 있던 자산 8종

기존 8종(EO · TOD · GSR · 음향 · 재머 · 조명탄 · K6 · K4)은 **전부 멀리 보는 장비**였다.
그래서 두 가지가 통째로 비어 있었다 — **광학이 죽는 조건에서 남는 눈**과 **GP 코앞**.

| 자산 | 무엇이 새로운가 |
|---|---|
| **UGS 지진동 감지센서** | 매설형. 발걸음을 땅으로 듣는다 — **빛도 안개도 상관없다.** 무월광 짙은 안개에서 EO 가 6m 로 죽을 때 이것은 128m 를 지킨다. 대신 신설이 발걸음을 덮고 강풍이 바닥잡음을 올린다 |
| **FIB 광망 감지선** | 철책 접촉. 거리가 아니라 **선**이라 날씨가 유효거리를 깎지 않는다. 대신 강풍·착설이 오경보를 만들고, **잦은 오경보는 경보를 무디게 한다**(그만큼만 감도를 깎는다) |
| **CCTV 근접 감시** | 울타리 안쪽·사각을 메우는 싼 고정 카메라. 야간에는 조명이 없으면 아무것도 아니다 |
| **SL 탐조등** | 조명탄과 달리 끊기지 않는다 — 대신 1,500W 를 먹고, **켜는 순간 자기 위치를 알려 준다** |
| **DRD 드론탐지 레이더** | 재머는 막는 장비, 이것은 **찾는** 장비. 무엇이 오는지 알아야 재밍 시점을 정한다 |
| **60M 60mm 박격포** | 곡사 — **가시선이 필요 없다.** 직사화기가 닿지 못하는 능선 뒤 사각으로 떨어뜨린다 |
| **CLM 지향성 지뢰** | 통제격발. 마지막 50~180m 를 맡는다 — 그 거리에서는 관측도 조준도 이미 늦다 |
| **GEN 발전기 5kW** | 아래 참조 |

`sensorPerformance` 에 파장대 3종을 더했다(전부 시험됨):

- **`seismic`** — 시정·조도와 **무관**. 동결 지반은 전달이 좋아지고(+18 %), 신설은 흡수하며,
  강풍은 수목 진동으로 바닥잡음을 올린다.
- **`fence`** — 거리를 깎지 않는다. 오경보 위험만 계산해 그만큼 신뢰도를 깎는다.
- **`indirect`** — 가시선 불요, 안개가 사거리를 깎지 않는다. 강풍만 탄착 산포를 키운다.

지형 가시선을 타지 않는 자산(`losFree`: UGS · 광망 · 박격포 · 크레모아)은 상시 감시와
축선 공백 분석에서도 **능선 차폐를 받지 않는다** — 땅과 철책을 통해 오기 때문이다.

### ② 전원 — 「몇 개를 살 수 있나」 옆의 「몇 개를 켤 수 있나」

지금까지 자산의 제약은 돈 하나였다. 그런데 GP 에서 자산 수를 실제로 정하는 것은
**전원**인 경우가 더 많다 — 열상 한 대가 420 W, 레이더가 900 W 인데 발전기는 5 kW 이고
유류는 헬기로 올라온다.

`powerGrid.ts`(순수, 시험 14건)가 그 수지를 푼다:

- 자산마다 **정격 소비전력**과 **차단 우선순위**(5 기반 · 4 야간 유일 관측 · 3 전천후 탐지 ·
  2 주간 광학 · 1 부가)
- **한랭 보정** — 겨울 GP 의 소모는 카탈로그 값이 아니다(광학 창 열선·도파관 히터).
  0 ℃ 에서 +10 %, −20 ℃ 에서 +40 %
- 모자라면 **우선순위가 낮은 것부터**, 같은 순위면 큰 부하부터 끊는다 —
  야간에 열상을 끄고 주간 카메라를 남기는 부대는 없다
- 연료: 무부하에서도 먹고 부하율만큼 더 먹는다 → **잔량을 근무 교대가 읽는 시계로**

그리고 결정적으로, **꺼진 자산은 감시 엔진에서도 빠진다.** 실효거리 0 · 부채꼴 없음 ·
탐지 로그 없음 · 축선 공백 분석에서도 제외. 전력 계기가 숫자로만 있고 탐지가 그대로면
그건 계기가 아니라 장식이다.

```
부하 차단   4,604W / 6,104W 요구            발전 5,000W
전원 차단 1개 — 이 자산들은 지금 아무것도 보지 않습니다
  SL-01                                     SL · 1,500W
발전 1,104W 를 더 확보하면 전부 되살아납니다 (발전기 1대)
```

기본 배치에 발전기를 넣었다 — 없으면 처음 여는 사람이 **통째로 정전인 화면**을 본다.

### 그 밖에

- 자산 팔레트를 **역할 묶음 7개**(광학·센서·C-UAS·지원·화기·근접·기반)로 나누고,
  카드마다 비용·전력·인원을 함께 적는다. 16종이 한 줄로 흘러가면 고를 수 없다.
- 발전기는 보는 장비가 아니므로 **다른 규약**을 탄다 — 부채꼴도 실효거리도 관측점도
  피드 채널도 없고, 관리 창은 자기 제원 대신 **GP 전원 수지 전체**를 낸다.
- 자산 관리 창에 역할·인원·전력·가시선 요부(要否)가 붙고, 전원이 끊긴 자산은
  「정지」와 그 이유(차단 순위)를 큰 글씨로 말한다.

### 검증

헤드리스 Chrome: 기본 배치가 정전이 아님(1,544W / 5,000W · 연료 44시간) → 팔레트 16종
7그룹 → **야간 짙은 안개에서 EO 6m · TOD 57m 인데 UGS 128m** → 탐조등 3대로 5 kW 초과 →
**우선순위 1(탐조등)만 차단 · 열상은 2.8km 유지 · 차단 자산 실효거리 0 · 상시 감시 참여 0** →
발전기 추가로 전량 복구(10 kW) → 발전기 관리 창(마스트 없음, 가동/정지 있음) →
전 발전기 정지 시 **정전 7개 차단 · 열상 0m · 무전원 화기 K6 는 1.8km 유지**.
도메인 시험 **218건 통과**, JS 오류 0.


---

## v24 — UI/UX 정리: 쌓인 기능이 화면을 먹지 않도록

다섯 번의 기능 추가 끝에 화면이 기능에 잡아먹혔다. 측정부터 했다.

| | 이전 | 이후 |
|---|---|---|
| 사이드바 전체 높이(8개 탭 합) | 16,163px | **10,766px (−33 %)** |
| 감시 탭 | 4,221px · 10섹션 · **46버튼** | **2,668px · 31버튼 (−37 %)** |
| 트윈 탭 | 1,889px | **879px (−53 %)** |
| 화력 탭 | 3,212px | **1,680px (−48 %)** |

### ① 설명 문단은 접어 둔다 — 지우지 않고

이 앱의 문단은 「왜 이 숫자가 이렇게 나오는가」를 적어 둔 것이라 지울 수 없다. 그러나
늘 펼쳐 두면 그것이 화면의 대부분이 된다(감시 탭 한 곳에만 1,278자). **기본 2줄,
눌러서 전문.** 다만 눌러지는 줄 모르면 접은 것이 아니라 지운 것이므로, **실제로 넘친
문단에만** `⌄` 표식을 단다(두 줄짜리 짧은 문단에까지 「더보기」를 달면 그것대로 잡음이다).

이어 붙은 세 문단은 하나로 합쳤다 — 접어 둔 문단이 셋이면 접은 보람이 없다. 접혔을 때
보이는 두 줄이 곧 요약이 되도록 첫 문장을 다시 썼다.

### ② 한 번 쓰고 마는 것은 접어 둔다

기본 접힘 프리셋을 24개로 늘렸다(합동 커버리지 · 축선 시간축 · 자동 배치 · 날씨 스윕 ·
화력 원표 4종 · 렌더링 품질 …). **분석 도구는 한 번 돌려 보는 것**이고, 늘 보는 것은
배치 목록과 전원 수지다. 접힘은 저장되므로 사람이 다시 정하면 그대로 남는다.

### ③ 같은 조작을 두 곳에 두지 않는다

자산 목록 행에 있던 마스트·지향 슬라이더와 「화면 / 이동」 버튼을 걷어냈다 — **전부
관리 창에 있다.** 같은 조작이 두 곳에 있으면 둘 중 하나는 반드시 낡고, 목록은 「무엇이
어떤 상태인가」를 읽는 곳이다. 관제 화면 섹션의 채널 버튼 나열(N개)도 없앴다 — 목록·
관리 창·관제벽이 이미 연다. 그 결과가 46 → 31버튼이다.

### ④ 지도 위의 창들에 자리를 못 박는다

기능마다 구석을 하나씩 차지하다 보니 정작 지형이 안 보였다.

- **상시 감시 로그**는 **기본으로 접힌다** — 검토용이지 늘 켜 두는 계기가 아니다.
  272×29px 머리띠 하나로 남고, 새 사건이 오면 접힌 채로 한 번 뛴다(감시 로그가
  지도 좌측 절반을 398px 로 덮고 있었다).
- **관제벽이 관리 창을 피한다.** 오른쪽 가장자리에 붙은 창의 폭을 재서 그만큼 물러난다 —
  이전에는 마지막 채널이 관리 창 **밑으로 들어가** 영원히 안 보였다.
  창을 끌어 옮기면 가장자리에서 떨어진 것으로 보고 자리를 돌려준다.

### ⑤ 잘린 카드는 스크롤이 아니라 고장으로 읽힌다

자산 팔레트에 높이 상한을 걸었더니 마지막 줄이 **내용 없는 빈 상자**로 잘렸다. 상한을
걷어내고 대신 카드를 4줄 → 3줄로 줄였다(전체 이름·설명은 툴팁으로). 그룹 순서도
카탈로그 선언 순서가 아니라 **손이 가는 순서**로 고정했다 — 멀리 보는 것(광학·센서) →
가까이 막는 것(근접·화기) → 그것들을 돌아가게 하는 것(지원·C-UAS·기반).

목록에 걸린 스크롤 위에 덮어 두었던 가림막도 걷어냈다 — 마지막 행이 반쯤 보여야
「더 있다」가 읽히는데, 가림막이 그 사실을 감췄다.

### 검증

도메인 시험 **218건 통과**, 기능 검증 5개 스위트(광학 시점 · 작전 루프 · 상시 감시 ·
관리/편대 · 자산/전원) 전부 통과, JS 오류 0 — **기능을 하나도 줄이지 않고** 화면만 줄였다.

## v25 — 대지 위의 동(棟): 늘어난 덩어리를 그만두다

### 폴리곤이 아니라 비례가 문제였다

감시탑만 고도화되어 있고 나머지 시설이 로우폴리로 보인다는 지적에서 출발했다.
그런데 렌더를 뜯어 보니 폴리곤 수는 두 번째 문제였다. 첫 번째는 **비례**다.

기존 조립 규약은 캐노니컬 12×8m 셸 하나를 부지 크기로 통째로 늘리는 것이었다.
그런데 부지는 정원(capacity)에서 나온다 — 생활 구역 100명이면 **44.5 × 29.7m** 다.
층고는 3.2m 로 고정이므로 결과는

> **44 × 30 × 6.4m 짜리 납작한 덩어리.**
> 셸이 3.7배로 늘어나 파이프는 타원이 되고 창문은 레터박스가 된다.

여기에 디테일을 아무리 얹어도 「로우폴리 같다」는 인상은 사라지지 않는다.
늘어난 것에 디테일을 얹으면 늘어난 디테일이 될 뿐이다.

### 부지를 「대지」로 다시 읽는다 — 건폐율 방식

부지는 이제 **대지(垈地)** 이고, 그 위에 현실 비례의 **동(棟)** 을 앉힌다.
남는 곳은 앞마당 포장·조명·조경이 채운다. 규칙은 넷이다.

| 규칙 | 값 | 왜 |
|---|---|---|
| 동 깊이 | 8~14m | 14m 를 넘으면 실내에 빛이 안 든다 |
| 동 길이 | 이방성 sx/sy ≤ **1.35** 를 지키는 선 | 넘으면 선홈통이 눈에 띄게 타원이 된다 |
| 동 열 이격 | 6m (열 간) · 4m (같은 열 안) | 채광·소방·신축 이격 |
| 채우는 방향 | 대지 **뒤(+Y)** 부터 | 정면(−Y)이 진입 방향 — 앞마당이 남아야 한다 |

깊이를 **면적 ÷ 폭**으로 먼저 정하면 지휘 구역(19.9×13.3)에서 깊이 7m 짜리 얇은
판이 나온다(셸이 세로로 0.64배 눌린다). 그래서 **깊이를 대지가 허락하는 만큼 먼저
잡고 길이를 면적으로 맞춘다.** 순서를 바꾼 것만으로 이방성이 1.95 → 1.12 가 됐다.

| 시설 (대지) | 결과 |
|---|---|
| 생활 100명 (44.5×29.7) | **14.5×9.2m 동 4채** (2열×2동, 2층) · 배율 1.04×0.83 |
| 지휘 20명 (19.9×13.3) | 13.2×9.3m 동 1채 · 배율 0.94×0.84 |
| 복지 40명 (28.2×18.8) | 20.2×13.1m 동 1채 · 배율 1.44×1.19 |
| 창고 20명 (19.9×13.3) | **이글루 1기 실척** — 늘리지 않는다 |

**비용·토공 산식은 건드리지 않았다.** 그쪽은 여전히 대지 제원으로 계산한다.
바뀐 것은 「그 대지 위에 무엇을 그리는가」 뿐이다.

### 창문이 벽 안에 묻혀 있었다

셸을 다시 구우면서 알게 된 것: 1·2차 셸의 창은 **리세스를 흉내 내려고 유리·프레임을
벽 안쪽 좌표에 두고 있었다.** 벽은 솔리드다. 그래서 그 부품들은 통째로 벽 속에
묻혀 있었고, 화면에 남은 것은 벽에 붙인 검은 사각형 하나뿐이었다.

3차(`build_facilities3.py`)는 개구부를 **불리언 차집합으로 실제로 판다.** 포켓
벽면이 곧 재벌(reveal)이 되어 스스로 그림자를 만든다. 창·현관 포치·롤업 셔터·
급배기 루버가 전부 같은 방식이다.

### 재질 — 베이스컬러 한 장에서 PBR 3매로

- **ORM 배선**: 러프니스·메탈릭은 한 장(R=AO·G=러프·B=메탈)을 `Separate Color` 로
  갈라 물려야 한다. `Color` 를 그대로 Roughness 에 넣으면 glTF 익스포터가 채널을
  못 찾아 텍스처를 버리고 상수로 떨어뜨린다 — 화면에서는 「왜 다 반질반질하지」다.
- **노멀**: 높이필드 기울기에서 생성. 줄눈·골강판·콘크리트 기공이 빛을 받는다.
- **UV**: 프리미티브 기본 UV 는 면 크기를 모른다(13m 벽과 0.05m 볼트가 같은 0~1 을
  쓴다). `smart_project` 후 **UV 면적/메시 면적** 비로 되잡아 1 UV = 2m 로 통일하고
  REPEAT 로 타일링했다.
- **되돌린 것**: 콘크리트에 「위에서 흘러내리는 물때」 그라데이션을 구웠더니, 2m
  타일이 반복되면서 벽 전체에 **가로 줄무늬**가 생겼다. 타일링 텍스처에 방향성
  그라데이션은 넣지 않는다 — 방향성 음영은 처마·실·코니스 지오메트리가 맡는다.

### 산출 31점 (`assets/blender/build_facilities3.py`)

동 셸 11종 `fac_{command,security,living,welfare,hygiene,medical,edu,office,maint,
infra,generic}_{main,roof}` · 반복층 3종 · 실척 단일형 `fac_storage`(탄약고 이글루)
`fac_entry`(위병소) · 대지 `fac_apron`(신축이음·연석·측구) `fac_stem`(기초 플린스) ·
조경 `fac_tree` `fac_bush`.

공통 부품: 리세스 창(재벌·창틀·멀리언·물끊기 실·인방·실내 백플레이트) · 현관 포치
(문·비전패널·푸시바·캐노피·스툽·난간·램프·벽등·명판) · 처마(오버행·페시아·소핏·
반원 물받이·후크) · 파라펫(코핑·난간·스커퍼) · 선홈통(브래킷·슈·그레이팅) ·
옥상 기물(HVAC 가대·환기 스택·케이블 트레이·옥상 해치·케이지 사다리·태양광·물탱크).

옛 스크립트 두 벌은 **실행을 막아 두었다** — 같은 파일명에 옛 규격(캐노니컬 12×8,
개구부 없음)을 덮어써 조용히 망가뜨리기 때문이다. `build_facilities2.py` 는 야외
구획 프롭 키트만 소유하도록 `SUPERSEDED_BY_V3` 로 갈랐다.

### 검증

`scripts/shoot-facilities.mts` — 헤드리스 Chrome + CDP(Playwright 패키지 없이 Node 24
내장 WebSocket 으로). 시설 6종을 실제 배치 API 로 놓고 동 수·셸 배율을 숫자로 찍은 뒤
카메라를 옮겨 스크린샷을 남긴다. **계획 저장 API 는 막는다** — 처음엔 막지 않아
검증용 시설 12개가 `data/plans` 에 새 계획으로 눌러앉았다(지웠다).

회귀 시험 **222건 통과**(신설 4건): ① 대지가 아무리 커져도 셸 배율 0.6~1.6 · 이방성
≤1.36 ② 동이 대지 경계를 넘지 않고, 대지가 커지면 **동 수가 는다** ③ 건폐율이
22~68% 안에 머문다 ④ 실척 단일형은 배율 1.0 을 유지하고 **개수로** 는다.

## v26 — 매싱: 직육면체를 그만두다

v25 에서 창을 진짜로 파고 PBR 을 입혔는데도 「로우폴리 같다」가 남았다. 이유는 단순했다.

> **어느 각도에서 봐도 실루엣이 사각형이었다.**
> 창을 아무리 정교하게 파도 덩어리가 박스 하나면 박스로 읽힌다.

### 동을 여러 볼륨으로 짠다

| 볼륨 | 크기 | 하는 일 |
|---|---|---|
| 계단실 타워 | 3.7 × 4.8m, 정면 0.95m 돌출 | 지붕선을 끊고 주출입구를 만든다 |
| 옥탑 (penthouse) | 타워 위 2.55m | 지붕 위로 한 단 더 올라간다 |
| 정면 회랑 | 깊이 1.7~1.9m, 기둥 3~4본 | 벽 앞에 한 겹을 세워 그림자를 만든다 |
| 부속 저층동 | 4.4 × 3.2 × 2.5m | 처마 높이를 둘로 가른다 |

타워는 `main`·`floor`·`roof` **세 GLB 에 걸쳐 이어진다.** `fac_floor.glb` 를 여러 타입이
공유하므로 X 위치(`TWX`)가 상수여야 한다 — 어긋나면 2층부터 타워가 옆으로 밀린 채
쌓인다. 계단실이 곧 주출입구라 건축적으로도 맞다.

**되돌린 것**: 처음엔 타워 깊이를 주동 전체(11.7m)로 잡았다. 결과는 건물 앞뒤를
가로지르는 흰 슬래브 한 장 — 「계단실」이 아니라 「벽」으로 읽혔다. 계단 한 세트가
들어가는 4.8m 로 줄이니 그제야 정면에 붙은 볼륨이 됐다.

### 지붕을 진짜 경사면으로

「평판 + 용마루 상자」는 위에서 보면 그럴듯하지만 옆에서 보면 판때기다. 박스만으로는
삼각형을 못 만들어서 `polyprism()`(2D 폴리곤 → 각기둥)을 넣고, 두 경사면 + **삼각 박공
벽** + 용마루 캡 + 처마 페시아 + 반원 물받이 + 눈막이 + **징크 돌출 심(0.55m 간격)** 으로
다시 지었다.

### 파사드 깊이 · 실내

- **차양(sunshade)** — 창 위 0.52m 알루미늄 루버 + 브래킷 2본. 짙은 그림자 선을 만드는
  가장 값싼 부재다.
- **수평 띠장** — 층 경계에 0.07m 돌출 밴드.
- **화강석 걸레받이** — 벽 하부 0.9m 를 다른 재질로. 벽면에 층이 생긴다.
- **유리 뒤 실내** — 검은 백플레이트 한 장은 가까이서 보면 스티커다. 0.1m 두께 안에
  안쪽 벽 · 천장 · 바닥 · **형광등(발광)** · 캐비닛/책상+모니터 실루엣 · 반쯤 내린
  블라인드를 깔았다. 창당 5~7 프리미티브로 눈은 「방이 있다」로 읽는다. 가구 종류는
  창 인덱스 해시로 정해 다시 구워도 같은 창에 같은 가구가 놓인다.

### 재질

베이스컬러 512px 로 올리고 **화강석 · 치장 벽돌(0.215×0.075 코스, 반 장 엇갈림) ·
징크 평판** 3종을 추가했다. 타입별로 재질이 갈린다 — 교육·복지는 벽돌, 지휘·경계는
노출 콘크리트, 생활·정비는 패널, 의무·위생은 백색 패널.

**되돌린 것**: 카탈로그 UI 색을 그대로 도장에 썼더니 회색 콘크리트 옆에서 형광
플라스틱으로 빛났다. UI 색은 어두운 패널 위에서 읽히려고 채도가 높다. 휘도 쪽으로
28% 당기고 러프니스를 0.45 → 0.62 로 올려 「칠한 금속」으로 낮췄다(`_mute()`).

### 대지 — 마당이 마당이 되게

동 배치가 대지 깊이를 끝까지 먹어서 정면에 이격 폭(1~4m)만 남고 있었다. 화단도
표지석도 들어갈 자리가 없었다. 이제 **앞마당을 먼저 떼어 둔다**(`uD×0.16`, 3.4~6.5m).
다만 그 때문에 동이 9m 보다 얇아지면 마당을 도로 줄인다 — 얇은 판보다 좁은 마당이 낫다.

신규 실척 프롭 4점: `fac_planter`(연석+흙+관목 4) · `fac_arcade`(연결 회랑 1스팬 3.6m) ·
`fac_sitesign`(부대 표지석+안내판+투광) · `fac_bikerack`(거치대+자전거 2대).
런타임(`sitework`/`linkArcade`)이 진입부 표지석 · 화단 띠 · 자전거 거치대(상주 시설만) ·
조경수를 놓고, 동이 둘 이상이면 그 사이를 회랑으로 잇는다. 전부 실척이라 대지가
커지면 개수가 늘 뿐이다.

### 수치

| | v24 이전 | v25 | v26 |
|---|---|---|---|
| 셸 폴리 (main) | 3.3k | 3.5k | **4.4~7.9k** |
| 셸 텍스처 | 베이스 1매 256px | 3매 PBR 256px | **3매 PBR 512px** |
| 시설 에셋 총량 | 4MB | 12MB | **40MB** |
| 생활 100명 동 배율 | 3.71 (등방 아님) | 1.04×0.83 | **1.26×1.27** (이방성 1.01) |

에셋 총량이 40MB 다. Cesium 은 URL 로 텍스처를 공유하므로 GLB 종류(35개)만큼만
VRAM 을 먹지만, 가벼운 기기에서 문제가 되면 `build_facilities3.py` 의 `N = 512` 한 줄을
256 으로 내리면 절반이 된다 — 형상은 그대로다.

도메인 시험 **238건 통과**, 타입체크 통과, 헤드리스 CDP 검증 재실행.

## v27 — 부지 일체화: 건물이 아니라 건물 사이가 문제였다

시설 3D 를 세 번 고도화하고도 「만든 티」가 가시지 않았다. 그래서 **측정부터** 했다 —
앱 안에서 26m 거리로 한 동을 찍어 Blender 렌더와 나란히 놓았다.

> 근접에서는 멀쩡했다. 색·유리·실내 조명·회랑이 다 살아 있었다.
> **블룸/HDR 이 에셋을 죽인다는 가설은 틀렸다.**

문제는 건물이 아니라 **건물 사이**였다.

### ① 플린스가 옹벽 노릇을 하고 있었다

`fac_stem.glb` 는 정지 마감고에서 최저 지반까지 통째로 내려가는 상자였고, 깊이 제한이
**40m** 였다. 경사지에서 그건 사방 20m 짜리 수직 콘크리트 벽이다 — 화면에서 「떠 있는
판」으로 읽힌 원인이 이것이었다. 실제 토목은 그 높이를 옹벽으로 세우지 않는다.
**비탈면을 깎고 쌓는다.**

역할을 바꿨다. 플린스는 진짜 기초가 하는 만큼(**≤3m**)만 내려가고, 나머지 높이는
새 모듈 `siteWorks.ts` 의 **정지 비탈면**이 흙으로 메운다.

비탈면은 풋프린트 둘레 48 점에서 각각 바깥으로 행진하며 **배수경사 1:1.5 가 자연
지반과 만나는 점(비탈끝)** 을 찾는다. 절토 쪽은 첫 걸음에 지반이 이미 높아 런이 0 이
되고, 성토 쪽만 흘러내린다 — 한 시설의 네 면이 저마다 다른 길이로 퍼진다.

**되돌린 것**: 처음엔 top→toe 한 장의 사각 스트립이었다. 20m 를 한 면으로 흘리니
비탈면이 아니라 검은 벽 한 장이었다. 실무대로 **5m 마다 소단(berm) 1.6m** 를 넣고
7 줄짜리 격자 메시로 바꾸니 그제야 「깎아 만든 땅」으로 읽혔다. 26m 를 나가도 지반을
못 만나면 그 자리에서 수직으로 떨어뜨려 닫는다 — 안 닫으면 스커트 끝이 공중에 뜬다.

### ② 접근로가 분석용 폴리라인이었다

도로 기능은 있었지만 색 선이었고, `_computeRoadGraph()` 가 **GP 정밀지형에서만** 돌았다
(통행 등급 판정이 GLB 표면 기준이라 그렇다). 물리 도로는 위성 지형에서도 깔려야 하므로
`siteWorks` 가 자체 MST 를 계산한다 — 감시탑을 허브로 시설을 잇고, 각 간선을 6m 간격으로
지형에 드레이프해 **폭 4.2m 리본 메시**를 뜬다. 노면 텍스처(노견·차선·중앙 파선·바퀴
자국)를 진행 방향 8m 마다 반복시킨다. 종단경사 17° 초과 구간은 폭 1.8m 보도로 좁힌다.

### ③ 둘러싸는 것도, 축척을 알려 주는 것도 없었다

- **외곽 울타리** — 부지 경계 링을 지형 높이로 220 점 샘플해 `WallGeometry` 로 세우고
  철망 알파 텍스처(마름모 + 상단 3 선 철조망 + 지주)를 입힌다. 진입로가 나가는 방위에서
  링을 끊고 **정문**(`site_gate.glb` — 화강석 문주·양개 철문·차단봉·과속방지턱)을 앉힌다.
- **축척 피규어** — `fac_person_a/b.glb`(778 face, 1.75m, 소총 걸이). 사람이 하나도 없으면
  14m 짜리 동과 40m 짜리 동이 눈으로 구분되지 않는다. 앞마당에 1~2 명, 큰 대지엔 차량 1 대.

### 검증에서 걸린 것들

- **`window.__gp.placer` 가 생겼다고 부팅이 끝난 게 아니다.** placer 는 중반에 생기고
  그 뒤로 접근로 준비·지형 모델 생성이 남는다. 여기서 멈춘 하네스는 `realTerrain 없음`
  을 봤다. 마지막에 만들어지는 `siteWorks` 를 기다리도록 고쳤다.
- **지형 모드를 바꾸면 뷰어가 자체 flyTo 를 건다.** 취소하지 않으면 그 비행이 `setView`
  를 덮어써 3,416m 상공의 빈 화면이 찍힌다. `camera.cancelFlight()` 를 먼저 부른다.
- **위성 지형 모드에서는 스커트가 거짓으로 커진다.** 그 모드의 시설 표고는 실제 렌더
  표면이 아니라 `cost.pad` 에서 오기 때문이다. 접지가 의미를 갖는 무대는 GP 정밀지형이다.

### 결과 (GP 정밀지형 · 시설 6종)

비탈면 18 · 접근로 6 · 울타리 2 구간 · 축척 피규어 33 · 정문 1.
신규 산출물: `site_gate.glb` · `fac_person_a/b.glb` · 부지 텍스처 3 장
(`site_chainlink.png` · `site_road.png` · `site_slope.png`).

타입체크 통과, `facilityModels` 10건 전부 통과(플린스 계약 시험을 새 역할 분담으로 갱신).
