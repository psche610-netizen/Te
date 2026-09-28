"""SHUTDOWN v4 environment assets. Run with Blender's Python or the bpy wheel.
Geometry is authored in metres, Z up, front toward -Y. GLB export converts to Y up.
All paint comes from the generated atlas; no Blender-only material nodes are required.
"""
from pathlib import Path
import math, json, random, os
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
img=bpy.data.images.load(str(ROOT/'textures/painted-enamel-atlas.png'))
img.pack()
QUADS={'petrol':(0,.5),'ivory':(.5,.5),'amber':(0,0),'steel':(.5,0)}
MATS={}
def material(name,color,metallic=0,roughness=.8,emission=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metallic;bs.inputs['Roughness'].default_value=roughness
    if name in QUADS:
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img
        m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    if emission:
        bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
    MATS[name]=m
for n,c in [('petrol',(.08,.23,.24)),('ivory',(.71,.69,.59)),('amber',(.72,.36,.05)),('steel',(.03,.06,.07))]:material(n,c,0,.88)
material('hardware',(.16,.19,.18),.55,.62)
material('rubber',(.008,.015,.019),0,.96)
material('gauge-face',(.85,.76,.52),0,.9)
material('signal-amber',(1,.34,.035),0,.5,2)
material('danger-red',(.75,.012,.005),0,.5,2)
ASSETS={};CURRENT=None;PART='static'
def start(name,description):
    global CURRENT,PART
    root=bpy.data.objects.new(name,None);scene.collection.objects.link(root)
    root['description']=description;root['asset_version']='v4-first-article';root['units']='metres'
    ASSETS[name]={'root':root,'objects':[],'description':description};CURRENT=name;PART='static'
    return root

def finish_obj(o,name,mat='petrol',bevel=0):
    o.name=name;o.data.materials.clear();o.data.materials.append(MATS[mat]);o.parent=ASSETS[CURRENT]['root'];o['part']=PART
    if o.type=='MESH' and mat in QUADS:
        if not o.data.uv_layers:
            bpy.context.view_layer.objects.active=o
            bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.03);bpy.ops.object.mode_set(mode='OBJECT')
        u,v=QUADS[mat]
        for loop in o.data.uv_layers.active.data:
            loop.uv=(u+.012+loop.uv.x*.476,v+.012+loop.uv.y*.476)
    if bevel:
        b=o.modifiers.new('Manufactured edge bevel','BEVEL');b.width=bevel;b.segments=2
        b.affect='EDGES'
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
        w=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');w.keep_sharp=True
        try:bpy.ops.object.modifier_apply(modifier=w.name)
        except RuntimeError:o.modifiers.remove(w)
    ASSETS[CURRENT]['objects'].append(o)
    return o

def box(name,p,s,mat='petrol',bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=s
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish_obj(o,name,mat,min(bevel,min(s)*.2))

def cylinder(name,p,r,depth,mat='petrol',axis='Z',vertices=32,r2=None):
    if r2 is None:bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=p)
    else:bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r2,depth=depth,location=p)
    o=bpy.context.object
    if axis=='X':o.rotation_euler[1]=math.pi/2
    if axis=='Y':o.rotation_euler[0]=math.pi/2
    return finish_obj(o,name,mat,min(.018,r*.08,depth*.15))

def rod(name,a,b,r,mat='hardware',vertices=12):
    d=Vector(b)-Vector(a);o=cylinder(name,(Vector(a)+Vector(b))/2,r,d.length,mat,vertices=vertices)
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o

def tube(name,points,r,mat='petrol',sides=12):
    # Parallel-transport-ish frame is stable for the planar elbows and cables used here.
    verts=[];faces=[]
    for i,p in enumerate(points):
        t=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        t.normalize();ref=Vector((0,1,0)) if abs(t.y)<.9 else Vector((1,0,0))
        u=t.cross(ref).normalized();v=t.cross(u).normalized()
        for j in range(sides):verts.append(Vector(p)+r*(math.cos(j*2*math.pi/sides)*u+math.sin(j*2*math.pi/sides)*v))
    for i in range(len(points)-1):
        for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces += [tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
    return finish_obj(o,name,mat)

def label(text,p,size=.15,mat='ivory',rotation=(math.pi/2,0,0)):
    bpy.ops.object.text_add(location=p,rotation=rotation);o=bpy.context.object;o.data.body=text;o.data.size=size;o.data.extrude=.0005;o.data.align_x='CENTER';o.data.space_character=1.12
    bpy.ops.object.convert(target='MESH');return finish_obj(bpy.context.object,'Marking '+text,mat)

def flange(x,r,z=1.35):
    cylinder('Cast flange',(x,0,z),r,.14,'steel','X')
    cylinder('Painted flange rim',(x+.08,0,z),r*.98,.045,'petrol','X')
    for j in range(12):
        a=j*math.tau/12;cylinder('Hex flange bolt',(x+.113,math.cos(a)*r*.85,z+math.sin(a)*r*.85),.043,.047,'hardware','X',6)

def gauge(x,y,z,r=.19):
    cylinder('Gauge rim',(x,y,z),r,.08,'hardware','Y')
    cylinder('Ivory dial',(x,y-.048,z),r*.83,.016,'gauge-face','Y')
    for j in range(11):
        a=math.radians(35+j*29);a1=(x+math.cos(a)*r*.62,y-.061,z+math.sin(a)*r*.62);a2=(x+math.cos(a)*r*.74,y-.061,z+math.sin(a)*r*.74)
        rod('Gauge tick',a1,a2,.007,'rubber',6)
    rod('Gauge needle',(x,y-.068,z),(x+r*.5,y-.068,z+r*.25),.012,'rubber',6)
    cylinder('Needle hub',(x,y-.073,z),.025,.012,'hardware','Y',12)

def make_console(origin=(0,0,0)):
    ox,oy,oz=origin
    box('Console body',(ox,oy,oz+.83),(1.02,.48,1.66),'ivory',.06)
    box('Recessed face',(ox,oy-.25,oz+.9),(.86,.055,1.32),'steel')
    box('Instrument upper panel',(ox,oy-.284,oz+1.27),(.78,.018,.45),'ivory',.01)
    for x in [-.22,.22]:gauge(ox+x,oy-.32,oz+1.3,.165)
    box('Breaker recess',(ox-.19,oy-.31,oz+.69),(.27,.028,.35),'rubber')
    for z in [.59,.70,.81]:box('Breaker switch',(ox-.19,oy-.35,oz+z),(.15,.06,.037),'ivory',.008)
    for x in [.07,.25]:
        for z in [.64,.83]:cylinder('Control button',(ox+x,oy-.32,oz+z),.045,.065,'signal-amber' if z==.83 else 'rubber','Y',12)
    box('Maintenance handle',(ox+.34,oy-.34,oz+.37),(.04,.08,.17),'hardware')
    label('PRESSURE',(ox,oy-.331,oz+1.55),.07,'ivory')
    for x in [-.43,.43]:
        for z in [.18,1.51]:cylinder('Panel screw',(ox+x,oy-.31,oz+z),.02,.02,'hardware','Y',6)
    box('Console base',(ox,oy,oz+.06),(1.16,.63,.12),'steel')

start('turbine-generator','Hero horizontal generator with service console, removable end flanges and pipe connections.')
box('Cast foundation',(0,0,.12),(4.8,2.25,.24),'steel',.05)
for x in [-1.15,1.1]:
    box('Machine saddle',(x,0,.42),(.52,1.58,.56),'petrol',.06)
    for y in [-.88,.88]:
        box('Mounting foot',(x,y,.27),(.76,.29,.2),'hardware')
        for dx in [-.21,.21]:cylinder('Anchor bolt',(x+dx,y,.4),.054,.07,'hardware','Z',6)
cylinder('Generator stator',(-.35,0,1.45),1.0,2.75,'petrol','X',48)
cylinder('Rear taper',(-1.85,0,1.45),.73,.4,'petrol','X',48,r2=1.)
cylinder('Front taper',(1.22,0,1.45),1.0,.46,'petrol','X',48,r2=.71)
cylinder('Drive end',(1.67,0,1.45),.70,.46,'petrol','X',40)
for x,r in [(-1.65,1.04),(-.75,1.045),(.55,1.045),(1.45,.77),(1.91,.73)]:flange(x,r,1.45)
cylinder('End shadow recess',(1.96,0,1.45),.56,.045,'rubber','X',40)
cylinder('End cover',(1.994,0,1.45),.41,.04,'petrol','X',32)
cylinder('Drive shaft',(2.12,0,1.45),.16,.25,'hardware','X',24)
for j in range(9):
    a=math.radians(15+j*18);y=math.cos(a)*1.008;z=1.45+math.sin(a)*1.008
    o=box('Stator reinforcing rib',(-.32,y,z),(1.8,.085,.10),'steel',.012);o.rotation_euler[0]=a-math.pi/2
box('Terminal housing',(-.45,0,2.5),(.85,.72,.22),'petrol')
for x in [-.72,-.15]:cylinder('Cable gland',(x,-.38,2.5),.07,.12,'hardware','Y')
tube('Electrical conduit',[(-.72,-.44,2.5),(-.8,-.57,2.47),(-1.,-.75,2.1),(-1.25,-.88,.72),(-1.45,-.84,.45)],.042,'rubber')
label('G-02',(-.15,-1.016,1.52),.30,'ivory')
label('KEEP RUNNING',(-.15,-1.015,1.2),.075,'ivory')
make_console((-.5,-1.38,0))

start('control-console','Analogue twin-gauge repair station; amber controls use a separate emissive material.')
make_console()

start('locker-bank','Three full-height enamel lockers with louvers, hinges, number plates and recessed handles.')
for i,x in enumerate([-.77,0,.77]):
    box('Locker shell',(x,0,1.12),(.745,.62,2.24),'petrol',.035)
    box('Door dark reveal',(x,-.325,1.13),(.67,.032,2.12),'rubber',.006)
    box('Door',(x,-.35,1.13),(.64,.035,2.07),'petrol',.014)
    for z in [.26,.35,.44,1.69,1.78,1.87]:
        box('Louver recess',(x,-.375,z),(.45,.015,.04),'rubber',.005)
        o=box('Louver blade',(x,-.395,z+.025),(.47,.055,.015),'petrol',.004);o.rotation_euler[0]=-.25
    box('Handle recess',(x+.2,-.375,1.1),(.1,.02,.27),'steel',.01)
    rod('Handle',(x+.2,-.415,1.02),(x+.2,-.415,1.19),.017,'hardware')
    box('Number plate',(x,-.38,1.48),(.2,.025,.13),'ivory',.01)
    label(f'{i+1:02}',(x,-.399,1.435),.08,'steel')
    for z in [.55,1.48]:box('Hinge',(x-.32,-.38,z),(.06,.07,.17),'hardware',.01)
box('Continuous toe kick',(0,0,.06),(2.35,.72,.12),'steel')

start('supply-crate','Portable enamel supply case with reinforced corners, latches, handle and amber identification stripe.')
box('Case',(0,0,.43),(1.18,.8,.8),'petrol',.065)
box('Lid seam',(0,0,.72),(1.20,.82,.025),'rubber',.005)
box('Lid',(0,0,.82),(1.22,.84,.17),'petrol',.04)
for x in [-.48,.48]:
    for y in [-.33,.33]:box('Corner rail',(x,y,.46),(.105,.115,.83),'steel',.02)
    box('Latch',(x,-.425,.67),(.12,.045,.2),'hardware',.018)
box('Amber band',(0,-.405,.4),(.82,.018,.075),'amber',.008)
rod('Carry handle',(-.2,0,.99),(.2,0,.99),.033,'rubber')
for x in [-.2,.2]:rod('Handle standoff',(x,0,.91),(x,0,.99),.026,'hardware')
label('SUPPLY 07',(0,-.421,.49),.095,'ivory')

start('pipe-elbow','Quarter-circle cast pipe, radius 0.28 m, flange connections and visible six-sided fasteners.')
pts=[(math.cos(a)*.65,0,.35+math.sin(a)*.65) for a in [i*math.pi/2/16 for i in range(17)]]
tube('Cast elbow',pts,.28,'petrol',24)
for z in [.23,.35]:
    cylinder('Vertical flange',(.65,0,z),.37,.08,'steel','Z')
    if z==.35:
        for j in range(8):
            a=j*math.tau/8;cylinder('Bolt',(.65+.31*math.cos(a),.31*math.sin(a),z+.06),.034,.05,'hardware','Z',6)
cylinder('Horizontal flange',(0,0,1),.37,.1,'steel','X')
for j in range(8):
    a=j*math.tau/8;cylinder('Bolt',(-.075,.31*math.cos(a),1+.31*math.sin(a)),.034,.05,'hardware','X',6)

start('pipe-straight','Two-metre pipe module with flanges. Repeat along local X.')
cylinder('Pipe',(0,0,.42),.28,2,'petrol','X',32)
for x in [-.94,.94]:flange(x,.37,.42)
for x in [-.55,.55]:box('Pipe saddle',(x,0,.12),(.15,.68,.24),'steel')

start('bulkhead-wall','Four-metre ivory wall with blue skirting, separate conduit and painted signage.')
box('Wall',(0,0,1.5),(4,.32,3),'ivory',.03)
box('Skirting',(0,-.18,.28),(4,.075,.55),'petrol')
box('Top cap',(0,0,3),(4.08,.42,.09),'ivory')
for x in [-1.94,1.94]:box('Steel jamb',(x,0,1.52),(.16,.49,3.04),'steel')
for z in [2.44,2.65]:rod('Conduit',(-1.83,-.27,z),(1.83,-.27,z),.039,'steel')
for x in [-1.5,-.5,.5,1.5]:box('Conduit strap',(x,-.32,2.55),(.045,.06,.38),'hardware',.006)
label('TURBINE',(0,-.177,1.63),.3,'steel');label('HALL A',(0,-.177,1.24),.3,'steel')

start('sliding-bulkhead','Door frame with independently named sliding panel. Panel motion local +X; clear width 2.6 m.')
for x in [-1.52,1.52]:
    box('Frame upright',(x,0,1.5),(.3,.5,3),'steel',.025)
    box('Hydraulic rail',(x,-.31,1.55),(.11,.11,2.5),'hardware',.01)
box('Header',(0,0,3.03),(3.35,.56,.27),'petrol')
box('Floor track',(0,0,.035),(3.4,.65,.07),'steel',.01)
PART='panel'
box('Sliding leaf',(0,0,1.49),(2.66,.22,2.87),'petrol',.04)
for x in [-1.13,1.13]:box('Leaf edge',(x,-.15,1.49),(.12,.11,2.84),'steel')
for z in [.25,2.73]:box('Amber warning stripe',(0,-.122,z),(2.3,.02,.085),'amber',.008)
label('B-1',(0,-.125,1.5),.36,'ivory')
label('KEEP CLEAR',(0,-.125,1.25),.08,'ivory')
PART='static'
box('Interlock housing',(1.8,-.1,1.33),(.25,.3,.58),'ivory')
cylinder('Status lamp',(1.8,-.27,1.47),.065,.025,'signal-amber','Y',16)

start('wall-lamp','Industrial task light with enamel shade, protective cage and separate luminous bulb.')
box('Mount',(0,.05,.55),(.18,.07,.35),'steel')
rod('Gooseneck',(0,0,.65),(0,-.35,.73),.035,'steel')
cylinder('Shade',(0,-.4,.56),.28,.18,'petrol','Z',24,r2=.1)
cylinder('Warm bulb',(0,-.4,.43),.09,.2,'signal-amber','Z',16)
for j in range(6):
    a=j*math.tau/6;rod('Cage',(math.cos(a)*.13,-.4+math.sin(a)*.13,.34),(math.cos(a)*.13,-.4+math.sin(a)*.13,.52),.009,'hardware',6)
cylinder('Cage foot',(0,-.4,.33),.145,.023,'steel','Z',16)

start('walkway-floor','Four-by-four modular service floor with bevelled tiles and amber route edges.')
box('Concrete slab',(0,0,-.17),(4,4,.34),'steel',.025)
for x in range(8):
    for y in range(8):
        m='ivory' if (x*7+y*3)%5 else 'steel'
        box('Floor tile',(-1.75+x*.5,-1.75+y*.5,.008),(.489,.489,.045),m,.012)
for x in [-1.8,1.8]:box('Walkway stripe',(x,0,.04),(.09,3.9,.012),'amber',.002)

start('guardrail','Four-metre guardrail with midrail and bolted feet.')
for x in [-1.9,-.63,.63,1.9]:
    box('Post',(x,0,.55),(.055,.055,1.1),'steel',.008)
    box('Foot',(x,0,.035),(.19,.17,.07),'hardware',.008)
for z in [.54,1.08]:rod('Horizontal rail',(-1.98,0,z),(1.98,0,z),.027,'steel',8)

# Save editable source before merging export meshes.
for i,(name,a) in enumerate(ASSETS.items()):a['root'].location=((i%4)*6,(i//4)*5,0)
world=bpy.data.worlds.new('Petrol studio');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.082,.092,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.55
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/shutdown-v4-environment.blend'))

# Export: merge by mechanical part and material, retaining UVs. A sliding panel stays independently movable.
manifest={'version':1,'status':'first-article-environment-assets','authoring':'Blender '+bpy.app.version_string,'coordinates':'glTF Y up; metres; ground-level origin','texture':'textures/painted-enamel-atlas.png','assets':[]}
for name,a in ASSETS.items():
    a['root'].location=(0,0,0)
    groups={}
    for o in a['objects']:groups.setdefault((o.get('part','static'),o.data.materials[0].name),[]).append(o)
    export_objs=[]
    for (part,mat),items in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in items:o.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        bpy.ops.object.join();o=bpy.context.object;o.name=f'{name}__{part}__{mat}';export_objs.append(o)
    a['objects']=export_objs
    bpy.ops.object.select_all(action='DESELECT');a['root'].select_set(True)
    for o in export_objs:o.select_set(True)
    path=ROOT/'models'/f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_apply=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_animations=False)
    tri=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in export_objs)
    manifest['assets'].append({'id':name,'file':f'models/{name}.glb','description':a['description'],'triangles':tri,'mesh_primitives':len(export_objs),'bytes':path.stat().st_size,'parts':sorted(set(o.get('part','static') for o in export_objs))})
    a['root'].location=((list(ASSETS).index(name)%4)*6,(list(ASSETS).index(name)//4)*5,0)
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

# Render a hero assembly; remaining assets are hidden without removing source geometry.
for a in ASSETS.values():
    for o in a['objects']:o.hide_render=True
for name in ['turbine-generator','wall-lamp']:
    a=ASSETS[name];a['root'].location=(0,0,0)
    for o in a['objects']:o.hide_render=False
ASSETS['wall-lamp']['root'].location=(-1.4,1.28,2.75)
a=ASSETS['bulkhead-wall'];a['root'].location=(0,1.4,0)
for o in a['objects']:o.hide_render=False
# Staging floor is not an exported asset.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.035));ground=bpy.context.object;ground.name='Studio backdrop';ground.data.materials.append(MATS['steel'])
# A neutral studio floor avoids repeating the atlas outside its UV quadrant.
ground.data.materials.clear();floor=bpy.data.materials.new('Studio floor');floor.diffuse_color=(.025,.046,.05,1);ground.data.materials.append(floor)
def area(name,p,color,power,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=p;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm key',(-3,-4,7),(1,.76,.44),1100,4)
area('Cool fill',(4,1,6),(.45,.68,.78),700,5)
area('Rim',(-4,3,4),(1,.6,.28),900,3)
d=bpy.data.lights.new('Wall practical','POINT');d.energy=45;d.color=(1,.48,.13);d.shadow_soft_size=.25
o=bpy.data.objects.new('Wall practical',d);scene.collection.objects.link(o);o.location=(-1.4,.9,3.05)
d=bpy.data.cameras.new('Asset review camera');camera=bpy.data.objects.new('Asset review camera',d);scene.collection.objects.link(camera)
camera.location=(7,-10,7);target=Vector((0,-.1,1.35));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=7.8;scene.camera=camera
scene.render.filepath=str(ROOT/'renders/turbine-generator-blender.png');bpy.ops.render.render(write_still=True)
# A full kit review, in the same lighting.
for i,(name,a) in enumerate(ASSETS.items()):
    a['root'].location=((i%4)*6,(i//4)*5,0)
    for o in a['objects']:o.hide_render=False
camera.location=(29,-30,30);target=Vector((8.5,5,1));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();d.ortho_scale=30
scene.render.resolution_x=1800;scene.render.resolution_y=1300
scene.render.filepath=str(ROOT/'renders/environment-kit-blender.png');bpy.ops.render.render(write_still=True)
print('DONE',json.dumps(manifest))
