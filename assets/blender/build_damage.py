# -*- coding: utf-8 -*-
"""
GP Digital Twin 시설 파손 3단계 셸 — 헤드리스 Blender 빌드
  blender --background --factory-startup --python build_damage.py

왜 필요한가
───────────
지금까지 피해 표현은 「원본 셸을 가라앉히고 기울이고 색을 섞는 것」이었다. 멀리서는
그럴듯하지만 가까이 가면 멀쩡한 건물이 땅에 반쯤 박혀 있을 뿐이다. **무너진 건물은
가라앉은 건물이 아니라 다른 모양의 물건**이다 — 벽이 뜯기고 슬래브가 꺾이고 철근이
삐져나온다. 그 모양을 따로 구워 두고 HP 구간에 따라 갈아 끼운다.

계약 (buildingModels.ts 와 반드시 일치)
───────────────────────────────────────
캐노니컬 **14(X) × 11(Y)** — 시설 셸(build_facilities3.py)과 같다. 런타임이 같은
sx = width/14, sy = depth/11 배율을 먹이므로 원본 셸과 자리가 정확히 맞는다.
원점 = 지면 중심, 정면 −Y.

  fac_dmg_light.glb  **오버레이** — 원본 셸 위에 덧댄다(원본은 그대로 보인다).
                     깨진 창·그을음·벽 파편·바닥 유리. 높이 ≈ 3.4 m (1 개 층에 붙는다)
  fac_dmg_heavy.glb  **대체** — 원본 main/floor/roof 를 감추고 이것을 쓴다.
                     두 면이 무너져 슬래브·기둥·철근이 드러난 반파 상태. 높이 ≈ 4.4 m
  fac_ruin.glb       **대체** — 완전 붕괴. 꺾인 슬래브 판과 콘크리트 덩어리 더미.
                     높이 ≈ 2.8 m

검증 렌더: assets/blender/render_dmg_a.png / _b
"""
import bpy, bmesh, math, os, sys, traceback
import numpy as np
import mathutils

OUT = r'C:\Users\USER\orca\projects\gp-optimizer\assets\models'
RND = r'C:\Users\USER\orca\projects\gp-optimizer\assets\blender'

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

LEN, DEP, H = 14.0, 11.0, 3.2          # 캐노니컬 (build_facilities3.py 와 동일)
WL, WD = LEN - 0.6, DEP - 0.6
UV_TILE = 2.0
N = 256
rng_global = np.random.default_rng(20260907)

# ═══════════════════ 텍스처 ═══════════════════
def srgb(hexs):
    h = hexs.lstrip('#')
    return tuple(((int(h[i:i + 2], 16) / 255.0) ** 2.2) for i in (0, 2, 4))

def _smooth(g, it=2):
    for _ in range(it):
        g = (g + np.roll(g, 1, 0) + np.roll(g, -1, 0) + np.roll(g, 1, 1) + np.roll(g, -1, 1)) / 5
    return g

def noise2d(n, octaves=(4, 16, 64), seed=1, persist=0.55):
    rng = np.random.default_rng(seed)
    acc = np.zeros((n, n), dtype=np.float32)
    amp, tot = 1.0, 0.0
    for o in octaves:
        o = max(2, min(o, n))
        g = _smooth(rng.random((o, o)).astype(np.float32), 2)
        acc += amp * np.kron(g, np.ones((n // o + 1, n // o + 1), dtype=np.float32))[:n, :n]
        tot += amp
        amp *= persist
    acc /= tot
    acc -= acc.min()
    return acc / max(1e-6, acc.max())

def pack_image(name, arr, non_color=False):
    im = bpy.data.images.new(name, arr.shape[1], arr.shape[0], alpha=True, float_buffer=non_color)
    if non_color:
        im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(np.ascontiguousarray(arr[::-1], dtype=np.float32).ravel())
    im.pack()
    return im

def to_rgba(rgb, a=1.0):
    out = np.zeros((*rgb.shape[:2], 4), dtype=np.float32)
    out[..., :3] = rgb
    out[..., 3] = a
    return out

def _half(a):
    return a[::2, ::2] if a is not None and a.ndim == 2 and a.shape[0] > 128 else a

def orm_map(name, rough, metal=None, ao=None):
    rough, metal, ao = _half(rough), _half(metal), _half(ao)
    n = rough.shape[0]
    img = np.zeros((n, n, 4), dtype=np.float32)
    img[..., 0] = 1.0 if ao is None else ao
    img[..., 1] = rough
    img[..., 2] = 0.0 if metal is None else metal
    img[..., 3] = 1.0
    return pack_image(name, img, non_color=True)

def normal_map(name, height, strength=1.6):
    h = _half(height).astype(np.float32)
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    nx, ny = -gx * strength * h.shape[0] / 64.0, -gy * strength * h.shape[0] / 64.0
    nz = np.ones_like(h)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    img = np.zeros((*h.shape, 4), dtype=np.float32)
    img[..., 0] = nx / ln * 0.5 + 0.5
    img[..., 1] = ny / ln * 0.5 + 0.5
    img[..., 2] = nz / ln * 0.5 + 0.5
    img[..., 3] = 1.0
    return pack_image(name, img, non_color=True)

def tex_broken_concrete():
    """부서진 콘크리트 — 골재가 드러나고 그을음이 얼룩진 파단면.

    PolyHaven 실사 콘크리트를 여기 적용해봤지만 기각했다: 이 메시는 잘게 쪼개진
    파단면(smart_project 아일랜드가 조각마다 제각각 회전)이라, 사진 텍스처의 방향성
    있는 거푸집 결이 조각마다 다른 각도로 잘려 보이며 세로 줄무늬로 뭉친다 — 등방성
    노이즈라 방향이 없는 절차적 텍스처만 이 지오메트리에 안전하다. facilities3 의
    평평한 벽면과는 다른 케이스이므로 그쪽만 PBR을 쓴다.
    """
    f = noise2d(N, (8, 32, 128), seed=61)
    agg = (np.random.default_rng(62).random((N, N)) > 0.986).astype(np.float32)
    agg = _smooth(agg, 1) * 3.0
    # 그을음을 너무 넓게 깔면 잔해가 「검은 얼룩」 한 덩어리로 뭉개진다 — 실제로
    # 지도 위에서 그렇게 보였다. 파단면의 밝은 골재가 살아 있어야 잔해로 읽힌다.
    soot = np.clip(noise2d(N, (4, 8, 16), seed=63) - 0.62, 0, 1) * 1.6
    base = np.array(srgb('#b3ada3'), dtype=np.float32)
    dark = np.array(srgb('#2a2621'), dtype=np.float32)
    rgb = base[None, None, :] * (0.78 + 0.42 * f + 0.55 * agg)[..., None]
    rgb = rgb * (1 - soot[..., None] * 0.65) + dark[None, None, :] * (soot * 0.65)[..., None]
    rough = np.clip(0.9 + 0.1 * f - 0.2 * agg, 0.35, 1.0)
    return (pack_image('td_conc', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('td_conc_orm', rough),
            normal_map('td_conc_nrm', f * 0.6 + agg * 0.8, 2.4))

def tex_scorch_wall():
    """그을음 — 개구부 위로 번지는 검댕. 알파가 있는 오버레이용."""
    n = 128
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    f = noise2d(n, (4, 16, 64), seed=71)
    # 위로 갈수록 진해지는 화염 자국 (오버레이는 타일링하지 않으므로 방향성을 넣어도 된다)
    up = np.clip((yy / n) ** 0.8, 0, 1)
    a = np.clip((0.2 + 0.8 * up) * (0.3 + 0.85 * f) - 0.30, 0, 1) ** 1.5
    img = np.zeros((n, n, 4), dtype=np.float32)
    img[..., :3] = np.array(srgb('#17130f'), dtype=np.float32)[None, None, :] * (0.5 + 0.6 * f)[..., None]
    img[..., 3] = a
    return pack_image('td_scorch', img)

def tex_rust_rebar():
    f = noise2d(64, (8, 32), seed=81)
    base = np.array(srgb('#6a4a30'), dtype=np.float32)
    rgb = base[None, None, :] * (0.7 + 0.6 * f)[..., None]
    return (pack_image('td_rebar', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('td_rebar_orm', np.clip(0.75 + 0.2 * f, 0, 1), np.full((64, 64), 0.6, dtype=np.float32)),
            normal_map('td_rebar_nrm', f, 1.2))

def tex_glass():
    n = 64
    f = noise2d(n, (16, 32), seed=91)
    base = np.array(srgb('#8fb6c4'), dtype=np.float32)
    rgb = base[None, None, :] * (0.6 + 0.7 * f)[..., None]
    return pack_image('td_glass', to_rgba(np.clip(rgb, 0, 1), 0.75))

# ═══════════════════ 재질 ═══════════════════
def _bsdf(m):
    return m.node_tree.nodes['Principled BSDF']

def mk_mat(name, color, metallic=0.0, rough=0.7, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = _bsdf(m)
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    b.inputs['Alpha'].default_value = alpha
    if alpha < 1.0:
        for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    return m

def pbr_mat(name, pack, alpha=1.0):
    base, orm, nrm = pack
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = _bsdf(m)
    tb = nt.nodes.new('ShaderNodeTexImage'); tb.image = base; tb.location = (-700, 300)
    nt.links.new(tb.outputs['Color'], b.inputs['Base Color'])
    to = nt.nodes.new('ShaderNodeTexImage'); to.image = orm; to.location = (-700, 0)
    sep = nt.nodes.new('ShaderNodeSeparateColor'); sep.location = (-420, 0)
    nt.links.new(to.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], b.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], b.inputs['Metallic'])
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nrm; tn.location = (-700, -320)
    nm = nt.nodes.new('ShaderNodeNormalMap'); nm.location = (-420, -320)
    nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m

def img_mat(name, img, alpha=True, rough=0.85):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = _bsdf(m)
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img; tx.location = (-500, 200)
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    if alpha:
        nt.links.new(tx.outputs['Alpha'], b.inputs['Alpha'])
        for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    return m

CONC = pbr_mat('md_conc', tex_broken_concrete())
REBAR = pbr_mat('md_rebar', tex_rust_rebar())
SCORCH = img_mat('md_scorch', tex_scorch_wall())
GLASS = img_mat('md_glass', tex_glass(), alpha=True, rough=0.15)
CHAR = mk_mat('md_char', srgb('#1d1a16'), 0.0, 0.92)
STEEL = mk_mat('md_steel', srgb('#55585c'), 0.85, 0.45)
DUSTM = mk_mat('md_dust', srgb('#8d8168'), 0.0, 0.98)

# ═══════════════════ 프리미티브 ═══════════════════
def _act(ob):
    bpy.context.view_layer.objects.active = ob
    return ob

def box(name, sx, sy, sz, x, y, z, mat, rx=0.0, ry=0.0, rz=0.0, bev=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z), rotation=(rx, ry, rz))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat)
    if bev > 0:
        _act(ob)
        md = ob.modifiers.new('bv', 'BEVEL')
        md.width, md.segments = bev, 2
        md.limit_method, md.angle_limit = 'ANGLE', math.radians(40)
        bpy.ops.object.modifier_apply(modifier=md.name)
    return ob

def cyl(name, r, depth, x, y, z, mat, verts=10, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth,
                                        location=(x, y, z), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    return ob

def plane(name, sx, sy, x, y, z, mat, rx=0.0, ry=0.0, rz=0.0):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, y, z), rotation=(rx, ry, rz))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (sx, sy, 1)
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat)
    return ob

def jagged_slab(name, sx, sy, thick, x, y, z, mat, rng, rx=0.0, ry=0.0, rz=0.0, teeth=7):
    """파단면이 톱니처럼 뜯긴 슬래브 판 — 붕괴 잔해의 주역."""
    ob = box(name, sx, sy, thick, x, y, z, mat, rx=rx, ry=ry, rz=rz)
    _act(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.subdivide(number_cuts=teeth)
    bpy.ops.object.mode_set(mode='OBJECT')
    # 가장자리 정점만 무작위로 물어뜯는다 (가운데는 평평하게 남긴다)
    me = ob.data
    hx, hy = sx / 2, sy / 2
    for v in me.vertices:
        lx, ly = v.co.x - x, v.co.y - y
        edge = max(abs(lx) / max(1e-6, hx), abs(ly) / max(1e-6, hy))
        if edge > 0.72:
            v.co.x += (rng.random() - 0.5) * sx * 0.16
            v.co.y += (rng.random() - 0.5) * sy * 0.16
            v.co.z += (rng.random() - 0.5) * thick * 1.4
    return ob

def join_as(objs, name):
    objs = [o for o in objs if o is not None]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    _act(objs[0])
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    return ob

def uv_world(ob, tile=UV_TILE):
    _act(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    try:
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.002,
                                 correct_aspect=True, scale_to_bounds=False)
    except TypeError:
        bpy.ops.uv.smart_project()
    bpy.ops.object.mode_set(mode='OBJECT')
    me = ob.data
    if not me.uv_layers:
        return ob
    bm = bmesh.new()
    bm.from_mesh(me)
    lay = bm.loops.layers.uv.active
    uv_area = geo_area = 0.0
    for f in bm.faces:
        geo_area += f.calc_area()
        loops = f.loops
        if len(loops) < 3:
            continue
        a, n = 0.0, len(loops)
        for i in range(n):
            p, q = loops[i][lay].uv, loops[(i + 1) % n][lay].uv
            a += p.x * q.y - q.x * p.y
        uv_area += abs(a) * 0.5
    if uv_area > 1e-9 and geo_area > 1e-9:
        k = (1.0 / tile) / math.sqrt(uv_area / geo_area)
        for f in bm.faces:
            for l in f.loops:
                l[lay].uv *= k
        bm.to_mesh(me)
    bm.free()
    return ob

def finish(ob, name, tile=UV_TILE, smooth_ang=38):
    uv_world(ob, tile)
    _act(ob)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(smooth_ang))
    except Exception:
        pass
    ob.name = name
    return ob

EXPORTED = []
def export_glb(ob, fname):
    path = os.path.join(OUT, fname)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    _act(ob)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB',
                              use_selection=True, export_apply=True)
    kb = os.path.getsize(path) // 1024
    EXPORTED.append((fname, len(ob.data.polygons), kb))
    print(f'  -> {fname}  faces={len(ob.data.polygons)}  {kb}KB')

# ═══════════════════ ① 경미 파손 오버레이 ═══════════════════
def build_dmg_light():
    """원본 셸 **위에 덧대는** 층 — 원본은 그대로 보이고 상처만 얹힌다.

    벽면 바로 앞(0.02 m)에 그을음 판을 세우고, 창 자리에 깨진 유리와 판자를 붙이고,
    벽 아래에 떨어져 나온 콘크리트 조각과 유리 파편을 흩는다. Z-fighting 을 피하려고
    모든 판은 벽면에서 살짝 띄운다.
    """
    rng = np.random.default_rng(11)
    p = []
    hx, hy = WL / 2, WD / 2

    # ── 그을음: 앞·뒤·좌·우 면에 몇 장씩 ──
    for (nx, ny, w, ax) in ((0, -1, WL, 'x'), (0, 1, WL, 'x'), (-1, 0, WD, 'y'), (1, 0, WD, 'y')):
        for k in range(3):
            t = (k + 0.5) / 3 + (rng.random() - 0.5) * 0.16
            sw = w * (0.16 + rng.random() * 0.16)
            sh = 1.5 + rng.random() * 1.5
            zc = 0.9 + rng.random() * 1.5
            if ax == 'x':
                x = (t - 0.5) * w
                y = ny * (hy + 0.03)
                p.append(plane(f'sc{ax}{k}{ny}', sw, sh, x, y, zc, SCORCH,
                               rx=math.pi / 2, rz=0 if ny < 0 else math.pi))
            else:
                y = (t - 0.5) * w
                x = nx * (hx + 0.03)
                p.append(plane(f'sc{ax}{k}{nx}', sw, sh, x, y, zc, SCORCH,
                               rx=math.pi / 2, rz=math.pi / 2 if nx < 0 else -math.pi / 2))

    # ── 깨진 창: 검은 백플레이트 + 남은 유리 조각 + 판자 ──
    for side in (-1, 1):
        for i in range(4):
            x = (i - 1.5) * (WL / 4.6)
            y = side * (hy + 0.035)
            p.append(box(f'win{side}{i}', 1.15, 0.05, 1.05, x, y, 1.85, CHAR))
            for g in range(3):
                gw = 0.2 + rng.random() * 0.4
                p.append(box(f'gl{side}{i}{g}', gw, 0.03, 0.15 + rng.random() * 0.35,
                             x + (rng.random() - 0.5) * 0.8, y + side * 0.02,
                             1.5 + rng.random() * 0.85, GLASS,
                             ry=(rng.random() - 0.5) * 0.5))
            if i % 2 == 0:
                p.append(box(f'bd{side}{i}', 1.35, 0.05, 0.16, x, y + side * 0.03,
                             1.7 + rng.random() * 0.5, CHAR, ry=(rng.random() - 0.5) * 0.35))

    # ── 벽 아래 잔해: 떨어져 나온 콘크리트 덩어리 ──
    for i in range(26):
        ang = rng.random() * math.tau
        r = 0.55 + rng.random() ** 0.6
        ex = (hx + r) * math.cos(ang)
        ey = (hy + r) * math.sin(ang)
        # 벽을 따라 눕히기 — 직사각 둘레에 붙인다
        ex = max(-hx - 1.6, min(hx + 1.6, ex * 1.35))
        ey = max(-hy - 1.6, min(hy + 1.6, ey * 1.35))
        s = 0.16 + rng.random() * 0.42
        p.append(box(f'rb{i}', s, s * (0.6 + rng.random()), s * (0.4 + rng.random() * 0.6),
                     ex, ey, s * 0.3, CONC,
                     rx=rng.random() * 0.7, ry=rng.random() * 0.7, rz=rng.random() * math.tau,
                     bev=0.02))
    # ── 유리 파편 (바닥에 반짝) ──
    for i in range(20):
        ang = rng.random() * math.tau
        ex = (hx + 0.3 + rng.random() * 1.4) * math.cos(ang)
        ey = (hy + 0.3 + rng.random() * 1.4) * math.sin(ang)
        p.append(box(f'gs{i}', 0.12 + rng.random() * 0.2, 0.1 + rng.random() * 0.16, 0.02,
                     ex, ey, 0.03, GLASS, rz=rng.random() * math.tau))
    # ── 처마에서 늘어진 철근 몇 가닥 ──
    for i in range(5):
        x = (rng.random() - 0.5) * WL * 0.8
        p.append(cyl(f'rbz{i}', 0.018, 0.9 + rng.random() * 0.8, x, hy * (1 if i % 2 else -1),
                     2.8, REBAR, 6, rot=((rng.random() - 0.5) * 0.8, (rng.random() - 0.5) * 0.8, 0)))
    return finish(join_as(p, 'dmg_light'), 'fac_dmg_light', 1.0)


# ═══════════════════ ② 반파 (대체) ═══════════════════
def build_dmg_heavy():
    """두 면이 무너진 반파 구조 — 원본 셸을 **대체**한다.

    남은 두 벽은 위쪽이 톱니로 뜯겨 있고, 무너진 자리에는 기둥과 노출 슬래브,
    삐져나온 철근, 그리고 바닥에 쌓인 잔해가 있다. 높이는 한 층 남짓(≈4.4 m)이라
    3 층짜리 건물이 이 상태가 되면 실루엣이 확 낮아진다 — 그게 반파의 인상이다.
    """
    rng = np.random.default_rng(23)
    p = []
    hx, hy = WL / 2, WD / 2

    # 바닥 슬래브 (조금 깨진 가장자리)
    p.append(jagged_slab('slab', LEN * 0.98, DEP * 0.98, 0.34, 0, 0, 0.17, CONC, rng, teeth=6))

    # 남은 벽 두 면 — 뒤(+Y)와 좌(−X). 윗변을 톱니로 자른다
    def torn_wall(name, sx, sy, x, y, base_h, top_h, cuts=9):
        parts = []
        n = cuts
        for i in range(n):
            t = (i + 0.5) / n
            h = base_h + (top_h - base_h) * (0.35 + 0.65 * rng.random())
            if sx > sy:
                seg = box(f'{name}{i}', sx / n * 1.02, sy, h,
                          x + (t - 0.5) * sx, y, h / 2, CONC, bev=0.02)
            else:
                seg = box(f'{name}{i}', sx, sy / n * 1.02, h,
                          x, y + (t - 0.5) * sy, h / 2, CONC, bev=0.02)
            parts.append(seg)
        return parts

    p += torn_wall('wN', WL, 0.34, 0, hy, 1.6, 4.4)
    p += torn_wall('wW', 0.34, WD, -hx, 0, 1.4, 4.2)
    # 무너진 두 면에는 밑동만 남는다
    p.append(box('stubS', WL, 0.34, 0.75, 0, -hy, 0.38, CONC, bev=0.02))
    p.append(box('stubE', 0.34, WD, 0.62, hx, 0, 0.31, CONC, bev=0.02))

    # 기둥 4 개 — 하나는 꺾여 기울었다
    for i, (sx_, sy_) in enumerate(((-1, -1), (1, -1), (1, 1), (-1, 1))):
        cx, cy = sx_ * (hx - 0.9), sy_ * (hy - 0.9)
        if i == 1:
            p.append(box(f'col{i}', 0.42, 0.42, 3.2, cx + 0.5, cy, 1.5, CONC,
                         ry=0.38, bev=0.03))
        else:
            hgt = 2.6 + rng.random() * 1.8
            p.append(box(f'col{i}', 0.44, 0.44, hgt, cx, cy, hgt / 2, CONC, bev=0.03))
            for r in range(3):
                p.append(cyl(f'cr{i}{r}', 0.016, 0.55 + rng.random() * 0.5,
                             cx + (r - 1) * 0.12, cy + (rng.random() - 0.5) * 0.2,
                             hgt + 0.25, REBAR, 6,
                             rot=((rng.random() - 0.5) * 0.5, (rng.random() - 0.5) * 0.5, 0)))

    # 꺾여 걸린 지붕 슬래브 한 장 — 반파의 실루엣을 만든다
    p.append(jagged_slab('roofA', WL * 0.62, WD * 0.5, 0.26,
                         -1.4, 1.1, 3.2, CONC, rng, ry=-0.42, rz=0.12, teeth=5))
    p.append(jagged_slab('roofB', WL * 0.34, WD * 0.42, 0.22,
                         3.2, -1.6, 1.5, CONC, rng, ry=0.62, rz=-0.3, teeth=4))

    # 잔해 더미 — 무너진 쪽(남·동)에 쌓인다
    for i in range(34):
        bx = rng.random() * WL * 0.9 - WL * 0.35
        by = -hy * (0.15 + rng.random() * 0.9)
        s = 0.24 + rng.random() * 0.75
        p.append(box(f'db{i}', s, s * (0.6 + rng.random()), s * (0.35 + rng.random() * 0.5),
                     bx, by, 0.35 + rng.random() * 0.6, CONC,
                     rx=rng.random() * 0.9, ry=rng.random() * 0.9, rz=rng.random() * math.tau,
                     bev=0.02))
    # 철근 다발
    for i in range(9):
        p.append(cyl(f'rr{i}', 0.017, 1.1 + rng.random() * 1.4,
                     (rng.random() - 0.5) * WL * 0.8, -hy * rng.random(),
                     0.7 + rng.random() * 0.8, REBAR, 6,
                     rot=(rng.random() * 1.4 - 0.7, rng.random() * 1.4 - 0.7, rng.random() * math.tau)))
    # 그을음
    for i in range(4):
        p.append(plane(f'scr{i}', 2.4 + rng.random() * 2.0, 2.0, (rng.random() - 0.5) * WL * 0.6,
                       hy - 0.2, 1.4 + rng.random(), SCORCH, rx=math.pi / 2, rz=math.pi))
    return finish(join_as(p, 'dmg_heavy'), 'fac_dmg_heavy', 1.4)


# ═══════════════════ ③ 완파 잔해 (대체) ═══════════════════
def build_ruin():
    """완전 붕괴 — 꺾인 슬래브 판과 콘크리트 더미. 높이 ≈ 2.8 m.

    「가라앉은 건물」과 「무너진 건물」의 차이는 **평면이 사라지고 각이 생기는 것**이다.
    그래서 큰 판을 서로 기대 놓고(팬케이크 붕괴), 그 사이로 철근을 삐져나오게 한다.
    """
    rng = np.random.default_rng(37)
    p = []
    hx, hy = WL / 2, WD / 2

    # 기초 판 — 잔해가 앉을 자리
    p.append(jagged_slab('pad', LEN * 0.99, DEP * 0.99, 0.26, 0, 0, 0.13, DUSTM, rng, teeth=6))

    # 큰 슬래브 판 5 장 — 서로 기대어 무너진 형태
    lays = [
        (WL * 0.78, WD * 0.62, 0.28, -1.2, 0.6, 0.75, -0.30, 0.10),
        (WL * 0.62, WD * 0.7, 0.26, 2.0, -0.9, 1.15, 0.42, -0.22),
        (WL * 0.55, WD * 0.5, 0.24, -3.0, -2.0, 0.55, 0.16, 0.55),
        (WL * 0.48, WD * 0.44, 0.22, 3.4, 2.2, 1.6, -0.58, -0.4),
        (WL * 0.42, WD * 0.38, 0.2, 0.4, 2.6, 2.0, 0.30, 0.9),
    ]
    for i, (sx, sy, th, x, y, z, ry, rz) in enumerate(lays):
        p.append(jagged_slab(f'slab{i}', sx, sy, th, x, y, z, CONC, rng, ry=ry, rz=rz, teeth=6))

    # 남은 벽 밑동 — 무엇이 있었는지 알아볼 만큼만
    p.append(box('stub1', 3.0, 0.36, 1.35, -hx + 1.6, hy - 0.3, 0.68, CONC, rz=0.05, bev=0.03))
    p.append(box('stub2', 0.36, 2.2, 0.95, hx - 0.4, -hy + 1.5, 0.48, CONC, bev=0.03))
    p.append(box('col', 0.42, 0.42, 2.1, -hx + 0.8, -hy + 0.9, 1.0, CONC, ry=0.22, bev=0.03))

    # 콘크리트 덩어리 더미
    for i in range(70):
        ang = rng.random() * math.tau
        rad = rng.random() ** 0.55
        bx = math.cos(ang) * rad * hx * 1.05
        by = math.sin(ang) * rad * hy * 1.05
        s = 0.22 + rng.random() * 0.95
        hgt = 0.15 + (1 - rad) * 1.5 * rng.random()
        p.append(box(f'ch{i}', s, s * (0.55 + rng.random()), s * (0.35 + rng.random() * 0.55),
                     bx, by, 0.2 + hgt, CONC,
                     rx=rng.random() * 1.1, ry=rng.random() * 1.1, rz=rng.random() * math.tau,
                     bev=0.02))
    # 철근 — 잔해 사이로 삐져나온다
    for i in range(16):
        ang = rng.random() * math.tau
        rad = rng.random() ** 0.6
        p.append(cyl(f'rb{i}', 0.018, 1.2 + rng.random() * 1.8,
                     math.cos(ang) * rad * hx, math.sin(ang) * rad * hy,
                     0.8 + rng.random() * 1.1, REBAR, 6,
                     rot=(rng.random() * 1.6 - 0.8, rng.random() * 1.6 - 0.8, rng.random() * math.tau)))
    # 그을음 얼룩 (바닥)
    for i in range(5):
        p.append(plane(f'sc{i}', 3.0 + rng.random() * 3.0, 2.4 + rng.random() * 2.4,
                       (rng.random() - 0.5) * WL * 0.7, (rng.random() - 0.5) * WD * 0.7,
                       0.29, SCORCH, rz=rng.random() * math.tau))
    return finish(join_as(p, 'ruin'), 'fac_ruin', 1.4)


BUILDS = [
    (build_dmg_light, 'fac_dmg_light.glb'),
    (build_dmg_heavy, 'fac_dmg_heavy.glb'),
    (build_ruin, 'fac_ruin.glb'),
]

ONLY = None
for a in sys.argv:
    if a.startswith('--only='):
        ONLY = set(a.split('=', 1)[1].split(','))

try:
    built = {}
    for fn, fname in BUILDS:
        if ONLY and fname not in ONLY:
            continue
        print('== ' + fname + ' ==')
        ob = fn()
        export_glb(ob, fname)
        built[fname] = ob

    print('== EXPORT SUMMARY ==')
    for f, poly, kb in EXPORTED:
        print(f'   {f:24s} faces={poly:6d}  {kb:5d}KB')
    if ONLY:
        sys.exit(0)

    # ── 검증 렌더: 세 단계를 나란히 ──
    for i, key in enumerate(['fac_dmg_light.glb', 'fac_dmg_heavy.glb', 'fac_ruin.glb']):
        ob = built.get(key)
        if ob:
            ob.location = (0, -i * 18, 0)

    bpy.ops.mesh.primitive_plane_add(size=140, location=(0, -18, 0))
    g = bpy.context.active_object
    g.data.materials.append(mk_mat('md_ground', srgb('#6a675c'), 0.0, 0.95))

    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy, sun.angle = 5.2, math.radians(1.6)
    so = bpy.data.objects.new('sun', sun)
    so.rotation_euler = (math.radians(52), 0, math.radians(126))
    scene.collection.objects.link(so)
    world = bpy.data.worlds.new('W')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.6, 0.74, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 2.0
    scene.world = world
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 40
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
    try:
        scene.view_settings.look = 'AgX - Base Contrast'
    except Exception:
        pass

    def shoot(loc, target, path, lens=50):
        cam.data.lens = lens
        cam.location = loc
        d = mathutils.Vector(target) - mathutils.Vector(loc)
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('  render ->', path)

    shoot((26, -52, 22), (0, -18, 2), os.path.join(RND, 'render_dmg_a.png'), 42)
    shoot((14, -30, 8), (0, -18, 2.4), os.path.join(RND, 'render_dmg_b.png'), 62)
    print('== DONE ==', len(EXPORTED), 'files')
except Exception:
    traceback.print_exc()
    sys.exit(1)
