"""Native SVG pictograms and reusable UI assets: crisp at any display scale."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'ui'
icons={
'microphone':'<rect x="25" y="7" width="14" height="31" rx="7"/><path d="M18 29v4a14 14 0 0 0 28 0v-4M32 47v10M24 57h16" fill="none" stroke="currentColor" stroke-width="4"/><path d="M29 16h6m-6 7h6" stroke="#142127" stroke-width="3"/>',
'run':'<circle cx="39" cy="10" r="6"/><path d="m31 22 10 10 10 2M32 22l-9 7-7-1m18-5-7 17-14 14m14-14 13 4 5 12" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="square"/>',
'hide':'<circle cx="32" cy="14" r="6"/><path d="m29 25-8 11 13 5 10 11H19m12-24 13 9 8-3" fill="none" stroke="currentColor" stroke-width="6"/>',
'hack':'<rect x="12" y="10" width="40" height="31" rx="2" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 48h48l5 8H3z"/><path d="m28 20-6 6 6 6m8-12 6 6-6 6" fill="none" stroke="currentColor" stroke-width="3"/>',
'hand':'<path d="M18 37V20q0-5 5-3V10q0-6 5-3v19h2V7q0-6 5-2v21h2V10q0-5 5-2v20h2V17q0-5 5-2v22q0 9-9 16H25L13 40q-5-7 0-9z"/>',
'soft-step':'<path d="m20 8 20 6-5 23 16 9v7H12v-8l9-4 4-20-9-4z"/><path d="M5 58h53M5 42h8M3 49h7" fill="none" stroke="currentColor" stroke-width="3"/>',
'quick-hands':'<path d="M22 40V24q0-5 5-3V13q0-5 5-2v17h2V9q0-5 5-2v22h2V13q0-4 5-2v20h2V22q0-4 5-2v19q-1 8-10 13H29L17 42q-4-6 1-7z"/><path d="m6 37 9-9M5 48l10-10m-2 20 10-10" stroke="currentColor" stroke-width="4"/>',
'second-wind':'<path d="M32 56 8 32C-6 10 21 0 32 18 44 0 71 11 56 32z"/><path d="M27 24h10v8h8v10h-8v8H27v-8h-8V32h8z" fill="#142127"/>',
'lock':'<rect x="14" y="27" width="36" height="31" rx="2"/><path d="M22 28V17a10 10 0 0 1 20 0v11" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="32" cy="39" r="4" fill="#142127"/><path d="M30 39h4v10h-4z" fill="#142127"/>',
'radio':'<rect x="17" y="25" width="29" height="32" rx="3"/><path d="m23 26 5-21" stroke="currentColor" stroke-width="4"/><path d="M23 33h16M23 42h5m6 0h5m-16 7h5m6 0h5" stroke="#142127" stroke-width="3"/><path d="M48 17q9 8 0 16m6-22q15 14 0 28" fill="none" stroke="currentColor" stroke-width="3"/>',
'wall':'<path d="m8 24 33-18 16 9v27L24 60 8 51zM8 24l16 9 33-18M24 33v27M18 19l17 9m-7-15 17 9M16 28v27m20-28v27m11-33v27" fill="none" stroke="currentColor" stroke-width="3"/>',
'factory':'<path d="M7 56V28l14-9v12l14-10V10h9v22l13-8v32z"/><path d="M15 41h8v8h-8m17-8h8v8h-8m16-8h5v8h-5" fill="#142127"/>',
'weaver':'<rect x="21" y="19" width="24" height="21" rx="3"/><path d="m23 22-12-9-7 12m17 3L8 32 4 49m19-12-9 11v12m29-38 10-9 7 12M44 28l12 4 4 17M42 37l9 11v12" stroke="currentColor" stroke-width="4" fill="none"/>',
'gear':'<path d="m27 4 10 0 2 8 6 3 8-3 5 9-6 6v8l6 6-5 9-8-3-6 3-2 10H27l-2-10-6-3-8 3-5-9 6-6v-8l-6-6 5-9 8 3 6-3z"/><circle cx="32" cy="32" r="11" fill="#142127"/>',
'moon':'<path d="M47 6A27 27 0 1 0 58 46 26 26 0 0 1 47 6z"/>',
'arrow':'<path d="m25 12 20 20-20 20" fill="none" stroke="currentColor" stroke-width="5"/>',
'back':'<path d="M51 32H11l17-18M11 32l17 18" fill="none" stroke="currentColor" stroke-width="4"/>',
'pause':'<path d="M17 10h10v44H17m20-44h10v44H37z"/>',
'play':'<path d="m20 9 32 23-32 23z"/>',
'close':'<path d="m14 14 36 36m0-36L14 50" fill="none" stroke="currentColor" stroke-width="4"/>',
'check':'<path d="m9 33 15 16 31-34" fill="none" stroke="currentColor" stroke-width="5"/>',
'generator':'<rect x="11" y="18" width="42" height="29" rx="10"/><path d="M3 29h9v8H3m49-8h9v8h-9M16 47h8v9h-8m24-9h8v9h-8"/><path d="m34 22-9 14h8l-3 8 11-15h-8z" fill="#142127"/>',
'eye':'<path d="M4 32q28-34 56 0-28 34-56 0z" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="32" cy="32" r="9"/>',
'scrap':'<path d="m9 18 23-9 23 9v29l-23 9-23-9zM9 18l23 10 23-10M32 28v28" fill="none" stroke="currentColor" stroke-width="4"/>',
'breath':'<path d="M28 18v32c-20 10-25-2-18-16l10-19q4-7 8 3zm8 0v32c20 10 25-2 18-16L44 15q-4-7-8 3z"/><path d="M32 5v21m-5 4 5-8 5 8" fill="none" stroke="currentColor" stroke-width="3"/>',
'crew':'<circle cx="32" cy="15" r="8"/><circle cx="12" cy="24" r="6"/><circle cx="52" cy="24" r="6"/><path d="M19 52V35q13-15 26 0v17zM2 53V39q8-12 15-2v16zm45 0V37q9-10 15 2v14z"/>',
'power':'<path d="M32 5v25M19 15a23 23 0 1 0 26 0" fill="none" stroke="currentColor" stroke-width="5"/>',
'route':'<path d="M10 52V33h20V12h24m-8-7 8 7-8 7" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="10" cy="53" r="6"/>',
'cold':'<path d="M32 5v54M9 18l46 28M9 46l46-28M24 10l8 8 8-8M24 54l8-8 8 8M9 27l12-2-3-11M46 50l-3-11 12-2M9 37l12 2-3 11M46 14l-3 11 12 2" fill="none" stroke="currentColor" stroke-width="3"/>',
'core':'<path d="M26 6h12v51H26z"/><ellipse cx="32" cy="34" rx="27" ry="12" fill="none" stroke="currentColor" stroke-width="3"/><ellipse cx="32" cy="34" rx="18" ry="8" fill="none" stroke="currentColor" stroke-width="3"/>',
'shield':'<path d="m32 5 23 9v19q-3 17-23 27C12 50 9 43 9 33V14z" fill="none" stroke="currentColor" stroke-width="4"/><path d="m21 32 8 8 15-17" fill="none" stroke="currentColor" stroke-width="4"/>',
'wrench':'<path d="M38 5q-16 3-12 18L8 43q-8 11 4 15l22-24q18 2 23-15l-12 6-9-8z"/>',
# Phase 20: every glyph the shell uses (lucide stand-ins in loadout / sector-map / settings / HUD) now has a V4 icon.
'steady':'<circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" stroke-width="4"/><path d="M32 3v17m0 24v17M3 32h17m24 0h17" stroke="currentColor" stroke-width="4"/><circle cx="32" cy="32" r="4"/>',
'deep-pockets':'<path d="M22 14q0-8 10-8t10 8v4H22z" fill="none" stroke="currentColor" stroke-width="4"/><rect x="12" y="17" width="40" height="41" rx="6"/><path d="M20 36h24v14H20z" fill="#142127"/><path d="M28 36v5h8v-5" fill="none" stroke="currentColor" stroke-width="3"/>',
'ghost':'<path d="M12 58V28a20 20 0 0 1 40 0v30l-7-6-6 6-7-6-7 6-6-6z"/><path d="M22 26h6v8h-6zm14 0h6v8h-6z" fill="#142127"/>',
'override':'<path d="M50 32A18 18 0 1 1 40 16" fill="none" stroke="currentColor" stroke-width="5"/><path d="m34 6 14 9-13 9z"/><path d="m34 24-8 11h6l-3 9 9-12h-6z"/>',
'restart':'<path d="M14 32a18 18 0 1 0 6-13" fill="none" stroke="currentColor" stroke-width="5"/><path d="M10 8v17h17z"/>',
'token':'<path d="m32 4 24 14v28L32 60 8 46V18z"/><path d="m32 16 13 8v16l-13 8-13-8V24z" fill="#142127"/><path d="m32 23 7 4v10l-7 4-7-4V27z"/>',
'calendar':'<rect x="8" y="12" width="48" height="45" rx="3" fill="none" stroke="currentColor" stroke-width="4"/><path d="M8 13h48v11H8zM18 5v12m28-12v12" stroke="currentColor" stroke-width="4"/><path d="M32 30v11l7 6" fill="none" stroke="currentColor" stroke-width="4"/>',
'sound':'<path d="M6 24h12l16-14v44L18 40H6z"/><path d="M42 22q6 10 0 20m7-27q12 17 0 34" fill="none" stroke="currentColor" stroke-width="4"/>',
'sound-off':'<path d="M6 24h12l16-14v44L18 40H6z"/><path d="m42 22 16 20m0-20L42 42" fill="none" stroke="currentColor" stroke-width="4"/>',
'haptics':'<rect x="21" y="6" width="22" height="52" rx="4"/><rect x="25" y="13" width="14" height="33" fill="#142127"/><path d="M13 20 8 26l5 6-5 6 5 6m38-24 5 6-5 6 5 6-5 6" fill="none" stroke="currentColor" stroke-width="3"/>',
'fullscreen':'<path d="M6 22V6h16M42 6h16v16M58 42v16H42M22 58H6V42" fill="none" stroke="currentColor" stroke-width="5"/><rect x="20" y="20" width="24" height="24"/>',
'skin':'<path d="m22 5-14 9 5 12 6-3v35h26V23l6 3 5-12-14-9q-4 7-10 7t-10-7z"/><path d="M29 24h6v34h-6z" fill="#142127"/><path d="M24 36h16v4H24z"/>',
'warning':'<path d="M32 5 61 57H3z"/><path d="M29 22h6l-1 20h-4zm0 24h6v6h-6z" fill="#142127"/>',
'timer':'<circle cx="32" cy="37" r="22" fill="none" stroke="currentColor" stroke-width="4"/><path d="M26 5h12M32 5v10m18 0 6 6" stroke="currentColor" stroke-width="4"/><path d="M32 37V22a15 15 0 0 1 13 22z"/>',
'exit':'<path d="M28 6H8v52h20" fill="none" stroke="currentColor" stroke-width="5"/><path d="M22 32h28m-10-12 12 12-12 12" fill="none" stroke="currentColor" stroke-width="5"/>',
'map':'<path d="m4 12 18-6 20 6 18-6v46l-18 6-20-6-18 6z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M22 6v46m20-40v46" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="30" r="5"/>',
'trash':'<path d="M8 13h48M24 13V6h16v7" fill="none" stroke="currentColor" stroke-width="4"/><path d="M13 18h38l-4 40H17z"/><path d="M25 26v24m14-24v24" stroke="#142127" stroke-width="4"/>',
'noise':'<path d="M4 32h7l5-14 7 30 7-38 7 42 7-30 5 16 5-6h6" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="bevel"/>',
'info':'<circle cx="32" cy="32" r="27"/><path d="M29 14h6v6h-6zm0 12h6v24h-6z" fill="#142127"/>'
}
# Game PerkId → icon (replaces the lucide ICON map in components/shell/loadout.tsx in Part B).
PERK_ICONS={'softStep':'soft-step','quickHands':'quick-hands','secondWind':'second-wind','awareness':'eye','steady':'steady','deepPockets':'deep-pockets','ghost':'ghost','decoy':'radio','override':'override'}
# Sector id → icon (sector-map cards, facility map legend).
SECTOR_ICONS={'plant':'factory','cold-storage':'cold','foundry':'weaver','core':'core'}
# lucide-react stand-in currently imported by game/components → V4 icon (Part B swaps every import).
LUCIDE_ICONS={'Backpack':'deep-pockets','CalendarClock':'calendar','Check':'check','Crosshair':'steady','Eye':'eye','Footprints':'soft-step','Ghost':'ghost','Hand':'quick-hands','HeartPulse':'second-wind','Hexagon':'token','Lock':'lock','Radio':'radio','RotateCcw':'override'}
assert set(PERK_ICONS.values())|set(SECTOR_ICONS.values())|set(LUCIDE_ICONS.values())<=set(icons)
for name,body in icons.items():(OUT/'icons'/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="currentColor" color="#ded7bc"><title>{name}</title>{body}</svg>\n')
(OUT/'icons.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg">'+''.join(f'<symbol id="{n}" viewBox="0 0 64 64">{b}</symbol>' for n,b in icons.items())+'</svg>')
# UI chrome is vector-based so labels remain separate, editable, and localizable.
chrome={
'button-amber':'<rect x="1" y="1" width="318" height="78" rx="4" fill="#dea33a" stroke="#e4bd69"/>',
'button-outline':'<rect x="1" y="1" width="318" height="78" rx="4" fill="#142127" fill-opacity=".82" stroke="#ded7bc" stroke-width="2"/>',
'panel':'<rect x="1" y="1" width="318" height="78" rx="3" fill="#101c20" fill-opacity=".94" stroke="#ded7bc"/>',
'panel-danger':'<rect x="1" y="1" width="318" height="78" rx="3" fill="#281c18" fill-opacity=".92" stroke="#d84726" stroke-width="2"/>',
'meter-frame':'<rect x="1" y="1" width="318" height="78" rx="3" fill="#101c20" stroke="#ded7bc"/>'+''.join(f'<rect x="{12+i*18.5}" y="14" width="13" height="51" rx="1" fill="'+('#dea33a' if i<9 else '#142127')+'" stroke="#ded7bc" stroke-width=".6"/>' for i in range(16)),
'meter-frame-danger':'<rect x="1" y="1" width="318" height="78" rx="3" fill="#281c18" stroke="#d84726" stroke-width="2"/>'+''.join(f'<rect x="{12+i*18.5}" y="14" width="13" height="51" rx="1" fill="'+('#dea33a' if i<11 else '#d84726' if i<14 else '#142127')+'" stroke="#ded7bc" stroke-width=".6"/>' for i in range(16)),
'button-danger':'<rect x="1" y="1" width="318" height="78" rx="4" fill="#281c18" stroke="#d84726" stroke-width="2"/>',
'button-disabled':'<rect x="1" y="1" width="318" height="78" rx="4" fill="#142127" fill-opacity=".6" stroke="#62716c" stroke-width="2" stroke-dasharray="8 6"/>',
'tab':'<path d="M1 79V9l8-8h302l8 8v70" fill="#142127" fill-opacity=".7" stroke="#62716c" stroke-width="2"/>',
'tab-active':'<path d="M1 79V9l8-8h302l8 8v70" fill="#23474c" stroke="#ded7bc" stroke-width="2"/><rect x="1" y="74" width="318" height="5" fill="#dea33a"/>',
'toggle-on':'<rect x="1" y="1" width="318" height="78" rx="3" fill="#142127" stroke="#ded7bc" stroke-width="2"/><rect x="162" y="8" width="150" height="64" rx="2" fill="#dea33a"/>',
'toggle-off':'<rect x="1" y="1" width="318" height="78" rx="3" fill="#142127" stroke="#62716c" stroke-width="2"/><rect x="8" y="8" width="150" height="64" rx="2" fill="#62716c"/>',
'hazard-bar':'<defs><pattern id="hz" width="40" height="80" patternUnits="userSpaceOnUse" patternTransform="skewX(-35)"><rect width="20" height="80" fill="#dea33a"/><rect x="20" width="20" height="80" fill="#142127"/></pattern></defs><rect width="320" height="80" fill="url(#hz)"/>',
}
for name,body in chrome.items():(OUT/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80">{body}</svg>')
# Card chrome (perk / skin / sector cards on screens 02, 03, 04): 240 x 300.
cards={
'perk-card':'<rect x="1" y="1" width="238" height="298" rx="3" fill="#101c20" fill-opacity=".94" stroke="#ded7bc" stroke-width="2"/><path d="M1 44h238" stroke="#62716c"/>',
'perk-card-equipped':'<rect x="1" y="1" width="238" height="298" rx="3" fill="#23474c" stroke="#dea33a" stroke-width="3"/><path d="M1 44h238" stroke="#dea33a"/><path d="M200 1h39v39z" fill="#dea33a"/>',
'perk-card-locked':'<rect x="1" y="1" width="238" height="298" rx="3" fill="#142127" fill-opacity=".8" stroke="#62716c" stroke-width="2" stroke-dasharray="10 6"/><path d="M1 44h238" stroke="#62716c"/>',
'sector-card':'<rect x="1" y="1" width="238" height="298" rx="3" fill="#101c20" fill-opacity=".9" stroke="#ded7bc" stroke-width="2"/><rect x="1" y="250" width="238" height="49" fill="#23474c"/>',
'sector-card-locked':'<rect x="1" y="1" width="238" height="298" rx="3" fill="#142127" fill-opacity=".85" stroke="#62716c" stroke-width="2"/><rect x="1" y="250" width="238" height="49" fill="#142127"/><path d="M1 250h238" stroke="#62716c"/>',
}
for name,body in cards.items():(OUT/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300">{body}</svg>')
round_ui={'joystick-base':'<circle cx="100" cy="100" r="97" fill="#142127" fill-opacity=".75" stroke="#ded7bc" stroke-width="2"/>','joystick-knob':'<circle cx="100" cy="100" r="49" fill="#ded7bc" fill-opacity=".72" stroke="#eee8d4" stroke-width="2"/>','touch-ring':'<circle cx="100" cy="100" r="97" fill="#142127" fill-opacity=".86" stroke="#ded7bc" stroke-width="2"/>',
'touch-ring-active':'<circle cx="100" cy="100" r="97" fill="#dea33a" fill-opacity=".9" stroke="#e4bd69" stroke-width="3"/>',
'touch-ring-disabled':'<circle cx="100" cy="100" r="97" fill="#142127" fill-opacity=".5" stroke="#62716c" stroke-width="2" stroke-dasharray="10 8"/>',
'hold-ring':'<circle cx="100" cy="100" r="92" fill="none" stroke="#142127" stroke-width="10"/><circle cx="100" cy="100" r="92" fill="none" stroke="#dea33a" stroke-width="10" stroke-dasharray="578" stroke-dashoffset="0" transform="rotate(-90 100 100)"/>'}
for name,body in round_ui.items():(OUT/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">{body}</svg>')
(OUT/'tokens.json').write_text(json.dumps({'colors':{'petrol':'#23474c','teal':'#507c79','ivory':'#ded7bc','amber':'#dea33a','indigo':'#142127','danger':'#d84726','muted':'#62716c'},'fonts':{'display':'Bebas Neue','instrument':'Share Tech Mono'},'icons':list(icons),'perkIcons':PERK_ICONS,'sectorIcons':SECTOR_ICONS,'lucideIcons':LUCIDE_ICONS,'chrome':{'wide_320x80':list(chrome),'card_240x300':list(cards),'round_200':list(round_ui)},'notes':{'hold-ring':'animate stroke-dashoffset 578 → 0 for hold progress'}},indent=2))
(OUT/'gallery.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>V4 UI assets</title><link rel="stylesheet" href="v4.css"><main><h1>SHUTDOWN</h1><p>V4 UI asset library</p><div class="icon-grid">'+''.join(f'<figure><img src="icons/{n}.svg" alt=""><figcaption>{n}</figcaption></figure>' for n in icons)+'</div><h2>CONTROLS</h2><button class="primary">DEPLOY</button> <button>LOADOUT</button><div class="icon-grid">'+''.join(f'<figure><img src="{n}.svg" alt="" style="width:100%;height:auto"><figcaption>{n}</figcaption></figure>' for n in [*chrome,*cards,*round_ui])+'</div><div class="perk"><img src="icons/soft-step.svg" alt=""><h2>SOFT STEP</h2></div></main></html>')
print('UI:',len(icons),'icons,',len(chrome)+len(cards)+len(round_ui),'chrome assets')
