# v2 빌드 (headless, --factory-startup): 3km 지형 + 절차적 수목 6만 + GLB export
import bpy, bmesh, os, json, math, random, time
import numpy as np
from mathutils import Vector

CACHE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(os.path.dirname(CACHE))
OUT = os.path.join(PROJ, "assets", "models", "gp_terrain_real_raw.glb")
t0 = time.time()

# 기본 씬 비우기
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

Hc = np.load(os.path.join(CACHE, "dem_v2_768.npy"))  # row0=north
S = 768
SIZE = 3000.0
ZMIN = float(Hc.min())
ZZ = (Hc - ZMIN).astype(np.float32)

# ── 지형 메시 ──
xs = np.linspace(-SIZE / 2, SIZE / 2, S, dtype=np.float32)
ys = np.linspace(SIZE / 2, -SIZE / 2, S, dtype=np.float32)
XX, YY = np.meshgrid(xs, ys)
coords = np.stack([XX, YY, ZZ], axis=-1).reshape(-1, 3)
r = np.arange(S - 1)
RR, CC = np.meshgrid(r, r, indexing="ij")
i0 = RR * S + CC
quads = np.stack([i0, i0 + S, i0 + S + 1, i0 + 1], axis=-1).reshape(-1, 4)
me = bpy.data.meshes.new("Terrain")
me.vertices.add(S * S)
me.vertices.foreach_set("co", coords.ravel())
nf = quads.shape[0]
me.loops.add(nf * 4)
me.polygons.add(nf)
me.polygons.foreach_set("loop_start", (np.arange(nf) * 4).astype(np.int32))
me.loops.foreach_set("vertex_index", quads.ravel().astype(np.int32))
me.update(calc_edges=True)
me.validate()
uvl = me.uv_layers.new(name="UVMap")
u = (coords[:, 0] + SIZE / 2) / SIZE
v = (coords[:, 1] + SIZE / 2) / SIZE
uvco = np.stack([u, v], axis=-1)
vi = np.zeros(nf * 4, dtype=np.int32)
me.loops.foreach_get("vertex_index", vi)
uvl.data.foreach_set("uv", uvco[vi].ravel())
me.polygons.foreach_set("use_smooth", np.ones(nf, dtype=bool))
me.update()

mat = bpy.data.materials.new("TerrainMat")
mat.use_nodes = True
nt = mat.node_tree
bsdf = nt.nodes["Principled BSDF"]
bsdf.inputs["Roughness"].default_value = 0.95
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = bpy.data.images.load(os.path.join(CACHE, "albedo_v2.jpg"))
nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
ntex = nt.nodes.new("ShaderNodeTexImage")
ntex.image = bpy.data.images.load(os.path.join(CACHE, "normal_v2.jpg"))
ntex.image.colorspace_settings.name = "Non-Color"
nmap = nt.nodes.new("ShaderNodeNormalMap")
nmap.inputs["Strength"].default_value = 1.0
nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
me.materials.append(mat)
tob = bpy.data.objects.new("Terrain", me)
bpy.context.collection.objects.link(tob)
print("terrain done", round(time.time() - t0, 1))

# ── 절차적 나무 메시 ──
def flat_mat(name, rgb, rough=0.9):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    return m

BARK = flat_mat("bark", (0.10, 0.07, 0.045))
PINE_G = [flat_mat(f"pineG{i}", c) for i, c in enumerate(
    [(0.030, 0.055, 0.022), (0.040, 0.070, 0.026), (0.052, 0.085, 0.032)])]
LEAF_G = [flat_mat(f"leafG{i}", c) for i, c in enumerate(
    [(0.045, 0.075, 0.028), (0.062, 0.095, 0.034), (0.080, 0.115, 0.042)])]
ROCK_M = flat_mat("rockM", (0.30, 0.27, 0.24), 0.95)

rnd = random.Random(42)

def make_pine(name, gmat, h=13.0, seed=0):
    rr = random.Random(seed)
    bm = bmesh.new()
    # 줄기
    bmesh.ops.create_cone(bm, cap_ends=True, segments=7,
                          radius1=h * 0.030, radius2=h * 0.012, depth=h * 0.42)
    for vt in bm.verts:
        vt.co.z += h * 0.21
    trunk_faces = list(bm.faces)
    # 원뿔 4단
    cones = []
    for i in range(4):
        z0 = h * (0.28 + 0.18 * i)
        rad = h * (0.30 - 0.055 * i) * rr.uniform(0.88, 1.12)
        dep = h * 0.30
        ret = bmesh.ops.create_cone(bm, cap_ends=True, segments=8,
                                    radius1=rad, radius2=rad * 0.06, depth=dep)
        vs = ret["verts"]
        ox, oy = rr.uniform(-0.4, 0.4), rr.uniform(-0.4, 0.4)
        for vt in vs:
            vt.co.z += z0 + dep / 2
            vt.co.x += ox
            vt.co.y += oy
        cones.append(set(f.index for f in bm.faces if all(v in vs for v in f.verts)))
    m2 = bpy.data.meshes.new(name)
    bm.to_mesh(m2)
    bm.free()
    m2.materials.append(BARK)
    m2.materials.append(gmat)
    # 줄기=0, 나머지=1
    zthr = h * 0.28
    for p in m2.polygons:
        p.material_index = 0 if p.center.z < zthr and abs(p.center.x) < h * 0.05 and abs(p.center.y) < h * 0.05 else 1
        p.use_smooth = False  # 플랫 셰이딩 — 침엽 클럼프 질감
    ob = bpy.data.objects.new(name, m2)
    bpy.context.collection.objects.link(ob)
    return ob

def make_broadleaf(name, gmat, h=10.0, seed=0):
    rr = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=7,
                          radius1=h * 0.045, radius2=h * 0.022, depth=h * 0.45)
    for vt in bm.verts:
        vt.co.z += h * 0.225
    # 불규칙 2중 블롭 수관
    for bi, (bz, br) in enumerate([(0.58, 0.34), (0.78, 0.24)]):
        ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=h * br)
        ox, oy = rr.uniform(-0.6, 0.6), rr.uniform(-0.6, 0.6)
        for vt in ret["verts"]:
            n = vt.co.normalized()
            vt.co += n * (rr.uniform(-0.22, 0.22) * h * br)
            vt.co.z = vt.co.z * 0.72 + h * bz
            vt.co.x += ox
            vt.co.y += oy
    m2 = bpy.data.meshes.new(name)
    bm.to_mesh(m2)
    bm.free()
    m2.materials.append(BARK)
    m2.materials.append(gmat)
    zthr = h * 0.40
    for p in m2.polygons:
        p.material_index = 0 if p.center.z < zthr else 1
        p.use_smooth = False
    ob = bpy.data.objects.new(name, m2)
    bpy.context.collection.objects.link(ob)
    return ob

def make_rock(name, seed=0):
    rr = random.Random(seed)
    bm = bmesh.new()
    ret = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    for vt in bm.verts:
        vt.co.x *= rr.uniform(0.7, 1.4)
        vt.co.y *= rr.uniform(0.7, 1.4)
        vt.co.z *= rr.uniform(0.45, 0.8)
        vt.co += Vector((rr.uniform(-0.12, 0.12), rr.uniform(-0.12, 0.12), rr.uniform(-0.08, 0.08)))
    m2 = bpy.data.meshes.new(name)
    bm.to_mesh(m2)
    bm.free()
    m2.materials.append(ROCK_M)
    ob = bpy.data.objects.new(name, m2)
    bpy.context.collection.objects.link(ob)
    return ob

species = []
for i in range(3):
    species.append((make_pine(f"pine{i}", PINE_G[i], h=13.0, seed=10 + i), 0.22))
for i in range(3):
    species.append((make_broadleaf(f"broad{i}", LEAF_G[i], h=10.0, seed=20 + i), 0.113))
rocks = [make_rock(f"rock{i}", seed=30 + i) for i in range(2)]
tris = [sum(len(p.vertices) - 2 for p in sp[0].data.polygons) for sp in species]
print("tree tris:", tris)

# ── 마스크 로드 (row0=north, prep에서 npy로 변환됨) ──
forest = np.load(os.path.join(CACHE, "forest_v2.npy"))
roadm = np.load(os.path.join(CACHE, "road_v2.npy"))
openm = np.load(os.path.join(CACHE, "open_v2.npy"))
M = forest.shape[0]

def sample(arr, xq, yq):
    c = np.clip(((xq + SIZE / 2) / SIZE * (arr.shape[1] - 1)).astype(int), 0, arr.shape[1] - 1)
    rr_ = np.clip(((SIZE / 2 - yq) / SIZE * (arr.shape[0] - 1)).astype(int), 0, arr.shape[0] - 1)
    return arr[rr_, c]

def hmap(xq, yq):
    c = np.clip((xq + SIZE / 2) / SIZE * (S - 1), 0, S - 1.001)
    rr_ = np.clip((SIZE / 2 - yq) / SIZE * (S - 1), 0, S - 1.001)
    r0 = rr_.astype(int); c0 = c.astype(int)
    tr = rr_ - r0; tc = c - c0
    return (ZZ[r0, c0] * (1 - tr) * (1 - tc) + ZZ[r0, c0 + 1] * (1 - tr) * tc
            + ZZ[r0 + 1, c0] * tr * (1 - tc) + ZZ[r0 + 1, c0 + 1] * tr * tc)

# 경사 제한
cell = SIZE / (S - 1)
gy_, gx_ = np.gradient(ZZ, cell)
slope_deg = np.degrees(np.arctan(np.hypot(gx_, gy_)))

# ── 나무 산포 ──
N_T = 60000
rng = np.random.default_rng(2026)
n = N_T * 4
xq = rng.uniform(-SIZE / 2, SIZE / 2, n)
yq = rng.uniform(-SIZE / 2, SIZE / 2, n)
w = sample(forest, xq, yq)
w *= (sample(roadm, xq, yq) < 0.12)
w *= (sample(openm, xq, yq) < 0.25)
w *= (sample(slope_deg, xq, yq) < 42)
keep = rng.uniform(0, 1, n) < w
xq, yq = xq[keep], yq[keep]
if len(xq) > N_T:
    sel = rng.choice(len(xq), N_T, replace=False)
    xq, yq = xq[sel], yq[sel]
zq = hmap(xq, yq)
NT = len(xq)
print("tree count:", NT)

probs = np.array([s[1] for s in species]); probs /= probs.sum()
pick = rng.choice(len(species), NT, p=probs)
rots = rng.uniform(0, 6.28318, NT)
scls = rng.uniform(0.65, 1.35, NT)

t1 = time.time()
col = bpy.data.collections.new("Trees")
bpy.context.scene.collection.children.link(col)
for i in range(NT):
    src = species[pick[i]][0]
    ob = bpy.data.objects.new(f"t{i}", src.data)
    ob.location = (float(xq[i]), float(yq[i]), float(zq[i]) - 0.3)
    ob.rotation_euler = (0, 0, float(rots[i]))
    s = float(scls[i])
    ob.scale = (s, s, s)
    col.objects.link(ob)
print("trees linked", round(time.time() - t1, 1))

# ── 바위 (도로변·능선) ──
N_R = 400
n = N_R * 6
xq2 = rng.uniform(-SIZE / 2, SIZE / 2, n)
yq2 = rng.uniform(-SIZE / 2, SIZE / 2, n)
w2 = np.clip(sample(roadm, xq2, yq2) * 3, 0, 1) * 0.7 + np.clip((sample(slope_deg, xq2, yq2) - 25) / 20, 0, 1) * 0.5
keep2 = rng.uniform(0, 1, n) < w2
xq2, yq2 = xq2[keep2][:N_R], yq2[keep2][:N_R]
zq2 = hmap(xq2, yq2)
for i in range(len(xq2)):
    src = rocks[i % 2]
    ob = bpy.data.objects.new(f"r{i}", src.data)
    ob.location = (float(xq2[i]), float(yq2[i]), float(zq2[i]) - 0.4)
    ob.rotation_euler = (0, 0, float(rng.uniform(0, 6.28)))
    s = float(rng.uniform(0.5, 2.2))
    ob.scale = (s, s, s * 0.8)
    bpy.context.collection.objects.link(ob)
print("rocks:", len(xq2))

# 원본 종 메시 숨김 (export 제외 위해 far away로 이동 후 export에서 제외 불가 → 삭제 대신 이동)
for sp, _ in species:
    sp.location = (0, 0, -5000)
for rk in rocks:
    rk.location = (0, 0, -5000)

bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_apply=True,
    export_gpu_instances=True, export_yup=True,
    export_image_format='AUTO', export_jpeg_quality=85,
    export_animations=False, export_skins=False, export_morph=False)
print("glb:", round(os.path.getsize(OUT) / 1e6, 1), "MB | total", round(time.time() - t0, 1), "s")

meta = json.load(open(os.path.join(CACHE, "meta_v2.json")))
meta["trees"] = int(NT)
meta["rocks"] = int(len(xq2))
json.dump(meta, open(os.path.join(PROJ, "assets", "models", "gp_terrain_real.json"), "w"), indent=2)
print("meta written")
