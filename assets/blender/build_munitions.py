# -*- coding: utf-8 -*-
"""
GP Digital Twin 정밀타격 자산 — 탄체 7종 + 탄공·잔해 (헤드리스 Blender 빌드)
  blender --background --factory-startup --python build_munitions.py
  blender --background --factory-startup --python build_munitions.py -- --only=mun_lgb.glb

왜 굽는가
─────────
이전 피해 시각화는 별도 씬에 박스를 세워 두고 빌보드 스프라이트로 섬광을 냈다.
이제 타격은 **VWorld 위성영상 + MapTiler 지형 위**에서 일어난다. 그 위에 얹히는
것이 스프라이트뿐이면, 5 km 조망에서는 그럴듯해도 카메라를 탄착점으로 내리는
순간 아무것도 없다 — 배경이 실사인 만큼 그 위의 물건도 실물이어야 한다.

그래서 탄체는 실척 GLB 로 굽는다. 종말유도 구간에서 카메라가 탄을 따라붙어도
날개·시커·노즐이 보이고, 탄착 뒤에는 탄공이 지형에 눌러앉는다.

계약 (strikeScene.ts 와 반드시 일치)
────────────────────────────────────
탄체   원점 = 탄체 중심, **탄두 방향 = +X**, 상방 = +Z, **실척(m)**.
       런타임은 ENU 좌표계에서 rotZ(90°−방위) · rotY(진입각) 만 곱한다 — 배율 없음.
탄공   원점 = 지표면 중심, **캐노니컬 반경 1.0 m**. 런타임이 strikeRings.crater 로
       XY 를 곱하고 Z 는 그 세제곱근으로 곱한다(깊이는 반경만큼 커지지 않는다).
잔해   원점 = 바닥 중심, 캐노니컬 반경 1.0 m. 탄공 둘레에 여러 개를 흩는다.

산출
────
  mun_atgm.glb    대전차유도탄 (현궁급)          1.55 m
  mun_shell.glb   155mm 정밀유도포탄             0.99 m
  mun_sdb.glb     소구경 정밀폭탄 (SDB급)        1.80 m
  mun_rocket.glb  유도다연장로켓 (GMLRS급)       3.90 m
  mun_lgb.glb     500lb 레이저유도폭탄           3.33 m
  mun_pen.glb     관통 유도폭탄 (벙커버스터급)   3.85 m
  mun_tbm.glb     전술지대지유도탄 (KTSSM급)     3.90 m
  mun_crater.glb  탄공 (캐노니컬 R=1)
  mun_rubble.glb  잔해 더미 (캐노니컬 R=1)
검증 렌더: assets/blender/render_mun_a.png / render_mun_b.png
"""
import bpy, bmesh, math, os, sys, traceback
import numpy as np
import mathutils

OUT = r'C:\Users\USER\orca\projects\gp-optimizer\assets\models'
RND = r'C:\Users\USER\orca\projects\gp-optimizer\assets\blender'

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

UV_TILE = 1.0        # 탄체는 시설(2 m)보다 작다 — 1 UV = 1 m 로 텍셀을 두 배 준다
N = 256

# ═══════════════════════ 텍스처 (numpy 프로시저럴) ═══════════════════════
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
    """glTF 계약: R=AO · G=러프니스 · B=메탈릭 한 장 (Separate Color 로 물린다)."""
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


def tex_ordnance(name, hexs, seam=0.35, band=None, wear=0.30):
    """탄체 도장 — 동체 패널 이음 + 스텐실 띠 + 사용 흔적.

    방향성 그라데이션은 굽지 않는다(1 m 마다 반복되므로 줄무늬가 된다).
    띠(band)는 UV 의 한 축을 따라 도는 색띠로, 탄체가 길어도 등간격으로 보인다.
    """
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    u, v = xx / N * UV_TILE, yy / N * UV_TILE
    joint = (np.abs((u % seam) - seam / 2) < 0.010).astype(np.float32)
    rivet = ((np.abs((u % (seam / 2)) - seam / 4) < 0.006)
             & (np.abs((v % 0.12) - 0.06) < 0.006)).astype(np.float32)
    f = noise2d(N, (8, 32, 128), seed=5)
    scuff = np.clip(noise2d(N, (4, 8, 16), seed=13) - 0.62, 0, 1) * wear * 3.0
    base = np.array(srgb(hexs), dtype=np.float32)
    rgb = base[None, None, :] * (0.93 + 0.13 * f - 0.34 * joint - 0.22 * rivet)[..., None]
    rgb *= (1.0 - scuff * 0.45)[..., None]
    if band is not None:
        col, period, width = band
        b = (np.abs((v % period) - period / 2) < width / 2).astype(np.float32)
        rgb = rgb * (1 - b[..., None]) + np.array(srgb(col), dtype=np.float32)[None, None, :] * b[..., None]
    height = -joint * 1.0 + rivet * 0.7 + f * 0.10
    rough = np.clip(0.44 + 0.16 * f + 0.34 * scuff + 0.12 * joint, 0.18, 1.0)
    metal = np.clip(0.18 + 0.55 * scuff, 0.0, 1.0)
    return (pack_image('tm_' + name, to_rgba(np.clip(rgb, 0, 1))),
            orm_map('tm_' + name + '_orm', rough, metal),
            normal_map('tm_' + name + '_nrm', height, 1.5))

def tex_steel():
    """도장 없는 강 — 관통탄 케이싱·노즐."""
    f = noise2d(N, (16, 64, 128), seed=23)
    grind = (np.sin(np.mgrid[0:N, 0:N][1].astype(np.float32) / N * math.pi * 190) * 0.5 + 0.5) * 0.10
    base = np.array(srgb('#6e7176'), dtype=np.float32)
    rgb = base[None, None, :] * (0.80 + 0.30 * f - grind)[..., None]
    rough = np.clip(0.30 + 0.24 * f + grind, 0.12, 1.0)
    return (pack_image('tm_steel', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('tm_steel_orm', rough, np.full_like(rough, 0.92)),
            normal_map('tm_steel_nrm', f * 0.4 + grind, 1.0))

def tex_scorch():
    """탄공 바닥 — 그을음에서 바깥으로 갈수록 흙이 드러난다.

    여기서는 방사 그라데이션을 **일부러** 굽는다. 탄공 메시는 타일링하지 않고
    UV 를 극좌표로 펴서 한 장을 통째로 덮으므로, 중심→가장자리 방향이 실제로 있다.
    """
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    r = np.sqrt(((xx - N / 2) / (N / 2)) ** 2 + ((yy - N / 2) / (N / 2)) ** 2)
    f = noise2d(N, (8, 32, 128), seed=31)
    grit = noise2d(N, (64, 128), seed=37)
    burn = np.clip(1.0 - (r * (0.82 + 0.34 * f)) ** 1.7, 0, 1)
    soil = np.array(srgb('#6b6047'), dtype=np.float32)
    char = np.array(srgb('#1c1a17'), dtype=np.float32)
    rgb = soil[None, None, :] * (0.66 + 0.62 * grit)[..., None]
    rgb = rgb * (1 - burn[..., None]) + char[None, None, :] * burn[..., None]
    rough = np.clip(0.98 - 0.22 * burn, 0.4, 1.0)
    return (pack_image('tm_scorch', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('tm_scorch_orm', rough),
            normal_map('tm_scorch_nrm', grit * 0.9 + f * 0.3, 2.6))

def tex_rubble():
    f = noise2d(N, (16, 64, 128), seed=43)
    dust = noise2d(N, (4, 16), seed=47)
    conc = np.array(srgb('#8e8a82'), dtype=np.float32)
    rgb = conc[None, None, :] * (0.52 + 0.72 * f - 0.18 * dust)[..., None]
    return (pack_image('tm_rub', to_rgba(np.clip(rgb, 0, 1))),
            orm_map('tm_rub_orm', np.clip(0.86 + 0.12 * f, 0.3, 1.0)),
            normal_map('tm_rub_nrm', f, 2.4))

# ═══════════════════════ 재질 ═══════════════════════
def _bsdf(m):
    return m.node_tree.nodes['Principled BSDF']

def mk_mat(name, color, metallic=0.0, rough=0.6, emit=None, emit_str=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = _bsdf(m)
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    if emit is not None:
        b.inputs['Emission Color'].default_value = (*emit, 1.0)
        b.inputs['Emission Strength'].default_value = emit_str
    return m

def pbr_mat(name, pack, metal_fix=None):
    """(base, orm, nrm) 3 매 배선. ORM 은 반드시 Separate Color 로 갈라 물린다 —
    Color 를 통째로 Roughness 에 넣으면 glTF 익스포터가 텍스처를 버린다."""
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
    if metal_fix is not None:
        nt.links.remove(b.inputs['Metallic'].links[0])
        b.inputs['Metallic'].default_value = metal_fix
    return m

OLIVE = pbr_mat('m_olive', tex_ordnance('olive', '#4f5343', band=('#8d8f6a', 0.55, 0.045)))
GREY = pbr_mat('m_grey', tex_ordnance('grey', '#8d9298', seam=0.28, band=('#8a3436', 0.62, 0.035), wear=0.22))
KHAKI = pbr_mat('m_khaki', tex_ordnance('khaki', '#6b6449', seam=0.42, wear=0.36))
STEEL = pbr_mat('m_steel', tex_steel())
SCORCH = pbr_mat('m_scorch', tex_scorch())
RUBBLE = pbr_mat('m_rubble', tex_rubble())
DARK = mk_mat('m_dark', srgb('#1d1f21'), 0.25, 0.55)
GLASS = mk_mat('m_seeker', srgb('#1b2b33'), 0.10, 0.08)
COPPER = mk_mat('m_copper', srgb('#7a4a2c'), 0.90, 0.35)
NOZZLE = mk_mat('m_nozzle', srgb('#33302c'), 0.85, 0.42)

# ═══════════════════════ 프리미티브 ═══════════════════════
def _act(ob):
    bpy.context.view_layer.objects.active = ob
    return ob

def cyl(name, r, depth, x, y, z, mat, verts=24, rot=(0, 0, 0), rtop=None, smooth=True):
    if rtop is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth,
                                            location=(x, y, z), rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=rtop, depth=depth,
                                        location=(x, y, z), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    if smooth:
        bpy.ops.object.shade_smooth()
    return ob

RY = (0, math.radians(90), 0)   # 실린더 축을 +X 로 눕힌다 (탄체 축)

def body(name, r, length, x, mat, verts=24, rtop=None):
    return cyl(name, r, length, x, 0, 0, mat, verts, RY, rtop)

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

def sph(name, r, x, y, z, mat, seg=20, s=(1, 1, 1)):
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

def ogive(name, r, length, x, mat, seg=22, verts=24):
    """탄두 오지브 — 원뿔이 아니라 접선 오지브다. 실루엣의 대부분이 여기서 나온다."""
    parts = []
    for i in range(seg):
        t0, t1 = i / seg, (i + 1) / seg
        # 접선 오지브 근사: r(t) = r * sqrt(1 - t^2) 를 살짝 눌러 코를 뾰족하게
        r0 = r * (1 - t0 ** 1.75) ** 0.52
        r1 = r * (1 - t1 ** 1.75) ** 0.52
        seg_len = length / seg
        parts.append(cyl(f'{name}{i}', max(r0, 0.004), seg_len,
                         x + (t0 + t1) / 2 * length, 0, 0, mat, verts, RY,
                         rtop=max(r1, 0.004)))
    return parts

def fin(name, chord, span, thick, x, roll_deg, mat, sweep=0.35, root_off=0.0):
    """꼬리·중앙 날개 하나. 후퇴각(sweep)을 넣어 앞전이 뒤로 누운 사다리꼴로."""
    verts = [
        (-chord / 2, 0, root_off), (chord / 2, 0, root_off),
        (chord / 2 - chord * sweep * 0.15, 0, root_off + span),
        (-chord / 2 + chord * sweep, 0, root_off + span),
    ]
    me = bpy.data.meshes.new(name)
    me.from_pydata([mathutils.Vector(v) for v in verts], [], [(0, 1, 2, 3)])
    me.update()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    _act(ob)
    md = ob.modifiers.new('sol', 'SOLIDIFY')
    md.thickness, md.offset = thick, 0.0
    bpy.ops.object.modifier_apply(modifier=md.name)
    md = ob.modifiers.new('bv', 'BEVEL')
    md.width, md.segments = thick * 0.42, 2
    bpy.ops.object.modifier_apply(modifier=md.name)
    ob.data.materials.append(mat)
    ob.location = (x, 0, 0)
    ob.rotation_euler = (math.radians(roll_deg), 0, 0)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    return ob

def fin_set(name, n, chord, span, thick, x, mat, sweep=0.35, root=0.0, phase=0.0):
    return [fin(f'{name}{i}', chord, span, thick, x, phase + i * 360.0 / n, mat, sweep, root)
            for i in range(n)]

def ring(name, r, thick, width, x, mat, verts=28):
    outer = cyl(name, r, width, x, 0, 0, mat, verts, RY)
    inner = cyl(name + '_c', r - thick, width * 2.2, x, 0, 0, mat, verts, RY)
    _act(outer)
    md = outer.modifiers.new('bl', 'BOOLEAN')
    md.operation, md.object = 'DIFFERENCE', inner
    bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.data.objects.remove(inner, do_unlink=True)
    return outer

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

# ═══════════════════════ UV — 월드 텍셀 밀도 통일 ═══════════════════════
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

# ═══════════════════════ 탄체 ═══════════════════════
#
# 공통 구성: [오지브 탄두] – [동체] – [보조날개] – [꼬리날개/노즐]
# 원점은 탄체 중심(±L/2), 탄두가 +X. 아래 좌표는 전부 그 규약이다.

def build_atgm():
    """대전차유도탄 (현궁급) 1.55 m — 탠덤 탄두, 접이식 날개 전개 상태."""
    L, R = 1.55, 0.077
    x0 = -L / 2
    p = []
    p += ogive('nose', R * 0.72, 0.20, x0 + L - 0.20, KHAKI, 14, 18)
    p.append(body('probe', 0.012, 0.20, x0 + L + 0.09, STEEL, 10))          # 탠덤 프로브
    p.append(sph('probe_tip', 0.022, x0 + L + 0.185, 0, 0, COPPER, 14))
    p.append(body('fore', R * 0.72, 0.16, x0 + L - 0.28, KHAKI, 20))
    p.append(body('mid', R, L - 0.42, x0 + (L - 0.42) / 2 + 0.02, KHAKI, 20))
    p.append(ring('band1', R * 1.06, 0.012, 0.028, x0 + 0.55, STEEL, 20))
    p.append(ring('band2', R * 1.06, 0.012, 0.028, x0 + 0.98, STEEL, 20))
    p += fin_set('wing', 4, 0.20, 0.155, 0.008, x0 + 0.86, DARK, 0.42, R * 0.9)
    p += fin_set('tail', 4, 0.13, 0.105, 0.007, x0 + 0.10, DARK, 0.30, R * 0.9, 45)
    p.append(cyl('noz', R * 0.62, 0.05, x0 + 0.02, 0, 0, NOZZLE, 20, RY, rtop=R * 0.78))
    return finish(join_as(p, 'atgm'), 'mun_atgm', 0.5)

def build_shell():
    """155mm 정밀유도포탄 0.99 m — 조종날개(카나드) 신관부 + 보트테일."""
    L, R = 0.99, 0.0775
    x0 = -L / 2
    p = []
    p.append(cyl('fuze', 0.030, 0.10, x0 + L - 0.05, 0, 0, STEEL, 18, RY, rtop=0.020))
    p += fin_set('canard', 4, 0.055, 0.040, 0.006, x0 + L - 0.095, STEEL, 0.25, 0.031)
    p.append(body('gseg', 0.048, 0.11, x0 + L - 0.155, STEEL, 20))
    p += ogive('nose', R, 0.30, x0 + L - 0.51, GREY, 16, 22)
    p.append(body('mid', R, 0.40, x0 + 0.28, GREY, 22))
    p.append(ring('rot', R * 1.03, 0.010, 0.032, x0 + 0.16, COPPER, 22))    # 탄대
    p.append(cyl('boat', R, 0.09, x0 + 0.045, 0, 0, GREY, 22, RY, rtop=R * 0.80))
    p += fin_set('fin', 6, 0.055, 0.036, 0.005, x0 + 0.03, DARK, 0.30, R * 0.72)
    return finish(join_as(p, 'shell'), 'mun_shell', 0.4)

def build_sdb():
    """소구경 정밀폭탄 (SDB급) 1.80 m — 다이아몬드백 날개 전개, 후미 격자 조종면."""
    L, R = 1.80, 0.095
    x0 = -L / 2
    p = []
    p += ogive('nose', R, 0.34, x0 + L - 0.34, GREY, 16, 22)
    p.append(sph('seek', 0.036, x0 + L - 0.012, 0, 0, GLASS, 16, (1.0, 1.0, 1.0)))
    p.append(body('mid', R, L - 0.44, x0 + (L - 0.44) / 2 + 0.05, GREY, 22))
    p.append(box('spine', 0.62, 0.030, 0.045, x0 + 0.92, 0, R * 0.92, GREY, bev=0.008))
    # 전개 날개 — 위로 접힌 두 장이 펼쳐진 형태 (다이아몬드백)
    for side in (1, -1):
        w = box(f'wing{side}', 0.70, 0.44, 0.011, x0 + 0.88, side * 0.245, R * 0.86, DARK, bev=0.004)
        w.rotation_euler = (0, 0, math.radians(-6 * side))
        _act(w); bpy.ops.object.transform_apply(rotation=True)
        p.append(w)
        p.append(box(f'wtip{side}', 0.30, 0.012, 0.055, x0 + 0.78, side * 0.455, R * 0.90, DARK, bev=0.004))
    p += fin_set('tail', 4, 0.135, 0.115, 0.008, x0 + 0.10, DARK, 0.34, R * 0.92, 45)
    p.append(cyl('base', R, 0.03, x0 + 0.015, 0, 0, DARK, 22, RY))
    return finish(join_as(p, 'sdb'), 'mun_sdb', 0.6)

def build_rocket():
    """유도다연장로켓 (천무/GMLRS급) 3.90 m — 카나드 + 고정 꼬리날개 + 노즐."""
    L, R = 3.90, 0.1075
    x0 = -L / 2
    p = []
    p += ogive('nose', R, 0.52, x0 + L - 0.52, OLIVE, 18, 24)
    p.append(ring('gring', R * 1.04, 0.012, 0.05, x0 + L - 0.60, STEEL, 24))
    p += fin_set('canard', 4, 0.115, 0.085, 0.008, x0 + L - 0.68, DARK, 0.28, R * 0.95)
    p.append(body('gcs', R, 0.36, x0 + L - 0.80, OLIVE, 24))
    p.append(body('warhead', R, 0.90, x0 + L - 1.43, OLIVE, 24))
    p.append(ring('jt1', R * 1.03, 0.010, 0.04, x0 + L - 0.98, STEEL, 24))
    p.append(ring('jt2', R * 1.03, 0.010, 0.04, x0 + L - 1.88, STEEL, 24))
    p.append(body('motor', R, 2.00, x0 + 0.98, OLIVE, 24))
    p += fin_set('fin', 4, 0.30, 0.135, 0.010, x0 + 0.20, DARK, 0.46, R * 0.96, 45)
    p.append(cyl('noz', R * 0.90, 0.16, x0 + 0.055, 0, 0, NOZZLE, 24, RY, rtop=R * 0.62))
    p.append(cyl('throat', R * 0.52, 0.09, x0 + 0.02, 0, 0, DARK, 20, RY))
    return finish(join_as(p, 'rocket'), 'mun_rocket', 0.8)

def build_lgb():
    """500lb 레이저유도폭탄 3.33 m — 시커 링 + 카나드, 후미 에어포일 군."""
    L, R = 3.33, 0.1335
    x0 = -L / 2
    p = []
    p.append(ring('seekring', 0.088, 0.014, 0.11, x0 + L - 0.055, STEEL, 22))
    p.append(cyl('seekwin', 0.070, 0.055, x0 + L - 0.075, 0, 0, GLASS, 20, RY, rtop=0.052))
    p.append(body('seekbay', 0.088, 0.30, x0 + L - 0.26, GREY, 22))
    p += fin_set('canard', 4, 0.16, 0.135, 0.009, x0 + L - 0.34, DARK, 0.36, 0.082)
    p.append(cyl('adapt', 0.088, 0.16, x0 + L - 0.49, 0, 0, GREY, 22, RY, rtop=R * 0.92))
    p += ogive('nose', R, 0.44, x0 + L - 0.93, OLIVE, 16, 24)
    p.append(body('mk82', R, 1.55, x0 + 1.13, OLIVE, 24))
    p.append(ring('lug1', R * 1.02, 0.010, 0.05, x0 + 1.70, STEEL, 24))
    p.append(ring('lug2', R * 1.02, 0.010, 0.05, x0 + 1.34, STEEL, 24))
    p.append(box('lugpad', 0.36, 0.05, 0.035, x0 + 1.52, 0, R * 1.00, STEEL, bev=0.006))
    p.append(cyl('taper', R, 0.42, x0 + 0.55, 0, 0, OLIVE, 24, RY, rtop=R * 0.66))
    p.append(body('tailcan', R * 0.66, 0.34, x0 + 0.17, GREY, 22))
    # BSU 계열 후미 에어포일 — 4 장 + 링 스트레이크
    p += fin_set('afin', 4, 0.42, 0.26, 0.010, x0 + 0.24, DARK, 0.55, R * 0.60, 45)
    p.append(ring('astr', R * 0.86, 0.012, 0.10, x0 + 0.07, DARK, 24))
    return finish(join_as(p, 'lgb'), 'mun_lgb', 0.9)

def build_pen():
    """관통 유도폭탄 (벙커버스터급) 3.85 m — 두꺼운 단조강 케이싱, 날씬한 오지브."""
    L, R = 3.85, 0.1550
    x0 = -L / 2
    p = []
    p += ogive('nose', R * 0.86, 0.95, x0 + L - 0.95, STEEL, 20, 24)        # 길고 뾰족한 관통 코
    p.append(body('shoulder', R, 0.32, x0 + L - 1.11, STEEL, 24))
    p.append(body('case', R, 1.85, x0 + 1.02, STEEL, 24))
    for i, xx in enumerate((0.62, 1.28, 1.94)):
        p.append(ring(f'weld{i}', R * 1.015, 0.008, 0.05, x0 + xx, STEEL, 24))
    p.append(box('lug', 0.42, 0.055, 0.040, x0 + 1.62, 0, R * 1.01, STEEL, bev=0.006))
    p.append(cyl('taper', R, 0.34, x0 + 0.42, 0, 0, STEEL, 24, RY, rtop=R * 0.70))
    p.append(body('tailcan', R * 0.70, 0.28, x0 + 0.12, GREY, 22))
    p += fin_set('fin', 4, 0.36, 0.20, 0.011, x0 + 0.20, DARK, 0.50, R * 0.68)
    p.append(ring('astr', R * 0.90, 0.012, 0.09, x0 + 0.05, DARK, 24))
    return finish(join_as(p, 'pen'), 'mun_pen', 1.0)

def build_tbm():
    """전술지대지유도탄 (KTSSM급) 3.90 m — 원뿔 탄두부 + 동체 스트레이크 + 조종날개."""
    L, R = 3.90, 0.2000
    x0 = -L / 2
    p = []
    p.append(cyl('rvcone', R * 0.70, 0.86, x0 + L - 0.43, 0, 0, DARK, 26, RY, rtop=0.016))
    p.append(cyl('rvskirt', R, 0.30, x0 + L - 1.03, 0, 0, OLIVE, 26, RY, rtop=R * 0.70))
    p.append(body('bay', R, 0.52, x0 + L - 1.44, OLIVE, 26))
    p.append(ring('sep', R * 1.02, 0.012, 0.06, x0 + L - 1.72, STEEL, 26))
    p.append(body('motor', R, 2.10, x0 + 1.14, OLIVE, 26))
    # 동체 스트레이크 — 실루엣을 길게 끊어 준다
    for i in range(4):
        s = box(f'strk{i}', 1.70, 0.014, 0.055, x0 + 1.30, 0, R * 0.99, GREY, bev=0.005)
        s.rotation_euler = (math.radians(45 + i * 90), 0, 0)
        _act(s); bpy.ops.object.transform_apply(rotation=True)
        p.append(s)
    p += fin_set('fin', 4, 0.46, 0.28, 0.013, x0 + 0.30, DARK, 0.52, R * 0.98)
    p.append(cyl('noz', R * 0.86, 0.24, x0 + 0.10, 0, 0, NOZZLE, 26, RY, rtop=R * 0.58))
    p.append(cyl('throat', R * 0.48, 0.12, x0 + 0.03, 0, 0, DARK, 22, RY))
    return finish(join_as(p, 'tbm'), 'mun_tbm', 1.0)

# ═══════════════════════ 탄공·잔해 ═══════════════════════

def build_crater():
    """탄공 립(rim)·분출토 — 캐노니컬 반경 1.0 m(= 립 능선), 원점은 지표면.

    **사발을 파지 않는다.** Cesium 의 지구는 지형 타일 표면이 곧 솔리드라, 지표
    아래로 내려간 면은 그 타일이 통째로 가린다 — 실제로 첫 빌드에서 사발 안쪽이
    전부 사라지고 도넛만 남았다. 그래서 「구멍」은 지형에 드리우는 그을음 원판
    (strikeScene 의 지형 클램프 타원)이 맡고, 이 GLB 는 **지표 위로 솟은 립과
    분출토 자락**만 맡는다. 둘이 겹쳐야 탄공으로 보인다.

    프로파일: r=0.52 에서 살짝 파인 안턱 → r=1.00 립 능선(+0.15) → r=1.34 자락(0).
    """
    RINGS, SECT = 14, 64
    R_IN, R_CREST, R_OUT = 0.52, 1.00, 1.34
    RIM = 0.15
    rng = np.random.default_rng(9)
    lump = rng.random(SECT) * 0.5 + 0.75
    verts, faces = [], []
    for i in range(RINGS + 1):
        t = i / RINGS
        rr = R_IN + (R_OUT - R_IN) * t
        for j in range(SECT):
            a = j / SECT * math.tau
            wob = 0.96 + 0.08 * lump[j]                    # 립은 정원이 아니다 (약하게만)
            r = rr * wob
            if rr <= R_CREST:                              # 안턱 → 립 능선
                u = (rr - R_IN) / (R_CREST - R_IN)
                z = -0.05 * (1 - u) ** 1.4 + RIM * u ** 1.5
            else:                                          # 립 → 분출토 자락
                u = (rr - R_CREST) / (R_OUT - R_CREST)
                z = RIM * (1 - u) ** 1.7
            z += (lump[(j * 5 + i) % SECT] - 0.90) * 0.030 * (0.35 + t)
            verts.append((r * math.cos(a), r * math.sin(a), z))
    for i in range(RINGS):
        for j in range(SECT):
            a = i * SECT + j
            b = i * SECT + (j + 1) % SECT
            c = (i + 1) * SECT + (j + 1) % SECT
            d = (i + 1) * SECT + j
            faces.append((a, b, c, d))
    me = bpy.data.meshes.new('crater')
    me.from_pydata([mathutils.Vector(v) for v in verts], [], faces)
    me.update()
    ob = bpy.data.objects.new('crater', me)
    scene.collection.objects.link(ob)
    ob.data.materials.append(SCORCH)
    _act(ob)
    # 극좌표 UV — 텍스처의 방사 그을음이 립 안쪽으로 가게 (smart_project 를 쓰지 않는다)
    me.uv_layers.new(name='UVMap')
    lay = me.uv_layers.active.data
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            lay[li].uv = (v.x / (R_OUT * 2) + 0.5, v.y / (R_OUT * 2) + 0.5)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(52))
    except Exception:
        pass
    ob.name = 'mun_crater'
    return ob

def build_rubble():
    """잔해 더미 — 캐노니컬 반경 1.0 m, 원점은 바닥 중심."""
    rng = np.random.default_rng(17)
    parts = []
    for i in range(22):
        a = rng.random() * math.tau
        rad = rng.random() ** 0.6 * 0.92
        s = 0.10 + rng.random() * 0.30
        parts.append(box(f'chunk{i}', s, s * (0.5 + rng.random()), s * (0.28 + rng.random() * 0.5),
                         rad * math.cos(a), rad * math.sin(a), s * 0.22,
                         RUBBLE,
                         rx=rng.random() * 0.9, ry=rng.random() * 0.9, rz=rng.random() * math.tau,
                         bev=0.012))
    for i in range(6):                                       # 삐져나온 철근
        a = rng.random() * math.tau
        rad = rng.random() * 0.5
        r = cyl(f'rebar{i}', 0.014, 0.55 + rng.random() * 0.5,
                rad * math.cos(a), rad * math.sin(a), 0.22, STEEL, 8,
                (rng.random() * 1.2 - 0.6, rng.random() * 1.2 - 0.6, 0))
        parts.append(r)
    return finish(join_as(parts, 'rubble'), 'mun_rubble', 0.5)

BUILDS = [
    (build_atgm, 'mun_atgm.glb'),
    (build_shell, 'mun_shell.glb'),
    (build_sdb, 'mun_sdb.glb'),
    (build_rocket, 'mun_rocket.glb'),
    (build_lgb, 'mun_lgb.glb'),
    (build_pen, 'mun_pen.glb'),
    (build_tbm, 'mun_tbm.glb'),
    (build_crater, 'mun_crater.glb'),
    (build_rubble, 'mun_rubble.glb'),
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
    for f, p, k in EXPORTED:
        print(f'   {f:24s} faces={p:6d}  {k:5d}KB')
    if ONLY:
        print('== DONE (partial) ==', len(EXPORTED))
        sys.exit(0)

    # ── 검증 렌더: 탄체를 길이순으로 눕혀 늘어놓고, 탄공·잔해는 옆에 ──
    order = ['mun_atgm.glb', 'mun_shell.glb', 'mun_sdb.glb', 'mun_rocket.glb',
             'mun_lgb.glb', 'mun_pen.glb', 'mun_tbm.glb']
    for i, key in enumerate(order):
        ob = built.get(key)
        if ob:
            ob.location = (0, -i * 0.85, 1.2)
    cr = built.get('mun_crater.glb')
    if cr:
        cr.location = (0, 3.4, 0.01)
        cr.scale = (2.6, 2.6, 1.6)
    rb = built.get('mun_rubble.glb')
    if rb:
        rb.location = (3.4, 3.4, 0)
        rb.scale = (1.3, 1.3, 1.3)

    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
    g = bpy.context.active_object
    g.data.materials.append(mk_mat('m_ground', srgb('#5f6555'), 0.0, 0.95))

    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy, sun.angle = 5.2, math.radians(1.6)
    so = bpy.data.objects.new('sun', sun)
    so.rotation_euler = (math.radians(52), 0, math.radians(126))
    scene.collection.objects.link(so)
    world = bpy.data.worlds.new('W')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.50, 0.60, 0.74, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 2.0
    scene.world = world
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    scene.collection.objects.link(cam)
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 48
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

    shoot((3.2, -9.5, 4.6), (0.2, -2.4, 0.9), os.path.join(RND, 'render_mun_a.png'), 45)
    shoot((2.6, 0.9, 1.9), (0.0, -1.7, 1.1), os.path.join(RND, 'render_mun_b.png'), 80)
    shoot((3.0, 6.6, 2.6), (1.4, 3.4, 0.1), os.path.join(RND, 'render_mun_c.png'), 55)
    print('== DONE ==', len(EXPORTED), 'files')
except Exception:
    traceback.print_exc()
    sys.exit(1)
