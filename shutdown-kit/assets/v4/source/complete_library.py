"""Build the complete V4 visual library. Blender 5 / bpy 5, metres, Z up.
Existing environment authoring is reused; every source object remains editable.
Run:  blender -b --python source/complete_library.py -- [--only id,id] [--group category]
      (or: python -c "import bpy" env)  python source/complete_library.py -- --only warden
All geometry is always rebuilt (fast); only the selected assets are exported and merged into
manifest.json. A full build (no filter) also saves the .blend files and v4-shared-library.glb.
GLBs are exported WITHOUT images: every painted material samples textures/v4-atlas.png at
runtime by material name (see manifest.json "materials" and textures/atlas-layout.json).
"""
from pathlib import Path
import os, sys, math, json, random
import bpy
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parents[1]
# Reuse the authored environment geometry, before its export/render stage.
exec(compile((ROOT/'source/build_assets.py').read_text().split('# Save editable source')[0],str(ROOT/'source/build_assets.py'),'exec'))
scene.render.fps=24
ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
def _arg(flag):
    return set(ARGS[ARGS.index(flag)+1].split(',')) if flag in ARGS else None
ONLY,GROUP=_arg('--only'),_arg('--group')
FULL=ONLY is None and GROUP is None
BUDGET={'character':6000,'machinery':4000,'core':4000,'environment':2000,'equipment':1500,'effect':1500}
def concept_for(name,category):
    table={'operator-amber':'04-loadout','crew-teal':'07-crew','crew-ivory':'07-crew','warden':'06-locker','weaver':'10-paywall',
      'containment-capsule':'07-crew','locker-interior-frame':'06-locker','wall-microphone':'02-mic','rotary-control':'02-mic',
      'operator-plinth':'04-loadout','overseer-housing':'01-title','chimney':'03-sectors','coolant-tank':'09-results',
      'refrigeration-unit':'09-results','cold-storage-door':'09-results','water-tile':'01-title','waterfall':'01-title'}
    if name in table:return table[name]
    if category=='core' or name.startswith('core-'):return '08-core'
    if name.startswith(('foundry-','overhead-gantry','casting-','molten-')):return '10-paywall'
    if category=='equipment':return '09-results'
    return '05-shift'
for a in ASSETS.values():a.update(category='environment',clips=[])
# Workwear cloth cells live in the shared atlas (row 1); materials were created in build_assets.py.
material('visor',(.004,.014,.02),.3,.18)
material('frost',(.57,.72,.72),0,.9)
material('molten',(1,.19,.008),0,.5,3)
material('water',(.018,.08,.1),.2,.27)
material('foam',(.46,.64,.62),0,.95)
material('glass',(.12,.3,.31),0,.15)
MATS['glass'].node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.22
MATS['glass'].surface_render_method='DITHERED'
MATS['glass'].diffuse_color=(.12,.3,.31,.22)
# Isolate UV editing from any preceding selected objects.
_original_finish=finish_obj
def finish_obj(o,name,mat='petrol',bevel=0,segments=2):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    return _original_finish(o,name,mat,bevel,segments)
def begin(name,description,category):
    root=start(name,description);ASSETS[name].update(category=category,clips=[]);return root

def ellipsoid(name,p,s,mat='petrol',segments=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=12,radius=1,location=p);o=bpy.context.object;o.scale=s
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish_obj(o,name,mat)

def ring(name,p,r,minor,mat='hardware',axis='Z'):
    bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,location=p,major_radius=r,minor_radius=minor)
    o=bpy.context.object
    if axis=='Y':o.rotation_euler[0]=math.pi/2
    if axis=='X':o.rotation_euler[1]=math.pi/2
    return finish_obj(o,name,mat)

def cloth_segment(name,a,b,rx,ry,mat):
    # Tailored sleeve/trouser mesh: angular fold ridges, tapered cuffs, asymmetric drape.
    a,b=Vector(a),Vector(b);d=(b-a).normalized();u=Vector((1,0,0));v=d.cross(u).normalized()
    verts=[];faces=[];n=12;levels=9
    for k in range(levels):
        t=k/(levels-1);bulge=[.72,.92,1,1.04,.92,1.05,.87,.96,.65][k]
        for j in range(n):
            ang=j*math.tau/n;fold=1+.065*math.sin(j*2.2+k*2.4)
            verts.append(a+(b-a)*t+u*(math.cos(ang)*rx*bulge*fold)+v*(math.sin(ang)*ry*bulge*fold))
    for k in range(levels-1):
        for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
    faces.extend([tuple(reversed(range(n))),tuple((levels-1)*n+j for j in range(n))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    return finish_obj(o,name,mat)

BONE='hips';SPECS={}
def tag_since(idx,bone):
    for o in ASSETS[CURRENT]['objects'][idx:]:o['bone']=bone

def section(bone,fn):
    idx=len(ASSETS[CURRENT]['objects']);fn();tag_since(idx,bone)

def hand(p,robot=False):
    x,y,z=p;mat='hardware' if robot else 'cloth-black'
    box('Palm',(x,y,z),(.12,.07,.16),mat,.025)
    for j in range(4):
        xx=x-.046+j*.031
        rod('Finger proximal',(xx,y,z-.055),(xx,y-.014,z-.12),.012,mat,8)
        rod('Finger tip',(xx,y-.014,z-.12),(xx,y-.038,z-.155),.01,mat,8)
    rod('Thumb',(x-.065,y,z),(x-.1,y-.035,z-.06),.02,mat,8)

def make_rig(specs,kind):
    a=ASSETS[CURRENT];root=a['root'];bpy.ops.object.select_all(action='DESELECT')
    data=bpy.data.armatures.new(CURRENT+' skeleton');rig=bpy.data.objects.new(CURRENT+'-rig',data);scene.collection.objects.link(rig);rig.parent=root
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for name,head,tail,parent in specs:
        bone=data.edit_bones.new(name);bone.head=head;bone.tail=tail
        if parent:bone.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in a['objects']:
        bone=o.get('bone','hips');vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
        mod=o.modifiers.new('Deform rig','ARMATURE');mod.object=rig
    a['rig']=rig;a['kind']=kind
    return rig

def animate_character(rig,kind):
    a=ASSETS[CURRENT]
    clips=['idle','walk','run','crouch','repair','hide','hold-breath','rescue','caught','sit-exhausted'] if kind=='operator' else (['idle','patrol','chase','search','capture','stunned'] if kind=='warden' else ['idle','scuttle','chase','scan','strike','stunned'])
    for clip in clips:
        action=bpy.data.actions.new(CURRENT+'_'+clip);rig.animation_data_create();rig.animation_data.action=action
        for frame in range(1,50,3):
            t=(frame-1)/48;phase=t*math.tau;s=math.sin(phase);c=math.cos(phase)
            for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
            def rot(n,x=0,y=0,z=0):
                if n in rig.pose.bones:rig.pose.bones[n].rotation_euler=(x,y,z)
            hips=rig.pose.bones['hips']
            if kind=='weaver':
                moving=clip in ['scuttle','chase'];amp=.35 if clip=='scuttle' else .6
                for side in ['L','R']:
                    for j in range(3):
                        q=math.sin(phase+(j%2)*math.pi+(0 if side=='L' else math.pi))
                        rot(f'leg{j}.{side}',0,0,amp*q if moving else .025*s)
                        rot(f'shin{j}.{side}',.18*max(q,0) if moving else 0)
                rot('head',0,0,.35*s if clip=='scan' else .04*s)
                if clip=='strike':rot('hips',-.18*max(s,0));rot('head',-.2*max(s,0))
                if clip=='stunned':rot('hips',.2,0,.12*s)
            else:
                moving=clip in ['walk','run','patrol','chase'];fast=clip in ['run','chase'];amp=.7 if fast else .32
                for side,sign in [('L',1),('R',-1)]:
                    q=s*sign
                    rot('thigh.'+side,amp*q if moving else .015*s)
                    rot('shin.'+side,max(-q,0)*amp*.8 if moving else .03)
                    rot('upper_arm.'+side,-amp*q*.75 if moving else -.08,0,.05*sign)
                    rot('forearm.'+side,-.65 if fast else -.12)
                hips.location.z=.035*abs(s) if moving else .007*s
                rot('spine',-.14 if fast else .025*s)
                if clip in ['crouch','hide','hold-breath','caught','sit-exhausted']:
                    hips.location.z=-.43 if clip!='sit-exhausted' else -.55
                    for side in ['L','R']:rot('thigh.'+side,-1.1);rot('shin.'+side,1.5);rot('upper_arm.'+side,-.35);rot('forearm.'+side,-.85)
                    rot('spine',.28 if clip=='sit-exhausted' else .2);rot('head',.22)
                if clip in ['repair','rescue','capture']:
                    for side,sign in [('L',1),('R',-1)]:rot('upper_arm.'+side,-1.15+.08*s*sign);rot('forearm.'+side,-.5+.14*s)
                    rot('head',.17);rot('spine',.08)
                if clip in ['search','idle']:rot('head',0,0,.25*s if clip=='search' else .035*s)
                if clip=='stunned':rot('spine',.35,0,.1*s);rot('head',.2)
            for b in rig.pose.bones:
                b.keyframe_insert('rotation_euler',frame=frame);b.keyframe_insert('location',frame=frame)
        track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);track.mute=True
        a['clips'].append(clip)
    rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks:track.mute=False
    for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)

def operator(name,suit):
    begin(name,'Protective operator with sculpted workwear folds, opaque visor, harness, fingers and battery backpack. Skinned rig and ten movement/action clips.','character')
    section('hips',lambda: (ellipsoid('Trouser seat',(0,0,.91),(.22,.145,.19),suit),box('Webbing belt',(0,-.005,1.025),(.43,.30,.058),'cloth-black',.022),box('Buckle',(0,-.167,1.025),(.075,.025,.057),'hardware',.006)))
    def torso():
        cloth_segment('Work jacket',(0,0,1.02),(0,.01,1.48),.25,.15,suit)
        for side in [-1,1]:
            rod('Harness',(side*.16,-.153,1.1),(side*.2,-.12,1.46),.024,'cloth-black')
            box('Chest pocket',(side*.11,-.162,1.28),(.12,.027,.135),suit,.014)
            box('Harness buckle',(side*.175,-.177,1.31),(.052,.032,.066),'hardware',.008)
        rod('Jacket zip',(0,-.164,1.06),(0,-.162,1.43),.007,'hardware',6)
        box('Battery pack',(0,.205,1.26),(.37,.19,.48),'petrol',.038)
        box('Pack inset',(0,.308,1.26),(.29,.025,.32),'steel')
        for x in [-.145,.145]:box('Pack rail',(x,.33,1.25),(.033,.04,.43),'hardware',.008)
        tube('Breathing hose',[(.12,.32,1.43),(.23,.28,1.53),(.23,.1,1.56)],.023,'rubber')
    section('spine',torso)
    def helmet():
        cylinder('Neck seal',(0,0,1.49),.11,.12,'cloth-black')
        ellipsoid('Cream helmet',(0,-.005,1.68),(.205,.207,.235),'ivory',32)
        ellipsoid('Visor gasket',(0,-.162,1.675),(.161,.098,.184),'rubber',28)
        ellipsoid('Opaque visor',(0,-.191,1.68),(.139,.073,.16),'visor',32)
        for x in [-.191,.191]:cylinder('Helmet hinge',(x,-.018,1.68),.054,.024,'hardware','X',16)
        tube('Helmet rim',[(-.155,-.156,1.8),(-.1,-.19,1.872),(0,-.2,1.897),(.1,-.19,1.872),(.155,-.156,1.8)],.013,'ivory')
    section('head',helmet)
    specs=[('hips',(0,0,.91),(0,0,1.04),None),('spine',(0,0,1.04),(0,0,1.47),'hips'),('head',(0,0,1.47),(0,0,1.88),'spine')]
    for side,sign in [('L',1),('R',-1)]:
        hip=(sign*.13,0,.9);knee=(sign*.155,-.025,.53);ankle=(sign*.155,0,.16)
        sh=(sign*.245,0,1.43);el=(sign*.33,-.015,1.12);wr=(sign*.37,-.045,.87)
        section('thigh.'+side,lambda:cloth_segment('Trouser thigh',hip,knee,.132,.14,suit))
        section('shin.'+side,lambda:(cloth_segment('Trouser calf',knee,ankle,.1,.11,suit),box('Knee patch',(sign*.155,-.122,.52),(.13,.035,.14),'cloth-black',.025)))
        section('foot.'+side,lambda:(box('Boot',(sign*.155,-.075,.115),(.18,.35,.20),'cloth-black',.035),box('Boot sole',(sign*.155,-.09,.032),(.19,.36,.047),'rubber',.015),*[rod('Boot lace',(sign*.155-.055,-.1,.213+k*.016),(sign*.155+.055,-.13,.213+k*.016),.006,'hardware',6) for k in range(3)]))
        section('upper_arm.'+side,lambda:cloth_segment('Jacket sleeve',sh,el,.1,.1,suit))
        section('forearm.'+side,lambda:(cloth_segment('Forearm sleeve',el,wr,.086,.085,suit),ellipsoid('Cuff',wr,(.077,.075,.049),'cloth-black')))
        section('hand.'+side,lambda:hand((wr[0],wr[1],wr[2]-.08)))
        specs += [('thigh.'+side,hip,knee,'hips'),('shin.'+side,knee,ankle,'thigh.'+side),('foot.'+side,ankle,(sign*.155,-.24,.08),'shin.'+side),('upper_arm.'+side,sh,el,'spine'),('forearm.'+side,el,wr,'upper_arm.'+side),('hand.'+side,wr,(wr[0],wr[1],wr[2]-.18),'forearm.'+side)]
    animate_character(make_rig(specs,'operator'),'operator')

for name,suit in [('operator-amber','cloth-amber'),('crew-teal','cloth-teal'),('crew-ivory','cloth-ivory')]:operator(name,suit)

def robot_head(p):
    x,y,z=p
    box('Instrument head',p,(.58,.34,.27),'ivory',.045)
    box('Sensor recess',(x,y-.179,z),(.45,.022,.13),'rubber',.018)
    box('Red sensor',(x,y-.194,z),(.38,.013,.035),'danger-red',.006)
    for xx in [-.235,.235]:cylinder('Head screw',(x+xx,y-.18,z+.08),.014,.015,'hardware','Y',6)
    for xx in [-.31,.31]:box('Head side port',(x+xx,y,z),(.035,.15,.07),'steel',.008)

def machine_limb(a,b,r=.043):
    rod('Load rod',a,b,r,'hardware');aa,bb=Vector(a),Vector(b)
    offset=Vector((.043,.025,0));rod('Hydraulic ram',aa+offset,aa.lerp(bb,.67)+offset,r*.55,'steel');rod('Piston',aa.lerp(bb,.67)+offset,bb+offset,r*.33,'hardware')
    ellipsoid('Ball joint',a,(r*1.65,)*3,'hardware',16)

begin('warden','Tall asymmetric surveillance hunter with instrument head, red slit, articulated hands and six skeletal clips.','character')
section('hips',lambda:(box('Pelvis',(0,0,1.15),(.32,.21,.18),'steel'),ellipsoid('Hip joint',(0,0,1.25),(.14,.12,.17),'hardware')))
section('spine',lambda:(box('Petrol torso',(0,0,1.62),(.48,.27,.48),'petrol',.06),box('Chest plate',(0,-.15,1.60),(.27,.025,.3),'ivory'),cylinder('Left shoulder',(.3,0,1.79),.16,.15,'petrol','X'),cylinder('Right shoulder',(-.29,0,1.74),.13,.14,'steel','X'),rod('Neck',(0,0,1.85),(0,0,2.05),.065,'hardware')))
section('head',lambda:robot_head((0,-.015,2.13)))
specs=[('hips',(0,0,1.15),(0,0,1.3),None),('spine',(0,0,1.3),(0,0,1.92),'hips'),('head',(0,0,1.92),(0,0,2.3),'spine')]
for side,sgn in [('L',1),('R',-1)]:
    hip=(sgn*.15,0,1.15);knee=(sgn*.21,.08,.64);ankle=(sgn*.2,-.01,.15);sh=(sgn*.34,0,1.76);el=(sgn*.44,-.015,1.31);wr=(sgn*.48,-.05,.9)
    section('thigh.'+side,lambda:(machine_limb(hip,knee,.055),box('Thigh armour',(sgn*.19,-.055,.93),(.115,.11,.29),'petrol')))
    section('shin.'+side,lambda:(machine_limb(knee,ankle),box('Shin shell',(sgn*.2,-.06,.4),(.105,.1,.3),'steel')))
    section('foot.'+side,lambda:box('Stability foot',(sgn*.2,-.1,.068),(.15,.34,.11),'hardware'))
    section('upper_arm.'+side,lambda:machine_limb(sh,el,.044))
    section('forearm.'+side,lambda:(machine_limb(el,wr,.035),box('Forearm guard',(sgn*.465,-.075,1.1),(.08,.08,.24),'petrol')))
    section('hand.'+side,lambda:hand((wr[0],wr[1],wr[2]-.08),True))
    specs += [('thigh.'+side,hip,knee,'hips'),('shin.'+side,knee,ankle,'thigh.'+side),('foot.'+side,ankle,(sgn*.2,-.24,.07),'shin.'+side),('upper_arm.'+side,sh,el,'spine'),('forearm.'+side,el,wr,'upper_arm.'+side),('hand.'+side,wr,(wr[0],wr[1],wr[2]-.2),'forearm.'+side)]
animate_character(make_rig(specs,'warden'),'warden')

begin('weaver','Six-legged foundry maintenance hunter; independent three-joint legs, sensor head and six skeletal clips.','character')
section('hips',lambda:(box('Asymmetric carapace',(0,0,1.04),(.85,1.18,.37),'petrol',.07),box('Amber service stripe',(.13,0,1.238),(.17,1,.022),'amber'),box('Dorsal module',(-.27,.26,1.27),(.28,.4,.16),'steel'),*[cylinder('Spine fastener',(x,y,1.25),.03,.025,'hardware','Z',6) for x in [-.34,.34] for y in [-.45,.45]]))
section('head',lambda:robot_head((0,-.72,1.06)))
specs=[('hips',(0,0,1),(0,0,1.3),None),('head',(0,-.45,1.05),(0,-.85,1.05),'hips')]
for side,sgn in [('L',1),('R',-1)]:
    for j,y in enumerate([-.43,0,.43]):
        hip=(sgn*.41,y,1.04);knee=(sgn*.86,y*1.5,.86);ankle=(sgn*1.13,y*1.8,.12)
        section(f'leg{j}.{side}',lambda:(machine_limb(hip,knee,.07),ellipsoid('Hip motor',hip,(.12,.12,.12),'hardware')))
        section(f'shin{j}.{side}',lambda:(machine_limb(knee,ankle,.047),rod('Leg armour',Vector(knee).lerp(Vector(ankle),.2),Vector(knee).lerp(Vector(ankle),.6),.07,'petrol')))
        section(f'foot{j}.{side}',lambda:box('Foot pad',(ankle[0],ankle[1],.06),(.2,.25,.09),'steel'))
        specs += [(f'leg{j}.{side}',hip,knee,'hips'),(f'shin{j}.{side}',knee,ankle,f'leg{j}.{side}'),(f'foot{j}.{side}',ankle,(ankle[0],ankle[1]-.15,.06),f'shin{j}.{side}')]
animate_character(make_rig(specs,'weaver'),'weaver')

# Props and equipment ----------------------------------------------------------
def pivot_part(name,p,objects,clip,axis='Z',amount=1.4,translation=False):
    a=ASSETS[CURRENT];node=bpy.data.objects.new(name,None);scene.collection.objects.link(node);node.parent=a['root'];node.location=p
    for o in objects:
        world=o.matrix_world.copy();o.parent=node;o.matrix_world=world
    node.animation_data_create();act=bpy.data.actions.new(CURRENT+'_'+clip);node.animation_data.action=act
    prop='location' if translation else 'rotation_euler';idx='XYZ'.index(axis);base=node.location[idx] if translation else 0
    for f,value in [(1,base),(24,base+amount)]:getattr(node,prop)[idx]=value;node.keyframe_insert(prop,frame=f)
    track=node.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,act);node.animation_data.action=None
    getattr(node,prop)[idx]=base;a.setdefault('nodes',[]).append(node);a['clips'].append(clip)
    return node

def lamp_beacon(p):
    x,y,z=p;cylinder('Beacon foot',(x,y,z),.13,.07,'steel');cylinder('Red beacon',(x,y,z+.13),.095,.22,'danger-red');ring('Beacon guard',(x,y,z+.22),.11,.012,'hardware')

begin('containment-capsule','Crew rescue capsule with transparent window, animated lifting door, red beacon and release lever.','machinery')
box('Capsule body',(0,.18,1.37),(1.22,.75,2.74),'petrol',.12)
box('Recess',(0,-.225,1.43),(.94,.1,2.25),'rubber',.07)
box('Interior back',(0,-.12,1.43),(.85,.04,2.17),'steel')
for x in [-.52,.52]:box('Ivory frame',(x,-.35,1.38),(.18,.22,2.63),'ivory',.035)
for z in [.17,2.6]:box('Ivory lintel',(0,-.35,z),(1.18,.22,.28),'ivory',.04)
idx=len(ASSETS[CURRENT]['objects']);box('Capsule glazing',(0,-.40,1.39),(.84,.025,2.05),'glass',.018)
for x in [-.435,.435]:box('Door rail',(x,-.42,1.39),(.035,.055,2.14),'hardware',.008)
pivot_part('capsule-door',(0,0,0),ASSETS[CURRENT]['objects'][idx:],'open','Z',2.16,True)
lamp_beacon((0,.04,2.8));box('Release box',(-.83,-.2,.94),(.3,.34,.68),'petrol')
idx=len(ASSETS[CURRENT]['objects']);rod('Release lever',(-.83,-.4,1),(-.83,-.52,1.3),.028,'hardware');rod('Red grip',(-.94,-.52,1.3),(-.72,-.52,1.3),.046,'danger-red')
pivot_part('release-lever',(-.83,-.4,1),ASSETS[CURRENT]['objects'][idx:],'release','X',-.9)
label('C-1',(0,-.477,.12),.14,'steel')

begin('locker-single','Functional hiding locker with hollow interior, front vent openings and a hinged door clip.','environment')
for x in [-.39,.39]:box('Side',(x,0,1.1),(.045,.7,2.2),'petrol')
box('Back',(0,.34,1.1),(.8,.035,2.2),'petrol')
for z in [.025,2.19]:box('Cap',(0,0,z),(.8,.7,.05),'steel')
idx=len(ASSETS[CURRENT]['objects'])
for z,h in [(.45,.85),(1.25,.6),(1.99,.36)]:box('Door section',(0,-.37,z),(.73,.045,h),'petrol')
for x in [-.35,.35]:box('Vent edge',(x,-.37,1.1),(.04,.045,2.12),'petrol')
rod('Handle',(.25,-.43,.96),(.25,-.43,1.15),.018,'hardware')
pivot_part('locker-door',(-.37,-.37,0),ASSETS[CURRENT]['objects'][idx:],'open','Z',-1.65)

begin('locker-interior-frame','First-person locker front with two genuinely open sight slits; renders the scene outside through the geometry.','environment')
for z,h in [(.43,.86),(1.2,.18),(1.91,.78)]:box('Interior panel',(0,0,z),(1.6,.055,h),'petrol')
for x in [-.79,.79]:box('Frame side',(x,0,1.1),(.065,.09,2.2),'steel')
for x in [-.65,.65]:
    for z in [.25,1.02,1.4,2.1]:cylinder('Rivet',(x,-.055,z),.018,.023,'hardware','Y',8)

begin('wall-microphone','Ivory wall microphone, slotted grille, conduit connection and red detection lamp.','equipment')
box('Microphone enclosure',(0,0,.47),(.62,.22,.94),'ivory',.06)
cylinder('Grille backing',(0,-.13,.56),.245,.035,'rubber','Y')
ring('Grille rim',(0,-.16,.56),.24,.021,'hardware','Y')
for i in range(-5,6):
    x=i*.038;h=2*math.sqrt(max(.215**2-x*x,0));box('Grille bar',(x,-.17,.56),(.013,.02,h),'ivory',.005)
cylinder('Detection lamp',(.19,-.14,.14),.05,.04,'danger-red','Y')
for x in [-.255,.255]:
    for z in [.065,.87]:cylinder('Panel bolt',(x,-.13,z),.025,.02,'hardware','Y',6)

begin('rotary-control','Calibrated industrial rotary input with animated knob and ivory tick marks.','equipment')
box('Rotary housing',(0,0,.4),(.66,.22,.8),'petrol',.055)
gauge(0,-.16,.43,.25)
idx=len(ASSETS[CURRENT]['objects']);cylinder('Dial knob',(0,-.25,.43),.15,.14,'amber','Y');box('Dial grip',(0,-.34,.43),(.055,.045,.25),'steel')
pivot_part('rotary-knob',(0,-.25,.43),ASSETS[CURRENT]['objects'][idx:],'turn','Y',math.pi*1.4)

for name in ['battery-pack','hand-radio','repair-tool','scrap-bundle','breathing-canister']:
    begin(name,'Portable operator equipment with physically modeled fittings.','equipment')
    if name=='battery-pack':
        box('Battery',(0,0,.3),(.38,.2,.6),'petrol',.035)
        for x in [-.14,.14]:box('Pack rail',(x,-.12,.3),(.045,.05,.53),'steel')
        cylinder('Socket',(.08,0,.64),.045,.07,'hardware');label('07',(0,-.113,.31),.09,'ivory')
    elif name=='hand-radio':
        box('Radio',(0,0,.16),(.15,.065,.28),'petrol');rod('Antenna',(.04,0,.3),(.04,0,.55),.009,'rubber')
        box('Display',(0,-.037,.215),(.11,.01,.065),'gauge-face',.006)
        for z in [.075,.10,.125]:box('Speaker slot',(0,-.04,z),(.10,.01,.01),'rubber',.002)
    elif name=='repair-tool':
        rod('Wrench shank',(0,0,.04),(0,0,.32),.027,'hardware');ring('Wrench socket',(0,0,.38),.062,.023,'hardware','Y');box('Grip',(0,0,.11),(.08,.055,.17),'cloth-black')
    elif name=='scrap-bundle':
        for x in [-.14,0,.14]:cylinder('Salvage cell',(x,0,.15),.05,.3,'hardware')
        box('Binding',(0,0,.16),(.42,.13,.04),'amber');ring('Salvage washer',(.13,-.13,.035),.095,.021,'hardware')
    else:
        cylinder('Canister',(0,0,.28),.10,.5,'ivory');cylinder('Cap',(0,0,.55),.08,.065,'steel');tube('Air hose',[(0,0,.58),(.12,0,.64),(.2,0,.5),(.2,0,.12)],.012,'rubber')

begin('operator-plinth','Worn concrete loadout display pedestal with operator identification.','environment')
cylinder('Plinth',(0,0,.15),.86,.3,'ivory','Z',48);label('OPERATOR 07',(0,-.842,.09),.1,'steel')

# Architecture ----------------------------------------------------------------
# Thick grid walls (wall-post/end/straight/corner/t/cross) are authored in build_assets.py.
begin('foundation-pier','Dark concrete base block under a 2x2-cell floor module. Top at z=0 (under the floor slab), foot at -3.6; sits in water with a waterline stain at z=-1.','environment')
box('Pier block',(0,0,-1.8),(4,4,3.6),'concrete-dark',.06,1)
box('Top coping',(0,0,-.09),(4.12,4.12,.18),'concrete',.03,1)
box('Waterline stain',(0,0,-1.05),(4.012,4.012,.4),'soot',0)
for z in [-.7,-1.8,-2.8]:box('Pour seam',(0,0,z),(4.008,4.008,.03),'soot',0)
for k in range(4):
    for u in [-1.3,0,1.3]:
        x,y=[(u,-2.08),(2.08,u),(u,2.08),(-2.08,u)][k]
        box('Pilaster',(x,y,-1.9),(.32,.16,3.4) if k%2==0 else (.16,.32,3.4),'concrete-dark',.03,1)

begin('service-door','Inset ivory service door with round latch and open animation.','environment')
for x in [-.65,.65]:box('Jamb',(x,0,1.15),(.14,.35,2.3),'steel')
box('Lintel',(0,0,2.28),(1.45,.35,.16),'steel')
idx=len(ASSETS[CURRENT]['objects']);box('Door leaf',(0,-.05,1.13),(1.15,.12,2.18),'petrol',.045);label('A1',(0,-.119,1.39),.25,'ivory');ring('Handwheel',(.35,-.19,.98),.115,.018,'hardware','Y')
pivot_part('service-door-hinge',(-.6,0,0),ASSETS[CURRENT]['objects'][idx:],'open','Z',-1.6)

begin('ladder','Three-metre maintenance ladder with wall standoffs.','environment')
for x in [-.32,.32]:rod('Side rail',(x,0,0),(x,0,3),.035,'amber')
for k in range(11):rod('Rung',(-.32,-.015,.15+k*.265),(.32,-.015,.15+k*.265),.025,'hardware')
for x in [-.32,.32]:
    for z in [.3,2.7]:rod('Standoff',(x,0,z),(x,.25,z),.025,'steel')

begin('stairs','Two-metre rise service stair with continuous rails and open tread profiles.','environment')
for k in range(10):box('Stair tread',(0,k*.28,.1+k*.2),(1.5,.3,.09),'steel');box('Tread edge',(0,k*.28-.135,.15+k*.2),(1.45,.025,.017),'amber',.005)
for x in [-.72,.72]:
    rod('Stair stringer',(x,-.12,0),(x,2.67,1.9),.055,'hardware');rod('Handrail',(x,-.12,1),(x,2.67,2.9),.029,'steel')
    for k in [0,3,6,9]:rod('Rail post',(x,k*.28,.2*k),(x,k*.28,1+.2*k),.025,'steel')

begin('grated-bridge','Four-metre service bridge with open metal grating and twin guardrails.','environment')
for x in [-.7,.7]:box('Bridge girder',(x,0,-.12),(.13,4,.24),'petrol');box('Edge stripe',(x,0,.025),(.07,4,.025),'amber')
for k in range(41):box('Grate bar',(0,-2+k*.1,0),(1.32,.025,.055),'hardware',.004)
for x in [-.5,0,.5]:box('Grate support',(x,0,-.02),(.025,4,.04),'hardware',.004)
for x in [-.72,.72]:
    for y in [-1.95,0,1.95]:rod('Post',(x,y,0),(x,y,1),.027,'steel')
    for z in [.5,1]:rod('Bridge rail',(x,-2,z),(x,2,z),.026,'steel')

begin('overhead-duct','Industrial rectangular duct with flange bands and corner fasteners.','environment')
box('Duct',(0,0,.6),(3,1,1.2),'petrol',.08)
for x in [-1.45,0,1.45]:
    for z in [.035,1.165]:box('Duct flange',(x,0,z),(.08,1.1,.08),'hardware')
    for y in [-.535,.535]:box('Duct flange',(x,y,.6),(.08,.08,1.2),'hardware')

begin('pipe-valve','Flanged shutoff valve with rotating red handwheel.','machinery')
cylinder('Valve body',(0,0,.55),.33,1.2,'petrol','X')
for x in [-.57,.57]:flange(x,.41,.55)
cylinder('Valve stem',(0,0,.99),.08,.5,'hardware')
idx=len(ASSETS[CURRENT]['objects']);ring('Wheel',(0,0,1.29),.32,.035,'amber')
for j in range(4):a=j*math.pi/2;rod('Spoke',(0,0,1.29),(.30*math.cos(a),.30*math.sin(a),1.29),.023,'steel')
pivot_part('valve-wheel',(0,0,1.29),ASSETS[CURRENT]['objects'][idx:],'turn','Z',math.tau)

begin('electrical-cabinet','Service cabinet with breaker rows, vents, handle and hazard stripe.','machinery')
box('Cabinet',(0,0,1),(1,.55,2),'petrol',.035);box('Door reveal',(0,-.29,1),(.9,.03,1.87),'steel')
for x in [-.22,.22]:
    for z in [1.25,1.48]:box('Breaker face',(x,-.325,z),(.3,.05,.15),'ivory');box('Switch',(x,-.36,z),(.055,.035,.1),'rubber')
for z in [.3,.38,.46]:box('Vent',(0,-.32,z),(.62,.028,.032),'rubber')
label('POWER',(0,-.327,1.77),.12,'ivory');box('Warning band',(0,-.324,.85),(.78,.025,.07),'amber')

begin('warning-beacon','Red rotating alarm beacon with mounting base.','equipment');lamp_beacon((0,0,.08))

# Cold storage and foundry ------------------------------------------------------
begin('coolant-tank','Tall refrigeration tank with insulation seams, gauge, frost cap and service valves.','machinery')
cylinder('Tank',(0,0,1.4),.65,2.6,'petrol','Z',40)
ellipsoid('Tank cap',(0,0,2.7),(.65,.65,.26),'ivory',32)
for z in [.2,1.4,2.58]:ring('Tank seam',(0,0,z),.65,.037,'hardware')
for x in [-.4,.4]:box('Tank foot',(x,0,.12),(.15,.9,.24),'steel')
gauge(0,-.67,1.7,.14);rod('Service pipe',(.55,-.4,.2),(.55,-.4,2.65),.046,'hardware')
cylinder('Top connection',(0,0,3),.12,.32,'steel');label('COOLANT',(0,-.66,1.15),.13,'ivory')

begin('refrigeration-unit','Twin-fan chiller with cream insulated casing and coolant connections.','machinery')
box('Chiller',(0,0,.85),(2.4,.9,1.7),'ivory',.06)
for x in [-.61,.61]:
    cylinder('Fan recess',(x,-.47,.94),.43,.06,'rubber','Y');ring('Fan rim',(x,-.53,.94),.42,.035,'petrol','Y')
    for j in range(5):
        a=j*math.tau/5;rod('Fan blade',(x,-.55,.94),(x+.34*math.cos(a),-.55,.94+.34*math.sin(a)),.049,'hardware')
    for dx in [-.27,-.14,0,.14,.27]:rod('Fan guard',(x+dx,-.61,.65),(x+dx,-.61,1.23),.009,'steel',6)
label('COLD STORAGE',(0,-.48,.24),.16,'steel')

begin('cold-storage-door','Heavy insulated sliding door with latch, gasket and open clip.','environment')
for x in [-.92,.92]:box('Insulated frame',(x,0,1.3),(.18,.45,2.6),'ivory')
box('Top rail',(0,0,2.63),(2.2,.5,.15),'steel')
idx=len(ASSETS[CURRENT]['objects']);box('Insulated door',(0,0,1.27),(1.7,.23,2.45),'ivory',.06);box('Door kickplate',(0,-.13,.32),(1.6,.025,.48),'petrol');rod('Latch',(.59,-.22,.9),(.59,-.22,1.45),.035,'hardware');label('02',(0,-.135,1.65),.38,'petrol')
pivot_part('cold-door',(0,0,0),ASSETS[CURRENT]['objects'][idx:],'open','X',1.8,True)

begin('chimney','Plant exhaust stack with ivory/red bands, rim and service collar.','machinery')
for k in range(8):cylinder('Stack section',(0,0,.25+k*.5),.28,.5,'ivory' if k%2==0 else 'petrol')
ring('Rim',(0,0,4.02),.31,.045,'hardware');cylinder('Dark opening',(0,0,4.02),.24,.008,'rubber')
for z in [.4,1.9,3.4]:ring('Collar',(0,0,z),.30,.035,'hardware')

begin('foundry-furnace','Refractory furnace with glowing mouth, heavy shutters and exhaust collar.','machinery')
box('Furnace',(0,0,1.55),(2.3,1.8,3.1),'steel',.1)
for x in [-1.02,1.02]:box('Furnace rib',(x,-.98,1.55),(.16,.2,3.1),'petrol')
box('Firebox surround',(0,-.96,1.36),(1.6,.18,1.5),'hardware',.05);box('Firebox',(0,-1.06,1.36),(1.32,.045,1.18),'rubber')
box('Molten interior',(0,-1.09,1.2),(1.12,.024,.68),'molten')
for x in [-.43,-.14,.14,.43]:box('Grate bar',(x,-1.13,1.35),(.04,.035,1.15),'hardware')
cylinder('Exhaust',(0,0,3.55),.46,1,'petrol');label('F-03',(0,-.925,2.67),.24,'ivory')

begin('foundry-crucible','Open refractory crucible with molten surface, trunnions and pouring clip.','machinery')
idx=len(ASSETS[CURRENT]['objects']);cylinder('Crucible body',(0,0,.8),.58,1.22,'steel',r2=.78);ring('Lip',(0,0,1.42),.78,.07,'hardware');cylinder('Molten metal',(0,0,1.38),.69,.025,'molten')
for j in range(10):a=j*math.tau/10;rod('Reinforcing rib',(.52*math.cos(a),.52*math.sin(a),.22),(.74*math.cos(a),.74*math.sin(a),1.36),.039,'hardware')
for x in [-.87,.87]:cylinder('Trunnion',(x,0,.91),.12,.3,'hardware','X')
pivot_part('crucible-tilt',(0,0,.91),ASSETS[CURRENT]['objects'][idx:],'pour','X',1.05)

begin('overhead-gantry','Foundry overhead crane with crossbeam, trolley, hoist drum and hook.','machinery')
for x in [-2.3,2.3]:
    box('Column',(x,0,2.5),(.38,.48,5),'petrol');box('Foot',(x,0,.12),(.8,.9,.24),'steel')
    for z in [.5,1.5,2.5,3.5,4.5]:box('Warning stripe',(x,-.249,z),(.36,.02,.13),'amber')
box('Crossbeam',(0,0,4.95),(5.2,.66,.48),'petrol')
box('Trolley',(0,0,4.56),(.85,.8,.3),'steel');cylinder('Hoist drum',(0,0,4.25),.23,.64,'hardware','X')
for x in [-.16,.16]:rod('Hoist cable',(x,0,4.25),(x,0,2.4),.015,'steel')
ring('Hook',(0,0,2.29),.15,.045,'hardware','Y');label('F-03',(0,-.339,4.81),.21,'ivory')

begin('casting-trough','Molten-metal casting channel with refractory walls and end stops.','machinery')
box('Bed',(0,0,.14),(1.6,2.8,.28),'steel')
box('Liquid surface',(0,0,.32),(1.14,2.39,.025),'molten')
for x in [-.7,.7]:box('Side',(x,0,.32),(.18,2.8,.4),'hardware')
for y in [-1.31,1.31]:box('End',(0,y,.32),(1.6,.18,.4),'hardware')

# Core ------------------------------------------------------------------------
begin('overseer-housing','Title-screen monumental overseer housing with recessed red observation slit.','machinery')
box('Monolith',(0,0,3.2),(3.6,1.8,6.4),'petrol',.09)
for x in [-1.67,1.67]:box('Edge buttress',(x,-.94,3.15),(.21,.26,6.3),'steel')
box('Eye recess',(0,-.94,4.6),(2.65,.14,.4),'rubber');box('Observation slit',(0,-1.023,4.6),(2.4,.025,.08),'danger-red');label('OVERSEER',(0,-.929,4.0),.23,'ivory')

begin('core-spindle','Central calculating spindle with sensor band, ivory casing, toothed base and external service pipes.','machinery')
cylinder('Base',(0,0,.3),1.08,.6,'steel','Z',48)
for j in range(32):a=j*math.tau/32;o=box('Base tooth',(math.cos(a)*1.08,math.sin(a)*1.08,.38),(.15,.15,.23),'hardware');o.rotation_euler.z=a
cylinder('Core column',(0,0,3),.67,5.4,'petrol','Z',48)
for z in [.85,2.3,3.5,4.8,5.58]:ring('Collar',(0,0,z),.69,.065,'hardware')
cylinder('Ivory sleeve',(0,0,2.2),.685,2.4,'ivory','Z',48);label('CORE',(0,-.695,2.1),.32,'petrol')
cylinder('Sensor recess',(0,0,3.61),.71,.23,'rubber');cylinder('Sensor band',(0,0,3.61),.723,.075,'danger-red')
for j in range(4):a=j*math.pi/2+.7;rod('External conduit',(.85*math.cos(a),.85*math.sin(a),.6),(.85*math.cos(a),.85*math.sin(a),5.55),.065,'steel')

def arc_mesh(name,r0,r1,a0,a1,z,depth,mat):
    n=max(3,round((a1-a0)*24));verts=[];faces=[]
    for zz in [z-depth,z]:
        for rr in [r0,r1]:
            for k in range(n+1):a=a0+(a1-a0)*k/n;verts.append((rr*math.cos(a),rr*math.sin(a),zz))
    l=n+1
    for k in range(n):
        faces.extend([(2*l+k,3*l+k,3*l+k+1,2*l+k+1),(k,k+1,l+k+1,l+k),(k,2*l+k,2*l+k+1,k+1),(l+k,l+k+1,3*l+k+1,3*l+k)])
    faces.extend([(0,l,3*l,2*l),(n,2*l+n,3*l+n,l+n)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);return finish_obj(o,name,mat)
for name,r in [('core-ring-inner',2.2),('core-ring-middle',4.4),('core-ring-outer',6.6)]:
    begin(name,'Quarter-ring walkway module with tiled deck, amber safety strips and toothed supporting rail. Four instances form a complete ring.','core')
    arc_mesh('Ring girder',r,r+1.25,0,math.pi/2,0,.3,'petrol')
    for k in range(12):arc_mesh('Deck tile',r+.09,r+1.16,k*math.pi/24+.004,(k+1)*math.pi/24-.004,.04,.055,'ivory')
    for rr in [r+.04,r+1.21]:arc_mesh('Safety edge',rr,rr+.035,0,math.pi/2,.056,.014,'amber')
    for k in range(9):
        a=k*math.pi/16
        for rr in [r,r+1.25]:rod('Rail post',(rr*math.cos(a),rr*math.sin(a),0),(rr*math.cos(a),rr*math.sin(a),.78),.021,'steel')
    for rr in [r,r+1.25]:
        for z in [.4,.79]:tube('Curved rail',[(rr*math.cos(k*math.pi/48),rr*math.sin(k*math.pi/48),z) for k in range(25)],.024,'steel',8)
    for k in range(16):a=(k+.5)*math.pi/32;o=box('Rail tooth',((r+.6)*math.cos(a),(r+.6)*math.sin(a),-.32),(.12,.16,.15),'hardware');o.rotation_euler.z=a

begin('core-retracting-segment','Movable 30-degree outer ring deck segment with retract clip and red edge lamps.','core')
idx=len(ASSETS[CURRENT]['objects']);arc_mesh('Sliding deck',6.6,7.85,0,math.pi/6,0,.3,'petrol');arc_mesh('Ivory walking surface',6.68,7.77,.01,math.pi/6-.01,.03,.03,'ivory')
for a in [0,math.pi/6]:
    for rr in [6.7,7.7]:cylinder('Gap lamp',(rr*math.cos(a),rr*math.sin(a),.14),.055,.17,'danger-red')
pivot_part('retracting-deck',(0,0,0),ASSETS[CURRENT]['objects'][idx:],'retract','Z',-1.8,True)

begin('core-kill-switch','Finale kill-switch station with red/amber status lenses and animated activation lever.','core')
box('Switch plinth',(0,0,.08),(.75,.65,.16),'steel');box('Switch body',(0,0,.82),(.52,.4,1.5),'petrol');box('Face',(0,-.22,.95),(.43,.055,1.0),'ivory')
cylinder('Status rim',(0,-.275,1.18),.15,.06,'hardware','Y');cylinder('Red status',(0,-.316,1.18),.115,.025,'danger-red','Y');label('KILL',(0,-.256,.78),.1,'steel')
idx=len(ASSETS[CURRENT]['objects']);rod('Switch lever',(0,-.31,.52),(0,-.51,.74),.025,'hardware');rod('Switch grip',(-.12,-.51,.74),(.12,-.51,.74),.04,'amber')
pivot_part('activation-lever',(0,-.31,.52),ASSETS[CURRENT]['objects'][idx:],'activate','X',1.1)

# Effects meshes; time-dependent rendering is supplied separately in effects/v4-effects.js.
begin('water-tile','Eight-metre water surface. Runtime water material supplies animated ripples.','effect')
box('Water surface',(0,0,-.06),(8,8,.08),'water',0)
begin('waterfall','Two-metre falling water ribbon with layered foam ribbons. Runtime scroll/pulse material supported.','effect')
for j in range(8):
    x=(j-3.5)*.065;tube('Falling ribbon',[(x,0,2),(x,-.07,1.6),(x*1.1,-.13,.9),(x*1.25,-.16,0)],.035 if j%3 else .019,'water' if j%3 else 'foam',6)
for j in range(5):ring('Splash ring',(0,-.15,.02+j*.002),.12+j*.1,.009,'foam')
begin('vision-cone','Flat triangular enemy vision field with alpha material; visibility and occlusion are controlled by gameplay.','effect')
material('vision-red',(.75,.035,.012),0,1,.3);MATS['vision-red'].node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.16
mesh=bpy.data.meshes.new('Vision field');mesh.from_pydata([(0,0,.025),(-1.5,-4,.025),(1.5,-4,.025)],[],[(0,1,2)]);mesh.update();o=bpy.data.objects.new('Vision field',mesh);scene.collection.objects.link(o);finish_obj(o,'Vision field','vision-red')
begin('molten-stream','Pouring molten-metal stream with separately modeled hot droplets.','effect')
tube('Stream',[(0,0,2),(0,-.06,1.6),(.06,-.1,.8),(.12,-.15,0)],.055,'molten',10)
for j in range(9):ellipsoid('Droplet',(.1+random.uniform(-.25,.25),-.15+random.uniform(-.2,.2),random.uniform(.08,.5)),(.018,.018,.045),'molten',8)

# Add a single transform parent to the original sliding door, retaining its parts.
CURRENT='sliding-bulkhead';ASSETS[CURRENT]['clips']=[]
pivot_part('bulkhead-leaf',(0,0,0),[o for o in ASSETS[CURRENT]['objects'] if o.get('part')=='panel'],'open','X',2.7,True)
# Source library is stored with every root at the origin; collections separate assets.
for name,a in ASSETS.items():
    collection=bpy.data.collections.new(name);scene.collection.children.link(collection)
    for o in [a['root'],*a['objects'],*a.get('nodes',[]),*([a['rig']] if 'rig' in a else [])]:
        for old in list(o.users_collection):old.objects.unlink(o)
        collection.objects.link(o)
    a['root']['asset_version']='v4-library';a['root']['category']=a['category']
scene.world=bpy.data.worlds.new('V4 world');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.028,.046,.054,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.resolution_percentage=100
scene.frame_set(1)
# Mute all animation while authoring/reviewing rest pose; exporter reads all tracks.
for a in ASSETS.values():
    for obj in [a.get('rig'),*a.get('nodes',[])]:
        if obj and obj.animation_data:
            for t in obj.animation_data.nla_tracks:t.mute=True
if FULL:bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/shutdown-v4-complete.blend'))
GLTF=dict(export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_image_format='NONE')
selected=[n for n,a in ASSETS.items() if FULL or (ONLY and n in ONLY) or (GROUP and a['category'] in GROUP)]
unknown=(ONLY or set())-set(ASSETS)
if unknown:raise SystemExit(f'Unknown asset ids: {sorted(unknown)}')
old_manifest=json.loads((ROOT/'manifest.json').read_text()) if (ROOT/'manifest.json').exists() else {'assets':[]}
entries={e['id']:e for e in old_manifest.get('assets',[]) if e['id'] in ASSETS}
for name,a in ASSETS.items():
    groups={}
    for o in a['objects']:groups.setdefault((o.parent.name,o.data.materials[0].name),[]).append(o)
    result=[]
    for (parent,mat),items in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in items:o.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        o=bpy.context.object;o.name=name+'__'+parent+'__'+mat;result.append(o)
    a['objects']=result
    if name not in selected:continue
    bpy.ops.object.select_all(action='DESELECT')
    selection=[a['root'],*result,*a.get('nodes',[]),*([a['rig']] if 'rig' in a else [])]
    for o in selection:o.select_set(True)
    path=ROOT/'models'/f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_apply=False,export_animations=bool(a['clips']),export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_force_sampling=True,export_frame_range=False,export_anim_slide_to_zero=True,**GLTF)
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in result)
    bounds=[o.matrix_world@Vector(v) for o in result for v in o.bound_box]
    mins=[min(v[i] for v in bounds) for i in range(3)];maxs=[max(v[i] for v in bounds) for i in range(3)]
    budget=BUDGET.get(a['category'],1500)
    entries[name]={'id':name,'file':f'models/{name}.glb','category':a['category'],'description':a['description'],'concept':f"concepts/v4/{concept_for(name,a['category'])}.png",'triangles':triangles,'budget':budget,'over_budget':triangles>budget,'mesh_primitives':len(result),'materials':sorted({o.data.materials[0].name for o in result}),'bytes':path.stat().st_size,'clips':a['clips'],'rigged':'rig' in a,'bounds_blender':{'min':mins,'max':maxs}}
    if a['root'].get('decal_item'):entries[name]['decal_item']=a['root']['decal_item']
    print('EXPORTED',name,triangles,'tris',('OVER BUDGET '+str(budget)) if triangles>budget else 'ok',flush=True)
materials={}
for n,m in MATS.items():
    materials[n]={'atlas_cell':n if n in QUADS else None,'fallback_color':[round(c,4) for c in m.get('fallback_color',m.diffuse_color[:3])],'emission':m.get('emission',0),'roughness':.9 if n in QUADS else round(m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value,3)}
    if m.get('decal_atlas'):materials[n].update(atlas='decals',decal_kind=m['decal_kind'])
manifest={'version':3,'status':'v4-library','visual_match':'Requires scene-level comparison; no pixel-identical claim.','authoring':'Blender '+bpy.app.version_string,
 'coordinates':'GLB Y up; metres; character front +Z after Blender -Y conversion',
 'textures':{'atlas':'textures/v4-atlas.png','atlas_layout':'textures/atlas-layout.json','decals':'textures/decals-atlas.png','decals_layout':'textures/decals-layout.json'},
 'runtime':'GLBs contain no images. Build one MeshStandardMaterial per material name: atlas_cell != null -> map = v4-atlas (flipY=false, sRGB), roughness .9, metalness 0; else flat fallback_color (+emissive when emission > 0). atlas == "decals": map = decals-atlas, transparent, depthWrite false, polygonOffset; decal_kind "mask" -> color = fallback_color with the atlas as alpha, "color" -> atlas color as is. Decal assets carry decal_item; UV rects come from decals-layout.json.',
 'budgets':BUDGET,'materials':materials,'assets':[entries[n] for n in ASSETS if n in entries]}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if FULL:
    for i,a in enumerate(ASSETS.values()):a['root'].location=((i%8)*12,(i//8)*12,0)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'models/v4-shared-library.glb'),export_animations=False,**GLTF)
    for a in ASSETS.values():a['root'].location=(0,0,0)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/shutdown-v4-export-library.blend'))
over=[e['id'] for e in manifest['assets'] if e.get('over_budget')]
print('LIBRARY', 'FULL' if FULL else 'PARTIAL', len(selected),'exported /',len(ASSETS),'assets | over budget:',len(over),over,flush=True)
