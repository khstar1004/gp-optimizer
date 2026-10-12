# 지형 알베도 합성 (Cycles 베이크 대체) — 셰이더 로직 numpy 재현
# UV v=0 이 mesh 남쪽(y=-750) → 이미지 row0 = south (bottom-up 저장 규약과 동일)
import numpy as np
from PIL import Image
import os, glob

CACHE = os.path.dirname(os.path.abspath(__file__))
SZ = 2048

def load(path, size=None, flip=False):
    im = Image.open(path).convert("RGB")
    if size:
        im = im.resize((size, size), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255.0
    if flip:
        a = np.flipud(a)
    return a

# PNG로 저장했던 것들: PIL은 top-down으로 읽음.
# esri_crop.png / road_mask.png 등은 Blender가 저장 → 파일 자체는 top-down (row0=north).
# 목표 텍스처는 UV 기준 row0=south 가 필요하므로 flipud.
sat = load(os.path.join(CACHE, "esri_crop.png"), SZ, flip=True)
road = load(os.path.join(CACHE, "road_mask.png"), SZ, flip=True)[:, :, 0]
conc = load(os.path.join(CACHE, "concave_mask.png"), SZ, flip=True)[:, :, 0]
slope = load(os.path.join(CACHE, "slope_mask.png"), SZ, flip=True)[:, :, 0]

def tile(path, size, reps):
    im = Image.open(path).convert("RGB")
    small = max(8, size // reps)
    im = im.resize((small, small), Image.LANCZOS)
    t = np.asarray(im, dtype=np.float32) / 255.0
    n = int(np.ceil(size / small))
    return np.tile(t, (n, n, 1))[:size, :size]

# PolyHaven 텍스처 탐색 (blender temp 다운로드 경로가 소실됐을 수 있음 → 없으면 생략)
def find_tex(pattern):
    for root in [CACHE, os.path.expanduser("~"), os.environ.get("TEMP", "")]:
        hits = glob.glob(os.path.join(root, "**", pattern), recursive=True)
        if hits:
            return hits[0]
    return None

leaves_p = find_tex("brown_mud_leaves_01_Diffuse*.jpg")
soil_p = find_tex("brown_mud_dry_Diffuse*.jpg")
print("leaves:", leaves_p, "| soil:", soil_p)

lum = sat.mean(axis=2, keepdims=True)
base = np.clip((sat - lum) * 1.35 + lum * 1.25, 0, 1)
if leaves_p:
    base = np.clip(base + (tile(leaves_p, SZ, 300) - 0.5) * 0.22, 0, 1)

hwangto = np.array([0.62, 0.44, 0.20], dtype=np.float32)
brown = np.array([0.32, 0.22, 0.13], dtype=np.float32)
tint = brown[None, None, :] + (hwangto - brown)[None, None, :] * conc[:, :, None]
if soil_p:
    soil_col = np.clip(tile(soil_p, SZ, 250) * tint / 0.45, 0, 1)
else:
    soil_col = tint

bare = np.clip((road - 0.3) / 0.5, 0, 1) + np.clip((slope - 0.72) / 0.28, 0, 1) * 0.5
bare = np.clip(bare, 0, 1)[:, :, None]
albedo = base * (1 - bare) + soil_col * bare

# 저장은 glTF 이미지 규약(top-down)으로 — UV가 bottom-up이므로 다시 flip
out = np.flipud(albedo)
Image.fromarray((out * 255).astype(np.uint8)).save(
    os.path.join(CACHE, "terrain_albedo.jpg"), quality=88)
print("saved terrain_albedo.jpg | mean:", albedo.mean(axis=(0, 1)))
