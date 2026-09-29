"""SHUTDOWN v4 environment assets. Run with Blender's Python or the bpy wheel.
Geometry is authored in metres, Z up, front toward -Y. GLB export converts to Y up.
All paint comes from ONE shared atlas (textures/v4-atlas.png); no Blender-only material nodes are required.
This file only defines helpers + the first environment assets; build with source/complete_library.py.
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
# ONE shared atlas for every painted material (built by source/make_textures.py).
# Not packed: GLBs are exported without images and the runtime applies the atlas by material name.
LAYOUT=json.loads((ROOT/'textures/atlas-layout.json').read_text())
img=bpy.data.images.load(str(ROOT/'textures/v4-atlas.png'));img.filepath_raw='//../textures/v4-atlas.png'
CELL_UV=1/LAYOUT['grid'];PAD=LAYOUT['pad_uv']
# Blender UV origin is bottom-left; the layout rows count from the top.
QUADS={n:(c['col']*CELL_UV,1-(c['row']+1)*CELL_UV) for n,c in LAYOUT['cells'].items()}
MATS={}
def material(name,color,metallic=0,roughness=.8,emission=0):
    if name in MATS:return MATS[name]
    m=bpy.data.materials.new(name);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metallic;bs.inputs['Roughness'].default_value=roughness
    if name in QUADS:
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img
        m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    if emission:
        bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
    m['emission']=emission;m['fallback_color']=list(color)
    MATS[name]=m
    return m
# Painted atlas materials: matte, metalness 0 (V4 rule). Colors are only the untextured fallback.
ATLAS_FALLBACK={'petrol':(.08,.23,.24),'ivory':(.71,.69,.59),'amber':(.72,.36,.05),'steel':(.03,.06,.07),
 'cloth-amber':(.72,.36,.05),'cloth-teal':(.05,.18,.2),'cloth-ivory':(.71,.69,.59),'cloth-black':(.02,.02,.02),
 'concrete':(.26,.26,.23),'teal':(.08,.2,.19),'indigo':(.007,.016,.02),'danger':(.69,.06,.02),
 'frost':(.4,.54,.53),'rust':(.16,.04,.016),'soot':(.024,.022,.02),'concrete-dark':(.07,.078,.074)}
for n in LAYOUT['cells']:material(n,ATLAS_FALLBACK.get(n,(.5,.5,.5)),0,.9)
# Flat (untextured) materials: small hardware, rubber, dials and the only emissives.
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

def finish_obj(o,name,mat='petrol',bevel=0,segments=2):
    o.name=name;o.data.materials.clear();o.data.materials.append(MATS[mat]);o.parent=ASSETS[CURRENT]['root'];o['part']=PART
    if o.type=='MESH' and mat in QUADS:
        if not o.data.uv_layers:
            bpy.context.view_layer.objects.active=o
            bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.03);bpy.ops.object.mode_set(mode='OBJECT')
        u,v=QUADS[mat];span=CELL_UV-2*PAD
        for loop in o.data.uv_layers.active.data:
            loop.uv=(u+PAD+loop.uv.x*span,v+PAD+loop.uv.y*span)
    if bevel:
        b=o.modifiers.new('Manufactured edge bevel','BEVEL');b.width=bevel;b.segments=segments
        b.affect='EDGES'
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
        w=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');w.keep_sharp=True
        try:bpy.ops.object.modifier_apply(modifier=w.name)
        except RuntimeError:o.modifiers.remove(w)
    ASSETS[CURRENT]['objects'].append(o)
    return o

def box(name,p,s,mat='petrol',bevel=.025,seg=2):
    # seg=1 gives a single chamfer (cheap); used on repeated tiles/blocks to stay inside tri budgets.
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.dimensions=s
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish_obj(o,name,mat,min(bevel,min(s)*.2),seg)

# Decals ----------------------------------------------------------------------
# Quads that sample textures/decals-atlas.png (not the paint atlas). Mask items are white alpha
# stencils tinted by the material color; 'color' items (hazard stripes) are used as is.
DECALS=json.loads((ROOT/'textures/decals-layout.json').read_text())['items']
decal_img=bpy.data.images.load(str(ROOT/'textures/decals-atlas.png'));decal_img.filepath_raw='//../textures/decals-atlas.png'
def decal_material(name,color,kind):
    m=material(name,color,0,.9);nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
    tex=nt.nodes.new('ShaderNodeTexImage');tex.image=decal_img
    if kind=='color':nt.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    nt.links.new(tex.outputs['Alpha'],bs.inputs['Alpha'])
    m.surface_render_method='BLENDED';m['decal_atlas']='decals';m['decal_kind']=kind
    return m
decal_material('decal-ivory',(.71,.69,.59),'mask')
decal_material('decal-indigo',(.007,.016,.02),'mask')
decal_material('decal-amber',(.72,.36,.05),'mask')
decal_material('decal-hazard',(1,1,1),'color')
# facing -> (right, up) axes of the quad; the quad normal is right x up.
FACING={'-Y':((1,0,0),(0,0,1)),'+Y':((-1,0,0),(0,0,1)),'+X':((0,1,0),(0,0,1)),'-X':((0,-1,0),(0,0,1)),'+Z':((1,0,0),(0,1,0))}
def decal(item,p,w,h=None,mat='decal-ivory',facing='-Y',vertical=False,name=None):
    """Flat decal quad centred at p. vertical=True runs the atlas item along the up axis (vertical stripes)."""
    it=DECALS[item];u0,v0,u1,v1=it['uv']
    if h is None:h=w*it['aspect'] if vertical else w/it['aspect']
    r,up=(Vector(a) for a in FACING[facing]);c=Vector(p)
    corners=[(-1,-1),(1,-1),(1,1),(-1,1)]
    name=name or 'Decal '+item
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([c+r*(sx*w/2)+up*(sy*h/2) for sx,sy in corners],[],[(0,1,2,3)]);mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for i,(sx,sy) in enumerate(corners):
        su,sv=((sy+1)/2,(1-sx)/2) if vertical else ((sx+1)/2,(sy+1)/2)
        # Layout UVs are top-left origin (glTF); Blender v = 1 - v.
        uv.data[i].uv=(u0+(u1-u0)*su,1-(v0+(v1-v0)*(1-sv)))
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);o['decal']=item
    return finish_obj(o,name,mat)

# Thick concrete wall kit -------------------------------------------------------
# Grid pieces fill one 2 m game cell (GRID.cellSize), origin at the cell centre, arms toward +X/-X/+Y/-Y.
# Height matches GRID.wallHeight so colliders from the level grid line up with the mesh.
WALL_H=2.0;WALL_T=.8;CAP_OVER=.04;PLINTH_OVER=.02
def wall_run(axis,a,b,ends=('free','free'),h=WALL_H,t=WALL_T):
    """Block wall from a to b along local axis. ends: 'free' (cap overhangs), 'edge' (flush at a cell
    boundary so neighbours never overlap), 'host' (butts into a perpendicular wall; cap/plinth stop at
    the host's overhang so no coplanar faces z-fight)."""
    def P(u,v,z):return (u,v,z) if axis=='X' else (v,u,z)
    def S(lu,lv,lz):return (lu,lv,lz) if axis=='X' else (lv,lu,lz)
    def span(over):
        lo=a-over if ends[0]=='free' else (a+over if ends[0]=='host' else a)
        hi=b+over if ends[1]=='free' else (b-over if ends[1]=='host' else b)
        return (lo+hi)/2,hi-lo
    box('Concrete block wall',P((a+b)/2,0,h/2),S(b-a,t,h),'concrete',.03)
    m,l=span(CAP_OVER);box('Wall cap',P(m,0,h+.05),S(l,t+2*CAP_OVER,.1),'concrete',.02,1)
    m,l=span(PLINTH_OVER);box('Plinth course',P(m,0,.09),S(l,t+2*PLINTH_OVER,.18),'concrete-dark',.01,1)
    course=(h-.18)/4
    for side in (-1,1):
        v=side*(t/2+.003)
        for k in range(1,4):box('Block seam',P((a+b)/2,v,.18+k*course),S(b-a-.04,.008,.016),'concrete-dark',0)
        for k in range(4):
            u=a+(.5 if k%2 else 1.0)
            while u<b-.1:
                if u-a>.1:box('Block joint',P(u,v,.18+(k+.5)*course),S(.016,.008,course-.02),'concrete-dark',0)
                u+=1.0

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

start('bulkhead-wall','Four-metre (two-cell) thick concrete block wall with cap, block seams, conduit run and TURBINE HALL A stencil decals.')
wall_run('X',-2,2,('edge','edge'))
FACE=-(WALL_T/2+.006)
for z in [1.62,1.8]:rod('Conduit',(-1.9,FACE-.05,z),(1.9,FACE-.05,z),.032,'steel',8)
for x in [-1.5,-.5,.5,1.5]:box('Conduit strap',(x,FACE-.03,1.71),(.045,.05,.3),'hardware',0)
decal('turbine',(-.35,FACE,1.22),1.5,mat='decal-indigo')
decal('hall',(-.35,FACE,.84),1.5,mat='decal-indigo')
decal('code-a',(1.2,FACE,1.03),.72,mat='decal-indigo')

# Grid wall kit: one 2 m cell each. Part B picks the piece from the wall-neighbour mask and rotates it.
start('wall-post','Isolated thick wall cell (no wall neighbours): 0.8 m concrete block column with cap.')
wall_run('X',-WALL_T/2,WALL_T/2)
start('wall-end','Wall end cell: arm toward +X ending in a capped block face at the cell centre.')
wall_run('X',-WALL_T/2,1,('free','edge'))
start('wall-straight','Straight wall cell along X, flush with both cell edges.')
wall_run('X',-1,1,('edge','edge'))
start('wall-corner','L wall cell: arms toward +X and +Y, 0.8 m thick concrete blocks with cap.')
wall_run('X',-WALL_T/2,1,('free','edge'));wall_run('Y',WALL_T/2,1,('host','edge'))
start('wall-t','T wall cell: straight along X plus an arm toward +Y.')
wall_run('X',-1,1,('edge','edge'));wall_run('Y',WALL_T/2,1,('host','edge'))
start('wall-cross','Cross wall cell: straight along X plus arms toward +Y and -Y.')
wall_run('X',-1,1,('edge','edge'));wall_run('Y',WALL_T/2,1,('host','edge'));wall_run('Y',-1,-WALL_T/2,('edge','host'))

# Decal quads. Runtime rewrites the UV rect per placement from textures/decals-layout.json (root extra
# decal_item = default item) and scales the quad to the item aspect.
for name,item,facing,size,mat,desc in [
    ('decal-wall-stencil','code-b-1','-Y',(1,1),'decal-ivory','1 m vertical stencil quad facing -Y (room codes, SECTOR B, slogans).'),
    ('decal-floor-stencil','code-g-02','+Z',(1,1),'decal-amber','1 m floor stencil quad facing up (bay codes G-01..G-08, EXIT).'),
    ('decal-hazard-edge','hazard-strip','+Z',(2,.2),'decal-hazard','2 m amber/black hazard strip for floor edges, lifts and moving parts; lies flat, rotate for walls.')]:
    r=start(name,desc);r['decal_item']=item
    decal(item,(0,0,.5 if facing=='-Y' else .004),size[0],size[1],mat,facing)

start('sliding-bulkhead','Door frame with independently named sliding panel. Panel motion local +X; clear width 2.6 m.')
for x in [-1.52,1.52]:
    box('Frame upright',(x,0,1.5),(.3,.5,3),'steel',.025)
    box('Hydraulic rail',(x+.08*(1 if x>0 else -1),-.30,1.55),(.08,.1,2.5),'hardware',.01)
    decal('hazard-strip',(x-.08*(1 if x>0 else -1),-.254,1.5),.15,2.8,'decal-hazard','-Y',vertical=True,name='Frame hazard stripe')
box('Header',(0,0,3.03),(3.35,.56,.27),'petrol')
decal('hazard-strip',(0,-.284,3.03),3.2,.2,'decal-hazard','-Y',name='Header hazard stripe')
box('Floor track',(0,0,.035),(3.4,.65,.07),'steel',.01)
PART='panel'
box('Sliding leaf',(0,0,1.49),(2.66,.22,2.87),'petrol',.04)
for x in [-1.13,1.13]:box('Leaf edge',(x,-.15,1.49),(.12,.11,2.84),'steel')
for z in [.25,2.73]:decal('hazard-strip',(0,-.114,z),2.08,.14,'decal-hazard','-Y',name='Leaf hazard stripe')
decal('code-b-1',(0,-.114,1.62),.95,mat='decal-ivory')
decal('keep-clear',(0,-.114,1.02),.84,mat='decal-ivory')
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

# Floors: 1 m worn concrete tiles (top at z=.03) on a dark slab. Cell modules are 2 x 2 m (one grid cell).
TILE_TOP=.03
def floor_tiles(n,skip=()):
    half=n/2
    box('Floor slab',(0,0,-.15),(n,n,.3),'concrete-dark',.02,1)
    for i in range(n):
        for j in range(n):
            if (i,j) not in skip:box('Worn concrete tile',(-half+.5+i,-half+.5+j,TILE_TOP/2),(.975,.975,TILE_TOP),'concrete',.01,1)
def drain_grate(x,y):
    box('Drain frame',(x,y,TILE_TOP+.004),(.62,.62,.008),'steel',0)
    box('Drain well',(x,y,TILE_TOP+.009),(.52,.52,.002),'rubber',0)
    for k in range(6):box('Grate bar',(x+(k-2.5)*.085,y,TILE_TOP+.013),(.034,.52,.008),'hardware',0)

start('walkway-floor','Four-by-four (2x2 cells) service floor: worn grey concrete tiles, amber route edge lines, hazard dashes at both ends.')
floor_tiles(4)
for x in [-1.82,1.82]:box('Amber edge line',(x,0,TILE_TOP+.003),(.06,3.96,.006),'amber',0)
for y in [-1.86,1.86]:decal('hazard-strip',(0,y,TILE_TOP+.007),3.4,.18,'decal-hazard','+Z',name='Hazard dashes')

start('floor-cell','One 2 m grid cell of worn concrete tiles.')
floor_tiles(2)
start('floor-cell-edge','Grid cell at a drop or route edge: amber edge line and hazard dashes along -Y. Rotate per edge.')
floor_tiles(2)
box('Amber edge line',(0,-.94,TILE_TOP+.003),(1.98,.05,.006),'amber',0)
decal('hazard-strip',(0,-.79,TILE_TOP+.007),1.96,.16,'decal-hazard','+Z',name='Hazard dashes')
start('floor-cell-drain','Grid cell variant with a slotted floor drain grate in one tile.')
floor_tiles(2);drain_grate(.5,.5)

start('guardrail','Four-metre guardrail with midrail and bolted feet.')
for x in [-1.9,-.63,.63,1.9]:
    box('Post',(x,0,.55),(.055,.055,1.1),'steel',.008)
    box('Foot',(x,0,.035),(.19,.17,.07),'hardware',.008)
for z in [.54,1.08]:rod('Horizontal rail',(-1.98,0,z),(1.98,0,z),.027,'steel',8)

# Save editable source before merging export meshes.
# Everything after this marker was the first-article export/render pass. The library entry point
# is source/complete_library.py, which execs only the part above this marker.
raise SystemExit('Run the library build instead: blender -b --python source/complete_library.py -- [--only id,id] [--group category]')
