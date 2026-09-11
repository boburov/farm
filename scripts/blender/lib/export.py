"""glTF export with RNA-filtered options; writes a JSON report next to the file."""
import bpy, json, os
from .log import log

def export(objects, path, armature=None, extras=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    if armature: armature.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    kw = dict(filepath=path, export_format='GLTF_SEPARATE', use_selection=True, export_apply=True, export_yup=True,
              export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT',
              export_image_format='AUTO', export_keep_originals=False, export_texture_dir='tex',
              export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_attributes=False,
              export_skins=armature is not None, export_all_influences=False, export_influence_nb=4, export_def_bones=True,
              export_rest_position_armature=True, export_armature_object_remove=False,
              export_animations=False, export_morph=False, export_lights=False, export_cameras=False,
              export_extras=True, export_copyright='Sokin Savdo — original procedural assets (CC0 textures by Poly Haven where used)')
    allowed = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    dropped = [k for k in kw if k not in allowed]
    if dropped: log('export: dropped unsupported options', dropped)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(**{k: v for k, v in kw.items() if k in allowed})
    rep = {'file': path, 'objects': [o.name for o in objects], 'armature': armature.name if armature else None}
    if extras: rep.update(extras)
    with open(os.path.splitext(path)[0] + '.report.json', 'w') as f: json.dump(rep, f, indent=1)
    return rep
