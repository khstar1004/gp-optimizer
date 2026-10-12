# v5: 한국 수종(소나무·참나무) 실물 모델 + 3km GP 정밀지형
import bpy, os, json, random, time, math
import numpy as np
from mathutils import Vector, Matrix

CACHE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(os.path.dirname(CACHE))
VEG = r"C:/Users/USER/Desktop/ufs-physical-ai-operations-repo/public/assets/3d-bundles/vegetation/models"
OUT = os.path.join(PROJ, "assets", "models", "gp_terrain_real_raw.glb")
t0 = time.time()
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

def import_norm(path, target_h, name):
    before = set(o.name for o in bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new_names = [o.name for o in bpy.data.objects if o.name not in before]
    mesh_names = [n for n in new_names if bpy.data.objects[n].type == 'MESH']
    for n in mesh_names:
        o = bpy.data.objects[n]; o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4)
    for n in new_names:
        if n not in mesh_names and n in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for n in mesh_names: bpy.data.objects[n].select_set(True)
    ob = bpy.data.objects[mesh_names[0]]; bpy.context.view_layer.objects.active = ob
    if len(mesh_names) > 1:
        bpy.ops.object.join(); ob = bpy.context.view_layer.objects.active
    me = ob.data
    co = np.empty(len(me.vertices)*3, dtype=np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1,3)
    mn = co.min(0); mx = co.max(0); d = mx-mn
    # 진짜 누워있을 때만 세움 (수관이 높이보다 넓은 활엽수를 잘못 눕히지 않도록 엄격 임계)
    if d[2] < 0.35 * max(d[0], d[1]):
        if d[0] >= d[1]: me.transform(Matrix.Rotation(math.radians(90),4,'Y'))
        else: me.transform(Matrix.Rotation(math.radians(90),4,'X'))
        co = np.empty(len(me.vertices)*3, dtype=np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1,3)
        mn = co.min(0); mx = co.max(0); d = mx-mn
    sc = target_h/d[2] if d[2] > 0 else 1.0
    me.transform(Matrix.Diagonal((sc,sc,sc,1.0)))
    co = np.empty(len(me.vertices)*3, dtype=np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1,3)
    mn = co.min(0); mx = co.max(0)
    me.transform(Matrix.Translation((-(mn[0]+mx[0])/2, -(mn[1]+mx[1])/2, -mn[2])))
    ob.location = (0,0,-9000); ob.rotation_euler=(0,0,0); ob.scale=(1,1,1); ob.name = name
    print(name, "tris", sum(len(p.vertices)-2 for p in me.polygons), "h", round(target_h,1))
    return ob

def decim(ob, tgt):
    cur = sum(len(p.vertices)-2 for p in ob.data.polygons)
    if cur <= tgt: return
    md = ob.modifiers.new("d", 'DECIMATE'); md.ratio = tgt/cur
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier="d")
    print(ob.name, "->", sum(len(p.vertices)-2 for p in ob.data.polygons))

# ── 실사 텍스처 나무 (성능 최적화: _far LOD = 730~950tri, 항공/중거리 목표뷰에 충분) ──
pineScan = import_norm(os.path.join(VEG, "tree_pineScanA_far.glb"), 13.0, "PineScan")  # 실사 소나무 LOD
leafyA   = import_norm(os.path.join(VEG, "tree_leafyA_far.glb"),    11.0, "LeafyA")    # 실사 활엽 LOD
leafyB   = import_norm(os.path.join(VEG, "tree_leafyB_far.glb"),    10.0, "LeafyB")
leafyC   = import_norm(os.path.join(VEG, "tree_leafyC_far.glb"),     9.5, "LeafyC")
# _far는 이미 저폴리 LOD라 데시메이트 불필요

# ── 관측점 근접 반경 전용 고폴리 나무 (2026-09-07: 도보 근접에서 _far가 카드보드처럼
# 보인다는 리포트 — _far는 같은 스캔을 데시메이트해 만든 것이라 원본(비-_far, ~5000
# ~5600tri)이 그대로 남아 있다. 새 에셋 없이, 원점(관측탑 반경) 근처 인스턴스만
# 이 세트로 그려 근접 사실감을 올린다. GPU 인스턴싱이라 파일 크기엔 이 4종 지오메트리
# (~2만tri 합계)만 더해지고, 인스턴스별 트라이앵글 수는 늘지 않는다.
NEAR_RADIUS_M = 320.0
pineScanNear = import_norm(os.path.join(VEG, "tree_pineScanA.glb"), 13.0, "PineScanNear")
leafyANear   = import_norm(os.path.join(VEG, "tree_leafyA.glb"),    11.0, "LeafyANear")
leafyBNear   = import_norm(os.path.join(VEG, "tree_leafyB.glb"),    10.0, "LeafyBNear")
leafyCNear   = import_norm(os.path.join(VEG, "tree_leafyC.glb"),     9.5, "LeafyCNear")

def deglare(ob):
    """잎 광택 제거: 러프니스 최대 + 스페큘러/메탈/시인 0 (하얗게 빛나는 것 방지)"""
    for m in ob.data.materials:
        if not m or not m.use_nodes: continue
        for n in m.node_tree.nodes:
            if n.type != 'BSDF_PRINCIPLED': continue
            for k, val in [("Roughness",1.0),("Specular IOR Level",0.0),("Specular",0.0),
                           ("Metallic",0.0),("Sheen Weight",0.0),("Coat Weight",0.0),
                           ("Emission Strength",0.0)]:
                if k in n.inputs:
                    try: n.inputs[k].default_value = val
                    except: pass
            # 러프니스에 텍스처가 연결돼 있으면 끊고 무광 고정
            if "Roughness" in n.inputs and n.inputs["Roughness"].is_linked:
                for l in list(n.inputs["Roughness"].links): m.node_tree.links.remove(l)
                n.inputs["Roughness"].default_value = 1.0
for sp in (pineScan, leafyA, leafyB, leafyC, pineScanNear, leafyANear, leafyBNear, leafyCNear): deglare(sp)
# 소나무 우세 혼효림 (능선 소나무 55% + 활엽 45%)
species = [(pineScan, 0.55), (leafyA, 0.16), (leafyB, 0.15), (leafyC, 0.14)]
# 근접 반경용 — species와 같은 순서·비율, 지오메트리만 고폴리로 교체
speciesNear = [pineScanNear, leafyANear, leafyBNear, leafyCNear]

# ── 실물 바위 (능선·급경사 노출암) ──
ETC = r"C:/Users/USER/Desktop/ufs-physical-ai-operations-repo/public/assets/3d-bundles/etc"
rockA = import_norm(os.path.join(ETC, "big_stones.glb"), 2.4, "RockA")      # 돌무더기
rockB = import_norm(os.path.join(ETC, "gray_big_rock.glb"), 3.2, "RockB")   # 큰 바위
decim(rockB, 2500)
for rk in (rockA, rockB): deglare(rk)
rocks = [rockA, rockB]

# ── 사용자 제공 실사 그래스 (Megascans Graminea, 4K PBR) ──
USD = r"C:/Users/USER/orca/projects/gp-optimizer/assets/models/usd/graminea01_additional_files"
def import_grass():
    before = set(o.name for o in bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=os.path.join(USD, "Graminea01_lod1.obj"))
    names = [o.name for o in bpy.data.objects if o.name not in before]
    for n in names:
        o = bpy.data.objects[n]; o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4)
    ob = bpy.data.objects[names[0]]; me = ob.data
    co = np.empty(len(me.vertices)*3, dtype=np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1,3)
    mn = co.min(0); mx = co.max(0); d = mx-mn
    vax = int(np.argmax(d))                       # 가장 긴 축 = 높이
    if vax == 0: me.transform(Matrix.Rotation(math.radians(90),4,'Y'))
    elif vax == 1: me.transform(Matrix.Rotation(math.radians(-90),4,'X'))
    co = np.empty(len(me.vertices)*3, dtype=np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1,3)
    mn = co.min(0); mx = co.max(0); d = mx-mn
    sc = 0.55/d[2] if d[2] > 0 else 1.0           # 실제 풀 높이 ~55cm
    me.transform(Matrix.Diagonal((sc,sc,sc,1.0)))
    co = np.empty(len(me.vertices)*3, dtype=np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1,3)
    mn = co.min(0); mx = co.max(0)
    me.transform(Matrix.Translation((-(mn[0]+mx[0])/2, -(mn[1]+mx[1])/2, -mn[2])))
    # 4K PBR 재질 (색+노멀+거칠기+알파MASK)
    m = bpy.data.materials.new("GrassMat"); m.use_nodes = True; nt2 = m.node_tree
    b = nt2.nodes["Principled BSDF"]
    tc = nt2.nodes.new("ShaderNodeTexImage"); tc.image = bpy.data.images.load(os.path.join(USD, "TX_Graminea01_4K_C.jpg"))
    nt2.links.new(tc.outputs["Color"], b.inputs["Base Color"])
    tm = nt2.nodes.new("ShaderNodeTexImage"); tm.image = bpy.data.images.load(os.path.join(USD, "TX_Graminea01_4K_MASK.jpg"))
    tm.image.colorspace_settings.name = "Non-Color"
    nt2.links.new(tm.outputs["Color"], b.inputs["Alpha"])
    tn = nt2.nodes.new("ShaderNodeTexImage"); tn.image = bpy.data.images.load(os.path.join(USD, "TX_Graminea01_4K_N.jpg"))
    tn.image.colorspace_settings.name = "Non-Color"
    nm = nt2.nodes.new("ShaderNodeNormalMap"); nt2.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt2.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 1.0
    for k in ("Specular IOR Level","Specular","Metallic","Sheen Weight"):
        if k in b.inputs:
            try: b.inputs[k].default_value = 0.0
            except: pass
    m.blend_method = 'CLIP'; m.alpha_threshold = 0.5
    try: m.use_backface_culling = False
    except: pass
    me.materials.clear(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    ob.location = (0,0,-9000); ob.name = "Grass"
    print("Grass tris", sum(len(p.vertices)-2 for p in me.polygons))
    return ob
grass = import_grass()

# ── 지형 메시 (해상도·크기 메타 기반) ──
_meta = json.load(open(os.path.join(CACHE, "meta_v3.json")))
Hc = np.load(os.path.join(CACHE, "dem_v3.npy")); S = Hc.shape[0]; SIZE = float(_meta["sizeMeters"])
ZMIN = float(Hc.min()); ZZ = (Hc-ZMIN).astype(np.float32)
xs = np.linspace(-SIZE/2, SIZE/2, S, dtype=np.float32); ys = np.linspace(SIZE/2, -SIZE/2, S, dtype=np.float32)
XX, YY = np.meshgrid(xs, ys); coords = np.stack([XX,YY,ZZ],-1).reshape(-1,3)
r = np.arange(S-1); RR, CC = np.meshgrid(r, r, indexing="ij"); i0 = RR*S+CC
quads = np.stack([i0, i0+S, i0+S+1, i0+1], -1).reshape(-1,4)
me = bpy.data.meshes.new("Terrain"); me.vertices.add(S*S); me.vertices.foreach_set("co", coords.ravel())
nf = quads.shape[0]; me.loops.add(nf*4); me.polygons.add(nf)
me.polygons.foreach_set("loop_start", (np.arange(nf)*4).astype(np.int32))
me.loops.foreach_set("vertex_index", quads.ravel().astype(np.int32)); me.update(calc_edges=True); me.validate()
uvl = me.uv_layers.new(name="UVMap"); u = (coords[:,0]+SIZE/2)/SIZE; v = (coords[:,1]+SIZE/2)/SIZE
uvco = np.stack([u,v],-1); vi = np.zeros(nf*4, dtype=np.int32); me.loops.foreach_get("vertex_index", vi)
uvl.data.foreach_set("uv", uvco[vi].ravel()); me.polygons.foreach_set("use_smooth", np.ones(nf,dtype=bool)); me.update()
mat = bpy.data.materials.new("TerrainMat"); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]; bsdf.inputs["Roughness"].default_value = 0.95
tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(os.path.join(CACHE, "albedo_v3.jpg"))
nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
ntex = nt.nodes.new("ShaderNodeTexImage"); ntex.image = bpy.data.images.load(os.path.join(CACHE, "normal_v3.jpg"))
ntex.image.colorspace_settings.name = "Non-Color"
nmap = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"]); me.materials.append(mat)
tob = bpy.data.objects.new("Terrain", me); bpy.context.collection.objects.link(tob)
print("terrain", round(time.time()-t0,1))

forest = np.load(os.path.join(CACHE, "forest_v3.npy")); roadm = np.load(os.path.join(CACHE, "road_v3.npy"))
openm = np.load(os.path.join(CACHE, "open_v3.npy"))
def sample(a, xq, yq):
    c = np.clip(((xq+SIZE/2)/SIZE*(a.shape[1]-1)).astype(int),0,a.shape[1]-1)
    rr_ = np.clip(((SIZE/2-yq)/SIZE*(a.shape[0]-1)).astype(int),0,a.shape[0]-1); return a[rr_,c]
def hmap(xq, yq):
    c = np.clip((xq+SIZE/2)/SIZE*(S-1),0,S-1.001); rr_=np.clip((SIZE/2-yq)/SIZE*(S-1),0,S-1.001)
    r0=rr_.astype(int); c0=c.astype(int); tr=rr_-r0; tc=c-c0
    return (ZZ[r0,c0]*(1-tr)*(1-tc)+ZZ[r0,c0+1]*(1-tr)*tc+ZZ[r0+1,c0]*tr*(1-tc)+ZZ[r0+1,c0+1]*tr*tc)
cell = SIZE/(S-1); gy_, gx_ = np.gradient(ZZ, cell); slope_deg = np.degrees(np.arctan(np.hypot(gx_,gy_)))

# ── 실제 3D 도로 리본 (사진 박제 아닌 별도 지오메트리 + 흙 재질) ──
def build_roads():
    roads = json.load(open(os.path.join(CACHE, "roads_v3.json")))
    WIDTH = 4.4; LIFT = 0.2; TILE = 11.0     # 폭 4.4m(뮤트영역 덮음), 지형 위 0.2m, 11m마다 텍스처 반복
    verts = []; faces = []; uvs = []
    for pl in roads:
        P = np.array(pl, dtype=np.float64)
        if len(P) < 2: continue
        # 세그먼트 리샘플(완만한 곡선) — 6m 간격
        rs = [P[0]]
        for i in range(len(P)-1):
            a, b2 = P[i], P[i+1]; seg = np.hypot(*(b2-a)); nstep = max(1, int(seg/6))
            for k in range(1, nstep+1): rs.append(a + (b2-a)*k/nstep)
        P = np.array(rs)
        n = len(P)
        # 접선/법선
        tang = np.zeros_like(P)
        tang[1:-1] = P[2:]-P[:-2]; tang[0]=P[1]-P[0]; tang[-1]=P[-1]-P[-2]
        tl = np.hypot(tang[:,0],tang[:,1])[:,None]+1e-9; tang/=tl
        perp = np.stack([-tang[:,1], tang[:,0]], 1)
        base = len(verts); dist = 0.0
        for i in range(n):
            if i>0: dist += np.hypot(*(P[i]-P[i-1]))
            for side,vv in ((-1,0.0),(1,1.0)):
                x = P[i,0]+perp[i,0]*side*WIDTH/2; y = P[i,1]+perp[i,1]*side*WIDTH/2
                z = float(hmap(np.array([x]),np.array([y]))[0]) + LIFT
                verts.append((x,y,z)); uvs.append((dist/TILE, vv))
        for i in range(n-1):
            a=base+i*2; b2=a+1; c=a+2; d=a+3
            faces.append((a,b2,d,c))
    if not verts: return None
    m = bpy.data.meshes.new("Roads")
    m.from_pydata(verts, [], faces); m.update()
    uvl = m.uv_layers.new(name="UVMap")
    loop_uv = []
    for p in m.polygons:
        for li in p.loop_indices:
            loop_uv.append(uvs[m.loops[li].vertex_index])
    uvl.data.foreach_set("uv", np.array(loop_uv, dtype=np.float32).ravel())
    for p in m.polygons: p.use_smooth = True
    rmat = bpy.data.materials.new("RoadMat"); rmat.use_nodes = True
    rnt = rmat.node_tree; rb = rnt.nodes["Principled BSDF"]
    rb.inputs["Roughness"].default_value = 1.0
    for k in ("Specular IOR Level","Specular","Metallic","Sheen Weight"):
        if k in rb.inputs:
            try: rb.inputs[k].default_value = 0.0
            except: pass
    rtc = rnt.nodes.new("ShaderNodeTexImage"); rtc.image = bpy.data.images.load(os.path.join(CACHE,"road_albedo.jpg"))
    rnt.links.new(rtc.outputs["Color"], rb.inputs["Base Color"])
    rtn = rnt.nodes.new("ShaderNodeTexImage"); rtn.image = bpy.data.images.load(os.path.join(CACHE,"road_normal.jpg"))
    rtn.image.colorspace_settings.name = "Non-Color"
    rnm = rnt.nodes.new("ShaderNodeNormalMap"); rnm.inputs["Strength"].default_value = 1.2
    rnt.links.new(rtn.outputs["Color"], rnm.inputs["Color"]); rnt.links.new(rnm.outputs["Normal"], rb.inputs["Normal"])
    m.materials.append(rmat)
    rob = bpy.data.objects.new("Roads", m); bpy.context.collection.objects.link(rob)
    print("roads ribbon:", len(roads), "polylines,", len(verts), "verts")
    return rob
build_roads()

rng = np.random.default_rng(2028)
def scatter(N, over, wf):
    n = N*over; xq = rng.uniform(-SIZE/2,SIZE/2,n); yq = rng.uniform(-SIZE/2,SIZE/2,n)
    w = wf(xq,yq); keep = rng.uniform(0,1,n) < w; xq,yq = xq[keep],yq[keep]
    if len(xq) > N: s = rng.choice(len(xq),N,replace=False); xq,yq = xq[s],yq[s]
    return xq,yq

# 군집 노이즈(그로브 형성) — 저주파 밸류노이즈, ~130m 그로브
_ncell = max(8, int(SIZE/130))
_cn = rng.random((_ncell+2, _ncell+2)).astype(np.float32)
def cluster(xq, yq, power=1.3):
    gu = (xq+SIZE/2)/SIZE*_ncell; gv = (SIZE/2-yq)/SIZE*_ncell
    u0 = np.clip(gu.astype(int),0,_ncell); v0 = np.clip(gv.astype(int),0,_ncell)
    u1 = np.minimum(u0+1,_ncell+1); v1 = np.minimum(v0+1,_ncell+1)
    tu = gu-u0; tv = gv-v0
    c = (_cn[v0,u0]*(1-tu)*(1-tv)+_cn[v0,u1]*tu*(1-tv)+_cn[v1,u0]*(1-tu)*tv+_cn[v1,u1]*tu*tv)
    return np.clip(c*1.4-0.15, 0, 1)**power

# 나무 13만 (5km, 소나무 우세 혼효림, _far LOD로 경량화)
xq, yq = scatter(130000, 7, lambda x,y: sample(forest,x,y)*(sample(roadm,x,y)<0.12)*(sample(openm,x,y)<0.25)*(sample(slope_deg,x,y)<45)*cluster(x,y))
zq = hmap(xq, yq); NT = len(xq); print("trees", NT)
probs = np.array([s[1] for s in species]); probs/=probs.sum()
pick = rng.choice(len(species), NT, p=probs)
rots = rng.uniform(0,6.28318,NT); scls = rng.uniform(0.72,1.4,NT)
col = bpy.data.collections.new("Trees"); bpy.context.scene.collection.children.link(col)
distC = np.hypot(xq, yq)   # 원점(관측탑 반경) 근접 여부 — 그 안만 고폴리 세트로
t1 = time.time()
nNear = 0
for i in range(NT):
    if distC[i] < NEAR_RADIUS_M:
        src = speciesNear[pick[i]]; nNear += 1
    else:
        src = species[pick[i]][0]
    ob = bpy.data.objects.new(f"t{i}", src.data)
    ob.location = (float(xq[i]), float(yq[i]), float(zq[i])-0.6)  # 밑동 매립(부유 방지)
    ob.rotation_euler = (0,0,float(rots[i])); s=float(scls[i]); ob.scale=(s,s,s)
    col.objects.link(ob)
print("trees linked", round(time.time()-t1,1), "| near-LOD:", nNear, f"(<{NEAR_RADIUS_M:.0f}m)")

# ── 그래스 산포: 개활지 + 숲 바닥(도로변), 4.5만 클럼프 ──
gx, gy = scatter(45000, 6, lambda x,y: np.clip(sample(openm,x,y)*1.6 + (sample(roadm,x,y)>0.05)*0.5, 0, 1)*(sample(slope_deg,x,y)<34))
gz = hmap(gx, gy)
gcol = bpy.data.collections.new("Grass"); bpy.context.scene.collection.children.link(gcol)
for i in range(len(gx)):
    ob = bpy.data.objects.new(f"gr{i}", grass.data)
    ob.location = (float(gx[i]), float(gy[i]), float(gz[i])-0.05)
    ob.rotation_euler = (0,0,float(rng.uniform(0,6.28))); s=float(rng.uniform(0.7,1.6)); ob.scale=(s,s,s)
    gcol.objects.link(ob)
print("grass", len(gx))

# ── 바위 산포: 급경사·능선 노출암 (군집), 도로 밖 ──
rx, ry = scatter(1100, 10, lambda x,y: np.clip((sample(slope_deg,x,y)-22)/18,0,1)*(sample(roadm,x,y)<0.2)*(0.4+0.6*cluster(x,y,2.0)))
rz = hmap(rx, ry)
rcol = bpy.data.collections.new("Rocks"); bpy.context.scene.collection.children.link(rcol)
for i in range(len(rx)):
    src = rocks[i % 2]
    ob = bpy.data.objects.new(f"rk{i}", src.data)
    ob.location = (float(rx[i]), float(ry[i]), float(rz[i])-0.5)
    ob.rotation_euler = (float(rng.uniform(-0.2,0.2)),float(rng.uniform(-0.2,0.2)),float(rng.uniform(0,6.28)))
    s=float(rng.uniform(0.6,2.0)); ob.scale=(s,s,s*float(rng.uniform(0.7,1.0)))
    rcol.objects.link(ob)
print("rocks", len(rx))

for sp,_ in species: sp.location=(0,0,-9000)
for sp in speciesNear: sp.location=(0,0,-9000)
grass.location=(0,0,-9000)
for rk in rocks: rk.location=(0,0,-9000)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True,
    export_gpu_instances=True, export_yup=True, export_image_format='AUTO',
    export_jpeg_quality=90, export_animations=False, export_skins=False, export_morph=False)
print("glb", round(os.path.getsize(OUT)/1e6,1), "MB | total", round(time.time()-t0,1), "s")
meta = json.load(open(os.path.join(CACHE, "meta_v3.json")))
meta["trees"] = int(NT); meta["real_models"] = True; meta["species"] = "korean_pine_oak"
json.dump(meta, open(os.path.join(PROJ, "assets", "models", "gp_terrain_real.json"), "w"), indent=2)
print("meta written")
