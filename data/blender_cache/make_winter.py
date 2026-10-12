# 겨울 텍스처 변형 — 이미 구운 gp_terrain_real.glb 텍스처 10장을 기존 DEM 경사 데이터로
# 눈 덮임을 입혀 다시 만든다. Blender 재빌드(인스턴싱 재링크·재export) 없이
# 텍스처만 바꿔서 gp_terrain_real_winter.glb 를 만드는 파이프라인의 파이썬 절반.
#
# 지형(TerrainMat)만 dem_v3.npy 로 실제 경사를 계산해 완경사=눈 쌓임/급경사=흘러내림
# (terrainfx.ts 의 snowRamp 과 같은 hold/shed 경사값)을 적용한다. 그 외 8장(잔디·나무·
# 바위·도로)은 위치 정보가 없는 반복 아틀라스라 재질별 고정 서리 처리를 준다.
import os, json
import numpy as np
from PIL import Image

CACHE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(CACHE, 'winter_src')
OUT = os.path.join(CACHE, 'winter_out')
os.makedirs(OUT, exist_ok=True)

SNOW = np.array([0.93, 0.95, 1.00], np.float32)   # 살짝 푸른 눈색


def load_rgba(path):
    im = Image.open(path).convert('RGBA')
    return np.asarray(im, dtype=np.float32) / 255.0


def save_rgba(arr, path):
    Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8), 'RGBA').save(path, quality=92)


def desat(rgb, amount):
    luma = rgb[..., 0:1] * 0.2126 + rgb[..., 1:2] * 0.7152 + rgb[..., 2:3] * 0.0722
    return rgb * (1 - amount) + luma * amount


def frost(rgb, desat_amt, lighten, white_blend):
    """평면(위치 무관) 서리 처리 — 잔디·나뭇잎·바위·도로용 고정 처리."""
    out = desat(rgb, desat_amt)
    out = np.clip(out * (1 + lighten), 0, 1)
    out = out * (1 - white_blend) + SNOW * white_blend
    return np.clip(out, 0, 1)


def process_flat(name, desat_amt, lighten, white_blend):
    for fname in os.listdir(SRC):
        idx, rest = fname.split('_', 1)
        if rest.rsplit('.', 1)[0] != name:
            continue
        a = load_rgba(os.path.join(SRC, fname))
        rgb, alpha = a[..., :3], a[..., 3:4]
        rgb = frost(rgb, desat_amt, lighten, white_blend)
        save_rgba(np.concatenate([rgb, alpha], -1), os.path.join(OUT, fname))
        print('flat', fname, 'desat', desat_amt, 'white', white_blend)
        return
    print('WARN: not found ->', name)


# ── 지형: DEM 경사 기반 눈 덮임 ───────────────────────────────────────────
def process_terrain():
    fname = next(f for f in os.listdir(SRC) if f.endswith('_TerrainMat.webp'))
    a = load_rgba(os.path.join(SRC, fname))
    rgb, alpha = a[..., :3], a[..., 3:4]
    tex = rgb.shape[0]

    Hc = np.load(os.path.join(CACHE, 'dem_v3.npy'))
    meta = json.load(open(os.path.join(CACHE, 'meta_v3.json')))
    size = meta['sizeMeters']
    s = Hc.shape[0]
    cell = size / (s - 1)
    gy_, gx_ = np.gradient(Hc, cell)
    slope = np.hypot(gx_, gy_)                          # rad-ish (dh/dm)
    slope_deg = np.degrees(np.arctan(slope))
    slope_img = Image.fromarray(slope_deg.astype(np.float32), mode='F').resize((tex, tex), Image.BILINEAR)
    slope_deg_t = np.asarray(slope_img, dtype=np.float32)

    # terrainfx.ts snowRamp 과 같은 hold/shed 각도 — 완경사는 그대로, 급경사는 흘러내린다.
    HOLD_DEG, SHED_DEG = 12.0, 34.0
    snow_amt = 1.0 - np.clip((slope_deg_t - HOLD_DEG) / (SHED_DEG - HOLD_DEG), 0, 1)
    snow_amt = snow_amt ** 1.3                          # 능선 쪽으로 갈수록 더 빨리 빠진다

    # 도로는 위성/3D 리본이 이미 그늘진 흙톤으로 눌러놨다 — 겨울에도 대체로 제설/오염돼
    # 완전히 하얗게 덮이지 않는다. road_v3 마스크로 눈량을 더 낮춘다.
    road_path = os.path.join(CACHE, 'road_v3.npy')
    if os.path.exists(road_path):
        road = np.load(road_path)
        road_img = Image.fromarray((road * 255).astype(np.uint8)).resize((tex, tex), Image.BILINEAR)
        road_t = np.asarray(road_img, dtype=np.float32) / 255.0
        snow_amt = snow_amt * (1 - road_t * 0.7)

    snow_amt3 = snow_amt[..., None]
    ground_desat = desat(rgb, 0.25)                     # 눈 없는 잔여 지면도 겨울엔 채도가 죽는다
    winter_rgb = ground_desat * (1 - snow_amt3 * 0.92) + SNOW * (snow_amt3 * 0.92)
    winter_rgb = np.clip(winter_rgb, 0, 1)

    save_rgba(np.concatenate([winter_rgb, alpha], -1), os.path.join(OUT, fname))
    print('terrain', fname, 'snow mean', round(float(snow_amt.mean()), 3),
          'p10-p90', round(float(np.percentile(slope_deg_t, 10)), 1), round(float(np.percentile(slope_deg_t, 90)), 1))


process_terrain()
process_flat('GrassMat', desat_amt=0.55, lighten=0.18, white_blend=0.30)
process_flat('Bark', desat_amt=0.20, lighten=-0.04, white_blend=0.05)
process_flat('Leaf', desat_amt=0.50, lighten=0.10, white_blend=0.30)
process_flat('Branch', desat_amt=0.35, lighten=0.05, white_blend=0.15)
process_flat('Tree_0Mat', desat_amt=0.25, lighten=0.00, white_blend=0.08)
process_flat('Tree_1Mat', desat_amt=0.50, lighten=0.10, white_blend=0.30)
process_flat('stones_big', desat_amt=0.15, lighten=0.05, white_blend=0.18)
process_flat('sutr_tmave_sedy', desat_amt=0.15, lighten=0.05, white_blend=0.18)
process_flat('RoadMat', desat_amt=0.30, lighten=0.05, white_blend=0.20)
print('done')
