import bpy, os
import numpy as np
U = r"C:/Users/USER/orca/projects/gp-optimizer/assets/models/usd"
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

def bbox_info(objs, label):
    from mathutils import Vector
    tris = 0; mn = np.array([1e9]*3); mx = np.array([-1e9]*3)
    for o in objs:
        if o.type != 'MESH': continue
        tris += sum(len(p.vertices)-2 for p in o.data.polygons)
        for c in o.bound_box:
            wc = o.matrix_world @ Vector(c); a = np.array(wc)
            mn = np.minimum(mn, a); mx = np.maximum(mx, a)
    print(label, "tris", tris, "dims", np.round(mx-mn,3).tolist(), "meshes", len([o for o in objs if o.type=='MESH']))

# 그래스 OBJ
before = set(bpy.data.objects)
try:
    bpy.ops.wm.obj_import(filepath=os.path.join(U, "graminea01_additional_files", "Graminea01_lod1.obj"))
    g = [o for o in bpy.data.objects if o not in before]
    bbox_info(g, "GRASS_lod1")
    for o in g:
        for m in o.data.materials if o.type=='MESH' else []:
            print("  grass mat:", m.name if m else None)
except Exception as e:
    print("grass import ERR:", e)

# 관목 USD C
before = set(bpy.data.objects)
try:
    bpy.ops.wm.usd_import(filepath=os.path.join(U, "shrub_european_spindle_01_usd", "Shrub_Spindle_01_C.usd"))
    s = [o for o in bpy.data.objects if o not in before]
    bbox_info(s, "SHRUB_C")
    mats = set()
    for o in s:
        if o.type=='MESH':
            for m in o.data.materials:
                if m: mats.add(m.name)
    print("  shrub mats:", list(mats)[:8])
    imgs = [i.name for i in bpy.data.images][:10]
    print("  images:", imgs)
except Exception as e:
    print("shrub import ERR:", repr(e))
