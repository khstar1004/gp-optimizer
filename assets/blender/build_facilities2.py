# -*- coding: utf-8 -*-
"""
GP Digital Twin 배치 시설 2차 — 모델이 없던 5종 + 야외 구획 프롭 키트
  blender --background --factory-startup --python build_facilities2.py

왜 필요했나
  카탈로그 15종 중 5종(사무·교육·훈련·주차·군용주차)에 GLB 가 없었다.
  buildingModels.ts 의 `_plan()` 이 null 을 돌려주고 `update()` 가 즉시 빠져나가므로,
  그 5종은 지도에 **아무 형체도 그려지지 않았다** — 공중에 뜬 핀과 라벨만 남았다.
  조용한 결함이었다: 콘솔도 조용하고, 목록에는 멀쩡히 들어 있고, 비용도 계산된다.

두 갈래로 만든다
  ① 건물형(사무·교육·범용예비) — 기존 계약 그대로. 캐노니컬 10.8×6.8, 층고 3.2,
     정면 -Y, main + roof (+ floor). 런타임이 X=w/12, Y=d/8 로 늘린다.
  ② 야외 구획형(훈련·주차·군용주차) — **늘리면 안 되는 것들**이다. 주차장을 2.35배
     늘리면 차도 2.35배로 늘어나고 차선도 그만큼 두꺼워진다. 그래서 바닥(pad)만 늘리고
     그 위의 물건은 **실척 그대로** 놓는다. 몇 개를 어디에 놓을지는 런타임이 부지
     크기에서 계산한다 (buildingModels.ts 의 YARD_PLANS).

산출 (원점 = 지면 중심, 정면 -Y)
  건물형   fac_office_main/roof/floor · fac_edu_main/roof · fac_generic_main/roof
  바닥     fac_yard_asphalt (아스팔트+연석) · fac_yard_gravel (자갈+목재연석)
  주차     fac_stall (2.5x5.0 주차구획+휠스톱) · fac_carport (캔틸레버 1베이)
           veh_sedan (승용) · veh_truck (5t 카고)
  군용주차 fac_revet (흙 방호둑 12m) · fac_camonet (위장망 캐노피) · fac_polpoint (유류점)
  훈련     fac_rappel_tower (8.4m 레펠탑 — 이 묶음의 기준 디테일) · fac_obst_wall
           fac_obst_bars · fac_obst_beam · fac_obst_tires · fac_pullup · fac_stand
  공용     fac_lightmast (9m 조명탑) · fac_shed (장비 창고)
검증 렌더: assets/blender/render_fac2_a.png / _b.png / _c.png

헬퍼는 build_facilities.py / build_sensors.py 와 같은 모양을 쓴다. 세 벌째 사본이라
공용 모듈로 빼는 게 옳지만, 앞의 둘을 건드리면 이미 납품된 GLB 를 다시 굽게 된다 —
얻는 것 없이 위험만 는다. 새로 만드는 것은 여기 한 곳에 모은다.
"""
import bpy, math, os, sys, traceback
import numpy as np
import mathutils

OUT = r'C:\Users\USER\orca\projects\gp-optimizer\assets\models'
RND = r'C:\Users\USER\orca\projects\gp-optimizer\assets\blender'

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ═════════════════ 텍스처 ═════════════════
def srgb(hexs):
    h = hexs.lstrip('#')
    return tuple(((int(h[i:i + 2], 16) / 255.0) ** 2.2) for i in (0, 2, 4))

def _smooth(g, it=2):
    for _ in range(it):
        g = (g + np.roll(g, 1, 0) + np.roll(g, -1, 0) + np.roll(g, 1, 1) + np.roll(g, -1, 1)) / 5
    return g

def noise2d(n, octaves=(4, 8, 16), seed=1):
    rng = np.random.default_rng(seed)
    acc = np.zeros((n, n), dtype=np.float32)
    amp = 1.0
    for o in octaves:
        g = _smooth(rng.random((o, o)).astype(np.float32), 2)
        acc += amp * np.kron(g, np.ones((n // o, n // o), dtype=np.float32))[:n, :n]
        amp *= 0.55
    acc -= acc.min()
    return acc / max(1e-6, acc.max())

def pack_image(name, arr):
    im = bpy.data.images.new(name, arr.shape[1], arr.shape[0], alpha=True)
    im.pixels.foreach_set(arr.astype(np.float32).ravel())
    im.pack()
    return im

def tint_noise(name, hexs, spread=0.35, octaves=(4, 16), seed=3, N=128):
    base = np.array(srgb(hexs))
    f = noise2d(N, octaves, seed=seed)
    img = np.zeros((N, N, 4), dtype=np.float32)
    img[..., :3] = base * (1.0 - spread / 2 + spread * f)[..., None]
    img[..., 3] = 1.0
    return pack_image(name, img)

def make_camo(N=128, cell=8):
    colors = [srgb('#4a5240'), srgb('#333b2c'), srgb('#5c5744'), srgb('#23281e')]
    f = _smooth(np.random.default_rng(7).random((N // cell, N // cell)), 3)
    idx = np.digitize(f, np.quantile(f, [0.28, 0.55, 0.8]))
    img = np.zeros((*f.shape, 4), dtype=np.float32)
    for i, c in enumerate(colors):
        img[idx == i] = (*c, 1.0)
    return pack_image('g_camo', np.kron(img, np.ones((cell, cell, 1), dtype=np.float32)))

def make_asphalt(N=128):
    """아스팔트 — 잔골재 얼룩 + 옅은 보수 자국"""
    f = noise2d(N, (16, 64), seed=23)
    g = noise2d(N, (4,), seed=31)
    img = np.zeros((N, N, 4), dtype=np.float32)
    img[..., :3] = np.array(srgb('#3a3d41')) * (0.68 + 0.5 * f + 0.16 * g)[..., None]
    img[..., 3] = 1.0
    return pack_image('g_asphalt', img)

def make_gravel(N=128):
    f = noise2d(N, (32, 64), seed=41)
    img = np.zeros((N, N, 4), dtype=np.float32)
    img[..., :3] = np.array(srgb('#5b564a')) * (0.62 + 0.72 * f)[..., None]
    img[..., 3] = 1.0
    return pack_image('g_gravel', img)

def make_roofmetal(N=128):
    """골강판 — 세로 리브"""
    img = np.zeros((N, N, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:N, 0:N]
    rib = 0.78 + 0.22 * np.cos(xx * math.pi * 2 / 10)
    img[..., :3] = np.array(srgb('#8d9490')) * rib[..., None]
    img[..., 3] = 1.0
    return pack_image('g_roofm', img)

def make_panel(name, base_hex, N=128, seam=16):
    img = np.zeros((N, N, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:N, 0:N]
    img[..., :3] = np.array(srgb(base_hex)) * (0.94 + 0.12 * noise2d(N, (8, 32), seed=5))[..., None]
    line = (xx % seam < 1) | (yy % (seam * 2) < 1)
    img[line, :3] *= 0.72
    img[..., 3] = 1.0
    return pack_image(name, img)

def make_timber(N=128):
    """목재 — 가로 결"""
    img = np.zeros((N, N, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:N, 0:N]
    grain = 0.82 + 0.18 * np.sin(yy * 0.9 + 3.0 * noise2d(N, (8,), seed=13))
    img[..., :3] = np.array(srgb('#7a5a38')) * grain[..., None]
    img[..., 3] = 1.0
    return pack_image('g_timber', img)

def make_stripes(N=64):
    img = np.zeros((N, N, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:N, 0:N]
    band = ((xx + yy) // 8) % 2 == 0
    img[band, :3] = srgb('#e07a24')
    img[~band, :3] = srgb('#191919')
    img[..., 3] = 1.0
    return pack_image('g_stripes', img)

CAMO = make_camo()
ASPH = make_asphalt()
GRAVEL = make_gravel()
ROOFM = make_roofmetal()
TIMBER = make_timber()
STRIPES = make_stripes()
CONC = tint_noise('g_conc', '#9aa0a2', 0.30, (8, 32), 9)
EARTH = tint_noise('g_earth', '#5d5a42', 0.40, (4, 16), 11)
SAND = tint_noise('g_sand', '#b3a37e', 0.30, (8, 32), 17)
PANEL = make_panel('g_panel', '#aab3a0')
PANELW = make_panel('g_panelw', '#d8dcd4')

# ═════════════════ 재질 ═════════════════
def _alpha_blend(m):
    for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
        try:
            setattr(m, attr, val)
        except Exception:
            pass

def mk_mat(name, color, metallic=0.0, rough=0.6, alpha=1.0, emit=None, emit_str=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    b.inputs['Alpha'].default_value = alpha
    if emit is not None:
        b.inputs['Emission Color'].default_value = (*emit, 1.0)
        b.inputs['Emission Strength'].default_value = emit_str
    if alpha < 1.0:
        _alpha_blend(m)
    return m

def tex_mat(name, img, metallic=0.0, rough=0.7, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = img
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    b.inputs['Alpha'].default_value = alpha
    if alpha < 1.0:
        _alpha_blend(m)
    return m

M = {
    'camo':    tex_mat('gm_camo', CAMO, rough=0.72),
    'camonet': tex_mat('gm_camonet', CAMO, rough=0.9, alpha=0.55),
    'asph':    tex_mat('gm_asph', ASPH, rough=0.95),
    'gravel':  tex_mat('gm_gravel', GRAVEL, rough=0.98),
    'conc':    tex_mat('gm_conc', CONC, rough=0.93),
    'panel':   tex_mat('gm_panel', PANEL, rough=0.6),
    'panelw':  tex_mat('gm_panelw', PANELW, rough=0.55),
    'roofm':   tex_mat('gm_roofm', ROOFM, metallic=0.4, rough=0.55),
    'timber':  tex_mat('gm_timber', TIMBER, rough=0.85),
    'earth':   tex_mat('gm_earth', EARTH, rough=0.98),
    'sand':    tex_mat('gm_sand', SAND, rough=0.97),
    'stripes': tex_mat('gm_stripes', STRIPES, rough=0.5),
    'olive':    mk_mat('gm_olive',    srgb('#4d5a47'), 0.15, 0.55),
    'olive_dk': mk_mat('gm_olive_dk', srgb('#3a4437'), 0.15, 0.6),
    'galv':     mk_mat('gm_galv',     srgb('#7e878c'), 0.9,  0.42),
    'steel_dk': mk_mat('gm_steel_dk', srgb('#3c4348'), 0.8,  0.5),
    'chrome':   mk_mat('gm_chrome',   srgb('#c9d0d4'), 1.0,  0.18),
    'glass':    mk_mat('gm_glass',    srgb('#0f1d26'), 0.1,  0.08, alpha=0.5),
    'dark':     mk_mat('gm_dark',     srgb('#22262a'), 0.2,  0.7),
    'rubber':   mk_mat('gm_rubber',   srgb('#181a1c'), 0.0,  0.85),
    'warn':     mk_mat('gm_warn',     srgb('#e07a24'), 0.0,  0.5),
    'red':      mk_mat('gm_red',      srgb('#b3202a'), 0.0,  0.5),
    'white':    mk_mat('gm_white',    srgb('#cfd4cd'), 0.0,  0.45),
    'paint':    mk_mat('gm_paint',    srgb('#e8ecdf'), 0.0,  0.35),
    'paint_y':  mk_mat('gm_paint_y',  srgb('#e3b341'), 0.0,  0.35),
    'blue':     mk_mat('gm_blue',     srgb('#2b4a6b'), 0.1,  0.5),
    'navy':     mk_mat('gm_navy',     srgb('#1d3b57'), 0.3,  0.35),
    'maroon':   mk_mat('gm_maroon',   srgb('#5b2b2b'), 0.3,  0.4),
    'lamp':     mk_mat('gm_lamp',     srgb('#ffe8b0'), 0.0, 0.2, emit=(1.0, 0.85, 0.55), emit_str=4.0),
    'stain':    mk_mat('gm_stain',    srgb('#1c1a16'), 0.0, 0.9, alpha=0.55),
    'conc_dk':  mk_mat('gm_conc_dk',  srgb('#6b7075'), 0.0, 0.95),   # 기초 플린스 (밝으면 눈을 끈다)
    'irlens':   mk_mat('gm_irlens',   srgb('#7a6a3a'), 0.75, 0.14),  # 게르마늄 창
    'brass':    mk_mat('gm_brass',    srgb('#b08b3a'), 0.85, 0.30),
    'gun':      mk_mat('gm_gun',      srgb('#33383c'), 0.7,  0.45),
}
ACCENT = {'office': '#5eb1ef', 'edu': '#e3b341', 'generic': '#8494a6'}
for k, v in ACCENT.items():
    M['acc_' + k] = mk_mat('gm_acc_' + k, srgb(v), 0.1, 0.5)

# ═════════════════ 프리미티브 ═════════════════
def bevel(ob, w=0.03, seg=2):
    bpy.context.view_layer.objects.active = ob
    md = ob.modifiers.new('bv', 'BEVEL')
    md.width = w
    md.segments = seg
    md.limit_method = 'ANGLE'
    md.angle_limit = math.radians(40)
    bpy.ops.object.modifier_apply(modifier=md.name)
    return ob

def box(name, sx, sy, sz, x, y, z, mat, rz=0.0, rx=0.0, ry=0.0, bev=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z), rotation=(rx, ry, rz))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat)
    if bev > 0:
        bevel(ob, bev)
    return ob

def cyl(name, r, depth, x, y, z, mat, verts=12, rot=(0, 0, 0), rtop=None):
    if rtop is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth,
                                            location=(x, y, z), rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=rtop, depth=depth,
                                        location=(x, y, z), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    return ob

def sph(name, r, x, y, z, mat, seg=16, s=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(8, seg // 2),
                                         radius=r, location=(x, y, z))
    ob = bpy.context.active_object
    ob.name = name
    if s != (1, 1, 1):
        ob.scale = s
        bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob

def torus(name, R, r, x, y, z, mat, rot=(0, 0, 0), maj=14, mnr=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj,
                                     minor_segments=mnr, location=(x, y, z), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    return ob

def strut(name, p1, p2, r, mat, verts=8):
    v1, v2 = mathutils.Vector(p1), mathutils.Vector(p2)
    d = v2 - v1
    mid = (v1 + v2) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=max(1e-3, d.length),
                                        location=mid)
    ob = bpy.context.active_object
    ob.name = name
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = d.to_track_quat('Z', 'Y')
    ob.data.materials.append(mat)
    return ob

def text3d(name, body, size, x, y, z, mat, rot=(math.pi / 2, 0, 0), extrude=0.012):
    bpy.ops.object.text_add(location=(x, y, z), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.body = body
    ob.data.size = size
    ob.data.extrude = extrude
    ob.data.align_x = 'CENTER'
    ob.data.align_y = 'CENTER'
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object
    ob.data.materials.append(mat)
    return ob

def join_as(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    return ob

EXPORTED = []
def export_glb(ob, fname):
    path = os.path.join(OUT, fname)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB',
                              use_selection=True, export_apply=True)
    EXPORTED.append((fname, len(ob.data.polygons), os.path.getsize(path) // 1024))
    print('  -> %s  faces=%d  %dKB' % (fname, len(ob.data.polygons), os.path.getsize(path) // 1024))

# ═════════════════ 건물형 공용 파사드 ═════════════════
W2, D2, H = 10.8, 6.8, 3.2   # 벽체 (0.6m 앞치마), 층고 — build_facilities.py 와 동일 계약

def shell(parts, mat, trim_key=None, h=H, z0=0.0):
    parts.append(box('shell', W2, D2, h, 0, 0, z0 + h / 2, mat, bev=0.03))
    if trim_key:
        parts.append(box('trim', W2 + 0.06, D2 + 0.06, 0.16, 0, 0, z0 + h - 0.2, M['acc_' + trim_key]))
    parts.append(box('skirt', W2 + 0.08, D2 + 0.08, 0.14, 0, 0, z0 + 0.07, M['conc']))

def windows_row(parts, n, z, w=1.15, h=0.95, faces=(-1, 1), inset=1.6):
    xs = np.linspace(-W2 / 2 + inset, W2 / 2 - inset, n)
    for f in faces:
        for x in xs:
            parts.append(box('win', w, 0.08, h, x, f * (D2 / 2 + 0.01), z, M['glass']))
            parts.append(box('winfr', w + 0.1, 0.05, 0.07, x, f * (D2 / 2 + 0.03), z + h / 2 + 0.03, M['steel_dk']))
            parts.append(box('winfr', w + 0.1, 0.05, 0.07, x, f * (D2 / 2 + 0.03), z - h / 2 - 0.03, M['steel_dk']))

def ribbon(parts, z, h=1.1, faces=(-1, 1), inset=0.9):
    """연속 띠창 — 사무동 파사드. 늘어나도 자연스럽다 (창이 길어질 뿐)."""
    w = W2 - 2 * inset
    for f in faces:
        parts.append(box('rib', w, 0.09, h, 0, f * (D2 / 2 + 0.01), z, M['glass']))
        for dz in (h / 2 + 0.05, -h / 2 - 0.05):
            parts.append(box('ribfr', w + 0.12, 0.07, 0.1, 0, f * (D2 / 2 + 0.04), z + dz, M['steel_dk']))
        for mx in np.linspace(-w / 2 + 0.6, w / 2 - 0.6, 6):
            parts.append(box('mull', 0.08, 0.06, h, mx, f * (D2 / 2 + 0.05), z, M['white']))

def door(parts, x=0.0, w=1.0, h=2.1, mat=None, y=None, double=False):
    y = -(D2 / 2) if y is None else y
    mat = mat or M['olive_dk']
    if double:
        parts.append(box('door', w, 0.1, h, x - w / 2 - 0.02, y - 0.03, h / 2 + 0.05, mat))
        parts.append(box('door', w, 0.1, h, x + w / 2 + 0.02, y - 0.03, h / 2 + 0.05, mat))
        fw = 2 * w + 0.3
    else:
        parts.append(box('door', w, 0.1, h, x, y - 0.03, h / 2 + 0.05, mat))
        parts.append(box('knob', 0.05, 0.06, 0.05, x + w / 2 - 0.12, y - 0.1, 1.05, M['dark']))
        fw = w + 0.24
    parts.append(box('dframe', fw, 0.06, h + 0.12, x, y - 0.02, (h + 0.12) / 2 + 0.02, M['steel_dk']))
    parts.append(box('dstep', fw + 0.3, 0.6, 0.12, x, y - 0.35, 0.06, M['conc']))

def canopy(parts, x=0.0, w=2.6, depth=1.3, z=2.35):
    y = -(D2 / 2)
    parts.append(box('canopy', w, depth, 0.08, x, y - depth / 2, z, M['roofm']))
    for dx in (-w / 2 + 0.15, w / 2 - 0.15):
        parts.append(strut('cstay', (x + dx, y - depth + 0.1, z - 0.04), (x + dx, y - 0.05, z + 0.55), 0.025, M['galv']))

def ac_unit(parts, x, y, z=0.35, rz=0.0):
    parts.append(box('ac', 0.75, 0.3, 0.6, x, y, z, M['white'], rz=rz, bev=0.02))
    parts.append(cyl('acfan', 0.2, 0.03, x, y + 0.16 * math.cos(rz), z + 0.05, M['dark'],
                     verts=12, rot=(math.pi / 2, 0, rz)))

def gutter_roof(parts, z0, overhang=0.5, ridge=0.55):
    parts.append(box('roofslab', W2 + overhang, D2 + overhang, 0.12, 0, 0, z0 + 0.06, M['roofm'], bev=0.02))
    parts.append(box('ridge', W2 + overhang, 1.2, ridge, 0, 0, z0 + 0.12 + ridge / 2 - 0.06, M['roofm'], bev=0.02))

def parapet(parts, z0, h=0.5, t=0.15, mat=None):
    mat = mat or M['conc']
    parts.append(box('slab', W2 + 0.3, D2 + 0.3, 0.25, 0, 0, z0 + 0.13, mat, bev=0.03))
    parts.append(box('pp', W2 + 0.3, t, h, 0, D2 / 2 + 0.08, z0 + h, mat))
    parts.append(box('pp', W2 + 0.3, t, h, 0, -D2 / 2 - 0.08, z0 + h, mat))
    parts.append(box('pp', t, D2 + 0.3, h, W2 / 2 + 0.08, 0, z0 + h, mat))
    parts.append(box('pp', t, D2 + 0.3, h, -W2 / 2 - 0.08, 0, z0 + h, mat))

def railing(parts, x0, x1, y0, y1, z, h=1.05, r=0.028, mat=None, step=1.4):
    """난간 — 사각 둘레에 기둥 + 상·중 가로대. 레펠탑/사열대 공용."""
    mat = mat or M['galv']
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    for i in range(4):
        a, b = corners[i], corners[(i + 1) % 4]
        seg = math.dist(a, b)
        n = max(2, int(seg / step) + 1)
        for t in np.linspace(0, 1, n):
            px, py = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            parts.append(cyl('rpost', r, h, px, py, z + h / 2, mat, verts=6))
        for zz in (z + h, z + h * 0.55):
            parts.append(strut('rrail', (a[0], a[1], zz), (b[0], b[1], zz), r * 0.8, mat, verts=6))

def ladder(parts, x, y0, z0, z1, w=0.5, mat=None, face=-1):
    """수직 사다리 — 레일 2 + 발판. face=-1 이면 -Y 쪽 바깥으로 선다."""
    mat = mat or M['galv']
    for dx in (-w / 2, w / 2):
        parts.append(cyl('lrail', 0.03, z1 - z0, x + dx, y0, (z0 + z1) / 2, mat, verts=6))
    n = max(2, int((z1 - z0) / 0.32))
    for zz in np.linspace(z0 + 0.25, z1 - 0.1, n):
        parts.append(strut('lrung', (x - w / 2, y0, zz), (x + w / 2, y0, zz), 0.02, mat, verts=6))
    # 등받이 케이지 (상부 2/3)
    for zz in np.linspace(z0 + (z1 - z0) * 0.35, z1 - 0.3, 4):
        parts.append(torus('lcage', 0.42, 0.018, x, y0 + face * 0.34, zz, mat,
                           rot=(0, 0, 0), maj=10, mnr=5))

# ═════════════════ 1) 사무 구역 ═════════════════
def build_office_main():
    """사무동 1층 — 연속 띠창 + 유리 이중문 + 캐노피 + 게시판. 지휘동보다 민수(民需)한 표정."""
    parts = []
    shell(parts, M['panelw'], 'office')
    ribbon(parts, 1.9, 1.25)
    door(parts, 0, 0.95, 2.3, M['glass'], double=True)
    canopy(parts, 0, 3.6, 1.6, 2.6)
    # 현관 계단 + 경사로 (측면)
    for i, w in enumerate((3.9, 3.4)):
        parts.append(box('step', w, 0.4, 0.09, 0, -D2 / 2 - 0.5 - i * 0.4, 0.14 - i * 0.09, M['conc']))
    parts.append(box('ramp', 1.3, 2.4, 0.1, 3.2, -D2 / 2 - 1.2, 0.2, M['conc'], rx=math.radians(-4)))
    for rx in (2.6, 3.8):
        parts.append(cyl('rmp', 0.03, 0.95, rx, -D2 / 2 - 0.4, 0.62, M['galv'], verts=6))
        parts.append(cyl('rmp', 0.03, 0.95, rx, -D2 / 2 - 2.0, 0.55, M['galv'], verts=6))
    parts.append(strut('rmph', (2.6, -D2 / 2 - 0.4, 1.05), (2.6, -D2 / 2 - 2.0, 0.98), 0.025, M['galv']))
    parts.append(strut('rmph', (3.8, -D2 / 2 - 0.4, 1.05), (3.8, -D2 / 2 - 2.0, 0.98), 0.025, M['galv']))
    # 명패 + 게시판
    parts.append(box('plate', 1.5, 0.06, 0.42, -3.4, -D2 / 2 - 0.05, 2.05, M['navy']))
    parts.append(text3d('plate_t', 'ADMIN', 0.2, -3.4, -D2 / 2 - 0.12, 2.05, M['white'],
                        rot=(math.pi / 2, 0, math.pi)))
    parts.append(box('board', 1.8, 0.12, 1.15, -4.0, D2 / 2 + 0.3, 1.35, M['panel']))
    for bx in (-4.7, -3.3):
        parts.append(cyl('bpost', 0.05, 1.9, bx, D2 / 2 + 0.3, 0.95, M['steel_dk'], verts=6))
    # 실외기 + 배관
    for x in (4.0, 4.9):
        ac_unit(parts, x, D2 / 2 + 0.35)
    parts.append(box('duct', 0.26, 0.26, 2.6, W2 / 2 + 0.16, 1.9, 1.5, M['galv']))
    return join_as(parts, 'FAC_OFFICE_MAIN')

def build_office_floor():
    parts = []
    shell(parts, M['panelw'], 'office')
    ribbon(parts, 1.7, 1.25)
    parts.append(box('slabline', W2 + 0.12, D2 + 0.12, 0.12, 0, 0, 0.06, M['conc']))
    return join_as(parts, 'FAC_OFFICE_FLOOR')

def build_office_roof():
    parts = []
    parapet(parts, 0, 0.55, mat=M['conc'])
    # 태양광 어레이 3열
    for i, yy in enumerate((-1.6, 0.1, 1.8)):
        parts.append(box('pv', 6.4, 1.25, 0.07, -0.6, yy, 0.72, M['navy'], rx=math.radians(-16)))
        for px in (-3.5, 0.0, 2.3):
            parts.append(box('pvleg', 0.07, 0.07, 0.5, px, yy - 0.5, 0.5, M['galv']))
            parts.append(box('pvleg', 0.07, 0.07, 0.28, px, yy + 0.5, 0.39, M['galv']))
    # 옥탑 기계실 + 냉각기 + 안테나
    parts.append(box('penthouse', 2.4, 2.0, 1.5, 3.8, -1.4, 0.98, M['panelw'], bev=0.03))
    parts.append(box('phdoor', 0.06, 0.8, 1.1, 3.8 - 1.23, -1.4, 0.78, M['steel_dk']))
    parts.append(box('chiller', 1.5, 1.0, 0.85, 4.0, 1.7, 0.66, M['white'], bev=0.03))
    for cx in (3.6, 4.4):
        parts.append(cyl('chfan', 0.28, 0.06, cx, 1.7, 1.11, M['dark'], verts=12))
    parts.append(cyl('whip', 0.02, 3.2, -4.6, 2.2, 1.85, M['dark'], verts=6))
    parts.append(cyl('lgt', 0.06, 0.12, -4.6, 2.2, 3.5, M['red'], verts=8))
    return join_as(parts, 'FAC_OFFICE_ROOF')

# ═════════════════ 2) 교육 구역 ═════════════════
def build_edu_main():
    """강의동 — 큰 교실창 + 현관 포치 + 국기게양대 + 자전거 거치대."""
    parts = []
    shell(parts, M['panel'], 'edu')
    windows_row(parts, 5, 1.95, w=1.55, h=1.5)
    door(parts, -2.4, 1.0, 2.2, M['olive_dk'], double=True)
    # 포치 (기둥 2 + 지붕)
    parts.append(box('porch', 4.4, 2.2, 0.14, -2.4, -D2 / 2 - 1.1, 2.72, M['roofm'], bev=0.02))
    for px in (-4.2, -0.6):
        parts.append(cyl('ppost', 0.11, 2.75, px, -D2 / 2 - 1.9, 1.38, M['conc'], verts=10))
    parts.append(box('pstep', 4.8, 1.0, 0.1, -2.4, -D2 / 2 - 2.2, 0.05, M['conc']))
    # 게양대 2본
    for fx in (2.4, 3.4):
        parts.append(cyl('flagp', 0.055, 7.0, fx, -D2 / 2 - 1.6, 3.5, M['white'], verts=8))
        parts.append(sph('flagk', 0.09, fx, -D2 / 2 - 1.6, 7.05, M['paint_y'], seg=10))
        parts.append(cyl('flagb', 0.5, 0.35, fx, -D2 / 2 - 1.6, 0.17, M['conc'], verts=10))
    parts.append(box('flag', 0.03, 1.1, 0.72, 2.44, -D2 / 2 - 1.05, 6.3, M['white']))
    parts.append(box('flag', 0.03, 1.1, 0.72, 3.44, -D2 / 2 - 1.05, 6.3, M['acc_edu']))
    # 자전거 거치대
    for i in range(5):
        parts.append(torus('brack', 0.32, 0.028, -4.6 + i * 0.55, D2 / 2 + 0.7, 0.34, M['galv'],
                           rot=(0, math.pi / 2, 0), maj=10, mnr=5))
    # 확성기 + 시계
    parts.append(cyl('horn', 0.24, 0.4, 4.6, -D2 / 2 - 0.1, 2.75, M['white'], verts=10,
                     rot=(math.pi / 2, 0, 0), rtop=0.09))
    parts.append(cyl('clock', 0.32, 0.07, 0.9, -D2 / 2 - 0.05, 2.7, M['white'], verts=16,
                     rot=(math.pi / 2, 0, 0)))
    parts.append(box('clockh', 0.03, 0.03, 0.22, 0.9, -D2 / 2 - 0.1, 2.78, M['dark']))
    return join_as(parts, 'FAC_EDU_MAIN')

def build_edu_roof():
    parts = []
    parts.append(box('eave', W2 + 0.9, D2 + 0.9, 0.14, 0, 0, 0.07, M['roofm'], bev=0.02))
    # 박공 지붕 (두 경사면)
    for f in (-1, 1):
        parts.append(box('slope', W2 + 0.9, D2 / 2 + 0.5, 0.1, 0, f * (D2 / 4 + 0.2), 0.62, M['roofm'],
                         rx=math.radians(-f * 15)))
    parts.append(box('ridgecap', W2 + 0.9, 0.35, 0.14, 0, 0, 1.14, M['steel_dk'], bev=0.02))
    # 채광창 띠 + 환기 터릿
    parts.append(box('skylight', 5.6, 0.9, 0.14, -1.2, 1.55, 0.82, M['glass'], rx=math.radians(-15)))
    for vx in (3.2, 4.6):
        parts.append(cyl('vent', 0.24, 0.5, vx, -1.4, 1.0, M['galv'], verts=10))
        parts.append(sph('ventcap', 0.3, vx, -1.4, 1.25, M['steel_dk'], seg=10, s=(1, 1, 0.5)))
    # 박공 벽 + 부대 마크판
    for f in (-1, 1):
        parts.append(box('gable', 0.16, D2 + 0.2, 0.9, f * (W2 / 2 + 0.05), 0, 0.58, M['panel']))
    parts.append(box('crest', 0.9, 0.06, 0.9, 0, -D2 / 2 - 0.3, 0.75, M['acc_edu'], rx=math.radians(-15)))
    return join_as(parts, 'FAC_EDU_ROOF')

# ═════════════════ 3) 범용 예비 (카탈로그가 늘어나도 빈자리가 없도록) ═════════════════
def build_generic_main():
    parts = []
    shell(parts, M['panel'], 'generic')
    windows_row(parts, 4, 1.8)
    door(parts, -3.6, 1.0)
    canopy(parts, -3.6)
    parts.append(box('louver', 1.6, 0.08, 1.0, 3.4, -D2 / 2 - 0.01, 1.8, M['dark']))
    for i in range(4):
        parts.append(box('lslat', 1.6, 0.06, 0.06, 3.4, -D2 / 2 - 0.05, 1.42 + i * 0.26, M['galv']))
    ac_unit(parts, 4.6, D2 / 2 + 0.35)
    parts.append(box('crate', 1.0, 0.8, 0.7, -4.6, D2 / 2 + 0.7, 0.35, M['olive_dk'], bev=0.02))
    return join_as(parts, 'FAC_GENERIC_MAIN')

def build_generic_roof():
    parts = []
    gutter_roof(parts, 0)
    parts.append(cyl('vent', 0.14, 0.7, 2.8, -1.0, 0.9, M['galv'], verts=10))
    parts.append(cyl('ventcap', 0.22, 0.1, 2.8, -1.0, 1.3, M['galv'], verts=10))
    parts.append(box('hvac', 1.1, 0.8, 0.6, -2.4, 1.2, 0.85, M['white'], bev=0.03))
    parts.append(cyl('whip', 0.015, 2.2, 4.4, 1.8, 1.6, M['dark'], verts=6))
    return join_as(parts, 'FAC_GENERIC_ROOF')

# ═════════════════ 4) 야외 바닥 (부지 크기로 늘어나는 유일한 조각) ═════════════════
def build_stem():
    """기초 플린스 — **런타임에서 Z 로 늘리는** 조각. 높이 1.0m, 윗면이 z=0.

    바닥판·건물은 `padTop`(풋프린트 최고 지반)에 놓인다. 경사지에서는 그 아래 내리막
    쪽이 허공에 뜬다 — Cesium 은 지형을 깎아 주지 않기 때문이다. 깊이를 GLB 에 박아 넣으면
    어떤 경사에서는 모자라고 어떤 경사에서는 남는다. 그래서 단위 높이로 만들어 두고
    `foundBottom`(최저 지반 −0.5m)까지 런타임이 늘린다 (buildingModels.ts stemDepth).
    평지에서는 통째로 지하에 들어가 보이지 않는다."""
    parts = []
    parts.append(box('stem', 12.0, 8.0, 1.0, 0, 0, -0.5, M['conc_dk']))
    parts.append(box('cornice', 12.3, 8.3, 0.16, 0, 0, -0.08, M['conc_dk'], bev=0.03))
    return join_as(parts, 'FAC_STEM')

def build_yard_asphalt():
    parts = []
    parts.append(box('pad', 12.0, 8.0, 0.12, 0, 0, 0.06, M['asph']))
    for (sx, sy, x, y) in [(12.3, 0.3, 0, 4.15), (12.3, 0.3, 0, -4.15),
                           (0.3, 8.6, 6.15, 0), (0.3, 8.6, -6.15, 0)]:
        parts.append(box('kerb', sx, sy, 0.22, x, y, 0.11, M['conc']))     # 연석
    parts.append(box('gutter', 11.4, 0.3, 0.03, 0, 3.7, 0.13, M['conc']))  # 배수구
    for gx in (-3.6, 0, 3.6):
        parts.append(cyl('drain', 0.22, 0.05, gx, 3.7, 0.15, M['steel_dk'], verts=8))
    return join_as(parts, 'FAC_YARD_ASPHALT')

def build_yard_gravel():
    parts = []
    parts.append(box('pad', 12.0, 8.0, 0.14, 0, 0, 0.07, M['gravel']))
    for (sx, sy, x, y) in [(12.4, 0.24, 0, 4.12), (12.4, 0.24, 0, -4.12),
                           (0.24, 8.5, 6.12, 0), (0.24, 8.5, -6.12, 0)]:
        parts.append(box('edge', sx, sy, 0.26, x, y, 0.13, M['timber']))   # 목재 연석
    for px in (-6.12, -2.0, 2.0, 6.12):
        parts.append(cyl('peg', 0.06, 0.5, px, 4.12, 0.25, M['timber'], verts=6))
        parts.append(cyl('peg', 0.06, 0.5, px, -4.12, 0.25, M['timber'], verts=6))
    return join_as(parts, 'FAC_YARD_GRAVEL')

# ═════════════════ 5) 주차 프롭 ═════════════════
def build_stall():
    """주차구획 2면 묶음 (5.0 x 5.0) — 차선 도장 + 휠스톱.

    1면씩 배치하면 28m 주차장 한 줄에 모듈이 10개 붙어 프리미티브가 금방 는다.
    2면 묶음이면 절반이고, 구획 폭 2.5m 는 실척 그대로 지켜진다 (늘리지 않으므로)."""
    parts = []
    for dx in (-2.5, 0.0, 2.5):
        parts.append(box('line', 0.12, 5.0, 0.012, dx, 0, 0.006, M['paint']))
    parts.append(box('line_h', 5.0, 0.12, 0.012, 0, 2.44, 0.006, M['paint']))
    for sx in (-1.25, 1.25):
        parts.append(box('stop', 1.7, 0.16, 0.11, sx, -2.0, 0.055, M['conc'], bev=0.02))
        for ax in (sx - 0.6, sx + 0.6):
            parts.append(cyl('anchor', 0.03, 0.06, ax, -2.0, 0.12, M['steel_dk'], verts=6))
    return join_as(parts, 'FAC_STALL')

def build_carport():
    """캔틸레버 카포트 1베이 (5.6m) — 후면 기둥 2 + 경사 지붕 + 퍼린."""
    parts = []
    for px in (-2.4, 2.4):
        parts.append(box('cpost', 0.24, 0.24, 3.2, px, 2.5, 1.6, M['galv'], bev=0.02))
        parts.append(box('cbase', 0.5, 0.5, 0.16, px, 2.5, 0.08, M['conc']))
        parts.append(strut('cbrace', (px, 2.5, 2.3), (px, 0.9, 3.05), 0.055, M['galv']))
    parts.append(box('cbeam', 5.6, 0.22, 0.34, 0, 2.5, 3.32, M['galv'], bev=0.02))
    parts.append(box('croof', 5.6, 5.6, 0.1, 0, 0.1, 3.28, M['roofm'], rx=math.radians(4), bev=0.02))
    for py in np.linspace(-2.4, 2.4, 5):
        parts.append(box('purlin', 5.6, 0.09, 0.14, 0, py, 3.18 + (2.4 - py) * 0.035, M['steel_dk']))
    parts.append(box('gutt', 5.6, 0.16, 0.14, 0, -2.68, 3.08, M['steel_dk']))
    parts.append(cyl('dpipe', 0.06, 3.0, -2.72, -2.6, 1.55, M['steel_dk'], verts=8))
    return join_as(parts, 'FAC_CARPORT')

def build_sedan():
    """승용 (4.5 x 1.85 x 1.48) — 차체·캐빈·유리·바퀴·등화. 주차장이 비어 보이지 않게."""
    parts = []
    body = box('body', 1.85, 4.5, 0.72, 0, 0, 0.66, M['navy'], bev=0.12)
    parts.append(body)
    cab = box('cab', 1.68, 2.3, 0.6, 0, -0.1, 1.28, M['navy'], bev=0.16)
    parts.append(cab)
    parts.append(box('wshield', 1.5, 0.1, 0.5, 0, -1.15, 1.3, M['glass'], rx=math.radians(28)))
    parts.append(box('rwin', 1.5, 0.1, 0.46, 0, 1.02, 1.3, M['glass'], rx=math.radians(-26)))
    for f in (-1, 1):
        parts.append(box('swin', 0.08, 2.0, 0.42, f * 0.83, -0.1, 1.32, M['glass']))
        parts.append(box('mirror', 0.16, 0.1, 0.1, f * 0.95, -0.95, 1.16, M['dark']))
    parts.append(box('hood', 1.7, 1.15, 0.07, 0, -1.72, 1.02, M['navy'], bev=0.05))
    parts.append(box('trunk', 1.7, 0.95, 0.07, 0, 1.72, 1.02, M['navy'], bev=0.05))
    parts.append(box('grille', 1.35, 0.08, 0.2, 0, -2.24, 0.72, M['dark']))
    parts.append(box('bump', 1.8, 0.2, 0.3, 0, -2.2, 0.55, M['dark'], bev=0.06))
    parts.append(box('bump', 1.8, 0.2, 0.3, 0, 2.2, 0.55, M['dark'], bev=0.06))
    for f in (-1, 1):
        parts.append(box('hlamp', 0.42, 0.1, 0.16, f * 0.6, -2.22, 0.92, M['white']))
        parts.append(box('tlamp', 0.38, 0.09, 0.15, f * 0.62, 2.22, 0.95, M['red']))
    for (wx, wy) in [(-0.9, -1.4), (0.9, -1.4), (-0.9, 1.42), (0.9, 1.42)]:
        parts.append(cyl('tyre', 0.33, 0.24, wx, wy, 0.33, M['rubber'], verts=14,
                         rot=(0, math.pi / 2, 0)))
        parts.append(cyl('rim', 0.19, 0.26, wx, wy, 0.33, M['chrome'], verts=10,
                         rot=(0, math.pi / 2, 0)))
    return join_as(parts, 'VEH_SEDAN')

def build_truck():
    """5t 카고 (7.2 x 2.44 x 3.1) — 캡·화물칸 캔버스·리브·6륜·스페어. 군용주차 구획의 주인공."""
    parts = []
    parts.append(box('chassis', 2.1, 7.0, 0.28, 0, 0, 0.86, M['steel_dk'], bev=0.04))
    # 캡
    parts.append(box('cab', 2.32, 2.0, 1.5, 0, -2.35, 1.85, M['olive'], bev=0.08))
    parts.append(box('wshield', 2.0, 0.1, 0.72, 0, -3.28, 2.28, M['glass'], rx=math.radians(12)))
    for f in (-1, 1):
        parts.append(box('cdoor', 0.08, 1.2, 1.1, f * 1.17, -2.3, 1.85, M['olive_dk']))
        parts.append(box('swin', 0.07, 0.8, 0.5, f * 1.2, -2.6, 2.22, M['glass']))
        parts.append(box('mirror', 0.12, 0.1, 0.42, f * 1.42, -3.15, 2.5, M['dark']))
        parts.append(box('hlamp', 0.3, 0.1, 0.24, f * 0.82, -3.36, 1.36, M['white']))
    parts.append(box('grille', 1.7, 0.12, 0.5, 0, -3.34, 1.72, M['dark']))
    parts.append(box('bumper', 2.4, 0.24, 0.3, 0, -3.42, 1.05, M['steel_dk'], bev=0.05))
    for wx in (-0.8, 0.8):
        parts.append(cyl('winch', 0.08, 0.3, wx, -3.5, 1.05, M['galv'], verts=8, rot=(0, math.pi / 2, 0)))
    parts.append(cyl('stack', 0.1, 2.0, 1.2, -1.5, 2.4, M['dark'], verts=8))   # 배기 스택
    # 화물칸 (캔버스 + 리브)
    parts.append(box('bed', 2.4, 4.3, 0.9, 0, 1.05, 1.4, M['olive_dk'], bev=0.04))
    parts.append(box('tarp', 2.36, 4.2, 1.3, 0, 1.05, 2.5, M['camo'], bev=0.22))
    for ry in np.linspace(-0.95, 3.0, 6):
        parts.append(box('rib', 2.44, 0.08, 1.3, 0, ry, 2.5, M['olive_dk'], bev=0.05))
    parts.append(box('tailgate', 2.4, 0.1, 0.9, 0, 3.2, 1.4, M['olive'], bev=0.03))
    parts.append(box('tarpend', 2.2, 0.06, 1.2, 0, 3.18, 2.5, M['camo']))
    # 6륜 + 스페어
    for (wx, wy) in [(-1.0, -2.35), (1.0, -2.35), (-1.02, 1.1), (1.02, 1.1), (-1.02, 2.2), (1.02, 2.2)]:
        parts.append(cyl('tyre', 0.55, 0.36, wx, wy, 0.55, M['rubber'], verts=14, rot=(0, math.pi / 2, 0)))
        parts.append(cyl('rim', 0.26, 0.38, wx, wy, 0.55, M['steel_dk'], verts=10, rot=(0, math.pi / 2, 0)))
    parts.append(cyl('spare', 0.55, 0.34, 0, -0.6, 0.72, M['rubber'], verts=12, rot=(math.pi / 2, 0, 0)))
    parts.append(box('jerry', 0.35, 0.2, 0.48, -1.22, -0.4, 1.35, M['olive_dk'], bev=0.03))
    return join_as(parts, 'VEH_TRUCK')

# ═════════════════ 6) 군용주차 프롭 ═════════════════
def build_revet():
    """차량 방호벽 12m — 흙 채운 게비온(HESCO형) 2단.

    첫 시도는 사다리꼴 성토였는데 렌더에서 콘크리트 상자로 읽혔다. 실제 차량 주기장에서
    쓰는 것도 성토보다 게비온 쪽이 흔하고, 각진 셀이라 저폴리곤에서 형태가 살아남는다."""
    parts = []
    CW, CH1, CH2 = 1.5, 1.4, 1.05          # 셀 폭 / 하단 높이 / 상단 높이
    n1 = 8
    for i in range(n1):                     # 하단 8셀
        cx = (i - (n1 - 1) / 2) * CW
        parts.append(box('cell', CW - 0.04, 1.5, CH1, cx, 0, CH1 / 2, M['earth'], bev=0.03))
        for f in (-1, 1):                   # 철망 프레임 (셀 모서리 굵기로만 표현)
            parts.append(box('mesh', CW - 0.02, 0.05, 0.05, cx, f * 0.77, CH1 - 0.05, M['galv']))
            parts.append(box('mesh', CW - 0.02, 0.05, 0.05, cx, f * 0.77, 0.06, M['galv']))
            for zz in np.linspace(0.25, CH1 - 0.25, 4):
                parts.append(box('meshw', CW - 0.02, 0.03, 0.03, cx, f * 0.77, zz, M['galv']))
        for py in (-0.77, 0.77):
            parts.append(cyl('post', 0.045, CH1, cx - CW / 2 + 0.02, py, CH1 / 2, M['galv'], verts=6))
    n2 = n1 - 1
    for i in range(n2):                     # 상단 7셀 (반 칸 어긋나게)
        cx = (i - (n2 - 1) / 2) * CW
        parts.append(box('cell2', CW - 0.06, 1.2, CH2, cx, 0, CH1 + CH2 / 2 + 0.02, M['earth'], bev=0.03))
        for f in (-1, 1):
            parts.append(box('mesh2', CW - 0.04, 0.05, 0.05, cx, f * 0.62, CH1 + CH2 - 0.05, M['galv']))
            for zz in np.linspace(CH1 + 0.25, CH1 + CH2 - 0.25, 3):
                parts.append(box('meshw2', CW - 0.04, 0.03, 0.03, cx, f * 0.62, zz, M['galv']))
    # 상단 모래주머니 열 + 차량 유도 말뚝
    rng = np.random.default_rng(3)
    for i in range(11):
        sx = -5.0 + i * 1.0
        parts.append(sph('bag', 0.34, sx, float(rng.uniform(-0.25, 0.25)), CH1 + CH2 + 0.14,
                         M['camo'], seg=10, s=(1.15, 0.85, 0.5)))
    for sx in (-6.05, 6.05):                # 마구리 (흙 흘림 방지 판)
        parts.append(box('endcap', 0.12, 1.6, CH1 + CH2, sx, 0, (CH1 + CH2) / 2, M['timber'], bev=0.02))
        parts.append(cyl('guide', 0.06, 1.7, sx + math.copysign(0.7, sx), 0, 0.85, M['stripes'], verts=8))
    return join_as(parts, 'FAC_REVET')

def build_camonet():
    """위장망 캐노피 12 x 8 — 기둥 6 + 깊게 처지는 망 + 로프 격자 + 인장줄.

    첫 시도는 알파 0.55 짜리 평평한 격자였는데 렌더에서 **유리판 한 장**으로 읽혔다.
    망은 (a) 처짐이 깊어야 하고 (b) 줄이 보여야 망으로 보인다 — 그래서 로프 격자를
    실제 지오메트리로 얹고, 처짐을 1.6m 로 키우고, 기둥을 굵혔다."""
    parts = []
    Z0, SAG = 4.6, 1.6
    HX, HY = 6.2, 4.2                        # 망 반폭
    def netz(x, y):
        u, w = (x / HX + 1) / 2, (y / HY + 1) / 2
        return Z0 - SAG * math.sin(math.pi * u) * math.sin(math.pi * w) \
            + 0.11 * math.sin(u * 11.0) * math.sin(w * 9.0)
    poles = [(-5.7, -3.8), (0.0, -4.1), (5.7, -3.8), (-5.7, 3.8), (0.0, 4.1), (5.7, 3.8)]
    for (px, py) in poles:
        top = netz(px, py)
        parts.append(cyl('npole', 0.12, top, px, py, top / 2, M['olive_dk'], verts=8))
        parts.append(cyl('nband', 0.15, 0.12, px, py, top - 0.25, M['galv'], verts=8))
        parts.append(cyl('nfoot', 0.38, 0.16, px, py, 0.08, M['conc'], verts=8))
        parts.append(sph('spread', 0.26, px, py, top + 0.08, M['olive_dk'], seg=10, s=(1, 1, 0.6)))
        gx, gy = px * 1.3, py * 1.4
        parts.append(strut('guy', (px, py, top), (gx, gy, 0.12), 0.022, M['dark']))
        parts.append(cyl('peg', 0.055, 0.55, gx, gy, 0.16, M['steel_dk'], verts=6))
    # 망 면 (격자 → 처짐)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=17, y_subdivisions=13, size=1, location=(0, 0, 0))
    net = bpy.context.active_object
    net.name = 'net'
    net.scale = (2 * HX, 2 * HY, 1)
    bpy.ops.object.transform_apply(scale=True)
    for v in net.data.vertices:
        v.co.z = netz(v.co.x, v.co.y)
    net.data.materials.append(M['camonet'])
    bpy.ops.object.shade_smooth()
    parts.append(net)
    # 로프 격자 — 이게 있어야 「망」으로 보인다 (면만으로는 유리판이다)
    def rope(name, pts, r=0.028):
        for i in range(len(pts) - 1):
            parts.append(strut(name, pts[i], pts[i + 1], r, M['olive_dk'], verts=5))
    for gx in np.linspace(-HX, HX, 7):
        rope('ropeu', [(gx, gy, netz(gx, gy) + 0.05) for gy in np.linspace(-HY, HY, 9)])
    for gy in np.linspace(-HY, HY, 5):
        rope('ropev', [(gx, gy, netz(gx, gy) + 0.05) for gx in np.linspace(-HX, HX, 13)])
    for f in (-1, 1):                        # 가장자리 굵은 로프
        rope('edge', [(gx, f * HY, netz(gx, f * HY) + 0.06) for gx in np.linspace(-HX, HX, 13)], 0.045)
        rope('edge', [(f * HX, gy, netz(f * HX, gy) + 0.06) for gy in np.linspace(-HY, HY, 9)], 0.045)
    return join_as(parts, 'FAC_CAMONET')

def build_polpoint():
    """유류 취급점 — 방유제 + 드럼 4 + 수동 펌프 + 소화기 + 경고판."""
    parts = []
    parts.append(box('slab', 4.2, 3.2, 0.14, 0, 0, 0.07, M['conc'], bev=0.02))
    for (sx, sy, x, y) in [(4.4, 0.24, 0, 1.58), (4.4, 0.24, 0, -1.58),
                           (0.24, 3.4, 2.08, 0), (0.24, 3.4, -2.08, 0)]:
        parts.append(box('bund', sx, sy, 0.42, x, y, 0.21, M['conc'], bev=0.02))
    for i, (dx, dy) in enumerate([(-1.2, 0.5), (-0.5, 0.5), (0.4, 0.5), (1.2, 0.5)]):
        mat = [M['olive_dk'], M['warn'], M['olive_dk'], M['red']][i]
        parts.append(cyl('drum', 0.29, 0.88, dx, dy, 0.58, mat, verts=12))
        for zz in (0.38, 0.78):
            parts.append(cyl('drumrib', 0.31, 0.05, dx, dy, zz, M['steel_dk'], verts=12))
        parts.append(cyl('bung', 0.06, 0.04, dx + 0.12, dy, 1.03, M['galv'], verts=8))
    parts.append(box('pump', 0.34, 0.3, 0.9, -1.7, -0.75, 0.59, M['olive'], bev=0.03))
    parts.append(cyl('phandle', 0.03, 0.55, -1.7, -0.5, 1.12, M['galv'], verts=6, rot=(math.pi / 2, 0, 0)))
    parts.append(strut('hose', (-1.55, -0.8, 1.0), (0.4, 0.2, 1.05), 0.035, M['dark']))
    parts.append(cyl('extg', 0.13, 0.62, 1.75, -0.9, 0.45, M['red'], verts=10))
    parts.append(cyl('signp', 0.035, 2.0, -2.0, -1.4, 1.0, M['galv'], verts=8))
    parts.append(box('sign', 0.8, 0.05, 0.55, -2.0, -1.4, 1.85, M['warn']))
    parts.append(text3d('signt', 'POL', 0.2, -2.0, -1.46, 1.85, M['dark'], rot=(math.pi / 2, 0, math.pi)))
    return join_as(parts, 'FAC_POLPOINT')

# ═════════════════ 7) 훈련 프롭 ═════════════════
def build_rappel_tower():
    """레펠·유격탑 8.4m — 이 묶음의 기준 디테일.
    4각 트러스(각재 4 + X 브레이싱 3단) · 중간 4.2m 데크 · 정상 8.0m 데크 + 난간
    · 케이지 사다리 · 레펠 암 2 + 로프 · 클라이밍 판 · 착지 매트."""
    parts = []
    A, TOP, MID = 1.9, 8.0, 4.2                      # 반폭 / 정상 / 중간
    legs = [(-A, -A), (A, -A), (A, A), (-A, A)]
    for (lx, ly) in legs:                            # 각재 다리 + 기초
        parts.append(box('leg', 0.26, 0.26, TOP + 0.5, lx, ly, (TOP + 0.5) / 2, M['steel_dk'], bev=0.02))
        parts.append(box('foot', 0.8, 0.8, 0.32, lx, ly, 0.16, M['conc'], bev=0.03))
        parts.append(box('plate', 0.5, 0.5, 0.05, lx, ly, 0.34, M['galv']))
    for i in range(4):                               # X 브레이싱 4단
        z0, z1 = 0.4 + i * 2.0, 0.4 + (i + 1) * 2.0
        if z1 > TOP + 0.4:
            break
        for j in range(4):
            a, b = legs[j], legs[(j + 1) % 4]
            parts.append(strut('brc', (a[0], a[1], z0), (b[0], b[1], z1), 0.055, M['galv']))
            parts.append(strut('brc', (b[0], b[1], z0), (a[0], a[1], z1), 0.055, M['galv']))
        for j in range(4):                           # 수평 링
            a, b = legs[j], legs[(j + 1) % 4]
            parts.append(strut('ring', (a[0], a[1], z1), (b[0], b[1], z1), 0.05, M['galv']))
    for z in (MID, TOP):                             # 데크 (합판 + 장선)
        parts.append(box('deck', 2 * A + 0.5, 2 * A + 0.5, 0.12, 0, 0, z, M['timber'], bev=0.02))
        for jy in np.linspace(-A, A, 5):
            parts.append(box('joist', 2 * A + 0.4, 0.1, 0.18, 0, jy, z - 0.14, M['steel_dk']))
    railing(parts, -A - 0.2, A + 0.2, -A - 0.2, A + 0.2, TOP + 0.06, 1.15, mat=M['galv'])
    railing(parts, -A - 0.2, A + 0.2, -A - 0.2, A + 0.2, MID + 0.06, 1.05, mat=M['galv'])
    parts.append(box('kick', 2 * A + 0.5, 0.14, 0.2, 0, A + 0.2, TOP + 0.16, M['timber']))
    ladder(parts, 0, -A - 0.45, 0.2, TOP + 0.1, 0.62, M['galv'])
    # 레펠 암 (+Y 로 돌출) + 로프
    for ax in (-1.0, 1.0):
        parts.append(box('arm', 0.16, 2.2, 0.24, ax, A + 1.0, TOP + 0.42, M['steel_dk'], bev=0.02))
        parts.append(strut('armstay', (ax, A + 1.9, TOP + 0.34), (ax, A + 0.1, TOP + 1.5), 0.04, M['galv']))
        parts.append(torus('ring', 0.12, 0.025, ax, A + 1.9, TOP + 0.28, M['chrome'],
                           rot=(math.pi / 2, 0, 0), maj=10, mnr=5))
        parts.append(strut('rope', (ax, A + 1.9, TOP + 0.2), (ax + 0.15, A + 2.3, 0.05), 0.022, M['white']))
    # 클라이밍 판 (+X 면) + 홀드
    parts.append(box('climb', 0.12, 2 * A, TOP - 0.6, A + 0.16, 0, (TOP - 0.6) / 2 + 0.3, M['timber'], bev=0.02))
    rng = np.random.default_rng(5)
    for i in range(18):
        hy = float(rng.uniform(-A + 0.25, A - 0.25))
        hz = float(rng.uniform(0.7, TOP - 0.5))
        parts.append(sph('hold', 0.11, A + 0.26, hy, hz, [M['warn'], M['red'], M['paint_y']][i % 3],
                         seg=8, s=(0.6, 1, 1)))
    # 착지 매트 + 안전 표지
    parts.append(box('mat', 3.4, 2.4, 0.3, 0.4, A + 2.6, 0.15, M['maroon'], bev=0.06))
    parts.append(box('mat', 3.4, 2.4, 0.3, 0.4, A + 5.0, 0.15, M['maroon'], bev=0.06))
    parts.append(cyl('signp', 0.035, 2.2, -A - 1.3, -A - 1.3, 1.1, M['galv'], verts=8))
    parts.append(box('sign', 0.72, 0.05, 0.5, -A - 1.3, -A - 1.3, 2.0, M['warn'], rz=math.radians(30)))
    return join_as(parts, 'FAC_RAPPEL_TOWER')

def build_obst_wall():
    """장애물 — 2.4m 판벽 + 뒤편 계단 + 기초."""
    parts = []
    parts.append(box('wall', 3.6, 0.28, 2.4, 0, 0, 1.2, M['timber'], bev=0.03))
    for px in (-1.85, 1.85):
        parts.append(box('post', 0.24, 0.5, 2.7, px, 0, 1.35, M['timber'], bev=0.03))
        parts.append(strut('brace', (px, 0.9, 0.15), (px, 0.2, 2.2), 0.07, M['timber']))
    for i in range(4):
        parts.append(box('rung', 3.4, 0.09, 0.09, 0, 0.16, 0.55 + i * 0.5, M['timber']))
    for i in range(3):                               # 뒤편 계단
        parts.append(box('step', 3.4, 0.5, 0.14, 0, 0.55 + i * 0.5, 0.9 - i * 0.35, M['timber']))
    parts.append(box('sand', 4.6, 2.0, 0.1, 0, -1.2, 0.05, M['sand']))
    return join_as(parts, 'FAC_OBST_WALL')

def build_obst_bars():
    """장애물 — 6m 구름사다리 (양단 A형 프레임 + 가로봉)."""
    parts = []
    for f in (-1, 1):
        for dx in (-0.55, 0.55):
            parts.append(strut('frame', (dx, f * 3.0, 0.0), (dx * 0.35, f * 2.55, 2.55), 0.075, M['galv']))
        parts.append(box('foot', 1.5, 0.4, 0.2, 0, f * 2.85, 0.1, M['conc'], bev=0.02))
    for dx in (-0.2, 0.2):
        parts.append(strut('rail', (dx, -2.6, 2.5), (dx, 2.6, 2.5), 0.055, M['galv']))
    for ry in np.linspace(-2.4, 2.4, 12):
        parts.append(strut('bar', (-0.24, ry, 2.5), (0.24, ry, 2.5), 0.028, M['chrome'], verts=6))
    parts.append(box('sand', 1.8, 6.4, 0.1, 0, 0, 0.05, M['sand']))
    return join_as(parts, 'FAC_OBST_BARS')

def build_obst_beam():
    """장애물 — 평균대 2련 (지그재그 목재 빔 + 받침)."""
    parts = []
    for i, (dx, ang) in enumerate([(-0.9, 6.0), (0.9, -6.0)]):
        parts.append(box('beam', 0.22, 5.6, 0.24, dx, 0, 0.62, M['timber'], rz=math.radians(ang), bev=0.02))
        for by in (-2.4, 0, 2.4):
            parts.append(box('trestle', 0.5, 0.24, 0.5, dx + by * math.sin(math.radians(ang)) * -1,
                             by, 0.25, M['timber'], bev=0.02))
    parts.append(box('sand', 3.4, 6.4, 0.1, 0, 0, 0.05, M['sand']))
    return join_as(parts, 'FAC_OBST_BEAM')

def build_obst_tires():
    """장애물 — 타이어 지그재그 (2열 x 6)."""
    parts = []
    for i in range(6):
        for j, dx in enumerate((-0.62, 0.62)):
            parts.append(torus('tire', 0.42, 0.15, dx, -2.75 + i * 1.1, 0.16, M['rubber'], maj=12, mnr=6))
            parts.append(cyl('tirerim', 0.28, 0.04, dx, -2.75 + i * 1.1, 0.16, M['dark'], verts=10))
    parts.append(box('sand', 2.6, 7.4, 0.09, 0, 0, 0.045, M['sand']))
    return join_as(parts, 'FAC_OBST_TIRES')

def build_pullup():
    """철봉대 — 3단 높이 + 평행봉."""
    parts = []
    for f in (-1, 1):
        parts.append(cyl('post', 0.075, 2.7, f * 2.2, 0, 1.35, M['galv'], verts=8))
        parts.append(cyl('base', 0.3, 0.16, f * 2.2, 0, 0.08, M['conc'], verts=8))
    for zz in (1.5, 2.0, 2.5):
        parts.append(strut('bar', (-2.2, 0, zz), (2.2, 0, zz), 0.028, M['chrome'], verts=8))
    for f in (-1, 1):                                # 평행봉
        parts.append(strut('pbar', (-1.4, f * 0.5, 1.45), (1.4, f * 0.5, 1.45), 0.035, M['timber'], verts=8))
        for px in (-1.2, 0, 1.2):
            parts.append(cyl('ppost', 0.05, 1.45, px, f * 0.5, 0.72, M['galv'], verts=6))
    parts.append(box('sand', 5.2, 2.4, 0.09, 0, 0, 0.045, M['sand']))
    return join_as(parts, 'FAC_PULLUP')

def build_stand():
    """사열대 — 3단 단상 + 지붕 + 국기게양대 + 현수막 프레임."""
    parts = []
    for i in range(3):
        parts.append(box('tier', 5.4 - i * 0.6, 2.4 - i * 0.5, 0.34, 0, -0.2 + i * 0.25,
                         0.17 + i * 0.34, M['conc'], bev=0.03))
    parts.append(box('podium', 0.7, 0.5, 1.15, 0, 0.3, 1.6, M['timber'], bev=0.03))
    parts.append(box('podtop', 0.85, 0.62, 0.07, 0, 0.3, 2.2, M['timber'], bev=0.02))
    railing(parts, -2.3, 2.3, -0.6, 0.9, 1.02, 1.0, mat=M['galv'], step=1.1)
    for px in (-2.6, 2.6):                           # 지붕
        parts.append(cyl('rpost', 0.09, 3.4, px, -0.6, 1.7, M['galv'], verts=8))
        parts.append(cyl('rpost', 0.09, 3.4, px, 1.0, 1.7, M['galv'], verts=8))
    parts.append(box('roof', 6.0, 2.6, 0.12, 0, 0.2, 3.45, M['roofm'], bev=0.02))
    parts.append(box('fascia', 6.0, 0.2, 0.36, 0, -1.05, 3.28, M['navy']))
    parts.append(text3d('stand_t', 'GP-107', 0.28, 0, -1.16, 3.28, M['white'], rot=(math.pi / 2, 0, math.pi)))
    for fx in (-3.4, 3.4):
        parts.append(cyl('flagp', 0.05, 6.5, fx, 0.2, 3.25, M['white'], verts=8))
        parts.append(sph('flagk', 0.08, fx, 0.2, 6.55, M['paint_y'], seg=10))
    parts.append(box('flag', 0.03, 0.95, 0.62, -3.36, 0.7, 5.7, M['white']))
    parts.append(box('flag', 0.03, 0.95, 0.62, 3.44, 0.7, 5.7, M['red']))
    return join_as(parts, 'FAC_STAND')

# ═════════════════ 8) 공용 프롭 ═════════════════
def build_lightmast():
    """9m 조명탑 — 테이퍼 폴 + 크로스암 + 투광등 3 + 배전함. 야간 데모에서 실제로 빛난다."""
    parts = []
    parts.append(box('base', 0.8, 0.8, 0.3, 0, 0, 0.15, M['conc'], bev=0.03))
    parts.append(cyl('pole', 0.17, 8.7, 0, 0, 4.65, M['galv'], verts=10, rtop=0.1))
    for i in range(3):                               # 폴 밴드
        parts.append(cyl('band', 0.175 - i * 0.02, 0.1, 0, 0, 1.8 + i * 2.9, M['steel_dk'], verts=10))
    parts.append(box('arm', 0.12, 2.6, 0.14, 0, 0.9, 8.9, M['galv'], bev=0.02))
    parts.append(strut('armstay', (0, 2.1, 8.86), (0, 0.15, 7.9), 0.03, M['galv']))
    for (ly, lrz) in [(-0.1, 0.0), (1.0, 0.22), (2.0, -0.22)]:
        parts.append(box('head', 0.62, 0.46, 0.2, 0, ly, 8.72, M['steel_dk'], rz=lrz, bev=0.03))
        parts.append(box('lens', 0.54, 0.4, 0.06, 0, ly, 8.6, M['lamp'], rz=lrz))
        parts.append(strut('hstay', (0, ly, 8.84), (0, ly - 0.25, 9.0), 0.02, M['galv']))
    parts.append(box('cab', 0.42, 0.28, 0.66, 0.26, 0, 1.25, M['galv'], bev=0.02))
    parts.append(box('cabdoor', 0.03, 0.22, 0.5, 0.48, 0, 1.25, M['steel_dk']))
    parts.append(cyl('conduit', 0.05, 1.1, 0.2, 0, 0.5, M['dark'], verts=6))
    return join_as(parts, 'FAC_LIGHTMAST')

def build_shed():
    """장비 창고 4.2 x 3.0 — 골강판 셸 + 롤업 도어 + 처마."""
    parts = []
    parts.append(box('slab', 4.6, 3.4, 0.16, 0, 0, 0.08, M['conc'], bev=0.02))
    parts.append(box('shell', 4.2, 3.0, 2.5, 0, 0, 1.4, M['roofm'], bev=0.03))
    parts.append(box('roof', 4.7, 3.5, 0.12, 0, 0, 2.72, M['roofm'], rx=math.radians(5), bev=0.02))
    parts.append(box('ridge', 4.7, 0.3, 0.16, 0, 0, 2.86, M['steel_dk']))
    parts.append(box('rollup', 2.4, 0.06, 2.1, 0, -1.52, 1.2, M['galv']))
    parts.append(box('rollbox', 2.6, 0.28, 0.28, 0, -1.62, 2.42, M['steel_dk']))
    for dx in (-1.25, 1.25):
        parts.append(box('jamb', 0.1, 0.12, 2.2, dx, -1.54, 1.25, M['steel_dk']))
    parts.append(box('vent', 0.7, 0.06, 0.32, 1.4, 1.52, 2.1, M['dark']))
    parts.append(box('sign', 0.9, 0.05, 0.28, -1.3, -1.56, 2.28, M['acc_generic']))
    return join_as(parts, 'FAC_SHED')

# ═════════════════ 9) 감시자산 — 같은 모델을 쓰던 두 쌍을 갈라 놓는다 ═════════════════
# EO/IR 이 `sns_cam_mast.glb` 하나를, K6/K4 가 `sns_weapon_mount.glb` 하나를 같이 썼다.
# 지도 위에서 자산 종류를 눈으로 구분할 수 없다는 뜻이다 — 배치 도구로서는 결함이다.
def build_cam_mast_ir():
    """IR 열상(TOD) 마스트 9m — 단일 대구경 게르마늄 창 + 차양 후드 + LRF + 냉각기.

    EO 마스트(sns_cam_mast.glb)는 EO·IR 두 헤드를 나란히 단 듀얼 하우징이다. 열상 전용
    초소가 그 모델을 쓰면 없는 주간 채널이 달려 보인다. 실루엣도 갈라 놓는다 —
    큰 각형 하우징 + 후드가 멀리서도 광학 마스트와 구분된다."""
    parts = []
    HH = 9.0
    parts.append(box('footing', 1.4, 1.4, 0.35, 0, 0, 0.17, M['conc'], bev=0.03))
    parts.append(cyl('pole', 0.12, HH, 0, 0, HH / 2 + 0.3, M['galv'], verts=12, rtop=0.08))
    for i in range(4):
        parts.append(cyl('band', 0.13 - i * 0.008, 0.09, 0, 0, 1.6 + i * 1.9, M['steel_dk'], verts=10))
    for a in range(3):
        ang = a * 2 * math.pi / 3 + 0.4
        ax, ay = 2.8 * math.cos(ang), 2.8 * math.sin(ang)
        parts.append(strut('guy', (0, 0, HH - 0.7), (ax, ay, 0.15), 0.013, M['dark']))
        parts.append(box('anchor', 0.35, 0.35, 0.25, ax, ay, 0.12, M['conc']))
    tz = HH + 0.3
    parts.append(cyl('pt_base', 0.16, 0.34, 0, 0, tz, M['steel_dk'], verts=10))
    for sx in (-0.34, 0.34):
        parts.append(box('yoke', 0.09, 0.16, 0.5, sx, 0, tz + 0.42, M['steel_dk'], bev=0.02))
    parts.append(cyl('trunnion', 0.05, 0.8, 0, 0, tz + 0.55, M['chrome'], verts=8, rot=(0, math.pi / 2, 0)))
    parts.append(box('ir_house', 0.46, 0.9, 0.44, 0, -0.05, tz + 0.55, M['olive_dk'], bev=0.03))
    for i in range(6):                                        # 냉각 핀
        parts.append(box('fin', 0.5, 0.03, 0.36, 0, 0.16 + i * 0.055, tz + 0.55, M['galv']))
    parts.append(box('hood', 0.56, 0.34, 0.05, 0, -0.62, tz + 0.79, M['olive']))
    for sx in (-0.27, 0.27):
        parts.append(box('hoodside', 0.04, 0.34, 0.24, sx, -0.62, tz + 0.66, M['olive']))
    parts.append(cyl('ge_win', 0.15, 0.04, 0, -0.5, tz + 0.55, M['irlens'], verts=16, rot=(math.pi / 2, 0, 0)))
    parts.append(cyl('ge_ring', 0.17, 0.05, 0, -0.47, tz + 0.55, M['steel_dk'], verts=16, rot=(math.pi / 2, 0, 0)))
    parts.append(cyl('lrf', 0.05, 0.4, 0.3, -0.35, tz + 0.4, M['steel_dk'], verts=10, rot=(math.pi / 2, 0, 0)))
    parts.append(cyl('lrf_lens', 0.04, 0.02, 0.3, -0.56, tz + 0.4, M['red'], verts=10, rot=(math.pi / 2, 0, 0)))
    parts.append(box('sunshield', 0.8, 0.9, 0.04, 0, -0.1, tz + 0.86, M['white']))
    parts.append(box('jbox', 0.5, 0.34, 0.7, 0.4, 0.18, 1.25, M['olive'], bev=0.02))
    parts.append(box('cryo', 0.3, 0.3, 0.45, -0.45, 0.3, 0.9, M['galv'], bev=0.02))   # 냉각기
    parts.append(cyl('cable', 0.028, HH - 1.2, 0.14, 0.06, (HH - 1.2) / 2 + 1.0, M['dark'], verts=6))
    parts.append(cyl('rod', 0.012, 1.2, 0, 0, HH + 1.3, M['galv'], verts=6))
    return join_as(parts, 'SNS_CAM_MAST_IR')

def build_weapon_agl():
    """K4 40mm 고속유탄 진지 — 드럼 탄통 + 짧고 굵은 총열 + 넓은 삼각대.

    K6(sns_weapon_mount.glb)와 같은 모델을 쓰면 지도에서 화기 종류를 구분할 수 없다.
    드럼과 총열 길이가 둘을 가르는 표식이다."""
    parts = []
    cyy, rr = 0.3, 1.75
    for layer in range(4):                                    # U자 모래주머니 (K6 보다 한 겹 높다)
        n = 13 - layer
        for k in range(n):
            a = math.radians(195 + k * (150 / (n - 1)))
            bx, by = rr * math.cos(a), cyy + rr * math.sin(a) * -1
            parts.append(box('sbag', 0.44, 0.25, 0.16, bx, by - 0.6, 0.08 + layer * 0.155, M['sand'],
                             rz=-a + math.pi / 2, bev=0.05))
    apex = (0, -0.1, 0.8)
    for a in range(3):
        ang = a * 2 * math.pi / 3 + math.pi / 2
        fx, fy = 0.75 * math.cos(ang), -0.1 + 0.75 * math.sin(ang)
        parts.append(strut('tleg', (fx, fy, 0.02), apex, 0.042, M['gun']))
        parts.append(box('spade', 0.16, 0.2, 0.05, fx, fy, 0.03, M['gun']))
    parts.append(box('te', 0.14, 0.18, 0.26, 0, 0.16, 0.78, M['gun'], bev=0.02))
    parts.append(cyl('teknob', 0.05, 0.1, 0, 0.28, 0.72, M['chrome'], verts=8, rot=(math.pi / 2, 0, 0)))
    parts.append(box('cradle', 0.26, 0.34, 0.12, 0, -0.1, 0.86, M['gun'], bev=0.02))
    parts.append(box('receiver', 0.22, 0.72, 0.24, 0, -0.32, 1.0, M['gun'], bev=0.02))
    parts.append(box('topcover', 0.2, 0.5, 0.06, 0, -0.3, 1.15, M['dark']))
    parts.append(cyl('barrel', 0.055, 0.62, 0, -0.95, 1.0, M['gun'], verts=12, rot=(math.pi / 2, 0, 0)))
    parts.append(cyl('muzzle', 0.075, 0.1, 0, -1.28, 1.0, M['dark'], verts=12, rot=(math.pi / 2, 0, 0)))
    parts.append(cyl('drum', 0.24, 0.3, 0.33, -0.2, 0.92, M['olive_dk'], verts=16, rot=(0, math.pi / 2, 0)))
    parts.append(cyl('drumcap', 0.25, 0.04, 0.49, -0.2, 0.92, M['olive'], verts=16, rot=(0, math.pi / 2, 0)))
    parts.append(box('feed', 0.22, 0.1, 0.06, 0.2, -0.24, 1.06, M['brass'], rz=0.2))
    parts.append(box('sight', 0.07, 0.16, 0.12, -0.14, -0.42, 1.2, M['dark']))
    parts.append(cyl('scope', 0.035, 0.22, -0.14, -0.5, 1.24, M['dark'], verts=10, rot=(math.pi / 2, 0, 0)))
    parts.append(box('grip', 0.2, 0.12, 0.16, 0, 0.06, 0.98, M['dark']))
    for i in range(2):
        parts.append(cyl('sparedrum', 0.24, 0.28, -0.75 + i * 0.62, 0.62, 0.24, M['olive_dk'],
                         verts=14, rot=(0, math.pi / 2, 0)))
    return join_as(parts, 'SNS_WEAPON_AGL')

# ═════════════════ 빌드 → 내보내기 → 컨택트시트 ═════════════════

# ═══════════════════════════════════════════════════════════════════════════
# v3 로 넘어간 산출물 — 여기서 다시 구우면 옛 규격(캐노니컬 12×8, 개구부 없음)이
# 같은 파일명을 덮어써서 조용히 망가진다. 이 스크립트는 이제 **야외 구획 프롭 키트**
# 만 소유한다. 셸(office/edu/generic)·기초(stem)는 build_facilities3.py 소유다.
SUPERSEDED_BY_V3 = {
    'fac_office_main.glb', 'fac_office_roof.glb', 'fac_office_floor.glb',
    'fac_edu_main.glb', 'fac_edu_roof.glb',
    'fac_generic_main.glb', 'fac_generic_roof.glb',
    'fac_stem.glb',
}
# ═══════════════════════════════════════════════════════════════════════════

BUILDS = [
    (build_office_main, 'fac_office_main.glb'),
    (build_office_floor, 'fac_office_floor.glb'),
    (build_office_roof, 'fac_office_roof.glb'),
    (build_edu_main, 'fac_edu_main.glb'),
    (build_edu_roof, 'fac_edu_roof.glb'),
    (build_generic_main, 'fac_generic_main.glb'),
    (build_generic_roof, 'fac_generic_roof.glb'),
    (build_stem, 'fac_stem.glb'),
    (build_yard_asphalt, 'fac_yard_asphalt.glb'),
    (build_yard_gravel, 'fac_yard_gravel.glb'),
    (build_stall, 'fac_stall.glb'),
    (build_carport, 'fac_carport.glb'),
    (build_sedan, 'veh_sedan.glb'),
    (build_truck, 'veh_truck.glb'),
    (build_revet, 'fac_revet.glb'),
    (build_camonet, 'fac_camonet.glb'),
    (build_polpoint, 'fac_polpoint.glb'),
    (build_rappel_tower, 'fac_rappel_tower.glb'),
    (build_obst_wall, 'fac_obst_wall.glb'),
    (build_obst_bars, 'fac_obst_bars.glb'),
    (build_obst_beam, 'fac_obst_beam.glb'),
    (build_obst_tires, 'fac_obst_tires.glb'),
    (build_pullup, 'fac_pullup.glb'),
    (build_stand, 'fac_stand.glb'),
    (build_lightmast, 'fac_lightmast.glb'),
    (build_shed, 'fac_shed.glb'),
    (build_cam_mast_ir, 'sns_cam_mast_ir.glb'),
    (build_weapon_agl, 'sns_weapon_agl.glb'),
]

try:
    built = {}
    for fn, fname in BUILDS:
        if fname in SUPERSEDED_BY_V3:
            print('skip (v3 소유):', fname)
            continue
        print('== ' + fname + ' ==')
        ob = fn()
        export_glb(ob, fname)
        ob.location = (400, len(built) * 30, 0)      # 대기 위치 (컨택트시트에서 복사해 쓴다)
        built[fname] = ob

    def put(key, x, y, z=0.0, rz=0.0):
        src = built[key]
        cp = src.copy()
        cp.location = (x, y, z)
        cp.rotation_euler = (0, 0, rz)
        scene.collection.objects.link(cp)
        return cp

    # ── A: 건물형 3동 (사무 2층 · 교육 1층 · 범용 1층) ──
    put('fac_office_main.glb', -16, 0)
    put('fac_office_floor.glb', -16, 0, H)
    put('fac_office_roof.glb', -16, 0, 2 * H)
    put('fac_edu_main.glb', 0, 0)
    put('fac_edu_roof.glb', 0, 0, H)
    put('fac_generic_main.glb', 16, 0)
    put('fac_generic_roof.glb', 16, 0, H)

    # ── B: 주차 구획 (28.2 x 18.8 실제 기본값 재현) ──
    OX, OY = 0, -46
    for gx in range(-1, 2):
        for gy in range(-1, 2):
            put('fac_yard_asphalt.glb', OX + gx * 12, OY + gy * 8)
    for i, sx in enumerate(np.arange(-11.25, 12.0, 5.0)):
        put('fac_stall.glb', OX + sx, OY - 5.6)
        for j, dx in enumerate((-1.25, 1.25)):
            if (i * 2 + j) % 3 != 2:
                put('veh_sedan.glb', OX + sx + dx, OY - 5.6 + 0.2, 0.12, math.pi)
    for i, sx in enumerate(np.arange(-11.25, 12.0, 5.0)):
        put('fac_stall.glb', OX + sx, OY + 5.6, 0, math.pi)
        for j, dx in enumerate((-1.25, 1.25)):
            if (i * 2 + j) % 4 == 1:
                put('veh_sedan.glb', OX + sx + dx, OY + 5.6 - 0.2, 0.12)
    for cx in (-8.4, -2.8, 2.8, 8.4):
        put('fac_carport.glb', OX + cx, OY + 6.4, 0.12, math.pi)
    for lx in (-13.0, 13.0):
        put('fac_lightmast.glb', OX + lx, OY, 0.12)

    # ── C: 군용주차 + 훈련 ──
    VX, VY = -44, -46
    for gx in range(-1, 2):
        for gy in range(-1, 2):
            put('fac_yard_gravel.glb', VX + gx * 12, VY + gy * 8)
    for rx in (-11.0, 0.0, 11.0):
        put('fac_revet.glb', VX + rx, VY + 2.0, 0.14, math.pi / 2)
    for tx in (-5.6, 5.6):
        put('veh_truck.glb', VX + tx, VY + 1.0, 0.14)
    put('fac_camonet.glb', VX, VY - 7.0, 0.14)
    put('veh_truck.glb', VX - 2.6, VY - 7.5, 0.14, 0.12)
    put('fac_polpoint.glb', VX + 12.0, VY - 8.0, 0.14)
    put('fac_lightmast.glb', VX - 13.5, VY + 8.0, 0.14)

    TX, TY = 40, -46
    for gx in range(-1, 2):
        for gy in range(-1, 2):
            put('fac_yard_gravel.glb', TX + gx * 12, TY + gy * 8)
    put('fac_rappel_tower.glb', TX - 9.0, TY + 4.0, 0.14)
    put('fac_obst_wall.glb', TX + 2.0, TY + 6.0, 0.14)
    put('fac_obst_bars.glb', TX + 8.0, TY + 3.0, 0.14)
    put('fac_obst_beam.glb', TX + 13.0, TY - 2.0, 0.14)
    put('fac_obst_tires.glb', TX + 2.0, TY - 4.0, 0.14)
    put('fac_pullup.glb', TX - 6.0, TY - 7.0, 0.14)
    put('fac_stand.glb', TX + 9.0, TY - 8.0, 0.14, math.pi)
    put('fac_shed.glb', TX - 13.0, TY - 7.0, 0.14)
    put('fac_lightmast.glb', TX - 13.0, TY + 8.0, 0.14)

    # ── D: 감시자산 신규 2종 ──
    put('sns_cam_mast_ir.glb', -70, 6)
    put('sns_weapon_agl.glb', -62, 4)

    # 지면 · 조명 · 카메라
    bpy.ops.mesh.primitive_plane_add(size=260, location=(0, -30, -0.03))
    g = bpy.context.active_object
    g.data.materials.append(mk_mat('gm_ground', srgb('#6b6353'), 0, 0.95))
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 4.0
    so = bpy.data.objects.new('sun', sun)
    so.rotation_euler = (math.radians(52), 0, math.radians(130))
    scene.collection.objects.link(so)
    world = bpy.data.worlds.new('W')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.45, 0.55, 0.68, 1)
    scene.world = world
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 950

    def shoot(loc, target, path):
        cam.location = loc
        d = mathutils.Vector(target) - mathutils.Vector(loc)
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('  render ->', path)

    shoot((0, -34, 22), (0, 0, 3), os.path.join(RND, 'render_fac2_a.png'))       # 건물형 3동
    shoot((6, -86, 26), (0, -46, 2), os.path.join(RND, 'render_fac2_b.png'))     # 주차 구획
    shoot((-46, -84, 28), (-44, -46, 3), os.path.join(RND, 'render_fac2_c.png')) # 군용주차 구획
    shoot((40, -82, 26), (40, -46, 3), os.path.join(RND, 'render_fac2_d.png'))   # 훈련 구획
    shoot((22, -60, 9), (31, -42, 4.5), os.path.join(RND, 'render_fac2_e.png'))  # 레펠탑 근접
    shoot((-57, -9, 9.5), (-66.5, 5.0, 6.0), os.path.join(RND, 'render_fac2_f.png'))  # 감시자산 2종
    print('== DONE ==', len(EXPORTED), 'files')
    for row in EXPORTED:
        print('   %-26s faces=%-6d %dKB' % row)
except Exception:
    traceback.print_exc()
    sys.exit(1)
