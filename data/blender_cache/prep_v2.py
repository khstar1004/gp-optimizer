# v2 데이터 준비: 3km x 3km — DEM 스티칭 + ESRI z16 마스크 + 수관 알베도/노멀맵
import os, math, json, urllib.request
import numpy as np
from PIL import Image

CACHE = os.path.dirname(os.path.abspath(__file__))
LON, LAT = 128.125, 38.328
HALF = 1500.0
SIZE = HALF * 2
MT_KEY = "WCykOG0ES8GZJgKl8PXB"

mlat = 111132.0
mlon = 111320.0 * math.cos(math.radians(LAT))
dlat, dlon = HALF / mlat, HALF / mlon
west, east, south, north = LON - dlon, LON + dlon, LAT - dlat, LAT + dlat
print("bbox", west, south, east, north)

def merc(lon, lat, z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    lr = math.radians(lat)
    y = (1.0 - math.log(math.tan(lr) + 1 / math.cos(lr)) / math.pi) / 2.0 * n
    return x, y

def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=20).read()
    open(path, "wb").write(data)

# ── DEM z14 ──
Z = 14
x0, y1 = merc(west, south, Z); x1, y0 = merc(east, north, Z)
tx0, tx1, ty0, ty1 = int(x0), int(x1), int(y0), int(y1)
print("dem tiles", tx0, tx1, ty0, ty1)
tiles = {}
for x in range(tx0, tx1 + 1):
    for y in range(ty0, ty1 + 1):
        p = os.path.join(CACHE, f"dem_{Z}_{x}_{y}.webp")
        fetch(f"https://api.maptiler.com/tiles/terrain-rgb-v2/{Z}/{x}/{y}.webp?key={MT_KEY}", p)
        a = np.asarray(Image.open(p).convert("RGB"), dtype=np.float64)
        tiles[(x, y)] = -10000.0 + (a[:, :, 0] * 65536 + a[:, :, 1] * 256 + a[:, :, 2]) * 0.1
TS = 512
H = np.zeros(((ty1 - ty0 + 1) * TS, (tx1 - tx0 + 1) * TS), dtype=np.float32)
for (x, y), t in tiles.items():
    H[(y - ty0) * TS:(y - ty0 + 1) * TS, (x - tx0) * TS:(x - tx0 + 1) * TS] = t

# 크롭 → 768²
S = 768
lons = np.linspace(west, east, S)
lats = np.linspace(north, south, S)
n14 = 2 ** Z
gx = (lons + 180.0) / 360.0 * n14
lr = np.radians(lats)
gy = (1.0 - np.log(np.tan(lr) + 1 / np.cos(lr)) / np.pi) / 2.0 * n14
fx = np.clip((gx - tx0) * TS, 0, H.shape[1] - 1.001)
fy = np.clip((gy - ty0) * TS, 0, H.shape[0] - 1.001)
FX, FY = np.meshgrid(fx, fy)
ix, iy = FX.astype(int), FY.astype(int)
tx_, ty_ = FX - ix, FY - iy
Hc = (H[iy, ix] * (1 - tx_) * (1 - ty_) + H[iy, ix + 1] * tx_ * (1 - ty_)
      + H[iy + 1, ix] * (1 - tx_) * ty_ + H[iy + 1, ix + 1] * tx_ * ty_).astype(np.float32)
np.save(os.path.join(CACHE, "dem_v2_768.npy"), Hc)
print("DEM", Hc.min(), Hc.max(), "center", Hc[S // 2, S // 2])

# ── ESRI z16 위성 (마스크 소스) ──
Z2 = 16
x0, y1 = merc(west, south, Z2); x1, y0 = merc(east, north, Z2)
ex0, ex1, ey0, ey1 = int(x0), int(x1), int(y0), int(y1)
print("esri tiles", ex0, ex1, ey0, ey1, (ex1 - ex0 + 1) * (ey1 - ey0 + 1))
mos = np.zeros(((ey1 - ey0 + 1) * 256, (ex1 - ex0 + 1) * 256, 3), dtype=np.float32)
for x in range(ex0, ex1 + 1):
    for y in range(ey0, ey1 + 1):
        p = os.path.join(CACHE, f"esri16_{x}_{y}.jpg")
        fetch(f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z2}/{y}/{x}", p)
        mos[(y - ey0) * 256:(y - ey0 + 1) * 256, (x - ex0) * 256:(x - ex0 + 1) * 256] = \
            np.asarray(Image.open(p).convert("RGB"), dtype=np.float32) / 255.0
wx, ny_ = merc(west, north, Z2); ex_, sy_ = merc(east, south, Z2)
px0, px1 = int(round((wx - ex0) * 256)), int(round((ex_ - ex0) * 256))
py0, py1 = int(round((ny_ - ey0) * 256)), int(round((sy_ - ey0) * 256))
sat = mos[py0:py1, px0:px1]
sat = np.asarray(Image.fromarray((sat * 255).astype(np.uint8)).resize((2048, 2048), Image.LANCZOS),
                 dtype=np.float32) / 255.0  # row0=north
Image.fromarray((sat * 255).astype(np.uint8)).save(os.path.join(CACHE, "sat_v2.jpg"), quality=90)

# ── 마스크 (row0=north 기준으로 계산) ──
M = 2048
lum = sat.mean(axis=2)
mx = sat.max(axis=2); mn = sat.min(axis=2)
satn = (mx - mn) / (mx + 1e-6)
green = sat[:, :, 1] - (sat[:, :, 0] + sat[:, :, 2]) * 0.5

def blur(a, it):
    for _ in range(it):
        p = np.pad(a, 1, mode="edge")
        a = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:] + 4 * p[1:-1, 1:-1]) / 8.0
    return a

road = ((lum > 0.34) & (satn < 0.25) & (green < 0.02)).astype(np.float32)
def dil(m):
    p = np.pad(m, 1)
    return np.max(np.stack([p[:-2,1:-1], p[2:,1:-1], p[1:-1,:-2], p[1:-1,2:], p[1:-1,1:-1]]), 0)
road_d = road.copy()
for _ in range(2): road_d = dil(road_d)
road_s = blur(road_d, 3)

# 개활지(밭/마을): 밝고 저채도가 넓게 뭉친 곳
openland = blur(((lum > 0.42) & (green < 0.05)).astype(np.float32), 8)
openland = np.clip((openland - 0.25) * 2.2, 0, 1)

forest = np.clip((blur(np.clip(green * 6 + 0.25, 0, 1), 4)) - road_s - openland, 0, 1)

# 경사/오목 (DEM에서)
cell = SIZE / (S - 1)
gyv, gxv = np.gradient(Hc, cell)
slope = np.degrees(np.arctan(np.hypot(gxv, gyv)))
slope_m = np.asarray(Image.fromarray((np.clip(slope / 45, 0, 1) * 255).astype(np.uint8)).resize((M, M)),
                     dtype=np.float32) / 255.0
lap = (np.roll(Hc, 1, 0) + np.roll(Hc, -1, 0) + np.roll(Hc, 1, 1) + np.roll(Hc, -1, 1) - 4 * Hc)
conc = np.asarray(Image.fromarray((np.clip(lap * 0.5 + 0.5, 0, 1) * 255).astype(np.uint8)).resize((M, M)),
                  dtype=np.float32) / 255.0

for nm, arr in [("road_v2", road_s), ("open_v2", openland), ("forest_v2", forest)]:
    Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(os.path.join(CACHE, nm + ".png"))
print("masks: road", road.mean(), "open", openland.mean(), "forest", forest.mean())

# ── 수관 노이즈 (크라운 8~20m 블롭) ──
rng = np.random.default_rng(7)
def vnoise(size, cells):
    g = rng.random((cells + 1, cells + 1)).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32) / 255.0
canopy = (vnoise(M, 256) * 0.45 + vnoise(M, 128) * 0.3 + vnoise(M, 48) * 0.25)
canopy = (canopy - canopy.min()) / (canopy.max() - canopy.min())
crown = vnoise(M, 400)  # 개별 수관 픽셀 단위

# ── 알베도 합성 (ref: 짙은 수관 그린 2톤 + 흙길 + 개활지 황토) ──
g_dark = np.array([0.075, 0.115, 0.048], np.float32)
g_mid = np.array([0.135, 0.185, 0.075], np.float32)
g_lite = np.array([0.205, 0.255, 0.105], np.float32)
t = np.clip(canopy * 1.5 - 0.25, 0, 1)[:, :, None]
can_col = g_dark + (g_mid - g_dark) * t
can_col += (g_lite - g_mid) * np.clip(crown - 0.55, 0, 1)[:, :, None] * 1.6
# 오목부 어둡게(계곡 AO), 채도 변화
can_col *= (0.82 + 0.36 * np.clip(1 - conc, 0, 1))[:, :, None]

dirt = np.array([0.42, 0.33, 0.20], np.float32)
dirt_lt = np.array([0.55, 0.45, 0.30], np.float32)
road_col = dirt + (dirt_lt - dirt) * crown[:, :, None]

hwangto = np.array([0.52, 0.40, 0.22], np.float32)
field_g = np.array([0.30, 0.34, 0.14], np.float32)
open_col = field_g + (hwangto - field_g) * (vnoise(M, 64)[:, :, None])

# 급경사 바위 노출
rock = np.clip((slope_m - 0.62) * 3, 0, 1) * np.clip(crown, 0.3, 1)
rock_col = np.array([0.34, 0.30, 0.26], np.float32)[None, None, :] * (0.7 + 0.6 * crown[:, :, None])

alb = can_col
f_open = openland[:, :, None]
alb = alb * (1 - f_open) + open_col * f_open
f_rock = (rock * (1 - road_s) * (1 - openland))[:, :, None] * 0.7
alb = alb * (1 - f_rock) + rock_col * f_rock
f_road = np.clip(road_s * 1.6, 0, 1)[:, :, None]
alb = alb * (1 - f_road) + road_col * f_road
alb = np.clip(alb, 0, 1)
Image.fromarray((alb * 255).astype(np.uint8)).save(os.path.join(CACHE, "albedo_v2.jpg"), quality=90)

# ── 노멀맵: 수관 범프 (숲에서만) ──
hgt = canopy * 0.6 + crown * 0.4
hgt = hgt * forest  # 숲에만 범프
gy2, gx2 = np.gradient(hgt * 14.0)  # 스케일=범프 강도
nz = 1.0 / np.sqrt(gx2 ** 2 + gy2 ** 2 + 1)
nx = -gx2 * nz; ny_ = gy2 * nz  # glTF: +Y up (OpenGL 관례, row0=north → v flip 시 부호 주의)
nrm = np.stack([nx * 0.5 + 0.5, ny_ * 0.5 + 0.5, nz * 0.5 + 0.5], axis=-1)
Image.fromarray((np.clip(nrm, 0, 1) * 255).astype(np.uint8)).save(
    os.path.join(CACHE, "normal_v2.jpg"), quality=92)

meta = {"center": {"lon": LON, "lat": LAT}, "sizeMeters": SIZE,
        "zMinAbs": float(Hc.min()), "centerDemAbs": float(Hc[S // 2, S // 2]),
        "deltaCenter": float(Hc[S // 2, S // 2] - Hc.min()),
        "bbox": [west, south, east, north]}
json.dump(meta, open(os.path.join(CACHE, "meta_v2.json"), "w"), indent=2)
print("done", meta)
