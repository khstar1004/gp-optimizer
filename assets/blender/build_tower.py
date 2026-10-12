# -*- coding: utf-8 -*-
"""
GP Digital Twin 감시탑 v3 — 전용 헤드리스 Blender 인스턴스 빌드
  blender --background --factory-startup --python build_tower.py

v3 고도화:
  텍스처  디지털 위장 4색 / 웨더링 콘크리트 / 아연도금 스크래치 / 태극기(4괘 포함) — 전부 numpy 생성·GLB 임베드
  마스트  플랜지·볼트·거셋 + 항공표지 밴드 + 중간 휴식 발판 + 케이블 번들 + 경고 표지판
  캐빈    엣지 베벨, 내부 콘솔·발광 스크린·의자·랙, 대형 관측쌍안경(삼각대), EO/IR 터렛,
          데이터링크 접시, 태양광, 풍향계, 확성기, 처진 안테나 케이블, 지붕 해치, GP-107 입체 문자
  베이스  위장 셸터+위장망, 철조망 펜스(게이트), 모래주머니 진지, 계단, 저지 배리어,
          케이블 스풀, 입간판(GP-107), 투광등주, 태극기 게양대(물결 깃발)
산출: assets/models/gp_tower_{base,mast,cab}.glb (파일명 유지 → 프로그램 코드 무수정 로드)
검증: assets/blender/render_full.png / render_cab.png / render_base.png
"""
import bpy, math, os, sys, traceback
import numpy as np
import mathutils

OUT = r'C:\Users\USER\orca\projects\gp-optimizer\assets\models'
RND = r'C:\Users\USER\orca\projects\gp-optimizer\assets\blender'

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ═════════════════════ 텍스처 (numpy 프로시저럴) ═════════════════════
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
        g = np.kron(rng.random((o, o)), np.ones((n // o, n // o)))
        f += _smooth(g, 2) / len(octaves)
    return (f - f.min()) / (np.ptp(f) + 1e-9)

def pack_image(name, arr):
    """arr: (H,W,4) float32 linear"""
    im = bpy.data.images.new(name, arr.shape[1], arr.shape[0], alpha=True)
    im.pixels.foreach_set(arr.astype(np.float32).ravel())
    im.pack()
    return im

def make_camo(N=256, cell=8):
    colors = [srgb('#4a5240'), srgb('#333b2c'), srgb('#5c5744'), srgb('#23281e')]
    n = N // cell
    f = _smooth(np.random.default_rng(7).random((n, n)), 3)
    idx = np.digitize(f, np.quantile(f, [0.28, 0.55, 0.8]))
    img = np.zeros((n, n, 4), dtype=np.float32)
    for i, c in enumerate(colors):
        img[idx == i] = (*c, 1.0)
    return pack_image('gp_camo', np.kron(img, np.ones((cell, cell, 1), dtype=np.float32)))

def make_concrete(N=256):
    base = np.array(srgb('#8f8a80'))
    f = noise2d(N, (4, 8, 32), seed=3)
    img = np.zeros((N, N, 4), dtype=np.float32)
    img[..., :3] = base * (0.78 + 0.34 * f)[..., None]
    rng = np.random.default_rng(4)                       # 스페클(골재)
    sp = rng.random((N, N)) > 0.994
    img[sp, :3] *= 0.5
    streak = _smooth(np.kron(rng.random((1, 16)), np.ones((N, N // 16))), 4)  # 세로 물때
    img[..., :3] *= (0.9 + 0.2 * streak)[..., None]
    img[..., 3] = 1.0
    return pack_image('gp_concrete_tex', img)

def make_galv(N=128):
    base = np.array(srgb('#7e878c'))
    f = noise2d(N, (8, 32), seed=5)
    rng = np.random.default_rng(6)
    scratch = np.kron(rng.random((1, N // 2)) > 0.85, np.ones((N, 2))).astype(float)
    img = np.zeros((N, N, 4), dtype=np.float32)
    img[..., :3] = base * (0.88 + 0.22 * f - 0.12 * scratch)[..., None]
    img[..., 3] = 1.0
    return pack_image('gp_galv_tex', img)

def make_taegeukgi(W=192, H=128):
    img = np.ones((H, W, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    cx, cy, R = W / 2, H / 2, 30.0
    big = (xx - cx) ** 2 + (yy - cy) ** 2 <= R ** 2
    cl = (xx - (cx - R / 2)) ** 2 + (yy - cy) ** 2 <= (R / 2) ** 2
    cr = (xx - (cx + R / 2)) ** 2 + (yy - cy) ** 2 <= (R / 2) ** 2
    red = big & (cl | ((yy >= cy) & ~cr))
    blue = big & ~red
    img[red] = (*srgb('#c60c30'), 1.0)
    img[blue] = (*srgb('#003478'), 1.0)
    black = srgb('#111111')
    def bar(bx, by, broken):                              # 폭30 높이4 괘 막대
        y0, y1 = int(by - 2), int(by + 2)
        if broken:
            img[y0:y1, int(bx - 15):int(bx - 2)] = (*black, 1.0)
            img[y0:y1, int(bx + 2):int(bx + 15)] = (*black, 1.0)
        else:
            img[y0:y1, int(bx - 15):int(bx + 15)] = (*black, 1.0)
    trigrams = {                                          # (cx, cy): 위에서부터 [괘 3효]
        (34, H - 26): [0, 0, 0],    # 건 ☰ (좌상)
        (W - 34, H - 26): [1, 0, 1],  # 감 ☵ (우상)
        (34, 26): [0, 1, 0],        # 리 ☲ (좌하)
        (W - 34, 26): [1, 1, 1],    # 곤 ☷ (우하)
    }
    for (tx, ty), pat in trigrams.items():
        for i, br in enumerate(pat):
            bar(tx, ty + (1 - i) * 7, br)
    return pack_image('gp_taegeukgi', img)

CAMO = make_camo()
CONC = make_concrete()
GALV = make_galv()
FLAG = make_taegeukgi()

# ═════════════════════ 재질 ═════════════════════
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

def mk_weathered_mat(name, color, metallic=0.0, rough=0.6, grime=0.45, rust=0.0, scale=2.6):
    """mk_mat 과 인터페이스는 같지만 Object 좌표 노이즈로 색·러프니스·범프에 얼룩을
    절차적으로 얹는다. UV/이미지 없이 셰이더 노드만 쓰므로 가늘고 긴 마스트 부재든
    넓은 캐빈 패널이든 형태와 무관하게 자연스럽다 — 타일링 사진 텍스처는 이런
    제각각인 부재 형태에서 늘어지거나 이음매가 보인다(build_damage.py 의 파단면 사례
    참고). rust>0 이면 성긴 녹 반점을 추가로 흩뿌린다.

    주의: AgX 톤매핑 + Cycles 디노이즈 조합에서는 종이 위 계산상 뚜렷해 보이는 색차도
    렌더에서 상당히 죽는다 — 그래서 Color2 를 0.3배(원색 대비)까지 어둡게 잡고
    grime/노이즈 Detail 을 낮게(디테일이 높으면 프랙탈이 중간값으로 뭉개져 더 안
    보인다) 잡는다. 이 조합을 실제 렌더로 확인하지 않고 눈대중으로 옅게 잡으면
    거의 안 보이는 효과가 나온다."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Metallic'].default_value = metallic

    coord = nt.nodes.new('ShaderNodeTexCoord'); coord.location = (-900, 100)

    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.location = (-700, 200)
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = 1.5
    nt.links.new(coord.outputs['Object'], noise.inputs['Vector'])

    grime_map = nt.nodes.new('ShaderNodeMapRange'); grime_map.location = (-560, 260)
    grime_map.inputs['From Min'].default_value = 0.3
    grime_map.inputs['From Max'].default_value = 0.7
    grime_map.inputs['To Max'].default_value = grime
    nt.links.new(noise.outputs['Fac'], grime_map.inputs['Value'])

    mix = nt.nodes.new('ShaderNodeMixRGB'); mix.location = (-420, 200)
    mix.inputs['Color1'].default_value = (*color, 1.0)
    mix.inputs['Color2'].default_value = (*(c * 0.3 for c in color), 1.0)
    nt.links.new(grime_map.outputs['Result'], mix.inputs['Fac'])
    color_socket = mix.outputs['Color']

    if rust > 0:
        rust_noise = nt.nodes.new('ShaderNodeTexNoise'); rust_noise.location = (-700, -80)
        rust_noise.inputs['Scale'].default_value = scale * 3.0
        rust_noise.inputs['Detail'].default_value = 1.5
        nt.links.new(coord.outputs['Object'], rust_noise.inputs['Vector'])
        rust_map = nt.nodes.new('ShaderNodeMapRange'); rust_map.location = (-560, -80)
        rust_map.inputs['From Min'].default_value = 1.0 - rust
        rust_map.inputs['From Max'].default_value = 1.0 - rust * 0.3
        nt.links.new(rust_noise.outputs['Fac'], rust_map.inputs['Value'])
        mix_rust = nt.nodes.new('ShaderNodeMixRGB'); mix_rust.location = (-260, 40)
        mix_rust.inputs['Color2'].default_value = (*srgb('#7a3a1c'), 1.0)
        nt.links.new(color_socket, mix_rust.inputs['Color1'])
        nt.links.new(rust_map.outputs['Result'], mix_rust.inputs['Fac'])
        color_socket = mix_rust.outputs['Color']

    nt.links.new(color_socket, b.inputs['Base Color'])

    rough_noise = nt.nodes.new('ShaderNodeTexNoise'); rough_noise.location = (-700, -260)
    rough_noise.inputs['Scale'].default_value = scale * 5.0
    nt.links.new(coord.outputs['Object'], rough_noise.inputs['Vector'])
    rough_map = nt.nodes.new('ShaderNodeMapRange'); rough_map.location = (-420, -260)
    rough_map.inputs['To Min'].default_value = max(0.0, rough - 0.18)
    rough_map.inputs['To Max'].default_value = min(1.0, rough + 0.18)
    nt.links.new(rough_noise.outputs['Fac'], rough_map.inputs['Value'])
    nt.links.new(rough_map.outputs['Result'], b.inputs['Roughness'])

    bump = nt.nodes.new('ShaderNodeBump'); bump.location = (-260, -420)
    bump.inputs['Strength'].default_value = 0.3
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
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
    'camo':     tex_mat('gp_camo', CAMO, rough=0.72),
    'camonet':  tex_mat('gp_camonet', CAMO, rough=0.9, alpha=0.62),
    'conc':     tex_mat('gp_conc', CONC, rough=0.93),
    'galvtex':  tex_mat('gp_galvtex', GALV, metallic=0.85, rough=0.45),
    'flag':     tex_mat('gp_flag', FLAG, rough=0.6),
    'olive':    mk_weathered_mat('gp_olive',    srgb('#4d5a47'), 0.15, 0.55, grime=0.45),
    'olive_dk': mk_weathered_mat('gp_olive_dk', srgb('#3a4437'), 0.15, 0.6,  grime=0.5),
    'galv':     mk_weathered_mat('gp_galv',     srgb('#7e878c'), 0.7,  0.42, grime=0.4, rust=0.22),
    'steel_dk': mk_weathered_mat('gp_steel_dk', srgb('#3c4348'), 0.6,  0.5,  grime=0.4, rust=0.18),
    'conc_dk':  mk_weathered_mat('gp_conc_dk',  srgb('#6e6a62'), 0.0,  0.95, grime=0.4, scale=1.6),
    'glass':    mk_mat('gp_glass',    srgb('#0f1d26'), 0.1,  0.08, alpha=0.5),
    'solar':    mk_mat('gp_solar',    srgb('#12203a'), 0.3,  0.15),
    'dark':     mk_weathered_mat('gp_dark',     srgb('#22262a'), 0.2,  0.7,  grime=0.22),
    'warn':     mk_mat('gp_warn',     srgb('#e07a24'), 0.0,  0.5),
    'yellow':   mk_mat('gp_yellow',   srgb('#e8c11c'), 0.0,  0.5),
    'white':    mk_mat('gp_white',    srgb('#cfd4cd'), 0.0,  0.45),
    'sand':     mk_mat('gp_sand',     srgb('#8a7b5c'), 0.0,  0.95),
    'fence':    mk_mat('gp_fence',    srgb('#5a6066'), 0.6,  0.6, alpha=0.3),
    'radome':   mk_mat('gp_radome',   srgb('#b9bdb4'), 0.0,  0.35),
    'beacon':   mk_mat('gp_beacon',   srgb('#ff3b30'), 0.0, 0.3, emit=(1.0, 0.12, 0.08), emit_str=6.0),
    'lamp':     mk_mat('gp_lamp',     srgb('#ffe8b0'), 0.0, 0.2, emit=(1.0, 0.85, 0.55), emit_str=4.0),
    'screen':   mk_mat('gp_screen',   srgb('#0a1a20'), 0.0, 0.2, emit=(0.25, 0.85, 0.9), emit_str=3.0),
    'irlens':   mk_mat('gp_irlens',   srgb('#160b06'), 0.2, 0.1, emit=(0.9, 0.35, 0.1), emit_str=1.2),
}

# ═════════════════════ 프리미티브 헬퍼 ═════════════════════
def bevel(ob, w=0.022, seg=2):
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

def sph(name, r, x, y, z, mat, seg=18, sz=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(8, seg // 2),
                                         radius=r, location=(x, y, z))
    ob = bpy.context.active_object
    ob.name = name
    if sz != 1.0:
        ob.scale = (1, 1, sz)
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

def cable(name, pts, r, mat):
    """처진 케이블 — 폴리 커브 → 베벨 → 메시"""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = 2
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1.0)
    cu.materials.append(mat)
    ob = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(ob)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.convert(target='MESH')
    return bpy.context.active_object

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

def flag_mesh(name, w, h, x, y, z, mat):
    """물결치는 깃발 그리드 (게양대 +X측으로 전개)"""
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=14, y_subdivisions=8, size=1, location=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    for v in ob.data.vertices:
        amp = 0.05 * (v.co.x + 0.5)                       # 깃대쪽 고정, 끝단 큰 물결
        v.co.z += amp * math.sin(v.co.x * 9 + v.co.y * 3)
    ob.scale = (w, h, 1)
    bpy.ops.object.transform_apply(scale=True)
    ob.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    ob.location = (x + w / 2, y, z)
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
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

def export_glb(ob, path):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB',
                              use_selection=True, export_apply=True)
    print(f'  -> {path}  tris={len(ob.data.polygons)}  {os.path.getsize(path)/1024:.0f}KB')

# ═════════════════════ 1) 마스트 (4m 세그먼트) ═════════════════════
def build_mast():
    parts = []
    L, H = 0.95, 4.0
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(cyl('leg', 0.08, H, sx * L, sy * L, H / 2, M['galvtex'], verts=12))
            parts.append(cyl('band', 0.088, 0.5, sx * L, sy * L, 3.62, M['warn'], verts=12))
            for fz in (0.035, H - 0.035):
                parts.append(cyl('flange', 0.17, 0.07, sx * L, sy * L, fz, M['steel_dk'], verts=12))
                for k in range(6):
                    a = k * math.pi / 3
                    parts.append(cyl('bolt', 0.02, 0.1, sx * L + 0.12 * math.cos(a),
                                     sy * L + 0.12 * math.sin(a), fz, M['dark'], verts=6))
    for z in (0.06, 2.0):
        for (p1, p2) in [((-L, -L), (L, -L)), ((L, -L), (L, L)), ((L, L), (-L, L)), ((-L, L), (-L, -L))]:
            parts.append(strut('hz', (p1[0], p1[1], z), (p2[0], p2[1], z), 0.05, M['galvtex']))
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(box('gusset', 0.24, 0.24, 0.02, sx * L * 0.93, sy * L * 0.93, 2.0,
                             M['steel_dk'], rz=math.pi / 4))
    faces = [((-L, -L), (L, -L)), ((L, -L), (L, L)), ((L, L), (-L, L)), ((-L, L), (-L, -L))]
    for (a, b) in faces:
        for z0 in (0.0, 2.0):
            parts.append(strut('xb', (a[0], a[1], z0), (b[0], b[1], z0 + 2.0), 0.042, M['steel_dk']))
            parts.append(strut('xb', (b[0], b[1], z0), (a[0], a[1], z0 + 2.0), 0.042, M['steel_dk']))
    # 승탑 사다리(+Y) + 케이지 + 중간 휴식 발판
    ly = L + 0.13
    for rx in (-0.19, 0.19):
        parts.append(cyl('lrail', 0.028, H, rx, ly, H / 2, M['olive_dk'], verts=8))
    for i in range(12):
        z = 0.18 + i * (H / 12)
        parts.append(strut('rung', (-0.19, ly, z), (0.19, ly, z), 0.02, M['olive_dk'], verts=8))
    for z in (0.9, 2.25, 3.6):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.42, minor_radius=0.022,
                                         major_segments=20, minor_segments=6, location=(0, ly + 0.05, z))
        ob = bpy.context.active_object
        ob.name = 'cage'
        ob.data.materials.append(M['olive_dk'])
        parts.append(ob)
    parts.append(box('restplat', 0.7, 0.5, 0.03, 0.55, ly - 0.35, 2.0, M['steel_dk']))
    parts.append(strut('restrail', (0.22, ly - 0.6, 2.0), (0.88, ly - 0.6, 2.0), 0.02, M['olive_dk']))
    # 케이블 번들 + 트레이 + 콘딧 + 정션박스 + 경고표지
    parts.append(box('ctray', 0.16, 0.06, H, -L, -L - 0.16, H / 2, M['dark']))
    for (dx, dy) in [(0.05, 0.02), (-0.04, 0.05), (0.0, -0.04)]:
        parts.append(cyl('cbl', 0.022, H, -L + dx, -L - 0.16 + dy, H / 2, M['dark'], verts=6))
    parts.append(cyl('conduit', 0.035, H, -L + 0.16, -L - 0.14, H / 2, M['olive_dk'], verts=8))
    parts.append(box('jbox', 0.22, 0.12, 0.3, -L, -L - 0.28, 1.1, M['olive']))
    parts.append(box('signplate', 0.26, 0.02, 0.36, L + 0.1, -L, 1.5, M['yellow'], rz=math.pi / 2))
    return join_as(parts, 'GP_MAST')

# ═════════════════════ 2) 베이스 ═════════════════════
def build_base():
    parts = []
    L = 0.95
    parts.append(box('pad1', 7.0, 7.0, 0.35, 0, 0, -0.55, M['conc'], bev=0.03))
    parts.append(box('pad2', 5.6, 5.6, 0.45, 0, 0, -0.20, M['conc'], bev=0.03))
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(box('foot', 0.7, 0.7, 0.28, sx * L, sy * L, 0.11, M['conc'], bev=0.02))
            parts.append(box('plate', 0.4, 0.4, 0.05, sx * L, sy * L, 0.27, M['steel_dk']))
    # 계단 (+X, pad2 → pad1)
    for i, zt in enumerate((-0.09, -0.26)):
        parts.append(box('step', 0.34, 1.2, 0.16, 2.97 + i * 0.34, 0, zt, M['conc']))
    # 위장 셸터 + 위장망 + 배기관 + 라디에이터 그릴
    sx0, sy0 = 2.05, -1.7
    parts.append(box('shelter', 1.9, 1.35, 2.0, sx0, sy0, 1.0, M['camo'], bev=0.03))
    parts.append(box('sh_roof', 2.05, 1.5, 0.09, sx0, sy0, 2.05, M['olive_dk'], bev=0.02))
    parts.append(box('sh_door', 0.02, 0.75, 1.5, sx0 - 0.96, sy0, 0.8, M['olive_dk']))
    parts.append(box('sh_handle', 0.05, 0.12, 0.04, sx0 - 1.0, sy0 + 0.25, 0.9, M['dark']))
    parts.append(box('sh_grille', 0.5, 0.04, 0.5, sx0, sy0 + 0.7, 1.5, M['dark']))
    parts.append(box('sh_grille2', 0.04, 0.5, 0.4, sx0 + 0.96, sy0, 0.6, M['dark']))
    parts.append(cyl('exhaust', 0.055, 1.0, sx0 + 0.8, sy0 + 0.55, 2.45, M['dark'], verts=8))
    parts.append(cyl('exh_cap', 0.09, 0.06, sx0 + 0.8, sy0 + 0.55, 2.97, M['dark'], verts=8))
    parts.append(sph('camonet', 1.95, sx0, sy0, 1.35, M['camonet'], seg=20, sz=0.52))
    for (nx, ny) in [(sx0 - 1.7, sy0 - 1.2), (sx0 + 1.7, sy0 - 1.2), (sx0 - 1.7, sy0 + 1.2), (sx0 + 1.7, sy0 + 1.2)]:
        parts.append(cyl('netpole', 0.03, 1.7, nx, ny, 0.85, M['olive_dk'], verts=6))
    parts.append(box('hvac', 0.7, 0.35, 0.6, sx0 + 0.5, sy0 - 0.95, 0.35, M['white'], bev=0.02))
    # 드럼·배전함·덕트·케이블 스풀
    parts.append(cyl('drum1', 0.3, 0.9, 1.35, 2.2, 0.45, M['olive_dk'], verts=14))
    parts.append(cyl('drum2', 0.3, 0.9, 2.05, 2.3, 0.45, M['warn'], verts=14))
    parts.append(box('elec', 0.5, 0.25, 0.9, -2.3, 1.9, 0.45, M['dark'], bev=0.02))
    parts.append(box('duct', 0.18, 3.0, 0.1, -1.6, 0.4, 0.03, M['dark'], rz=0.5))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.34, minor_radius=0.1, major_segments=16,
                                     minor_segments=8, location=(0.85, 2.5, 0.34),
                                     rotation=(math.pi / 2, 0, 0.6))
    spool = bpy.context.active_object
    spool.name = 'spool'
    spool.data.materials.append(M['olive'])
    parts.append(spool)
    for s in (-1, 1):
        parts.append(cyl('spoolflange', 0.46, 0.05, 0.85 + 0.14 * s * math.sin(0.6),
                         2.5 - 0.14 * s * math.cos(0.6), 0.34, M['olive_dk'], verts=16,
                         rot=(math.pi / 2, 0, 0.6)))
    # 모래주머니 진지 (남서)
    cxx, cyy, rr = -2.15, -2.15, 1.15
    for layer in range(2):
        for k in range(10):
            a = math.radians(120 + k * 21 + layer * 10)
            parts.append(box('sbag', 0.42, 0.24, 0.16, cxx + rr * math.cos(a), cyy + rr * math.sin(a),
                             0.08 + layer * 0.16, M['sand'], rz=a + math.pi / 2, bev=0.05))
    # 철조망 펜스 (−X 게이트)
    F, PZ = 3.42, 1.8
    for side in range(4):
        for t in (-2, -1, 0, 1, 2):
            p = t * 1.71
            x, y = [(p, -F), (F, p), (p, F), (-F, p)][side]
            if side == 3 and t == 0:
                continue
            parts.append(cyl('fpost', 0.032, PZ, x, y, PZ / 2, M['galvtex'], verts=8))
    for (a, b) in [((-F, -F), (F, -F)), ((F, -F), (F, F)), ((F, F), (-F, F))]:
        for z in (0.55, 1.7):
            parts.append(strut('frail', (a[0], a[1], z), (b[0], b[1], z), 0.02, M['galv']))
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        horiz = abs(a[1] - b[1]) < 0.01
        parts.append(box('fmesh', 2 * F if horiz else 0.02, 0.02 if horiz else 2 * F,
                         1.55, mid[0], mid[1], 0.95, M['fence']))
    for sgn in (-1, 1):
        y0, y1 = sgn * 0.6, sgn * F
        for z in (0.55, 1.7):
            parts.append(strut('frail', (-F, y0, z), (-F, y1, z), 0.02, M['galv']))
        parts.append(box('fmesh', 0.02, abs(y1 - y0), 1.55, -F, (y0 + y1) / 2, 0.95, M['fence']))
        parts.append(cyl('gatepost', 0.045, PZ + 0.15, -F, y0, (PZ + 0.15) / 2, M['warn'], verts=8))
    # 저지 배리어 2기 (게이트 안쪽)
    for i, (bx, by, brz) in enumerate([(-2.75, -0.5, 0.25), (-2.55, -1.35, -0.15)]):
        parts.append(box('jersey', 1.5, 0.42, 0.75, bx, by, 0.38, M['conc'], rz=brz, bev=0.06))
        parts.append(box('jstripe', 1.52, 0.05, 0.12, bx, by + 0.19 * math.cos(brz), 0.55, M['warn'], rz=brz))
    # 입간판 GP-107 (게이트 밖 방향 −X 지향)
    parts.append(cyl('signpost', 0.035, 1.5, -3.05, 1.25, 0.75, M['galv'], verts=8))
    parts.append(cyl('signpost', 0.035, 1.5, -3.05, 1.95, 0.75, M['galv'], verts=8))
    parts.append(box('signboard', 0.06, 0.95, 0.5, -3.05, 1.6, 1.6, M['white'], bev=0.02))
    parts.append(text3d('signtxt', 'GP-107', 0.22, -3.1, 1.6, 1.6, M['olive_dk'],
                        rot=(math.pi / 2, 0, -math.pi / 2)))
    # 투광등주
    px, py = -2.75, 0.2
    parts.append(cyl('lpole', 0.05, 4.2, px, py, 2.1, M['galvtex'], verts=8))
    parts.append(strut('lbar', (px - 0.35, py, 4.15), (px + 0.35, py, 4.15), 0.03, M['galv']))
    for dx in (-0.35, 0.35):
        parts.append(cyl('lhead', 0.11, 0.16, px + dx, py, 4.05, M['olive_dk'], verts=10,
                         rot=(math.radians(120), 0, 0)))
        parts.append(cyl('llens', 0.09, 0.02, px + dx, py + 0.07, 3.98, M['lamp'], verts=10,
                         rot=(math.radians(120), 0, 0)))
    # 태극기 게양대
    fx, fy = 2.9, 2.9
    parts.append(cyl('flagpole', 0.035, 5.2, fx, fy, 2.6, M['white'], verts=10))
    parts.append(sph('finial', 0.06, fx, fy, 5.22, M['yellow'], seg=10))
    parts.append(flag_mesh('taegeukgi', 0.95, 0.63, fx + 0.03, fy, 4.78, M['flag']))
    # 볼라드
    for (bx, by) in [(-3.1, -3.1), (3.1, -3.1), (3.1, 3.1), (-3.1, 3.1)]:
        parts.append(cyl('bol', 0.07, 0.75, bx, by, 0.32, M['warn'], verts=10))
        parts.append(sph('bolt', 0.07, bx, by, 0.72, M['white'], seg=10))
    return join_as(parts, 'GP_BASE')

# ═════════════════════ 3) 관측 캐빈 ═════════════════════
def build_cab():
    parts = []
    L, DK, DZ = 0.95, 1.9, 0.55
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(strut('tr', (sx * L, sy * L, -0.35),
                               (sx * (DK - 0.06), sy * (DK - 0.06), DZ - 0.02), 0.06, M['galvtex']))
    rim = DK - 0.05
    for (a, b) in [((-rim, -rim), (rim, -rim)), ((rim, -rim), (rim, rim)),
                   ((rim, rim), (-rim, rim)), ((-rim, rim), (-rim, -rim))]:
        parts.append(strut('rim', (a[0], a[1], DZ - 0.03), (b[0], b[1], DZ - 0.03), 0.045, M['galvtex']))
    parts.append(box('deck', DK * 2, DK * 2, 0.12, 0, 0, DZ + 0.06, M['olive_dk'], bev=0.03))
    parts.append(box('rib1', DK * 2 - 0.2, 0.1, 0.1, 0, 0, DZ - 0.05, M['steel_dk']))
    parts.append(box('rib2', 0.1, DK * 2 - 0.2, 0.1, 0, 0, DZ - 0.05, M['steel_dk']))
    dtop = DZ + 0.12
    posts = [-1.85, -0.925, 0.0, 0.925, 1.85]
    for side in range(4):
        for p in posts:
            if side == 2 and abs(p) < 0.3:
                continue
            x, y = [(p, -1.85), (1.85, p), (p, 1.85), (-1.85, p)][side]
            parts.append(cyl('post', 0.025, 1.05, x, y, dtop + 0.525, M['galv'], verts=8))
    for z in (dtop + 1.02, dtop + 0.6):
        for (a, b) in [((-1.85, -1.85), (1.85, -1.85)), ((1.85, -1.85), (1.85, 1.85)),
                       ((-1.85, 1.85), (-1.85, -1.85))]:
            parts.append(strut('rail', (a[0], a[1], z), (b[0], b[1], z), 0.028, M['galv']))
        parts.append(strut('rail', (-1.85, 1.85, z), (-0.35, 1.85, z), 0.028, M['galv']))
        parts.append(strut('rail', (0.35, 1.85, z), (1.85, 1.85, z), 0.028, M['galv']))
    for (a, b) in [((-1.85, -1.85), (1.85, -1.85)), ((1.85, -1.85), (1.85, 1.85)),
                   ((-1.85, 1.85), (-1.85, -1.85))]:
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        horiz = abs(a[1] - b[1]) < 0.01
        parts.append(box('kick', 3.7 if horiz else 0.03, 0.03 if horiz else 3.7, 0.14,
                         mid[0], mid[1], dtop + 0.07, M['warn']))
    # 관측실 본체 (베벨 + 위장)
    w = 1.35
    parts.append(box('wall_lo', w * 2, w * 2, 0.86, 0, 0, dtop + 0.43, M['camo'], bev=0.03))
    parts.append(box('sill', w * 2 + 0.08, w * 2 + 0.08, 0.07, 0, 0, dtop + 0.885, M['olive_dk'], bev=0.02))
    parts.append(box('glassband', w * 2 - 0.06, w * 2 - 0.06, 0.78, 0, 0, dtop + 1.32, M['glass']))
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(box('pillar', 0.15, 0.15, 1.98, sx * (w - 0.075), sy * (w - 0.075),
                             dtop + 0.99, M['camo'], bev=0.02))
    for side in range(4):
        for mx in (-0.45, 0.45):
            x, y = [(mx, -w), (w, mx), (mx, w), (-w, mx)][side]
            parts.append(box('mullion', 0.06 if side % 2 == 0 else 0.02,
                             0.02 if side % 2 == 0 else 0.06, 0.78, x, y, dtop + 1.32, M['olive_dk']))
    parts.append(box('door', 0.78, 0.05, 1.55, 0, w + 0.01, dtop + 0.78, M['camo'], bev=0.02))
    parts.append(box('doorknob', 0.05, 0.05, 0.05, 0.3, w + 0.05, dtop + 0.85, M['dark']))
    parts.append(text3d('cabid', 'GP-107', 0.17, 0, -w - 0.03, dtop + 0.5, M['white'],
                        rot=(math.pi / 2, 0, math.pi)))
    # 내부: 콘솔·스크린·의자·랙 + 지도 테이블
    parts.append(box('console', 1.6, 0.45, 0.06, 0, -0.95, dtop + 0.98, M['dark'], bev=0.02))
    for cx in (-0.55, 0.55):
        parts.append(cyl('cleg', 0.03, 0.9, cx, -0.95, dtop + 0.5, M['steel_dk'], verts=6))
    for cx in (-0.4, 0.4):
        parts.append(box('screen', 0.55, 0.03, 0.36, cx, -1.12, dtop + 1.28, M['screen'],
                         rx=math.radians(-15)))
    parts.append(box('seat', 0.46, 0.46, 0.06, 0, -0.3, dtop + 0.62, M['olive_dk']))
    parts.append(box('sback', 0.46, 0.06, 0.5, 0, -0.06, dtop + 0.92, M['olive_dk']))
    parts.append(cyl('spost', 0.04, 0.5, 0, -0.3, dtop + 0.35, M['steel_dk'], verts=8))
    parts.append(box('rack', 0.5, 0.35, 1.1, 1.0, 0.9, dtop + 0.68, M['dark'], bev=0.02))
    parts.append(box('maptable', 0.8, 0.55, 0.05, -0.85, 0.75, dtop + 0.9, M['olive'], bev=0.02))
    parts.append(box('map', 0.7, 0.45, 0.012, -0.85, 0.75, dtop + 0.94, M['white']))
    # 대형 관측쌍안경 (데크, −Y 전방 지향)
    bx, by = 0.75, -1.55
    apex = (bx, by, dtop + 0.85)
    for k in range(3):
        a = math.radians(90 + k * 120)
        parts.append(strut('tripod', (bx + 0.32 * math.cos(a), by + 0.32 * math.sin(a), dtop + 0.02),
                           apex, 0.022, M['olive_dk']))
    parts.append(cyl('binhead', 0.05, 0.14, bx, by, dtop + 0.9, M['dark'], verts=8))
    for dx in (-0.085, 0.085):
        parts.append(cyl('bintube', 0.065, 0.46, bx + dx, by - 0.1, dtop + 1.0, M['olive_dk'],
                         verts=10, rot=(math.radians(78), 0, 0)))
        parts.append(cyl('binlens', 0.055, 0.02, bx + dx, by - 0.32, dtop + 1.05, M['glass'],
                         verts=10, rot=(math.radians(78), 0, 0)))
    # 지붕
    parts.append(box('roof', w * 2 + 0.5, w * 2 + 0.5, 0.13, 0, 0, dtop + 2.04, M['olive_dk'], bev=0.03))
    parts.append(box('roofcap', w * 2 + 0.1, w * 2 + 0.1, 0.08, 0, 0, dtop + 2.14, M['camo'], bev=0.02))
    rtop = dtop + 2.18
    parts.append(box('hatch', 0.55, 0.55, 0.06, -0.35, 0.1, rtop + 0.03, M['olive_dk'], bev=0.02))
    parts.append(box('hatchhandle', 0.18, 0.04, 0.04, -0.35, 0.35, rtop + 0.08, M['dark']))
    # 지붕 장비군
    parts.append(cyl('rad_ped', 0.16, 0.3, 0.72, 0.72, rtop + 0.15, M['steel_dk'], verts=10))
    parts.append(sph('radome', 0.42, 0.72, 0.72, rtop + 0.62, M['radome'], seg=20))
    parts.append(box('sl_yoke', 0.08, 0.26, 0.3, -0.75, -0.75, rtop + 0.18, M['steel_dk']))
    parts.append(cyl('sl_body', 0.19, 0.45, -0.75, -0.75, rtop + 0.4, M['olive_dk'], verts=14,
                     rot=(math.radians(75), 0, math.radians(-135))))
    parts.append(cyl('sl_lens', 0.165, 0.03, -0.9, -0.9, rtop + 0.46, M['lamp'], verts=14,
                     rot=(math.radians(75), 0, math.radians(-135))))
    parts.append(cyl('dish_ped', 0.06, 0.5, -0.7, 0.75, rtop + 0.25, M['steel_dk'], verts=8))
    parts.append(cyl('dish', 0.34, 0.05, -0.7, 0.75, rtop + 0.62, M['radome'], verts=20,
                     rot=(math.radians(55), 0, math.radians(180))))
    parts.append(strut('feed', (-0.7, 0.75, rtop + 0.62), (-0.7, 0.98, rtop + 0.86), 0.015, M['dark']))
    parts.append(box('spframe', 1.0, 0.68, 0.02, 0.15, -0.85, rtop + 0.3, M['steel_dk'],
                     rx=math.radians(25)))
    parts.append(box('spanel', 0.95, 0.62, 0.025, 0.15, -0.85, rtop + 0.315, M['solar'],
                     rx=math.radians(25)))
    parts.append(cyl('anemo', 0.016, 1.1, 1.0, 0.1, rtop + 0.55, M['galv'], verts=6))
    parts.append(strut('anarm', (0.85, 0.1, rtop + 1.05), (1.15, 0.1, rtop + 1.05), 0.012, M['galv']))
    parts.append(sph('acup', 0.035, 0.85, 0.1, rtop + 1.05, M['white'], seg=8))
    parts.append(sph('acup', 0.035, 1.15, 0.1, rtop + 1.05, M['white'], seg=8))
    parts.append(cyl('whip1', 0.016, 2.3, 0.95, -0.95, rtop + 1.15, M['dark'], verts=6))
    parts.append(cyl('whip2', 0.016, 1.6, -0.95, -0.4, rtop + 0.8, M['dark'], verts=6))
    parts.append(cyl('rod', 0.02, 1.5, 0, 0, rtop + 0.75, M['galv'], verts=6))
    parts.append(cyl('bcn_ped', 0.05, 0.5, 0, 0, rtop + 1.55, M['steel_dk'], verts=8))
    parts.append(sph('bcn', 0.11, 0, 0, rtop + 1.85, M['beacon'], seg=12))
    parts.append(cyl('horn', 0.13, 0.3, 1.45, -1.45, rtop + 0.32, M['olive_dk'], verts=10,
                     rot=(math.radians(75), 0, math.radians(45)), rtop=0.035))
    # 처진 안테나 케이블 (휩 → 벽면 정션)
    parts.append(cable('acable1', [(0.95, -0.95, rtop + 0.02), (1.1, -1.15, rtop - 0.2),
                                   (1.22, -1.34, dtop + 1.75), (1.15, -1.39, dtop + 1.15)],
                       0.013, M['dark']))
    parts.append(cable('acable2', [(-0.95, -0.4, rtop + 0.02), (-1.15, -0.6, rtop - 0.25),
                                   (-1.3, -0.85, dtop + 1.6), (-1.37, -0.9, dtop + 1.1)],
                       0.013, M['dark']))
    parts.append(box('wall_jbox', 0.16, 0.1, 0.22, 1.15, -1.42, dtop + 1.05, M['olive']))
    for (a, b) in [((-w - 0.2, -w - 0.2), (w + 0.2, -w - 0.2)), ((w + 0.2, -w - 0.2), (w + 0.2, w + 0.2)),
                   ((w + 0.2, w + 0.2), (-w - 0.2, w + 0.2)), ((-w - 0.2, w + 0.2), (-w - 0.2, -w - 0.2))]:
        parts.append(strut('rrail', (a[0], a[1], rtop + 0.3), (b[0], b[1], rtop + 0.3), 0.02, M['galv']))
    for (px, py) in [(-w - 0.2, -w - 0.2), (w + 0.2, -w - 0.2), (w + 0.2, w + 0.2), (-w - 0.2, w + 0.2)]:
        parts.append(cyl('rpost', 0.018, 0.3, px, py, rtop + 0.15, M['galv'], verts=6))
    # 데크 하부 EO/IR 터렛 + 투광등
    parts.append(cyl('eo_ped', 0.07, 0.18, 0, -1.55, DZ - 0.11, M['steel_dk'], verts=10))
    parts.append(box('eo_yoke', 0.3, 0.08, 0.12, 0, -1.55, DZ - 0.24, M['steel_dk']))
    parts.append(sph('eo_ball', 0.16, 0, -1.55, DZ - 0.38, M['olive_dk'], seg=14))
    parts.append(cyl('eo_lens', 0.06, 0.03, 0, -1.7, DZ - 0.38, M['irlens'], verts=10,
                     rot=(math.pi / 2, 0, 0)))
    parts.append(box('cab_hvac', 0.8, 0.32, 0.55, 0.55, -w - 0.18, dtop + 0.55, M['white'], bev=0.02))
    for (fx, fy) in [(-1.7, -1.7), (1.7, 1.7)]:
        parts.append(box('fl_arm', 0.06, 0.06, 0.3, fx, fy, DZ - 0.2, M['steel_dk']))
        parts.append(cyl('fl_head', 0.11, 0.16, fx, fy, DZ - 0.38, M['olive_dk'], verts=10,
                         rot=(math.radians(35), 0, math.atan2(fy, fx))))
        parts.append(cyl('fl_lens', 0.09, 0.02, fx, fy, DZ - 0.46, M['lamp'], verts=10,
                         rot=(math.radians(35), 0, math.atan2(fy, fx))))
    return join_as(parts, 'GP_CAB')

# ═════════════════════ 빌드 → 내보내기 → 검증 렌더 ═════════════════════
try:
    print('== BUILD MAST ==')
    mast = build_mast()
    export_glb(mast, os.path.join(OUT, 'gp_tower_mast.glb'))
    mast.location.x = 60

    print('== BUILD BASE ==')
    base = build_base()
    export_glb(base, os.path.join(OUT, 'gp_tower_base.glb'))
    base.location.x = 70

    print('== BUILD CAB ==')
    cab = build_cab()
    export_glb(cab, os.path.join(OUT, 'gp_tower_cab.glb'))
    cab.location.x = 80

    for src, z in [(base, 0)] + [(mast, i * 4.0) for i in range(4)] + [(cab, 16.0)]:
        cp = src.copy()
        cp.location = (0, 0, z)
        scene.collection.objects.link(cp)

    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.74))
    ground = bpy.context.active_object
    ground.data.materials.append(mk_mat('gp_ground', srgb('#6b6353'), 0, 0.95))

    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 4.0
    so = bpy.data.objects.new('sun', sun)
    so.rotation_euler = (math.radians(52), 0, math.radians(130))
    scene.collection.objects.link(so)
    world = bpy.data.worlds.new('W')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.45, 0.55, 0.68, 1)
    scene.world = world

    cam_data = bpy.data.cameras.new('cam')
    cam = bpy.data.objects.new('cam', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.render.resolution_x = 820
    scene.render.resolution_y = 1100

    def shoot(loc, target, path):
        cam.location = loc
        d = mathutils.Vector(target) - mathutils.Vector(loc)
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('  render ->', path)

    shoot((21, -17, 15), (0, 0, 9.0), os.path.join(RND, 'render_full.png'))
    shoot((6.0, -5.0, 19.4), (0, 0, 17.5), os.path.join(RND, 'render_cab.png'))
    shoot((-7.5, -5.5, 3.6), (0.4, 0.4, 0.7), os.path.join(RND, 'render_base.png'))
    print('== DONE ==')
except Exception:
    traceback.print_exc()
    sys.exit(1)
