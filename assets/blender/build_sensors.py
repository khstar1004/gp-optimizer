# -*- coding: utf-8 -*-
"""
GP Digital Twin 감시·화기 자산 거치 모델 6종 — 전용 헤드리스 Blender 빌드 (2순위)
  blender --background --factory-startup --python build_sensors.py

산출 (원점 = 지면, 정면 −Y):
  sns_cam_mast.glb      EO/IR 듀얼 카메라 마스트 (9m 폴·팬틸트 하우징 2·솔라·정션박스·가이와이어)
  sns_radar_trailer.glb 지상감시레이더 트레일러 (2륜·아우트리거·틸트 평판 어레이·케이블 릴)
  sns_acoustic.glb      음향탐지 어레이 (삼각대·테트라 마이크 4구·배터리 박스)
  sns_cuas_jammer.glb   대드론 재머 (페데스탈·지향성 3연장 배럴·옴니 돔·컨트롤 박스)
  sns_weapon_mount.glb  중화기 진지 (U자 모래주머니·삼각대 거치 중기관총·탄통)
  sns_flare.glb         조명탄 발사대 (4연장 경사 튜브 랙·베이스 플레이트·탄약함)
검증 렌더: assets/blender/render_sns.png
"""
import bpy, math, os, sys, traceback
import numpy as np
import mathutils

OUT = r'C:\Users\USER\orca\projects\gp-optimizer\assets\models'
RND = r'C:\Users\USER\orca\projects\gp-optimizer\assets\blender'

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ── 텍스처/재질 (build_facilities.py 축약 재사용) ──
def srgb(hexs):
    h = hexs.lstrip('#')
    return tuple(((int(h[i:i + 2], 16) / 255.0) ** 2.2) for i in (0, 2, 4))

def _smooth(g, it=2):
    for _ in range(it):
        g = (g + np.roll(g, 1, 0) + np.roll(g, -1, 0) + np.roll(g, 1, 1) + np.roll(g, -1, 1)) / 5
    return g

def pack_image(name, arr):
    im = bpy.data.images.new(name, arr.shape[1], arr.shape[0], alpha=True)
    im.pixels.foreach_set(arr.astype(np.float32).ravel())
    im.pack()
    return im

def make_camo(N=128, cell=8):
    colors = [srgb('#4a5240'), srgb('#333b2c'), srgb('#5c5744'), srgb('#23281e')]
    f = _smooth(np.random.default_rng(7).random((N // cell, N // cell)), 3)
    idx = np.digitize(f, np.quantile(f, [0.28, 0.55, 0.8]))
    img = np.zeros((*f.shape, 4), dtype=np.float32)
    for i, c in enumerate(colors):
        img[idx == i] = (*c, 1.0)
    return pack_image('s_camo', np.kron(img, np.ones((cell, cell, 1), dtype=np.float32)))

def make_stripes(N=64):
    img = np.zeros((N, N, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:N, 0:N]
    band = ((xx + yy) // 8) % 2 == 0
    img[band, :3] = srgb('#e07a24')
    img[~band, :3] = srgb('#191919')
    img[..., 3] = 1.0
    return pack_image('s_stripes', img)

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

def tex_mat(name, img, metallic=0.0, rough=0.7):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage')
    tx.image = img
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    return m

CAMO, STRIPES = make_camo(), make_stripes()
M = {
    'camo':     tex_mat('sm_camo', CAMO, rough=0.72),
    'stripes':  tex_mat('sm_stripes', STRIPES, rough=0.5),
    'olive':    mk_mat('sm_olive',    srgb('#4d5a47'), 0.15, 0.55),
    'olive_dk': mk_mat('sm_olive_dk', srgb('#3a4437'), 0.15, 0.6),
    'galv':     mk_mat('sm_galv',     srgb('#7e878c'), 0.9,  0.42),
    'steel_dk': mk_mat('sm_steel_dk', srgb('#3c4348'), 0.8,  0.5),
    'conc':     mk_mat('sm_conc',     srgb('#8f8a80'), 0.0,  0.92),
    'dark':     mk_mat('sm_dark',     srgb('#22262a'), 0.2,  0.7),
    'gun':      mk_mat('sm_gun',      srgb('#1a1d20'), 0.6,  0.45),
    'warn':     mk_mat('sm_warn',     srgb('#e07a24'), 0.0,  0.5),
    'white':    mk_mat('sm_white',    srgb('#cfd4cd'), 0.0,  0.45),
    'sand':     mk_mat('sm_sand',     srgb('#8a7b5c'), 0.0,  0.95),
    'solar':    mk_mat('sm_solar',    srgb('#12203a'), 0.3,  0.15),
    'radome':   mk_mat('sm_radome',   srgb('#b9bdb4'), 0.0,  0.35),
    'glass':    mk_mat('sm_glass',    srgb('#0f1d26'), 0.1,  0.08, alpha=0.5),
    'irlens':   mk_mat('sm_irlens',   srgb('#160b06'), 0.2, 0.1, emit=(0.9, 0.35, 0.1), emit_str=1.2),
    'eolens':   mk_mat('sm_eolens',   srgb('#06131c'), 0.2, 0.08, emit=(0.2, 0.6, 0.9), emit_str=0.8),
    'tire':     mk_mat('sm_tire',     srgb('#17181a'), 0.0, 0.9),
    'brass':    mk_mat('sm_brass',    srgb('#8a6d2f'), 0.8, 0.4),
}

def bevel(ob, w=0.02, seg=2):
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

def join_as(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    return ob

def export_glb(ob, fname):
    path = os.path.join(OUT, fname)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB',
                              use_selection=True, export_apply=True)
    print(f'  -> {fname}  tris={len(ob.data.polygons)}  {os.path.getsize(path)//1024}KB')

# ═════════ 1) EO/IR 듀얼 카메라 마스트 (9m) ═════════
def build_cam_mast():
    parts = []
    H = 9.0
    parts.append(box('footing', 1.4, 1.4, 0.35, 0, 0, 0.17, M['conc'], bev=0.03))
    parts.append(cyl('pole', 0.11, H, 0, 0, H / 2 + 0.3, M['galv'], verts=12, rtop=0.07))
    for a in range(3):                                       # 가이와이어 + 앵커
        ang = a * 2 * math.pi / 3 + 0.4
        ax, ay = 2.6 * math.cos(ang), 2.6 * math.sin(ang)
        parts.append(strut('guy', (0, 0, H - 0.8), (ax, ay, 0.15), 0.012, M['dark']))
        parts.append(box('anchor', 0.35, 0.35, 0.25, ax, ay, 0.12, M['conc']))
    # 팬틸트 듀얼 헤드 (EO 박스 + IR 하우징) — 정면 −Y
    tz = H + 0.3
    parts.append(cyl('pt_base', 0.14, 0.3, 0, 0, tz, M['steel_dk'], verts=10))
    parts.append(box('pt_yoke', 0.6, 0.16, 0.14, 0, 0, tz + 0.25, M['steel_dk']))
    parts.append(box('eo_house', 0.28, 0.62, 0.3, -0.22, -0.1, tz + 0.45, M['white'], bev=0.02))
    parts.append(cyl('eo_hood', 0.11, 0.16, -0.22, -0.46, tz + 0.45, M['dark'], verts=12, rot=(math.pi / 2, 0, 0)))
    parts.append(cyl('eo_lens', 0.085, 0.02, -0.22, -0.55, tz + 0.45, M['eolens'], verts=12, rot=(math.pi / 2, 0, 0)))
    parts.append(box('ir_house', 0.3, 0.55, 0.34, 0.24, -0.08, tz + 0.45, M['olive_dk'], bev=0.02))
    parts.append(cyl('ir_lens', 0.11, 0.03, 0.24, -0.37, tz + 0.45, M['irlens'], verts=12, rot=(math.pi / 2, 0, 0)))
    parts.append(box('sunshield', 0.66, 0.7, 0.04, 0, -0.1, tz + 0.66, M['white']))
    # 정션박스 + 케이블 + 솔라 + 피뢰침
    parts.append(box('jbox', 0.45, 0.3, 0.6, 0.35, 0.15, 1.2, M['olive'], bev=0.02))
    parts.append(cyl('cable', 0.025, H - 1.2, 0.13, 0.05, (H - 1.2) / 2 + 1.0, M['dark'], verts=6))
    parts.append(box('solar', 0.9, 0.6, 0.03, -0.4, 0.35, 2.2, M['solar'], rx=math.radians(30), bev=0.01))
    parts.append(strut('solmount', (-0.4, 0.1, 1.8), (-0.4, 0.3, 2.1), 0.03, M['steel_dk']))
    parts.append(cyl('rod', 0.012, 1.2, 0, 0, H + 1.3, M['galv'], verts=6))
    return join_as(parts, 'SNS_CAM_MAST')

# ═════════ 2) 지상감시레이더 트레일러 ═════════
def build_radar_trailer():
    parts = []
    bz = 0.55                                                # 섀시 높이
    parts.append(box('chassis', 1.6, 3.0, 0.18, 0, 0, bz, M['olive'], bev=0.02))
    parts.append(box('fender', 0.5, 1.1, 0.08, -0.95, 0.2, bz + 0.05, M['olive_dk']))
    parts.append(box('fender', 0.5, 1.1, 0.08, 0.95, 0.2, bz + 0.05, M['olive_dk']))
    for sx in (-1, 1):                                       # 차륜
        bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.12, major_segments=16,
                                         minor_segments=8, location=(sx * 0.92, 0.2, 0.42),
                                         rotation=(0, math.pi / 2, 0))
        t = bpy.context.active_object
        t.name = 'wheel'
        t.data.materials.append(M['tire'])
        parts.append(t)
        parts.append(cyl('hub', 0.14, 0.1, sx * 0.92, 0.2, 0.42, M['steel_dk'], verts=10, rot=(0, math.pi / 2, 0)))
    parts.append(strut('tow', (0, -1.5, bz), (0, -2.4, 0.35), 0.05, M['olive_dk']))  # 견인봉
    parts.append(cyl('towring', 0.09, 0.05, 0, -2.42, 0.32, M['steel_dk'], verts=10, rot=(math.pi / 2, 0, 0)))
    for (sx, sy) in [(-1.0, -1.2), (1.0, -1.2), (-1.0, 1.2), (1.0, 1.2)]:  # 아우트리거
        parts.append(strut('outr', (sx * 0.7, sy, bz), (sx * 1.25, sy, 0.05), 0.04, M['galv']))
        parts.append(box('outpad', 0.25, 0.25, 0.05, sx * 1.25, sy, 0.03, M['steel_dk']))
    # 페데스탈 + 틸트 평판 어레이 (정면 −Y, 15° 후틸트)
    parts.append(cyl('ped', 0.22, 0.8, 0, 0.5, bz + 0.5, M['olive_dk'], verts=12))
    parts.append(box('ped_yoke', 0.7, 0.2, 0.25, 0, 0.5, bz + 1.0, M['steel_dk']))
    parts.append(box('array', 2.2, 0.14, 1.5, 0, 0.55, bz + 1.9, M['camo'], rx=math.radians(-15), bev=0.03))
    parts.append(box('arrayface', 2.0, 0.03, 1.3, 0, 0.44, bz + 1.9, M['steel_dk'], rx=math.radians(-15)))
    for i in range(4):                                       # 방열 리브
        parts.append(box('rib', 0.05, 0.1, 1.4, -0.8 + i * 0.53, 0.68, bz + 1.92, M['olive_dk'], rx=math.radians(-15)))
    parts.append(box('genbox', 0.8, 0.6, 0.55, 0, 1.15, bz + 0.38, M['olive_dk'], bev=0.02))  # 발전기
    parts.append(cyl('exh', 0.03, 0.4, 0.35, 1.4, bz + 0.85, M['dark'], verts=6))
    parts.append(cyl('reel', 0.28, 0.18, -0.55, 1.2, bz + 0.42, M['warn'], verts=14, rot=(0, math.pi / 2, 0)))  # 케이블 릴
    return join_as(parts, 'SNS_RADAR_TRAILER')

# ═════════ 3) 음향탐지 어레이 ═════════
def build_acoustic():
    parts = []
    apex = (0, 0, 1.35)
    for a in range(3):
        ang = a * 2 * math.pi / 3 + 0.3
        parts.append(strut('leg', (0.85 * math.cos(ang), 0.85 * math.sin(ang), 0.02), apex, 0.03, M['olive_dk']))
        parts.append(box('foot', 0.14, 0.14, 0.04, 0.85 * math.cos(ang), 0.85 * math.sin(ang), 0.02, M['steel_dk']))
    parts.append(cyl('hubmast', 0.045, 0.5, 0, 0, 1.55, M['galv'], verts=8))
    parts.append(sph('hub', 0.09, 0, 0, 1.82, M['steel_dk'], seg=10))
    # 테트라 마이크 4구 (윈드스크린 폼 볼)
    mics = [(0, 0, 2.25), (0.42, 0, 1.9), (-0.21, 0.36, 1.9), (-0.21, -0.36, 1.9)]
    for i, (mx, my, mz) in enumerate(mics):
        parts.append(strut(f'arm{i}', (0, 0, 1.82), (mx, my, mz), 0.014, M['galv']))
        parts.append(sph(f'mic{i}', 0.09, mx, my, mz, M['dark'], seg=10))
    parts.append(box('battbox', 0.5, 0.35, 0.3, 0.7, 0.5, 0.16, M['olive'], bev=0.02))
    parts.append(strut('bcable', (0.7, 0.5, 0.3), (0.1, 0.05, 1.4), 0.012, M['dark']))
    parts.append(cyl('gps', 0.06, 0.04, 0, 0, 2.34, M['white'], verts=10))
    return join_as(parts, 'SNS_ACOUSTIC')

# ═════════ 4) 대드론 재머 ═════════
def build_cuas_jammer():
    parts = []
    parts.append(box('base', 1.1, 1.1, 0.12, 0, 0, 0.06, M['steel_dk'], bev=0.02))
    for (sx, sy) in [(-0.65, -0.65), (0.65, -0.65), (0.65, 0.65), (-0.65, 0.65)]:
        parts.append(strut('brace', (sx, sy, 0.02), (0, 0, 0.55), 0.03, M['galv']))
        parts.append(box('bpad', 0.18, 0.18, 0.04, sx, sy, 0.02, M['steel_dk']))
    parts.append(cyl('ped', 0.12, 1.1, 0, 0, 0.65, M['olive_dk'], verts=10))
    parts.append(cyl('pt', 0.16, 0.22, 0, 0, 1.3, M['steel_dk'], verts=10))
    parts.append(box('yoke', 0.66, 0.2, 0.16, 0, 0, 1.5, M['steel_dk']))
    # 지향성 재머 배럴 3연장 (−Y 지향, 12° 상향)
    for i, dx in enumerate((-0.22, 0, 0.22)):
        parts.append(cyl(f'barrel{i}', 0.07, 0.85, dx, -0.35, 1.72, M['olive'], verts=10,
                         rot=(math.radians(78), 0, 0)))
        parts.append(cyl(f'bcap{i}', 0.085, 0.06, dx, -0.76, 1.81, M['dark'], verts=10,
                         rot=(math.radians(78), 0, 0)))
    parts.append(box('jhousing', 0.7, 0.5, 0.3, 0, 0.1, 1.68, M['camo'], bev=0.02))
    parts.append(sph('omni', 0.14, 0, 0.1, 2.0, M['radome'], seg=12))                 # 옴니 RF 돔
    parts.append(cyl('omnimast', 0.025, 0.35, 0, 0.1, 1.86, M['galv'], verts=6))
    parts.append(box('ctrl', 0.6, 0.4, 0.5, 0.75, 0.4, 0.27, M['olive'], bev=0.02))   # 컨트롤 박스
    parts.append(box('ctrlscr', 0.3, 0.02, 0.2, 0.75, 0.19, 0.35, M['glass']))
    parts.append(strut('ccable', (0.75, 0.4, 0.52), (0.12, 0.1, 1.2), 0.014, M['dark']))
    return join_as(parts, 'SNS_CUAS_JAMMER')

# ═════════ 5) 중화기 진지 (K6 거치) ═════════
def build_weapon_mount():
    parts = []
    # U자 모래주머니 진지 (정면 −Y 개방 아님 — 전면 방호, 후방 개방)
    cx, cyy, rr = 0, 0.3, 1.6
    for layer in range(3):
        n = 12 - layer
        for k in range(n):
            a = math.radians(195 + k * (150 / (n - 1)))
            bx, by = cx + rr * math.cos(a), cyy + rr * math.sin(a) * -1
            parts.append(box('sbag', 0.42, 0.24, 0.16, bx, by - 0.6, 0.08 + layer * 0.155, M['sand'],
                             rz=-a + math.pi / 2, bev=0.05))
    # 삼각대 + K6 실루엣 (−Y 지향)
    apex = (0, -0.1, 0.72)
    for a in range(3):
        ang = a * 2 * math.pi / 3 + math.pi / 2
        parts.append(strut('tleg', (0.6 * math.cos(ang), -0.1 + 0.6 * math.sin(ang), 0.02), apex, 0.035, M['gun']))
    parts.append(box('cradle', 0.22, 0.3, 0.1, 0, -0.1, 0.78, M['gun']))
    parts.append(box('receiver', 0.16, 0.85, 0.18, 0, -0.35, 0.88, M['gun'], bev=0.015))
    parts.append(cyl('mgbarrel', 0.035, 1.1, 0, -1.3, 0.9, M['gun'], verts=10, rot=(math.pi / 2, 0, 0)))
    parts.append(cyl('flash', 0.05, 0.12, 0, -1.85, 0.9, M['gun'], verts=8, rot=(math.pi / 2, 0, 0)))
    parts.append(box('grip', 0.14, 0.1, 0.14, 0, 0.12, 0.82, M['gun']))
    parts.append(box('sight', 0.05, 0.12, 0.08, 0, -0.5, 1.02, M['dark']))
    # 탄통 + 링크 급탄
    parts.append(box('ammobox', 0.18, 0.35, 0.25, 0.32, -0.25, 0.75, M['olive_dk'], bev=0.01))
    parts.append(box('belt', 0.16, 0.3, 0.03, 0.18, -0.3, 0.9, M['brass'], rz=0.3))
    for i in range(2):
        parts.append(box('sparebox', 0.2, 0.38, 0.28, -0.7 + i * 0.28, 0.55, 0.14, M['olive_dk'], bev=0.01))
    return join_as(parts, 'SNS_WEAPON_MOUNT')

# ═════════ 6) 조명탄 발사대 (4연장) ═════════
def build_flare():
    parts = []
    parts.append(box('bplate', 1.5, 1.3, 0.1, 0, 0, 0.05, M['steel_dk'], bev=0.02))
    for (sx, sy) in [(-0.6, -0.5), (0.6, -0.5), (-0.6, 0.5), (0.6, 0.5)]:
        parts.append(cyl('spike', 0.03, 0.16, sx, sy, 0.0, M['dark'], verts=6))
    parts.append(box('frame', 1.2, 0.16, 0.5, 0, 0.35, 0.35, M['olive'], bev=0.02))
    # 경사 발사 튜브 4연장 (−Y 지향 55° 상향)
    for i, dx in enumerate((-0.48, -0.16, 0.16, 0.48)):
        parts.append(cyl(f'tube{i}', 0.09, 1.5, dx, -0.25, 0.85, M['olive_dk'], verts=12,
                         rot=(math.radians(35), 0, 0)))
        parts.append(cyl(f'muzzle{i}', 0.1, 0.06, dx, -0.68, 1.46, M['dark'], verts=12,
                         rot=(math.radians(35), 0, 0)))
        parts.append(cyl(f'breech{i}', 0.11, 0.12, dx, 0.18, 0.25, M['steel_dk'], verts=12,
                         rot=(math.radians(35), 0, 0)))
    parts.append(strut('braceL', (-0.6, 0.55, 0.06), (-0.48, -0.1, 1.05), 0.03, M['galv']))
    parts.append(strut('braceR', (0.6, 0.55, 0.06), (0.48, -0.1, 1.05), 0.03, M['galv']))
    parts.append(box('fctrl', 0.4, 0.3, 0.35, 0.85, 0.45, 0.28, M['olive'], bev=0.02))    # 격발 제어
    parts.append(strut('fcable', (0.85, 0.45, 0.46), (0.48, 0.2, 0.35), 0.012, M['dark']))
    parts.append(box('ammocrate', 0.9, 0.5, 0.4, -0.9, 0.7, 0.2, M['olive_dk'], bev=0.02))  # 조명탄 상자
    parts.append(box('cratemark', 0.5, 0.02, 0.12, -0.9, 0.44, 0.28, M['warn']))
    return join_as(parts, 'SNS_FLARE')

# ═════════ 빌드 → 내보내기 → 검증 렌더 ═════════
BUILDS = [
    (build_cam_mast, 'sns_cam_mast.glb'),
    (build_radar_trailer, 'sns_radar_trailer.glb'),
    (build_acoustic, 'sns_acoustic.glb'),
    (build_cuas_jammer, 'sns_cuas_jammer.glb'),
    (build_weapon_mount, 'sns_weapon_mount.glb'),
    (build_flare, 'sns_flare.glb'),
]
try:
    built = []
    for i, (fn, fname) in enumerate(BUILDS):
        print('== ' + fname + ' ==')
        ob = fn()
        export_glb(ob, fname)
        ob.location = ((i % 3) * 7 - 7, -(i // 3) * 7, 0)
        built.append(ob)

    bpy.ops.mesh.primitive_plane_add(size=50, location=(0, -3, -0.02))
    g = bpy.context.active_object
    g.data.materials.append(mk_mat('sm_ground', srgb('#6b6353'), 0, 0.95))
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
    cam.location = (4, -22, 13)
    d = mathutils.Vector((0, -2, 1.2)) - mathutils.Vector(cam.location)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(RND, 'render_sns.png')
    bpy.ops.render.render(write_still=True)
    print('== DONE ==')
except Exception:
    traceback.print_exc()
    sys.exit(1)
