# -*- coding: utf-8 -*-
"""
GP Digital Twin 배치 시설 3차 — 「동(棟) 단위」 고밀도 셸 재제작
  blender --background --factory-startup --python build_facilities3.py

왜 다시 굽는가
──────────────
1차·2차 셸은 캐노니컬 12×8 을 부지 크기로 통째로 늘리는 계약이었다. 그런데 부지는
정원(capacity)에서 나온다 — 생활 구역 100 명이면 44.5 × 29.7 m 다. 층고는 3.2 m 로
고정이므로 결과는 3.7 배로 부푼 **44 × 30 × 6.4 m 짜리 납작한 덩어리**였다. 파이프는
타원이 되고 창문은 레터박스가 됐다. 폴리곤 수가 문제가 아니라 **비례**가 문제였다.

그래서 계약을 바꾼다. 부지는 이제 「대지」이고, 그 위에 **현실 비례의 동**을 앉힌다
(buildingModels.ts 의 blockPlan — 건폐율 방식). 동의 크기는 대지가 아무리 커져도
길이 10~24 m · 깊이 7~15 m 안에 머문다. 그러므로 셸 캐노니컬을 그 한가운데인
**14(X) × 11(Y) m, 층고 3.2 m** 로 잡으면 실제 스케일은 0.7~1.4 배, 이방성(sx/sy)은
1.4 배 이내에 갇힌다. 이 범위에서는 창·파이프·처마를 셸에 구워 넣어도 무너지지 않는다.

무엇을 올렸는가
──────────────
재질   베이스컬러만 쓰던 것을 **베이스 + ORM(러프니스·메탈릭) + 노멀** 3매 PBR 로.
       노멀은 높이필드의 기울기에서 만든다 — 줄눈·골강판·콘크리트 기공이 빛을 받는다.
UV     프리미티브 기본 UV 는 면 크기와 무관해 텍셀 밀도가 제각각이었다(13 m 벽과
       0.3 m 트림이 같은 UV 면적을 쓴다). smart_project 후 **UV 면적/메시 면적**으로
       스케일을 되잡아 1 UV = 2 m 로 통일하고 REPEAT 로 타일링한다.
형상   창은 벽에 붙인 검은 사각형이 아니라 **리세스(0.14 m 깊이) + 4 면 재벌 + 프레임
       + 멀리언 + 물끊기 실 + 안쪽 어두운 백플레이트**다. 지붕은 **처마 오버행 +
       페시아 + 소핏 + 반원 물받이 + 선홈통(브래킷·슈 포함)**이 붙는다. 벽에는
       굽도리·코너 필라스터·전선관·정션박스·벽등·명판이 붙어 실루엣을 깬다.
검증   assets/blender/render_fac3_*.png — 동 단위 컨택트시트 + 근접 파사드.

산출 (원점 = 지면 중심, 정면 −Y, 캐노니컬 14 × 11)
  동 셸   fac_{command,security,living,welfare,hygiene,medical,edu,office,maint,infra,
          generic}_{main,roof}.glb
  반복층  fac_floor.glb · fac_office_floor.glb · fac_security_floor.glb
  실척물  fac_storage.glb (탄약고 이글루) · fac_entry.glb (위병소) — 늘리지 않는다
  대지    fac_apron.glb (포장 앞마당 12×8 캐노니컬) · fac_stem.glb (기초 플린스)
  조경    fac_tree.glb · fac_bush.glb
"""
import bpy, bmesh, math, os, sys, traceback
import numpy as np
import mathutils

OUT = r'C:\Users\USER\orca\projects\gp-optimizer\assets\models'
RND = r'C:\Users\USER\orca\projects\gp-optimizer\assets\blender'
PBR_DIR = r'C:\Users\USER\orca\projects\gp-optimizer\assets\textures\pbr'  # scripts/fetch-polyhaven-textures.mts 산출물, 옵트인

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# 캐노니컬 — buildingModels.ts CANON_BLOCK 과 반드시 일치
LEN, DEP, H = 14.0, 11.0, 3.2       # 동 길이(X) · 깊이(Y) · 층고
WL, WD = LEN - 0.6, DEP - 0.6       # 벽체 (0.3 m 앞치마에 소품·물받이)
PAD_W, PAD_D = 12.0, 8.0            # 대지 패드류 캐노니컬 (기존 fac_yard_* 와 동일)
UV_TILE = 2.0                       # 1 UV 단위 = 2 m

# ═══════════════════════ 텍스처 (numpy 프로시저럴) ═══════════════════════
def srgb(hexs):
    h = hexs.lstrip('#')
    return tuple(((int(h[i:i + 2], 16) / 255.0) ** 2.2) for i in (0, 2, 4))

def _smooth(g, it=2):
    for _ in range(it):
        g = (g + np.roll(g, 1, 0) + np.roll(g, -1, 0) + np.roll(g, 1, 1) + np.roll(g, -1, 1)) / 5
    return g

def noise2d(n, octaves=(4, 8, 16, 32), seed=1, persist=0.55):
    """타일링 fBm — np.kron 으로 격자를 확대하므로 좌우·상하가 자연히 이어진다."""
    rng = np.random.default_rng(seed)
    acc = np.zeros((n, n), dtype=np.float32)
    amp, tot = 1.0, 0.0
    for o in octaves:
        o = max(2, min(o, n))
        g = _smooth(rng.random((o, o)).astype(np.float32), 2)
        acc += amp * np.kron(g, np.ones((n // o + 1, n // o + 1), dtype=np.float32))[:n, :n]
        tot += amp
        amp *= persist
    acc /= tot
    acc -= acc.min()
    return acc / max(1e-6, acc.max())

def pack_image(name, arr, non_color=False):
    """arr: (H,W,4) float — 컬러는 씬 리니어, 데이터맵(ORM/노멀)은 원시값."""
    im = bpy.data.images.new(name, arr.shape[1], arr.shape[0], alpha=True,
                             float_buffer=non_color)
    if non_color:
        im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(np.ascontiguousarray(arr[::-1], dtype=np.float32).ravel())
    im.pack()
    return im

def _load_pbr(slug):
    """PBR_DIR/<slug>/{color,orm,normal}.jpg 가 있으면 그 실사 PolyHaven PBR을 로드해
    (베이스, ORM, 노멀) 튜플로 반환한다 — pack_image/orm_map/normal_map 이 절차적으로
    만드는 것과 같은 모양이다. 파일이 없으면 None을 돌려주고, 호출부(tex_concrete 등)는
    그대로 numpy 절차적 생성으로 폴백한다. scripts/fetch-polyhaven-textures.mts 로 받는다."""
    d = os.path.join(PBR_DIR, slug)
    color_p, orm_p, nrm_p = (os.path.join(d, n) for n in ('color.jpg', 'orm.jpg', 'normal.jpg'))
    if not (os.path.isfile(color_p) and os.path.isfile(orm_p) and os.path.isfile(nrm_p)):
        return None
    base = bpy.data.images.load(color_p, check_existing=True)
    base.pack()
    orm = bpy.data.images.load(orm_p, check_existing=True)
    orm.colorspace_settings.name = 'Non-Color'
    orm.pack()
    nrm = bpy.data.images.load(nrm_p, check_existing=True)
    nrm.colorspace_settings.name = 'Non-Color'
    nrm.pack()
    return (base, orm, nrm)

def to_rgba(rgb, a=1.0):
    out = np.zeros((*rgb.shape[:2], 4), dtype=np.float32)
    out[..., :3] = rgb
    out[..., 3] = a
    return out

_PBR_LUM_CACHE = {}

def _load_pbr_luminance(slug, n=None):
    """PBR_DIR/<slug>/color.jpg 를 흑백 휘도 n×n 배열(0~1 정규화)로 리샘플해 돌려준다 —
    noise2d() 자리에 그대로 꽂아 절차적 패턴을 실사 얼룩(줄눈·오염 자국)으로 바꾼다.
    이렇게 하면 tex_panel() 자신의 seam/height/rough 조합식은 그대로 두고 '재료'만
    사진으로 바꿀 수 있다 — 건물별 틴트(hexs)는 호출부가 그대로 입힌다. 파일이 없으면
    None(호출부는 noise2d() 로 폴백)."""
    n = n or N
    key = (slug, n)
    if key in _PBR_LUM_CACHE:
        return _PBR_LUM_CACHE[key]
    color_p = os.path.join(PBR_DIR, slug, 'color.jpg')
    if not os.path.isfile(color_p):
        return None
    src = bpy.data.images.load(color_p, check_existing=True)
    w, h = src.size
    px = np.array(src.pixels[:], dtype=np.float32).reshape(h, w, 4)
    bpy.data.images.remove(src)
    lum = px[..., 0] * 0.2126 + px[..., 1] * 0.7152 + px[..., 2] * 0.0722
    if (h, w) != (n, n):
        yi = np.linspace(0, h - 1, n).astype(np.int32)
        xi = np.linspace(0, w - 1, n).astype(np.int32)
        lum = lum[yi][:, xi]
    lum = lum - lum.min()
    lum = lum / max(1e-6, lum.max())
    _PBR_LUM_CACHE[key] = lum
    return lum

def _half(a):
    return a[::2, ::2] if a.ndim == 2 and a.shape[0] > 128 else a

def orm_map(name, rough, metal=None, ao=None):
    """glTF 계약: R=AO, G=러프니스, B=메탈릭 한 장 (Separate Color 로 물린다).

    데이터맵은 절반 해상도로 굽는다 — 러프니스·메탈릭은 저주파라 128 px 로 충분하고,
    셸 GLB 마다 텍스처가 통째로 임베드되므로 파일 크기에 그대로 곱해진다.
    """
    rough, metal, ao = _half(rough), (metal if metal is None else _half(metal)), (ao if ao is None else _half(ao))
    n = rough.shape[0]
    img = np.zeros((n, n, 4), dtype=np.float32)
    img[..., 0] = 1.0 if ao is None else ao
    img[..., 1] = rough
    img[..., 2] = 0.0 if metal is None else metal
    img[..., 3] = 1.0
    return pack_image(name, img, non_color=True)

def normal_map(name, height, strength=1.6):
    """높이필드 → 접선공간 노멀. np.gradient 는 순환하지 않으므로 roll 로 감싼다."""
    h = _half(height).astype(np.float32)
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    nx, ny = -gx * strength * h.shape[0] / 64.0, -gy * strength * h.shape[0] / 64.0
    nz = np.ones_like(h)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    img = np.zeros((*h.shape, 4), dtype=np.float32)
    img[..., 0] = nx / ln * 0.5 + 0.5
    img[..., 1] = ny / ln * 0.5 + 0.5
    img[..., 2] = nz / ln * 0.5 + 0.5
    img[..., 3] = 1.0
    return pack_image(name, img, non_color=True)

N = 512          # 베이스컬러 해상도. ORM·노멀은 orm_map/normal_map 이 절반으로 굽는다.


def tex_concrete():
    """노출 콘크리트 — 기공·거푸집 이음.

    타일링 텍스처에 「위에서 아래로 흐르는 물때」 같은 **방향성 그라데이션을 구워 넣으면
    안 된다**. 텍스처는 2 m 마다 반복되므로 그라데이션도 2 m 마다 반복되고, 벽에는
    누구도 의도하지 않은 가로 줄무늬가 생긴다 — 첫 렌더에서 실제로 그렇게 나왔다.
    오염은 방향 없는 얼룩으로만 넣고, 방향성 음영은 지오메트리(처마·실·코니스)에 맡긴다.
    """
    pbr = _load_pbr('concrete')
    if pbr:
        return pbr
    f = noise2d(N, (4, 16, 64), seed=3)
    blotch = noise2d(N, (4, 8, 16), seed=17)
    pit = _smooth((np.random.default_rng(4).random((N, N)) > 0.9955).astype(np.float32), 1)
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    u, v = xx / N * UV_TILE, yy / N * UV_TILE
    form = ((np.abs((u % 1.2) - 0.6) < 0.028) | (np.abs((v % 2.4) - 1.2) < 0.022)).astype(np.float32)
    base = np.array(srgb('#9a968f'), dtype=np.float32)
    shade = 0.84 + 0.24 * f - 0.30 * pit - 0.12 * form - 0.16 * blotch
    rgb = base[None, None, :] * shade[..., None]
    height = f * 0.35 - pit * 1.0 - form * 0.85
    rough = np.clip(0.84 + 0.12 * f + 0.10 * pit + 0.08 * blotch, 0.25, 1.0)
    return (pack_image('t3_conc', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('t3_conc_orm', rough), normal_map('t3_conc_nrm', height, 1.1))

def tex_panel(name, hexs, seam_m=1.2, dirt=0.22):
    """샌드위치 패널 — seam_m 간격 줄눈 + 방향 없는 얼룩 (그라데이션 금지, tex_concrete 참조).

    미세 얼룩(f)은 PBR_DIR 에 실사 텍스처가 있으면 그 휘도를 쓴다 — 줄눈·굽도리 같은
    지오메트리성 형상은 그대로 절차적으로 굽고, '재료가 실제 사진처럼 보이는가'만
    사진으로 바꾸는 것. 건물마다 다른 hexs 틴트는 이 함수가 그대로 입힌다."""
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    u, v = xx / N * UV_TILE, yy / N * UV_TILE
    seam = (np.abs((u % seam_m) - seam_m / 2) < 0.022).astype(np.float32)
    hseam = (np.abs((v % (seam_m * 2.5)) - seam_m * 1.25) < 0.016).astype(np.float32)
    f = _load_pbr_luminance('painted_plaster_wall')
    if f is None:
        f = noise2d(N, (8, 32), seed=15)
    blotch = np.clip(noise2d(N, (4, 8, 16), seed=19) - 0.5, 0, 1) * dirt * 2.4
    base = np.array(srgb(hexs), dtype=np.float32)
    rgb = base[None, None, :] * (0.96 + 0.09 * f - 0.30 * seam - 0.20 * hseam)[..., None]
    rgb *= (1.0 - blotch * 0.5)[..., None]
    height = -seam * 1.0 - hseam * 0.65 + f * 0.10
    rough = np.clip(0.50 + 0.12 * f + 0.26 * blotch + 0.18 * seam, 0.2, 1.0)
    metal = np.full_like(rough, 0.12)
    return (pack_image('t3_' + name, to_rgba(np.clip(rgb, 0, 1))),
            orm_map('t3_' + name + '_orm', rough, metal),
            normal_map('t3_' + name + '_nrm', height, 1.8))

def tex_roofmetal():
    """골강판 — 76 mm 피치 사인 골 + 볼트 자국 + 녹 얼룩."""
    pbr = _load_pbr('corrugated_iron')
    if pbr:
        return pbr
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    u = xx / N * UV_TILE
    rib = np.sin(u * math.pi * 2 / 0.24) * 0.5 + 0.5
    f = noise2d(N, (8, 32), seed=21)
    rust = np.clip(noise2d(N, (4, 8), seed=27) - 0.80, 0, 1) * 1.6
    base = np.array(srgb('#69737a'), dtype=np.float32)
    rust_c = np.array(srgb('#6b5540'), dtype=np.float32)
    rgb = base[None, None, :] * (0.72 + 0.34 * rib + 0.10 * f)[..., None]
    rgb = rgb * (1 - rust[..., None]) + rust_c[None, None, :] * rust[..., None]
    height = rib * 1.0 + f * 0.06
    rough = np.clip(0.36 + 0.16 * f + 0.45 * rust, 0.2, 1.0)
    metal = np.clip(0.85 - 0.7 * rust, 0.0, 1.0)
    return (pack_image('t3_roofm', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('t3_roofm_orm', rough, metal), normal_map('t3_roofm_nrm', height, 2.4))

def tex_paving():
    """앞마당 포장 — 4 m 신축이음 격자 + 빗자루 마감 결."""
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    u, v = xx / N * UV_TILE, yy / N * UV_TILE
    joint = ((np.abs((u % 2.0) - 1.0) < 0.02) | (np.abs((v % 2.0) - 1.0) < 0.02)).astype(np.float32)
    broom = (np.sin(v * math.pi * 2 / 0.02) * 0.5 + 0.5) * 0.025
    f = noise2d(N, (4, 16, 64), seed=33)
    base = np.array(srgb('#8a8880'), dtype=np.float32)
    rgb = base[None, None, :] * (0.82 + 0.26 * f - 0.34 * joint - broom)[..., None]
    height = -joint * 1.0 + f * 0.25
    rough = np.clip(0.88 + 0.10 * f + 0.06 * joint, 0.3, 1.0)
    return (pack_image('t3_pave', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('t3_pave_orm', rough), normal_map('t3_pave_nrm', height, 1.0))

def tex_camo():
    cols = [srgb('#4a5240'), srgb('#333b2c'), srgb('#5c5744'), srgb('#23281e')]
    f = _smooth(np.random.default_rng(7).random((N // 12, N // 12)).astype(np.float32), 3)
    idx = np.digitize(f, np.quantile(f, [0.28, 0.55, 0.8]))
    small = np.zeros((*f.shape, 3), dtype=np.float32)
    for i, c in enumerate(cols):
        small[idx == i] = c
    rgb = np.kron(small, np.ones((12, 12, 1), dtype=np.float32))[:N, :N]
    g = noise2d(N, (16, 64), seed=44)
    rough = np.clip(0.78 + 0.16 * g, 0.3, 1.0)
    return (pack_image('t3_camo', to_rgba(rgb)), orm_map('t3_camo_orm', rough),
            normal_map('t3_camo_nrm', g * 0.2, 0.8))

def tex_earth():
    f = noise2d(N, (4, 16, 64), seed=11)
    base = np.array(srgb('#5d5a42'), dtype=np.float32)
    rgb = base[None, None, :] * (0.7 + 0.5 * f)[..., None]
    return (pack_image('t3_earth', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('t3_earth_orm', np.full((N, N), 0.97, dtype=np.float32)),
            normal_map('t3_earth_nrm', f, 1.6))

def tex_gravel():
    f = noise2d(N, (32, 64, 128), seed=41)
    base = np.array(srgb('#5b564a'), dtype=np.float32)
    rgb = base[None, None, :] * (0.62 + 0.72 * f)[..., None]
    return (pack_image('t3_gravel', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('t3_gravel_orm', np.clip(0.9 + 0.1 * f, 0, 1)),
            normal_map('t3_gravel_nrm', f, 2.2))

def flat_tex(name, hexs, N2=64):
    """단색 타일 (도색 금속류) — 미세 결만."""
    f = noise2d(N2, (8, 32), seed=hash(name) % 9973)
    base = np.array(srgb(hexs), dtype=np.float32)
    rgb = base[None, None, :] * (0.94 + 0.12 * f)[..., None]
    return pack_image('t3f_' + name, to_rgba(np.clip(rgb, 0, 1)))

def tex_granite():
    """화강석 걸레받이 — 잔다듬 마감. 벽 하부 0.9m 를 다른 재질로 두르면 층이 생긴다."""
    f = noise2d(N, (16, 64, 256), seed=61)
    speck = (np.random.default_rng(62).random((N, N)) > 0.986).astype(np.float32)
    dark = (np.random.default_rng(63).random((N, N)) > 0.991).astype(np.float32)
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    u, v = xx / N * UV_TILE, yy / N * UV_TILE
    joint = ((np.abs((u % 0.9) - 0.45) < 0.012) | (np.abs((v % 0.9) - 0.45) < 0.012)).astype(np.float32)
    base = np.array(srgb('#6f6d6a'), dtype=np.float32)
    rgb = base[None, None, :] * (0.80 + 0.34 * f - 0.35 * joint)[..., None]
    rgb += speck[..., None] * 0.16
    rgb -= dark[..., None] * 0.12
    height = f * 0.45 + speck * 0.5 - joint * 1.0
    rough = np.clip(0.62 + 0.20 * f + 0.14 * joint, 0.2, 1.0)
    return (pack_image('t3_granite', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('t3_granite_orm', rough), normal_map('t3_granite_nrm', height, 1.4))

def tex_brick():
    """치장 벽돌 — 0.21×0.06 코스, 줄눈 6mm. 교육·복지동에 재질 대비를 준다.

    tone(미세 얼룩)은 PBR_DIR 에 실사 벽돌 사진이 있으면 그 휘도를 쓴다 — tex_panel()과
    같은 패턴. 코스·줄눈·엇쌓기는 여전히 절차적이라 실제 벽 치수에 정확히 맞는다."""
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    u, v = xx / N * UV_TILE, yy / N * UV_TILE
    ch, cw = 0.075, 0.215                                   # 코스 높이 · 벽돌 길이
    row = np.floor(v / ch)
    ushift = u + (row % 2) * (cw / 2)                       # 반 장 엇갈림
    mortar = ((np.abs((v % ch) - ch / 2) > ch / 2 - 0.009) |
              (np.abs((ushift % cw) - cw / 2) > cw / 2 - 0.009)).astype(np.float32)
    tone = _load_pbr_luminance('red_brick')
    if tone is None:
        tone = noise2d(N, (16, 64), seed=71)
    brickvar = _smooth(np.random.default_rng(72).random((N // 8, N // 8)).astype(np.float32), 1)
    brickvar = np.kron(brickvar, np.ones((8, 8), dtype=np.float32))[:N, :N]
    base = np.array(srgb('#8d5a48'), dtype=np.float32)
    mort = np.array(srgb('#a8a49b'), dtype=np.float32)
    rgb = base[None, None, :] * (0.74 + 0.42 * brickvar + 0.12 * tone)[..., None]
    rgb = rgb * (1 - mortar[..., None]) + mort[None, None, :] * 0.85 * mortar[..., None]
    height = -mortar * 1.0 + tone * 0.15
    rough = np.clip(0.72 + 0.16 * tone + 0.14 * mortar, 0.3, 1.0)
    return (pack_image('t3_brick', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('t3_brick_orm', rough), normal_map('t3_brick_nrm', height, 2.2))

def tex_zinc():
    """징크 평판 — 돌출 심(seam)은 지오메트리로 얹으므로 여기선 판면만 만든다."""
    f = noise2d(N, (8, 32, 128), seed=81)
    streakless = noise2d(N, (4, 16), seed=83)
    base = np.array(srgb('#7c8489'), dtype=np.float32)
    rgb = base[None, None, :] * (0.86 + 0.18 * f + 0.06 * streakless)[..., None]
    height = f * 0.18
    rough = np.clip(0.30 + 0.22 * f + 0.10 * streakless, 0.15, 0.9)
    metal = np.full((N, N), 0.72, dtype=np.float32)
    return (pack_image('t3_zinc', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('t3_zinc_orm', rough, metal), normal_map('t3_zinc_nrm', height, 0.9))

def tex_redcross(n=256):
    img = np.ones((n, n, 4), dtype=np.float32)
    img[..., :3] = srgb('#e8e6e0')
    red = srgb('#c8102e')
    t = n // 5
    img[2 * t:3 * t, t // 2:n - t // 2, :3] = red
    img[t // 2:n - t // 2, 2 * t:3 * t, :3] = red
    return pack_image('t3_redx', img)

def tex_stripes(n=64):
    img = np.zeros((n, n, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:n, 0:n]
    band = ((xx + yy) // 8) % 2 == 0
    img[band, :3] = srgb('#e07a24')
    img[~band, :3] = srgb('#191919')
    img[..., 3] = 1.0
    return pack_image('t3_stripes', img)

CONC = tex_concrete()
PANEL = tex_panel('panel', '#a8b09c')
PANELW = tex_panel('panelw', '#d5d8d0', seam_m=1.0, dirt=0.16)
PANELB = tex_panel('panelb', '#7d8a94', seam_m=1.5, dirt=0.26)
ROOFM = tex_roofmetal()
PAVE = tex_paving()
GRANITE, BRICK, ZINC = tex_granite(), tex_brick(), tex_zinc()
CAMOT = tex_camo()
EARTH = tex_earth()
GRAVEL = tex_gravel()
REDX, STRIPES = tex_redcross(), tex_stripes()

# ═══════════════════════ 재질 ═══════════════════════
def _alpha_blend(m):
    for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
        try:
            setattr(m, attr, val)
        except Exception:
            pass

def _bsdf(m):
    return m.node_tree.nodes['Principled BSDF']

def mk_mat(name, color, metallic=0.0, rough=0.6, alpha=1.0, emit=None, emit_str=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = _bsdf(m)
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    b.inputs['Alpha'].default_value = alpha
    if emit is not None:
        b.inputs['Emission Color'].default_value = (*emit, 1.0)
        b.inputs['Emission Strength'].default_value = emit_str
    if alpha < 1.0:
        _alpha_blend(m)
    return m

def pbr_mat(name, pack, alpha=1.0, rough_mul=None, metal_fix=None):
    """(base, orm, nrm) 3매를 glTF 가 알아보는 배선으로 묶는다.

    러프니스·메탈릭은 반드시 **한 장의 ORM 을 Separate Color 로 갈라** 물려야 한다.
    Color 출력을 그대로 Roughness 에 넣으면 glTF 익스포터가 채널을 못 찾아 텍스처를
    통째로 버리고 상수로 떨어뜨린다 — 화면에서는 '왜 다 반질반질하지' 로 나타난다.
    """
    base, orm, nrm = pack
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = _bsdf(m)
    tb = nt.nodes.new('ShaderNodeTexImage'); tb.image = base; tb.location = (-700, 300)
    nt.links.new(tb.outputs['Color'], b.inputs['Base Color'])
    to = nt.nodes.new('ShaderNodeTexImage'); to.image = orm; to.location = (-700, 0)
    sep = nt.nodes.new('ShaderNodeSeparateColor'); sep.location = (-420, 0)
    nt.links.new(to.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], b.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], b.inputs['Metallic'])
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nrm; tn.location = (-700, -320)
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.location = (-420, -320)
    nm.inputs['Strength'].default_value = 1.0
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    if metal_fix is not None:
        nt.links.remove(b.inputs['Metallic'].links[0])
        b.inputs['Metallic'].default_value = metal_fix
    if alpha < 1.0:
        b.inputs['Alpha'].default_value = alpha
        _alpha_blend(m)
    return m

def tex_flat_mat(name, hexs, metallic=0.0, rough=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt, b = m.node_tree, None
    b = _bsdf(m)
    tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = flat_tex(name, hexs)
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    return m

def img_mat(name, img, metallic=0.0, rough=0.6, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = _bsdf(m)
    tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = img
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    b.inputs['Alpha'].default_value = alpha
    if alpha < 1.0:
        _alpha_blend(m)
    return m

M = {
    'conc':    pbr_mat('m3_conc', CONC),
    'panel':   pbr_mat('m3_panel', PANEL),
    'panelw':  pbr_mat('m3_panelw', PANELW),
    'panelb':  pbr_mat('m3_panelb', PANELB),
    'roofm':   pbr_mat('m3_roofm', ROOFM),
    'pave':    pbr_mat('m3_pave', PAVE),
    'granite': pbr_mat('m3_granite', GRANITE),
    'brick':   pbr_mat('m3_brick', BRICK),
    'zinc':    pbr_mat('m3_zinc', ZINC),
    'camo':    pbr_mat('m3_camo', CAMOT),
    'camonet': pbr_mat('m3_camonet', CAMOT, alpha=0.55),
    'earth':   pbr_mat('m3_earth', EARTH),
    'gravel':  pbr_mat('m3_gravel', GRAVEL),
    'redx':    img_mat('m3_redx', REDX, rough=0.55),
    'stripes': img_mat('m3_stripes', STRIPES, rough=0.5),
    # 도색·금속 소품 — 면적이 작아 단색 + 미세결로 충분하다
    # 메탈릭을 0.9 로 두면 IBL 이 약한 씬에서 반사할 게 없어 새까맣게 죽는다.
    # 실물 아연도금·도장 금속은 어차피 산화막이 덮여 있으므로 0.5 안팎이 더 사실적이다.
    'galv':     tex_flat_mat('galv', '#9aa2a6', 0.55, 0.46),
    'galv_dk':  tex_flat_mat('galvdk', '#787f84', 0.5, 0.54),
    'steel_dk': tex_flat_mat('steeldk', '#4a525a', 0.5, 0.5),
    'alu':      tex_flat_mat('alu', '#c4cacd', 0.45, 0.4),
    'olive':    tex_flat_mat('olive', '#4d5a47', 0.2, 0.55),
    'olive_dk': tex_flat_mat('olivedk', '#39432f', 0.2, 0.6),
    'dark':     tex_flat_mat('dark', '#20242a', 0.2, 0.68),
    'rubber':   tex_flat_mat('rubber', '#181a1c', 0.0, 0.9),
    'warn':     tex_flat_mat('warn', '#e07a24', 0.0, 0.5),
    'red':      tex_flat_mat('red', '#b3202a', 0.0, 0.5),
    'white':    tex_flat_mat('white', '#ccd0cb', 0.0, 0.45),
    'blue':     tex_flat_mat('blue', '#2b4a6b', 0.15, 0.45),
    'wood':     tex_flat_mat('wood', '#6b5236', 0.0, 0.75),
    'deck':     tex_flat_mat('deck', '#7a6446', 0.0, 0.8),
    'soil':     tex_flat_mat('soil', '#3d3226', 0.0, 0.95),
    'paintw':   tex_flat_mat('paintw', '#dfe2dd', 0.0, 0.55),
    'signblu':  tex_flat_mat('signblu', '#1d4e7a', 0.05, 0.42),
    'signgrn':  tex_flat_mat('signgrn', '#1f6b46', 0.05, 0.42),
    'leaf':     tex_flat_mat('leaf', '#3f5c32', 0.0, 0.82),
    'leaf2':    tex_flat_mat('leaf2', '#4d6b39', 0.0, 0.85),
    'glass':    mk_mat('m3_glass',  srgb('#2a4657'), 0.0, 0.07, alpha=0.5),
    'glassd':   mk_mat('m3_glassd', srgb('#151a1e'), 0.0, 0.55),
    'tube':     mk_mat('m3_tube',   srgb('#f4f6ff'), 0.0, 0.3, emit=(0.85, 0.9, 1.0), emit_str=3.2),
    'room':     mk_mat('m3_room',   srgb('#2b3138'), 0.0, 0.85),
    'lamp':     mk_mat('m3_lamp',   srgb('#ffe8b0'), 0.0, 0.2, emit=(1.0, 0.86, 0.58), emit_str=5.0),
    'beacon':   mk_mat('m3_beacon', srgb('#ff3b30'), 0.0, 0.3, emit=(1.0, 0.14, 0.09), emit_str=7.0),
}
ACCENT = {
    'command': '#5eb1ef', 'security': '#ed5d5d', 'living': '#3dd68c', 'welfare': '#63c9a8',
    'hygiene': '#7fd0e8', 'medical': '#f2909a', 'storage': '#c9a86a', 'maint': '#b18cff',
    'infra': '#e3b341', 'entry': '#8494a6', 'edu': '#8fd15a', 'office': '#9fb4c7',
    'generic': '#8494a6',
}
def _mute(hexs, k=0.28):
    """카탈로그 UI 색을 그대로 도장으로 쓰면 형광 플라스틱이 된다.

    UI 는 어두운 패널 위에서 읽혀야 해서 채도가 높다. 같은 값을 3D 도장에 쓰면
    회색 콘크리트 옆에서 혼자 빛난다. 회색 쪽으로 k 만큼 당겨 「칠한 금속」으로 만든다.
    """
    h = hexs.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    y = 0.299 * r + 0.587 * g + 0.114 * b
    m = tuple(int(c + (y - c) * k) * 0.88 for c in (r, g, b))
    return '#%02x%02x%02x' % tuple(max(0, min(255, int(c))) for c in m)

for k, v in ACCENT.items():
    M['acc_' + k] = tex_flat_mat('acc_' + k, _mute(v), 0.05, 0.62)

# ═══════════════════════ 프리미티브 ═══════════════════════
def _act(ob):
    bpy.context.view_layer.objects.active = ob
    return ob

def bevel(ob, w=0.03, seg=2, ang=40):
    _act(ob)
    md = ob.modifiers.new('bv', 'BEVEL')
    md.width, md.segments = w, seg
    md.limit_method, md.angle_limit = 'ANGLE', math.radians(ang)
    bpy.ops.object.modifier_apply(modifier=md.name)
    return ob

def box(name, sx, sy, sz, x, y, z, mat, rz=0.0, rx=0.0, ry=0.0, bev=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z), rotation=(rx, ry, rz))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat)
    if bev > 0:
        bevel(ob, bev)
    return ob

def cyl(name, r, depth, x, y, z, mat, verts=16, rot=(0, 0, 0), rtop=None, smooth=True):
    if rtop is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth,
                                            location=(x, y, z), rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=rtop, depth=depth,
                                        location=(x, y, z), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    if smooth and verts >= 12:
        bpy.ops.object.shade_smooth()
    return ob

def tube(name, r, thick, depth, x, y, z, mat, verts=16, rot=(0, 0, 0)):
    """관 — 끝이 열려 보이는 곳(굴뚝·연통)에 쓴다."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth,
                                        location=(x, y, z), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    _act(ob)
    md = ob.modifiers.new('sol', 'SOLIDIFY')
    md.thickness = thick
    bpy.ops.object.modifier_apply(modifier=md.name)
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob

def sph(name, r, x, y, z, mat, seg=20, s=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(8, seg // 2),
                                         radius=r, location=(x, y, z))
    ob = bpy.context.active_object
    ob.name = name
    if s != (1, 1, 1):
        ob.scale = s
        bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob

def torus(name, R, r, x, y, z, mat, maj=20, mnr=10, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj,
                                     minor_segments=mnr, location=(x, y, z), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob

def strut(name, p1, p2, r, mat, verts=8):
    v1, v2 = mathutils.Vector(p1), mathutils.Vector(p2)
    d = v2 - v1
    if d.length < 1e-6:
        d = mathutils.Vector((0, 0, 1e-4))
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length,
                                        location=(v1 + v2) / 2)
    ob = bpy.context.active_object
    ob.name = name
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = d.to_track_quat('Z', 'Y')
    ob.data.materials.append(mat)
    return ob

def text3d(name, body, size, x, y, z, mat, rot=(math.pi / 2, 0, 0), extrude=0.012):
    bpy.ops.object.text_add(location=(x, y, z), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.body = body
    ob.data.size = size
    ob.data.extrude = extrude
    ob.data.align_x = 'CENTER'
    ob.data.align_y = 'CENTER'
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.data.materials.append(mat)
    return ob

def polyprism(name, poly, thick, mat, plane='xz', off=0.0, bev=0.0):
    """2D 폴리곤을 두께 방향으로 밀어 만든 각기둥 — 박공 벽·경사 부재·삼각 브래킷용.

    박스만으로는 삼각형을 못 만든다. 그동안 박공 지붕을 「평판 + 용마루 상자」로
    흉내 냈는데, 옆에서 보면 지붕이 아니라 판때기였다. 실제 경사면과 박공 벽이
    있어야 지붕처럼 읽힌다.
    poly: [(a, b), ...] 반시계. plane='xz' 면 (x, z), 두께는 Y.
    """
    n = len(poly)
    if plane == 'xz':
        v0 = [(a, off - thick / 2, b) for a, b in poly]
        v1 = [(a, off + thick / 2, b) for a, b in poly]
    else:                                            # 'yz' — 두께는 X
        v0 = [(off - thick / 2, a, b) for a, b in poly]
        v1 = [(off + thick / 2, a, b) for a, b in poly]
    verts = v0 + v1
    faces = [list(range(n - 1, -1, -1)), list(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append([i, j, j + n, i + n])
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.data.materials.append(mat)
    _act(ob)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    if bev > 0:
        bevel(ob, bev, seg=1)
    return ob

def join_as(objs, name):
    objs = [o for o in objs if o is not None]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    _act(objs[0])
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    return ob

# ═══════════════════════ UV — 월드 텍셀 밀도 통일 ═══════════════════════
def uv_world(ob, tile=UV_TILE):
    """smart_project 후 UV 를 실척 기준으로 되잡는다.

    프리미티브 기본 UV 는 면의 실제 크기를 모른다 — 13 m 벽 한 면과 0.05 m 볼트 옆면이
    같은 0~1 을 쓴다. 그래서 콘크리트 결이 벽에서는 안 보이고 볼트에서는 벽지가 된다.
    smart_project 는 면적 비례로 펴 주지만 0~1 에 맞춰 팩하므로 절대 크기는 여전히
    오브젝트마다 다르다. UV 총면적과 메시 총면적의 비로 현재 「UV/m」 를 재고,
    목표(1/tile)로 곱해 준다. UV 가 0~1 을 넘지만 glTF 기본 랩이 REPEAT 라 타일링된다.
    """
    _act(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    try:
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.002,
                                 correct_aspect=True, scale_to_bounds=False)
    except TypeError:
        bpy.ops.uv.smart_project()
    bpy.ops.object.mode_set(mode='OBJECT')

    me = ob.data
    if not me.uv_layers:
        return ob
    bm = bmesh.new()
    bm.from_mesh(me)
    lay = bm.loops.layers.uv.active
    uv_area = 0.0
    geo_area = 0.0
    for f in bm.faces:
        geo_area += f.calc_area()
        loops = f.loops
        if len(loops) < 3:
            continue
        a = 0.0
        n = len(loops)
        for i in range(n):
            p = loops[i][lay].uv
            q = loops[(i + 1) % n][lay].uv
            a += p.x * q.y - q.x * p.y
        uv_area += abs(a) * 0.5
    if uv_area > 1e-9 and geo_area > 1e-9:
        cur = math.sqrt(uv_area / geo_area)          # 현재 UV 단위 / m
        k = (1.0 / tile) / cur
        for f in bm.faces:
            for l in f.loops:
                l[lay].uv *= k
        bm.to_mesh(me)
    bm.free()
    return ob

def finish(ob, name, tile=UV_TILE, smooth_ang=34):
    uv_world(ob, tile)
    _act(ob)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(smooth_ang))
    except Exception:
        pass
    ob.name = name
    return ob

def hash01_py(n):
    """결정적 난수 — 다시 구워도 같은 창에 같은 가구가 놓여야 한다."""
    x = math.sin(n * 127.1 + 311.7) * 43758.5453
    return x - math.floor(x)

EXPORTED = []
def export_glb(ob, fname):
    path = os.path.join(OUT, fname)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    _act(ob)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB',
                              use_selection=True, export_apply=True)
    kb = os.path.getsize(path) // 1024
    EXPORTED.append((fname, len(ob.data.polygons), kb))
    print(f'  -> {fname}  faces={len(ob.data.polygons)}  {kb}KB')

# ═══════════════════════ 개구부 — 실제 불리언 컷 ═══════════════════════
#
# 1·2 차 셸은 창을 「벽에 붙인 검은 사각형」으로 그렸다. 리세스를 흉내 내려고 유리와
# 프레임을 벽 안쪽 좌표에 두면 벽이 솔리드라 통째로 묻힌다 — 실제로 그렇게 묻혀 있었다.
# 그래서 개구부는 커터 박스를 모아 **불리언 차집합으로 진짜 구멍(포켓)을 판다**.
# 포켓 벽면이 곧 재벌(reveal)이 되어 스스로 그림자를 만든다. 이것이 로우폴리 느낌을
# 가장 크게 걷어내는 한 가지다.

CUT_MAT = None

def cutter(sx, sy, sz, x, y, z, rz=0.0, rx=0.0):
    global CUT_MAT
    if CUT_MAT is None:
        CUT_MAT = mk_mat('m3_cut', srgb('#ff00ff'))
    return box('cut', sx, sy, sz, x, y, z, CUT_MAT, rz=rz, rx=rx)

def pocket(C, face, at, w, h, z, depth=0.22, side=False, zspan=None, wy_override=None):
    """벽면에 파낼 포켓 커터 하나. face: −1 정면(−Y)·+1 배면(+Y), side=True 면 ±X 면.

    커터 두께는 0.7 로 두고 그중 `depth` 만 벽 안으로 들어가게 중심을 민다.
    나머지는 벽 밖 허공이라 아무것도 깎지 않는다.
    """
    t = 0.7
    if zspan:
        z, h = (zspan[0] + zspan[1]) / 2, (zspan[1] - zspan[0])
    if side:
        wx = RX if face > 0 else LX
        n = 1 if face > 0 else -1
        C.append(cutter(t, w, h, wx + n * (t / 2 - depth), at, z))
    else:
        wy = (BY if face > 0 else FY) if wy_override is None else wy_override
        n = 1 if face > 0 else -1
        C.append(cutter(w, t, h, at, wy + n * (t / 2 - depth), z))

def cut(objs, C):
    """커터를 하나로 합쳐 대상들에서 차집합. 닿지 않는 대상은 그대로 통과한다."""
    if not C:
        return
    for o in C:
        o.select_set(False)
    joined = join_as(list(C), 'CUTTERS')
    for ob in ([objs] if not isinstance(objs, (list, tuple)) else objs):
        _act(ob)
        md = ob.modifiers.new('bool', 'BOOLEAN')
        md.operation = 'DIFFERENCE'
        md.object = joined
        try:
            md.solver = 'EXACT'
        except Exception:
            pass
        bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.select_all(action='DESELECT')
    joined.select_set(True)
    _act(joined)
    bpy.ops.object.delete()
    C.clear()

# ═══════════════════════ 파사드 부품 ═══════════════════════
FY = -WD / 2      # 정면 (−Y)
BY = WD / 2       # 배면
LX, RX = -WL / 2, WL / 2

# ── 매싱 상수 ────────────────────────────────────────────────
#
# 단일 직육면체는 어느 각도에서 봐도 사각형이다. 창을 아무리 정교하게 파도 그
# 실루엣은 바뀌지 않는다 — 「로우폴리 같다」는 인상의 절반은 여기서 온다.
# 그래서 동을 **여러 볼륨**으로 짠다: 주동 + 계단실 타워 + 정면 회랑 + 부속 저층동.
#
# 계단실 타워는 main·floor·roof 세 GLB 에 걸쳐 이어져야 하므로 X 위치가 상수다.
# 어긋나면 층이 어긋난 채 쌓인다. fac_floor.glb 를 여러 타입이 공유하므로
# **모든 타입이 같은 TWX 를 쓴다** — 계단실이 곧 주출입구라 건축적으로도 맞다.
TWX = -4.55       # 계단실 타워 중심 X
TWW = 3.7         # 타워 폭
TWF = 0.95        # 타워 −Y 돌출 (처마 0.55 보다 커야 처마 밖으로 나온다)
# 타워 깊이는 **주동을 관통하지 않는다**. 처음에 WD 전체로 잡았더니 건물 앞뒤를
# 가로지르는 흰 슬래브 한 장이 되어 「계단실」이 아니라 「벽」으로 읽혔다.
# 계단 한 세트가 들어가는 4.8 m 면 충분하고, 그래야 정면에 붙은 볼륨으로 보인다.
TWD = 4.8         # 타워 깊이 (앞으로 TWF 만큼 나오고 나머지는 주동에 물린다)
TWFY = FY - TWF                          # 타워 정면 Y
TWY = TWFY + TWD / 2                     # 타워 중심 Y

def band_course(P, z, mat=None, t=0.07, h=0.16, x0=None, x1=None):
    """수평 띠장 — 층 경계에 두르는 0.07m 돌출 밴드. 벽면에 그림자 선 하나를 긋는다."""
    mat = mat or M['conc']
    w = WL + t * 2 if x0 is None else (x1 - x0)
    cx = 0 if x0 is None else (x0 + x1) / 2
    P.append(box('band', w, WD + t * 2, h, cx, 0, z, mat, bev=0.012))

def sunshade(P, x, face, z, w=1.6, d=0.52):
    """창 위 수평 차양 — 브래킷 2개. 파사드에 짙은 그림자 선을 만드는 가장 값싼 부재."""
    wy = BY if face > 0 else FY
    n = 1 if face > 0 else -1
    y = wy + n * (d / 2 + 0.03)
    P.append(box('shade', w, d, 0.045, x, y, z, M['alu'], bev=0.01))
    for i in range(4):
        P.append(box('shslat', w - 0.06, 0.055, 0.05, x, wy + n * (0.14 + i * 0.12), z + 0.03,
                     M['alu'], rx=math.radians(-18 * n)))
    for s in (-1, 1):
        P.append(strut('shbr', (x + s * (w / 2 - 0.14), wy + n * 0.04, z + 0.30),
                       (x + s * (w / 2 - 0.14), wy + n * (d - 0.02), z - 0.01), 0.018, M['alu']))

def interior_set(P, x, face, z, w, h, pk=0.22, seed=0, lit=True, side=False):
    """유리 뒤 실내 — 슬래브·형광등·가구 실루엣·블라인드.

    검은 백플레이트 한 장은 가까이서 보면 스티커다. 0.1m 두께 안에 층을 몇 겹만
    깔아도 눈은 「방이 있다」로 읽는다. 폴리는 창당 5~7 개뿐이다.
    """
    if side:
        wx = RX if face > 0 else LX
        n = 1 if face > 0 else -1
        def b(nm, sw, sd, sh, into, oy, oz, m):
            return P.append(box(nm, sd, sw, sh, wx + n * (-into), x + oy, oz, m))
    else:
        wy = BY if face > 0 else FY
        n = 1 if face > 0 else -1
        def b(nm, sw, sd, sh, into, oy, oz, m):
            return P.append(box(nm, sw, sd, sh, x + oy, wy + n * (-into), oz, m))
    d0 = pk + 0.02
    b('room', w + 0.5, 0.04, h + 0.6, d0 + 0.46, 0, z, M['room'])          # 안쪽 벽
    b('rceil', w + 0.5, 0.5, 0.04, d0 + 0.24, 0, z + h / 2 + 0.24, M['paintw'])
    b('rfloor', w + 0.5, 0.5, 0.04, d0 + 0.24, 0, z - h / 2 - 0.28, M['dark'])
    if lit:
        b('rlamp', min(1.1, w * 0.7), 0.10, 0.05, d0 + 0.30, 0, z + h / 2 + 0.16, M['tube'])
    r = hash01_py(seed)
    if r < 0.45:                                                           # 캐비닛
        b('rfurn', w * 0.42, 0.26, h * 0.62, d0 + 0.34, -w * 0.22, z - h * 0.14, M['dark'])
    elif r < 0.78:                                                         # 책상 + 모니터
        b('rdesk', w * 0.62, 0.30, 0.06, d0 + 0.32, w * 0.10, z - h * 0.24, M['wood'])
        b('rmon', 0.34, 0.06, 0.24, d0 + 0.30, w * 0.10, z - h * 0.06, M['glassd'])
    if hash01_py(seed + 41) < 0.4:                                         # 반쯤 내린 블라인드
        b('rblind', w - 0.05, 0.02, h * 0.36, pk - 0.085, 0, z + h * 0.30, M['paintw'])

def decal(P, x, face, z, w, h, mat, side=False, out=0.045):
    """벽 데칼 — 표지판·번호판·마크. 얇은 판을 벽면에 살짝 띄워 붙인다."""
    if side:
        wx = RX if face > 0 else LX
        n = 1 if face > 0 else -1
        P.append(box('decal', out, w, h, wx + n * out / 2, x, z, mat, bev=0.008))
    else:
        wy = BY if face > 0 else FY
        n = 1 if face > 0 else -1
        P.append(box('decal', w, out, h, x, wy + n * out / 2, z, mat, bev=0.008))

def bldg_id(P, code, x=None, z=2.62, face=-1):
    """건물 번호 명판 — 부대 건물에는 반드시 붙어 있다. 있고 없고의 차이가 크다."""
    x = (TWX + TWW / 2 + 0.9) if x is None else x
    wy = (FY if face < 0 else BY)
    n = -1 if face < 0 else 1
    P.append(box('idp', 0.86, 0.05, 0.34, x, wy + n * 0.03, z, M['signblu'], bev=0.012))
    P.append(text3d('idt', code, 0.19, x, wy + n * 0.08, z, M['white'],
                    rot=(math.pi / 2, 0, math.pi if face < 0 else 0)))

def notice_board(P, x, z=1.55, face=-1):
    """게시판 — 유리문 2짝 + 상부 차양."""
    wy = (FY if face < 0 else BY)
    n = -1 if face < 0 else 1
    P.append(box('nbfr', 2.3, 0.10, 1.15, x, wy + n * 0.06, z, M['steel_dk'], bev=0.015))
    for s in (-1, 1):
        P.append(box('nbg', 1.06, 0.03, 0.98, x + s * 0.56, wy + n * 0.12, z, M['glass']))
    P.append(box('nbroof', 2.5, 0.34, 0.05, x, wy + n * 0.2, z + 0.66, M['alu'], bev=0.01))

# ── 계단실 타워 (매싱의 핵심) ────────────────────────────────
def stair_tower(P, C, T, part, accent, sign=None, code=None, h=H, mat=None):
    """계단실 타워 — main / floor / roof 세 조각이 TWX 에서 이어진다.

    part='main'  1층부: 타워 몸통 + 현관 포치(실제로 파인 개구부) + 스툽 + 명판
    part='floor' 반복층: 몸통 + 층계참 수직 창 슬롯
    part='roof'  옥탑: 몸통 연장 + 옥탑 출입문 + 파라펫 + 사다리
    """
    mat = mat or M['conc']
    if part == 'roof':
        ph = 2.55
        body = box('twp', TWW, TWD, ph, TWX, TWY, ph / 2, mat, bev=0.04)
        P.append(body)
        T.append(body)
        P.append(box('twcap', TWW + 0.22, TWD + 0.22, 0.10, TWX, TWY, ph + 0.05, M['alu'], bev=0.018))
        P.append(box('twband', TWW + 0.05, TWD + 0.05, 0.12, TWX, TWY, ph - 0.42, M['acc_' + accent]))
        # 옥탑 출입문 (배면) + 계단 참
        P.append(box('phdoor', 1.0, 0.09, 2.05, TWX, TWY + TWD / 2 + 0.02, 1.05, M['olive_dk'], bev=0.012))
        P.append(box('phdfr', 1.16, 0.07, 2.2, TWX, TWY + TWD / 2 + 0.02, 1.12, M['steel_dk']))
        P.append(box('phsill', 1.5, 0.7, 0.1, TWX, TWY + TWD / 2 + 0.32, 0.05, M['conc'], bev=0.012))
        # 옥탑 환기 루버 + 피뢰침
        for s in (-1, 1):
            P.append(box('phlv', 0.9, 0.07, 0.55, TWX + s * 0.9, TWFY + 0.02, 1.75, M['galv_dk']))
            for i in range(4):
                P.append(box('phls', 0.86, 0.09, 0.05, TWX + s * 0.9, TWFY - 0.03,
                             1.55 + i * 0.14, M['alu'], rx=math.radians(20)))
        P.append(cyl('lrod', 0.022, 1.5, TWX + TWW / 2 - 0.3, TWY, ph + 0.85, M['galv'], verts=8))
        return

    body = box('tw', TWW, TWD, h, TWX, TWY, h / 2, mat, bev=0.04)
    P.append(body)
    T.append(body)
    # 타워 모서리 필라스터 — 주동과 다른 리듬을 준다
    for s in (-1, 1):
        P.append(box('twpil', 0.30, 0.30, h - 0.02, TWX + s * (TWW / 2), TWFY + 0.02, h / 2, mat, bev=0.02))
    P.append(box('twcorn', TWW + 0.15, TWD + 0.15, 0.12, TWX, TWY, h - 0.07, M['conc'], bev=0.016))
    P.append(box('twplinth', TWW + 0.10, TWD + 0.10, 0.9, TWX, TWY, 0.45, M['granite'], bev=0.02))

    if part == 'floor':
        # 층계참 수직 창 — 타워를 「계단실」로 읽게 하는 유일한 단서다
        pocket(C, -1, TWX, 1.15, h - 1.3, h / 2 + 0.1, depth=0.2, wy_override=TWFY)
        P.append(box('twgl', 1.17, 0.04, h - 1.28, TWX, TWFY + 0.03, h / 2 + 0.1, M['glass']))
        P.append(box('twbk', 1.3, 0.03, h - 1.1, TWX, TWFY + 0.20, h / 2 + 0.1, M['room']))
        for i in range(3):
            P.append(box('twmul', 1.22, 0.06, 0.06, TWX, TWFY + 0.005, 0.55 + i * 0.9, M['alu']))
        P.append(box('twmulv', 0.05, 0.06, h - 1.28, TWX, TWFY + 0.005, h / 2 + 0.1, M['alu']))
        # 계단 사선 (실내 실루엣) — 유리 너머로 비스듬한 선이 보인다
        for i in range(5):
            P.append(box('twstep', 1.0, 0.05, 0.05, TWX, TWFY + 0.16, 0.7 + i * 0.42, M['dark']))
        return

    # part == 'main' — 현관
    entry_porch(P, C, TWX, double=True, w=1.05, sign=sign, accent=accent,
                canopy=True, wy_override=TWFY, span_lim=TWW - 0.5)
    if code:
        bldg_id(P, code, x=TWX + TWW / 2 + 0.95)

def arcade(P, x0, x1, z=2.95, depth=1.9, accent='generic'):
    """정면 회랑 — 기둥 + 슬래브. 벽면 앞에 한 겹을 세워 깊이를 만든다."""
    n = max(2, int(round((x1 - x0) / 3.3)) + 1)
    y = FY - depth
    P.append(box('arcslab', x1 - x0 + 0.7, depth + 0.2, 0.16, (x0 + x1) / 2, FY - depth / 2 + 0.1,
                 z, M['conc'], bev=0.02))
    P.append(box('arcfas', x1 - x0 + 0.75, 0.12, 0.30, (x0 + x1) / 2, y - 0.02, z - 0.03,
                 M['acc_' + accent], bev=0.012))
    P.append(box('arcsof', x1 - x0 + 0.6, depth, 0.04, (x0 + x1) / 2, FY - depth / 2, z - 0.09,
                 M['paintw']))
    P.append(box('arcfloor', x1 - x0 + 0.7, depth + 0.35, 0.14, (x0 + x1) / 2, FY - depth / 2 - 0.1,
                 0.07, M['granite'], bev=0.015))
    for i in range(n):
        px = x0 + (x1 - x0) * i / (n - 1)
        P.append(box('arcbase', 0.52, 0.52, 0.24, px, y, 0.12, M['granite'], bev=0.02))
        P.append(box('arccol', 0.36, 0.36, z - 0.32, px, y, (z - 0.32) / 2 + 0.24, M['conc'], bev=0.025))
        P.append(box('arccap', 0.5, 0.5, 0.12, px, y, z - 0.14, M['conc'], bev=0.018))
        for s in (-1, 1):                                     # 헌치 (기둥-보 접합 삼각 보강)
            if 0 < i + s < n:
                P.append(polyprism('arch', [(0, 0), (0.75 * s, 0), (0, -0.5)], 0.34, M['conc'],
                                   plane='xz', off=y, bev=0.015))
                P[-1].location = (px, y, z - 0.16)
    for i in range(max(1, n - 1)):                            # 천장 매입 조명
        lx = x0 + (x1 - x0) * (i + 0.5) / max(1, n - 1)
        P.append(box('arclamp', 0.5, 0.16, 0.04, lx, FY - depth / 2, z - 0.12, M['lamp']))

def annex(P, C, x, w=5.0, d=3.4, h=2.55, mat=None, accent='generic', rollup=False):
    """부속 저층동 — 주동 한쪽 끝에 붙는 낮은 볼륨. 지붕 높이가 둘로 갈린다."""
    mat = mat or M['panel']
    y = FY - d / 2 + 0.35
    body = box('anx', w, d, h, x, y, h / 2, mat, bev=0.035)
    P.append(body)
    P.append(box('anxplinth', w + 0.1, d + 0.1, 0.55, x, y, 0.28, M['granite'], bev=0.02))
    P.append(box('anxpar', w + 0.34, d + 0.34, 0.30, x, y, h + 0.15, M['conc'], bev=0.02))
    P.append(box('anxcop', w + 0.46, d + 0.46, 0.08, x, y, h + 0.34, M['alu'], bev=0.015))
    P.append(box('anxband', w + 0.05, d + 0.05, 0.10, x, y, h - 0.22, M['acc_' + accent]))
    if rollup:
        P.append(box('anxsh', w - 1.1, 0.08, h - 0.75, x, y - d / 2 - 0.02, (h - 0.75) / 2 + 0.05,
                     M['galv_dk']))
        for i in range(int((h - 0.8) / 0.3)):
            P.append(box('anxrib', w - 1.12, 0.05, 0.045, x, y - d / 2 - 0.06, 0.2 + i * 0.3, M['galv']))
        P.append(box('anxbar', w - 0.9, 0.34, 0.34, x, y - d / 2 - 0.05, h - 0.6, M['steel_dk'], bev=0.02))
    else:
        P.append(box('anxdoor', 1.0, 0.08, 2.1, x - w / 4, y - d / 2 - 0.02, 1.07, M['olive_dk'], bev=0.012))
        P.append(box('anxdfr', 1.18, 0.06, 2.24, x - w / 4, y - d / 2 - 0.05, 1.14, M['steel_dk']))
        P.append(box('anxlv', 1.5, 0.07, 0.9, x + w / 4, y - d / 2 - 0.02, 1.5, M['galv_dk']))
        for i in range(6):
            P.append(box('anxls', 1.46, 0.09, 0.05, x + w / 4, y - d / 2 - 0.06, 1.12 + i * 0.15,
                         M['alu'], rx=math.radians(22)))
    for s in (-1, 1):                                          # 옥상 실외기 + 난간
        P.append(box('anxac', 0.8, 0.34, 0.56, x + s * 1.2, y + 0.5, h + 0.28, M['white'], bev=0.02))
    P.append(cyl('anxvent', 0.13, 0.8, x, y + d / 2 - 0.5, h + 0.5, M['galv'], verts=12))
    P.append(cyl('anxvcap', 0.22, 0.09, x, y + d / 2 - 0.5, h + 0.95, M['galv'], verts=12))

def balcony(P, x, z, w=2.6, d=1.25, face=-1):
    """발코니 — 생활동에만. 슬래브 + 난간 + 배수구 + 실외기 + 빨래줄."""
    wy = FY if face < 0 else BY
    n = -1 if face < 0 else 1
    y = wy + n * (d / 2 + 0.02)
    P.append(box('balslab', w, d + 0.1, 0.16, x, y, z, M['conc'], bev=0.02))
    P.append(box('balsof', w - 0.1, d, 0.04, x, y, z - 0.1, M['paintw']))
    P.append(box('balpar', w, 0.12, 0.95, x, wy + n * (d + 0.05), z + 0.55, M['conc'], bev=0.02))
    for s in (-1, 1):
        P.append(box('balside', 0.12, d, 0.95, x + s * (w / 2 - 0.06), y, z + 0.55, M['conc'], bev=0.02))
    P.append(box('balcap', w + 0.12, 0.24, 0.06, x, wy + n * (d + 0.05), z + 1.05, M['alu'], bev=0.012))
    P.append(cyl('baldrn', 0.035, 0.3, x + w / 2 - 0.35, wy + n * (d + 0.05), z + 0.06, M['galv'],
                 verts=8, rot=(math.pi / 2, 0, 0)))
    P.append(box('balac', 0.82, 0.33, 0.58, x - w / 4, wy + n * 0.42, z + 0.37, M['white'], bev=0.02))
    for zz in (0.62, 0.82):
        P.append(strut('balline', (x + 0.15, wy + n * (d - 0.2), z + zz),
                       (x + w / 2 - 0.2, wy + n * (d - 0.2), z + zz), 0.006, M['white']))

def gable_roof(P, z0, pitch=13.0, over=0.62, mat=None, accent=None, seam=True):
    """진짜 경사 지붕 — 두 경사면 + 박공 벽 + 용마루 + 처마 + 심(seam).

    예전엔 「평판 + 용마루 상자」였다. 위에서 보면 그럴듯하지만 옆에서 보면 판때기다.
    실제 경사면과 삼각 박공 벽이 있어야 지붕으로 읽힌다.
    """
    mat = mat or M['zinc']
    L2 = WL + over * 2
    D2 = WD + over * 2
    rise = math.tan(math.radians(pitch)) * (D2 / 2)
    slope_len = math.hypot(D2 / 2, rise)
    P.append(box('soffit', L2, D2, 0.05, 0, 0, z0 + 0.03, M['paintw']))
    for s in (-1, 1):                                        # 경사 지붕면
        P.append(box('rslope', L2, slope_len, 0.11, 0, s * (D2 / 4), z0 + 0.09 + rise / 2, mat,
                     rx=math.radians(-pitch * s), bev=0.015))
    for s in (-1, 1):                                        # 박공 벽 (삼각)
        gp = [(-D2 / 2, 0.0), (D2 / 2, 0.0), (0.0, rise)]
        ob = polyprism('gable', gp, 0.16, M['conc'], plane='yz', off=s * (WL / 2 + 0.02), bev=0.012)
        ob.location = (0, 0, z0 + 0.06)
        P.append(ob)
        ob2 = polyprism('gtrim', [(-D2 / 2 - 0.06, -0.14), (D2 / 2 + 0.06, -0.14), (0.0, rise + 0.12)],
                        0.10, M['alu'], plane='yz', off=s * (WL / 2 + 0.13), bev=0.01)
        ob2.location = (0, 0, z0 + 0.06)
        P.append(ob2)
    P.append(box('ridgecap', L2 + 0.1, 0.44, 0.13, 0, 0, z0 + rise + 0.12, M['alu'], bev=0.02))
    if seam:                                                 # 징크 돌출 심 — 0.55m 간격
        k = int(L2 / 0.55)
        for i in range(k + 1):
            sx = -L2 / 2 + i * 0.55
            for s in (-1, 1):
                P.append(box('seam', 0.045, slope_len - 0.05, 0.055, sx, s * (D2 / 4),
                             z0 + 0.16 + rise / 2, M['alu'], rx=math.radians(-pitch * s)))
    for s in (-1, 1):                                        # 처마 페시아 + 반원 물받이
        ey = s * (D2 / 2)
        P.append(box('fascia', L2 + 0.05, 0.09, 0.24, 0, ey, z0 + 0.05, M['alu'], bev=0.012))
        g = cyl('gutter', 0.09, L2 - 0.05, 0, ey + s * 0.10, z0 - 0.01, M['galv'], verts=12,
                rot=(0, math.pi / 2, 0))
        g.scale = (0.55, 1, 1)
        _act(g); bpy.ops.object.transform_apply(scale=True)
        P.append(g)
        for i in range(6):
            gx = -L2 / 2 + 0.5 + i * (L2 - 1.0) / 5
            P.append(box('ghook', 0.05, 0.3, 0.03, gx, ey + s * 0.04, z0 + 0.04, M['galv']))
        for i in range(7):                                   # 눈막이
            gx = -L2 / 2 + 0.8 + i * (L2 - 1.6) / 6
            P.append(box('snowg', 0.42, 0.05, 0.10, gx, s * (D2 / 2 - 0.55),
                         z0 + 0.20 + math.tan(math.radians(pitch)) * 0.55, M['alu'],
                         rx=math.radians(-pitch * s)))
        if accent:
            P.append(box('efasc', L2 + 0.07, 0.05, 0.08, 0, ey + s * 0.01, z0 - 0.07,
                         M['acc_' + accent]))

def parapet_roof(P, z0, mat=None, accent=None, rail=True, h=0.95):
    """옥상형 — 슬래브 + 파라펫 + 코핑(오버행) + 난간 + 스커퍼 + 방수 보호 몰탈 구획."""
    mat = mat or M['conc']
    L2, D2 = WL + 0.30, WD + 0.30
    P.append(box('slab', L2, D2, 0.26, 0, 0, z0 + 0.13, mat, bev=0.02))
    for i in range(4):                                        # 옥상 구획 줄눈 (신축 이음)
        P.append(box('rjoint', L2 - 0.5, 0.06, 0.02, 0, -D2 / 2 + (i + 1) * D2 / 5, z0 + 0.27, M['dark']))
    for s in (-1, 1):
        P.append(box('para', L2, 0.20, h, 0, s * (D2 / 2 - 0.10), z0 + 0.26 + h / 2, mat, bev=0.02))
        P.append(box('para', 0.20, D2 - 0.4, h, s * (L2 / 2 - 0.10), 0, z0 + 0.26 + h / 2, mat, bev=0.02))
        P.append(box('coping', L2 + 0.16, 0.34, 0.09, 0, s * (D2 / 2 - 0.10), z0 + 0.26 + h + 0.04,
                     M['alu'], bev=0.015))
        P.append(box('coping', 0.34, D2 - 0.4 + 0.16, 0.09, s * (L2 / 2 - 0.10), 0,
                     z0 + 0.26 + h + 0.04, M['alu'], bev=0.015))
        if accent:
            P.append(box('pband', L2 + 0.02, 0.05, 0.10, 0, s * (D2 / 2 - 0.20), z0 + 0.30,
                         M['acc_' + accent]))
        P.append(box('scup', 0.30, 0.24, 0.12, s * (L2 / 2 - 1.4), -(D2 / 2 - 0.10), z0 + 0.32, M['dark']))
        P.append(box('scupsp', 0.22, 0.30, 0.08, s * (L2 / 2 - 1.4), -(D2 / 2 + 0.06), z0 + 0.30, M['galv']))
    if rail:
        for s in (-1, 1):
            for zz in (0.55, 0.28):
                P.append(strut('grail', (-L2 / 2 + 0.2, s * (D2 / 2 - 0.10), z0 + 0.26 + h + zz),
                               (L2 / 2 - 0.2, s * (D2 / 2 - 0.10), z0 + 0.26 + h + zz), 0.020, M['galv']))
            for i in range(6):
                gx = -L2 / 2 + 0.5 + i * (L2 - 1.0) / 5
                P.append(cyl('gpost', 0.02, 0.62, gx, s * (D2 / 2 - 0.10), z0 + 0.26 + h + 0.31,
                             M['galv'], verts=8))

def wall_body(P, mat, h=H, z0=0.0, accent=None, pilaster=True, plinth=True, base_mat=None):
    """벽체 + 화강석 걸레받이 + 코너 필라스터 + 코니스. 불리언 대상 목록을 돌려준다.

    불리언은 **자기교차가 없는 단순 박스**에만 건다 — 필라스터·코니스까지 합친 뒤
    자르면 EXACT 솔버가 교차면에서 쓰레기 폴리곤을 만든다.
    """
    targets = []
    wall = box('wall', WL, WD, h, 0, 0, z0 + h / 2, mat, bev=0.04)
    P.append(wall)
    targets.append(wall)
    if plinth:
        pl = box('plinth', WL + 0.10, WD + 0.10, 0.90, 0, 0, z0 + 0.45,
                 base_mat or M['granite'], bev=0.02)
        P.append(pl)
        targets.append(pl)
        P.append(box('drip', WL + 0.17, WD + 0.17, 0.05, 0, 0, z0 + 0.92, M['conc'], bev=0.015))
    if pilaster:
        for sx in (LX, RX):
            for sy in (FY, BY):
                P.append(box('pil', 0.36, 0.36, h - 0.02, sx, sy, z0 + h / 2, mat, bev=0.025))
    P.append(box('cornice', WL + 0.15, WD + 0.15, 0.15, 0, 0, z0 + h - 0.09, M['conc'], bev=0.02))
    if accent:
        tr = box('trim', WL + 0.09, WD + 0.09, 0.13, 0, 0, z0 + h - 0.32, M['acc_' + accent])
        P.append(tr)
        targets.append(tr)
    return targets

def window(P, C, x, face, z, w=1.25, h=1.45, sill=True, mullion=True, blind=False,
           side=False, glass=None, pk=0.22, room=True, shade=False, seed=0):
    """리세스 창 — 진짜 포켓 + 창틀 + 멀리언 + 물끊기 실 + 인방 + 실내."""
    gl = glass or M['glass']
    pocket(C, face, x, w, h, z, depth=pk, side=side)
    fr = M['alu']
    if side:
        wx = RX if face > 0 else LX
        n = 1 if face > 0 else -1
        def b(nm, sw, sd, sh, into, oy, oz, m, **kw):
            return P.append(box(nm, sd, sw, sh, wx + n * (-into), x + oy, oz, m, **kw))
    else:
        wy = BY if face > 0 else FY
        n = 1 if face > 0 else -1
        def b(nm, sw, sd, sh, into, oy, oz, m, **kw):
            return P.append(box(nm, sw, sd, sh, x + oy, wy + n * (-into), oz, m, **kw))
    if room:
        interior_set(P, x, face, z, w, h, pk=pk, seed=seed, side=side)
    else:
        b('bk', w + 0.1, 0.03, h + 0.1, pk + 0.02, 0, z, M['glassd'])
    b('gl', w + 0.02, 0.03, h + 0.02, pk - 0.05, 0, z, gl)
    b('fr', w + 0.10, 0.06, 0.07, pk - 0.10, 0, z + h / 2 + 0.02, fr)
    b('fr', w + 0.10, 0.06, 0.07, pk - 0.10, 0, z - h / 2 - 0.02, fr)
    b('fr', 0.07, 0.06, h + 0.16, pk - 0.10, w / 2 + 0.02, z, fr)
    b('fr', 0.07, 0.06, h + 0.16, pk - 0.10, -w / 2 - 0.02, z, fr)
    if mullion:
        b('mul', 0.05, 0.05, h, pk - 0.10, 0, z, fr)
        b('mulh', w, 0.05, 0.045, pk - 0.10, 0, z + h * 0.22, fr)
    if blind:
        b('bl', w - 0.04, 0.02, h * 0.44, pk - 0.085, 0, z + h * 0.28, M['paintw'])
    if sill:
        b('sill', w + 0.36, 0.26, 0.075, -0.10, 0, z - h / 2 - 0.11, M['granite'], bev=0.015)
        b('lint', w + 0.32, 0.15, 0.09, -0.05, 0, z + h / 2 + 0.13, M['conc'], bev=0.015)
    if shade and not side:
        sunshade(P, x, face, z + h / 2 + 0.30, w=w + 0.5)

def window_row(P, C, n, z, faces=(-1, 1), w=1.25, h=1.45, inset=1.5, x0=None, x1=None, **kw):
    """창 열 — 실척 피치. x0/x1 로 타워·부속동을 피해 구간을 지정한다."""
    a = (-WL / 2 + inset) if x0 is None else x0
    b = (WL / 2 - inset) if x1 is None else x1
    xs = [(a + b) / 2] if n <= 1 else [a + (b - a) * i / (n - 1) for i in range(n)]
    for f in faces:
        for i, x in enumerate(xs):
            window(P, C, x, f, z, w=w, h=h, blind=(i % 3 == 1 and f < 0),
                   seed=i * 13 + (7 if f > 0 else 0), **kw)

def slit_row(P, C, n, z, faces=(-1, 1), w=1.0, h=0.34, inset=1.8, x0=None, x1=None):
    """총안구 — 안쪽으로 벌어지는 사총구. 포켓을 깊게 파고 안쪽 상자를 넓게 둔다."""
    a = (-WL / 2 + inset) if x0 is None else x0
    b = (WL / 2 - inset) if x1 is None else x1
    xs = [(a + b) / 2] if n <= 1 else [a + (b - a) * i / (n - 1) for i in range(n)]
    for f in faces:
        wy = BY if f > 0 else FY
        n2 = 1 if f > 0 else -1
        for x in xs:
            pocket(C, f, x, w, h, z, depth=0.34)
            P.append(box('slt_bk', w * 1.55, 0.05, h * 1.7, x, wy - n2 * 0.33, z, M['glassd']))
            P.append(box('slt_l', w + 0.36, 0.16, 0.09, x, wy + n2 * 0.05, z + h / 2 + 0.10,
                         M['conc'], bev=0.012))
            P.append(box('slt_s', w + 0.36, 0.20, 0.07, x, wy + n2 * 0.05, z - h / 2 - 0.08,
                         M['granite'], bev=0.012))
            P.append(box('slt_st', 0.14, 0.20, 0.30, x + w / 2 + 0.16, wy + n2 * 0.03, z,
                         M['steel_dk'], bev=0.01))

def entry_porch(P, C, x=0.0, double=True, w=1.05, h=2.25, canopy=True, sign=None,
                accent='generic', ramp=False, face=-1, wy_override=None, span_lim=None):
    """현관 — 실제로 파인 포치 + 문 + 캐노피 + 스툽 계단 + 명판 + 벽등."""
    wy = (FY if face < 0 else BY) if wy_override is None else wy_override
    n = -1 if face < 0 else 1
    fw = (2 * w + 0.3) if double else (w + 0.28)
    ow = min(fw + 0.5, span_lim) if span_lim else fw + 0.5
    oh, pk = h + 0.38, 0.5
    pocket(C, face, x, ow, oh, 0, depth=pk, zspan=(-0.2, oh), wy_override=wy)
    def b(nm, sw, sd, sh, into, ox, oz, m, **kw):
        return P.append(box(nm, sw, sd, sh, x + ox, wy + n * (-into), oz, m, **kw))
    b('pceil', ow, 0.48, 0.06, pk / 2, 0, oh - 0.03, M['paintw'])
    b('pfloor', ow, 0.48, 0.05, pk / 2, 0, 0.03, M['granite'])
    b('plight', 0.62, 0.24, 0.05, pk - 0.12, 0, oh - 0.10, M['lamp'])
    for s in (-1, 1):
        b('pjamb', 0.06, 0.5, oh, pk / 2, s * (ow / 2 - 0.03), oh / 2, M['paintw'])
    dz = h / 2 + 0.06
    if double:
        for s in (-1, 1):
            dx = s * (w / 2 + 0.02)
            b('door', w, 0.08, h, pk - 0.06, dx, dz, M['olive_dk'], bev=0.015)
            b('vision', w * 0.5, 0.03, 0.52, pk - 0.11, dx, dz + h * 0.24, M['glassd'])
            b('kick', w - 0.06, 0.03, 0.32, pk - 0.11, dx, 0.24, M['alu'])
        b('pushbar', 2 * w - 0.1, 0.05, 0.05, pk - 0.12, 0, 1.08, M['alu'])
        b('transom', 2 * w + 0.24, 0.04, 0.4, pk - 0.07, 0, h + 0.26, M['glassd'])
    else:
        b('door', w, 0.08, h, pk - 0.06, 0, dz, M['olive_dk'], bev=0.015)
        b('vision', w * 0.45, 0.03, 0.48, pk - 0.11, 0, dz + h * 0.24, M['glassd'])
        P.append(cyl('handle', 0.026, 0.6, x + w / 2 - 0.13, wy + n * (-(pk - 0.13)), 1.08,
                     M['alu'], verts=8))
        b('transom', w + 0.24, 0.04, 0.36, pk - 0.07, 0, h + 0.24, M['glassd'])
    b('dframe', fw + 0.12, 0.06, h + 0.62, pk - 0.02, 0, (h + 0.62) / 2 + 0.03, M['steel_dk'])
    b('stoop', ow + 0.6, 1.15, 0.20, -0.42, 0, 0.10, M['granite'], bev=0.015)
    b('step', ow + 1.0, 0.45, 0.10, -1.05, 0, 0.05, M['granite'], bev=0.012)
    for s in (-1, 1):
        hx = x + s * (ow / 2 + 0.26)
        P.append(strut('rail', (hx, wy + n * 0.04, 1.05), (hx, wy + n * (-0.92), 1.05),
                       0.026, M['galv']))
        for t in (0.06, 0.82):
            P.append(cyl('rpost', 0.024, 1.05, hx, wy - n * (0.1 - t), 0.52, M['galv'], verts=8))
    if ramp:
        rx = x + ow / 2 + 1.5
        P.append(box('ramp', 2.2, 2.0, 0.12, rx, wy + n * 1.05, 0.22, M['conc'],
                     rx=math.radians(-7 * n), bev=0.015))
        for s in (-1, 1):
            P.append(strut('rmrail', (rx + s * 1.05, wy + n * 0.15, 1.05),
                           (rx + s * 1.05, wy + n * 2.0, 0.82), 0.024, M['galv']))
            for t in (0.35, 1.6):
                P.append(cyl('rmp', 0.022, 1.05, rx + s * 1.05, wy + n * t, 0.52, M['galv'], verts=8))
    if canopy:
        cw, cd = ow + 1.15, 1.7
        cz = oh + 0.6
        P.append(box('canopy', cw, cd, 0.12, x, wy + n * (cd / 2 + 0.06), cz, M['alu'], bev=0.02))
        P.append(box('cfascia', cw + 0.06, 0.11, 0.20, x, wy + n * (cd + 0.06), cz + 0.02,
                     M['acc_' + accent], bev=0.012))
        P.append(box('csof', cw - 0.1, cd - 0.1, 0.03, x, wy + n * (cd / 2 + 0.06), cz - 0.08,
                     M['paintw']))
        for s in (-1, 1):
            P.append(strut('cstay', (x + s * (cw / 2 - 0.22), wy + n * (cd - 0.05), cz - 0.04),
                           (x + s * (cw / 2 - 0.22), wy + n * 0.1, cz + 0.72), 0.022, M['galv']))
        P.append(box('cgutter', cw, 0.09, 0.09, x, wy + n * (cd + 0.16), cz - 0.06, M['galv']))
        for lx in (-cw / 4, cw / 4):
            P.append(box('clamp', 0.42, 0.2, 0.04, x + lx, wy + n * (cd / 2), cz - 0.09, M['lamp']))
    for s in (-1, 1):
        lx = x + s * (ow / 2 + 0.44)
        P.append(box('lampb', 0.13, 0.10, 0.2, lx, wy + n * 0.06, oh - 0.05, M['steel_dk']))
        P.append(box('lampg', 0.19, 0.15, 0.13, lx, wy + n * 0.15, oh - 0.16, M['lamp'], bev=0.02))
    if sign:
        P.append(box('signp', 2.1, 0.06, 0.38, x, wy + n * 0.05, oh + 0.34, M['acc_' + accent], bev=0.012))
        P.append(text3d('signt', sign, 0.2, x, wy + n * 0.11, oh + 0.34, M['white'],
                        rot=(math.pi / 2, 0, math.pi if face < 0 else 0)))

def rollup_door(P, C, x, w=3.2, h=3.0, face=-1):
    """정비고 롤업 셔터 — 실제 개구부 + 슬랫 + 배럴 + 가이드 레일 + 진입 슬래브."""
    wy = FY if face < 0 else BY
    n = -1 if face < 0 else 1
    pocket(C, face, x, w, h, 0, depth=0.28, zspan=(-0.2, h))
    P.append(box('rsback', w + 0.1, 0.05, h, x, wy - n * 0.55, h / 2, M['glassd']))
    P.append(box('rslat', w - 0.04, 0.07, h - 0.05, x, wy - n * 0.18, h / 2, M['galv_dk']))
    for i in range(int(h / 0.32)):
        P.append(box('rrib', w - 0.04, 0.05, 0.05, x, wy - n * 0.13, 0.2 + i * 0.32, M['galv']))
    P.append(box('rbarrel', w + 0.5, 0.42, 0.42, x, wy + n * 0.14, h + 0.26, M['steel_dk'], bev=0.03))
    for s in (-1, 1):
        P.append(box('rguide', 0.14, 0.30, h + 0.1, x + s * (w / 2 + 0.05), wy - n * 0.14,
                     (h + 0.1) / 2, M['steel_dk']))
    P.append(box('rlint', w + 0.9, 0.30, 0.34, x, wy + n * 0.08, h + 0.62, M['conc'], bev=0.02))
    P.append(box('rapron', w + 1.0, 1.9, 0.10, x, wy + n * 1.05, 0.05, M['conc'], bev=0.012))
    P.append(box('rthr', w + 0.2, 0.34, 0.05, x, wy + n * 0.04, 0.05, M['alu']))
    for s in (-1, 1):                                     # 진입 유도 볼라드
        P.append(cyl('rbol', 0.09, 0.9, x + s * (w / 2 + 0.7), wy + n * 1.5, 0.45, M['warn'], verts=10))

def louver_bank(P, C, x, face, z=1.75, w=1.55, h=1.75, slats=9):
    """흡·배기 루버 — 개구부를 뚫고 그 안에 경사 슬랫을 채운다."""
    wy = BY if face > 0 else FY
    n = 1 if face > 0 else -1
    pocket(C, face, x, w, h, z, depth=0.20)
    P.append(box('lvbk', w + 0.06, 0.04, h + 0.06, x, wy - n * 0.19, z, M['glassd']))
    P.append(box('lvfr', w + 0.14, 0.08, h + 0.14, x, wy - n * 0.05, z, M['galv_dk'], bev=0.012))
    for i in range(slats):
        P.append(box('lvsl', w - 0.02, 0.15, 0.055, x, wy - n * 0.10,
                     z - h / 2 + 0.10 + i * (h - 0.2) / (slats - 1), M['alu'],
                     rx=math.radians(-24 * n)))
    P.append(box('lvsill', w + 0.3, 0.22, 0.06, x, wy + n * 0.06, z - h / 2 - 0.10,
                 M['granite'], bev=0.012))

def downpipe(P, x, y, ztop, zbot=0.0, r=0.055, n_out=1):
    """선홈통 — 관 + 벽 브래킷 + 하단 슈 + 배수 그레이팅."""
    P.append(cyl('dp', r, ztop - zbot - 0.25, x, y, zbot + (ztop - zbot) / 2 + 0.12, M['galv'], verts=10))
    k = max(2, int((ztop - zbot) / 1.6))
    for i in range(k):
        P.append(box('dpbr', 0.06, 0.16, 0.05, x, y - 0.09 * n_out,
                     zbot + 0.5 + i * (ztop - zbot - 0.7) / max(1, k - 1), M['galv']))
    P.append(cyl('dpshoe', r * 1.25, 0.34, x, y, zbot + 0.17, M['galv'], verts=10,
                 rot=(math.radians(24 * n_out), 0, 0)))
    P.append(box('dpgrate', 0.36, 0.36, 0.05, x, y - 0.24 * n_out, zbot + 0.03, M['steel_dk']))

def wall_kit(P, accent, h=H, conduit=True, boxes=True, hose=False):
    """벽 잡물 — 전선관 입상 + 정션박스 + 소화전함. 실루엣을 깨는 값싼 디테일."""
    if conduit:
        for s in (-1, 1):
            cx = s * (WL / 2 - 1.9)
            P.append(cyl('cond', 0.035, h - 1.2, cx, FY - 0.05, 0.75 + (h - 1.2) / 2, M['galv'], verts=8))
            for i in range(2):
                P.append(box('cclip', 0.09, 0.10, 0.04, cx, FY - 0.09, 1.2 + i * (h - 2.1), M['galv']))
    if boxes:
        P.append(box('jbox', 0.30, 0.14, 0.38, WL / 2 - 1.9, FY - 0.09, 1.62, M['galv_dk'], bev=0.015))
        P.append(box('meter', 0.36, 0.17, 0.46, -WL / 2 + 1.5, BY + 0.11, 1.58, M['galv'], bev=0.015))
        P.append(box('meterd', 0.2, 0.03, 0.24, -WL / 2 + 1.5, BY + 0.20, 1.62, M['glassd']))
    if hose:
        P.append(box('hosec', 0.44, 0.21, 0.66, WL / 2 - 3.6, FY - 0.11, 1.42, M['red'], bev=0.02))
        P.append(box('hoseg', 0.32, 0.03, 0.32, WL / 2 - 3.6, FY - 0.23, 1.52, M['glassd']))
        P.append(box('hosel', 0.2, 0.03, 0.1, WL / 2 - 3.6, FY - 0.23, 1.10, M['white']))

def ac_bank(P, xs, face=-1, z=0.55, bracket=True):
    """벽걸이 실외기 열 — 팬 가드 링 + 배관 커버."""
    wy = FY if face < 0 else BY
    n = -1 if face < 0 else 1
    for x in xs:
        cy = wy + n * 0.42
        P.append(box('ac', 0.86, 0.34, 0.62, x, cy, z + 0.31, M['white'], bev=0.02))
        P.append(box('acfin', 0.80, 0.03, 0.5, x, cy + n * 0.16, z + 0.31, M['galv_dk']))
        P.append(torus('acring', 0.22, 0.02, x, cy + n * 0.19, z + 0.31, M['steel_dk'],
                       maj=16, mnr=6, rot=(math.pi / 2, 0, 0)))
        P.append(cyl('acfan', 0.19, 0.02, x, cy + n * 0.17, z + 0.31, M['dark'], verts=12,
                     rot=(math.pi / 2, 0, 0)))
        P.append(box('acpipe', 0.12, 0.10, z + 0.3, x + 0.5, wy + n * 0.07, (z + 0.3) / 2, M['paintw']))
        if bracket:
            for s in (-1, 1):
                P.append(strut('acbr', (x + s * 0.36, wy + n * 0.06, z + 0.02),
                               (x + s * 0.36, wy + n * 0.58, z + 0.02), 0.022, M['steel_dk']))
                P.append(strut('acbr2', (x + s * 0.36, wy + n * 0.06, z + 0.4),
                               (x + s * 0.36, wy + n * 0.58, z + 0.04), 0.018, M['steel_dk']))

# ── 지붕 소품 ────────────────────────────────────────────────
def roof_hvac(P, x, y, z, w=1.5, d=1.0, h=0.85, frame=True):
    if frame:
        P.append(box('hvbase', w + 0.3, d + 0.3, 0.10, x, y, z + 0.05, M['steel_dk']))
        for sx in (-1, 1):
            for sy in (-1, 1):
                P.append(box('hvfoot', 0.14, 0.14, 0.26, x + sx * (w / 2 + 0.05),
                             y + sy * (d / 2 + 0.05), z + 0.13, M['steel_dk']))
    P.append(box('hvac', w, d, h, x, y, z + 0.26 + h / 2, M['galv'], bev=0.03))
    P.append(box('hvpanel', w - 0.1, 0.03, h - 0.16, x, y - d / 2 - 0.01, z + 0.26 + h / 2, M['galv_dk']))
    for i in range(int(w / 0.12)):
        P.append(box('hvfin', 0.03, 0.03, h - 0.3, x - w / 2 + 0.1 + i * 0.12, y + d / 2 + 0.01,
                     z + 0.26 + h / 2, M['galv_dk']))
    for s in (-0.26, 0.26):
        P.append(torus('hvring', 0.24, 0.022, x + s * w, y, z + 0.26 + h + 0.01,
                       M['steel_dk'], maj=16, mnr=6))
        P.append(cyl('hvfan', 0.22, 0.03, x + s * w, y, z + 0.26 + h + 0.0, M['dark'], verts=14))
    P.append(box('hvduct', 0.36, 0.36, 0.5, x + w / 2 + 0.3, y, z + 0.4, M['alu'], bev=0.02))
    P.append(box('hvflex', 0.3, 0.3, 0.2, x + w / 2 + 0.3, y, z + 0.72, M['galv_dk']))

def vent_stack(P, x, y, z, r=0.14, hh=1.1, cap=True, guy=False, band=None):
    P.append(box('vflash', r * 4, r * 4, 0.08, x, y, z + 0.04, M['alu'], bev=0.015))
    P.append(tube('vstack', r, 0.02, hh, x, y, z + hh / 2 + 0.06, M['galv'], verts=14))
    if band:
        P.append(cyl('vband', r * 1.06, 0.16, x, y, z + hh * 0.78, M[band], verts=14))
    if cap:
        P.append(cyl('vcap', r * 1.7, 0.10, x, y, z + hh + 0.16, M['galv'], verts=14))
        for s in (-1, 1):
            P.append(cyl('vcapleg', 0.016, 0.2, x + s * r * 0.9, y, z + hh + 0.06, M['galv'], verts=6))
    if guy:
        for a in range(3):
            ang = a * 2 * math.pi / 3 + 0.4
            P.append(strut('vguy', (x, y, z + hh - 0.1),
                           (x + 1.3 * math.cos(ang), y + 1.3 * math.sin(ang), z + 0.12),
                           0.011, M['dark']))

def roof_ladder(P, x, y, z, h=1.9, face=-1):
    n = -1 if face < 0 else 1
    for s in (-1, 1):
        P.append(cyl('lrail', 0.024, h, x + s * 0.22, y, z + h / 2, M['galv'], verts=8))
    for i in range(int(h / 0.3)):
        P.append(cyl('lrung', 0.016, 0.44, x, y, z + 0.16 + i * 0.3, M['galv'], verts=6,
                     rot=(0, math.pi / 2, 0)))
    for i in range(2):
        P.append(torus('lcage', 0.36, 0.016, x, y + n * 0.12, z + 0.9 + i * 0.7, M['galv'],
                       maj=14, mnr=5, rot=(math.pi / 2, 0, 0)))

def cable_tray(P, x0, x1, y, z):
    P.append(box('ctray', abs(x1 - x0), 0.26, 0.05, (x0 + x1) / 2, y, z + 0.14, M['galv']))
    for s in (-1, 1):
        P.append(box('ctside', abs(x1 - x0), 0.03, 0.10, (x0 + x1) / 2, y + s * 0.13, z + 0.18, M['galv']))
    k = max(2, int(abs(x1 - x0) / 1.6))
    for i in range(k):
        P.append(box('ctleg', 0.06, 0.06, 0.14, x0 + (x1 - x0) * i / (k - 1), y, z + 0.07, M['steel_dk']))
    for i in range(3):
        P.append(cyl('cable', 0.022, abs(x1 - x0) - 0.2, (x0 + x1) / 2, y - 0.08 + i * 0.08,
                     z + 0.18, M['dark'], verts=6, rot=(0, math.pi / 2, 0)))

def roof_hatch(P, x, y, z):
    P.append(box('hcurb', 1.0, 0.9, 0.24, x, y, z + 0.12, M['conc'], bev=0.015))
    P.append(box('hlid', 1.06, 0.96, 0.07, x, y + 0.18, z + 0.30, M['alu'],
                 rx=math.radians(-38), bev=0.012))
    P.append(cyl('hhinge', 0.03, 0.9, x, y - 0.44, z + 0.25, M['steel_dk'], verts=8,
                 rot=(0, math.pi / 2, 0)))

def solar_array(P, x, y, z, nx=2, ny=1, tilt=30):
    for i in range(nx):
        for j in range(ny):
            px = x + (i - (nx - 1) / 2) * 1.75
            py = y + (j - (ny - 1) / 2) * 1.2
            P.append(box('sol', 1.66, 1.05, 0.045, px, py, z + 0.55, M['blue'],
                         rx=math.radians(tilt), bev=0.01))
            P.append(box('solfr', 1.72, 1.11, 0.02, px, py, z + 0.53, M['alu'],
                         rx=math.radians(tilt)))
            for s in (-1, 1):
                P.append(strut('solleg', (px + s * 0.7, py - 0.45, z + 0.02),
                               (px + s * 0.7, py - 0.45, z + 0.30), 0.02, M['steel_dk']))
                P.append(strut('solleg2', (px + s * 0.7, py + 0.45, z + 0.02),
                               (px + s * 0.7, py + 0.45, z + 0.78), 0.02, M['steel_dk']))

def water_tank(P, x, y, z, r=0.95, hh=1.3):
    P.append(cyl('wtank', r, hh, x, y, z + 0.75 + hh / 2, M['white'], verts=20))
    P.append(cyl('wtcap', r * 1.03, 0.09, x, y, z + 0.75 + hh + 0.04, M['blue'], verts=20))
    P.append(cyl('wtman', 0.2, 0.1, x + r * 0.4, y, z + 0.75 + hh + 0.12, M['galv'], verts=12))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box('wtleg', 0.09, 0.09, 0.75, x + sx * r * 0.62, y + sy * r * 0.62,
                         z + 0.38, M['steel_dk']))
    P.append(strut('wtbr', (x - r * 0.62, y - r * 0.62, z + 0.1), (x + r * 0.62, y + r * 0.62, z + 0.68),
                   0.016, M['steel_dk']))
    P.append(cyl('wtpipe', 0.05, 0.9, x - r * 0.8, y, z + 0.42, M['galv'], verts=8))

def dish(P, x, y, z, r=0.5, tilt=48, az=200):
    P.append(cyl('dpole', 0.05, 0.8, x, y, z + 0.4, M['steel_dk'], verts=10))
    P.append(cyl('dish', r, 0.05, x, y, z + 0.85, M['white'], verts=20,
                 rot=(math.radians(tilt), 0, math.radians(az))))
    P.append(cyl('dfeed', 0.025, r * 0.8, x, y, z + 0.85 + r * 0.35, M['steel_dk'], verts=6,
                 rot=(math.radians(tilt), 0, math.radians(az))))

def antenna_mast(P, x, y, z, hh=4.2, beacon=True):
    P.append(box('mbase', 0.5, 0.5, 0.16, x, y, z + 0.08, M['conc'], bev=0.015))
    P.append(cyl('mast', 0.055, hh, x, y, z + 0.16 + hh / 2, M['galv'], verts=10))
    for a in range(3):
        ang = a * 2 * math.pi / 3
        P.append(strut('mguy', (x, y, z + hh * 0.86),
                       (x + 1.5 * math.cos(ang), y + 1.5 * math.sin(ang), z + 0.2), 0.010, M['dark']))
    for zz in (0.45, 0.72):
        P.append(box('mant', 0.06, 0.06, 0.9, x + 0.16, y, z + 0.16 + hh * zz, M['olive_dk']))
    P.append(cyl('whip', 0.012, 1.6, x - 0.2, y, z + 0.16 + hh * 0.5, M['dark'], verts=6))
    if beacon:
        P.append(sph('bcn', 0.08, x, y, z + 0.16 + hh + 0.08, M['beacon'], seg=12))

# ═══════════════════════ 반복층 ═══════════════════════
#
# 반복층은 main 위에 그대로 얹힌다. 그래서 계단실 타워가 **같은 X 에 같은 폭으로**
# 이어져야 한다 — 어긋나면 2층부터 타워가 공중에 뜬 채 옆으로 밀린다.
# 창 열도 타워를 피해 TWX+TWW/2 오른쪽에서 시작한다.

FX0 = TWX + TWW / 2 + 1.15      # 타워 오른쪽, 창 열이 시작되는 X
FX1 = WL / 2 - 1.5              # 창 열 끝

def build_floor_generic():
    P, C = [], []
    T = wall_body(P, M['panel'], accent=None)
    stair_tower(P, C, T, 'floor', 'generic', mat=M['panel'])
    window_row(P, C, 4, 1.72, x0=FX0, x1=FX1, w=1.35, h=1.5, shade=True)
    for f in (-1, 1):
        for y in (-2.4, 2.4):
            window(P, C, y, f, 1.72, w=1.0, h=1.4, side=True, seed=int(y * 3) + 5)
    cut(T, C)
    band_course(P, 0.06, t=0.09, h=0.20)
    ac_bank(P, [1.2, 2.5, 3.8], face=1, z=0.42)
    wall_kit(P, 'generic', conduit=False)
    return finish(join_as(P, 'X'), 'FAC_FLOOR')

def build_floor_office():
    P, C = [], []
    T = wall_body(P, M['panelb'])
    stair_tower(P, C, T, 'floor', 'office', mat=M['panelb'])
    window_row(P, C, 4, 1.75, x0=FX0, x1=FX1, w=1.75, h=1.62, shade=True)
    for f in (-1, 1):
        window(P, C, 0, f, 1.75, w=1.15, h=1.5, side=True, seed=11)
    cut(T, C)
    band_course(P, 0.06, t=0.09, h=0.20)
    ac_bank(P, [0.4, 1.7, 3.0], face=1, z=0.42)
    wall_kit(P, 'office', conduit=False)
    return finish(join_as(P, 'X'), 'FAC_OFFICE_FLOOR')

def build_floor_security():
    P, C = [], []
    T = wall_body(P, M['conc'], base_mat=M['conc'])
    stair_tower(P, C, T, 'floor', 'security')
    slit_row(P, C, 3, 2.05, x0=FX0, x1=FX1)
    cut(T, C)
    band_course(P, 0.07, t=0.10, h=0.22)
    # 외부 계단 참 (+X)
    P.append(box('landing', 1.5, 1.8, 0.10, WL / 2 + 0.75, 0.4, 0.05, M['galv']))
    for s in (-1, 1):
        P.append(strut('lrail', (WL / 2 + 1.42, 0.4 + s * 0.85, 1.05),
                       (WL / 2 + 1.42, 0.4 - s * 0.85, 1.05), 0.024, M['galv']))
        P.append(cyl('lpost', 0.024, 1.05, WL / 2 + 1.42, 0.4 + s * 0.85, 0.55, M['galv'], verts=8))
    wall_kit(P, 'security', conduit=False, boxes=False)
    return finish(join_as(P, 'X'), 'FAC_SECURITY_FLOOR')

# ═══════════════════════ 동 셸 — 11 종 ═══════════════════════
#
# 공통 매싱: 주동 + 계단실 타워(−X 끝, 앞으로 0.95 돌출) + 정면 회랑 + 부속 저층동(+X 끝).
# 타입별 특징은 그 위에 얹는다. 어느 각도에서 봐도 실루엣이 사각형이 아니게 하는 것이
# 이 배치의 목적이다.

def build_command_main():
    P, C = [], []
    T = wall_body(P, M['conc'], accent='command', base_mat=M['conc'])
    stair_tower(P, C, T, 'main', 'command', sign='지 휘 통 제 실', code='C-01')
    slit_row(P, C, 3, 2.55, x0=FX0 + 0.4, x1=FX1 - 1.6)
    cut(T, C)
    arcade(P, TWX + TWW / 2 + 1.0, WL / 2 - 3.4, z=2.95, depth=1.85, accent='command')
    annex(P, C, WL / 2 - 2.0, w=4.6, d=3.2, h=2.5, mat=M['conc'], accent='command')
    band_course(P, H - 0.62, t=0.08, h=0.14)
    # 방폭벽 + 모래주머니 + 대피 표지
    P.append(box('blast', 5.4, 0.5, 2.2, 1.0, FY - 3.4, 1.1, M['conc'], bev=0.05))
    P.append(box('blastcap', 5.6, 0.66, 0.12, 1.0, FY - 3.4, 2.26, M['conc'], bev=0.02))
    for i in range(4):
        P.append(box('blastrib', 0.16, 0.62, 2.2, -1.4 + i * 1.6, FY - 3.4, 1.1, M['conc'], bev=0.02))
    for s in (-1, 1):
        for i in range(3):
            P.append(box('sbag', 1.6, 0.52, 0.27, 1.0 + s * 3.4, FY - 2.5, 0.14 + i * 0.25,
                         M['earth'], bev=0.07))
    decal(P, -0.4, -1, 2.15, 0.5, 0.5, M['red'])                    # 출입통제
    decal(P, WL / 2 - 0.9, -1, 1.9, 0.42, 0.6, M['warn'])
    notice_board(P, FX0 + 0.2, z=1.55)
    wall_kit(P, 'command', hose=True)
    downpipe(P, LX + 0.20, FY - 0.18, H)
    downpipe(P, RX - 0.20, FY - 0.18, H)
    return finish(join_as(P, 'X'), 'FAC_COMMAND_MAIN')

def build_command_roof():
    P, C = [], []
    T = []
    parapet_roof(P, 0, M['conc'], accent='command', h=1.05)
    stair_tower(P, C, T, 'roof', 'command')
    z = 0.26
    P.append(sph('camonet', 3.0, 1.6, 0.6, z + 0.5, M['camonet'], seg=20, s=(1, 0.8, 0.32)))
    antenna_mast(P, 4.9, 2.1, z, hh=4.8)
    dish(P, 3.2, -2.3, z, r=0.58, tilt=46, az=195)
    roof_hvac(P, 0.8, 2.5, z, w=1.7, d=1.1, h=0.9)
    vent_stack(P, -1.2, -2.4, z, r=0.13, hh=1.0, band='red')
    cable_tray(P, -1.2, 3.9, 1.9, z)
    roof_hatch(P, 0.2, -0.5, z)
    return finish(join_as(P, 'X'), 'FAC_COMMAND_ROOF')

def build_security_main():
    P, C = [], []
    T = wall_body(P, M['conc'], accent='security', base_mat=M['conc'])
    stair_tower(P, C, T, 'main', 'security', sign='위 병 소', code='S-01')
    slit_row(P, C, 3, 2.2, x0=FX0 + 0.3, x1=FX1 - 0.6)
    for f in (-1, 1):
        window(P, C, 0, f, 2.2, w=0.9, h=0.34, side=True, mullion=False,
               glass=M['glassd'], room=False)
    cut(T, C)
    annex(P, C, WL / 2 - 2.2, w=4.4, d=3.0, h=2.4, mat=M['conc'], accent='security')
    band_course(P, H - 0.62, t=0.08, h=0.14)
    # 외부 철제 계단 (+X 면) — 실루엣을 크게 깨는 요소
    sx = WL / 2 + 0.66
    for i in range(9):
        P.append(box('stair', 1.0, 0.30, 0.05, sx, -2.4 + i * 0.60, 0.32 + i * 0.355, M['galv']))
        P.append(box('striser', 1.0, 0.03, 0.30, sx, -2.4 + i * 0.60 - 0.14, 0.18 + i * 0.355,
                     M['galv_dk']))
    for s in (0, 1):
        P.append(strut('srail', (sx + 0.48 - s * 0.96, -2.6, 1.28), (sx + 0.48 - s * 0.96, 2.6, 4.4),
                       0.026, M['galv']))
    for i in range(4):
        P.append(cyl('spost', 0.022, 1.05, sx + 0.48, -2.2 + i * 1.5, 0.75 + i * 0.53, M['galv'], verts=8))
    P.append(box('stringer', 0.10, 5.9, 0.38, sx - 0.52, 0.1, 2.3, M['steel_dk'], rx=math.radians(-30.6)))
    for i in range(3):
        P.append(box('sbagL', 3.2, 0.58, 0.29, 1.4, FY - 1.5, 0.15 + i * 0.27, M['earth'], bev=0.08))
    P.append(box('sbagS', 0.58, 1.7, 0.85, -0.4, FY - 2.2, 0.43, M['earth'], bev=0.08))
    decal(P, FX0 + 0.6, -1, 2.0, 0.5, 0.62, M['red'])
    wall_kit(P, 'security', hose=True)
    downpipe(P, LX + 0.20, FY - 0.18, H)
    return finish(join_as(P, 'X'), 'FAC_SECURITY_MAIN')

def build_security_roof():
    P, C = [], []
    T = []
    parapet_roof(P, 0, M['conc'], accent='security', h=1.3)
    stair_tower(P, C, T, 'roof', 'security')
    z = 0.26
    P.append(cyl('mgpost', 0.06, 1.0, 3.2, -1.7, z + 0.5, M['steel_dk'], verts=10))
    P.append(torus('mgring', 0.54, 0.05, 3.2, -1.7, z + 1.02, M['steel_dk'], maj=20, mnr=8))
    P.append(box('mgtray', 0.42, 0.32, 0.12, 3.2, -1.2, z + 1.02, M['olive_dk']))
    for i in range(3):
        P.append(box('rsbag', 2.8, 0.52, 0.27, 1.2, -(WD / 2 - 0.8), z + 0.14 + i * 0.25,
                     M['earth'], bev=0.08))
    P.append(box('slyoke', 0.09, 0.24, 0.34, -1.2, -1.7, z + 0.5, M['steel_dk']))
    P.append(cyl('slbody', 0.19, 0.44, -1.2, -1.7, z + 0.78, M['olive_dk'], verts=14,
                 rot=(math.radians(72), 0, math.radians(-160))))
    P.append(cyl('sllens', 0.17, 0.03, -1.35, -1.82, z + 0.86, M['lamp'], verts=14,
                 rot=(math.radians(72), 0, math.radians(-160))))
    antenna_mast(P, 4.8, 2.0, z, hh=3.2)
    roof_hatch(P, 1.0, 2.0, z)
    vent_stack(P, 2.4, 2.6, z, r=0.11, hh=0.8)
    return finish(join_as(P, 'X'), 'FAC_SECURITY_ROOF')

def build_living_main():
    P, C = [], []
    T = wall_body(P, M['panel'], accent='living')
    stair_tower(P, C, T, 'main', 'living', sign='생 활 관', code='L-01', mat=M['panel'])
    window_row(P, C, 4, 1.72, x0=FX0, x1=FX1, w=1.35, h=1.5, shade=True)
    for f in (-1, 1):
        for y in (-2.4, 2.4):
            window(P, C, y, f, 1.72, w=1.0, h=1.4, side=True, seed=int(y * 5) + 3)
    cut(T, C)
    arcade(P, TWX + TWW / 2 + 0.9, WL / 2 - 3.0, z=2.92, depth=1.75, accent='living')
    annex(P, C, WL / 2 - 1.9, w=4.4, d=3.2, h=2.45, mat=M['panel'], accent='living')
    band_course(P, H - 0.62, t=0.08, h=0.14)
    # 세탁 마당 (배면)
    for dx in (2.0, 3.4):
        P.append(cyl('lpole', 0.035, 1.9, dx, BY + 1.25, 0.95, M['galv'], verts=8))
        P.append(box('lbase', 0.26, 0.26, 0.1, dx, BY + 1.25, 0.05, M['conc']))
    for zz in (1.3, 1.62):
        P.append(strut('lline', (2.0, BY + 1.25, zz), (3.4, BY + 1.25, zz), 0.007, M['white']))
    P.append(box('bench', 1.8, 0.44, 0.07, -1.0, BY + 0.72, 0.44, M['deck'], bev=0.012))
    P.append(box('bback', 1.8, 0.06, 0.36, -1.0, BY + 0.90, 0.68, M['deck'], bev=0.012))
    for s in (-1, 1):
        P.append(box('bleg', 0.07, 0.38, 0.44, -1.0 + s * 0.76, BY + 0.72, 0.22, M['steel_dk']))
    notice_board(P, FX0 + 0.4, z=1.5)
    wall_kit(P, 'living', hose=True)
    downpipe(P, LX + 0.20, FY - 0.20, H)
    downpipe(P, RX - 0.20, FY - 0.20, H)
    downpipe(P, LX + 0.20, BY + 0.20, H, n_out=-1)
    return finish(join_as(P, 'X'), 'FAC_LIVING_MAIN')

def build_living_roof():
    P, C = [], []
    T = []
    gable_roof(P, 0, pitch=14, over=0.62, accent='living')
    stair_tower(P, C, T, 'roof', 'living', mat=M['panel'])
    z = 1.55                                          # 용마루 근처 — 기물은 경사면 위 가대에
    P.append(box('rdeck', 5.2, 3.0, 0.10, 2.6, 0.0, 0.98, M['steel_dk'], bev=0.015))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box('rdleg', 0.1, 0.1, 0.7, 2.6 + sx * 2.3, sy * 1.3, 0.6, M['steel_dk']))
    water_tank(P, 1.2, 0.0, 1.03, r=0.9, hh=1.25)
    solar_array(P, 4.0, 0.0, 1.03, nx=2, ny=1, tilt=22)
    vent_stack(P, -1.4, 0.0, 1.28, r=0.12, hh=0.9)
    vent_stack(P, -2.4, 0.0, 1.28, r=0.12, hh=0.9)
    roof_hvac(P, 5.4, 0.0, 1.03, w=1.2, d=0.85, h=0.65)
    return finish(join_as(P, 'X'), 'FAC_LIVING_ROOF')

def build_welfare_main():
    P, C = [], []
    T = wall_body(P, M['brick'], accent='welfare')
    stair_tower(P, C, T, 'main', 'welfare', sign='복 지 관 · P X', code='W-01', mat=M['brick'])
    for f in (-1, 1):
        for x in (FX0 + 0.7, FX0 + 4.0):
            window(P, C, x, f, 1.95, w=2.4, h=1.85, seed=int(x) + (9 if f > 0 else 0))
    cut(T, C)
    for f in (-1, 1):
        wy = BY if f > 0 else FY
        n = 1 if f > 0 else -1
        for x in (FX0 + 0.7, FX0 + 4.0):
            P.append(box('spand', 2.6, 0.06, 0.9, x, wy + n * 0.05, 0.62, M['acc_welfare'], bev=0.012))
    for x in (FX0 + 0.7, FX0 + 4.0):                   # 상점형 어닝
        P.append(box('awn', 2.7, 0.95, 0.06, x, FY - 0.52, 3.06, M['red'],
                     rx=math.radians(-14), bev=0.012))
        P.append(box('awnv', 2.72, 0.06, 0.22, x, FY - 0.96, 2.94, M['red'], bev=0.01))
        for s in (-1, 1):
            P.append(strut('awnarm', (x + s * 1.25, FY - 0.05, 2.7), (x + s * 1.25, FY - 0.95, 2.98),
                           0.018, M['alu']))
    band_course(P, H - 0.62, t=0.08, h=0.14)
    P.append(box('vend', 0.98, 0.58, 1.95, WL / 2 - 1.2, FY - 0.55, 0.98, M['acc_welfare'], bev=0.025))
    P.append(box('vendg', 0.64, 0.04, 1.2, WL / 2 - 1.2, FY - 0.85, 1.18, M['glassd']))
    # 옥외 테라스 — 데크 + 파라솔 테이블
    P.append(box('terr', 5.4, 2.6, 0.12, FX0 + 2.3, FY - 1.8, 0.06, M['deck'], bev=0.015))
    for bx in (FX0 + 0.9, FX0 + 3.7):
        P.append(cyl('tbl', 0.58, 0.06, bx, FY - 1.8, 0.8, M['deck'], verts=16))
        P.append(cyl('tblleg', 0.06, 0.74, bx, FY - 1.8, 0.43, M['steel_dk'], verts=8))
        P.append(cyl('tblft', 0.3, 0.04, bx, FY - 1.8, 0.14, M['steel_dk'], verts=12))
        P.append(cyl('umbp', 0.035, 2.3, bx, FY - 1.8, 1.2, M['alu'], verts=8))
        P.append(cyl('umb', 1.35, 0.5, bx, FY - 1.8, 2.3, M['acc_welfare'], verts=12, rtop=0.06))
        for s in (-1, 1):
            P.append(box('chair', 0.44, 0.44, 0.06, bx + s * 0.95, FY - 1.8, 0.46, M['deck']))
            P.append(box('chairb', 0.44, 0.06, 0.42, bx + s * 0.95, FY - 1.8 + s * 0.19, 0.7, M['deck']))
    wall_kit(P, 'welfare', hose=True)
    downpipe(P, LX + 0.20, FY - 0.20, H)
    downpipe(P, RX - 0.20, FY - 0.20, H)
    return finish(join_as(P, 'X'), 'FAC_WELFARE_MAIN')

def build_welfare_roof():
    P, C = [], []
    T = []
    gable_roof(P, 0, pitch=15, over=0.6, accent='welfare')
    stair_tower(P, C, T, 'roof', 'welfare', mat=M['brick'])
    P.append(box('rdeck', 4.6, 2.8, 0.10, 3.0, 0.0, 1.02, M['steel_dk'], bev=0.015))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box('rdleg', 0.1, 0.1, 0.75, 3.0 + sx * 2.0, sy * 1.2, 0.62, M['steel_dk']))
    P.append(box('hood', 1.5, 1.15, 0.95, 2.0, 0.0, 1.55, M['galv'], bev=0.03))
    P.append(tube('hstack', 0.27, 0.02, 2.1, 2.0, 0.0, 3.05, M['galv'], verts=16))
    P.append(cyl('hcap', 0.42, 0.15, 2.0, 0.0, 4.16, M['dark'], verts=16))
    for s in (-1, 1):
        P.append(strut('hguy', (2.0, 0.0, 3.85), (2.0 + s * 1.4, s * 0.9, 1.15), 0.011, M['dark']))
    for vx in (4.2, 5.0):
        P.append(cyl('effan', 0.34, 0.4, vx, 0.0, 1.28, M['galv'], verts=16))
        P.append(cyl('efcowl', 0.44, 0.1, vx, 0.0, 1.52, M['galv'], verts=16))
    return finish(join_as(P, 'X'), 'FAC_WELFARE_ROOF')

def build_hygiene_main():
    P, C = [], []
    T = wall_body(P, M['panelw'], accent='hygiene')
    stair_tower(P, C, T, 'main', 'hygiene', sign='세 면 · 샤 워 장', code='H-01', mat=M['panelw'])
    window_row(P, C, 5, 2.5, x0=FX0, x1=FX1, w=0.9, h=0.66, glass=M['glassd'], room=False)
    for x in (FX0 + 0.6, FX0 + 2.8, FX0 + 5.0):
        for f in (-1, 1):
            louver_bank(P, C, x, f, z=1.0, w=0.78, h=0.55, slats=4)
    cut(T, C)
    annex(P, C, WL / 2 - 2.1, w=4.4, d=3.0, h=2.4, mat=M['panelw'], accent='hygiene')
    band_course(P, H - 0.62, t=0.08, h=0.14)
    # LPG 봄베 케이지 (배면)
    cgx = 1.2
    for i in range(3):
        P.append(cyl('lpg', 0.23, 1.28, cgx - 0.58 + i * 0.58, BY + 0.7, 0.64, M['galv'], verts=14))
        P.append(sph('lpgcap', 0.22, cgx - 0.58 + i * 0.58, BY + 0.7, 1.26, M['galv'], seg=12))
        P.append(cyl('lpgv', 0.05, 0.16, cgx - 0.58 + i * 0.58, BY + 0.7, 1.38, M['red'], verts=8))
    for s in (-1, 1):
        for yy in (0.2, 1.2):
            P.append(cyl('cgp', 0.035, 1.9, cgx + s * 1.1, BY + yy, 0.95, M['galv'], verts=8))
    for zz in (0.5, 1.15, 1.75):
        P.append(strut('cgb', (cgx - 1.1, BY + 0.7, zz), (cgx + 1.1, BY + 0.7, zz), 0.014, M['galv']))
    P.append(box('cgroof', 2.5, 1.3, 0.05, cgx, BY + 0.7, 1.92, M['roofm']))
    P.append(box('cgwarn', 0.52, 0.03, 0.36, cgx, BY + 0.16, 1.45, M['stripes']))
    decal(P, FX0 + 1.0, -1, 2.05, 0.44, 0.56, M['signblu'])
    wall_kit(P, 'hygiene')
    downpipe(P, LX + 0.20, FY - 0.20, H)
    downpipe(P, RX - 0.20, BY + 0.20, H, n_out=-1)
    return finish(join_as(P, 'X'), 'FAC_HYGIENE_MAIN')

def build_hygiene_roof():
    P, C = [], []
    T = []
    gable_roof(P, 0, pitch=13, over=0.58, accent='hygiene')
    stair_tower(P, C, T, 'roof', 'hygiene', mat=M['panelw'])
    P.append(box('rdeck', 6.0, 3.0, 0.10, 2.4, 0.0, 0.96, M['steel_dk'], bev=0.015))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box('rdleg', 0.1, 0.1, 0.68, 2.4 + sx * 2.7, sy * 1.3, 0.58, M['steel_dk']))
    solar_array(P, 3.8, 0.0, 1.0, nx=2, ny=1, tilt=32)
    P.append(cyl('hwt', 0.78, 2.5, 0.6, 0.0, 1.85, M['galv'], verts=20, rot=(0, math.pi / 2, 0)))
    P.append(cyl('hwtc', 0.80, 0.08, -0.66, 0.0, 1.85, M['alu'], verts=20, rot=(0, math.pi / 2, 0)))
    for dx in (-0.3, 1.5):
        P.append(box('hwsup', 0.24, 1.6, 0.8, dx, 0.0, 1.45, M['steel_dk'], bev=0.02))
    P.append(cyl('hwpipe', 0.055, 1.8, 2.4, 0.0, 1.2, M['galv'], verts=8, rot=(0, math.pi / 2, 0)))
    for i in range(3):
        vent_stack(P, 5.2 - i * 0.9, 0.0, 1.06, r=0.075, hh=0.62)
    return finish(join_as(P, 'X'), 'FAC_HYGIENE_ROOF')

def build_medical_main():
    P, C = [], []
    T = wall_body(P, M['panelw'], accent='medical')
    stair_tower(P, C, T, 'main', 'medical', sign='의 무 실', code='M-01', mat=M['panelw'])
    window_row(P, C, 3, 1.85, x0=FX0 + 0.6, x1=FX1 - 1.4, w=1.5, h=1.55, shade=True)
    for f in (-1, 1):
        window(P, C, 0, f, 1.85, w=1.15, h=1.5, side=True, seed=21)
    cut(T, C)
    band_course(P, H - 0.62, t=0.08, h=0.14)
    # 구급차 진입 캐노피 (+X 끝) — 부속동 대신 이쪽이 의무동의 특징이다
    cx, cy = WL / 2 - 1.4, FY - 2.3
    for (px, py) in [(cx - 1.5, cy - 1.5), (cx + 1.5, cy - 1.5), (cx - 1.5, cy + 1.4), (cx + 1.5, cy + 1.4)]:
        P.append(cyl('acpost', 0.10, 3.6, px, py, 1.8, M['alu'], verts=14))
        P.append(box('acbase', 0.4, 0.4, 0.18, px, py, 0.09, M['granite'], bev=0.02))
    P.append(box('acroof', 3.9, 4.0, 0.14, cx, cy, 3.66, M['alu'], bev=0.02))
    P.append(box('acsof', 3.7, 3.8, 0.04, cx, cy, 3.56, M['paintw']))
    P.append(box('acfas', 3.95, 0.11, 0.24, cx, cy - 2.0, 3.6, M['acc_medical'], bev=0.012))
    P.append(box('acpad', 4.2, 4.4, 0.10, cx, cy, 0.05, M['conc'], bev=0.012))
    for s in (-1, 1):
        P.append(box('acline', 0.10, 4.0, 0.006, cx + s * 1.8, cy, 0.104, M['white']))
    P.append(box('redx', 1.15, 0.05, 1.15, FX0 + 0.2, FY - 0.05, 2.45, M['redx'], bev=0.01))
    P.append(box('redx2', 0.05, 1.15, 1.15, LX - 0.05, 1.5, 2.45, M['redx'], bev=0.01))
    # 산소통 랙 (배면)
    for i in range(4):
        P.append(cyl('o2', 0.13, 1.5, 2.2 + i * 0.34, BY + 0.5, 0.75, M['white'], verts=12))
        P.append(sph('o2c', 0.1, 2.2 + i * 0.34, BY + 0.5, 1.55, M['blue'], seg=10))
    for zz in (0.28, 1.05):
        P.append(box('o2rack', 1.8, 0.5, 0.08, 2.71, BY + 0.5, zz, M['steel_dk']))
    for s in (-1, 1):
        P.append(cyl('o2p', 0.03, 1.15, 2.71 + s * 0.86, BY + 0.5, 0.57, M['steel_dk'], verts=8))
    wall_kit(P, 'medical', hose=True)
    downpipe(P, LX + 0.20, BY + 0.20, H, n_out=-1)
    downpipe(P, RX - 0.20, BY + 0.20, H, n_out=-1)
    return finish(join_as(P, 'X'), 'FAC_MEDICAL_MAIN')

def build_medical_roof():
    P, C = [], []
    T = []
    parapet_roof(P, 0, M['panelw'], accent='medical', h=0.75)
    stair_tower(P, C, T, 'roof', 'medical', mat=M['panelw'])
    z = 0.26
    P.append(box('roofx', 3.4, 3.4, 0.03, 1.6, 0.2, z + 0.02, M['redx']))
    roof_hvac(P, 4.4, 1.7, z, w=1.6, d=1.1, h=0.9)
    vent_stack(P, 3.6, -2.0, z, r=0.1, hh=0.85)
    vent_stack(P, -1.0, 2.0, z, r=0.1, hh=0.85)
    cable_tray(P, 1.8, 4.8, 2.6, z)
    roof_hatch(P, -1.4, -1.7, z)
    return finish(join_as(P, 'X'), 'FAC_MEDICAL_ROOF')

def build_edu_main():
    P, C = [], []
    T = wall_body(P, M['brick'], accent='edu')
    stair_tower(P, C, T, 'main', 'edu', sign='교 육 장', code='E-01', mat=M['brick'])
    for f in (-1, 1):
        for x in (FX0 + 0.6, FX0 + 3.5):
            window(P, C, x, f, 1.98, w=2.35, h=1.9, shade=(f < 0), seed=int(x) * 3 + (5 if f > 0 else 0))
    for f in (-1, 1):
        window(P, C, 0, f, 1.9, w=1.25, h=1.55, side=True, seed=31)
    cut(T, C)
    annex(P, C, WL / 2 - 2.0, w=4.4, d=3.2, h=2.5, mat=M['brick'], accent='edu')
    band_course(P, H - 0.62, t=0.08, h=0.14)
    band_course(P, 0.98, t=0.06, h=0.10, mat=M['granite'])
    # 국기 게양대 3본 (정면 진입부)
    for i, hgt in enumerate((6.4, 7.0, 6.4)):
        fx = FX0 + 5.2 + (i - 1) * 0.9
        P.append(box('fpbase', 0.5, 0.5, 0.2, fx, FY - 2.1, 0.1, M['granite'], bev=0.02))
        P.append(cyl('fpole', 0.05, hgt, fx, FY - 2.1, hgt / 2 + 0.2, M['white'], verts=12))
        P.append(sph('fptop', 0.085, fx, FY - 2.1, hgt + 0.28, M['warn'], seg=12))
    P.append(box('fpplinth', 3.4, 1.4, 0.24, FX0 + 5.2, FY - 2.1, 0.12, M['granite'], bev=0.02))
    notice_board(P, FX0 - 0.4, z=1.5)
    decal(P, FX0 + 2.0, -1, 2.55, 0.6, 0.6, M['signgrn'])
    wall_kit(P, 'edu', hose=True)
    downpipe(P, LX + 0.20, FY - 0.20, H)
    downpipe(P, RX - 0.20, FY - 0.20, H)
    return finish(join_as(P, 'X'), 'FAC_EDU_MAIN')

def build_edu_roof():
    P, C = [], []
    T = []
    gable_roof(P, 0, pitch=16, over=0.68, accent='edu')
    stair_tower(P, C, T, 'roof', 'edu', mat=M['brick'])
    # 톱날 채광창 — 용마루 북측면에 앉힌다
    rise = math.tan(math.radians(16)) * ((WD + 1.36) / 2)
    for i in range(3):
        gx = -0.4 + i * 3.4
        P.append(box('swall', 3.0, 0.14, 0.95, gx, 1.2, rise * 0.45 + 0.55, M['panelw'], bev=0.02))
        P.append(box('sglass', 2.9, 0.06, 0.8, gx, 1.13, rise * 0.45 + 0.55, M['glass']))
        P.append(box('sroof', 3.1, 1.7, 0.09, gx, 0.5, rise * 0.45 + 1.08, M['zinc'],
                     rx=math.radians(18), bev=0.015))
        P.append(box('sfr', 3.0, 0.05, 0.05, gx, 1.15, rise * 0.45 + 0.95, M['alu']))
    roof_hvac(P, 5.0, -1.9, 0.85, w=1.5, d=1.0, h=0.8)
    vent_stack(P, -2.6, -1.6, 0.72, r=0.1, hh=0.85)
    return finish(join_as(P, 'X'), 'FAC_EDU_ROOF')

def build_office_main():
    P, C = [], []
    T = wall_body(P, M['panelb'], accent='office')
    stair_tower(P, C, T, 'main', 'office', sign='행 정 반', code='A-01', mat=M['panelb'])
    for f in (-1, 1):
        for x in (FX0 + 0.4, FX0 + 3.0, FX0 + 5.4):
            window(P, C, x, f, 1.85, w=1.95, h=1.65, shade=(f < 0), blind=(f < 0),
                   seed=int(x) * 7 + (3 if f > 0 else 0))
    for f in (-1, 1):
        window(P, C, 0, f, 1.85, w=1.2, h=1.55, side=True, seed=41)
    cut(T, C)
    arcade(P, TWX + TWW / 2 + 1.0, WL / 2 - 1.6, z=2.95, depth=1.7, accent='office')
    band_course(P, H - 0.62, t=0.08, h=0.14)
    ac_bank(P, [1.0, 2.3, 3.6], face=1, z=0.48)
    notice_board(P, FX0 + 0.4, z=1.5)
    wall_kit(P, 'office', hose=True)
    downpipe(P, LX + 0.20, FY - 0.20, H)
    downpipe(P, RX - 0.20, BY + 0.20, H, n_out=-1)
    return finish(join_as(P, 'X'), 'FAC_OFFICE_MAIN')

def build_office_roof():
    P, C = [], []
    T = []
    parapet_roof(P, 0, M['conc'], accent='office', h=0.9)
    stair_tower(P, C, T, 'roof', 'office', mat=M['panelb'])
    z = 0.26
    roof_hvac(P, 0.4, 1.5, z, w=1.7, d=1.1, h=0.85)
    roof_hvac(P, 3.4, 1.5, z, w=1.3, d=0.9, h=0.7)
    cable_tray(P, 0.4, 4.6, 0.2, z)
    dish(P, 5.0, -1.9, z, r=0.44, tilt=44, az=165)
    vent_stack(P, -1.2, -1.9, z, r=0.1, hh=0.78)
    roof_hatch(P, 4.6, 2.3, z)
    return finish(join_as(P, 'X'), 'FAC_OFFICE_ROOF')

def build_maint_main():
    """정비고 — 대공간 + 롤업 2련. 계단실 타워가 사무동 역할을 한다."""
    P, C = [], []
    T = wall_body(P, M['panel'], accent='maint')
    stair_tower(P, C, T, 'main', 'maint', sign='정 비 고', code='V-01', mat=M['panel'])
    rollup_door(P, C, FX0 + 1.4, w=3.7, h=3.0)
    rollup_door(P, C, FX0 + 5.6, w=3.7, h=3.0)
    for x in (FX0 + 1.4, FX0 + 5.6):
        window(P, C, x, 1, 2.4, w=1.7, h=0.85, room=False)
    cut(T, C)
    band_course(P, H - 0.55, t=0.08, h=0.14)
    for i, mkey in enumerate(('warn', 'olive_dk', 'galv')):
        P.append(cyl('drum', 0.29, 0.88, WL / 2 - 0.9, BY + 0.7 + i * 0.66, 0.44, M[mkey], verts=16))
        for zz in (0.26, 0.62):
            P.append(cyl('drumrib', 0.30, 0.05, WL / 2 - 0.9, BY + 0.7 + i * 0.66, zz, M[mkey], verts=16))
    for i in range(3):
        P.append(torus('tire', 0.36, 0.135, 0.4, BY + 0.85, 0.15 + i * 0.28, M['rubber'], maj=18, mnr=9))
    P.append(box('wbench', 2.4, 0.68, 0.09, -1.6, BY + 0.65, 0.9, M['steel_dk'], bev=0.012))
    for s in (-1, 1):
        P.append(box('wbleg', 0.08, 0.58, 0.9, -1.6 + s * 1.1, BY + 0.65, 0.45, M['dark']))
    decal(P, FX0 + 3.5, -1, 2.7, 0.55, 0.55, M['warn'])
    wall_kit(P, 'maint', hose=True)
    downpipe(P, RX - 0.20, FY - 0.20, H)
    downpipe(P, LX + 0.20, BY + 0.20, H, n_out=-1)
    return finish(join_as(P, 'X'), 'FAC_MAINT_MAIN')

def build_maint_roof():
    P, C = [], []
    T = []
    gable_roof(P, 0, pitch=11, over=0.75, accent='maint', seam=False)
    stair_tower(P, C, T, 'roof', 'maint', mat=M['panel'])
    rise = math.tan(math.radians(11)) * ((WD + 1.5) / 2)
    # 정면 돌출 크레인 I 빔 + 호이스트
    for bx in (FX0 + 1.4, FX0 + 5.6):
        P.append(box('cweb', 0.15, 3.8, 0.44, bx, FY - 1.3, -0.3, M['acc_maint']))
        P.append(box('cfl', 0.46, 3.8, 0.09, bx, FY - 1.3, -0.06, M['steel_dk']))
        P.append(box('cfl', 0.46, 3.8, 0.09, bx, FY - 1.3, -0.54, M['steel_dk']))
        P.append(box('hoist', 0.36, 0.48, 0.42, bx, FY - 2.5, -0.82, M['warn'], bev=0.02))
        P.append(strut('hcable', (bx, FY - 2.5, -1.03), (bx, FY - 2.5, -1.62), 0.016, M['dark']))
        P.append(box('hook', 0.1, 0.1, 0.24, bx, FY - 2.5, -1.74, M['steel_dk']))
        P.append(strut('cbrace', (bx, FY - 3.1, -0.34), (bx, FY + 0.4, 0.95), 0.03, M['steel_dk']))
    # 지붕 채광 + 대형 배기 벤틸레이터
    P.append(box('skyl', 5.4, 1.5, 0.14, 2.6, 1.2, rise * 0.55 + 0.28, M['glass'],
                 rx=math.radians(11), bev=0.015))
    for vx in (-1.0, 5.6):
        P.append(cyl('rvent', 0.44, 0.55, vx, 0.0, rise + 0.32, M['galv'], verts=18))
        P.append(cyl('rvcap', 0.56, 0.1, vx, 0.0, rise + 0.66, M['galv'], verts=18))
    return finish(join_as(P, 'X'), 'FAC_MAINT_ROOF')

def build_infra_main():
    P, C = [], []
    T = wall_body(P, M['panel'], accent='infra')
    stair_tower(P, C, T, 'main', 'infra', sign='발 전 · 기 계 실', code='U-01', mat=M['panel'])
    for f in (-1, 1):
        for x in (FX0 + 0.6, FX0 + 3.1, FX0 + 5.6):
            louver_bank(P, C, x, f, z=1.8, w=1.6, h=1.8, slats=9)
    cut(T, C)
    band_course(P, H - 0.55, t=0.08, h=0.14)
    # 수평 연료탱크 + 방류턱 (배면)
    P.append(box('bund', 4.4, 2.8, 0.45, 1.6, BY + 1.8, 0.22, M['conc'], bev=0.03))
    P.append(cyl('ftank', 0.88, 3.2, 1.6, BY + 1.8, 1.4, M['olive'], verts=22, rot=(math.pi / 2, 0, 0)))
    P.append(cyl('ftcap', 0.89, 0.08, 1.6, BY + 3.4, 1.4, M['olive_dk'], verts=22, rot=(math.pi / 2, 0, 0)))
    for dy in (-1.05, 1.05):
        P.append(box('saddle', 1.35, 0.38, 0.58, 1.6, BY + 1.8 + dy, 0.64, M['steel_dk'], bev=0.02))
    P.append(cyl('fman', 0.22, 0.14, 1.6, BY + 1.8, 2.3, M['galv'], verts=12))
    P.append(cyl('fpipe', 0.06, 2.2, 0.5, BY + 1.8, 0.75, M['galv'], verts=8, rot=(0, math.pi / 2, 0)))
    P.append(box('fgauge', 0.16, 0.1, 0.22, 2.4, BY + 0.95, 1.95, M['red']))
    # 변압기 + 애자 + 방호 펜스
    tx = WL / 2 - 2.2
    P.append(box('tfpad', 2.4, 1.9, 0.18, tx, BY + 1.0, 0.09, M['conc'], bev=0.02))
    P.append(box('tfmr', 1.4, 1.05, 1.45, tx, BY + 1.0, 0.9, M['steel_dk'], bev=0.03))
    for s in (-1, 1):
        P.append(box('tfrad', 0.15, 0.95, 1.05, tx + s * 0.75, BY + 1.0, 0.92, M['galv_dk']))
    for i in range(3):
        P.append(cyl('insul', 0.075, 0.44, tx - 0.4 + i * 0.4, BY + 1.0, 1.85, M['white'], verts=10))
        P.append(cyl('insulc', 0.1, 0.06, tx - 0.4 + i * 0.4, BY + 1.0, 1.95, M['white'], verts=10))
    for s in (-1, 1):
        for yy in (0.1, 1.9):
            P.append(cyl('tffp', 0.03, 1.9, tx + s * 1.3, BY + yy, 0.95, M['galv'], verts=8))
    for zz in (0.5, 1.2, 1.8):
        P.append(strut('tffb', (tx - 1.3, BY + 1.9, zz), (tx + 1.3, BY + 1.9, zz), 0.012, M['galv']))
    decal(P, FX0 + 2.0, -1, 2.7, 0.5, 0.62, M['warn'])
    wall_kit(P, 'infra', hose=True)
    downpipe(P, LX + 0.20, FY - 0.20, H)
    downpipe(P, RX - 0.20, FY - 0.20, H)
    return finish(join_as(P, 'X'), 'FAC_INFRA_MAIN')

def build_infra_roof():
    P, C = [], []
    T = []
    gable_roof(P, 0, pitch=12, over=0.55, accent='infra')
    stair_tower(P, C, T, 'roof', 'infra', mat=M['panel'])
    rise = math.tan(math.radians(12)) * ((WD + 1.1) / 2)
    P.append(box('rdeck', 6.4, 3.2, 0.10, 2.6, 0.0, rise * 0.42 + 0.5, M['steel_dk'], bev=0.015))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box('rdleg', 0.11, 0.11, 0.7, 2.6 + sx * 2.9, sy * 1.4,
                         rise * 0.42 + 0.13, M['steel_dk']))
    zb = rise * 0.42 + 0.55
    # 보일러 굴뚝 (2단 + 항공표지 밴드 + 가이)
    P.append(tube('stack', 0.33, 0.025, 3.6, 0.4, 0.0, zb + 1.85, M['galv'], verts=18))
    for zz in (1.0, 2.1, 3.1):
        P.append(cyl('stband', 0.345, 0.3, 0.4, 0.0, zb + zz, M['red'], verts=18))
    P.append(cyl('stcap', 0.44, 0.1, 0.4, 0.0, zb + 3.72, M['galv_dk'], verts=18))
    for a in range(3):
        ang = a * 2 * math.pi / 3 + 0.5
        P.append(strut('sguy', (0.4, 0.0, zb + 3.2),
                       (0.4 + 1.8 * math.cos(ang), 1.8 * math.sin(ang), zb - 0.3), 0.012, M['dark']))
    P.append(box('rad', 2.3, 1.15, 1.05, 3.2, 0.0, zb + 0.55, M['galv'], bev=0.03))
    for i in range(7):
        P.append(box('radfin', 0.05, 1.1, 0.95, 2.2 + i * 0.33, 0.0, zb + 0.55, M['galv_dk']))
    P.append(cyl('muffler', 0.3, 1.9, 5.2, 0.0, zb + 0.62, M['galv_dk'], verts=16, rot=(0, math.pi / 2, 0)))
    for s in (-1, 1):
        P.append(box('mufsad', 0.2, 0.5, 0.5, 5.2 + s * 0.7, 0.0, zb + 0.3, M['steel_dk']))
    return finish(join_as(P, 'X'), 'FAC_INFRA_ROOF')

def build_generic_main():
    P, C = [], []
    T = wall_body(P, M['panel'], accent='generic')
    stair_tower(P, C, T, 'main', 'generic', sign='범 용 동', code='G-01', mat=M['panel'])
    window_row(P, C, 4, 1.78, x0=FX0, x1=FX1, w=1.5, h=1.55, shade=True)
    for f in (-1, 1):
        window(P, C, 0, f, 1.78, w=1.15, h=1.5, side=True, seed=51)
    cut(T, C)
    arcade(P, TWX + TWW / 2 + 1.0, WL / 2 - 3.0, z=2.92, depth=1.7, accent='generic')
    annex(P, C, WL / 2 - 1.9, w=4.2, d=3.0, h=2.45, mat=M['panel'], accent='generic')
    band_course(P, H - 0.62, t=0.08, h=0.14)
    ac_bank(P, [1.4, 2.7], face=1, z=0.48)
    wall_kit(P, 'generic', hose=True)
    downpipe(P, LX + 0.20, FY - 0.20, H)
    downpipe(P, RX - 0.20, FY - 0.20, H)
    return finish(join_as(P, 'X'), 'FAC_GENERIC_MAIN')

def build_generic_roof():
    P, C = [], []
    T = []
    gable_roof(P, 0, pitch=13, over=0.55, accent='generic')
    stair_tower(P, C, T, 'roof', 'generic', mat=M['panel'])
    rise = math.tan(math.radians(13)) * ((WD + 1.1) / 2)
    P.append(box('rdeck', 4.6, 2.8, 0.10, 2.6, 0.0, rise * 0.42 + 0.5, M['steel_dk'], bev=0.015))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box('rdleg', 0.1, 0.1, 0.68, 2.6 + sx * 2.0, sy * 1.2,
                         rise * 0.42 + 0.14, M['steel_dk']))
    zb = rise * 0.42 + 0.55
    roof_hvac(P, 3.4, 0.0, zb, w=1.5, d=1.0, h=0.8)
    water_tank(P, 1.2, 0.0, zb, r=0.7, hh=1.0)
    vent_stack(P, 5.4, 0.0, zb, r=0.11, hh=0.85)
    return finish(join_as(P, 'X'), 'FAC_GENERIC_ROOF')

# ═══════════════════════ 실척 단일형 ═══════════════════════
def build_storage():
    """탄약고 이글루 — 실척 11.4 × 12.6 m. 늘리지 않고 그대로 놓는다."""
    P = []
    arch = cyl('arch', 3.1, 9.8, 0, 0, 0.55, M['conc'], verts=32, rot=(0, math.pi / 2, 0))
    arch.scale = (1, 1, 0.8)
    _act(arch); bpy.ops.object.transform_apply(scale=True)
    P.append(arch)
    for i in range(6):
        P.append(torus('arib', 2.5, 0.07, -4.2 + i * 1.7, 0, 0.55, M['conc'], maj=22, mnr=6,
                       rot=(0, math.pi / 2, 0)))
    for (bx, by, r) in [(-3.4, 2.4, 3.3), (0, 2.9, 3.7), (3.4, 2.4, 3.3),
                        (-3.4, -2.4, 3.3), (3.4, -2.4, 3.3), (5.0, 0, 3.1), (-5.0, 0, 3.1)]:
        P.append(sph('berm', r, bx, by, -0.5, M['earth'], seg=18, s=(1, 1, 0.56)))
    for i in range(14):                                    # 둔덕 위 잡초 다발
        a = hash01_py(i * 3.7) * 6.283
        rr = 2.4 + hash01_py(i * 5.1) * 2.6
        P.append(sph('tuft', 0.34 + hash01_py(i) * 0.2, math.cos(a) * rr, 1.0 + math.sin(a) * rr,
                     1.05 + hash01_py(i * 2.3) * 0.5, M['leaf'], seg=8, s=(1.3, 1.3, 0.5)))
    P.append(box('headwall', 6.8, 0.58, 3.7, 0, -4.7, 1.85, M['conc'], bev=0.05))
    P.append(box('hwcap', 7.1, 0.8, 0.16, 0, -4.7, 3.78, M['conc'], bev=0.02))
    for s in (-1, 1):
        P.append(box('wing', 0.52, 2.4, 2.7, s * 3.4, -3.6, 1.35, M['conc'], bev=0.04))
        P.append(box('wingcap', 0.68, 2.5, 0.12, s * 3.4, -3.6, 2.76, M['conc'], bev=0.02))
    P.append(box('blastdoor', 2.7, 0.3, 2.8, 0, -5.04, 1.4, M['steel_dk'], bev=0.03))
    for zz in (0.75, 1.4, 2.05):
        P.append(box('drib', 2.7, 0.08, 0.15, 0, -5.21, zz, M['galv_dk']))
    for s in (-1, 1):
        P.append(cyl('dhinge', 0.09, 2.7, s * 1.37, -5.06, 1.4, M['steel_dk'], verts=10))
        for zz in (0.6, 1.4, 2.2):
            P.append(cyl('dhk', 0.14, 0.16, s * 1.37, -5.24, zz, M['steel_dk'], verts=10,
                         rot=(math.pi / 2, 0, 0)))
    P.append(box('dbar', 2.3, 0.12, 0.14, 0, -5.24, 1.55, M['warn']))
    P.append(cyl('dwheel', 0.3, 0.06, 0.8, -5.28, 1.1, M['steel_dk'], verts=16, rot=(math.pi / 2, 0, 0)))
    P.append(box('hazard', 0.85, 0.05, 0.85, 2.6, -5.02, 2.1, M['stripes'], rz=math.radians(45)))
    P.append(box('hazid', 1.25, 0.05, 0.46, -2.7, -5.02, 2.4, M['warn']))
    P.append(text3d('hz', '1.1D', 0.29, -2.7, -5.09, 2.4, M['dark'], rot=(math.pi / 2, 0, math.pi)))
    for lx in (-4.5, 4.5):
        P.append(cyl('lrod', 0.03, 4.8, lx, 0, 3.9, M['galv'], verts=8))
        P.append(strut('gwire', (lx, 0, 6.3), (lx * 1.25, -1.2, 0.1), 0.010, M['dark']))
    for vx in (-2.4, 0, 2.4):
        P.append(box('vent', 0.58, 0.58, 0.48, vx, 0.5, 3.05, M['conc'], bev=0.02))
        P.append(box('vcap', 0.82, 0.82, 0.12, vx, 0.5, 3.35, M['galv_dk'], bev=0.015))
        for i in range(3):
            P.append(box('vlouv', 0.52, 0.05, 0.06, vx, 0.21, 2.92 + i * 0.13, M['alu']))
    P.append(box('apron', 5.6, 3.4, 0.14, 0, -6.6, 0.07, M['conc'], bev=0.02))
    for s in (-1, 1):
        P.append(cyl('bollard', 0.11, 0.95, s * 3.0, -7.2, 0.48, M['warn'], verts=12))
        P.append(cyl('bolcap', 0.12, 0.08, s * 3.0, -7.2, 0.96, M['dark'], verts=12))
    return finish(join_as(P, 'X'), 'FAC_STORAGE')

def build_entry():
    """위병소 — 실척 11 × 7.4 m. 차단기·검문 캐노피·부스."""
    P = []
    for (px, py) in [(-4.7, -2.9), (4.7, -2.9), (-4.7, 2.9), (4.7, 2.9)]:
        P.append(cyl('cpost', 0.12, 4.4, px, py, 2.2, M['alu'], verts=14))
        P.append(box('cbase', 0.48, 0.48, 0.22, px, py, 0.11, M['granite'], bev=0.02))
        P.append(polyprism('cknee', [(0, 0), (0.9 * (1 if px < 0 else -1), 0), (0, -0.55)],
                           0.16, M['alu'], plane='xz', off=py, bev=0.012))
        P[-1].location = (px, py, 4.28)
    P.append(box('croof', 10.9, 6.9, 0.18, 0, 0, 4.48, M['zinc'], bev=0.03))
    P.append(box('csoff', 10.8, 6.8, 0.05, 0, 0, 4.37, M['paintw']))
    for i in range(19):
        P.append(box('cseam', 0.05, 6.9, 0.05, -5.4 + i * 0.6, 0, 4.59, M['alu']))
    for s in (-1, 1):
        P.append(box('cfascia', 11.0, 0.13, 0.44, 0, s * 3.45, 4.37, M['acc_entry'], bev=0.015))
        P.append(box('cfascia2', 0.13, 6.95, 0.44, s * 5.45, 0, 4.37, M['alu'], bev=0.015))
    P.append(text3d('gate', 'GP-107  GATE', 0.38, 0, -3.54, 4.37, M['white'], rot=(math.pi / 2, 0, math.pi)))
    for lx in (-2.6, 0.0, 2.6):
        P.append(box('clamp', 0.8, 0.32, 0.1, lx, 0, 4.3, M['lamp']))
    bx = -3.2
    P.append(box('bpad', 3.2, 3.0, 0.16, bx, 0.7, 0.08, M['granite'], bev=0.02))
    P.append(box('booth', 2.5, 2.3, 1.05, bx, 0.7, 0.68, M['panelw'], bev=0.03))
    P.append(box('boothb', 2.62, 2.42, 0.3, bx, 0.7, 0.3, M['granite'], bev=0.02))
    for (gx, gy, sx2, sy2) in [(bx, -0.47, 2.4, 0.06), (bx, 1.87, 2.4, 0.06),
                               (bx - 1.27, 0.7, 0.06, 2.2), (bx + 1.27, 0.7, 0.06, 2.2)]:
        P.append(box('bglass', sx2, sy2, 1.1, gx, gy, 1.76, M['glass']))
    for (gx, gy) in [(bx - 1.27, -0.47), (bx + 1.27, -0.47), (bx - 1.27, 1.87), (bx + 1.27, 1.87)]:
        P.append(cyl('bpost', 0.06, 2.35, gx, gy, 1.32, M['alu'], verts=10))
    P.append(box('broof', 3.0, 2.8, 0.12, bx, 0.7, 2.5, M['alu'], bev=0.02))
    P.append(box('brooffas', 3.05, 0.09, 0.16, bx, -0.7, 2.46, M['acc_entry']))
    P.append(box('bdoor', 0.06, 0.85, 2.0, bx + 1.29, 0.4, 1.15, M['olive_dk']))
    P.append(box('bcounter', 2.3, 0.38, 0.07, bx, -0.36, 1.12, M['deck']))
    P.append(box('bmon', 0.44, 0.08, 0.3, bx + 0.6, -0.2, 1.35, M['glassd']))
    pvx = bx + 1.95
    P.append(box('pivot', 0.42, 0.42, 1.15, pvx, -1.0, 0.58, M['steel_dk'], bev=0.03))
    P.append(box('pivcap', 0.52, 0.52, 0.1, pvx, -1.0, 1.19, M['warn'], bev=0.02))
    P.append(cyl('arm', 0.07, 6.0, pvx + 2.9, -1.0, 1.16, M['stripes'], verts=12, rot=(0, math.pi / 2, 0)))
    P.append(box('cweight', 0.34, 0.34, 0.58, pvx - 0.52, -1.0, 1.08, M['dark']))
    P.append(cyl('armrest', 0.09, 1.0, pvx + 5.7, -1.0, 0.5, M['warn'], verts=10))
    for (jx, jy, jr) in [(2.4, 1.9, 0.28), (3.9, 1.3, -0.2)]:
        P.append(box('jersey', 1.85, 0.48, 0.85, jx, jy, 0.43, M['conc'], rz=jr, bev=0.06))
        P.append(box('jstripe', 1.87, 0.06, 0.15, jx, jy + 0.21, 0.62, M['warn'], rz=jr))
    P.append(cyl('signpole', 0.04, 2.5, 4.6, -2.2, 1.25, M['galv'], verts=8))
    P.append(cyl('stopsign', 0.42, 0.05, 4.6, -2.2, 2.2, M['red'], verts=8, rot=(math.pi / 2, 0, 0)))
    P.append(text3d('stop', 'STOP', 0.19, 4.6, -2.28, 2.2, M['white'], rot=(math.pi / 2, 0, math.pi)))
    sb = cyl('bump', 0.18, 4.6, 1.4, -1.0, 0.02, M['warn'], verts=12, rot=(math.pi / 2, 0, 0))
    sb.scale = (1, 1, 0.34)
    _act(sb); bpy.ops.object.transform_apply(scale=True)
    P.append(sb)
    P.append(box('pad', 11.0, 7.4, 0.09, 0, 0, 0.045, M['pave'], bev=0.01))
    return finish(join_as(P, 'X'), 'FAC_ENTRY')

# ═══════════════════════ 대지 · 조경 ═══════════════════════
def build_apron():
    """대지 포장 — 신축이음·연석·측구·맨홀·집수정. 부지 크기로 늘어난다."""
    P = []
    P.append(box('pad', PAD_W, PAD_D, 0.14, 0, 0, -0.07, M['pave'], bev=0.02))
    for s in (-1, 1):
        P.append(box('curb', PAD_W + 0.24, 0.18, 0.28, 0, s * (PAD_D / 2 + 0.09), 0.01, M['granite'], bev=0.02))
        P.append(box('curb', 0.18, PAD_D + 0.24, 0.28, s * (PAD_W / 2 + 0.09), 0, 0.01, M['granite'], bev=0.02))
    P.append(box('trench', PAD_W - 0.6, 0.36, 0.1, 0, -(PAD_D / 2 - 0.5), -0.06, M['dark']))
    for i in range(11):
        P.append(box('grate', (PAD_W - 0.9) / 11 - 0.05, 0.32, 0.045,
                     -(PAD_W - 0.9) / 2 + (PAD_W - 0.9) * i / 10, -(PAD_D / 2 - 0.5), -0.005,
                     M['steel_dk']))
    for s in (-1, 1):
        P.append(box('line', PAD_W - 0.4, 0.10, 0.006, 0, s * (PAD_D / 2 - 1.15), 0.004, M['white']))
    for (mx, my) in [(-PAD_W / 4, PAD_D / 4), (PAD_W / 3, -PAD_D / 5)]:   # 맨홀
        P.append(cyl('mhring', 0.42, 0.06, mx, my, -0.03, M['conc'], verts=20))
        P.append(cyl('mhlid', 0.34, 0.05, mx, my, -0.01, M['steel_dk'], verts=20))
        for i in range(8):
            a = i * math.pi / 4
            P.append(box('mhrib', 0.24, 0.03, 0.012, mx + math.cos(a) * 0.12,
                         my + math.sin(a) * 0.12, 0.012, M['steel_dk'], rz=a))
    return finish(join_as(P, 'X'), 'FAC_APRON')

def build_stem():
    """기초 플린스 — 런타임이 sz 로 절·성토 깊이만큼 늘린다 (단위 높이 1 m).

    실측(2026-09-07): 경사지 시설을 근접 촬영하면 이 오브젝트가 텍스처도 이음매도
    없는 밋밋한 회색 상자로 보였다. 원인 둘.
    ① 줄눈·물빼기·폼타이는 PAD_D 방향(±Y, 앞/뒤 면)에만 있었다 — PAD_W 방향(±X,
       좌/우 면)은 통짜였다. 카메라가 좌/우 면을 보면 디테일이 하나도 없다.
    ② uv_world 는 **현재 지오메트리 크기**로 UV 밀도를 잡는다. 이 오브젝트는 1 m
       원본으로 구워지지만 buildingModels.ts 가 런타임에 sz(1.5~40)로 Z 를 늘린다 —
       UV 좌표는 그대로인 채 지오메트리만 늘어나므로, 1 m 짜리로 구운 좁은 UV 조각이
       40 배로 뭉개져 사실상 반복이 사라진다(=단색으로 보인다).
    """
    P = []
    P.append(box('stem', PAD_W, PAD_D, 1.0, 0, 0, -0.5, M['conc'], bev=0.03))
    P.append(box('cop', PAD_W + 0.18, PAD_D + 0.18, 0.14, 0, 0, -0.05, M['granite'], bev=0.02))
    for s in (-1, 1):
        for i in range(9):                             # 수직 줄눈 — 앞/뒤(Y) 면
            P.append(box('sjoint', 0.05, 0.05, 0.98, -PAD_W / 2 + 0.7 + i * (PAD_W - 1.4) / 8,
                         s * (PAD_D / 2 + 0.01), -0.5, M['conc']))
        for i in range(7):                             # 물빼기 구멍
            P.append(cyl('weep', 0.045, 0.3, -PAD_W / 2 + 0.9 + i * (PAD_W - 1.8) / 6,
                         s * (PAD_D / 2 + 0.02), -0.42, M['dark'], verts=8, rot=(math.pi / 2, 0, 0)))
        for i in range(5):                             # 폼타이 자국
            P.append(cyl('tie', 0.03, 0.06, -PAD_W / 2 + 1.2 + i * (PAD_W - 2.4) / 4,
                         s * (PAD_D / 2 + 0.01), -0.75, M['conc'], verts=8, rot=(math.pi / 2, 0, 0)))
    for s in (-1, 1):
        for i in range(6):                             # 수직 줄눈 — 좌/우(X) 면(신규)
            P.append(box('sjoint', 0.05, 0.05, 0.98, s * (PAD_W / 2 + 0.01),
                         -PAD_D / 2 + 0.6 + i * (PAD_D - 1.2) / 5, -0.5, M['conc']))
        for i in range(5):                             # 물빼기 구멍
            P.append(cyl('weep', 0.045, 0.3, s * (PAD_W / 2 + 0.02),
                         -PAD_D / 2 + 0.7 + i * (PAD_D - 1.4) / 4, -0.42, M['dark'],
                         verts=8, rot=(0, math.pi / 2, 0)))
        for i in range(3):                             # 폼타이 자국
            P.append(cyl('tie', 0.03, 0.06, s * (PAD_W / 2 + 0.01),
                         -PAD_D / 2 + 1.0 + i * (PAD_D - 2.0) / 2, -0.75, M['conc'],
                         verts=8, rot=(0, math.pi / 2, 0)))

    # UV 를 「기준 높이만큼 미리 늘린 상태」로 구운 뒤 원래 1 m 로 되돌린다 — 그러면
    # UV 좌표에 이미 여러 번의 반복이 들어가 런타임 Z 스케일에서도 무늬가 남는다.
    STEM_UV_REF_H = 6.0
    ob = join_as(P, 'X')
    ob.scale = (1, 1, STEM_UV_REF_H)
    bpy.ops.object.transform_apply(scale=True)
    uv_world(ob, UV_TILE)
    ob.scale = (1, 1, 1.0 / STEM_UV_REF_H)
    bpy.ops.object.transform_apply(scale=True)
    _act(ob)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(34))
    except Exception:
        pass
    ob.name = 'FAC_STEM'
    return ob

def build_tree():
    """조경수 — 실척 h≈5.6 m. 남는 대지를 채워 「빈 아스팔트」를 없앤다."""
    P = []
    P.append(cyl('trunk', 0.17, 2.5, 0, 0, 1.25, M['wood'], verts=12, rtop=0.11))
    for a in range(5):
        ang = a * 1.2566 + 0.4
        P.append(strut('branch', (0, 0, 2.05),
                       (1.0 * math.cos(ang), 1.0 * math.sin(ang), 3.25), 0.05, M['wood']))
        P.append(strut('branch2', (0.5 * math.cos(ang), 0.5 * math.sin(ang), 2.7),
                       (1.5 * math.cos(ang + 0.5), 1.5 * math.sin(ang + 0.5), 3.9), 0.032, M['wood']))
    P.append(sph('crown', 1.6, 0, 0, 3.9, M['leaf'], seg=18, s=(1, 1, 0.9)))
    for i in range(5):
        a = i * 1.2566
        P.append(sph('cl', 0.85 + hash01_py(i) * 0.3, math.cos(a) * 1.2, math.sin(a) * 1.2,
                     4.1 + hash01_py(i * 3) * 0.9, M['leaf2'], seg=12, s=(1, 1, 0.85)))
    P.append(cyl('ring', 0.9, 0.12, 0, 0, 0.06, M['soil'], verts=18))
    P.append(torus('rcurb', 0.92, 0.07, 0, 0, 0.08, M['granite'], maj=20, mnr=6))
    for s in (-1, 1):
        P.append(strut('stake', (s * 0.58, 0, 0.05), (s * 0.22, 0, 2.0), 0.035, M['wood']))
        P.append(strut('tie', (s * 0.24, 0, 1.9), (0, 0, 1.85), 0.012, M['dark']))
    return finish(join_as(P, 'X'), 'FAC_TREE', tile=1.2)

def build_bush():
    P = []
    P.append(cyl('bed', 1.4, 0.14, 0, 0, 0.07, M['soil'], verts=20))
    P.append(torus('bcurb', 1.42, 0.08, 0, 0, 0.1, M['granite'], maj=22, mnr=6))
    P.append(sph('b1', 0.64, 0, 0, 0.55, M['leaf'], seg=14, s=(1.3, 1, 0.8)))
    P.append(sph('b2', 0.5, 0.64, 0.2, 0.45, M['leaf2'], seg=12, s=(1.2, 1, 0.8)))
    P.append(sph('b3', 0.46, -0.6, -0.15, 0.42, M['leaf2'], seg=12, s=(1.2, 1, 0.8)))
    P.append(sph('b4', 0.38, 0.1, -0.6, 0.36, M['leaf'], seg=12, s=(1.2, 1, 0.8)))
    return finish(join_as(P, 'X'), 'FAC_BUSH', tile=1.0)

def build_planter():
    """화단 — 실척 4.0 × 1.3 m. 연석 + 흙 + 관목 열. 앞마당 여백을 띠로 채운다."""
    P = []
    P.append(box('pbed', 4.0, 1.3, 0.34, 0, 0, 0.17, M['granite'], bev=0.02))
    P.append(box('psoil', 3.7, 1.02, 0.06, 0, 0, 0.36, M['soil']))
    for i in range(4):
        px = -1.35 + i * 0.9
        P.append(sph('ps', 0.42 + hash01_py(i * 7) * 0.12, px, hash01_py(i * 3) * 0.2 - 0.1,
                     0.62, M['leaf'], seg=12, s=(1.15, 1, 0.85)))
        P.append(sph('ps2', 0.3, px + 0.2, -0.22, 0.55, M['leaf2'], seg=10, s=(1.1, 1, 0.8)))
    return finish(join_as(P, 'X'), 'FAC_PLANTER', tile=1.2)

def build_arcade_span():
    """동 사이 연결 회랑 1스팬 — 실척 3.6 m. 여러 개를 이어 붙여 통로를 만든다."""
    P = []
    z = 2.75
    P.append(box('slab', 3.62, 2.5, 0.16, 0, 0, z, M['conc'], bev=0.02))
    P.append(box('sof', 3.5, 2.36, 0.04, 0, 0, z - 0.1, M['paintw']))
    for s in (-1, 1):
        P.append(box('fas', 3.66, 0.1, 0.22, 0, s * 1.25, z - 0.02, M['alu'], bev=0.012))
        P.append(box('base', 0.5, 0.5, 0.2, 0, s * 1.05, 0.1, M['granite'], bev=0.02))
        P.append(box('col', 0.3, 0.3, z - 0.28, 0, s * 1.05, (z - 0.28) / 2 + 0.2, M['conc'], bev=0.022))
        P.append(box('cap', 0.44, 0.44, 0.1, 0, s * 1.05, z - 0.13, M['conc'], bev=0.016))
    P.append(box('floor', 3.62, 2.7, 0.12, 0, 0, 0.06, M['granite'], bev=0.015))
    P.append(box('lamp', 0.5, 0.16, 0.04, 0, 0, z - 0.13, M['lamp']))
    return finish(join_as(P, 'X'), 'FAC_ARCADE')

def build_sitesign():
    """부대 표지석 + 안내판 — 진입부에 하나. 「기지에 들어왔다」를 만드는 물건이다."""
    P = []
    P.append(box('plinth', 2.6, 1.1, 0.22, 0, 0, 0.11, M['granite'], bev=0.02))
    P.append(box('stone', 1.9, 0.55, 1.25, -0.2, 0, 0.85, M['granite'], bev=0.05))
    P.append(box('face', 1.6, 0.05, 0.95, -0.2, -0.3, 0.88, M['dark'], bev=0.015))
    P.append(text3d('t1', 'GP-107', 0.26, -0.2, -0.35, 1.12, M['white'], rot=(math.pi / 2, 0, math.pi)))
    P.append(text3d('t2', '제 1 경 계 대 대', 0.16, -0.2, -0.35, 0.76, M['warn'],
                    rot=(math.pi / 2, 0, math.pi)))
    for s in (-1, 1):                                   # 안내판 (양면)
        P.append(cyl('bp', 0.05, 2.3, 1.35 + s * 0.3, 0, 1.15, M['galv'], verts=10))
    P.append(box('board', 1.5, 0.07, 0.95, 1.35, 0, 1.75, M['signblu'], bev=0.015))
    P.append(box('boardf', 1.38, 0.03, 0.83, 1.35, -0.05, 1.75, M['paintw']))
    for i in range(4):
        P.append(box('brow', 1.1, 0.02, 0.05, 1.35, -0.07, 2.02 - i * 0.19, M['signblu']))
    P.append(box('bcap', 1.62, 0.24, 0.05, 1.35, 0, 2.26, M['alu'], bev=0.01))
    P.append(cyl('spot', 0.11, 0.16, 1.35, -0.55, 0.35, M['lamp'], verts=12, rot=(math.radians(-55), 0, 0)))
    P.append(box('bed', 3.6, 1.6, 0.06, 0.3, 0, 0.03, M['gravel'], bev=0.01))
    return finish(join_as(P, 'X'), 'FAC_SITESIGN', tile=1.2)

def build_bikerack():
    """자전거 거치대 — 실척 3.2 m. 사람이 쓰는 물건이 있으면 축척이 읽힌다."""
    P = []
    P.append(box('pad', 3.4, 1.9, 0.1, 0, 0, 0.05, M['pave'], bev=0.01))
    for i in range(5):
        px = -1.3 + i * 0.65
        P.append(cyl('hoopL', 0.03, 0.75, px - 0.03, 0, 0.48, M['galv'], verts=8))
        P.append(cyl('hoopR', 0.03, 0.75, px + 0.03, 0, 0.48, M['galv'], verts=8))
        P.append(torus('hoopT', 0.06, 0.03, px, 0, 0.85, M['galv'], maj=10, mnr=5,
                       rot=(0, math.pi / 2, 0)))
    for i, px in enumerate((-0.98, 0.32)):              # 세워 둔 자전거 2 대
        P.append(torus('wh', 0.33, 0.035, px, -0.5, 0.35, M['dark'], maj=20, mnr=6,
                       rot=(0, math.pi / 2, 0)))
        P.append(torus('wh2', 0.33, 0.035, px, 0.52, 0.35, M['dark'], maj=20, mnr=6,
                       rot=(0, math.pi / 2, 0)))
        c = M['red'] if i == 0 else M['signblu']
        P.append(strut('fr1', (px, -0.48, 0.36), (px, 0.16, 0.62), 0.022, c))
        P.append(strut('fr2', (px, 0.5, 0.36), (px, 0.16, 0.62), 0.022, c))
        P.append(strut('fr3', (px, 0.16, 0.62), (px, 0.1, 0.95), 0.02, c))
        P.append(box('seat', 0.06, 0.26, 0.05, px, 0.06, 1.0, M['dark'], bev=0.012))
        P.append(cyl('bar', 0.018, 0.5, px, -0.3, 1.0, M['steel_dk'], verts=8, rot=(0, math.pi / 2, 0)))
    return finish(join_as(P, 'X'), 'FAC_BIKERACK', tile=1.0)

# ═══════════════════════ 부지 일체화 — 축척 피규어 · 정문 · 부지 텍스처 ═══════════════════════
#
# 지금까지 만든 것은 전부 「건물」이었다. 그런데 넓은 시야에서 문제였던 것은 건물이 아니라
# **건물 사이**다 — 시설이 저마다 떠 있는 콘크리트 판 위에 낱개로 서 있고, 그것들을 잇는
# 도로도, 둘러싸는 울타리도, 축척을 알려 주는 사람도 없었다. 아래는 그 조직을 만드는 조각들.
#
# 도로·울타리 면(面)은 지형을 따라 휘어야 하므로 GLB 로 굽지 않는다. 런타임(siteWorks.ts)이
# 지형 표면을 재어 리본 메시를 만들고, 여기서 구운 **텍스처 두 장**을 입힌다.

TEXDIR = r'C:\Users\USER\orca\projects\gp-optimizer\assets\textures'

def _save_png(name, arr, path):
    """(H,W,4) float → PNG. Cesium 머티리얼이 파일로 읽어 간다."""
    os.makedirs(TEXDIR, exist_ok=True)
    im = bpy.data.images.new(name, arr.shape[1], arr.shape[0], alpha=True)
    im.pixels.foreach_set(np.ascontiguousarray(arr[::-1], dtype=np.float32).ravel())
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()
    print('  tex ->', path)

def export_site_textures():
    """부지 텍스처 2 장 — 철망 울타리(알파) · 포장도로."""
    # ── 철망 ── 세로 1 UV = 울타리 전고. 아래 82% 는 마름모 철망, 위 18% 는 윤형 철조망.
    n = 512
    img = np.zeros((n, n, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    mesh_top = int(n * 0.82)
    p = n / 9.0                                          # 마름모 피치 (전고 2.4m → 약 0.27m)
    d1 = np.abs(((xx + yy) % p) - p / 2)
    d2 = np.abs(((xx - yy) % p) - p / 2)
    wire = ((d1 < 1.6) | (d2 < 1.6)).astype(np.float32)
    wire[mesh_top:, :] = 0.0
    # 상단 3 선 철조망 + 45° 완목
    for i, t in enumerate((0.86, 0.92, 0.98)):
        row = int(n * t)
        img[row - 1:row + 1, :, 3] = 1.0
        img[row - 1:row + 1, :, :3] = srgb('#8e959a')
        barb = (np.arange(n) % 26 < 3)                   # 가시
        img[row - 3:row + 3, barb, 3] = 1.0
        img[row - 3:row + 3, barb, :3] = srgb('#8e959a')
    img[..., 3] = np.maximum(img[..., 3], wire)
    grey = np.array(srgb('#9aa1a6'), dtype=np.float32)
    m = wire > 0
    img[m, 0], img[m, 1], img[m, 2] = grey[0], grey[1], grey[2]
    # 지주 (가로 3.0m 간격 ≒ 1 UV 반복 폭의 1/2) — 세로 굵은 띠
    for px in (0, n // 2):
        img[:mesh_top, px:px + 5, 3] = 1.0
        img[:mesh_top, px:px + 5, :3] = srgb('#6f767b')
        img[int(n * 0.80):int(n * 0.99), px:px + 5, 3] = 1.0
        img[int(n * 0.80):int(n * 0.99), px:px + 5, :3] = srgb('#6f767b')
    _save_png('site_chainlink', img, os.path.join(TEXDIR, 'site_chainlink.png'))

    # ── 포장도로 ── s(가로)=노폭 방향, t(세로)=진행 방향. 노견·차선·중앙 파선을 구워 넣는다.
    n = 512
    road = np.zeros((n, n, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    u = xx / n
    f = noise2d(n, (16, 64, 256), seed=91)
    grit = noise2d(n, (128, 256), seed=93)
    base = np.array(srgb('#3f4246'), dtype=np.float32)
    shoulder = np.array(srgb('#5b564a'), dtype=np.float32)
    col = np.broadcast_to(base, (n, n, 3)).copy()
    sh = (u < 0.10) | (u > 0.90)                          # 노견 (자갈)
    col[sh] = shoulder
    col *= (0.80 + 0.34 * f + 0.10 * grit)[..., None]
    # 가장자리 차선 (실선)
    edge = ((np.abs(u - 0.145) < 0.012) | (np.abs(u - 0.855) < 0.012)) & ~sh
    col[edge] = np.array(srgb('#c8cbc4'), dtype=np.float32) * (0.75 + 0.3 * f[edge])[..., None]
    # 중앙 파선 (진행 방향 4m 주기: 실선 2 / 공백 2)
    dash = (np.abs(u - 0.5) < 0.010) & ((yy / n * 2.0) % 1.0 < 0.5)
    col[dash] = np.array(srgb('#d8d2b0'), dtype=np.float32)
    # 바퀴 자국 — 두 줄이 살짝 닳아 밝다
    for wu in (0.34, 0.66):
        w = np.exp(-((u - wu) / 0.055) ** 2)
        col *= (1 + 0.10 * w)[..., None]
    # 보수 자국
    patch = (noise2d(n, (4, 8), seed=97) > 0.72) & ~sh
    col[patch] *= 0.86
    road[..., :3] = np.clip(col, 0, 1)
    road[..., 3] = 1.0
    _save_png('site_road', road, os.path.join(TEXDIR, 'site_road.png'))

    # ── 성토 비탈면 ── t=0 이 정지 마감고(어깨), t=1 이 비탈끝. 다짐 층(리프트) 자국과
    # 아래로 갈수록 짙어지는 식생을 넣는다 — 비탈면은 위가 마르고 아래가 무성하다.
    n = 512
    sl = np.zeros((n, n, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    t = yy / n
    f = noise2d(n, (8, 32, 128), seed=101)
    veg = noise2d(n, (16, 64), seed=103)
    soil = np.array(srgb('#6a5f49'), dtype=np.float32)
    grass = np.array(srgb('#48583a'), dtype=np.float32)
    lift = 0.06 * (np.sin(t * math.pi * 2 * 5) * 0.5 + 0.5)      # 0.3m 다짐 리프트 5 단
    cover = np.clip((t * 1.25 - 0.12) * (0.55 + 0.9 * veg), 0, 1)
    col = soil[None, None, :] * (0.82 + 0.34 * f - lift)[..., None]
    col = col * (1 - cover[..., None]) + grass[None, None, :] * (0.7 + 0.6 * f)[..., None] * cover[..., None]
    # 어깨선(연석)과 비탈끝 배수구
    col[t < 0.035] = np.array(srgb('#8f8b83'), dtype=np.float32)
    col[t > 0.975] *= 0.72
    sl[..., :3] = np.clip(col, 0, 1)
    sl[..., 3] = 1.0
    _save_png('site_slope', sl, os.path.join(TEXDIR, 'site_slope.png'))


# ── 축척 피규어 ────────────────────────────────────────────────
#
# 사람이 하나도 없으면 14m 짜리 동과 40m 짜리 동을 눈으로 구분할 수 없다. 얼굴은 필요 없고
# 「사람 크기의 실루엣」이면 충분하다 — 1.75m, 300~450 face.

def _figure(pose, mat_body, mat_gear):
    P = []
    lean = 0.10 if pose == 'walk' else 0.0
    P.append(box('boot', 0.13, 0.28, 0.10, -0.11, 0.02, 0.05, M['dark'], bev=0.02))
    P.append(box('boot', 0.13, 0.28, 0.10, 0.11, -0.02 - (0.30 if pose == 'walk' else 0), 0.05,
                 M['dark'], bev=0.02))
    P.append(cyl('legL', 0.075, 0.82, -0.11, 0.0, 0.51, mat_body, verts=10,
                 rot=(math.radians(6 if pose == 'walk' else 0), 0, 0)))
    P.append(cyl('legR', 0.075, 0.82, 0.11, -(0.16 if pose == 'walk' else 0), 0.51, mat_body,
                 verts=10, rot=(math.radians(-14 if pose == 'walk' else 0), 0, 0)))
    P.append(box('hip', 0.30, 0.20, 0.16, 0, 0, 0.94, mat_body, bev=0.04))
    P.append(box('torso', 0.36, 0.23, 0.46, 0, lean * 0.4, 1.22, mat_body, rx=math.radians(-lean * 40),
                 bev=0.05))
    P.append(box('vest', 0.38, 0.27, 0.34, 0, lean * 0.4 - 0.01, 1.24, mat_gear,
                 rx=math.radians(-lean * 40), bev=0.04))
    for s, ang in ((-1, 12 if pose == 'walk' else 4), (1, -18 if pose == 'walk' else -4)):
        P.append(cyl('arm', 0.062, 0.62, s * 0.235, lean * 0.3, 1.14, mat_body, verts=10,
                     rot=(math.radians(ang), 0, math.radians(-s * 5))))
        P.append(sph('hand', 0.055, s * 0.245, lean * 0.3 + math.sin(math.radians(ang)) * -0.31,
                     0.84, M['dark'], seg=8))
    P.append(cyl('neck', 0.055, 0.09, 0, lean * 0.5, 1.49, M['dark'], verts=8))
    P.append(sph('head', 0.105, 0, lean * 0.55, 1.60, M['dark'], seg=12, s=(0.92, 1.05, 1.1)))
    P.append(sph('helm', 0.128, 0, lean * 0.55, 1.63, mat_gear, seg=14, s=(1, 1.08, 0.82)))
    P.append(box('helmrim', 0.26, 0.30, 0.03, 0, lean * 0.55, 1.585, mat_gear, bev=0.012))
    # 소총 (어깨걸이) — 실루엣에서 군인으로 읽히게 하는 유일한 소품
    P.append(box('rifle', 0.035, 0.72, 0.055, 0.19, lean * 0.3 + 0.06, 1.10, M['dark'],
                 rx=math.radians(24), bev=0.01))
    P.append(box('rmag', 0.03, 0.09, 0.16, 0.19, lean * 0.3 + 0.02, 1.00, M['dark'], rx=math.radians(24)))
    return P

def build_person_a():
    return finish(join_as(_figure('stand', M['olive'], M['olive_dk']), 'X'), 'FAC_PERSON_A', tile=0.6)

def build_person_b():
    return finish(join_as(_figure('walk', M['olive_dk'], M['olive']), 'X'), 'FAC_PERSON_B', tile=0.6)


def build_gate():
    """부대 정문 — 문주 2본 + 양개 철문 + 표지. 울타리 링이 여기서 끊긴다.

    실척 8.6 × 2.4 m, 정면 −Y. 도로가 울타리를 지나는 지점에 런타임이 앉힌다.
    """
    P = []
    for s in (-1, 1):                                    # 문주 (화강석 + 갓돌 + 등)
        px = s * 3.9
        P.append(box('pierb', 1.30, 1.30, 0.30, px, 0, 0.15, M['granite'], bev=0.03))
        P.append(box('pier', 1.05, 1.05, 3.30, px, 0, 1.80, M['granite'], bev=0.035))
        P.append(box('piercap', 1.28, 1.28, 0.18, px, 0, 3.54, M['granite'], bev=0.03))
        P.append(box('pierlamp', 0.34, 0.34, 0.30, px, 0, 3.78, M['lamp'], bev=0.04))
        P.append(box('piercap2', 0.46, 0.46, 0.07, px, 0, 3.97, M['steel_dk'], bev=0.02))
        P.append(box('plate', 0.60, 0.05, 0.90, px, -0.55, 2.05, M['signblu'], bev=0.015))
    P.append(text3d('gt', 'G P - 1 0 7', 0.26, -3.9, -0.60, 2.28, M['white'], rot=(math.pi / 2, 0, math.pi)))
    P.append(text3d('gt2', '위 병 소', 0.22, 3.9, -0.60, 2.28, M['white'], rot=(math.pi / 2, 0, math.pi)))
    # 양개 철문 — 안쪽으로 열린 상태
    for s in (-1, 1):
        hx = s * 3.25
        ang = math.radians(-62 * s)
        P.append(cyl('hinge', 0.075, 3.0, hx, 0, 1.5, M['steel_dk'], verts=10))
        ca, sa = math.cos(ang), math.sin(ang)
        for i in range(9):                               # 세로 살
            t = 0.18 + i * 0.36
            P.append(box('bar', 0.055, 0.055, 2.55, hx + t * ca * s, t * sa, 1.30, M['steel_dk'],
                         rz=ang, bev=0.012))
            P.append(cyl('spike', 0.05, 0.16, hx + t * ca * s, t * sa, 2.66, M['steel_dk'],
                         verts=6, rtop=0.005))
        for zz in (0.35, 1.35, 2.45):                    # 가로 프레임
            P.append(box('frame', 3.3, 0.07, 0.10, hx + 1.65 * ca * s, 1.65 * sa, zz,
                         M['steel_dk'], rz=ang, bev=0.012))
        P.append(box('leaf', 0.09, 0.09, 2.9, hx + 3.2 * ca * s, 3.2 * sa, 1.45, M['steel_dk'],
                     rz=ang, bev=0.012))
    # 노면 — 문 아래 콘크리트 슬래브 + 과속방지턱 + 경계석
    P.append(box('slab', 9.4, 3.0, 0.14, 0, 0, 0.07, M['conc'], bev=0.02))
    sb = cyl('bump', 0.17, 6.4, 0, -1.05, 0.14, M['warn'], verts=12, rot=(math.pi / 2, 0, 0))
    sb.scale = (1, 1, 0.34)
    _act(sb); bpy.ops.object.transform_apply(scale=True)
    P.append(sb)
    for s in (-1, 1):
        P.append(box('curb', 0.24, 3.0, 0.26, s * 4.6, 0, 0.13, M['granite'], bev=0.02))
        P.append(cyl('bollard', 0.10, 0.9, s * 4.35, -1.35, 0.45, M['warn'], verts=12))
    # 차단봉 (문 안쪽)
    P.append(box('pivot', 0.36, 0.36, 1.05, -3.0, 1.25, 0.53, M['steel_dk'], bev=0.03))
    P.append(cyl('arm', 0.065, 6.4, 0.2, 1.25, 1.08, M['stripes'], verts=12, rot=(0, math.pi / 2, 0)))
    P.append(box('cw', 0.3, 0.3, 0.5, -3.5, 1.25, 1.0, M['dark']))
    return finish(join_as(P, 'X'), 'SITE_GATE')

# ═══════════════════════ 빌드 → 내보내기 ═══════════════════════
BUILDS = [
    (build_floor_generic, 'fac_floor.glb'),
    (build_floor_office, 'fac_office_floor.glb'),
    (build_floor_security, 'fac_security_floor.glb'),
    (build_command_main, 'fac_command_main.glb'), (build_command_roof, 'fac_command_roof.glb'),
    (build_security_main, 'fac_security_main.glb'), (build_security_roof, 'fac_security_roof.glb'),
    (build_living_main, 'fac_living_main.glb'), (build_living_roof, 'fac_living_roof.glb'),
    (build_welfare_main, 'fac_welfare_main.glb'), (build_welfare_roof, 'fac_welfare_roof.glb'),
    (build_hygiene_main, 'fac_hygiene_main.glb'), (build_hygiene_roof, 'fac_hygiene_roof.glb'),
    (build_medical_main, 'fac_medical_main.glb'), (build_medical_roof, 'fac_medical_roof.glb'),
    (build_edu_main, 'fac_edu_main.glb'), (build_edu_roof, 'fac_edu_roof.glb'),
    (build_office_main, 'fac_office_main.glb'), (build_office_roof, 'fac_office_roof.glb'),
    (build_maint_main, 'fac_maint_main.glb'), (build_maint_roof, 'fac_maint_roof.glb'),
    (build_infra_main, 'fac_infra_main.glb'), (build_infra_roof, 'fac_infra_roof.glb'),
    (build_generic_main, 'fac_generic_main.glb'), (build_generic_roof, 'fac_generic_roof.glb'),
    (build_storage, 'fac_storage.glb'),
    (build_entry, 'fac_entry.glb'),
    (build_apron, 'fac_apron.glb'),
    (build_stem, 'fac_stem.glb'),
    (build_tree, 'fac_tree.glb'),
    (build_bush, 'fac_bush.glb'),
    (build_planter, 'fac_planter.glb'),
    (build_arcade_span, 'fac_arcade.glb'),
    (build_sitesign, 'fac_sitesign.glb'),
    (build_bikerack, 'fac_bikerack.glb'),
    (build_person_a, 'fac_person_a.glb'),
    (build_person_b, 'fac_person_b.glb'),
    (build_gate, 'site_gate.glb'),
]

ONLY = None
for a in sys.argv:
    if a.startswith('--only='):
        ONLY = set(a.split('=', 1)[1].split(','))

try:
    if not ONLY:
        export_site_textures()
    built = {}
    for fn, fname in BUILDS:
        if ONLY and fname not in ONLY:
            continue
        print('== ' + fname + ' ==')
        ob = fn()
        export_glb(ob, fname)
        ob.location = (400, len(built) * 30, 0)
        built[fname] = ob

    print('== EXPORT SUMMARY ==')
    for f, p, k in EXPORTED:
        print(f'   {f:34s} faces={p:6d}  {k:5d}KB')

    if ONLY:
        print('== DONE (partial) ==', len(EXPORTED))
        sys.exit(0)

    # ── 컨택트시트: 실제 동 배치 규약대로 조립 ──
    ASSEMBLY = [
        ('command', 1, 'parapet'), ('security', 3, 'parapet'), ('living', 2, 'eave'),
        ('welfare', 1, 'eave'), ('hygiene', 1, 'eave'), ('medical', 1, 'parapet'),
        ('edu', 1, 'eave'), ('office', 2, 'parapet'), ('maint', 1, 'eave'),
        ('infra', 1, 'eave'), ('generic', 1, 'eave'),
    ]
    def put(key, x, y, z, sx=1.0, sy=1.0):
        src = built.get(key)
        if not src:
            return
        cp = src.copy()
        cp.location = (x, y, z)
        cp.scale = (sx, sy, 1.0)
        scene.collection.objects.link(cp)

    for i, (key, floors, _r) in enumerate(ASSEMBLY):
        gx, gy = (i % 4) * 22 - 33, -(i // 4) * 19
        put(f'fac_{key}_main.glb', gx, gy, 0)
        fk = ('fac_security_floor.glb' if key == 'security'
              else 'fac_office_floor.glb' if key == 'office' else 'fac_floor.glb')
        for f in range(1, floors):
            put(fk, gx, gy, f * H)
        put(f'fac_{key}_roof.glb', gx, gy, floors * H)
    put('fac_storage.glb', 33, -19, 0)
    put('fac_entry.glb', 33, -38, 0)
    put('fac_tree.glb', -46, 8, 0)
    put('fac_bush.glb', -43, 4, 0)
    put('fac_planter.glb', -46, 1, 0)
    put('fac_arcade.glb', -46, -4, 0)
    put('fac_sitesign.glb', -46, -9, 0)
    put('fac_bikerack.glb', -46, -14, 0)
    put('fac_person_a.glb', -40, -14, 0)
    put('fac_person_b.glb', -39, -15.4, 0)
    put('site_gate.glb', -46, -22, 0)

    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, -10, -0.03))
    g = bpy.context.active_object
    g.data.materials.append(mk_mat('m3_ground', srgb('#6a675c'), 0.0, 0.95))

    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy, sun.angle = 5.6, math.radians(1.4)
    so = bpy.data.objects.new('sun', sun)
    so.rotation_euler = (math.radians(50), 0, math.radians(128))
    scene.collection.objects.link(so)
    world = bpy.data.worlds.new('W')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.52, 0.62, 0.76, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 2.0
    scene.world = world
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
    try:
        scene.view_settings.look = 'AgX - Base Contrast'
    except Exception:
        pass

    def shoot(loc, target, path, lens=50):
        cam.data.lens = lens
        cam.location = loc
        d = mathutils.Vector(target) - mathutils.Vector(loc)
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('  render ->', path)

    shoot((6, -86, 58), (2, -16, 3), os.path.join(RND, 'render_fac3_a.png'), 40)
    shoot((-34, -40, 17), (-16, -12, 3.5), os.path.join(RND, 'render_fac3_b.png'), 55)
    shoot((2.5, -24, 9.5), (11.5, -3.5, 3.2), os.path.join(RND, 'render_fac3_c.png'), 48)
    shoot((3.0, -43, 9.0), (11.5, -22.5, 3.2), os.path.join(RND, 'render_fac3_d.png'), 48)
    print('== DONE ==', len(EXPORTED), 'files')
except Exception:
    traceback.print_exc()
    sys.exit(1)
