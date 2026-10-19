# convert_model.py — app-promo
# Usage: Blender -b --python convert_model.py -- <device.usdz> <out.glb>
import bpy, sys
src, dst = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.usd_import(filepath=src)
for o in bpy.data.objects:
    print("OBJ", o.type, o.name, [m.name for m in getattr(o.data,'materials',[]) or []] if o.type=='MESH' else '', tuple(round(d,4) for d in o.dimensions))
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB')
