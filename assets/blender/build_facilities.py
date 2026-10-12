# -*- coding: utf-8 -*-
# ┌─────────────────────────────────────────────────────────────────────────┐
# │  ⚠ 이 스크립트가 굽던 GLB 는 전부 build_facilities3.py 로 넘어갔다.        │
# │                                                                         │
# │  캐노니컬이 12×8 에서 **14×11** 로 바뀌었고(동 배치 규약), 셸에는 불리언   │
# │  개구부와 PBR 3매 텍스처가 들어갔다. 이 파일을 그대로 실행하면 같은        │
# │  파일명에 **옛 규격 셸을 덮어써서** 창문이 다시 벽 안에 묻히고 동 배율이   │
# │  틀어진다. 그래서 실행을 막아 두었다 — 기록·참고용으로만 남긴다.          │
# │                                                                         │
# │  정말 옛 모델이 필요하면 아래 GUARD 를 지우고 다른 OUT 경로로 구워라.     │
# └─────────────────────────────────────────────────────────────────────────┘
import sys
if '--i-know-this-overwrites-v3' not in sys.argv:
    print('build_facilities.py 는 build_facilities3.py 로 대체되었습니다. '
          '덮어쓰기를 막기 위해 중단합니다.')
    sys.exit(0)

"""
GP Digital Twin 배치 시설 10종 3D 모델 — 전용 헤드리스 Blender 빌드
  blender --background --factory-startup --python build_facilities.py

규격 (js/buildingModels.js 와 계약):
  캐노니컬 풋프린트 12(X)×8(Y)m, 벽체는 10.8×6.8 (0.6m 앞치마에 소품), 층고 3.2m, 정면 −Y
  분할형: fac_<id>_main.glb(1층부, z0=지면) + fac_<id>_roof.glb(지붕, z0=벽체 상단)
          반복층은 fac_floor.glb 공용 (경계초소만 전용 fac_security_floor.glb)
  단일형: fac_storage.glb(탄약고 이글루), fac_entry.glb(위병소) — 층수 무시
런타임: X=width/12, Y=depth/8 스케일. 패널 줄눈·창문 열은 스트레치에 강하게 균일 배치.
검증 렌더: assets/blender/render_fac_a.png / render_fac_b.png
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
    f = np.zeros((n, n))
    for o in octaves:
        f += _smooth(np.kron(rng.random((o, o)), np.ones((n // o, n // o))), 2) / len(octaves)
    return (f - f.min()) / (np.ptp(f) + 1e-9)

def pack_image(name, arr):
    im = bpy.data.images.new(name, arr.shape[1], arr.shape[0], alpha=True)
    im.pixels.foreach_set(arr.astype(np.float32).ravel())
    im.pack()
    return im

def make_camo(N=256, cell=8):
    colors = [srgb('#4a5240'), srgb('#333b2c'), srgb('#5c5744'), srgb('#23281e')]
    f = _smooth(np.random.default_rng(7).random((N // cell, N // cell)), 3)
    idx = np.digitize(f, np.quantile(f, [0.28, 0.55, 0.8]))
    img = np.zeros((*f.shape, 4), dtype=np.float32)
    for i, c in enumerate(colors):
        img[idx == i] = (*c, 1.0)
    return pack_image('f_camo', np.kron(img, np.ones((cell, cell, 1), dtype=np.float32)))

def make_concrete(N=256):
    base = np.array(srgb('#8f8a80'))
    f = noise2d(N, (4, 8, 32), seed=3)
    img = np.zeros((N, N, 4), dtype=np.float32)
    img[..., :3] = base * (0.78 + 0.34 * f)[..., None]
    rng = np.random.default_rng(4)
    img[rng.random((N, N)) > 0.994, :3] *= 0.5
    img[..., 3] = 1.0
    return pack_image('f_concrete', img)

def make_panel(name, base_hex, N=128, seam=16):
    """샌드위치 패널 — 세로 줄눈 (X/Y 스트레치에 강함)"""
    base = np.array(srgb(base_hex))
    f = noise2d(N, (8, 32), seed=9)
    img = np.zeros((N, N, 4), dtype=np.float32)
    img[..., :3] = base * (0.92 + 0.12 * f)[..., None]
    img[:, ::seam, :3] *= 0.72                       # 줄눈
    img[:6, :, :3] *= 0.8                            # 하단 굽도리
    img[..., 3] = 1.0
    return pack_image(name, img)

def make_roofmetal(N=128):
    base = np.array(srgb('#49525a'))
    img = np.zeros((N, N, 4), dtype=np.float32)
    x = np.arange(N)
    prof = 0.85 + 0.3 * np.abs(((x % 8) - 4) / 4.0)  # 골강판 주름
    img[..., :3] = base * prof[None, :, None]
    img[..., 3] = 1.0
    return pack_image('f_roofmetal', img)

def make_redcross(N=64):
    img = np.ones((N, N, 4), dtype=np.float32)
    red = srgb('#c8102e')
    t = N // 5
    img[2 * t:3 * t, t // 2:N - t // 2, :3] = red
    img[t // 2:N - t // 2, 2 * t:3 * t, :3] = red
    return pack_image('f_redcross', img)

def make_stripes(N=64):
    img = np.zeros((N, N, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:N, 0:N]
    band = ((xx + yy) // 8) % 2 == 0
    img[band, :3] = srgb('#e07a24')
    img[~band, :3] = srgb('#191919')
    img[..., 3] = 1.0
    return pack_image('f_stripes', img)

def make_earth(N=128):
    base = np.array(srgb('#5d5a42'))
    f = noise2d(N, (4, 16), seed=11)
    img = np.zeros((N, N, 4), dtype=np.float32)
    img[..., :3] = base * (0.75 + 0.4 * f)[..., None]
    img[..., 3] = 1.0
    return pack_image('f_earth', img)

CAMO, CONC, ROOFM = make_camo(), make_concrete(), make_roofmetal()
PANEL = make_panel('f_panel', '#aab3a0')
PANELW = make_panel('f_panelw', '#d8dcd4')
REDX, STRIPES, EARTH = make_redcross(), make_stripes(), make_earth()

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
    'camo':    tex_mat('fm_camo', CAMO, rough=0.72),
    'camonet': tex_mat('fm_camonet', CAMO, rough=0.9, alpha=0.62),
    'conc':    tex_mat('fm_conc', CONC, rough=0.93),
    'panel':   tex_mat('fm_panel', PANEL, rough=0.6),
    'panelw':  tex_mat('fm_panelw', PANELW, rough=0.55),
    'roofm':   tex_mat('fm_roofm', ROOFM, metallic=0.4, rough=0.55),
    'redx':    tex_mat('fm_redx', REDX, rough=0.5),
    'stripes': tex_mat('fm_stripes', STRIPES, rough=0.5),
    'earth':   tex_mat('fm_earth', EARTH, rough=0.98),
    'olive':    mk_mat('fm_olive',    srgb('#4d5a47'), 0.15, 0.55),
    'olive_dk': mk_mat('fm_olive_dk', srgb('#3a4437'), 0.15, 0.6),
    'galv':     mk_mat('fm_galv',     srgb('#7e878c'), 0.9,  0.42),
    'steel_dk': mk_mat('fm_steel_dk', srgb('#3c4348'), 0.8,  0.5),
    'glass':    mk_mat('fm_glass',    srgb('#0f1d26'), 0.1,  0.08, alpha=0.5),
    'dark':     mk_mat('fm_dark',     srgb('#22262a'), 0.2,  0.7),
    'warn':     mk_mat('fm_warn',     srgb('#e07a24'), 0.0,  0.5),
    'red':      mk_mat('fm_red',      srgb('#b3202a'), 0.0,  0.5),
    'white':    mk_mat('fm_white',    srgb('#cfd4cd'), 0.0,  0.45),
    'blue':     mk_mat('fm_blue',     srgb('#2b4a6b'), 0.1,  0.5),
    'lamp':     mk_mat('fm_lamp',     srgb('#ffe8b0'), 0.0, 0.2, emit=(1.0, 0.85, 0.55), emit_str=4.0),
    'stain':    mk_mat('fm_stain',    srgb('#1c1a16'), 0.0, 0.9, alpha=0.55),
}
ACCENT = {  # 카탈로그 색 → 파사드 트림 밴드 (UI 색과 시각 연결)
    'command': '#5eb1ef', 'security': '#ed5d5d', 'living': '#3dd68c', 'welfare': '#63c9a8',
    'hygiene': '#7fd0e8', 'medical': '#f2909a', 'storage': '#c9a86a', 'maint': '#b18cff',
    'infra': '#e3b341', 'entry': '#8494a6',
}
for k, v in ACCENT.items():
    M['acc_' + k] = mk_mat('fm_acc_' + k, srgb(v), 0.1, 0.5)

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

def cyl(name, r, depth, x, y, z, mat, verts=14, rot=(0, 0, 0), rtop=None):
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

def strut(name, p1, p2, r, mat, verts=8):
    v1, v2 = mathutils.Vector(p1), mathutils.Vector(p2)
    d = v2 - v1
    mid = (v1 + v2) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=mid)
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
    print(f'  -> {fname}  tris={len(ob.data.polygons)}  {os.path.getsize(path)//1024}KB')

# ═════════════════ 공용 파사드 요소 ═════════════════
W2, D2, H = 10.8, 6.8, 3.2   # 벽체 (0.6m 앞치마), 층고

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
    """완경사 골강판 지붕 + 파라펫 물받이"""
    parts.append(box('roofslab', W2 + overhang, D2 + overhang, 0.12, 0, 0, z0 + 0.06, M['roofm'], bev=0.02))
    parts.append(box('ridge', W2 + overhang, 1.2, ridge, 0, 0, z0 + 0.12 + ridge / 2 - 0.06, M['roofm'], bev=0.02))

# ═════════════════ 반복층 (공용 / 경계초소) ═════════════════
def build_floor_generic():
    parts = []
    shell(parts, M['panel'])
    windows_row(parts, 4, 1.75)
    parts.append(box('slabline', W2 + 0.1, D2 + 0.1, 0.1, 0, 0, 0.05, M['steel_dk']))
    return join_as(parts, 'FAC_FLOOR')

def build_floor_security():
    parts = []
    shell(parts, M['conc'])
    for f in (-1, 1):
        for x in (-3.2, 0, 3.2):
            parts.append(box('slit', 1.0, 0.1, 0.28, x, f * (D2 / 2 + 0.01), 2.1, M['dark']))
        for y in (-1.6, 1.6):
            parts.append(box('slit', 0.1, 0.8, 0.28, f * (W2 / 2 + 0.01), y, 2.1, M['dark']))
    parts.append(box('slabline', W2 + 0.1, D2 + 0.1, 0.1, 0, 0, 0.05, M['conc']))
    return join_as(parts, 'FAC_SECURITY_FLOOR')

# ═════════════════ 1) 지휘 구역 ═════════════════
def build_command_main():
    parts = []
    shell(parts, M['conc'], 'command')
    door(parts, 0, 1.0, 2.1, M['steel_dk'], double=True)
    canopy(parts, 0, 3.2, 1.4)
    for f in (-1, 1):                                        # 고창 슬릿
        for x in (-3.6, -1.8, 1.8, 3.6):
            parts.append(box('slit', 1.2, 0.1, 0.35, x, f * (D2 / 2 + 0.01), 2.55, M['dark']))
    parts.append(box('blastwall', 4.2, 0.4, 1.8, 0, -D2 / 2 - 1.9, 0.9, M['conc'], bev=0.04))  # 방폭벽
    ac_unit(parts, W2 / 2 + 0.25, -1.5, rz=math.pi / 2)
    ac_unit(parts, W2 / 2 + 0.25, -0.4, rz=math.pi / 2)
    parts.append(box('cablet', 0.3, 2.2, 0.12, -W2 / 2 - 0.2, 1.5, 1.9, M['dark']))
    return join_as(parts, 'FAC_COMMAND_MAIN')

def build_command_roof():
    parts = []
    parts.append(box('slab', W2 + 0.3, D2 + 0.3, 0.25, 0, 0, 0.13, M['conc'], bev=0.03))
    parts.append(box('parapet', W2 + 0.3, 0.15, 0.5, 0, D2 / 2 + 0.08, 0.5, M['conc']))
    parts.append(box('parapet', W2 + 0.3, 0.15, 0.5, 0, -D2 / 2 - 0.08, 0.5, M['conc']))
    parts.append(box('parapet', 0.15, D2 + 0.3, 0.5, W2 / 2 + 0.08, 0, 0.5, M['conc']))
    parts.append(box('parapet', 0.15, D2 + 0.3, 0.5, -W2 / 2 - 0.08, 0, 0.5, M['conc']))
    parts.append(sph('camonet', 3.4, -2.0, 0.4, 0.7, M['camonet'], seg=18, s=(1, 0.85, 0.34)))
    parts.append(cyl('mast', 0.05, 4.0, 3.4, 1.6, 2.25, M['galv'], verts=8))
    for a in range(3):
        ang = a * 2 * math.pi / 3
        parts.append(strut('guy', (3.4, 1.6, 3.9), (3.4 + 1.3 * math.cos(ang), 1.6 + 1.3 * math.sin(ang), 0.3),
                           0.012, M['dark']))
    parts.append(cyl('dish_p', 0.05, 0.7, 2.6, -1.8, 0.6, M['steel_dk'], verts=8))
    parts.append(cyl('dish', 0.45, 0.06, 2.6, -1.8, 1.1, M['white'], verts=18,
                     rot=(math.radians(50), 0, math.radians(200))))
    parts.append(cyl('whip', 0.015, 2.6, -4.2, -2.4, 1.55, M['dark'], verts=6))
    parts.append(box('hvacr', 1.1, 0.8, 0.7, 0.8, 2.2, 0.6, M['white'], bev=0.03))
    return join_as(parts, 'FAC_COMMAND_ROOF')

# ═════════════════ 2) 경계 초소 ═════════════════
def build_security_main():
    parts = []
    shell(parts, M['conc'], 'security')
    door(parts, 0, 1.0, 2.1, M['steel_dk'])
    for f in (-1, 1):
        for x in (-3.2, 3.2):
            parts.append(box('slit', 1.0, 0.1, 0.28, x, f * (D2 / 2 + 0.01), 2.2, M['dark']))
    # 외부 철제 계단 (+X면, 위층 진입 상징)
    sx = W2 / 2 + 0.55
    for i in range(8):
        parts.append(box('stair', 0.9, 0.3, 0.05, sx, -2.2 + i * 0.62, 0.36 + i * 0.4, M['galv']))
    parts.append(strut('srail', (sx + 0.42, -2.35, 0.6), (sx + 0.42, 2.35, 3.6), 0.03, M['galv']))
    parts.append(box('sandbagL', 2.6, 0.5, 0.75, -2.6, -D2 / 2 - 0.5, 0.38, M['earth'], bev=0.06))
    return join_as(parts, 'FAC_SECURITY_MAIN')

def build_security_roof():
    parts = []
    parts.append(box('slab', W2 + 0.3, D2 + 0.3, 0.22, 0, 0, 0.11, M['conc'], bev=0.03))
    for (dx, dy, ln, w) in [(0, D2 / 2 + 0.08, W2 + 0.3, 0.15), (0, -D2 / 2 - 0.08, W2 + 0.3, 0.15)]:
        parts.append(box('parapet', ln, w, 0.9, dx, dy, 0.65, M['conc']))
    for (dx, dy, ln, w) in [(W2 / 2 + 0.08, 0, 0.15, D2 + 0.3), (-W2 / 2 - 0.08, 0, 0.15, D2 + 0.3)]:
        parts.append(box('parapet', ln, w, 0.9, dx, dy, 0.65, M['conc']))
    parts.append(box('sbags', 2.4, 0.45, 0.5, 0, -D2 / 2 + 0.5, 0.5, M['earth'], bev=0.06))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.05, major_segments=16,
                                     minor_segments=6, location=(2.6, -1.5, 1.1))
    ring = bpy.context.active_object
    ring.name = 'mgring'
    ring.data.materials.append(M['steel_dk'])
    parts.append(ring)
    parts.append(cyl('mgpost', 0.05, 1.0, 2.6, -1.5, 0.6, M['steel_dk'], verts=8))
    parts.append(box('sl_yoke', 0.08, 0.22, 0.3, -2.6, -1.5, 0.35, M['steel_dk']))
    parts.append(cyl('sl_body', 0.17, 0.4, -2.6, -1.5, 0.6, M['olive_dk'], verts=12,
                     rot=(math.radians(75), 0, math.radians(-160))))
    parts.append(cyl('sl_lens', 0.15, 0.03, -2.75, -1.6, 0.66, M['lamp'], verts=12,
                     rot=(math.radians(75), 0, math.radians(-160))))
    parts.append(cyl('mast', 0.04, 2.6, 3.6, 1.9, 1.5, M['galv'], verts=8))
    parts.append(sph('beacon', 0.09, 3.6, 1.9, 2.9, mk_mat('fm_bcn2', srgb('#ff3b30'), 0, 0.3,
                                                            emit=(1, 0.12, 0.08), emit_str=6.0), seg=10))
    return join_as(parts, 'FAC_SECURITY_ROOF')

# ═════════════════ 3) 생활 구역 ═════════════════
def build_living_main():
    parts = []
    shell(parts, M['panel'], 'living')
    door(parts, -3.4, 1.0)
    canopy(parts, -3.4)
    windows_row(parts, 4, 1.75)
    for x in (-1.2, 0.2, 1.6):                              # 실외기 열
        ac_unit(parts, x, -D2 / 2 - 0.45)
    # 빨래 건조대
    for dx in (2.6, 4.2):
        parts.append(cyl('lpole', 0.03, 1.6, dx, -D2 / 2 - 0.85, 0.8, M['galv'], verts=6))
    for zz in (1.15, 1.45):
        parts.append(strut('lline', (2.6, -D2 / 2 - 0.85, zz), (4.2, -D2 / 2 - 0.85, zz), 0.008, M['white']))
    parts.append(box('bench', 1.5, 0.4, 0.08, 3.4, D2 / 2 + 0.5, 0.45, M['olive_dk']))
    return join_as(parts, 'FAC_LIVING_MAIN')

def build_living_roof():
    parts = []
    gutter_roof(parts, 0)
    parts.append(cyl('wtank', 1.0, 1.3, -3.0, 1.2, 1.35, M['white'], verts=16))
    parts.append(cyl('wtcap', 1.02, 0.1, -3.0, 1.2, 2.02, M['blue'], verts=16))
    for (px, py) in [(-3.8, 0.5), (-2.2, 0.5), (-3.8, 1.9), (-2.2, 1.9)]:
        parts.append(cyl('wtleg', 0.05, 0.7, px, py, 0.45, M['steel_dk'], verts=6))
    parts.append(cyl('vent', 0.12, 0.8, 2.5, -1.2, 0.95, M['galv'], verts=10))
    parts.append(cyl('ventcap', 0.2, 0.12, 2.5, -1.2, 1.4, M['galv'], verts=10))
    return join_as(parts, 'FAC_LIVING_ROOF')

# ═════════════════ 4) 복지 구역 (PX·식당) ═════════════════
def build_welfare_main():
    parts = []
    shell(parts, M['panel'], 'welfare')
    door(parts, -2.8, 1.1, double=True)
    canopy(parts, -2.8, 4.0, 1.6)
    for f in (-1, 1):                                        # 대형 창
        for x in (0.6, 3.0):
            parts.append(box('bigwin', 2.0, 0.08, 1.5, x, f * (D2 / 2 + 0.01), 1.6, M['glass']))
            parts.append(box('bwfr', 2.1, 0.05, 0.08, x, f * (D2 / 2 + 0.03), 2.4, M['steel_dk']))
    parts.append(box('vending', 0.9, 0.5, 1.8, 4.6, -D2 / 2 - 0.45, 0.9, M['acc_welfare'], bev=0.02))
    parts.append(box('vglass', 0.6, 0.05, 1.1, 4.6, -D2 / 2 - 0.72, 1.1, M['glass']))
    for bx in (1.2, 2.6):
        parts.append(box('bench', 1.2, 0.4, 0.07, bx, -D2 / 2 - 0.7, 0.44, M['olive_dk']))
        for dy in (-0.15, 0.15):
            parts.append(box('bleg', 0.08, 0.08, 0.44, bx, -D2 / 2 - 0.7 + dy, 0.22, M['steel_dk']))
    return join_as(parts, 'FAC_WELFARE_MAIN')

def build_welfare_roof():
    parts = []
    gutter_roof(parts, 0)
    parts.append(box('hoodbox', 1.2, 1.0, 0.8, 3.2, 1.4, 0.95, M['galv'], bev=0.03))
    parts.append(cyl('hoodstack', 0.22, 1.8, 3.2, 1.4, 2.2, M['galv'], verts=10))
    parts.append(cyl('hoodcap', 0.34, 0.14, 3.2, 1.4, 3.15, M['dark'], verts=10))
    for vx in (-2.4, -0.8):
        parts.append(cyl('fan', 0.3, 0.35, vx, 1.6, 0.9, M['galv'], verts=12))
    return join_as(parts, 'FAC_WELFARE_ROOF')

# ═════════════════ 5) 위생 구역 (샤워·세면) ═════════════════
def build_hygiene_main():
    parts = []
    shell(parts, M['panel'], 'hygiene')
    door(parts, -3.8, 1.0)
    windows_row(parts, 5, 2.55, w=0.8, h=0.5)                # 고측 프라이버시 창
    for i in range(3):                                       # LPG 봄베
        parts.append(cyl('lpg', 0.22, 1.2, 3.4 + i * 0.5, -D2 / 2 - 0.5, 0.6, M['galv'], verts=12))
        parts.append(sph('lpgcap', 0.22, 3.4 + i * 0.5, -D2 / 2 - 0.5, 1.2, M['galv'], seg=10))
    parts.append(box('lpgcage', 1.9, 0.7, 1.5, 3.9, -D2 / 2 - 0.5, 0.75, M['fence'] if 'fence' in M else M['glass']))
    for x in (-1.8, 0.0, 1.8):
        parts.append(box('ventg', 0.6, 0.06, 0.4, x, D2 / 2 + 0.02, 0.6, M['dark']))
    return join_as(parts, 'FAC_HYGIENE_MAIN')

def build_hygiene_roof():
    parts = []
    gutter_roof(parts, 0)
    parts.append(cyl('hwtank', 0.8, 2.2, -2.8, 1.0, 1.15, M['galv'], verts=16, rot=(0, math.pi / 2, 0)))
    for dx in (-3.6, -2.0):
        parts.append(box('tksup', 0.2, 1.4, 0.55, dx, 1.0, 0.35, M['steel_dk']))
    parts.append(box('solar', 2.4, 1.5, 0.06, 1.8, -0.9, 0.75, M['blue'], rx=math.radians(28), bev=0.02))
    parts.append(box('solfr', 2.5, 1.6, 0.03, 1.8, -0.9, 0.7, M['steel_dk'], rx=math.radians(28)))
    for i in range(4):
        parts.append(cyl('vpipe', 0.07, 0.7, -0.6 + i * 0.9, 1.9, 0.5, M['white'], verts=8))
    return join_as(parts, 'FAC_HYGIENE_ROOF')

# ═════════════════ 6) 의무 구역 ═════════════════
def build_medical_main():
    parts = []
    shell(parts, M['panelw'], 'medical')
    door(parts, 0, 1.1, double=True)
    canopy(parts, 0, 3.6, 1.6)
    windows_row(parts, 3, 1.75)
    parts.append(box('redx', 0.9, 0.02, 0.9, 2.9, -D2 / 2 - 0.02, 2.2, M['redx']))     # 벽면 적십자
    parts.append(box('redx2', 0.02, 0.9, 0.9, -W2 / 2 - 0.02, 0, 2.2, M['redx']))
    # 들것 경사로
    parts.append(box('ramp', 2.2, 1.6, 0.08, 2.2, -D2 / 2 - 0.75, 0.35, M['conc'],
                     rx=math.radians(-14), bev=0.02))
    parts.append(box('rampw', 2.2, 0.06, 0.5, 2.2, -D2 / 2 - 1.5, 0.45, M['galv']))
    # 산소통 랙
    for i in range(4):
        parts.append(cyl('o2', 0.14, 1.5, -4.3 + i * 0.35, -D2 / 2 - 0.4, 0.75, M['white'], verts=10))
        parts.append(sph('o2cap', 0.1, -4.3 + i * 0.35, -D2 / 2 - 0.4, 1.55, M['blue'], seg=8))
    parts.append(box('o2rack', 1.6, 0.5, 0.1, -3.77, -D2 / 2 - 0.4, 1.0, M['steel_dk']))
    return join_as(parts, 'FAC_MEDICAL_MAIN')

def build_medical_roof():
    parts = []
    parts.append(box('slab', W2 + 0.4, D2 + 0.4, 0.14, 0, 0, 0.07, M['panelw'], bev=0.02))
    parts.append(box('roofredx', 3.4, 0.02, 3.4, 0, 0, 0.16, M['redx'], rx=math.pi / 2))  # 헬기 식별
    parts.append(box('hvacr', 1.0, 0.75, 0.65, -3.6, 1.6, 0.5, M['white'], bev=0.03))
    parts.append(cyl('vent', 0.1, 0.6, 3.9, 1.8, 0.45, M['galv'], verts=8))
    return join_as(parts, 'FAC_MEDICAL_ROOF')

# ═════════════════ 7) 창고 구역 (탄약고 이글루 · 단일형) ═════════════════
def build_storage():
    parts = []
    # 아치 본체 (반매립)
    arch = cyl('arch', 3.0, 9.6, 0, 0, 0.5, M['conc'], verts=24, rot=(0, math.pi / 2, 0))
    arch.scale = (1, 1, 0.78)
    bpy.ops.object.transform_apply(scale=True)
    parts.append(arch)
    # 흙 둔덕 (베름)
    for (bx, by, r) in [(-3.2, 2.2, 3.2), (0, 2.6, 3.6), (3.2, 2.2, 3.2),
                        (-3.2, -2.2, 3.2), (3.2, -2.2, 3.2), (4.9, 0, 3.0), (-4.9, 0, 3.0)]:
        parts.append(sph('berm', r, bx, by, -0.4, M['earth'], seg=14, s=(1, 1, 0.55)))
    # 전면 헤드월 + 방폭문
    parts.append(box('headwall', 6.4, 0.5, 3.4, 0, -4.55, 1.7, M['conc'], bev=0.04))
    parts.append(box('blastdoor', 2.4, 0.25, 2.6, 0, -4.85, 1.3, M['steel_dk'], bev=0.03))
    parts.append(box('doorrib', 2.4, 0.06, 0.12, 0, -4.99, 1.9, M['dark']))
    parts.append(box('doorrib', 2.4, 0.06, 0.12, 0, -4.99, 0.8, M['dark']))
    parts.append(box('hazard', 0.75, 0.05, 0.75, 2.4, -4.83, 1.9, M['stripes'], rz=math.radians(45)))
    parts.append(box('haz_id', 1.1, 0.04, 0.4, -2.5, -4.83, 2.2, M['warn']))
    parts.append(text3d('hz1', '1.1D', 0.26, -2.5, -4.9, 2.2, M['dark'],
                        rot=(math.pi / 2, 0, math.pi)))
    # 피뢰침 + 통풍구 + 진입로
    for lx in (-4.2, 4.2):
        parts.append(cyl('rod', 0.025, 4.2, lx, 0, 3.6, M['galv'], verts=6))
    for vx in (-2.2, 0, 2.2):
        parts.append(box('vent', 0.5, 0.5, 0.4, vx, 0.4, 2.9, M['conc']))
        parts.append(box('ventcap', 0.7, 0.7, 0.1, vx, 0.4, 3.15, M['dark']))
    parts.append(box('apron', 4.6, 2.4, 0.1, 0, -5.9, 0.05, M['conc']))
    return join_as(parts, 'FAC_STORAGE')

# ═════════════════ 8) 정비 구역 ═════════════════
def build_maint_main():
    parts = []
    shell(parts, M['panel'], 'maint')
    # 롤업 대형 도어 2련 (정면)
    for x in (-2.5, 1.0):
        parts.append(box('rollup', 3.0, 0.06, 2.7, x, -D2 / 2 - 0.02, 1.45, M['roofm']))
        parts.append(box('rollbox', 3.2, 0.35, 0.35, x, -D2 / 2 - 0.15, 2.95, M['steel_dk']))
    door(parts, 4.2, 0.9)
    parts.append(box('stain', 3.0, 2.0, 0.01, -1.0, -D2 / 2 - 1.3, 0.02, M['stain']))   # 기름때
    # 드럼·타이어 야적
    for i, (dx, dy) in enumerate([(4.0, -0.5), (4.5, -0.9), (4.1, -1.3)]):
        parts.append(cyl('drum', 0.28, 0.85, dx, -D2 / 2 - 0.9 + dy * 0, 0.43, [M['warn'], M['olive_dk'], M['galv']][i], verts=12))
    for i in range(3):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.35, minor_radius=0.13, major_segments=14,
                                         minor_segments=8, location=(-4.4, -D2 / 2 - 0.7, 0.14 + i * 0.27))
        t = bpy.context.active_object
        t.name = 'tire'
        t.data.materials.append(M['dark'])
        parts.append(t)
    parts.append(box('bench', 2.0, 0.6, 0.08, -3.5, D2 / 2 + 0.5, 0.85, M['steel_dk']))
    for dy in (-0.2, 0.2):
        parts.append(box('bleg', 0.08, 0.08, 0.85, -4.4, D2 / 2 + 0.5 + dy, 0.43, M['dark']))
        parts.append(box('bleg', 0.08, 0.08, 0.85, -2.6, D2 / 2 + 0.5 + dy, 0.43, M['dark']))
    return join_as(parts, 'FAC_MAINT_MAIN')

def build_maint_roof():
    parts = []
    gutter_roof(parts, 0, ridge=0.8)
    # 크레인 레일 (정면 돌출 I빔)
    for bx in (-2.5, 1.0):
        parts.append(box('crane_web', 0.12, 3.2, 0.4, bx, -D2 / 2 - 0.9, 0.05, M['acc_maint']))
        parts.append(box('crane_fl', 0.4, 3.2, 0.08, bx, -D2 / 2 - 0.9, 0.29, M['steel_dk']))
        parts.append(box('crane_fl', 0.4, 3.2, 0.08, bx, -D2 / 2 - 0.9, -0.19, M['steel_dk']))
        parts.append(box('hoist', 0.3, 0.4, 0.35, bx, -D2 / 2 - 1.9, -0.42, M['warn']))
        parts.append(strut('hook', (bx, -D2 / 2 - 1.9, -0.6), (bx, -D2 / 2 - 1.9, -0.95), 0.02, M['dark']))
    parts.append(box('skylight', 5.0, 1.1, 0.18, 0, 0.9, 0.65, M['glass'], rx=math.radians(8)))
    return join_as(parts, 'FAC_MAINT_ROOF')

# ═════════════════ 9) 인프라 구역 ═════════════════
def build_infra_main():
    parts = []
    shell(parts, M['panel'], 'infra')
    door(parts, -4.0, 1.0)
    for f in (-1, 1):                                        # 루버 그릴
        for x in (-1.6, 0.6, 2.8):
            parts.append(box('louver', 1.4, 0.07, 1.6, x, f * (D2 / 2 + 0.01), 1.7, M['dark']))
            for i in range(5):
                parts.append(box('lslat', 1.4, 0.05, 0.06, x, f * (D2 / 2 + 0.05), 1.15 + i * 0.28, M['galv']))
    # 수평 연료탱크 + 새들
    parts.append(cyl('fueltank', 0.85, 3.2, 4.2, 0.4, 1.1, M['olive'], verts=16, rot=(math.pi / 2, 0, 0)))
    for dy in (-1.0, 1.0):
        parts.append(box('saddle', 1.2, 0.35, 0.6, 4.2, 0.4 + dy, 0.3, M['conc']))
    parts.append(cyl('fpipe', 0.06, 1.6, 3.3, 0.4, 0.55, M['galv'], verts=8, rot=(0, math.pi / 2, 0)))
    # 변압기
    parts.append(box('tfmr', 1.2, 0.9, 1.3, -4.3, D2 / 2 + 0.75, 0.75, M['steel_dk'], bev=0.03))
    for i in range(3):
        parts.append(cyl('insul', 0.07, 0.4, -4.6 + i * 0.3, D2 / 2 + 0.75, 1.6, M['white'], verts=8))
    parts.append(box('cablet2', 0.3, 1.6, 0.1, -4.3, D2 / 2 + 1.8, 1.5, M['dark']))
    return join_as(parts, 'FAC_INFRA_MAIN')

def build_infra_roof():
    parts = []
    gutter_roof(parts, 0)
    parts.append(cyl('stack', 0.3, 3.6, -3.2, 1.4, 1.9, M['galv'], verts=12))            # 보일러 굴뚝
    parts.append(cyl('stackband', 0.32, 0.25, -3.2, 1.4, 3.1, M['red'], verts=12))
    for a in range(3):
        ang = a * 2 * math.pi / 3 + 0.5
        parts.append(strut('sguy', (-3.2, 1.4, 3.4), (-3.2 + 1.5 * math.cos(ang), 1.4 + 1.5 * math.sin(ang), 0.35),
                           0.012, M['dark']))
    parts.append(cyl('dish_p', 0.05, 0.6, 3.0, -1.4, 0.55, M['steel_dk'], verts=8))
    parts.append(cyl('dish', 0.4, 0.05, 3.0, -1.4, 1.0, M['white'], verts=16,
                     rot=(math.radians(48), 0, math.radians(160))))
    parts.append(box('acond', 1.3, 0.9, 0.7, 0.6, 1.6, 0.6, M['galv'], bev=0.03))
    return join_as(parts, 'FAC_INFRA_ROOF')

# ═════════════════ 10) 출입 구역 (위병소 · 단일형) ═════════════════
def build_entry():
    parts = []
    # 검문 캐노피
    for (px, py) in [(-4.6, -2.8), (4.6, -2.8), (-4.6, 2.8), (4.6, 2.8)]:
        parts.append(cyl('cpost', 0.09, 4.2, px, py, 2.1, M['galv'], verts=10))
    parts.append(box('croof', 10.6, 6.6, 0.18, 0, 0, 4.28, M['roofm'], bev=0.03))
    parts.append(box('cfascia', 10.6, 0.3, 0.5, 0, -3.3, 4.05, M['acc_entry']))
    parts.append(text3d('gate_t', 'GP-107 GATE', 0.34, 0, -3.48, 4.05, M['white'],
                        rot=(math.pi / 2, 0, math.pi)))
    # 초소 부스
    bx = -3.0
    parts.append(box('booth', 2.2, 2.0, 1.1, bx, 0.6, 0.55, M['panel'], bev=0.03))
    parts.append(box('boothglass', 2.1, 1.9, 1.0, bx, 0.6, 1.6, M['glass']))
    for (gx, gy) in [(bx - 1.05, 0.6), (bx + 1.05, 0.6), (bx, -0.35), (bx, 1.55)]:
        parts.append(cyl('bpost', 0.05, 2.2, gx, gy, 1.1, M['steel_dk'], verts=8))
    parts.append(box('boothroof', 2.5, 2.3, 0.1, bx, 0.6, 2.25, M['steel_dk'], bev=0.02))
    parts.append(box('boothdoor', 0.08, 0.7, 1.9, bx + 1.12, 0.6, 0.95, M['olive_dk']))
    # 차단봉 (부스 옆 피벗 → 차로 가로지름)
    pvx = bx + 1.6
    parts.append(box('pivot', 0.35, 0.35, 1.05, pvx, -0.9, 0.53, M['steel_dk'], bev=0.02))
    arm = cyl('arm', 0.06, 5.6, pvx + 2.55, -0.9, 1.08, M['stripes'], verts=10,
              rot=(0, math.pi / 2, 0))
    parts.append(arm)
    parts.append(box('cweight', 0.3, 0.3, 0.5, pvx - 0.45, -0.9, 1.0, M['dark']))
    # 저지 배리어 + 정지 표지판 + 과속방지턱
    parts.append(box('jersey', 1.6, 0.42, 0.75, 2.2, 1.6, 0.38, M['conc'], rz=0.3, bev=0.05))
    parts.append(box('jstripe', 1.62, 0.05, 0.12, 2.2, 1.77, 0.55, M['warn'], rz=0.3))
    parts.append(cyl('signpole', 0.035, 2.2, 4.3, -2.0, 1.1, M['galv'], verts=8))
    parts.append(cyl('stopsign', 0.38, 0.04, 4.3, -2.0, 2.0, M['red'], verts=8, rot=(math.pi / 2, 0, 0)))
    parts.append(text3d('stoptxt', 'STOP', 0.17, 4.3, -2.06, 2.0, M['white'],
                        rot=(math.pi / 2, 0, math.pi)))
    sb = cyl('bump', 0.16, 4.4, 1.2, -0.9, 0.02, M['warn'], verts=10, rot=(math.pi / 2, 0, 0))
    sb.scale = (1, 1, 0.35)
    bpy.ops.object.transform_apply(scale=True)
    parts.append(sb)
    return join_as(parts, 'FAC_ENTRY')

# ═════════════════ 빌드 → 내보내기 → 컨택트시트 렌더 ═════════════════
BUILDS = [
    (build_floor_generic, 'fac_floor.glb'),
    (build_floor_security, 'fac_security_floor.glb'),
    (build_command_main, 'fac_command_main.glb'), (build_command_roof, 'fac_command_roof.glb'),
    (build_security_main, 'fac_security_main.glb'), (build_security_roof, 'fac_security_roof.glb'),
    (build_living_main, 'fac_living_main.glb'), (build_living_roof, 'fac_living_roof.glb'),
    (build_welfare_main, 'fac_welfare_main.glb'), (build_welfare_roof, 'fac_welfare_roof.glb'),
    (build_hygiene_main, 'fac_hygiene_main.glb'), (build_hygiene_roof, 'fac_hygiene_roof.glb'),
    (build_medical_main, 'fac_medical_main.glb'), (build_medical_roof, 'fac_medical_roof.glb'),
    (build_storage, 'fac_storage.glb'),
    (build_maint_main, 'fac_maint_main.glb'), (build_maint_roof, 'fac_maint_roof.glb'),
    (build_infra_main, 'fac_infra_main.glb'), (build_infra_roof, 'fac_infra_roof.glb'),
    (build_entry, 'fac_entry.glb'),
]
try:
    built = {}
    for fn, fname in BUILDS:
        print('== ' + fname + ' ==')
        ob = fn()
        export_glb(ob, fname)
        ob.location = (200, len(built) * 25, 0)   # 대기 위치
        built[fname] = ob

    # 컨택트 시트: 2행 × 5열 조립 (분할형은 main+지붕, 다층 기본형은 층 스택)
    ASSEMBLY = [
        ('command', 1), ('security', 3), ('living', 2), ('welfare', 1), ('hygiene', 1),
        ('medical', 1), ('storage', 0), ('maint', 1), ('infra', 1), ('entry', 0),
    ]
    for i, (key, floors) in enumerate(ASSEMBLY):
        gx, gy = (i % 5) * 17 - 34, -(i // 5) * 15
        def put(ob_key, z):
            src = built[ob_key]
            cp = src.copy()
            cp.location = (gx, gy, z)
            scene.collection.objects.link(cp)
        if floors == 0:
            put(f'fac_{key}.glb', 0)
        else:
            put(f'fac_{key}_main.glb', 0)
            floor_key = 'fac_security_floor.glb' if key == 'security' else 'fac_floor.glb'
            for f in range(1, floors):
                put(floor_key, f * H)
            put(f'fac_{key}_roof.glb', floors * H)

    bpy.ops.mesh.primitive_plane_add(size=120, location=(0, -7, -0.02))
    g = bpy.context.active_object
    g.data.materials.append(mk_mat('fm_ground', srgb('#6b6353'), 0, 0.95))
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
    scene.cycles.samples = 32
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 900

    def shoot(loc, target, path):
        cam.location = loc
        d = mathutils.Vector(target) - mathutils.Vector(loc)
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('  render ->', path)

    shoot((0, -58, 34), (0, -4, 2), os.path.join(RND, 'render_fac_a.png'))
    shoot((-30, -34, 12), (-14, -4, 2.5), os.path.join(RND, 'render_fac_b.png'))
    print('== DONE ==', len(EXPORTED), 'files')
except Exception:
    traceback.print_exc()
    sys.exit(1)
