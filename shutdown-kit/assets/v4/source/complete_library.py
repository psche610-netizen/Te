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
      'refrigeration-unit':'09-results','cold-storage-door':'09-results','water-tile':'01-title','waterfall':'01-title',
      'outlet-pipe':'01-title','frost-silo':'03-sectors','tall-smokestack':'03-sectors',
      'sea-rock':'03-sectors','cliff-stack':'01-title','facility-tower-block':'01-title','forklift':'11-overseer','pallet':'11-overseer'}
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
material('molten-core',(1,.55,.12),0,.5,5)
material('molten-glow',(1,.3,.03),0,.6,3)
MATS['molten-glow'].node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.5
MATS['molten-glow'].surface_render_method='BLENDED'
# Water family is matte (V4: no reflections, no speculars); motion comes from EFFECTS shader specs.
material('water',(.018,.08,.1),0,.9)
material('fall-water',(.05,.16,.17),0,.9)
material('foam',(.46,.64,.62),0,.95)
material('foam-splash',(.52,.66,.63),0,.95)
material('glass',(.12,.3,.31),0,.15)
material('basalt',(.045,.055,.06),0,.95)
material('wood',(.36,.26,.15),0,.85)
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

def glove(p,sign):
    """Padded dark work glove; thumb on the inner (body) side."""
    x,y,z=p
    box('Glove palm',(x,y,z),(.135,.085,.17),'cloth-black',.03,1)
    box('Knuckle pad',(x,y-.046,z-.03),(.12,.018,.05),'rubber',.008,1)
    for j in range(4):
        xx=x-.05+j*.034
        rod('Glove finger',(xx,y,z-.06),(xx,y-.016,z-.128),.015,'cloth-black',8)
        rod('Glove fingertip',(xx,y-.016,z-.128),(xx,y-.04,z-.165),.013,'cloth-black',8)
    ix=x-sign*.072;rod('Glove thumb',(ix,y-.01,z+.01),(ix-sign*.035,y-.04,z-.06),.022,'cloth-black',8)

def tag_tints(slots):
    """Mark tintable meshes; glTF extras carry tint_slot so the runtime can recolor per instance."""
    a=ASSETS[CURRENT];a['tint_slots']=slots;by_mat={m:s for s,m in slots.items()}
    for o in a['objects']:
        m=o.data.materials[0].name if o.type=='MESH' and o.data.materials else None
        if m in by_mat:o['tint_slot']=by_mat[m]

def make_rig(specs,kind):
    a=ASSETS[CURRENT];root=a['root'];bpy.ops.object.select_all(action='DESELECT')
    data=bpy.data.armatures.new(CURRENT+' skeleton');rig=bpy.data.objects.new(CURRENT+'-rig',data);scene.collection.objects.link(rig);rig.parent=root
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    # Optional 5th spec item: roll vector; the bone's local Z is aligned to it (bend axis for rotation_euler[2]).
    for spec in specs:
        name,head,tail,parent=spec[:4]
        bone=data.edit_bones.new(name);bone.head=head;bone.tail=tail
        if len(spec)>4:bone.align_roll(Vector(spec[4]))
        if parent:bone.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in a['objects']:
        bone=o.get('bone','hips');vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
        mod=o.modifiers.new('Deform rig','ARMATURE');mod.object=rig
    a['rig']=rig;a['kind']=kind
    return rig

# Clip table: (name, loop, drive). Loop clips are one 2 s cycle (48 frames @ 24 fps, last key == first key)
# with phase 0 at t=0, the same convention as sin(walkPhase) in the game: drive 'walkPhase' clips with
#   time = ((walkPhase / 2pi) mod 1) * cycle_seconds
# One-shots ('time') play once over 1 s and hold the last frame.
CYCLE_FRAMES=48;ONESHOT_FRAMES=24
CLIPS={
 'operator':[('idle',True,'time'),('walk',True,'walkPhase'),('run',True,'walkPhase'),('crouch',True,'walkPhase'),('hide-enter',False,'time'),
             ('repair',True,'time'),('hide',True,'time'),('hold-breath',True,'time'),('rescue',True,'time'),('caught',False,'time'),('sit-exhausted',True,'time')],
 'warden':[('idle',True,'time'),('walk',True,'walkPhase'),('scan',True,'time'),('chase',True,'walkPhase'),('grab',False,'time'),('stunned',True,'time')],
 'weaver':[('idle',True,'time'),('scuttle',True,'walkPhase'),('chase',True,'walkPhase'),('scan',True,'time'),('strike',True,'time'),('stunned',True,'time')]}
def smooth(t):t=min(max(t,0),1);return t*t*(3-2*t)
def animate_character(rig,kind):
    a=ASSETS[CURRENT];a['clip_meta']={}
    for clip,loop,drive in CLIPS[kind]:
        action=bpy.data.actions.new(CURRENT+'_'+clip);rig.animation_data_create();rig.animation_data.action=action
        length=CYCLE_FRAMES if loop else ONESHOT_FRAMES
        for frame in range(1,length+2,3):
            t=(frame-1)/length;phase=t*math.tau if loop else 0;s=math.sin(phase);c=math.cos(phase);e=smooth(t)
            for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
            def rot(n,x=0,y=0,z=0):
                if n in rig.pose.bones:rig.pose.bones[n].rotation_euler=(x,y,z)
            hips=rig.pose.bones['hips']
            if kind=='weaver':
                # Mirrors weaver-body.tsx tripod gait. hip{row}.{side} are up-pointing (local Y = world up):
                # yaw = rotation_euler[1] (= three rotation.y), lift = location.y. L = +X = game side +1.
                # leg/shin bones are rolled so local Z is the leg-plane normal: +rotation_euler[2] lifts outward.
                moving=clip in ['scuttle','chase'];chasing=clip=='chase';amp=.45 if chasing else .32
                for side,sd in [('L',1),('R',-1)]:
                    for j in range(3):
                        tp=phase+((j+(1 if sd>0 else 0))%2)*math.pi
                        swing=-math.cos(tp)*amp if moving else 0;lift=max(0,math.sin(tp)) if moving else 0
                        hb=f'hip{j}.{side}';rot(hb,0,-sd*swing,0);rig.pose.bones[hb].location.y=.12*lift
                        rot(f'leg{j}.{side}',0,0,.22*lift);rot(f'shin{j}.{side}',0,0,-.35*lift)
                hips.location.y=((-.08 if chasing else 0)+abs(math.sin(2*phase))*.025) if moving else .008*s
                if chasing:rot('hips',.08)
                rot('head',0,.6*s if clip=='scan' else .04*s,0)
                if clip=='strike':
                    k=max(s,0);rot('hips',.14*k);rot('head',-.12*k)
                    for side in ['L','R']:rot(f'leg0.{side}',0,0,.7*k);rot(f'shin0.{side}',0,0,-.5*k)
                if clip=='stunned':rot('hips',.12,0,.1*s);hips.location.y=-.1
            else:
                # Up-pointing bones (hips/spine/head): local Y = world up, local Z = world -Y (forward).
                # So vertical offset is location.y, yaw is rotation_euler[1].
                moving=clip in ['walk','run','chase','crouch'];fast=clip in ['run','chase']
                amp=.7 if fast else (.22 if clip=='crouch' else .32)
                for side,sign in [('L',1),('R',-1)]:
                    q=s*sign
                    rot('thigh.'+side,amp*q if moving else .015*s)
                    rot('shin.'+side,max(-q,0)*amp*.8 if moving else .03)
                    rot('upper_arm.'+side,-amp*q*.75 if moving else -.08,0,.05*sign)
                    rot('forearm.'+side,-.65 if fast else -.12)
                    rot('fingers.'+side,.45 if fast else .15);rot('fingertips.'+side,.35 if fast else .1);rot('thumb.'+side,.1)
                hips.location.y=.035*abs(s) if moving else .007*s
                rot('spine',-.14 if fast else .025*s)
                if clip=='crouch':
                    hips.location.y=-.3+.02*abs(s)
                    for side,sign in [('L',1),('R',-1)]:
                        q=s*sign;rot('thigh.'+side,-.95+amp*q);rot('shin.'+side,1.25+max(-q,0)*.3);rot('upper_arm.'+side,-.3-amp*q*.5);rot('forearm.'+side,-.7)
                    rot('spine',.3);rot('head',-.12)
                if clip in ['hide','hold-breath','caught','sit-exhausted']:
                    hips.location.y=-.43 if clip!='sit-exhausted' else -.55
                    for side in ['L','R']:rot('thigh.'+side,-1.1);rot('shin.'+side,1.5);rot('upper_arm.'+side,-.35);rot('forearm.'+side,-.85)
                    rot('spine',.28 if clip=='sit-exhausted' else .2);rot('head',.22)
                    if clip=='hold-breath':rot('spine',.2+.03*s);rot('head',.3)
                if clip=='hide-enter':
                    # Turn 180 deg, back 0.35 m into the locker, settle into the hide crouch.
                    hips.rotation_euler[1]=math.pi*smooth(t*1.6)
                    hips.location.z=-.35*smooth((t-.3)/.5);hips.location.y=-.43*smooth((t-.5)/.5)
                    for side in ['L','R']:
                        rot('thigh.'+side,-1.1*smooth((t-.5)/.5));rot('shin.'+side,1.5*smooth((t-.5)/.5))
                        rot('upper_arm.'+side,-.35*e);rot('forearm.'+side,-.85*e)
                    rot('spine',.2*e);rot('head',.22*e)
                if clip in ['repair','rescue']:
                    for side,sign in [('L',1),('R',-1)]:rot('upper_arm.'+side,-1.15+.08*s*sign);rot('forearm.'+side,-.5+.14*s)
                    rot('head',.17);rot('spine',.08)
                if clip=='grab':
                    # Reach (0-0.5 s, hand open), then clamp shut and pull in (0.5-1 s).
                    reach=smooth(t/.5);clamp=smooth((t-.5)/.35)
                    for side in ['L','R']:
                        rot('upper_arm.'+side,-1.45*reach+.4*clamp);rot('forearm.'+side,-.2-.5*clamp)
                        rot('fingers.'+side,-.45*reach+1.3*clamp);rot('fingertips.'+side,-.2*reach+1.0*clamp);rot('thumb.'+side,-.3*reach+.9*clamp)
                    rot('spine',.28*reach-.1*clamp);rot('head',.2*reach)
                if clip=='idle':rot('head',0,.035*s,0)
                if clip=='scan':
                    rot('head',.1,.65*s,0);rot('spine',.03,.18*math.sin(phase-.6),0)
                    for side in ['L','R']:rot('upper_arm.'+side,-.12);rot('fingers.'+side,.2)
                if clip=='stunned':rot('spine',.35,0,.1*s);rot('head',.2)
            for b in rig.pose.bones:
                b.keyframe_insert('rotation_euler',frame=frame);b.keyframe_insert('location',frame=frame)
        track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);track.mute=True
        a['clips'].append(clip);a['clip_meta'][clip]={'loop':loop,'drive':drive,'frames':length,'seconds':length/scene.render.fps}
    rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks:track.mute=False
    for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)

def operator(name,suit):
    begin(name,'Bulky protective operator (04/07): padded workwear, knee pads, dark gloves and boots, large battery backpack with canisters, chest radio, opaque visor. Skinned rig; suit/trim tint slots; walk/run/crouch loop on walkPhase.','character')
    def pelvis():
        ellipsoid('Trouser seat',(0,0,.91),(.255,.17,.2),suit)
        box('Webbing belt',(0,-.005,1.025),(.5,.36,.065),'cloth-black',.025,1)
        box('Buckle',(0,-.19,1.025),(.08,.025,.06),'hardware',.006,1)
        for side in [-1,1]:box('Belt pouch',(side*.2,-.14,.99),(.1,.09,.12),'cloth-black',.02,1)
    section('hips',pelvis)
    def torso():
        cloth_segment('Padded work jacket',(0,0,1.02),(0,.01,1.5),.29,.19,suit)
        for side in [-1,1]:
            ellipsoid('Shoulder pad',(side*.27,0,1.45),(.11,.13,.075),suit,14)
            rod('Harness strap',(side*.17,-.195,1.08),(side*.2,-.15,1.49),.026,'cloth-black',8)
            box('Harness buckle',(side*.185,-.215,1.3),(.056,.034,.07),'hardware',.008,1)
        box('Chest pocket',(-.11,-.205,1.27),(.12,.03,.14),suit,.014,1)
        rod('Jacket zip',(0,-.207,1.06),(0,-.2,1.44),.007,'hardware',6)
        # Chest radio (left chest) with grille, PTT button, antenna and coiled lead to the collar.
        box('Chest radio',(.12,-.23,1.35),(.1,.055,.15),'petrol',.015,1)
        box('Radio grille',(.12,-.259,1.37),(.07,.006,.07),'rubber',0)
        box('Radio PTT',(.175,-.23,1.39),(.018,.03,.04),'amber',.004,1)
        rod('Radio antenna',(.15,-.23,1.425),(.165,-.215,1.6),.008,'hardware',6)
        tube('Radio lead',[(.09,-.23,1.42),(.06,-.2,1.47),(.08,-.14,1.52)],.009,'rubber',6)
        # Large battery backpack.
        box('Battery pack',(0,.33,1.24),(.46,.28,.6),'petrol',.045)
        box('Pack top cap',(0,.33,1.56),(.42,.24,.06),'hardware',.015,1)
        box('Pack inset',(0,.474,1.23),(.34,.02,.42),'steel',.01,1)
        for x in [-.19,.19]:box('Pack rail',(x,.48,1.23),(.035,.04,.52),'hardware',.008,1)
        for side in [-1,1]:
            cylinder('Side canister',(side*.27,.32,1.2),.065,.44,'steel','Z',12)
            for z in [1.04,1.36]:ring('Canister band',(side*.27,.32,z),.067,.008,'hardware')
        box('Pack warning plate',(0,.487,1.4),(.2,.006,.06),'amber',0)
        tube('Breathing hose',[(.15,.46,1.5),(.27,.38,1.62),(.24,.12,1.67)],.025,'rubber',10)
    section('spine',torso)
    def helmet():
        cylinder('Neck seal',(0,0,1.5),.12,.12,'cloth-black',16)
        ellipsoid('Cream helmet',(0,-.005,1.7),(.215,.217,.245),'ivory',32)
        ellipsoid('Visor gasket',(0,-.168,1.695),(.168,.102,.19),'rubber',28)
        ellipsoid('Opaque visor',(0,-.198,1.7),(.145,.076,.166),'visor',32)
        for x in [-.2,.2]:cylinder('Helmet hinge',(x,-.018,1.7),.056,.026,'hardware','X',16)
        tube('Helmet rim',[(-.162,-.162,1.83),(-.105,-.198,1.905),(0,-.208,1.93),(.105,-.198,1.905),(.162,-.162,1.83)],.014,'ivory')
    section('head',helmet)
    specs=[('hips',(0,0,.91),(0,0,1.04),None),('spine',(0,0,1.04),(0,0,1.49),'hips'),('head',(0,0,1.49),(0,0,1.92),'spine')]
    for side,sign in [('L',1),('R',-1)]:
        hip=(sign*.14,0,.9);knee=(sign*.165,-.025,.53);ankle=(sign*.165,0,.17)
        sh=(sign*.3,0,1.43);el=(sign*.37,-.015,1.12);wr=(sign*.4,-.045,.87)
        section('thigh.'+side,lambda:cloth_segment('Trouser thigh',hip,knee,.15,.155,suit))
        def shin():
            cloth_segment('Trouser calf',knee,ankle,.115,.125,suit)
            box('Knee pad',(sign*.165,-.16,.53),(.15,.05,.18),'rubber',.02,1)
            box('Knee pad plate',(sign*.165,-.187,.54),(.09,.008,.09),'hardware',.004,1)
            for z in [.47,.6]:box('Knee strap',(sign*.165,-.03,z),(.2,.24,.022),'cloth-black',0)
        section('shin.'+side,shin)
        def boot():
            box('Work boot',(sign*.165,-.08,.125),(.2,.38,.23),'cloth-black',.04)
            box('Toe cap',(sign*.165,-.235,.085),(.19,.08,.13),'rubber',.025,1)
            box('Boot sole',(sign*.165,-.095,.03),(.215,.4,.05),'rubber',.012,1)
            for k in range(3):rod('Boot lace',(sign*.165-.06,-.12,.22+k*.017),(sign*.165+.06,-.15,.22+k*.017),.006,'hardware',6)
        section('foot.'+side,boot)
        section('upper_arm.'+side,lambda:cloth_segment('Jacket sleeve',sh,el,.115,.115,suit))
        section('forearm.'+side,lambda:(cloth_segment('Forearm sleeve',el,wr,.098,.096,suit),cylinder('Glove gauntlet',(wr[0],wr[1],wr[2]-.005),.082,.09,'cloth-black',14)))
        section('hand.'+side,lambda:glove((wr[0],wr[1],wr[2]-.1),sign))
        specs += [('thigh.'+side,hip,knee,'hips'),('shin.'+side,knee,ankle,'thigh.'+side),('foot.'+side,ankle,(sign*.165,-.26,.08),'shin.'+side),('upper_arm.'+side,sh,el,'spine'),('forearm.'+side,el,wr,'upper_arm.'+side),('hand.'+side,wr,(wr[0],wr[1],wr[2]-.2),'forearm.'+side)]
    tag_tints({'suit':suit,'trim':'cloth-black'})
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

def warden_head(p):
    """Large ivory instrument box with a full-width red sensor slit under a steel brow (06 close-up)."""
    x,y,z=p;fy=y-.23
    box('Instrument head',p,(.74,.46,.4),'ivory',.05)
    box('Head brow',(x,fy-.02,z+.13),(.76,.06,.07),'steel',.015,1)
    box('Sensor recess',(x,fy-.004,z),(.66,.024,.14),'rubber',.018,1)
    box('Red sensor slit',(x,fy-.018,z),(.6,.012,.05),'danger-red',.004,1)
    box('Chin vent',(x,fy-.006,z-.13),(.3,.014,.05),'steel',.006,1)
    for k in range(4):box('Vent slat',(x-.105+k*.07,fy-.014,z-.13),(.014,.008,.04),'rubber',0)
    for xx in [-.3,.3]:
        for zz in [-.14,.14]:cylinder('Head screw',(x+xx,fy-.002,z+zz),.016,.012,'hardware','Y',6)
        box('Head side port',(x+xx*1.3,y,z),(.04,.18,.09),'steel',.008,1)
    box('Head hatch',(x,y,z+.203),(.34,.26,.012),'ivory',.004,1)

def warden_hand(wr,side,sgn):
    """Articulated steel hand: palm (hand bone), three two-joint claws (fingers/fingertips bones), thumb."""
    x,y,z=wr;pz=z-.07
    def palm():
        box('Palm',(x,y,pz),(.15,.1,.13),'hardware',.02,1)
        box('Palm guard',(x,y-.055,pz),(.13,.012,.1),'petrol',.006,1)
        rod('Knuckle axle',(x-.07,y,z-.135),(x+.07,y,z-.135),.018,'steel',8)
    section('hand.'+side,palm)
    offs=[-.048,0,.048]
    def prox():
        for o in offs:rod('Claw proximal',(x+o,y,z-.135),(x+o,y-.01,z-.22),.017,'steel',8);ellipsoid('Claw knuckle',(x+o,y-.01,z-.22),(.02,.02,.02),'hardware',8)
    def tips():
        for o in offs:rod('Claw tip',(x+o,y-.01,z-.22),(x+o,y-.04,z-.29),.013,'hardware',8)
    ix=x-sgn*.08
    def thumb():rod('Thumb claw',(ix,y-.02,z-.09),(ix-sgn*.03,y-.065,z-.18),.018,'steel',8)
    section('fingers.'+side,prox);section('fingertips.'+side,tips);section('thumb.'+side,thumb)
    return [('fingers.'+side,(x,y,z-.135),(x,y-.01,z-.22),'hand.'+side),('fingertips.'+side,(x,y-.01,z-.22),(x,y-.04,z-.29),'fingers.'+side),
            ('thumb.'+side,(ix,y-.02,z-.09),(ix-sgn*.03,y-.065,z-.18),'hand.'+side)]

begin('warden','Tall asymmetric surveillance hunter (06): large ivory box head with wide red slit, articulated three-claw hands. Skinned rig; suit/trim tint slots; walk/chase loop on walkPhase.','character')
section('hips',lambda:(box('Pelvis',(0,0,1.15),(.32,.21,.18),'steel'),ellipsoid('Hip joint',(0,0,1.25),(.14,.12,.17),'hardware')))
section('spine',lambda:(box('Petrol torso',(0,0,1.62),(.48,.27,.48),'petrol',.06),box('Chest plate',(0,-.15,1.60),(.27,.025,.3),'ivory'),cylinder('Left shoulder',(.3,0,1.79),.16,.15,'petrol','X'),cylinder('Right shoulder',(-.29,0,1.74),.13,.14,'steel','X'),rod('Neck',(0,0,1.85),(0,0,2.03),.07,'hardware')))
section('head',lambda:warden_head((0,-.03,2.22)))
specs=[('hips',(0,0,1.15),(0,0,1.3),None),('spine',(0,0,1.3),(0,0,1.92),'hips'),('head',(0,0,1.92),(0,0,2.42),'spine')]
for side,sgn in [('L',1),('R',-1)]:
    hip=(sgn*.15,0,1.15);knee=(sgn*.21,.08,.64);ankle=(sgn*.2,-.01,.15);sh=(sgn*.34,0,1.76);el=(sgn*.44,-.015,1.31);wr=(sgn*.48,-.05,.9)
    section('thigh.'+side,lambda:(machine_limb(hip,knee,.055),box('Thigh armour',(sgn*.19,-.055,.93),(.115,.11,.29),'petrol')))
    section('shin.'+side,lambda:(machine_limb(knee,ankle),box('Shin shell',(sgn*.2,-.06,.4),(.105,.1,.3),'steel')))
    section('foot.'+side,lambda:box('Stability foot',(sgn*.2,-.1,.068),(.15,.34,.11),'hardware'))
    section('upper_arm.'+side,lambda:machine_limb(sh,el,.044))
    section('forearm.'+side,lambda:(machine_limb(el,wr,.035),box('Forearm guard',(sgn*.465,-.075,1.1),(.08,.08,.24),'petrol')))
    finger_specs=warden_hand(wr,side,sgn)
    specs += [('thigh.'+side,hip,knee,'hips'),('shin.'+side,knee,ankle,'thigh.'+side),('foot.'+side,ankle,(sgn*.2,-.24,.07),'shin.'+side),('upper_arm.'+side,sh,el,'spine'),('forearm.'+side,el,wr,'upper_arm.'+side),('hand.'+side,wr,(wr[0],wr[1],wr[2]-.135),'forearm.'+side)]+finger_specs
tag_tints({'suit':'petrol','trim':'ivory'})
animate_character(make_rig(specs,'warden'),'warden')

def frame_along(a,b,n):
    """Matrix at the a-b midpoint: local Z along a->b, local X along n (made perpendicular), Y = Z x X."""
    z=(Vector(b)-Vector(a)).normalized();x=(Vector(n)-z*Vector(n).dot(z)).normalized();y=z.cross(x)
    M=Matrix((x,y,z)).transposed().to_4x4();M.translation=(Vector(a)+Vector(b))/2;return M
def armor_seg(name,a,b,side_w,depth,mat,n):
    """Chunky box sleeve from a to b; side_w is the width seen from the side (along n)."""
    o=box(name,(0,0,0),(side_w,depth,(Vector(b)-Vector(a)).length),mat,.02,1);o.matrix_world=frame_along(a,b,n);return o
def hydraulic(a,b,off):
    a,b=Vector(a)+off,Vector(b)+off
    rod('Hydraulic ram',a.lerp(b,.08),a.lerp(b,.6),.032,'steel',8);rod('Piston',a.lerp(b,.6),a.lerp(b,.94),.019,'hardware',8)
def seg_decal(item,a,b,fn,offset,w,mat='decal-hazard'):
    """Vertical-run decal on the face of a segment whose outward normal is fn."""
    seg=(Vector(b)-Vector(a)).normalized();fn=Vector(fn);o=decal(item,(0,0,0),w,(Vector(b)-Vector(a)).length*.7,mat=mat,vertical=True)
    M=Matrix(((-fn).cross(seg),-fn,seg)).transposed().to_4x4();M.translation=(Vector(a)+Vector(b))/2+fn*offset;o.matrix_world=M;return o

# Rest pose matches weaver-body.tsx so Part B can swap the box legs for this GLB 1:1 (game z = -Blender y).
WEAVER_GAIT={'hip_y':.98,'hip_x':.24,'rows_game_z':[.3,.02,-.26],'splay':[.55,0,-.55],
  'knee':[.4,.34],'ankle':[.62,-.6],'foot':[.58,-.98],'splay_baked':True,
  'bones':'hip{row}.{L|R} = game leg group (yaw rotation_euler[1], lift location.y); leg/shin/foot = knee/ankle flex about local Z; L = +X = game side +1; row 0 = front'}
begin('weaver','Armored six-legged foundry hunter "W-01" (10): chunky petrol box hull with hazard stripes and W-01 stencils, ivory box head with red slit, thick three-joint hydraulic legs. Rest pose = weaver-body.tsx (KNEE/FOOT/SPLAY); tripod gait on walkPhase.','character')
def hull():
    box('Armored hull',(0,.2,1.0),(.66,.84,.4),'petrol',.05)
    box('Hull skirt',(0,.2,.775),(.58,.76,.07),'steel',.02,1)
    box('Front thorax',(0,-.27,1.02),(.54,.34,.32),'steel',.04)
    box('Top armor plate',(0,.28,1.215),(.56,.56,.03),'petrol',.01,1)
    box('Dorsal pack',(0,.44,1.3),(.36,.3,.14),'hardware',.03,1)
    for x in [-.11,.11]:cylinder('Hydraulic reservoir',(x,.16,1.29),.055,.34,'steel','Y',12)
    for x in [-.25,.25]:
        for y in [-.18,.6]:cylinder('Hull rivet',(x,y,1.201),.018,.012,'hardware','Z',6)
    for sgn,facing in [(1,'+X'),(-1,'-X')]:
        decal('code-w-01',(sgn*.333,.2,1.03),.3,mat='decal-ivory',facing=facing)
        decal('hazard-strip',(sgn*.332,.2,.86),.78,mat='decal-hazard',facing=facing)
    decal('code-w-01',(0,.16,1.232),.3,mat='decal-ivory',facing='+Z')
    decal('hazard-strip',(0,-.442,.9),.5,mat='decal-hazard')
section('hips',hull)
def head():
    box('Sensor head',(0,-.52,1.06),(.4,.26,.26),'ivory',.04)
    box('Head brow',(0,-.64,1.165),(.42,.05,.04),'steel',.01,1)
    box('Sensor recess',(0,-.655,1.06),(.32,.02,.1),'rubber',.012,1)
    box('Red sensor slit',(0,-.667,1.06),(.28,.012,.035),'danger-red',.004,1)
    for x in [-.17,.17]:
        for z in [.97,1.15]:cylinder('Head screw',(x,-.652,z),.014,.012,'hardware','Y',6)
section('head',head)
specs=[('root',(0,0,0),(0,0,.3),None),('hips',(0,0,.9),(0,0,1.25),'root'),('head',(0,-.52,.93),(0,-.52,1.19),'hips')]
UP=Vector((0,0,1));G=WEAVER_GAIT
for side,sgn in [('L',1),('R',-1)]:
    for j,(gz,spl) in enumerate(zip(G['rows_game_z'],G['splay'])):
        d=Vector((sgn*math.cos(spl),-math.sin(spl),0));H=Vector((sgn*G['hip_x'],-gz,G['hip_y']))
        P=lambda rh:H+d*rh[0]+UP*rh[1]
        K,A,F=P(G['knee']),P(G['ankle']),P(G['foot']);n=d.cross(UP).normalized();fn=n if n.y<0 else -n
        inplane=lambda a,b:(Vector(b)-Vector(a)).normalized().cross(n)*.085
        section(f'hip{j}.{side}',lambda:(cylinder('Hip motor',tuple(H+d*.1),.1,.22,'hardware','Z',12),cylinder('Motor cap',tuple(H+d*.1+UP*.12),.075,.03,'steel','Z',12)))
        section(f'leg{j}.{side}',lambda:(armor_seg('Thigh armor',H.lerp(K,.14),K.lerp(H,.1),.15,.13,'petrol',n),hydraulic(H,K,inplane(H,K)),rod('Knee joint',K-n*.1,K+n*.1,.08,'hardware',12)))
        section(f'shin{j}.{side}',lambda:(armor_seg('Shin armor',K.lerp(A,.1),A.lerp(K,.1),.14,.12,'petrol',n),seg_decal('hazard-strip',K.lerp(A,.16),A.lerp(K,.16),fn,.071,.1),hydraulic(K,A,inplane(K,A)),rod('Ankle joint',A-n*.085,A+n*.085,.065,'hardware',12)))
        section(f'foot{j}.{side}',lambda:(rod('Foot strut',A,F+UP*.07,.05,'hardware',8),box('Foot pad',tuple(F+UP*.05),(.2,.24,.08),'steel',.02,1),box('Rubber sole',tuple(F+UP*.012),(.18,.22,.024),'rubber',0)))
        specs += [(f'hip{j}.{side}',tuple(H),tuple(H+UP*.2),'root'),(f'leg{j}.{side}',tuple(H),tuple(K),f'hip{j}.{side}',tuple(n)),
                  (f'shin{j}.{side}',tuple(K),tuple(A),f'leg{j}.{side}',tuple(n)),(f'foot{j}.{side}',tuple(A),tuple(F),f'shin{j}.{side}',tuple(n))]
ASSETS[CURRENT]['gait']=WEAVER_GAIT
tag_tints({'suit':'petrol','trim':'ivory'})
animate_character(make_rig(specs,'weaver'),'weaver')

# Runtime shader specs by material name (exported to manifest "effects"). Colors are V4 tokens.
# Ripples use WORLD xz (not UV) so neighbouring water tiles line up; UVs drive scroll only.
EFFECTS={
 'water':{'kind':'water','deep':'#142127','mid':'#23474C','crest':'#507C79','opaque':True,'reflections':False,'specular':0,
   'wave':{'amp':.018,'freq':[3,2],'speed':[1,.7]},'ripple':{'freq':[7,8],'warp':1.8,'speed':[1,.8],'line':[.72,.91],'mix':.58},
   'broad':{'freq':[.8,1.4],'speed':.3,'mix':.07},'scroll_uv':[.02,.035],
   'contact_foam':{'color':'#DED7BC','width':.25,'alpha':.35,'note':'optional line where piers meet water; derive from level-grid pier AABBs, no depth texture'}},
 'fall-water':{'kind':'scroll','axis':'v','speed':1.6,'base':'#23474C','streak':'#507C79','streak_freq':[9,3],'streak_mix':.45,'side':'double'},
 'foam':{'kind':'scroll','axis':'v','speed':2.2,'base':'#DED7BC','alpha':.85,'breakup':.35,'side':'double'},
 'molten':{'kind':'flicker','base':'#FF3002','hot':'#FF8C1F','emissive':3,'hz':5,'depth':.15,'note':'furnace mouth, trough surface, splash crown, stack ember rim'},
 'molten-core':{'kind':'scroll','axis':'v','speed':1.4,'base':'#FF8C1F','hot':'#FFE0A0','emissive':5,'streak_freq':[6,2],'opaque':True},
 'molten-glow':{'kind':'scroll','axis':'v','speed':.9,'base':'#FF4D08','alpha':.5,'blend':'additive','emissive':3,'side':'double','depthWrite':False},
 'foam-splash':{'kind':'pulse','base':'#DED7BC','alpha':.7,'hz':1.2,'scale':[1,1.12],'fade':'v','side':'double','note':'rings: v 0 inner -> 1 outer; alpha fades toward the outer edge and dips with the pulse'}}

def _uv_mesh(name,verts,faces,uvs,mat,recalc=False):
    # Flat pieces are wound CCW from +Z already; only closed sweeps need normals recalculated outward.
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:uv.data[li].uv=uvs[mesh.loops[li].vertex_index]
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);o=finish_obj(o,name,mat)
    if recalc:
        bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    return o

def grid_plane(name,size,n,z,mat):
    """Subdivided square (n x n quads) so vertex waves bend it; UV 0..1 across the tile."""
    verts=[((i/n-.5)*size,(j/n-.5)*size,z) for j in range(n+1) for i in range(n+1)]
    uvs=[(i/n,j/n) for j in range(n+1) for i in range(n+1)]
    faces=[(j*(n+1)+i,j*(n+1)+i+1,(j+1)*(n+1)+i+1,(j+1)*(n+1)+i) for j in range(n) for i in range(n)]
    return _uv_mesh(name,verts,faces,uvs,mat)

def sweep(name,points,half_w,half_t,mat,sides=12):
    """Elliptical sweep along a path in the YZ plane; width on world X. u around, v 0 at the start -> 1 at the end."""
    pts=[Vector(p) for p in points];X=Vector((1,0,0));L=[0]
    for i in range(1,len(pts)):L.append(L[-1]+(pts[i]-pts[i-1]).length)
    verts=[];uvs=[];faces=[];s=sides+1
    for i,p in enumerate(pts):
        t=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized();nrm=t.cross(X).normalized()
        for j in range(s):
            a=j*math.tau/sides;verts.append(p+X*(math.cos(a)*half_w[i])+nrm*(math.sin(a)*half_t[i]));uvs.append((j/sides,L[i]/L[-1]))
    for i in range(len(pts)-1):
        for j in range(sides):faces.append((i*s+j,i*s+j+1,(i+1)*s+j+1,(i+1)*s+j))
    return _uv_mesh(name,verts,faces,uvs,mat,recalc=True)

def annulus(name,c,r0,r1,mat,n=24,z1=None,inward=False):
    """Flat ring facing +Z, or open frustum (z1 given: r0 at c.z, r1 at z1) facing outward
    (inward=True flips it). v 0 inner/bottom -> 1 outer/top."""
    x,y,z=c;s=n+1;verts=[];uvs=[]
    for v,(r,zz) in enumerate([(r0,z),(r1,z if z1 is None else z1)]):
        for k in range(s):a=k*math.tau/n;verts.append((x+r*math.cos(a),y+r*math.sin(a),zz));uvs.append((k/n,v))
    outward=(z1 is not None)!=inward
    faces=[(k,k+1,s+k+1,s+k) if outward else (k,s+k,s+k+1,k+1) for k in range(n)]
    return _uv_mesh(name,verts,faces,uvs,mat)

def blob(name,p,s,mat):
    """20-tri ico blob for droplets/splash (UV spheres are too heavy for effects)."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p);o=bpy.context.object;o.scale=s
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish_obj(o,name,mat)


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
    """Compact caged alarm beacon, 0.26 m tall. p = bottom of the base (sits exactly on the surface)."""
    x,y,z=p
    cylinder('Beacon base',(x,y,z+.025),.085,.05,'steel',16)
    cylinder('Lens collar',(x,y,z+.06),.064,.02,'hardware',16)
    cylinder('Red lens',(x,y,z+.12),.055,.1,'danger-red',16)
    ellipsoid('Red lens dome',(x,y,z+.17),(.055,.055,.035),'danger-red',12)
    for j in range(4):
        a=j*math.pi/2+math.pi/4;cx,cy=x+.068*math.cos(a),y+.068*math.sin(a)
        rod('Cage bar',(cx,cy,z+.06),(cx*.7+x*.3,cy*.7+y*.3,z+.235),.006,'hardware',6)
    ring('Cage hoop',(x,y,z+.14),.07,.006,'hardware');cylinder('Cage cap',(x,y,z+.24),.03,.014,'hardware',8)

begin('containment-capsule','Crew rescue capsule (07): transparent window, lifting door, roof beacon seated on the body, feed pipes, hazard-striped sill and C-1 stencil.','machinery')
box('Capsule body',(0,.18,1.37),(1.22,.75,2.74),'petrol',.12)
for x in [-.38,.38]:
    tube('Feed pipe',[(x,.555,2.3),(x,.66,2.2),(x,.66,.35),(x,.66,.1)],.055,'steel',10)
    for z in [.8,1.7]:box('Pipe clamp',(x,.62,z),(.13,.1,.04),'hardware',.006,1)
    cylinder('Pipe foot',(x,.66,.04),.09,.08,'hardware','Z',12)
box('Recess',(0,-.225,1.43),(.94,.1,2.25),'rubber',.07)
box('Interior back',(0,-.12,1.43),(.85,.04,2.17),'steel')
for x in [-.52,.52]:box('Ivory frame',(x,-.35,1.38),(.18,.22,2.63),'ivory',.035)
for z in [.17,2.6]:box('Ivory lintel',(0,-.35,z),(1.18,.22,.28),'ivory',.04)
idx=len(ASSETS[CURRENT]['objects']);box('Capsule glazing',(0,-.40,1.39),(.84,.025,2.05),'glass',.018)
for x in [-.435,.435]:box('Door rail',(x,-.42,1.39),(.035,.055,2.14),'hardware',.008)
pivot_part('capsule-door',(0,0,0),ASSETS[CURRENT]['objects'][idx:],'open','Z',2.16,True)
lamp_beacon((0,.18,2.74));box('Release box',(-.83,-.2,.94),(.3,.34,.68),'petrol')
decal('hazard-strip',(0,-.463,.17),1.1,.16,'decal-hazard','-Y',name='Sill hazard stripe')
for x in [-.52,.52]:decal('hazard-strip',(x,-.463,.62),.12,.6,'decal-hazard','-Y',vertical=True,name='Frame hazard stripe')
idx=len(ASSETS[CURRENT]['objects']);rod('Release lever',(-.83,-.4,1),(-.83,-.52,1.3),.028,'hardware');rod('Red grip',(-.94,-.52,1.3),(-.72,-.52,1.3),.046,'danger-red')
pivot_part('release-lever',(-.83,-.4,1),ASSETS[CURRENT]['objects'][idx:],'release','X',-.9)
decal('code-c-1',(0,-.463,2.6),.26,mat='decal-indigo')

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
# Worn inner door face (-Y, the side the hidden player sees). Slits stay clear: z .86-1.11 and 1.29-1.52.
IN=-.029
for z in [.55,1.75]:box('Stiffener rib',(0,IN-.012,z),(1.3,.024,.05),'steel',.006,1)
rod('Rusted latch bar',(.55,IN-.03,.35),(.55,IN-.03,.8),.014,'hardware',8)
box('Latch keeper',(.55,IN-.02,.6),(.08,.03,.06),'hardware',.004,1)
for x,z,w,h in [(-.35,.4,.34,.22),(.28,1.95,.3,.16),(.05,.7,.18,.1)]:box('Scuffed paint',(x,IN-.001,z),(w,.002,h),'soot',0)
for x in [-.42,-.1,.3]:box('Rust streak',(x,IN-.0015,.7),(.035,.002,.3),'rust',0)
for x in [-.2,.35]:box('Rust streak',(x,IN-.0015,1.18),(.03,.002,.12),'rust',0)
box('Dent seam',(-.1,IN-.004,1.92),(.5,.008,.012),'steel',0)
decal('code-07',(-.45,IN-.003,1.72),.16,mat='decal-ivory',name='Scratched locker number')

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
        # Stack of salvaged plates with rebar lengths, tied with two straps.
        for k,(mat,dz,rz) in enumerate([('steel',0,0),('rust',.028,.05),('hardware',.056,-.04),('rust',.084,.08)]):
            o=box('Salvage plate',(0,0,.014+dz),(.5,.3,.024),mat,.004,1);o.rotation_euler[2]=rz
        for k,y in enumerate([-.08,0,.08]):
            rod('Rebar',(-.34,y,.118+.012*(k%2)),(.34,y+.02,.118+.012*(k%2)),.013,'rust',8)
            for j in range(5):ring('Rebar rib',(-.25+j*.125,y+.004*j,.118+.012*(k%2)),.014,.003,'rust','X')
        for x in [-.17,.17]:
            box('Tie strap top',(x,0,.14),(.05,.34,.008),'amber',0)
            for y in [-.168,.168]:box('Tie strap side',(x,y,.075),(.05,.008,.14),'amber',0)
            box('Strap buckle',(x,-.172,.1),(.06,.012,.035),'hardware',.003,1)
    else:
        cylinder('Canister',(0,0,.28),.10,.5,'ivory');cylinder('Cap',(0,0,.55),.08,.065,'steel');tube('Air hose',[(0,0,.58),(.12,0,.64),(.2,0,.5),(.2,0,.12)],.012,'rubber')

begin('operator-plinth','Square worn concrete loadout block (1.8 m, top z .42) with OPERATOR 07 stencil, hazard edge and chipped corners.','environment')
box('Plinth block',(0,0,.19),(1.8,1.8,.38),'concrete',.035,1)
box('Top slab',(0,0,.4),(1.72,1.72,.04),'concrete-dark',.01,1)
box('Foot shadow',(0,0,.012),(1.84,1.84,.024),'soot',0)
for facing,p,rot in [('-Y',(0,-.902,.3),0),('+Y',(0,.902,.3),0),('+X',(.902,0,.3),0),('-X',(-.902,0,.3),0)]:decal('hazard-strip',p,1.62,mat='decal-hazard',facing=facing)
label('OPERATOR 07',(0,-.905,.14),.1,'indigo')
for x,y in [(-.86,-.86),(.86,-.86),(.86,.86),(-.86,.86)]:o=box('Chipped corner',(x,y,.36),(.12,.12,.06),'concrete-dark',.01,1);o.rotation_euler.z=math.pi/4
for x in [-.5,.5]:box('Floor bolt',(x,-.5,.425),(.07,.07,.02),'hardware',.005,1)
ASSETS[CURRENT]['anchors']={'stand':[0,0,.42]}

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

# Pipe kit shares pipe-straight's run: axis at z=PIPE_Z, radius PIPE_RAD, flange radius .37.
PIPE_Z=.42;PIPE_RAD=.28
begin('pipe-valve','Inline shutoff valve on the pipe-straight axis (z .42): bonnet, stem through a hub, red handwheel physically on the stem.','machinery')
cylinder('Valve body',(0,0,PIPE_Z),PIPE_RAD+.04,1.0,'petrol','X')
ellipsoid('Valve bulge',(0,0,PIPE_Z),(.38,.36,.36),'petrol',20)
for x in [-.5,.5]:flange(x,.37,PIPE_Z)
for x in [-.3,.3]:box('Pipe saddle',(x,0,.1),(.14,.6,.2),'steel',.02,1)
cylinder('Bonnet',(0,0,PIPE_Z+.42),.16,.14,'steel','Z',20)
for j in range(6):a=j*math.tau/6;cylinder('Bonnet bolt',(.12*math.cos(a),.12*math.sin(a),PIPE_Z+.5),.018,.03,'hardware','Z',6)
cylinder('Yoke',(0,0,PIPE_Z+.6),.06,.22,'hardware','Z',12)
WHEEL_Z=PIPE_Z+.73
idx=len(ASSETS[CURRENT]['objects'])
cylinder('Valve stem',(0,0,WHEEL_Z+.02),.032,.3,'hardware','Z',10)
cylinder('Wheel hub',(0,0,WHEEL_Z),.065,.06,'hardware','Z',12)
ring('Wheel',(0,0,WHEEL_Z),.3,.03,'danger-red')
for j in range(4):a=j*math.pi/2;rod('Spoke',(.06*math.cos(a),.06*math.sin(a),WHEEL_Z),(.28*math.cos(a),.28*math.sin(a),WHEEL_Z),.018,'danger-red',8)
pivot_part('valve-wheel',(0,0,WHEEL_Z),ASSETS[CURRENT]['objects'][idx:],'turn','Z',math.tau)

begin('pipe-tee','Pipe tee on the pipe-straight axis: 2 m run along X with a vertical branch to a flange at z 1.3.','machinery')
cylinder('Pipe run',(0,0,PIPE_Z),PIPE_RAD,2,'petrol','X',32)
for x in [-.94,.94]:flange(x,.37,PIPE_Z)
ellipsoid('Tee body',(0,0,PIPE_Z),(.36,.34,.34),'petrol',20)
cylinder('Branch',(0,0,PIPE_Z+.45),PIPE_RAD,.8,'petrol','Z',32)
cylinder('Branch flange',(0,0,1.28),.37,.1,'steel','Z',32)
for j in range(12):a=j*math.tau/12;cylinder('Hex flange bolt',(.31*math.cos(a),.31*math.sin(a),1.35),.03,.05,'hardware','Z',6)
for x in [-.6,.6]:box('Pipe saddle',(x,0,.1),(.15,.66,.2),'steel',.02,1)

begin('pipe-riser','Vertical 3 m riser pipe, flanges both ends, two wall clamps (wall at +Y .45).','machinery')
cylinder('Riser pipe',(0,0,1.5),PIPE_RAD,3,'petrol','Z',32)
for z in [.07,2.93]:cylinder('Riser flange',(0,0,z),.37,.12,'steel','Z',32)
for j in range(12):a=j*math.tau/12;cylinder('Hex flange bolt',(.31*math.cos(a),.31*math.sin(a),.15),.03,.05,'hardware','Z',6)
for z in [1.0,2.2]:
    ring('Riser clamp',(0,0,z),PIPE_RAD+.02,.022,'hardware')
    box('Clamp arm',(0,.37,z),(.08,.16,.06),'hardware',.008,1);box('Wall plate',(0,.44,z),(.24,.02,.18),'steel',.006,1)

begin('pipe-bracket','Wall bracket for a 0.28 m pipe: wall plate at y 0 (wall behind, +Y), pipe centre at (0,-.5,0).','machinery')
box('Wall plate',(0,-.01,0),(.3,.02,.36),'steel',.008,1)
for x in [-.1,.1]:
    for z in [-.13,.13]:cylinder('Anchor bolt',(x,-.025,z),.018,.02,'hardware','Y',6)
box('Bracket arm',(0,-.12,-.3),(.1,.22,.07),'hardware',.01,1)
o=box('Arm brace',(0,-.08,-.17),(.06,.05,.3),'hardware',.006,1);o.rotation_euler[0]=.6
box('Pipe cradle',(0,-.5,-.3),(.12,.62,.05),'hardware',.01,1)
ring('U-bolt',(0,-.5,0),PIPE_RAD+.015,.012,'hardware','X')

begin('junction-box','Wall-mounted electrical junction box with screwed lid, conduit glands and E1 stencil. Back on y 0, faces -Y.','machinery')
box('Junction body',(0,-.09,0),(.46,.18,.46),'petrol',.02,1)
box('Junction lid',(0,-.186,0),(.42,.015,.42),'steel',.008,1)
for x in [-.18,.18]:
    for z in [-.18,.18]:cylinder('Lid screw',(x,-.196,z),.012,.01,'hardware','Y',6)
for x in [-.12,.12]:
    cylinder('Conduit gland',(x,-.09,-.26),.035,.06,'hardware','Z',10)
    rod('Conduit',(x,-.09,-.29),(x,-.09,-.9),.022,'rubber',8)
cylinder('Top gland',(0,-.09,.26),.035,.06,'hardware','Z',10);rod('Conduit',(0,-.09,.29),(0,-.09,.9),.022,'rubber',8)
decal('code-e1',(0,-.195,.04),.2,mat='decal-indigo')
box('Warning band',(0,-.195,-.15),(.3,.002,.04),'amber',0)

begin('floor-drain-grate','Standalone slotted drain grate for floor tiles; top at z .012, origin at the tile surface.','environment')
box('Drain frame',(0,0,.004),(.62,.62,.008),'steel',0)
box('Drain well',(0,0,.002),(.52,.52,.004),'rubber',0)
for k in range(6):box('Grate bar',(( k-2.5)*.085,0,.008),(.034,.52,.008),'hardware',0)

begin('coat-hook-workwear','Wall coat rail (back on y 0) with three hooks, hanging amber work jacket and breathing hose. Jacket uses tint slot suit.','environment')
box('Hook rail',(0,-.02,1.75),(1.1,.04,.08),'steel',.008,1)
for x in [-.4,0,.4]:
    rod('Hook',(x,-.04,1.75),(x,-.14,1.72),.012,'hardware',6);rod('Hook tip',(x,-.14,1.72),(x,-.15,1.78),.01,'hardware',6)
# Jacket hangs from the middle hook: collar at the hook, body draping to z ~1.05, sleeves hanging.
cloth_segment('Hanging jacket',(0,-.13,1.08),(0,-.14,1.68),.24,.08,'cloth-amber')
ellipsoid('Collar fold',(0,-.15,1.68),(.12,.07,.04),'cloth-amber',12)
for s in [-1,1]:
    cloth_segment('Hanging sleeve',(s*.22,-.13,1.6),(s*.26,-.16,1.1),.06,.05,'cloth-amber')
    ellipsoid('Cuff',(s*.26,-.16,1.09),(.055,.045,.03),'cloth-black',10)
    box('Reflective band',(s*.245,-.19,1.3),(.1,.006,.035),'ivory',0)
rod('Jacket zip',(0,-.215,1.12),(0,-.22,1.64),.006,'hardware',6)
tube('Hanging hose',[(.4,-.15,1.72),(.43,-.18,1.45),(.38,-.16,1.2),(.42,-.15,1.0)],.022,'rubber',8)
tag_tints({'suit':'cloth-amber'})

begin('electrical-cabinet','Service cabinet with breaker rows, vents, handle and hazard stripe.','machinery')
box('Cabinet',(0,0,1),(1,.55,2),'petrol',.035);box('Door reveal',(0,-.29,1),(.9,.03,1.87),'steel')
for x in [-.22,.22]:
    for z in [1.25,1.48]:box('Breaker face',(x,-.325,z),(.3,.05,.15),'ivory');box('Switch',(x,-.36,z),(.055,.035,.1),'rubber')
for z in [.3,.38,.46]:box('Vent',(0,-.32,z),(.62,.028,.032),'rubber')
label('POWER',(0,-.327,1.77),.12,'ivory');box('Warning band',(0,-.324,.85),(.78,.025,.07),'amber')

begin('warning-beacon','Compact caged red alarm beacon (0.26 m), base on z 0. Runtime pulses the danger-red emission.','equipment');lamp_beacon((0,0,0))

# Cold storage and foundry ------------------------------------------------------
def frost_drips(r,z_top,angles,lengths):
    """Frost runs hanging from a cap edge on a vertical cylinder of radius r (thin axis radial)."""
    for a,l in zip(angles,lengths):
        o=box('Frost drip',((r+.012)*math.cos(a),(r+.012)*math.sin(a),z_top-l/2),(.11,.04,l),'frost',.008,1);o.rotation_euler[2]=a+math.pi/2

# Sector 2 (03/09): petrol tanks with frosted ivory-white domes, ivory insulated casings, stencils via decals.
begin('coolant-tank','Tall refrigeration tank (r .65): painted bands, ivory cap with frost crown and drips, gauge, frosted service pipe, C1 stencil decal.','machinery')
cylinder('Tank',(0,0,1.4),.65,2.6,'petrol','Z',32)
ellipsoid('Tank cap',(0,0,2.7),(.65,.65,.26),'ivory',24)
ellipsoid('Frost crown',(0,0,2.78),(.56,.56,.2),'frost',16)
frost_drips(.65,2.72,[.5,1.9,3.4,4.6],[.28,.5,.2,.38])
for z in [.2,1.4,2.58]:cylinder('Tank band',(0,0,z),.665,.05,'hardware','Z',32)
for x in [-.4,.4]:box('Tank foot',(x,0,.12),(.15,.9,.24),'steel',.02,1)
gauge(0,-.67,1.7,.14);rod('Service pipe',(.55,-.4,.2),(.55,-.4,2.65),.046,'hardware')
cylinder('Service pipe frost',(.55,-.4,2.3),.062,.5,'frost','Z',10)
cylinder('Top connection',(0,0,3),.12,.32,'steel','Z',16)
# Flat decal on the curved shell: .3 m wide sags ~.018 m, so it floats .02 proud of r.
decal('code-c1',(0,-.67,1.15),.3,mat='decal-ivory')

begin('refrigeration-unit','Twin-fan chiller: ivory insulated casing, frosted top, frosted coolant connections at the back, COLD STORAGE stencil and hazard kick strip (decals).','machinery')
box('Chiller',(0,0,.85),(2.4,.9,1.7),'ivory',.06)
box('Frost top',(0,0,1.715),(2.3,.8,.05),'frost',.015,1)
for x in [-.61,.61]:
    cylinder('Fan recess',(x,-.47,.94),.43,.06,'rubber','Y',24)
    for j in range(5):
        a=j*math.tau/5;rod('Fan blade',(x,-.53,.94),(x+.34*math.cos(a),-.53,.94+.34*math.sin(a)),.045,'hardware',6)
    for dx in [-.27,-.14,0,.14,.27]:rod('Fan guard',(x+dx,-.56,.65),(x+dx,-.56,1.23),.009,'steel',6)
for x in [-.7,.7]:
    tube('Coolant line',[(x,.45,1.2),(x,.62,1.2),(x,.7,1.3),(x,.7,1.9)],.07,'petrol',10)
    cylinder('Line frost',(x,.7,1.62),.085,.4,'frost','Z',10)
decal('cold-storage',(0,-.452,.3),1.2,mat='decal-indigo')
decal('hazard-strip',(0,-.452,.06),1.2,.086,mat='decal-hazard')

begin('cold-storage-door','Heavy insulated sliding door: ivory frame with vertical hazard stripes, rubber gasket, frosted threshold, 02 stencil decal on the moving leaf, open clip.','environment')
for x in [-.92,.92]:
    box('Insulated frame',(x,0,1.3),(.18,.45,2.6),'ivory')
    decal('hazard-strip',(x,-.227,1.2),.14,2.2,mat='decal-hazard',vertical=True)
box('Top rail',(0,0,2.63),(2.2,.5,.15),'steel')
box('Frosted threshold',(0,0,.015),(1.9,.55,.03),'frost',.008,1)
idx=len(ASSETS[CURRENT]['objects'])
box('Insulated door',(0,0,1.27),(1.7,.23,2.45),'ivory',.06);box('Door kickplate',(0,-.13,.32),(1.6,.025,.48),'petrol',.01,1)
for x in [-.87,.87]:box('Door gasket',(x,0,1.27),(.03,.2,2.4),'rubber',0)
box('Door gasket',(0,0,2.5),(1.74,.2,.03),'rubber',0)
rod('Latch',(.59,-.22,.9),(.59,-.22,1.45),.035,'hardware');box('Latch keeper',(.59,-.16,1.18),(.12,.1,.7),'steel',.01,1)
decal('code-02',(0,-.117,1.65),.5,mat='decal-indigo')
pivot_part('cold-door',(0,0,0),ASSETS[CURRENT]['objects'][idx:],'open','X',1.8,True)

begin('frost-silo','Tall domed cryogenic silo (03/09/11), larger than coolant-tank: r 1.0, 5.2 m. Concrete plinth, steel skirt with amber band, petrol shell, frost-crowned dome with drips, cage ladder, frosted bottom outlet, 02 stencil decal.','machinery')
R=1.0;SH0=.55;SH1=4.15
cylinder('Silo plinth',(0,0,.15),1.18,.3,'concrete-dark','Z',20)
cylinder('Silo skirt',(0,0,.425),1.03,.25,'steel','Z',32)
cylinder('Skirt band',(0,0,.54),1.04,.04,'amber','Z',24)
cylinder('Silo shell',(0,0,(SH0+SH1)/2),R,SH1-SH0,'petrol','Z',32)
cylinder('Shell band',(0,0,2.35),R+.015,.05,'hardware','Z',24)
ellipsoid('Silo dome',(0,0,SH1),(R,R,.5),'petrol',20)
ellipsoid('Frost crown',(0,0,SH1+.1),(.92,.92,.44),'frost',16)
frost_drips(R,SH1+.02,[.3,1.4,2.6,3.9,5.1],[.5,.9,.35,.7,.55])
cylinder('Manway',(0,0,SH1+.52),.22,.14,'steel','Z',12)
# Cage ladder on the -X/-Y quarter so it never covers the front stencil.
la=-2.3;rd=Vector((math.cos(la),math.sin(la),0));td=Vector((-math.sin(la),math.cos(la),0))
def lp(off,z,out=R+.18):return tuple(rd*out+td*off+Vector((0,0,z)))
for off in [-.2,.2]:
    rod('Ladder rail',lp(off,SH0),lp(off,SH1),.022,'amber',6)
    for z in [1.0,3.6]:rod('Ladder standoff',lp(off,z,R),lp(off,z),.018,'steel',4)
for k in range(6):z=.9+k*.55;rod('Ladder rung',lp(-.2,z),lp(.2,z),.016,'hardware',4)
cylinder('Outlet flange',(R+.02,0,.9),.15,.06,'steel','X',12)
tube('Bottom outlet',[(R-.05,0,.9),(R+.3,0,.9),(R+.45,0,.75),(R+.45,0,.3)],.09,'petrol',10)
cylinder('Outlet frost',(R+.45,0,.55),.105,.4,'frost','Z',12)
decal('code-02',(0,-(R+.02),2.2),.38,mat='decal-ivory')

begin('chimney','Plant exhaust stack (1.5 m dia, ~8 m) with concrete lower shaft, red/ivory upper bands, rim, ember glow and cage ladder.','machinery')
cylinder('Stack foot',(0,0,.3),1.0,.6,'concrete-dark','Z',24,.86)
cylinder('Lower shaft',(0,0,2.6),.8,4.0,'concrete','Z',24,.76)
for k in range(6):cylinder('Stack band',(0,0,4.85+k*.5),.755-k*.012,.5,'danger' if k%2==0 else 'ivory','Z',24,.743-k*.012)
cylinder('Rim',(0,0,7.95),.8,.22,'hardware','Z',24)
cylinder('Soot crown',(0,0,7.72),.76,.26,'soot','Z',24)
cylinder('Dark opening',(0,0,8.058),.62,.008,'rubber','Z',24)
annulus('Ember glow',(0,0,8.064),.5,.64,'molten',24)
for z in [1.1,3.0,4.6]:cylinder('Collar',(0,0,z),.82-z*.012,.1,'hardware','Z',24)
for z in [.8+k*.45 for k in range(16)]:box('Ladder rung',(0,-.86,z),(.36,.035,.035),'steel',0)
for x in [-.18,.18]:rod('Ladder rail',(x,-.86,.6),(x,-.84,7.8),.022,'steel',6)
for z in [3.2,5.0,6.8]:tube('Ladder cage hoop',[(-.2,-.84,z),(-.22,-1.14,z),(0,-1.24,z),(.22,-1.14,z),(.2,-.84,z)],.016,'steel',5)
cylinder('Aircraft lamp',(0,-.8,7.6),.07,.12,'danger-red','Y',8)
ASSETS[CURRENT]['anchors']={'smoke':[0,0,8.1]}

begin('foundry-furnace','Refractory furnace with glowing mouth, heavy shutters and exhaust collar.','machinery')
box('Furnace',(0,0,1.55),(2.3,1.8,3.1),'steel',.1)
for x in [-1.02,1.02]:box('Furnace rib',(x,-.98,1.55),(.16,.2,3.1),'petrol')
box('Firebox surround',(0,-.96,1.36),(1.6,.18,1.5),'hardware',.05);box('Firebox',(0,-1.06,1.36),(1.32,.045,1.18),'rubber')
box('Molten interior',(0,-1.09,1.2),(1.12,.024,.68),'molten')
for x in [-.43,-.14,.14,.43]:box('Grate bar',(x,-1.13,1.35),(.04,.035,1.15),'hardware')
cylinder('Exhaust',(0,0,3.55),.46,1,'petrol');label('F-03',(0,-.925,2.67),.24,'ivory')

begin('foundry-crucible','Hanging ladle (10/03) for the overhead-gantry hook. Origin = bail eye: place it at the gantry anchors.hook. Bail yoke with hazard arms, tapered banded drum with ribs, -Y pour spout, glowing melt, tilt gear. pour clip tilts the drum 1.05 rad about the trunnions; anchors.pour_lip = spout lip at full tilt.','machinery')
TZ=-1.3;DR0,DR1,DZ0,DZ1=.52,.62,-1.9,-.8
def drum_r(z):return DR0+(z-DZ0)/(DZ1-DZ0)*(DR1-DR0)
ring('Bail eye',(0,0,-.09),.09,.03,'hardware','Y')
box('Bail crossbar',(0,0,-.24),(1.62,.16,.14),'steel',.02,1)
for sx in [-1,1]:
    box('Bail arm',(sx*.76,0,-.8),(.1,.16,1.12),'petrol',.02,1)
    decal('hazard-strip',(sx*.76,-.082,-.74),.08,.8,mat='decal-hazard',vertical=True)
idx=len(ASSETS[CURRENT]['objects'])
cylinder('Ladle drum',(0,0,(DZ0+DZ1)/2),DR0,DZ1-DZ0,'steel','Z',24,r2=DR1)
for z in [-1.78,-1.3,-.9]:cylinder('Drum band',(0,0,z),drum_r(z)+.015,.07,'petrol','Z',24)
for j in range(8):
    a=j*math.tau/8+math.pi/8;ca,sa=math.cos(a),math.sin(a)
    rod('Drum rib',((drum_r(-1.85)+.012)*ca,(drum_r(-1.85)+.012)*sa,-1.85),((drum_r(-.86)+.012)*ca,(drum_r(-.86)+.012)*sa,-.86),.022,'hardware',6)
cylinder('Melt',(0,0,-.79),.56,.012,'molten-core','Z',20)
annulus('Rim outer wall',(0,0,-.8),.665,.665,'hardware',24,-.72)
annulus('Rim inner wall',(0,0,-.8),.56,.56,'hardware',24,-.72,inward=True)
annulus('Rim top',(0,0,-.72),.56,.665,'hardware',24)
box('Pour spout',(0,-.68,-.76),(.26,.2,.1),'hardware',.02,1);box('Spout melt',(0,-.68,-.705),(.16,.18,.012),'molten-core',0)
for sx in [-1,1]:cylinder('Trunnion',(sx*.67,0,TZ),.1,.2,'hardware','X',12)
cylinder('Tilt gear',(.86,0,TZ),.2,.06,'hardware','X',16)
for j in range(10):a=j*math.tau/10;o=box('Gear tooth',(.86,.22*math.cos(a),TZ+.22*math.sin(a)),(.06,.05,.05),'steel',0);o.rotation_euler[0]=a
pivot_part('ladle-tilt',(0,0,TZ),ASSETS[CURRENT]['objects'][idx:],'pour','X',1.05)
LIP=Matrix.Rotation(1.05,4,'X')@Vector((0,-.77,-.7-TZ))+Vector((0,0,TZ))
ASSETS[CURRENT]['anchors']={'pivot':[0,0,TZ],'pour_lip_rest':[0,-.77,-.7],'pour_lip':[round(v,4) for v in LIP]}

begin('overhead-gantry','Foundry overhead crane (10): petrol columns with vertical hazard stripes and knee braces, crossbeam with F-03 stencil and hazard rail, trolley, hoist drum, twin cables, striped hook block and hook. anchors.hook = where the foundry-crucible origin hangs.','machinery')
HOOK_Z=3.3
for x in [-2.3,2.3]:
    box('Column',(x,0,2.5),(.38,.48,5),'petrol');box('Foot',(x,0,.12),(.8,.9,.24),'steel')
    decal('hazard-strip',(x,-.242,2.4),.3,4.2,mat='decal-hazard',vertical=True)
    rod('Knee brace',(x,0,4.1),(x-math.copysign(.75,x),0,4.72),.06,'petrol',8)
box('Crossbeam',(0,0,4.95),(5.2,.66,.48),'petrol')
# Code stencils are square atlas cells (aspect 1); nudged .002 proud so they never share a plane with the stripes.
decal('code-f-03',(-1.1,-.334,4.98),.46,mat='decal-ivory')
for x in [-1.73,-.58,.58,1.73]:decal('hazard-strip',(x,-.332,4.757),1.15,mat='decal-hazard')
box('Trolley',(0,0,4.56),(.85,.8,.3),'steel');cylinder('Hoist drum',(0,0,4.25),.23,.64,'hardware','X')
for x in [-.16,.16]:rod('Hoist cable',(x,0,4.25),(x,0,3.85),.015,'steel')
box('Hook block',(0,0,3.72),(.42,.3,.3),'steel',.03,1);box('Block stripe',(0,-.152,3.72),(.4,.008,.07),'amber',0)
cylinder('Sheave',(0,0,3.86),.12,.2,'hardware','X',12)
rod('Hook shank',(0,0,3.57),(0,0,3.47),.04,'hardware',8)
ring('Hook',(0,0,HOOK_Z+.1),.1,.035,'hardware','Y')
ASSETS[CURRENT]['anchors']={'hook':[0,0,HOOK_Z]}

begin('casting-trough','Molten-metal casting channel with refractory walls and end stops.','machinery')
box('Bed',(0,0,.14),(1.6,2.8,.28),'steel')
box('Liquid surface',(0,0,.32),(1.14,2.39,.025),'molten')
for x in [-.7,.7]:box('Side',(x,0,.32),(.18,2.8,.4),'hardware')
for y in [-1.31,1.31]:box('End',(0,y,.32),(1.6,.18,.4),'hardware')

# Core ------------------------------------------------------------------------
begin('overseer-housing','Monumental dark monolith (~9 x 5 x 16 m) with stepped buttresses, recessed red observation slit, vertical light seam, OVERSEER stencil (01 title backdrop, 03 Core island).','machinery')
box('Stepped plinth',(0,0,.6),(10.4,6.4,1.2),'concrete-dark',.05,1)
box('Monolith',(0,0,8.6),(8.4,4.4,14.8),'indigo',.08,1)
box('Upper taper',(0,0,16.4),(7.6,3.8,1.2),'indigo',.06,1)
for s in [-1,1]:
    box('Buttress lower',(s*4.55,0,4.2),(1.1,4.9,7.2),'concrete-dark',.05,1)
    box('Buttress upper',(s*4.35,0,10.4),(.7,4.6,5.4),'concrete-dark',.05,1)
    box('Buttress cap',(s*4.4,0,13.2),(.9,4.8,.3),'steel',.02,1)
for z in [3.2,6.6,10.0,13.4]:box('Panel seam',(0,-2.205,z),(8.3,.012,.05),'soot',0)
for x in [-2.1,0,2.1]:box('Panel seam',(x,-2.205,8.6),(.05,.012,14.6),'soot',0)
box('Eye recess',(0,-2.18,13.2),(6.2,.4,1.1),'rubber',.02,1)
box('Observation slit',(0,-2.39,13.2),(5.6,.04,.34),'danger-red',0)
box('Slit glow lip',(0,-2.41,12.93),(5.8,.02,.06),'danger-red',0)
box('Vertical seam recess',(0,-2.2,3.8),(.9,.3,5.2),'rubber',.02,1)
box('Vertical seam glow',(0,-2.36,3.8),(.26,.02,4.8),'danger-red',0)
label('OVERSEER',(0,-2.22,11.6),.46,'ivory')
for x in [-3.3,3.3]:box('Antenna mast',(x,0,18.1),(.12,.12,2.2),'hardware',0);cylinder('Mast lamp',(x,0,19.3),.1,.14,'danger-red','Z',8)
ASSETS[CURRENT]['anchors']={'slit':[0,-2.39,13.2],'seam':[0,-2.36,3.8]}

# Menu world (01 title, 03 sector map, 11 overseer) ---------------------------
def basalt_column(name,p,r,h,rng,mat='basalt',tilt=.05):
    o=cylinder(name,(p[0],p[1],p[2]+h/2),r,h,mat,'Z',6,r*rng.uniform(.82,.95))
    o.rotation_euler=(rng.uniform(-tilt,tilt),rng.uniform(-tilt,tilt),rng.uniform(0,math.pi/3));return o

begin('sea-rock','Low basalt outcrop / island base (~6 x 5 m, top z 1.2..2.6, foot z -1.5) of hex columns with a wet dark waterline; stacks under sector islands and along title shores.','environment')
rng=random.Random(20)
for k in range(26):
    a=rng.uniform(0,math.tau);d=math.sqrt(rng.random())*2.6;r=rng.uniform(.45,.8)
    basalt_column('Basalt column',(d*math.cos(a)*1.15,d*math.sin(a),-1.5),r,rng.uniform(2.3,4.1)-d*.35,rng)
box('Waterline stain',(0,0,-.2),(6.2,5.4,.3),'soot',.2,1)
ASSETS[CURRENT]['anchors']={'waterline_z':0}

begin('cliff-stack','Tall stepped basalt spire (~4 m wide, 14 m high, foot z -2) for the title backdrop and Core island silhouette.','environment')
rng=random.Random(7)
for tier,(rad,h,n) in enumerate([(2.1,6,9),(1.5,10,7),(.9,14,5)]):
    for k in range(n):
        a=k/n*math.tau+rng.uniform(-.2,.2);d=rad*rng.uniform(.3,.8)
        basalt_column('Spire column',(d*math.cos(a),d*math.sin(a),-2),rng.uniform(.5,.85)*(1-tier*.18),h*rng.uniform(.8,1.05),rng,tilt=.03)
for z in [3.6,7.8]:box('Ledge',(0,0,z),(3.4-z*.18,3.0-z*.16,.3),'basalt',.1,1)
ASSETS[CURRENT]['anchors']={'top_z':14}

begin('facility-tower-block','Multi-storey concrete facility block (8 x 6 x 12.6 m) with floor bands, lit amber windows, slogan stencils, big 07, roof plant and down-pipes.','machinery')
box('Tower body',(0,0,6.1),(8,6,12.2),'concrete',.05,1)
box('Plinth',(0,0,.5),(8.4,6.4,1),'concrete-dark',.04,1)
box('Roof slab',(0,0,12.35),(8.3,6.3,.3),'concrete-dark',.03,1)
for z in [3.2,6.2,9.2]:box('Floor band',(0,0,z),(8.08,6.08,.24),'concrete-dark',.01,1)
lit=random.Random(3)
for f,z in enumerate([4.6,7.6,10.6]):
    for x in [-2.8,-1.4,1.4,2.8]:
        box('Window recess',(x,-3.0,z),(.9,.1,1.1),'rubber',0)
        box('Window glass',(x,-3.04,z),(.8,.02,1.0),'signal-amber' if lit.random()<.45 else 'glass',0)
    for y in [-1.6,0,1.6]:box('Window recess',(4.0,y,z),(.1,.9,1.1),'rubber',0);box('Window glass',(4.04,y,z),(.02,.8,1.0),'signal-amber' if lit.random()<.35 else 'glass',0)
decal('slogan-shift',(-.9,-3.01,1.9),4.8,mat='decal-ivory',facing='-Y')
decal('slogan-listening',(4.01,0,1.9),5.0,mat='decal-ivory',facing='+X')
decal('code-07',(-2.4,-3.015,8.6),1.6,mat='decal-ivory',facing='-Y')
box('Service door',(2.6,-3.02,1.6),(1.3,.06,2.2),'petrol',.01,1);box('Door lamp',(2.6,-3.1,2.9),(.3,.14,.14),'signal-amber',0)
for x,y in [(-2,1),(1.8,-.8)]:box('Roof plant',(x,y,13.0),(2.2,1.8,1.0),'steel',.03,1)
cylinder('Roof vent',(2.4,1.8,13.2),.4,1.4,'hardware','Z',12)
for x in [-3.9,3.9]:rod('Down-pipe',(x,-3.1,.8),(x,-3.1,12.2),.09,'petrol',8)
ASSETS[CURRENT]['anchors']={'roof_z':12.5}

begin('pallet','Standard 1.2 x 1.0 m wooden pallet (0.15 m), three stringers, top/bottom boards.','equipment')
for y in [-.44,0,.44]:box('Stringer block',(0,y,.075),(1.2,.1,.09),'wood',.004,1)
for k in range(7):box('Top board',(-.54+k*.18,0,.135),(.12,1.0,.03),'wood',.003,1)
for x in [-.54,0,.54]:box('Bottom board',(x,0,.015),(.14,1.0,.03),'wood',.003,1)
ASSETS[CURRENT]['anchors']={'load':[0,0,.15]}

begin('forklift','Compact amber warehouse forklift (1.1 x 2.2 m, guard 2.1 m): counterweight body, mast, forks, overhead guard, seat, rubber wheels, beacon.','equipment')
box('Chassis',(0,.35,.45),(1.05,1.5,.55),'amber',.04,1)
box('Counterweight',(0,1.05,.75),(1.05,.4,.75),'petrol',.05,1)
box('Engine hood',(0,.55,.9),(.95,.8,.3),'amber',.04,1)
box('Seat',(0,.55,1.18),(.5,.45,.12),'rubber',.02,1);box('Seat back',(0,.78,1.45),(.5,.1,.45),'rubber',.02,1)
rod('Steering column',(0,.05,.95),(0,.2,1.35),.03,'hardware',6);cylinder('Wheel',(0,.22,1.38),.16,.03,'rubber','Z',12)
for x in [-.45,.45]:
    for y in [.0,.95]:cylinder('Tyre',(x*1.06,y,.24),.24,.2,'rubber','X',12)
    rod('Guard post',(x,.0,1.0),(x,.02,2.1),.035,'steel',6);rod('Guard post',(x,.95,1.2),(x,.95,2.1),.035,'steel',6)
box('Overhead guard',(0,.48,2.12),(1.0,1.1,.05),'steel',.01,1)
for k in range(4):box('Guard slat',(0,.1+k*.25,2.16),(1.0,.05,.04),'steel',0)
decal('hazard-strip',(0,1.257,.5),.98,mat='decal-hazard',facing='+Y')
cylinder('Beacon',(0,.9,2.2),.07,.1,'signal-amber','Z',8)
for x in [-.36,.36]:box('Mast rail',(x,-.48,1.15),(.08,.1,2.2),'steel',.01,1)
idx=len(ASSETS[CURRENT]['objects'])
box('Carriage',(0,-.58,.45),(.82,.08,.5),'hardware',.01,1)
for x in [-.24,.24]:box('Fork',(x,-1.1,.08),(.12,1.05,.04),'steel',.005,1);box('Fork heel',(x,-.62,.3),(.12,.05,.5),'steel',.005,1)
pivot_part('fork-carriage',(0,-.58,.05),ASSETS[CURRENT]['objects'][idx:],'lift','Z',.9,True)
ASSETS[CURRENT]['anchors']={'fork_load':[0,-1.1,.1]}

# Core geometry mirrors game/lib/game/config.ts CORE (metres). Game angle a = atan2(z, x) in three; glTF z = -Blender y,
# so Blender angle = -a. Ring/rim/wall pieces span game angle [0, SEG_ARC] (Blender [-SEG_ARC, 0]); instance j at
# three rotation.y = -j * SEG_ARC inside the ring group (rotation.y = -ring.angle), exactly like RingView's annulus.
CORE_PILLAR=3.2;CORE_RINGS=[(4.2,6.6),(7.6,10.0),(11.0,13.4)];CORE_RIM=(14.4,17.2);CORE_SPOKE_HALF=.9
CORE_SEGMENTS=12;SEG_ARC=math.tau/CORE_SEGMENTS;CORE_SEAM=.012;CORE_DEPTH=.6
CORE_SLIT_Z=6.0;SPOKE_TOP=.08;SPOKE_BOTTOM=.012
SEG_A0,SEG_A1=-SEG_ARC+CORE_SEAM,-CORE_SEAM

begin('core-spindle','Tall modular calculating column (pillar r 3.2) with red sensor band at the slit height, ivory/petrol modules, CORE stencils and service conduits.','machinery')
cylinder('Deck plinth',(0,0,-.175),CORE_PILLAR,.85,'concrete-dark','Z',32)
annulus('Plinth hazard ring',(0,0,.256),2.92,3.1,'amber',32)
cylinder('Void shaft',(0,0,-6.3),3.1,11.4,'concrete-dark','Z',32,2.2)
for z in [-2.5,-6.5,-10.5]:cylinder('Void collar',(0,0,z),3.1-(-.6-z)*.079+.06,.18,'hardware','Z',32)
MOD_H=2.2;MOD_R=2.5
for k in range(5):
    z0=.25+k*MOD_H
    cylinder('Column module',(0,0,z0+MOD_H/2),MOD_R,MOD_H,'petrol','Z',32)
    cylinder('Module collar',(0,0,z0+.07),MOD_R+.08,.14,'hardware','Z',32)
    if k in (0,3):cylinder('Ivory casing band',(0,0,z0+MOD_H/2),MOD_R+.02,.9,'ivory','Z',32)
cylinder('Sensor recess',(0,0,CORE_SLIT_Z),MOD_R+.06,.4,'rubber','Z',32)
cylinder('Sensor band',(0,0,CORE_SLIT_Z),MOD_R+.1,.14,'danger-red','Z',32)
for facing,p in [('-Y',(0,-MOD_R-.025,3.5)),('+X',(MOD_R+.025,0,3.5))]:decal('code-core',p,1.7,mat='decal-ivory',facing=facing)
cylinder('Crown',(0,0,11.55),MOD_R,.6,'steel','Z',32,1.7);rod('Crown mast',(0,0,11.85),(0,0,13.1),.09,'hardware',8)
cylinder('Crown lamp',(0,0,13.15),.16,.18,'danger-red','Z',8)
for j in range(4):
    a=j*math.pi/2+math.pi/4;x,y=2.72*math.cos(a),2.72*math.sin(a)
    rod('External conduit',(x,y,.3),(x,y,11.1),.085,'steel',8)
    for z in [2.4,6.8,10.2]:box('Conduit clamp',(x*.965,y*.965,z),(.2,.2,.1),'hardware',0)
ASSETS[CURRENT]['anchors']={'sensor_band':[0,0,CORE_SLIT_Z],'slit_game_angle':round(math.pi/4,4)}

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
def deck_decal(item,r,ang,w,rot,z=.006,mat='decal-ivory'):
    """Flat +Z decal centred at polar (r, ang); rot turns its width axis (local X) about Z."""
    o=decal(item,(0,0,z),w,mat=mat,facing='+Z');o.rotation_euler.z=rot;o.location=(r*math.cos(ang),r*math.sin(ang),0);return o
def pol(r,a,z):return (r*math.cos(a),r*math.sin(a),z)

def ring_segment(r0,r1,number=None,deck='concrete',posts=True):
    """One 30-degree deck segment, top at z 0, CORE_DEPTH deep. Nothing rises above z .006 because the static spokes
    (deck bottom SPOKE_BOTTOM) pass over the rotating rings; the guard posts are on the outer fascia instead."""
    rm=(r0+r1)/2;a0,a1=SEG_A0,SEG_A1;ac=(a0+a1)/2
    arc_mesh('Deck slab',r0,r1,a0,a1,0,.12,deck)
    arc_mesh('Ring girder',r0+.14,r1-.14,a0+.01,a1-.01,-.12,CORE_DEPTH-.12,'petrol')
    arc_mesh('Fascia lip',r1-.05,r1,a0,a1,-.12,.22,'steel')
    for rr in [r0+.08,r1-.2]:arc_mesh('Amber edge line',rr,rr+.12,a0+.02,a1-.02,.004,.004,'amber')
    arc_mesh('Deck seam',rm-.012,rm+.012,a0+.03,a1-.03,.002,.002,'soot')
    for a in [a0+SEG_ARC/3,a0+2*SEG_ARC/3]:o=box('Deck joint',pol(rm,a,.001),(r1-r0-.5,.024,.002),'soot',0);o.rotation_euler.z=a
    hw=r1-r0-.5;hh=hw/DECALS['hazard-strip']['aspect']
    for a,s in [(a0,1),(a1,-1)]:deck_decal('hazard-strip',rm,a+s*(hh/2+.04)/rm,hw,a+s*(hh/2+.04)/rm,mat='decal-hazard')
    if number:deck_decal(number,rm,ac,.95,ac+math.pi/2)
    if posts:
        for k in range(4):
            a=a0+(k+.5)*SEG_ARC/4;rod('Fascia stanchion',pol(r1+.04,a,-CORE_DEPTH+.04),pol(r1+.04,a,-.02),.035,'steel',8)
        tube('Fascia rail',[pol(r1+.08,a0+(a1-a0)*k/8,-.3) for k in range(9)],.03,'steel',6)

for i,(name,num) in enumerate([('core-ring-inner','code-ring-01'),('core-ring-middle','code-ring-02'),('core-ring-outer','code-ring-03')]):
    r0,r1=CORE_RINGS[i]
    begin(name,f'One 30-degree segment of core ring {i+1:02d} (r {r0}-{r1}); 12 instances per ring, seg j at three rotation.y = -j*SEG_ARC. Amber edge lines, hazard ends, ring number, fascia stanchions.','core')
    ring_segment(r0,r1,num)
    ASSETS[CURRENT]['anchors']={'segment_game_angles':[0,round(SEG_ARC,5)],'radii':[r0,r1],'top_z':0,'seam_rad':CORE_SEAM,'ring_index':i}

begin('core-retracting-segment','Drop-away ring-03 segment variant with red gap lamps and a retract (fall) clip; use for dropped/warn segments.','core')
idx=len(ASSETS[CURRENT]['objects']);r0,r1=CORE_RINGS[2];ring_segment(r0,r1,'code-ring-03')
for a in [SEG_A0+.03,SEG_A1-.03]:
    for rr in [r0+.35,r1-.35]:cylinder('Gap lamp',pol(rr,a,.004),.06,.008,'danger-red','Z',8)
pivot_part('retracting-deck',(0,0,0),ASSETS[CURRENT]['objects'][idx:],'retract','Z',-1.8,True)
ASSETS[CURRENT]['anchors']={'segment_game_angles':[0,round(SEG_ARC,5)],'radii':[r0,r1]}

begin('core-rim-segment','Static outer rim walkway segment (r 14.4-17.2), 12 per ring, hazard lip on the void edge.','core')
r0,r1=CORE_RIM;rm=(r0+r1)/2
arc_mesh('Rim slab',r0,r1,SEG_A0-CORE_SEAM,SEG_A1+CORE_SEAM,0,CORE_DEPTH,'concrete-dark')
arc_mesh('Void edge line',r0+.08,r0+.2,SEG_A0,SEG_A1,.004,.004,'amber')
arc_mesh('Wall-side kerb',r1-.25,r1,SEG_A0-CORE_SEAM,SEG_A1+CORE_SEAM,.12,.12,'concrete')
for k in range(3):a=SEG_A0+(k+.5)*SEG_ARC/3;deck_decal('hazard-strip',r0+.42,a,SEG_ARC*(r0+.42)/3-.1,a+math.pi/2,mat='decal-hazard')
o=box('Rim joint',pol(rm,SEG_A0,.001),(r1-r0-.3,.024,.002),'soot',0);o.rotation_euler.z=SEG_A0
ASSETS[CURRENT]['anchors']={'segment_game_angles':[0,round(SEG_ARC,5)],'radii':[r0,r1]}

begin('core-radial-bridge','Static grated spoke bridge along +X from the pillar (r 3.2) to the rim (r 14.7), 1.8 m wide; deep trusses only over the ring gaps so rotating rings pass beneath.','core')
L0,L1=CORE_PILLAR,CORE_RIM[0]+.3;LM=(L0+L1)/2;LN=L1-L0;W=CORE_SPOKE_HALF;DT=SPOKE_TOP-SPOKE_BOTTOM;DZ=(SPOKE_TOP+SPOKE_BOTTOM)/2
for y in [-W+.06,W-.06]:
    box('Deck stringer',(LM,y,DZ),(LN,.12,DT),'steel',.01,1)
    box('Amber edge line',(LM,y,SPOKE_TOP+.002),(LN-.1,.08,.004),'amber',0)
n=int(LN/.3)
for k in range(n):box('Grate slat',(L0+.15+k*LN/n,0,DZ),(.05,2*W-.24,DT*.8),'steel',0)
for y in [-.45,.45]:box('Grate runner',(LM,y,SPOKE_BOTTOM+.01),(LN-.2,.04,.02),'hardware',0)
for x,s in [(L0+.2,1),(L1-.2,-1)]:o=decal('hazard-strip',(0,0,SPOKE_TOP+.004),2*W-.3,mat='decal-hazard',facing='+Z');o.rotation_euler.z=math.pi/2;o.location=(x,0,0)
gaps=[(CORE_PILLAR,CORE_RINGS[0][0])]+[(CORE_RINGS[i][1],CORE_RINGS[i+1][0]) for i in range(2)]+[(CORE_RINGS[2][1],CORE_RIM[0])]
for g0,g1 in gaps:
    gm=(g0+g1)/2;gl=g1-g0-.06
    for y in [-W+.1,W-.1]:
        box('Gap truss chord',(gm,y,-CORE_DEPTH+.08),(gl,.14,.14),'petrol',.01,1)
        for sx in [-1,1]:rod('Gap truss web',(gm-sx*gl/2,y,SPOKE_BOTTOM),(gm+sx*gl*.1,y,-CORE_DEPTH+.12),.04,'steel',6)
    box('Gap cross beam',(gm,0,-CORE_DEPTH+.08),(.14,2*W-.2,.14),'petrol',0)
ASSETS[CURRENT]['anchors']={'inner':[L0,0,SPOKE_TOP],'outer':[L1,0,SPOKE_TOP],'half_width':W}

begin('core-shaft-wall','30-degree panel of the circular shaft wall behind the rim (inner face r 17.6) with rows of amber lamps; 12 per shaft.','core')
WR0,WR1,WTOP,WBOT=17.6,18.2,3.5,-12.0
arc_mesh('Shaft wall',WR0,WR1,SEG_A0-CORE_SEAM,SEG_A1+CORE_SEAM,WTOP,WTOP-WBOT,'concrete-dark')
arc_mesh('Wall cap',WR0-.06,WR1,SEG_A0-CORE_SEAM,SEG_A1+CORE_SEAM,WTOP+.1,.1,'steel')
for z in [.9,-3.2,-7.4]:arc_mesh('Pour seam',WR0-.01,WR0+.01,SEG_A0-CORE_SEAM,SEG_A1+CORE_SEAM,z,.04,'soot')
o=box('Pilaster',pol(WR0-.1,SEG_A0-CORE_SEAM,(WTOP+WBOT)/2),(.3,.5,WTOP-WBOT),'concrete',.03,1);o.rotation_euler.z=SEG_A0-CORE_SEAM
for z in [2.3,-1.4,-5.4,-9.4]:
    for k in range(3):
        a=SEG_A0+(k+.5)*SEG_ARC/3
        o=box('Lamp housing',pol(WR0-.07,a,z),(.14,.5,.24),'hardware',.01,1);o.rotation_euler.z=a
        o=box('Amber lamp lens',pol(WR0-.145,a,z),(.02,.4,.14),'signal-amber',0);o.rotation_euler.z=a
ASSETS[CURRENT]['anchors']={'segment_game_angles':[0,round(SEG_ARC,5)],'inner_radius':WR0,'lamp_rows_z':[2.3,-1.4,-5.4,-9.4]}

begin('core-support-pillar','Square concrete column under the rim into the void (top at deck bottom -0.6, 12 m deep), steel bands, hazard stripe, amber marker lamp.','core')
PT=-CORE_DEPTH;PB=-12.8
box('Pillar capital',(0,0,PT-.2),(1.9,1.9,.4),'concrete-dark',.03,1)
box('Pillar shaft',(0,0,(PT-.4+PB)/2),(1.5,1.5,PT-.4-PB),'concrete',.04,1)
for z in [-3.0,-6.2,-9.4]:box('Steel band',(0,0,z),(1.56,1.56,.16),'steel',.01,1)
decal('hazard-strip',(0,-.752,-1.9),1.3,mat='decal-hazard',facing='-Y')
box('Marker lamp housing',(0,-.8,-2.6),(.24,.1,.18),'hardware',.01,1);box('Marker lamp lens',(0,-.856,-2.6),(.18,.012,.12),'signal-amber',0)
rod('Service conduit',(.62,-.8,PT-.4),(.62,-.8,PB+.4),.05,'steel',8)
box('Void footing',(0,0,PB-.2),(1.9,1.9,.4),'concrete-dark',.03,1)
ASSETS[CURRENT]['anchors']={'top':[0,0,PT],'game_columns':{'radius':CORE_RIM[1]-1,'count':10,'offset':.2}}

begin('core-kill-switch','Finale kill-switch station with red/amber status lenses and animated activation lever.','core')
box('Switch plinth',(0,0,.08),(.75,.65,.16),'steel');box('Switch body',(0,0,.82),(.52,.4,1.5),'petrol');box('Face',(0,-.22,.95),(.43,.055,1.0),'ivory')
cylinder('Status rim',(0,-.275,1.18),.15,.06,'hardware','Y');cylinder('Red status',(0,-.316,1.18),.115,.025,'danger-red','Y');label('KILL',(0,-.256,.78),.1,'steel')
idx=len(ASSETS[CURRENT]['objects']);rod('Switch lever',(0,-.31,.52),(0,-.51,.74),.025,'hardware');rod('Switch grip',(-.12,-.51,.74),(.12,-.51,.74),.04,'amber')
pivot_part('activation-lever',(0,-.31,.52),ASSETS[CURRENT]['objects'][idx:],'activate','X',1.1)
def number_plate(p,item,size=.22):
    """Shared screwed number plate facing -Y; p = centre on the mounting surface (plate back at p.y).
    The digit is a decal quad (extras.decal_slot = number) the runtime re-UVs per instance."""
    x,y,z=p;f=y-.012;k=size*.39
    box('Number plate',(x,y-.006,z),(size,.012,size),'steel',.004,1)
    for dx in [-k,k]:
        for dz in [-k,k]:cylinder('Plate screw',(x+dx,f-.002,z+dz),size*.045,.006,'hardware','Y',6)
    o=decal(item,(x,f-.0015,z),size*.75,mat='decal-ivory',name='Plate number');o['decal_slot']='number';return o
# On the ivory face between the status lens (bottom z 1.03) and the KILL stencil.
number_plate((0,-.2475,.95),'code-01',.12);ASSETS[CURRENT]['root']['decal_item']='code-01'
ASSETS[CURRENT]['root']['decal_variants']=['code-01','code-02','code-03','code-04']
begin('number-plate','Shared screwed number plate (kill switches 1-4, lockers, bays). Decal item swapped per instance.','core')
number_plate((0,0,0),'code-01');ASSETS[CURRENT]['root']['decal_item']='code-01'

# Effects meshes; time-dependent rendering is supplied separately in effects/v4-effects.js.
begin('water-tile','Eight-metre dark water surface at z 0, 16x16 grid for vertex ripples. Matte, no reflections; see manifest effects.water.','effect')
grid_plane('Water surface',8,16,0,'water')

# Fall path: water leaves the lip at (0,0,H) moving -Y at FALL_V m/s and drops under gravity to z 0.
FALL_H=2.0;FALL_V=1.2
def fall_point(s):
    d=FALL_H*s;return (0,-FALL_V*math.sqrt(2*d/9.81),FALL_H-d)
FALL_S=[0,.02,.06,.12,.22,.36,.52,.7,.86,1]
LAND=fall_point(1)
begin('waterfall','Volumetric 2 m outfall: water body sheet leaving a lip at (0,0,2) along -Y, two foam streaks, foam lip curl, splash crown and three splash rings at the landing. UV v runs down the fall for scroll shaders (manifest effects).','effect')
sweep('Fall body',[fall_point(s) for s in FALL_S],[.3+.12*s for s in FALL_S],[.06+.08*s for s in FALL_S],'fall-water',12)
for off in [-.14,.12]:
    sweep('Foam streak',[Vector(fall_point(s))+Vector((off,-.03-.08*s,0)) for s in FALL_S],[.06+.04*s for s in FALL_S],[.02+.02*s for s in FALL_S],'foam',6)
sweep('Foam lip',[fall_point(s) for s in FALL_S[:4]],[.31,.31,.32,.33],[.08,.08,.075,.07],'foam',8)
lx,ly,_=LAND
annulus('Splash crown',(lx,ly,0),.32,.52,'foam-splash',16,.22)
for k,(r0,r1) in enumerate([(.35,.47),(.56,.64),(.76,.82)]):annulus('Splash ring',(lx,ly,.012+k*.004),r0,r1,'foam-splash',24)
ASSETS[CURRENT]['root']['fall_lip']=[0,0,FALL_H];ASSETS[CURRENT]['root']['fall_landing']=list(LAND)

begin('outlet-pipe','Large wall outfall (01/05/07). Wall face at y 0 (+Y behind), origin at the wall foot on the water line. 0.45 m pipe out 0.95 m along -Y with bolted wall + mouth flanges, clamp strut, paint band, rust run, S2 stencil. Place waterfall at waterfall_anchor so its lip meets the mouth.','machinery')
PR=.45;PZ=FALL_H+.38;PL=.95
box('Wall collar',(0,-.07,PZ),(1.3,.14,1.3),'concrete-dark',.02,1)
decal('code-s2',(-.5,-.142,PZ+.5),.16,mat='decal-ivory')
cylinder('Wall flange',(0,-.19,PZ),.56,.1,'steel','Y',24)
# Pipe body spans from the wall flange (y -.23) into the mouth flange (y -PL+.08).
cylinder('Outfall pipe',(0,-(.23+PL-.08)/2,PZ),PR,PL-.08-.23,'petrol','Y',24)
cylinder('Mouth flange',(0,-PL+.05,PZ),.54,.1,'steel','Y',24)
cylinder('Mouth opening',(0,-PL-.005,PZ),.38,.02,'rubber','Y',24)
for y in [-.25,-PL-.01]:
    for j in range(8):a=j*math.tau/8+math.pi/8;box('Flange bolt',(.49*math.cos(a),y,PZ+.49*math.sin(a)),(.05,.04,.05),'hardware',.006,1)
cylinder('Clamp band',(0,-.52,PZ),PR+.02,.08,'hardware','Y',24)
cylinder('Paint band',(0,-.78,PZ),PR+.006,.06,'amber','Y',24)
rod('Clamp strut',(0,-.52,PZ-PR-.01),(0,-.03,PZ-1.1),.035,'steel',6)
box('Strut plate',(0,-.01,PZ-1.1),(.22,.02,.2),'steel',.006,1)
box('Rust run',(0,-.62,PZ-PR-.002),(.16,.62,.006),'rust',0)
ASSETS[CURRENT]['root']['waterfall_anchor']=[0,-PL,0]
begin('vision-cone','Flat triangular enemy vision field with alpha material; visibility and occlusion are controlled by gameplay.','effect')
material('vision-red',(.75,.035,.012),0,1,.3);MATS['vision-red'].node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.16
mesh=bpy.data.meshes.new('Vision field');mesh.from_pydata([(0,0,.025),(-1.5,-4,.025),(1.5,-4,.025)],[],[(0,1,2)]);mesh.update();o=bpy.data.objects.new('Vision field',mesh);scene.collection.objects.link(o);finish_obj(o,'Vision field','vision-red')
MS_H=1.25;MS_V=.5
def ms_point(s):d=MS_H*s;return Vector((0,-MS_V*math.sqrt(2*d/9.81),MS_H-d))
MS_S=[0,.03,.08,.16,.28,.44,.62,.8,1];MS_LAND=ms_point(1)
begin('molten-stream',f'Molten pour (10): origin on the receiving surface, lip at (0,0,{MS_H}) leaving along -Y (matches foundry-crucible anchors.pour_lip; scale Z to fit other drops). Bright core ribbon inside a translucent glow sheath, glow pool, splash crown and ico droplets. UV v runs down the pour (effects molten-core / molten-glow).','effect')
sweep('Molten core',[ms_point(s) for s in MS_S],[.06+.03*s for s in MS_S],[.045+.02*s for s in MS_S],'molten-core',8)
sweep('Glow sheath',[ms_point(s) for s in MS_S],[.11+.06*s for s in MS_S],[.085+.04*s for s in MS_S],'molten-glow',10)
lx,ly,_=MS_LAND
cylinder('Glow pool',(lx,ly,.006),.24,.012,'molten-core','Z',16)
annulus('Splash crown',(lx,ly,0),.14,.3,'molten',16,.13)
rng=random.Random(18)
for j in range(10):
    a=rng.uniform(0,math.tau);r=rng.uniform(.18,.42)
    blob('Droplet',(lx+r*math.cos(a),ly+r*math.sin(a),rng.uniform(.04,.32)),(.022,.022,.034),'molten-core')
ASSETS[CURRENT]['anchors']={'lip':[0,0,MS_H],'landing':[round(v,4) for v in MS_LAND]}

begin('tall-smokestack','Foundry stack (03/10): ~9 m tapered rust-metal stack on a concrete plinth, flared base, steel bands, soot crown with ember-lit rim and dark flue, side flue inlet, cage ladder, red top lamp, F-03 stencil.','machinery')
SK0,SK1,SR0,SR1=1.3,8.7,.62,.48
def stack_r(z):return SR0+(z-SK0)/(SK1-SK0)*(SR1-SR0)
box('Stack plinth',(0,0,.35),(1.9,1.9,.7),'concrete-dark',.03,1)
cylinder('Base flare',(0,0,1.0),.85,.6,'rust','Z',20,r2=SR0)
cylinder('Stack shell',(0,0,(SK0+SK1)/2),SR0,SK1-SK0,'rust','Z',20,r2=SR1)
for z in [1.6,3.2,4.8,6.4,8.0]:cylinder('Stack band',(0,0,z),stack_r(z)+.018,.12,'steel','Z',20)
cylinder('Soot crown',(0,0,8.85),.52,.3,'soot','Z',20)
cylinder('Flue opening',(0,0,9.003),.37,.004,'rubber','Z',20)
annulus('Ember rim',(0,0,9.007),.37,.5,'molten',20)
cylinder('Top lamp',(.56,0,8.8),.045,.08,'danger-red','X',8)
cylinder('Flue inlet',(0,-.85,2.4),.3,.6,'rust','Y',16);cylinder('Inlet flange',(0,-1.12,2.4),.36,.06,'steel','Y',16)
la=-2.3;rd=Vector((math.cos(la),math.sin(la),0));td=Vector((-math.sin(la),math.cos(la),0))
def sp(off,z):return tuple(rd*(stack_r(z)+.18)+td*off+Vector((0,0,z)))
for off in [-.2,.2]:rod('Ladder rail',sp(off,SK0),sp(off,8.6),.022,'amber',6)
for k in range(15):z=1.6+k*.47;rod('Ladder rung',sp(-.2,z),sp(.2,z),.016,'hardware',4)
decal('code-f-03',(0,-(stack_r(4.2)+.02),4.2),.46,mat='decal-ivory')

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
    if a['root'].get('decal_variants'):entries[name]['decal_variants']=list(a['root']['decal_variants'])
    if a.get('clip_meta'):entries[name]['clip_meta']=a['clip_meta']
    if a.get('tint_slots'):entries[name]['tint_slots']=a['tint_slots']
    for key in ['fall_lip','fall_landing','waterfall_anchor']:
        if a['root'].get(key) is not None:entries[name][key+'_blender']=[round(v,4) for v in a['root'][key]]
    if a.get('anchors'):entries[name]['anchors_blender']=a['anchors']
    if a.get('gait'):entries[name]['gait']=a['gait']
    fx=sorted(m for m in entries[name]['materials'] if m in EFFECTS)
    if fx:entries[name]['effects']=fx
    print('EXPORTED',name,triangles,'tris',('OVER BUDGET '+str(budget)) if triangles>budget else 'ok',flush=True)
materials={}
for n,m in MATS.items():
    materials[n]={'atlas_cell':n if n in QUADS else None,'fallback_color':[round(c,4) for c in m.get('fallback_color',m.diffuse_color[:3])],'emission':m.get('emission',0),'roughness':.9 if n in QUADS else round(m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value,3)}
    if m.get('decal_atlas'):materials[n].update(atlas='decals',decal_kind=m['decal_kind'])
manifest={'version':3,'status':'v4-library','visual_match':'Requires scene-level comparison; no pixel-identical claim.','authoring':'Blender '+bpy.app.version_string,
 'coordinates':'GLB Y up; metres; character front +Z after Blender -Y conversion',
 'textures':{'atlas':'textures/v4-atlas.png','atlas_layout':'textures/atlas-layout.json','decals':'textures/decals-atlas.png','decals_layout':'textures/decals-layout.json'},
 'runtime':'GLBs contain no images. Build one MeshStandardMaterial per material name: atlas_cell != null -> map = v4-atlas (flipY=false, sRGB), roughness .9, metalness 0; else flat fallback_color (+emissive when emission > 0). atlas == "decals": map = decals-atlas, transparent, depthWrite false, polygonOffset; decal_kind "mask" -> color = fallback_color with the atlas as alpha, "color" -> atlas color as is. Decal assets carry decal_item; UV rects come from decals-layout.json. Characters: clip_meta[clip] = {loop, drive, frames, seconds}; drive "walkPhase" -> time = ((walkPhase / 2pi) mod 1) * seconds, "time" -> play normally (one-shots hold the last frame). tint_slots {suit, trim} name the materials to clone + recolor per instance; meshes carry extras.tint_slot.',
 'budgets':BUDGET,'materials':materials,'effects':EFFECTS,'assets':[entries[n] for n in ASSETS if n in entries]}
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
if FULL:
    for i,a in enumerate(ASSETS.values()):a['root'].location=((i%8)*12,(i//8)*12,0)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'models/v4-shared-library.glb'),export_animations=False,**GLTF)
    for a in ASSETS.values():a['root'].location=(0,0,0)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/shutdown-v4-export-library.blend'))
over=[e['id'] for e in manifest['assets'] if e.get('over_budget')]
print('LIBRARY', 'FULL' if FULL else 'PARTIAL', len(selected),'exported /',len(ASSETS),'assets | over budget:',len(over),over,flush=True)
