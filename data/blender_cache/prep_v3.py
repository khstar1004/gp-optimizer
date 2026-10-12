# v3 고화질 준비: 2km 집중 — DEM 1024(+에로전 디테일) + ESRI z17 + 4K 수관 알베도/노멀
import os, math, json, urllib.request
import numpy as np
from PIL import Image

CACHE = os.path.dirname(os.path.abspath(__file__))
LON, LAT = 128.125, 38.328
HALF = 2500.0          # 5km x 5km
SIZE = HALF * 2
TEX = 6144
MESH = 2048
MT_KEY = "WCykOG0ES8GZJgKl8PXB"

mlat = 111132.0
mlon = 111320.0 * math.cos(math.radians(LAT))
dlat, dlon = HALF / mlat, HALF / mlon
west, east, south, north = LON - dlon, LON + dlon, LAT - dlat, LAT + dlat

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
    open(path, "wb").write(urllib.request.urlopen(req, timeout=25).read())

# ── DEM z14 ──
Z = 14
x0, y1 = merc(west, south, Z); x1, y0 = merc(east, north, Z)
tx0, tx1, ty0, ty1 = int(x0), int(x1), int(y0), int(y1)
tiles = {}
for x in range(tx0, tx1 + 1):
    for y in range(ty0, ty1 + 1):
        p = os.path.join(CACHE, f"dem_{Z}_{x}_{y}.webp")
        fetch(f"https://api.maptiler.com/tiles/terrain-rgb-v2/{Z}/{x}/{y}.webp?key={MT_KEY}", p)
        a = np.asarray(Image.open(p).convert("RGB"), dtype=np.float64)
        tiles[(x, y)] = -10000.0 + (a[:, :, 0] * 65536 + a[:, :, 1] * 256 + a[:, :, 2]) * 0.1
TS = 512
Hraw = np.zeros(((ty1 - ty0 + 1) * TS, (tx1 - tx0 + 1) * TS), dtype=np.float32)
for (x, y), t in tiles.items():
    Hraw[(y - ty0) * TS:(y - ty0 + 1) * TS, (x - tx0) * TS:(x - tx0 + 1) * TS] = t

S = MESH
lons = np.linspace(west, east, S); lats = np.linspace(north, south, S)
n14 = 2 ** Z
gx = (lons + 180.0) / 360.0 * n14
lr = np.radians(lats)
gy = (1.0 - np.log(np.tan(lr) + 1 / np.cos(lr)) / np.pi) / 2.0 * n14
fx = np.clip((gx - tx0) * TS, 0, Hraw.shape[1] - 1.001)
fy = np.clip((gy - ty0) * TS, 0, Hraw.shape[0] - 1.001)
FX, FY = np.meshgrid(fx, fy)
ix, iy = FX.astype(int), FY.astype(int)
txf, tyf = FX - ix, FY - iy
Hc = (Hraw[iy, ix] * (1 - txf) * (1 - tyf) + Hraw[iy, ix + 1] * txf * (1 - tyf)
      + Hraw[iy + 1, ix] * (1 - txf) * tyf + Hraw[iy + 1, ix + 1] * txf * tyf).astype(np.float32)

# ── 절차적 에로전 디테일 (능선/걸리 강조) ──
rng = np.random.default_rng(11)
def vnoise(size, cells, seed):
    r = np.random.default_rng(seed)
    g = r.random((cells + 1, cells + 1)).astype(np.float32)
    return np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC),
                      dtype=np.float32) / 255.0
detail = np.zeros((S, S), np.float32)
amp = 1.0
for oct_, cells in enumerate([16, 32, 64, 128, 256]):
    detail += (vnoise(S, cells, 100 + oct_) - 0.5) * amp
    amp *= 0.55
# 경사가 급할수록 디테일 강조 (침식 느낌)
cell = SIZE / (S - 1)
gy_, gx_ = np.gradient(Hc, cell)
slope = np.hypot(gx_, gy_)
slope_n = np.clip(slope / 0.7, 0, 1)
Hc = Hc + detail * (1.5 + 4.0 * slope_n)   # ±수 m 미세 기복
np.save(os.path.join(CACHE, "dem_v3.npy"), Hc)
print("DEM", float(Hc.min()), float(Hc.max()), "center", float(Hc[S//2, S//2]))

# ── ESRI z17 위성 (마스크 소스, 선명) ──
Z2 = 17
x0, y1 = merc(west, south, Z2); x1, y0 = merc(east, north, Z2)
ex0, ex1, ey0, ey1 = int(x0), int(x1), int(y0), int(y1)
print("esri17 tiles", (ex1 - ex0 + 1) * (ey1 - ey0 + 1))
mos = np.zeros(((ey1 - ey0 + 1) * 256, (ex1 - ex0 + 1) * 256, 3), dtype=np.float32)
for x in range(ex0, ex1 + 1):
    for y in range(ey0, ey1 + 1):
        p = os.path.join(CACHE, f"esri17_{x}_{y}.jpg")
        fetch(f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z2}/{y}/{x}", p)
        mos[(y - ey0) * 256:(y - ey0 + 1) * 256, (x - ex0) * 256:(x - ex0 + 1) * 256] = \
            np.asarray(Image.open(p).convert("RGB"), dtype=np.float32) / 255.0
wx, ny_ = merc(west, north, Z2); ex_, sy_ = merc(east, south, Z2)
px0, px1 = int(round((wx - ex0) * 256)), int(round((ex_ - ex0) * 256))
py0, py1 = int(round((ny_ - ey0) * 256)), int(round((sy_ - ey0) * 256))
sat = mos[py0:py1, px0:px1]
sat = np.asarray(Image.fromarray((sat * 255).astype(np.uint8)).resize((TEX, TEX), Image.LANCZOS),
                 dtype=np.float32) / 255.0  # row0=north

# ── 마스크 ──
M = TEX
lum = sat.mean(2); mx = sat.max(2); mn = sat.min(2)
satn = (mx - mn) / (mx + 1e-6)
green = sat[:, :, 1] - (sat[:, :, 0] + sat[:, :, 2]) * 0.5
def blur(a, it):
    for _ in range(it):
        p = np.pad(a, 1, mode="edge")
        a = (p[:-2,1:-1]+p[2:,1:-1]+p[1:-1,:-2]+p[1:-1,2:]+4*p[1:-1,1:-1])/8.0
    return a
def dil(m):
    p = np.pad(m, 1)
    return np.max(np.stack([p[:-2,1:-1],p[2:,1:-1],p[1:-1,:-2],p[1:-1,2:],p[1:-1,1:-1]]), 0)
road = ((lum > 0.34) & (satn < 0.24) & (green < 0.02)).astype(np.float32)
rd = road.copy()
for _ in range(2): rd = dil(rd)
road_s = blur(rd, 3)
openland = np.clip((blur(((lum > 0.42) & (green < 0.05)).astype(np.float32), 8) - 0.25) * 2.2, 0, 1)
forest = np.clip(blur(np.clip(green * 6 + 0.28, 0, 1), 4) - road_s - openland, 0, 1)
slope_m = np.asarray(Image.fromarray((np.clip(slope / 0.7, 0, 1) * 255).astype(np.uint8)).resize((M, M)),
                     dtype=np.float32) / 255.0
lap = (np.roll(Hc, 1, 0) + np.roll(Hc, -1, 0) + np.roll(Hc, 1, 1) + np.roll(Hc, -1, 1) - 4 * Hc)
conc = np.asarray(Image.fromarray((np.clip(lap * 0.5 + 0.5, 0, 1) * 255).astype(np.uint8)).resize((M, M)),
                  dtype=np.float32) / 255.0
for nm, arr in [("road_v3", road_s), ("open_v3", openland), ("forest_v3", forest)]:
    np.save(os.path.join(CACHE, nm + ".npy"), np.clip(arr, 0, 1).astype(np.float32))
print("masks road", round(float(road.mean()),4), "open", round(float(openland.mean()),3), "forest", round(float(forest.mean()),3))

# ── 수관 노이즈 (다옥타브, 4K 선명) ──
canopy = np.zeros((M, M), np.float32); amp = 0.5; tot = 0
for oct_, cells in enumerate([96, 192, 384, 768]):
    canopy += vnoise(M, cells, 200 + oct_) * amp; tot += amp; amp *= 0.55
canopy /= tot
canopy = (canopy - canopy.min()) / (canopy.max() - canopy.min())
crown = vnoise(M, 900, 300)     # 개별 수관 8~10m
micro = vnoise(M, 2200, 301)    # 잎 텍스처

# ── 실사 위성 기반 알베도 (실제 ESRI z17 그레이딩 + 수관 미세명암 + 계곡 AO + 흙길) ──
# 실제 위성이 이미 숲 캐노피 질감 → 이걸 베이스로. 채도·대비·미세명암 부여.
sat_l = sat.mean(2, keepdims=True)
sat_g = np.clip((sat - sat_l) * 1.12 + sat_l, 0, 1)              # 채도 완화(과포화 방지)
sat_g = np.clip((sat_g - 0.5) * 1.05 + 0.5, 0, 1)               # 대비 약하게
# 마른 풀/노출지의 과한 밝기 억제(하이라이트 롤오프) — 황토 띠 톤다운
hi = np.clip((sat_l - 0.5) / 0.5, 0, 1)
sat_g *= (1 - hi * 0.28)
# 숲 지역 초록 강화 + 수관 미세명암
green_boost = np.array([0.90, 1.05, 0.82], np.float32)[None, None, :]
forest3 = forest[:, :, None]
sat_g = sat_g * (1 - forest3 * 0.6) + sat_g * green_boost * (forest3 * 0.6)
sat_g *= (0.9 + 0.28 * crown[:, :, None]) * (0.93 + 0.14 * micro[:, :, None])
sat_g *= (0.82 + 0.3 * np.clip(1 - conc, 0, 1))[:, :, None]      # 계곡 AO(깊이감 강화)
# 표고 기반 시네마틱 그레이드: 계곡=쿨/어둡게, 능선=웜 (깊이 큐)
hn = np.clip((Hc - Hc.min()) / (Hc.max() - Hc.min()), 0, 1)
hn = np.asarray(Image.fromarray((hn * 255).astype(np.uint8)).resize((M, M)), np.float32) / 255.0
warm = np.array([1.06, 1.0, 0.9], np.float32)[None, None, :]
cool = np.array([0.9, 0.97, 1.05], np.float32)[None, None, :]
grade = cool + (warm - cool) * hn[:, :, None]
sat_g = np.clip(sat_g * grade, 0, 1)
alb = np.clip(sat_g * 1.0, 0, 1)

# 도로 영역은 위성의 밝은 "박제된 길"을 뮤트(그늘진 흙 톤)로 눌러줌 — 실제 길은 3D 리본이 담당
mute = np.array([0.26, 0.22, 0.15], np.float32)   # 그늘진 노출토 (리본 아래로 가려짐)
f = np.clip(road_s * 1.9, 0, 1)[:, :, None]; alb = alb * (1 - f) + mute * f
alb = np.clip(alb, 0, 1)
Image.fromarray((alb * 255).astype(np.uint8)).save(os.path.join(CACHE, "albedo_v3.jpg"), quality=94)

# ── 4K 노멀맵 (수관 범프 + 지형 미세경사) ──
hgt = (canopy * 0.55 + crown * 0.45) * forest + slope_m * 0.15
gy2, gx2 = np.gradient(hgt * 18.0)
nz = 1.0 / np.sqrt(gx2 ** 2 + gy2 ** 2 + 1)
nrm = np.stack([(-gx2 * nz) * 0.5 + 0.5, (gy2 * nz) * 0.5 + 0.5, nz * 0.5 + 0.5], -1)
Image.fromarray((np.clip(nrm, 0, 1) * 255).astype(np.uint8)).save(os.path.join(CACHE, "normal_v3.jpg"), quality=94)

meta = {"center": {"lon": LON, "lat": LAT}, "sizeMeters": SIZE,
        "zMinAbs": float(Hc.min()), "centerDemAbs": float(Hc[S//2, S//2]),
        "deltaCenter": float(Hc[S//2, S//2] - Hc.min()), "bbox": [west, south, east, north]}
json.dump(meta, open(os.path.join(CACHE, "meta_v3.json"), "w"), indent=2)
print("v3 prep done", meta)
