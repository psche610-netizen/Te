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
'wrench':'<path d="M38 5q-16 3-12 18L8 43q-8 11 4 15l22-24q18 2 23-15l-12 6-9-8z"/>'
}
for name,body in icons.items():(OUT/'icons'/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="currentColor" color="#ded7bc"><title>{name}</title>{body}</svg>\n')
(OUT/'icons.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg">'+''.join(f'<symbol id="{n}" viewBox="0 0 64 64">{b}</symbol>' for n,b in icons.items())+'</svg>')
# UI chrome is vector-based so labels remain separate, editable, and localizable.
chrome={
'button-amber':'<rect x="1" y="1" width="318" height="78" rx="4" fill="#dea33a" stroke="#e4bd69"/>',
'button-outline':'<rect x="1" y="1" width="318" height="78" rx="4" fill="#142127" fill-opacity=".82" stroke="#ded7bc" stroke-width="2"/>',
'panel':'<rect x="1" y="1" width="318" height="78" rx="3" fill="#101c20" fill-opacity=".94" stroke="#ded7bc"/>',
'panel-danger':'<rect x="1" y="1" width="318" height="78" rx="3" fill="#281c18" fill-opacity=".92" stroke="#d84726" stroke-width="2"/>',
'meter-frame':'<rect x="1" y="1" width="318" height="78" rx="3" fill="#101c20" stroke="#ded7bc"/>'+''.join(f'<rect x="{12+i*18.5}" y="14" width="13" height="51" rx="1" fill="'+('#dea33a' if i<9 else '#142127')+'" stroke="#ded7bc" stroke-width=".6"/>' for i in range(16)),
}
for name,body in chrome.items():(OUT/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80">{body}</svg>')
for name,body in {'joystick-base':'<circle cx="100" cy="100" r="97" fill="#142127" fill-opacity=".75" stroke="#ded7bc" stroke-width="2"/>','joystick-knob':'<circle cx="100" cy="100" r="49" fill="#ded7bc" fill-opacity=".72" stroke="#eee8d4" stroke-width="2"/>','touch-ring':'<circle cx="100" cy="100" r="97" fill="#142127" fill-opacity=".86" stroke="#ded7bc" stroke-width="2"/>'}.items():(OUT/f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">{body}</svg>')
(OUT/'tokens.json').write_text(json.dumps({'colors':{'petrol':'#23474c','teal':'#507c79','ivory':'#ded7bc','amber':'#dea33a','indigo':'#142127','danger':'#d84726'},'fonts':{'display':'Bebas Neue','instrument':'Share Tech Mono'},'icons':list(icons)},indent=2))
(OUT/'gallery.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>V4 UI assets</title><link rel="stylesheet" href="v4.css"><main><h1>SHUTDOWN</h1><p>V4 UI asset library</p><div class="icon-grid">'+''.join(f'<figure><img src="icons/{n}.svg" alt=""><figcaption>{n}</figcaption></figure>' for n in icons)+'</div><h2>CONTROLS</h2><button class="primary">DEPLOY</button> <button>LOADOUT</button><p><img src="meter-frame.svg" width="320" alt="Noise meter"></p><div class="perk"><img src="icons/soft-step.svg" alt=""><h2>SOFT STEP</h2></div></main></html>')
print('UI:',len(icons),'icons,',len(chrome)+3,'chrome assets')
