# -*- coding: utf-8 -*-
"""
GP Digital Twin 지형 꾸미기 소품 3종 — 전용 헤드리스 Blender 빌드
  blender --background --factory-startup --python build_scatter.py

배치 탭에서 GP 부지 주변을 꾸미는 실척물(늘리지 않는 고정 크기) 소품. facilities3의
fac_tree/fac_bush/fac_planter 계열과 같은 자리에 놓는다 — 원점 = 지면 중심, 정면 −Y.
위장망(fac_camonet.glb)·흙 방호둑(fac_revet.glb)·장애물(fac_obst_*.glb)은
build_facilities2.py가 이미 소유한다 — 겹치는 소품을 여기서 새로 만들지 않는다.

산출:
  scat_hesco.glb      HESCO 방벽 1유닛(1.37×1.37×1.02m) — 철망 게이비언 + 충전토 마운드
  scat_sandbags.glb   모래주머니 벽 3m 구간(2단 엇쌓기) — 직선 방호벽/참호 가장자리용
  scat_wire.glb       윤형(콘서티나) 철조망 3m 구간 — 토러스 고리 연속 배치 + 양끝 피켓
검증 렌더: assets/blender/render_scat.png
"""
import bpy, math, os, sys, traceback
import numpy as np
import mathutils

OUT = r'C:\Users\USER\orca\projects\gp-optimizer\assets\models'
RND = r'C:\Users\USER\orca\projects\gp-optimizer\assets\blender'

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def srgb(hexs):
    h = hexs.lstrip('#')
    return tuple(((int(h[i:i + 2], 16) / 255.0) ** 2.2) for i in (0, 2, 4))

def pack_image(name, arr):
    im = bpy.data.images.new(name, arr.shape[1], arr.shape[0], alpha=True)
    im.pixels.foreach_set(arr.astype(np.float32).ravel())
    im.pack()
    return im

def make_mesh_pattern(N=128, hexa='#8a7b5c', hexb='#5c5140'):
    """HESCO 게이비언 다이아몬드 철망 패턴."""
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    cell = 12.0
    u, v = (xx % cell) / cell, (yy % cell) / cell
    diamond = (np.abs(u - 0.5) + np.abs(v - 0.5)) < 0.16
    img = np.zeros((N, N, 4), dtype=np.float32)
    img[..., :3] = srgb(hexa)
    img[diamond, :3] = srgb(hexb)
    img[..., 3] = 1.0
    return pack_image('sc_mesh', img)

def _alpha_blend(m):
    for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
        try:
            setattr(m, attr, val)
        except Exception:
            pass

def mk_mat(name, color, metallic=0.0, rough=0.6, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    b.inputs['Alpha'].default_value = alpha
    if alpha < 1.0:
        _alpha_blend(m)
    return m

def tex_mat(name, img, metallic=0.0, rough=0.7):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img
    nt.links.new(tx.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    return m

def mk_weathered_mat(name, color, metallic=0.0, rough=0.6, grime=0.45, rust=0.0, scale=2.6):
    """build_tower.py 의 동명 함수와 같은 구현(진폭도 그대로) — Object 좌표 노이즈로
    색/러프니스/범프에 얼룩을 얹는다. UV 불필요. AgX+Cycles 디노이즈 조합에서 종이
    계산상 색차보다 훨씬 더 죽으므로, 렌더로 직접 확인해 맞춘 값을 그대로 재사용한다
    (build_tower.py 의 주석 참고 — 눈대중으로 낮추면 거의 안 보이는 효과가 된다).
    rust>0 이면 성긴 녹 반점을 추가로 흩뿌린다."""
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

MESH = make_mesh_pattern()
M = {
    'mesh':     tex_mat('sc_mesh_mat', MESH, rough=0.75),
    'earth':    mk_weathered_mat('sc_earth',    srgb('#7a6a4a'), 0.0,  0.95, grime=0.4,  scale=3.0),
    'sand':     mk_weathered_mat('sc_sand',     srgb('#8a7b5c'), 0.0,  0.9,  grime=0.35, scale=4.0),
    'sand_dk':  mk_weathered_mat('sc_sand_dk',  srgb('#6e6248'), 0.0,  0.92, grime=0.35, scale=4.0),
    'steel_dk': mk_weathered_mat('sc_steel_dk', srgb('#3c4348'), 0.6,  0.5,  grime=0.4,  rust=0.15, scale=2.0),
    'wire':     mk_weathered_mat('sc_wire',     srgb('#5a5f61'), 0.75, 0.4,  grime=0.4,  rust=0.3,  scale=6.0),
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

def sph(name, r, x, y, z, mat, seg=14, s=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=max(7, seg // 2), radius=r, location=(x, y, z))
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

# ═════════ 1) HESCO 방벽 1유닛 ═════════
def build_hesco():
    parts = []
    W, D, H = 1.37, 1.37, 1.02
    parts.append(box('shell', W, D, H, 0, 0, H / 2, M['mesh'], bev=0.03))
    parts.append(box('fill', W - 0.14, D - 0.14, 0.12, 0, 0, H - 0.02, M['earth'], bev=0.02))
    for i in range(5):
        mx = (i - 2) * (W - 0.3) / 5
        my = ((i * 7) % 3 - 1) * (D - 0.3) / 3
        parts.append(sph(f'mound{i}', 0.16 + 0.03 * (i % 2), mx, my, H + 0.03, M['earth'], seg=8, s=(1, 1, 0.6)))
    return join_as(parts, 'SCAT_HESCO')

# ═════════ 2) 모래주머니 벽 3m 구간 ═════════
def build_sandbags():
    parts = []
    LEN, BAG_L, BAG_W, BAG_H = 3.0, 0.42, 0.24, 0.16
    rng = np.random.default_rng(2026)
    n = int(LEN / (BAG_L * 0.92)) + 1
    for layer in range(2):
        off = (BAG_L * 0.46) if layer % 2 else 0.0
        for i in range(n):
            x = -LEN / 2 + off + i * BAG_L * 0.92 + BAG_L / 2
            if x > LEN / 2 - 0.05:
                continue
            jitter = (rng.random() - 0.5) * 0.02
            mat = M['sand'] if (i + layer) % 3 else M['sand_dk']
            parts.append(box(f'bag_{layer}_{i}', BAG_L * 0.94, BAG_W, BAG_H, x, jitter,
                             BAG_H / 2 + layer * BAG_H * 0.92, mat, rz=jitter * 2, bev=0.05))
    return join_as(parts, 'SCAT_SANDBAGS')

# ═════════ 3) 윤형 철조망(콘서티나) 3m 구간 ═════════
def build_wire():
    """코일 축을 X(구간 진행 방향)로 눕힌 토러스를 일정 간격으로 늘어놓아 콘서티나
    철조망을 근사한다 — 실제 나선이 아니라 겹친 고리들이지만, 배치 탭 스케일에서는
    실루엣이 같다. 고리마다 반경·기울기를 살짝 흔들어 손으로 편 느낌을 준다."""
    parts = []
    LEN = 3.0
    coil_r = 0.42
    n_rings = 14
    rng = np.random.default_rng(303)
    for i in range(n_rings):
        x = -LEN / 2 + i * (LEN / (n_rings - 1))
        jr = rng.random() * 0.02
        jrot = (rng.random() - 0.5) * 0.2
        bpy.ops.mesh.primitive_torus_add(
            location=(x, 0, coil_r), rotation=(0, math.radians(90) + jrot, 0),
            major_radius=coil_r + jr, minor_radius=0.013, major_segments=16, minor_segments=6)
        ob = bpy.context.active_object
        ob.name = f'coil{i}'
        ob.data.materials.append(M['wire'])
        parts.append(ob)
    for x in (-LEN / 2 - 0.08, LEN / 2 + 0.08):
        parts.append(strut(f'stake_x{x:+.2f}', (x, -0.22, 0.0), (x, 0.22, coil_r * 1.55), 0.022, M['steel_dk']))
    return join_as(parts, 'SCAT_WIRE')

# ═════════ 빌드 → 내보내기 → 검증 렌더 ═════════
BUILDS = [
    (build_hesco, 'scat_hesco.glb'),
    (build_sandbags, 'scat_sandbags.glb'),
    (build_wire, 'scat_wire.glb'),
]
try:
    built = []
    for i, (fn, fname) in enumerate(BUILDS):
        print('== ' + fname + ' ==')
        ob = fn()
        export_glb(ob, fname)
        ob.location = (i * 5, 0, 0)
        built.append(ob)

    bpy.ops.mesh.primitive_plane_add(size=30, location=(5, -2, -0.02))
    g = bpy.context.active_object
    g.data.materials.append(mk_mat('sc_ground', srgb('#6b6353'), 0, 0.95))
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 4.5
    so = bpy.data.objects.new('sun', sun)
    so.rotation_euler = (math.radians(50), 0, math.radians(128))
    scene.collection.objects.link(so)
    world = bpy.data.worlds.new('W')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.6, 0.74, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 2.0
    scene.world = world
    try:
        scene.view_settings.look = 'AgX - Base Contrast'
    except Exception:
        pass
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = 1400, 800
    cam.location = (5, -13.0, 4.2)
    cam.data.lens = 26
    d = mathutils.Vector((5, 0, 0.4)) - mathutils.Vector(cam.location)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(RND, 'render_scat.png')
    bpy.ops.render.render(write_still=True)
    print('== DONE ==', len(built), 'files')
except Exception:
    traceback.print_exc()
    sys.exit(1)
