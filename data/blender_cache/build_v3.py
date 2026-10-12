# v3 고화질 빌드: 2km 지형 1024² + 나무 15만 + 하부식생 8만 + 바위
import bpy, bmesh, os, json, random, time
import numpy as np
from mathutils import Vector

CACHE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(os.path.dirname(CACHE))
OUT = os.path.join(PROJ, "assets", "models", "gp_terrain_real_raw.glb")
t0 = time.time()

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

Hc = np.load(os.path.join(CACHE, "dem_v3.npy"))
S = Hc.shape[0]
SIZE = 1000.0
ZMIN = float(Hc.min())
ZZ = (Hc - ZMIN).astype(np.float32)

# ── 지형 메시 1024² ──
xs = np.linspace(-SIZE/2, SIZE/2, S, dtype=np.float32)
ys = np.linspace(SIZE/2, -SIZE/2, S, dtype=np.float32)
XX, YY = np.meshgrid(xs, ys)
coords = np.stack([XX, YY, ZZ], -1).reshape(-1, 3)
r = np.arange(S-1); RR, CC = np.meshgrid(r, r, indexing="ij")
i0 = RR*S + CC
quads = np.stack([i0, i0+S, i0+S+1, i0+1], -1).reshape(-1, 4)
me = bpy.data.meshes.new("Terrain")
me.vertices.add(S*S); me.vertices.foreach_set("co", coords.ravel())
nf = quads.shape[0]
me.loops.add(nf*4); me.polygons.add(nf)
me.polygons.foreach_set("loop_start", (np.arange(nf)*4).astype(np.int32))
me.loops.foreach_set("vertex_index", quads.ravel().astype(np.int32))
me.update(calc_edges=True); me.validate()
uvl = me.uv_layers.new(name="UVMap")
u = (coords[:, 0]+SIZE/2)/SIZE; v = (coords[:, 1]+SIZE/2)/SIZE
uvco = np.stack([u, v], -1)
vi = np.zeros(nf*4, dtype=np.int32); me.loops.foreach_get("vertex_index", vi)
uvl.data.foreach_set("uv", uvco[vi].ravel())
me.polygons.foreach_set("use_smooth", np.ones(nf, dtype=bool)); me.update()
mat = bpy.data.materials.new("TerrainMat"); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]
bsdf.inputs["Roughness"].default_value = 0.95
tex = nt.nodes.new("ShaderNodeTexImage")
tex.image = bpy.data.images.load(os.path.join(CACHE, "albedo_v3.jpg"))
nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
ntex = nt.nodes.new("ShaderNodeTexImage")
ntex.image = bpy.data.images.load(os.path.join(CACHE, "normal_v3.jpg"))
ntex.image.colorspace_settings.name = "Non-Color"
nmap = nt.nodes.new("ShaderNodeNormalMap"); nmap.inputs["Strength"].default_value = 1.0
nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
me.materials.append(mat)
tob = bpy.data.objects.new("Terrain", me)
bpy.context.collection.objects.link(tob)
print("terrain", round(time.time()-t0,1))

def flat_mat(name, rgb, rough=0.9):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    return m

BARK = flat_mat("bark", (0.09, 0.065, 0.042))
PINE = [flat_mat(f"pine{i}", c) for i, c in enumerate(
    [(0.028, 0.052, 0.020), (0.038, 0.066, 0.025), (0.050, 0.082, 0.032)])]
LEAF = [flat_mat(f"leaf{i}", c) for i, c in enumerate(
    [(0.042, 0.072, 0.026), (0.058, 0.092, 0.033), (0.078, 0.112, 0.042)])]
UNDER = [flat_mat(f"under{i}", c) for i, c in enumerate(
    [(0.060, 0.095, 0.032), (0.085, 0.120, 0.045), (0.11, 0.14, 0.05)])]
ROCK = flat_mat("rock", (0.30, 0.27, 0.24), 0.95)

def make_pine(name, gmat, h, seed):
    rr = random.Random(seed); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=h*0.028, radius2=h*0.011, depth=h*0.5)
    for vt in bm.verts: vt.co.z += h*0.25
    for i in range(6):
        z0 = h*(0.22+0.135*i); rad = h*(0.34-0.045*i)*rr.uniform(0.85,1.15); dep = h*0.26
        ret = bmesh.ops.create_cone(bm, cap_ends=True, segments=9, radius1=rad, radius2=rad*0.04, depth=dep)
        ox, oy = rr.uniform(-0.5,0.5), rr.uniform(-0.5,0.5)
        droop = rr.uniform(0.0, 0.06)
        for vt in ret["verts"]:
            vt.co.z += z0+dep/2; vt.co.x += ox; vt.co.y += oy
            rad2 = (vt.co.x-ox)**2+(vt.co.y-oy)**2
            vt.co.z -= rad2*droop
    m2 = bpy.data.meshes.new(name); bm.to_mesh(m2); bm.free()
    m2.materials.append(BARK); m2.materials.append(gmat)
    zt = h*0.22
    for p in m2.polygons:
        p.material_index = 0 if (p.center.z < zt and abs(p.center.x)<h*0.05 and abs(p.center.y)<h*0.05) else 1
        p.use_smooth = False
    ob = bpy.data.objects.new(name, m2); bpy.context.collection.objects.link(ob); return ob

def make_broad(name, gmat, h, seed):
    rr = random.Random(seed); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=h*0.04, radius2=h*0.02, depth=h*0.45)
    for vt in bm.verts: vt.co.z += h*0.225
    for bz, br in [(0.55,0.34),(0.72,0.28),(0.85,0.18)]:
        ret = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=h*br)
        ox, oy = rr.uniform(-0.7,0.7), rr.uniform(-0.7,0.7)
        for vt in ret["verts"]:
            n = vt.co.normalized(); vt.co += n*(rr.uniform(-0.25,0.25)*h*br)
            vt.co.z = vt.co.z*0.68 + h*bz; vt.co.x += ox; vt.co.y += oy
    m2 = bpy.data.meshes.new(name); bm.to_mesh(m2); bm.free()
    m2.materials.append(BARK); m2.materials.append(gmat)
    zt = h*0.4
    for p in m2.polygons:
        p.material_index = 0 if p.center.z < zt else 1
        p.use_smooth = False
    ob = bpy.data.objects.new(name, m2); bpy.context.collection.objects.link(ob); return ob

def make_shrub(name, gmat, seed):
    rr = random.Random(seed); bm = bmesh.new()
    for _ in range(3):
        ret = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=rr.uniform(0.3,0.6))
        for vt in ret["verts"]:
            vt.co += Vector((rr.uniform(-0.4,0.4), rr.uniform(-0.4,0.4), rr.uniform(0.1,0.5)))
    m2 = bpy.data.meshes.new(name); bm.to_mesh(m2); bm.free()
    m2.materials.append(gmat)
    for p in m2.polygons: p.use_smooth = False
    ob = bpy.data.objects.new(name, m2); bpy.context.collection.objects.link(ob); return ob

def make_rock(name, seed):
    rr = random.Random(seed); bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    for vt in bm.verts:
        vt.co.x *= rr.uniform(0.7,1.4); vt.co.y *= rr.uniform(0.7,1.4); vt.co.z *= rr.uniform(0.4,0.8)
        vt.co += Vector((rr.uniform(-0.15,0.15),rr.uniform(-0.15,0.15),rr.uniform(-0.1,0.1)))
    m2 = bpy.data.meshes.new(name); bm.to_mesh(m2); bm.free()
    m2.materials.append(ROCK)
    ob = bpy.data.objects.new(name, m2); bpy.context.collection.objects.link(ob); return ob

trees = []
for i in range(3): trees.append((make_pine(f"pine{i}", PINE[i], 14.0*random.Random(i).uniform(0.85,1.15), 10+i), 0.17))
for i in range(3): trees.append((make_broad(f"broad{i}", LEAF[i], 10.5, 20+i), 0.11))
shrubs = [make_shrub(f"shrub{i}", UNDER[i], 40+i) for i in range(3)]
rocks = [make_rock(f"rock{i}", 50+i) for i in range(2)]
print("tree tris:", [sum(len(p.vertices)-2 for p in t[0].data.polygons) for t in trees])

forest = np.load(os.path.join(CACHE, "forest_v3.npy"))
roadm = np.load(os.path.join(CACHE, "road_v3.npy"))
openm = np.load(os.path.join(CACHE, "open_v3.npy"))

def sample(arr, xq, yq):
    c = np.clip(((xq+SIZE/2)/SIZE*(arr.shape[1]-1)).astype(int), 0, arr.shape[1]-1)
    rr_ = np.clip(((SIZE/2-yq)/SIZE*(arr.shape[0]-1)).astype(int), 0, arr.shape[0]-1)
    return arr[rr_, c]
def hmap(xq, yq):
    c = np.clip((xq+SIZE/2)/SIZE*(S-1), 0, S-1.001); rr_ = np.clip((SIZE/2-yq)/SIZE*(S-1), 0, S-1.001)
    r0 = rr_.astype(int); c0 = c.astype(int); tr = rr_-r0; tc = c-c0
    return (ZZ[r0,c0]*(1-tr)*(1-tc)+ZZ[r0,c0+1]*(1-tr)*tc+ZZ[r0+1,c0]*tr*(1-tc)+ZZ[r0+1,c0+1]*tr*tc)

cell = SIZE/(S-1); gy_, gx_ = np.gradient(ZZ, cell)
slope_deg = np.degrees(np.arctan(np.hypot(gx_, gy_)))
rng = np.random.default_rng(2026)

def scatter(N, over, wfun):
    n = N*over
    xq = rng.uniform(-SIZE/2, SIZE/2, n); yq = rng.uniform(-SIZE/2, SIZE/2, n)
    w = wfun(xq, yq)
    keep = rng.uniform(0,1,n) < w
    xq, yq = xq[keep], yq[keep]
    if len(xq) > N:
        sel = rng.choice(len(xq), N, replace=False); xq, yq = xq[sel], yq[sel]
    return xq, yq

# 나무 12만 (1km² 초고밀도 ~0.12/m²)
xq, yq = scatter(120000, 5, lambda x,y: sample(forest,x,y)*(sample(roadm,x,y)<0.1)*(sample(openm,x,y)<0.25)*(sample(slope_deg,x,y)<43))
zq = hmap(xq, yq); NT = len(xq); print("trees", NT)
probs = np.array([t[1] for t in trees]); probs/=probs.sum()
pick = rng.choice(len(trees), NT, p=probs)
rots = rng.uniform(0,6.28318,NT); scls = rng.uniform(0.6,1.5,NT)
col = bpy.data.collections.new("Trees"); bpy.context.scene.collection.children.link(col)
t1 = time.time()
for i in range(NT):
    ob = bpy.data.objects.new(f"t{i}", trees[pick[i]][0].data)
    ob.location = (float(xq[i]), float(yq[i]), float(zq[i])-0.3)
    ob.rotation_euler = (0,0,float(rots[i])); s = float(scls[i]); ob.scale = (s,s,s)
    col.objects.link(ob)
print("trees linked", round(time.time()-t1,1))

# 하부식생 8만 (숲속, 도로 근처는 성기게)
xq2, yq2 = scatter(80000, 4, lambda x,y: sample(forest,x,y)*(sample(roadm,x,y)<0.3)*(sample(slope_deg,x,y)<45))
zq2 = hmap(xq2, yq2)
rot2 = rng.uniform(0,6.28,len(xq2)); scl2 = rng.uniform(0.5,1.6,len(xq2))
pk2 = rng.integers(0,3,len(xq2))
col2 = bpy.data.collections.new("Under"); bpy.context.scene.collection.children.link(col2)
for i in range(len(xq2)):
    ob = bpy.data.objects.new(f"u{i}", shrubs[pk2[i]].data)
    ob.location = (float(xq2[i]), float(yq2[i]), float(zq2[i])-0.1)
    ob.rotation_euler = (0,0,float(rot2[i])); s = float(scl2[i]); ob.scale = (s,s,s)
    col2.objects.link(ob)
print("undergrowth", len(xq2))

# 바위 700
xq3, yq3 = scatter(700, 8, lambda x,y: np.clip(sample(roadm,x,y)*3,0,1)*0.6 + np.clip((sample(slope_deg,x,y)-25)/20,0,1)*0.6)
zq3 = hmap(xq3, yq3)
for i in range(len(xq3)):
    ob = bpy.data.objects.new(f"r{i}", rocks[i%2].data)
    ob.location = (float(xq3[i]), float(yq3[i]), float(zq3[i])-0.4)
    ob.rotation_euler = (0,0,float(rng.uniform(0,6.28))); s = float(rng.uniform(0.5,2.4)); ob.scale = (s,s,s*0.8)
    bpy.context.collection.objects.link(ob)
print("rocks", len(xq3))

for t, _ in trees: t.location = (0,0,-9000)
for sh in shrubs: sh.location = (0,0,-9000)
for rk in rocks: rk.location = (0,0,-9000)

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True,
    export_gpu_instances=True, export_yup=True, export_image_format='AUTO',
    export_jpeg_quality=90, export_animations=False, export_skins=False, export_morph=False)
print("glb", round(os.path.getsize(OUT)/1e6,1), "MB | total", round(time.time()-t0,1), "s")

meta = json.load(open(os.path.join(CACHE, "meta_v3.json")))
meta["trees"] = int(NT); meta["under"] = int(len(xq2)); meta["rocks"] = int(len(xq3))
json.dump(meta, open(os.path.join(PROJ, "assets", "models", "gp_terrain_real.json"), "w"), indent=2)
print("meta written")
