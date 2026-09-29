"""Explicit scene compositions; transforms in Blender Z-up metres."""
from pathlib import Path
import json, math
ROOT=Path(__file__).resolve().parents[1]
SCENES={}
def scene(name,description):
    SCENES[name]={'id':name,'description':description,'coordinates':'Blender Z up; rotation radians around Z','instances':[]};return SCENES[name]['instances']
def put(out,asset,p=(0,0,0),r=0,s=(1,1,1),clip=None):
    out.append({'asset':asset,'position':list(p),'rotation':r,'scale':list(s),**({'pose':clip} if clip else {})})
def room(out,x,y,w=2,h=2):
    for i in range(w):
        for j in range(h):put(out,'walkway-floor',(x+i*4,y+j*4,0));put(out,'foundation-pier',(x+i*4,y+j*4,0))
    for i in range(w):put(out,'bulkhead-wall',(x+i*4,y+4*(h-1)+2,0))
    for j in range(h):put(out,'bulkhead-wall',(x-2,y+j*4,0),math.pi/2)
    for i in range(w):put(out,'guardrail',(x+i*4,y-2,0))
    for j in range(h):put(out,'guardrail',(x+4*(w-1)+2,y+j*4,0),math.pi/2)
    for i in range(w):put(out,'wall-lamp',(x+i*4,y+4*(h-1)+1.7,1.9))

# Title diorama (01): upper turbine deck at z 0, lower service deck at z -3, sea at z -4.4. The tower block is the
# station body behind the decks; outlet pipes sit on the pier face (origin on the water line) and feed waterfalls at
# their manifest waterfall_anchor (0,-.95,0). The monolith, cliff stacks and sea rocks frame the backdrop.
SEA=-4.4
out=scene('title-station','Pumping Station 07 title diorama (01): turbine deck + lower service deck on piers, tower block with slogans, outlet pipes and waterfalls, OVERSEER monolith and basalt stacks behind.')
room(out,0,0);put(out,'turbine-generator',(2,2,0),math.pi/2);put(out,'locker-bank',(-.5,5.4,0));put(out,'service-door',(3.3,5.75,0));put(out,'operator-amber',(.1,.2,0));put(out,'control-console',(5.2,4.6,0));put(out,'pipe-elbow',(5.6,1.6,1.2),math.pi/2,s=(2,2,2))
put(out,'facility-tower-block',(1,10.2,SEA));put(out,'ladder',(5.5,4,-3));put(out,'supply-crate',(4,-.7,0))
put(out,'walkway-floor',(2,-4,-3));put(out,'foundation-pier',(2,-4,-3));put(out,'guardrail',(2,-6,-3));put(out,'service-door',(2,-2.1,-3));put(out,'wall-lamp',(2,-2.25,-1.1));put(out,'electrical-cabinet',(.6,-2.6,-3))
for x in [-1.2,5.2]:put(out,'outlet-pipe',(x,-2,SEA));put(out,'waterfall',(x,-2.95,SEA))
put(out,'water-tile',(4,4,SEA),s=(4,4,1))
put(out,'overseer-housing',(12,24,SEA),-.35)
for p,r,k in [((-8,20,SEA),.3,1),((22,16,SEA),1.1,.85),((24,28,SEA),2.0,1.2),((4,30,SEA),.8,.9)]:put(out,'cliff-stack',p,r,s=(k,k,k))
for p,r in [((-4,-3,SEA),.4),((8.5,-2.5,SEA),1.9),((-5,8,SEA),2.8),((9,8,SEA),.9)]:put(out,'sea-rock',p,r)

out=scene('shift-rooms','Three connected reference-style rooms with turbine, sliding wall, hiding locker, operator and patrolling Warden.')
room(out,0,0);room(out,8,4,1,2);put(out,'grated-bridge',(5.5,3,0),math.pi/2)
put(out,'turbine-generator',(.6,2.5,0));put(out,'operator-amber',(.2,.4,0),math.pi);put(out,'sliding-bulkhead',(4.3,3,0),math.pi/2);put(out,'warden',(8,5,0));put(out,'vision-cone',(8,5,.05));put(out,'locker-single',(8,9.4,0));put(out,'electrical-cabinet',(8.8,3,0));put(out,'supply-crate',(3.8,1.2,0));put(out,'water-tile',(4,3,-3.8),s=(2,2,1))

out=scene('crew-rescue','Rescue capsule encounter with captured crew, release interaction and a second crew worker.')
room(out,0,0);room(out,8,4,1,1);put(out,'grated-bridge',(5.5,4,0),math.pi/2);put(out,'turbine-generator',(0,3,0));put(out,'crew-teal',(-.4,1,0),math.pi,clip='repair');put(out,'containment-capsule',(4,4,0));put(out,'crew-ivory',(4,3.88,.3),clip='caught');put(out,'operator-amber',(2.7,2.8,0),math.pi,clip='rescue');put(out,'warden',(8,4,0));put(out,'vision-cone',(8,4,.05));put(out,'water-tile',(4,3,-3.8),s=(2,2,1))

# Core layout mirrors game/lib/game/config.ts CORE. Game angle a (atan2(z, x) in three) = Blender angle -a.
CORE_RINGS=[(4.2,6.6),(7.6,10.0),(11.0,13.4)];SEG_ARC=math.tau/12
CORE_SPOKES=[math.pi/4,3*math.pi/4,5*math.pi/4,7*math.pi/4]
CORE_TERMINALS=[(2,0),(2,6),(1,3),(0,9)]
def gpol(r,a,z=0):return (r*math.cos(a),-r*math.sin(a),z)
out=scene('core-arena','Spindle, three rotating 12-segment rings, static rim + shaft wall, four spokes, rim support columns, four kill switches and one dropping segment (game CORE layout).')
put(out,'core-spindle')
for i,name in enumerate(['core-ring-inner','core-ring-middle','core-ring-outer']):
    for j in range(12):
        if (i,j)==(2,4):put(out,'core-retracting-segment',r=-j*SEG_ARC,clip='retract');continue
        put(out,name,r=-j*SEG_ARC)
for j in range(12):put(out,'core-rim-segment',r=-j*SEG_ARC);put(out,'core-shaft-wall',r=-j*SEG_ARC)
for a in CORE_SPOKES:put(out,'core-radial-bridge',r=-a)
for k in range(10):a=k/10*math.tau+.2;put(out,'core-support-pillar',gpol(16.2,a),-a)
for ring,seg in CORE_TERMINALS:
    a=(seg+.5)*SEG_ARC;r=sum(CORE_RINGS[ring])/2;put(out,'core-kill-switch',gpol(r,a),-a+math.pi/2)
put(out,'operator-amber',gpol(15.8,math.pi/4),-math.pi/4,clip='run')
for r,a in [(8.8,2.2),(12.2,4.1)]:put(out,'warden',gpol(r,a));put(out,'vision-cone',gpol(r,a,.05))

out=scene('foundry-floor','Crucible suspended by foundry crane over casting trough, furnace, maintenance operator and Weaver.')
# Ladle hangs at overhead-gantry anchors.hook (0,0,3.3). Its pour_lip at full tilt is (0,-.904,-1.669), so the
# lip is at world (2,2.096,1.631); molten-stream lip is (0,0,1.25) above its origin, trough surface z .333.
room(out,0,0);put(out,'overhead-gantry',(2,3,0));put(out,'foundry-crucible',(2,3,3.3),clip='pour');put(out,'casting-trough',(2,2.5,0));put(out,'molten-stream',(2,2.096,.333),s=(1,1,(1.631-.333)/1.25));put(out,'tall-smokestack',(-1.6,5.6,0),s=(.8,.8,.8));put(out,'foundry-furnace',(-.3,4.8,0));put(out,'control-console',(-.5,.8,0));put(out,'operator-amber',(-.5,-.2,0),math.pi,clip='repair');put(out,'weaver',(4.2,-.3,0));put(out,'overhead-duct',(3.6,5.1,3.2));put(out,'water-tile',(2,2,-3.8),s=(1.4,1.4,1))

# Sector-map islands (03). Each miniature stands on sea-rock bases at the sea line; 'sector-map' composes all four
# at the concept layout (plant top-left, cold storage top-right, foundry bottom-left, core bottom-right).
SECTOR_SEA=-3.8
for kind in ['plant','cold-storage','foundry','core']:
    out=scene('sector-'+kind,'Sector-selection miniature on a sea-rock island: '+kind)
    if kind!='core':room(out,0,0,2,2)
    if kind=='plant':
        put(out,'turbine-generator',(1,1,0));put(out,'electrical-cabinet',(3.5,4,0));put(out,'overhead-duct',(2,3,2.5),math.pi/2)
        for x in [0,1.8]:put(out,'chimney',(x,4.6,0),s=(.7,.7,.7))
    elif kind=='cold-storage':
        for x,y in [(0,0),(2.2,.2),(.2,2.4)]:put(out,'frost-silo',(x,y,0),s=(.8,.8,.8))
        put(out,'coolant-tank',(2.4,2.6,0));put(out,'refrigeration-unit',(3.6,4,0));put(out,'cold-storage-door',(4,5.8,0));put(out,'supply-crate',(5,-.8,0))
    elif kind=='foundry':
        put(out,'foundry-furnace',(.5,4,0));put(out,'overhead-gantry',(2,1,0),s=(.8,.8,.8));put(out,'foundry-crucible',(2,1,3.3*.8),s=(.8,.8,.8));put(out,'casting-trough',(2,0,0));put(out,'tall-smokestack',(-.6,4.8,0),s=(.9,.9,.9))
    else:
        put(out,'overseer-housing',(2,2,SECTOR_SEA+1.8),s=(.42,.42,.42))
        for p,k in [((-1.5,4.5),.45),((5.2,4.8),.4),((-1,-1.5),.32),((5.5,-.5),.36)]:put(out,'cliff-stack',(p[0],p[1],SECTOR_SEA),k*3,s=(k,k,k))
    for p,r in ([((2,2,SECTOR_SEA),0),((0,5,SECTOR_SEA),1.4),((5,0,SECTOR_SEA),2.6)] if kind!='core' else [((2,2,SECTOR_SEA),0),((-1,1,SECTOR_SEA),1),((4.5,3.5,SECTOR_SEA),2)]):put(out,'sea-rock',p,r)
    put(out,'water-tile',(2,2,SECTOR_SEA),s=(1.3,1.3,1))
out=scene('sector-map','All four sector islands at the 03 layout, joined by walkway spokes over the sea.')
for kind,(ox,oy) in {'plant':(-14,14),'cold-storage':(14,14),'foundry':(-14,-14),'core':(14,-14)}.items():
    for inst in SCENES['sector-'+kind]['instances']:
        if inst['asset']=='water-tile':continue
        q=dict(inst);q['position']=[inst['position'][0]+ox,inst['position'][1]+oy,inst['position'][2]];out.append(q)
for p,r in [((2,16,0),0),((-12,2,0),math.pi/2),((2,-12,SECTOR_SEA+1.2),0)]:put(out,'grated-bridge',p,r,s=(3,1,1))
put(out,'water-tile',(2,2,SECTOR_SEA),s=(6,6,1))

out=scene('loadout-stage','Character plinth, background wall, equipment cases and warm practical lamp.')
put(out,'operator-plinth');put(out,'operator-amber',(0,0,.42),-.25);put(out,'bulkhead-wall',(0,1.5,0));put(out,'wall-lamp',(-.8,1.3,1.9));put(out,'supply-crate',(-1.3,.6,0));put(out,'supply-crate',(1.3,.6,0));put(out,'pipe-straight',(1.4,1.1,1.3),math.pi/2,s=(1,1,1))

out=scene('results-vignette','Exhausted operator sitting on supply case beside a spare breathing canister.')
put(out,'walkway-floor');put(out,'bulkhead-wall',(0,1.5,0));put(out,'wall-lamp',(-.9,1.3,1.9));put(out,'supply-crate');put(out,'operator-amber',(0,-.25,.4),clip='sit-exhausted');put(out,'breathing-canister',(-.9,-.5,0));put(out,'guardrail',(2,0,0),math.pi/2)

out=scene('calibration-frame','Physical microphone and rotary control framing a clear central UI region.')
put(out,'wall-microphone',(-2,0,.7),s=(1.8,1.8,1.8));put(out,'rotary-control',(2,0,.7),s=(1.8,1.8,1.8));put(out,'bulkhead-wall',(0,.3,0),s=(1.5,1,1.1));put(out,'pipe-straight',(2.7,-.1,1.8),math.pi/2)

out=scene('locker-closeup','Warden outside physical locker slits, with warm corridor lamp behind it.')
put(out,'locker-interior-frame',(0,-1,0));put(out,'warden',(0,.2,-.5),.12,clip='scan');put(out,'bulkhead-wall',(0,1.7,0));put(out,'wall-lamp',(.65,1.5,1.3))

out=scene('overseer-map','Seven-room tactical facility composition with reusable door and wall assets.')
for i,(x,y) in enumerate([(0,0),(8,0),(16,0),(0,8),(8,8),(16,8),(8,16)]):
    room(out,x,y,1,1);put(out,'electrical-cabinet' if i%2 else 'coolant-tank',(x+.5,y+.5,0))
    if i<3:put(out,'operator-amber',(x-1,y-.5,0))
    if i<6:put(out,'sliding-bulkhead',(x+3,y,0),math.pi/2)
for x,y,r in [(4,0,math.pi/2),(12,0,math.pi/2),(4,8,math.pi/2),(12,8,math.pi/2),(0,4,0),(8,4,0),(16,4,0),(8,12,0)]:put(out,'grated-bridge',(x,y,0),r)
for x,y,r in [(0.6,-.4,.3),(16.4,8.6,-.5)]:put(out,'pallet',(x,y,0),r);put(out,'supply-crate',(x,y,.15),r)
put(out,'forklift',(1.2,.9,0),2.3);put(out,'forklift',(15.2,9.4,0),-1.1)
put(out,'frost-silo',(16.6,.6,0),s=(.6,.6,.6))
for x in [-2.2,18.2]:put(out,'outlet-pipe',(x,4,-3.8),math.pi/2 if x<0 else -math.pi/2);put(out,'waterfall',(x-.95 if x<0 else x+.95,4,-3.8),math.pi/2 if x<0 else -math.pi/2)
put(out,'water-tile',(8,8,-3.8),s=(3.2,3.2,1))

for name,spec in SCENES.items():(ROOT/'scenes'/f'{name}.json').write_text(json.dumps(spec,indent=2)+'\n')
if __name__=='__main__':print('Wrote',len(SCENES),'scene recipes')
