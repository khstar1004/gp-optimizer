# GP Digital Twin 지형 파이프라인 (headless)
# 1) 히어로 렌더  2) 항공 렌더  3) 지형 디퓨즈 베이크  4) 저폴리 숲 GLB export
import bpy, os, sys, math, time, json
import numpy as np
from mathutils import Vector, Euler

CACHE = r"C:\Users\USER\orca\projects\gp-optimizer\data\blender_cache"
PROJ = r"C:\Users\USER\orca\projects\gp-optimizer"
OUT_GLB = os.path.join(PROJ, "assets", "models", "gp_terrain_real.glb")
OUT_HERO = os.path.join(PROJ, "assets", "renders", "gp_hero.png")
OUT_AERIAL = os.path.join(PROJ, "assets", "renders", "gp_aerial.png")
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
os.makedirs(os.path.dirname(OUT_HERO), exist_ok=True)

scn = bpy.context.scene
scn.render.engine = 'CYCLES'
scn.cycles.device = 'GPU'
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'
prefs.get_devices()
for d in prefs.devices: d.use = True
scn.render.use_persistent_data = True

log = open(os.path.join(CACHE, "pipeline_log.txt"), "w", encoding="utf-8")
def P(*a):
    s = " ".join(str(x) for x in a)
    print(s); log.write(s + "\n"); log.flush()

t_all = time.time()

# ───────── 1) 히어로 렌더 ─────────
scn.render.resolution_x = 1920
scn.render.resolution_y = 1080
scn.render.resolution_percentage = 100
scn.cycles.samples = 96
scn.cycles.use_denoising = True
scn.render.filepath = OUT_HERO
t0 = time.time()
bpy.ops.render.render(write_still=True)
P("hero render:", round(time.time()-t0,1), "s")

# ───────── 2) 항공 전경 렌더 ─────────
SX, SY, SZ = scn["gp_summit"]
cam = bpy.data.objects["Camera"]
old_loc, old_rot, old_lens = tuple(cam.location), tuple(cam.rotation_euler), cam.data.lens
cam.data.lens = 24
cam.data.dof.use_dof = False
eye = Vector((SX - 480, SY - 780, SZ + 420))
tgt = Vector((SX, SY, SZ - 60))
cam.location = eye
d = tgt - eye
cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
scn.cycles.samples = 64
scn.render.filepath = OUT_AERIAL
t0 = time.time()
bpy.ops.render.render(write_still=True)
P("aerial render:", round(time.time()-t0,1), "s")
cam.location = old_loc; cam.rotation_euler = Euler(old_rot); cam.data.lens = old_lens
cam.data.dof.use_dof = True

# ───────── 3) 지형 디퓨즈 베이크 (4096) ─────────
terrain = bpy.data.objects["GP_Terrain"]
# GN 산포 잠시 끔 (베이크 대상은 지형면만)
gn_states = {}
for md in terrain.modifiers:
    gn_states[md.name] = md.show_render
    md.show_render = False

bake_img = bpy.data.images.new("terrain_bake", width=4096, height=4096, alpha=False)
mat = bpy.data.materials["GP_Terrain_Mat"]
nt = mat.node_tree
bnode = nt.nodes.new("ShaderNodeTexImage")
bnode.image = bake_img
nt.nodes.active = bnode

for o in bpy.data.objects:
    o.select_set(False)
terrain.select_set(True)
bpy.context.view_layer.objects.active = terrain
scn.cycles.samples = 8
scn.render.bake.use_pass_direct = False
scn.render.bake.use_pass_indirect = False
scn.render.bake.use_pass_color = True
t0 = time.time()
bpy.ops.object.bake(type='DIFFUSE')
P("bake:", round(time.time()-t0,1), "s")
bake_path = os.path.join(CACHE, "terrain_bake.jpg")
bake_img.filepath_raw = bake_path
bake_img.file_format = 'JPEG'
scn.render.image_settings.quality = 88
bake_img.save()
for md in terrain.modifiers:
    md.show_render = gn_states.get(md.name, True)

# ───────── 4) EXPORT 씬 구성 ─────────
Hc = np.load(os.path.join(CACHE, "dem_crop_512.npy"))
ZMIN = float(Hc.min())
S, SIZE = 512, 1500.0
rng = np.random.default_rng(20260902)

def hmap(xq, yq):
    c = np.clip((xq + SIZE/2)/SIZE*(S-1), 0, S-1.001)
    r = np.clip((SIZE/2 - yq)/SIZE*(S-1), 0, S-1.001)
    r0 = r.astype(int); c0 = c.astype(int)
    tr = r - r0; tc = c - c0
    return (Hc[r0, c0]*(1-tr)*(1-tc) + Hc[r0, c0+1]*(1-tr)*tc
            + Hc[r0+1, c0]*tr*(1-tc) + Hc[r0+1, c0+1]*tr*tc) - ZMIN

# 마스크 로드 (bottom-up 512 이미지 → numpy [row0=south])
def load_mask(name):
    img = bpy.data.images[name]
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[:, :, 0]
    return a  # row0=south
road = load_mask("road_mask")
slope = load_mask("slope_mask")   # flipud된 상태로 저장했으므로 south-up
esri = bpy.data.images["esri_crop"]
ew, eh = esri.size
ep = np.array(esri.pixels[:], dtype=np.float32).reshape(eh, ew, 4)[:, :, :3]  # row0=south
green = ep[:, :, 1] - (ep[:, :, 0] + ep[:, :, 2]) * 0.5

def sample_at(arr, xq, yq):
    h, w = arr.shape[:2]
    cx = np.clip(((xq + SIZE/2)/SIZE*(w-1)).astype(int), 0, w-1)
    cy = np.clip(((yq + SIZE/2)/SIZE*(h-1)).astype(int), 0, h-1)
    return arr[cy, cx]

# 군집 노이즈 (사인합성 - 시드 고정)
def cluster_field(xq, yq, scale_m, seed):
    r = np.random.default_rng(seed)
    acc = np.zeros_like(xq)
    for i in range(5):
        fx, fy = r.uniform(0.5, 2.0, 2) * (2*np.pi/scale_m)
        ph1, ph2 = r.uniform(0, 6.28, 2)
        acc += np.sin(xq*fx + ph1) * np.sin(yq*fy + ph2)
    return (acc/5*0.5 + 0.5)

def scatter(n_target, seed, green_min=None, road_lt=None, slope_lt=None,
            cluster=None, clear_summit=None, oversample=6):
    n = n_target * oversample
    xs = rng.uniform(-SIZE/2, SIZE/2, n)
    ys = rng.uniform(-SIZE/2, SIZE/2, n)
    w = np.ones(n)
    if green_min is not None:
        g = sample_at(green, xs, ys)
        w *= np.clip((g - green_min[0])/(green_min[1]-green_min[0]), 0, 1)
    if road_lt is not None:
        w *= (sample_at(road, xs, ys) < road_lt)
    if slope_lt is not None:
        w *= (sample_at(slope, xs, ys) < slope_lt)
    if cluster is not None:
        cs, cpow = cluster
        w *= cluster_field(xs, ys, cs, seed) ** cpow
    if clear_summit is not None:
        w *= (np.hypot(xs - SX, ys - SY) > clear_summit)
    keep = rng.uniform(0, 1, n) < w
    xs, ys = xs[keep], ys[keep]
    if len(xs) > n_target:
        idx = rng.choice(len(xs), n_target, replace=False)
        xs, ys = xs[idx], ys[idx]
    return xs, ys

# ── 저폴리 프록시 준비 ──
def make_proxy(src_name, tri_target):
    src = bpy.data.objects[src_name]
    me = src.data.copy()
    ob = bpy.data.objects.new(src_name + "_proxy", me)
    bpy.context.scene.collection.objects.link(ob)
    cur_tris = sum(len(p.vertices) - 2 for p in me.polygons)
    ratio = min(1.0, tri_target / max(cur_tris, 1))
    md = ob.modifiers.new("dec", 'DECIMATE')
    md.ratio = ratio
    bpy.context.view_layer.objects.active = ob
    for o in bpy.data.objects: o.select_set(False)
    ob.select_set(True)
    t0 = time.time()
    bpy.ops.object.modifier_apply(modifier="dec")
    P("decimate", src_name, cur_tris, "->", sum(len(p.vertices)-2 for p in ob.data.polygons), round(time.time()-t0,1), "s")
    return ob

TREE_SPECS = [
    ("pine_tree_01_a_LOD0", 2600, 0.42),
    ("pine_tree_01_c_LOD0", 2400, 0.22),
    ("fir_tree_01_a_LOD0",  2200, 0.20),
    ("tree_small_02_LOD0",  1500, 0.16),
]
proxies = []
for name, tris, frac in TREE_SPECS:
    proxies.append((make_proxy(name, tris), frac))
rock_proxy = make_proxy("boulder_01", 1800)
rock2_proxy = make_proxy("coast_rocks_05", 2200)

# ── export 컬렉션 ──
exp_col = bpy.data.collections.new("ExportCol")
scn.collection.children.link(exp_col)

# 지형 메시 256x256 + 베이크 텍스처
ES = 256
xs_l = np.linspace(-SIZE/2, SIZE/2, ES, dtype=np.float32)
ys_l = np.linspace(SIZE/2, -SIZE/2, ES, dtype=np.float32)
XX, YY = np.meshgrid(xs_l, ys_l)
step = (S-1)/(ES-1)
ri = np.clip((np.arange(ES)*step).astype(int), 0, S-1)
ZZ = Hc[np.ix_(ri, ri)] - ZMIN
coords = np.stack([XX, YY, ZZ.astype(np.float32)], axis=-1).reshape(-1, 3)
r_ = np.arange(ES-1); RR, CC = np.meshgrid(r_, r_, indexing="ij")
i0 = RR*ES + CC
quads = np.stack([i0, i0+ES, i0+ES+1, i0+1], axis=-1).reshape(-1, 4)
me = bpy.data.meshes.new("TerrainExport")
me.vertices.add(ES*ES)
me.vertices.foreach_set("co", coords.ravel())
nf = quads.shape[0]
me.loops.add(nf*4); me.polygons.add(nf)
me.polygons.foreach_set("loop_start", (np.arange(nf)*4).astype(np.int32))
me.loops.foreach_set("vertex_index", quads.ravel().astype(np.int32))
me.update(calc_edges=True); me.validate()
uvl = me.uv_layers.new(name="UVMap")
u = (coords[:, 0]+SIZE/2)/SIZE; v = (coords[:, 1]+SIZE/2)/SIZE
uvco = np.stack([u, v], axis=-1)
vi = np.zeros(nf*4, dtype=np.int32)
me.loops.foreach_get("vertex_index", vi)
uvl.data.foreach_set("uv", uvco[vi].ravel())
me.polygons.foreach_set("use_smooth", np.ones(nf, dtype=bool))
me.update()
tmat = bpy.data.materials.new("TerrainExportMat")
tmat.use_nodes = True
tnt = tmat.node_tree
tb = tnt.nodes["Principled BSDF"]
tb.inputs["Roughness"].default_value = 0.95
ttex = tnt.nodes.new("ShaderNodeTexImage")
timg = bpy.data.images.load(bake_path)
ttex.image = timg
tnt.links.new(ttex.outputs["Color"], tb.inputs["Base Color"])
me.materials.append(tmat)
tob = bpy.data.objects.new("TerrainExport", me)
exp_col.objects.link(tob)

# ── 나무 인스턴스 (겁나 많이) ──
N_TREES = 9000
tx, ty = scatter(N_TREES, 11, green_min=(0.0, 0.05), road_lt=0.25,
                 slope_lt=0.82, cluster=(140.0, 0.6), clear_summit=28)
tz = hmap(tx, ty)
n_actual = len(tx)
P("tree positions:", n_actual)
species_pick = rng.choice(len(TREE_SPECS), n_actual, p=[s[2] for s in TREE_SPECS])
rots = rng.uniform(0, 6.28318, n_actual)
scls = rng.uniform(0.5, 1.0, n_actual)
for i in range(n_actual):
    src = proxies[species_pick[i]][0]
    ob = bpy.data.objects.new(f"t{i}", src.data)
    ob.location = (float(tx[i]), float(ty[i]), float(tz[i]) - 0.25)
    ob.rotation_euler = (0, 0, float(rots[i]))
    s = float(scls[i]); ob.scale = (s, s, s)
    exp_col.objects.link(ob)
P("trees instanced")

# ── 바위 인스턴스 ──
N_ROCKS = 260
rx, ry = scatter(N_ROCKS, 22, road_lt=0.2, cluster=(90.0, 2.0), clear_summit=18)
rz = hmap(rx, ry)
rrots = rng.uniform(0, 6.28318, len(rx))
rscls = rng.uniform(0.4, 1.5, len(rx))
for i in range(len(rx)):
    src = rock_proxy if i % 3 else rock2_proxy
    ob = bpy.data.objects.new(f"r{i}", src.data)
    ob.location = (float(rx[i]), float(ry[i]), float(rz[i]) - 0.3)
    ob.rotation_euler = (0, 0, float(rrots[i]))
    s = float(rscls[i]); ob.scale = (s, s, s)
    exp_col.objects.link(ob)
P("rocks instanced:", len(rx))

# ── export 전용 씬 ──
exp_scene = bpy.data.scenes.new("ExportScene")
exp_scene.collection.children.link(exp_col)
bpy.context.window.scene = exp_scene

t0 = time.time()
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format='GLB',
    use_active_scene=True,
    export_apply=True,
    export_gpu_instances=True,
    export_yup=True,
    export_image_format='AUTO',
    export_jpeg_quality=82,
    export_materials='EXPORT',
    export_animations=False,
    export_skins=False,
    export_morph=False,
)
P("glb export:", round(time.time()-t0,1), "s | size:", round(os.path.getsize(OUT_GLB)/1e6,1), "MB")

# 메타 저장
region = json.load(open(os.path.join(CACHE, "region.json")))
meta = {
    "center": {"lon": region["lon"], "lat": region["lat"]},
    "sizeMeters": SIZE,
    "zMinAbs": ZMIN,
    "centerDemAbs": float(Hc[256, 256]),
    "deltaCenter": float(Hc[256, 256]) - ZMIN,
    "trees": int(n_actual), "rocks": int(len(rx)),
    "bbox": region["bbox"],
}
json.dump(meta, open(os.path.join(PROJ, "assets", "models", "gp_terrain_real.json"), "w"), indent=2)
P("meta saved | TOTAL:", round(time.time()-t_all,1), "s")
log.close()
