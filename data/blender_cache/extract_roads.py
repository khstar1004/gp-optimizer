# 도로 마스크 → 스켈레톤 중심선 → 단순화 폴리라인 (월드 XY, m)
import os, json
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize, remove_small_objects
from skimage.measure import label

CACHE = os.path.dirname(os.path.abspath(__file__))
SIZE = json.load(open(os.path.join(CACHE, "meta_v3.json")))["sizeMeters"]
road = np.load(os.path.join(CACHE, "road_v3.npy"))   # row0=north, 2048²
M = road.shape[0]

# 이진화 + 소객체 제거
b = road > 0.35
b = remove_small_objects(b, min_size=80)
sk = skeletonize(b)
ys, xs = np.where(sk)
print("skeleton px:", len(xs))

# 8-이웃 그래프로 폴리라인 트레이싱
pts = set(zip(xs.tolist(), ys.tolist()))
def nbrs(p):
    x, y = p
    out = []
    for dx in (-1,0,1):
        for dy in (-1,0,1):
            if dx==0 and dy==0: continue
            q = (x+dx, y+dy)
            if q in pts: out.append(q)
    return out

deg = {p: len(nbrs(p)) for p in pts}
# 끝점(deg1)·분기점(deg>=3)에서 시작해 경로 추적
visited_edges = set()
def edge_key(a,b): return (a,b) if a<b else (b,a)
polylines = []
def trace(start, first):
    path = [start, first]
    visited_edges.add(edge_key(start, first))
    cur, prev = first, start
    while True:
        nb = [q for q in nbrs(cur) if q != prev and edge_key(cur,q) not in visited_edges]
        # 직진 우선(각도 유지)
        if not nb: break
        if deg.get(cur,0) != 2 and cur != start:
            # 분기/끝점 도달 → 종료
            break
        nxt = nb[0]
        visited_edges.add(edge_key(cur, nxt))
        path.append(nxt); prev, cur = cur, nxt
        if deg.get(cur,0) != 2: break
    return path

endpoints = [p for p in pts if deg[p] != 2]
for ep in endpoints:
    for nb in nbrs(ep):
        if edge_key(ep, nb) not in visited_edges:
            polylines.append(trace(ep, nb))
# 남은 순환 경로
for p in pts:
    for nb in nbrs(p):
        if edge_key(p, nb) not in visited_edges:
            polylines.append(trace(p, nb))

# 픽셀→월드 변환 + Douglas-Peucker 단순화 + 짧은 것 제거
def px2world(px, py):
    x = (px/(M-1))*SIZE - SIZE/2
    y = SIZE/2 - (py/(M-1))*SIZE   # row0=north
    return x, y
def rdp(points, eps):
    if len(points) < 3: return points
    a = np.array(points[0]); b = np.array(points[-1])
    ab = b - a; L = np.hypot(*ab) + 1e-9
    d = np.abs(np.cross(ab, np.array(points)-a))/L
    i = int(np.argmax(d))
    if d[i] > eps:
        return rdp(points[:i+1], eps)[:-1] + rdp(points[i:], eps)
    return [points[0], points[-1]]

out = []
mppx = SIZE/(M-1)
for pl in polylines:
    if len(pl) < 6: continue
    world = [px2world(px,py) for px,py in pl]
    simp = rdp(world, 2.5)   # 2.5m 허용오차
    if len(simp) >= 2:
        length = sum(np.hypot(simp[i+1][0]-simp[i][0], simp[i+1][1]-simp[i][1]) for i in range(len(simp)-1))
        if length > 25:      # 25m 이상만
            out.append([[round(x,2), round(y,2)] for x,y in simp])

json.dump(out, open(os.path.join(CACHE, "roads_v3.json"), "w"))
tot = sum(len(p) for p in out)
print("polylines:", len(out), "total verts:", tot,
      "total length m:", round(sum(sum(np.hypot(p[i+1][0]-p[i][0],p[i+1][1]-p[i][1]) for i in range(len(p)-1)) for p in out)))

# ── 흙길 전용 텍스처 (U=길이방향 타일, V=폭방향 단면) ──
UW, VW = 512, 256
u = np.linspace(0, 1, UW)[None, :]
v = np.linspace(0, 1, VW)[:, None]
rng = np.random.default_rng(7)
def n2(uc, vc, seed):
    g = np.random.default_rng(seed).random((vc+1, uc+1)).astype(np.float32)
    return np.asarray(Image.fromarray((g*255).astype(np.uint8)).resize((UW, VW), Image.BICUBIC), np.float32)/255.0
streak = n2(64, 6, 1)*0.5 + n2(160, 12, 2)*0.3 + n2(32, 3, 3)*0.2   # 세로 줄무늬 우세
speck = n2(200, 120, 4)

dry   = np.array([0.52, 0.44, 0.29], np.float32)   # 마른 흙
rut   = np.array([0.30, 0.24, 0.16], np.float32)   # 다져진 바퀴자국(젖음)
median= np.array([0.34, 0.36, 0.20], np.float32)   # 중앙 풀띠
edge  = np.array([0.24, 0.22, 0.15], np.float32)   # 가장자리 낙엽/그늘

col = np.broadcast_to(dry, (VW, UW, 3)).copy()
# 두 바퀴 러트 (V≈0.28, 0.72)
for rc in (0.28, 0.72):
    band = np.exp(-((v-rc)/0.075)**2)
    col = col*(1-band[:,:,None]*0.85) + rut[None,None,:]*(band[:,:,None]*0.85)
# 중앙 풀띠 (V≈0.5)
mid = np.exp(-((v-0.5)/0.055)**2)*0.7
col = col*(1-mid[:,:,None]) + median[None,None,:]*mid[:,:,None]
# 가장자리
eg = (np.exp(-(v/0.09)**2) + np.exp(-((1-v)/0.09)**2))*0.8
col = col*(1-eg[:,:,None]) + edge[None,None,:]*eg[:,:,None]
# 세로 줄무늬·자갈 변조
col *= (0.82 + 0.32*streak[:,:,None])
col *= (0.9 + 0.18*speck[:,:,None])
col = np.clip(col, 0, 1)
Image.fromarray((col*255).astype(np.uint8)).save(os.path.join(CACHE, "road_albedo.jpg"), quality=93)

# 노멀맵 (러트 파임 + 자갈 요철)
h = np.zeros((VW, UW), np.float32)
for rc in (0.28, 0.72): h -= np.exp(-((v-rc)/0.07)**2)*0.6   # 러트 파임
h += (streak-0.5)*0.15 + (speck-0.5)*0.25
h += np.exp(-((v-0.5)/0.05)**2)*0.2                          # 중앙 약간 볼록
gy2, gx2 = np.gradient(h*12.0)
nz = 1.0/np.sqrt(gx2**2+gy2**2+1)
nrm = np.stack([(-gx2*nz)*0.5+0.5, (gy2*nz)*0.5+0.5, nz*0.5+0.5], -1)
Image.fromarray((np.clip(nrm,0,1)*255).astype(np.uint8)).save(os.path.join(CACHE, "road_normal.jpg"), quality=94)
print("road textures saved")
