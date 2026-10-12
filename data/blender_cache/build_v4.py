# v4: 실물 나무 GLB(pine_tree/tree) 인스턴싱 + 1km GP 정밀지형
import bpy, os, json, random, time, math
import numpy as np
from mathutils import Vector

CACHE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(os.path.dirname(CACHE))
REPO = r"C:/Users/USER/Desktop/ufs-physical-ai-operations-repo/public/assets/3d-bundles/etc"
OUT = os.path.join(PROJ, "assets", "models", "gp_terrain_real_raw.glb")
t0 = time.time()

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

# ── 실물 나무 임포트 → 정규화(직립 Z, 밑동 z=0, 목표 높이) ──
from mathutils import Matrix
def import_norm(path, target_h, name):
    before = set(o.name for o in bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new_names = [o.name for o in bpy.data.objects if o.name not in before]
    mesh_names = [n for n in new_names if bpy.data.objects[n].type == 'MESH']
    # 각 메시에 월드행렬을 굽고 단위행렬화 (Sketchfab 계층 회전 흡수)
    bmesh_list = []
    for n in mesh_names:
        o = bpy.data.objects[n]
        o.data.transform(o.matrix_world)
        o.matrix_world = Matrix.Identity(4)
        bmesh_list.append(n)
    # empties 등 비메시 제거
    for n in new_names:
        if n not in mesh_names and n in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
    # 합치기
    bpy.ops.object.select_all(action='DESELECT')
    for n in bmesh_list:
        bpy.data.objects[n].select_set(True)
    ob = bpy.data.objects[bmesh_list[0]]
    bpy.context.view_layer.objects.active = ob
    if len(bmesh_list) > 1:
        bpy.ops.object.join()
        ob = bpy.context.view_layer.objects.active
    me = ob.data
    # bbox
    co = np.empty(len(me.vertices)*3, dtype=np.float32); me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    mn = co.min(0); mx = co.max(0); d = mx - mn
    # 최장축 세로로
    if d[2] < d[0] or d[2] < d[1]:
        if d[0] >= d[1]: me.transform(Matrix.Rotation(math.radians(90), 4, 'Y'))
        else: me.transform(Matrix.Rotation(math.radians(90), 4, 'X'))
        co = np.empty(len(me.vertices)*3, dtype=np.float32); me.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3); mn = co.min(0); mx = co.max(0); d = mx - mn
    sc = target_h / d[2] if d[2] > 0 else 1.0
    me.transform(Matrix.Diagonal((sc, sc, sc, 1.0)))
    co = np.empty(len(me.vertices)*3, dtype=np.float32); me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3); mn = co.min(0); mx = co.max(0)
    me.transform(Matrix.Translation((-(mn[0]+mx[0])/2, -(mn[1]+mx[1])/2, -mn[2])))
    ob.location = (0, 0, -9000); ob.rotation_euler = (0, 0, 0); ob.scale = (1, 1, 1)
    ob.name = name
    print(name, "tris", sum(len(p.vertices)-2 for p in me.polygons), "h", round(target_h,1))
    return ob

def decimate(ob, target_tris):
    cur = sum(len(p.vertices)-2 for p in ob.data.polygons)
    if cur <= target_tris: return
    md = ob.modifiers.new("dec", 'DECIMATE'); md.ratio = target_tris / cur
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier="dec")
    print(ob.name, "decimated ->", sum(len(p.vertices)-2 for p in ob.data.polygons))

pine = import_norm(os.path.join(REPO, "pine_tree.glb"), 12.0, "PineReal")
broad = import_norm(os.path.join(REPO, "tree.glb"), 9.5, "BroadReal")
grass = import_norm(os.path.join(REPO, "grass_02.glb"), 0.6, "GrassReal")
decimate(pine, 3200)
decimate(broad, 4500)
species = [(pine, 0.72), (broad, 0.28)]

# ── 지형 메시 1024² (v3 데이터) ──
Hc = np.load(os.path.join(CACHE, "dem_v3.npy"))
S = Hc.shape[0]; SIZE = 1000.0; ZMIN = float(Hc.min()); ZZ = (Hc-ZMIN).astype(np.float32)
xs = np.linspace(-SIZE/2, SIZE/2, S, dtype=np.float32)
ys = np.linspace(SIZE/2, -SIZE/2, S, dtype=np.float32)
XX, YY = np.meshgrid(xs, ys)
coords = np.stack([XX, YY, ZZ], -1).reshape(-1, 3)
r = np.arange(S-1); RR, CC = np.meshgrid(r, r, indexing="ij")
i0 = RR*S+CC; quads = np.stack([i0, i0+S, i0+S+1, i0+1], -1).reshape(-1, 4)
me = bpy.data.meshes.new("Terrain")
me.vertices.add(S*S); me.vertices.foreach_set("co", coords.ravel())
nf = quads.shape[0]; me.loops.add(nf*4); me.polygons.add(nf)
me.polygons.foreach_set("loop_start", (np.arange(nf)*4).astype(np.int32))
me.loops.foreach_set("vertex_index", quads.ravel().astype(np.int32))
me.update(calc_edges=True); me.validate()
uvl = me.uv_layers.new(name="UVMap")
u = (coords[:,0]+SIZE/2)/SIZE; v = (coords[:,1]+SIZE/2)/SIZE
uvco = np.stack([u, v], -1); vi = np.zeros(nf*4, dtype=np.int32)
me.loops.foreach_get("vertex_index", vi); uvl.data.foreach_set("uv", uvco[vi].ravel())
me.polygons.foreach_set("use_smooth", np.ones(nf, dtype=bool)); me.update()
mat = bpy.data.materials.new("TerrainMat"); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]; bsdf.inputs["Roughness"].default_value = 0.95
tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(os.path.join(CACHE, "albedo_v3.jpg"))
nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
ntex = nt.nodes.new("ShaderNodeTexImage"); ntex.image = bpy.data.images.load(os.path.join(CACHE, "normal_v3.jpg"))
ntex.image.colorspace_settings.name = "Non-Color"
nmap = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
me.materials.append(mat)
tob = bpy.data.objects.new("Terrain", me); bpy.context.collection.objects.link(tob)
print("terrain", round(time.time()-t0,1))

# ── 산포 ──
forest = np.load(os.path.join(CACHE, "forest_v3.npy"))
roadm = np.load(os.path.join(CACHE, "road_v3.npy"))
openm = np.load(os.path.join(CACHE, "open_v3.npy"))
def sample(a, xq, yq):
    c = np.clip(((xq+SIZE/2)/SIZE*(a.shape[1]-1)).astype(int), 0, a.shape[1]-1)
    rr_ = np.clip(((SIZE/2-yq)/SIZE*(a.shape[0]-1)).astype(int), 0, a.shape[0]-1)
    return a[rr_, c]
def hmap(xq, yq):
    c = np.clip((xq+SIZE/2)/SIZE*(S-1),0,S-1.001); rr_=np.clip((SIZE/2-yq)/SIZE*(S-1),0,S-1.001)
    r0=rr_.astype(int); c0=c.astype(int); tr=rr_-r0; tc=c-c0
    return (ZZ[r0,c0]*(1-tr)*(1-tc)+ZZ[r0,c0+1]*(1-tr)*tc+ZZ[r0+1,c0]*tr*(1-tc)+ZZ[r0+1,c0+1]*tr*tc)
cell = SIZE/(S-1); gy_, gx_ = np.gradient(ZZ, cell)
slope_deg = np.degrees(np.arctan(np.hypot(gx_, gy_)))
rng = np.random.default_rng(2027)
def scatter(N, over, wf):
    n = N*over; xq = rng.uniform(-SIZE/2,SIZE/2,n); yq = rng.uniform(-SIZE/2,SIZE/2,n)
    w = wf(xq, yq); keep = rng.uniform(0,1,n) < w; xq, yq = xq[keep], yq[keep]
    if len(xq) > N: s = rng.choice(len(xq), N, replace=False); xq, yq = xq[s], yq[s]
    return xq, yq

# 실물 나무 2.4만 (실물 폴리곤 성능 한계 내)
xq, yq = scatter(24000, 8, lambda x,y: sample(forest,x,y)*(sample(roadm,x,y)<0.1)*(sample(openm,x,y)<0.25)*(sample(slope_deg,x,y)<43))
zq = hmap(xq, yq); NT = len(xq); print("trees", NT)
probs = np.array([s[1] for s in species]); probs/=probs.sum()
pick = rng.choice(len(species), NT, p=probs)
rots = rng.uniform(0,6.28318,NT); scls = rng.uniform(0.7,1.4,NT)
col = bpy.data.collections.new("Trees"); bpy.context.scene.collection.children.link(col)
t1 = time.time()
for i in range(NT):
    ob = bpy.data.objects.new(f"t{i}", species[pick[i]][0].data)
    ob.location = (float(xq[i]), float(yq[i]), float(zq[i])-0.2)
    ob.rotation_euler = (0,0,float(rots[i])); s=float(scls[i]); ob.scale=(s,s,s)
    col.objects.link(ob)
print("trees linked", round(time.time()-t1,1))

# 실물 풀 2만 (개활지/숲 가장자리)
xq2, yq2 = scatter(20000, 6, lambda x,y: np.clip(sample(forest,x,y)*0.5 + sample(openm,x,y),0,1)*(sample(roadm,x,y)<0.3)*(sample(slope_deg,x,y)<40))
zq2 = hmap(xq2, yq2)
col2 = bpy.data.collections.new("Grass"); bpy.context.scene.collection.children.link(col2)
for i in range(len(xq2)):
    ob = bpy.data.objects.new(f"g{i}", grass.data)
    ob.location = (float(xq2[i]), float(yq2[i]), float(zq2[i]))
    ob.rotation_euler = (0,0,float(rng.uniform(0,6.28))); s=float(rng.uniform(0.6,1.8)); ob.scale=(s,s,s)
    col2.objects.link(ob)
print("grass", len(xq2))

for sp,_ in species: sp.location=(0,0,-9000)
grass.location=(0,0,-9000)

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True,
    export_gpu_instances=True, export_yup=True, export_image_format='AUTO',
    export_jpeg_quality=90, export_animations=False, export_skins=False, export_morph=False)
print("glb", round(os.path.getsize(OUT)/1e6,1), "MB | total", round(time.time()-t0,1), "s")
meta = json.load(open(os.path.join(CACHE, "meta_v3.json")))
meta["trees"] = int(NT); meta["grass"] = int(len(xq2)); meta["real_models"] = True
json.dump(meta, open(os.path.join(PROJ, "assets", "models", "gp_terrain_real.json"), "w"), indent=2)
print("meta written")
