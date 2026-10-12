import bpy, math
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

bpy.ops.import_scene.gltf(filepath=r'C:\Users\USER\orca\projects\gp-optimizer\assets\models\fac_stem.glb')
ob = bpy.context.selected_objects[0]
ob.location = (0, 0, 0)
ob.scale = (1, 1, 15.0)   # 극단적 성토 시나리오 재현(placement.ts clamp 상한 40 근처)
bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True)
bpy.context.view_layer.objects.active = ob
bpy.ops.object.transform_apply(scale=True)

sun = bpy.data.lights.new('sun', 'SUN')
sun.energy = 3.0
sun_ob = bpy.data.objects.new('sun', sun)
scene.collection.objects.link(sun_ob)
sun_ob.rotation_euler = (math.radians(55), 0, math.radians(35))

world = bpy.data.worlds.new('W')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.55, 0.6, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
scene.world = world

import mathutils

def look_at(ob, target):
    direction = mathutils.Vector(target) - ob.location
    ob.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

cam_data = bpy.data.cameras.new('cam')
cam = bpy.data.objects.new('cam', cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

MIDZ = -7.5  # 벽 중간 높이 (0 ~ -15 사이)

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 900
scene.render.resolution_y = 700

# X면(좌/우, 예전엔 통짜였던 면)을 정면으로 본다
cam.location = (14, 0, MIDZ)
look_at(cam, (0, 0, MIDZ))
scene.render.filepath = r'C:\Users\USER\orca\projects\gp-optimizer\assets\blender\render_stem_xface.png'
bpy.ops.render.render(write_still=True)

# Y면(원래도 디테일 있던 면) 비교용
cam.location = (0, 10, MIDZ)
look_at(cam, (0, 0, MIDZ))
scene.render.filepath = r'C:\Users\USER\orca\projects\gp-optimizer\assets\blender\render_stem_yface.png'
bpy.ops.render.render(write_still=True)
print('DONE')
