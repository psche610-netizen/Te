# V4 assets — first environment pass

## Pipeline decision

Author models, UVs, painted textures and lighting references in **Blender**. Export GLB for **Three.js** gameplay. These serve different purposes: Blender supplies asset authoring and offline rendering; Three.js supplies the interactive browser renderer. Three.js recommends glTF for runtime delivery: https://threejs.org/manual/pages/loading-3d-models.html

A Blender render does not transfer its whole appearance automatically. Lighting, exposure, shadows, ambient occlusion and any custom shader effects must be reproduced or baked for the browser. Matching v4 requires reviewing the assembled scene at its actual game camera.

## Deliverables

- `source/shutdown-v4-environment.blend`: editable component meshes, packed texture, materials; asset layout in metres.
- `source/build_assets.py`: reproducible Blender 5.0.1 authoring/export/render script. Run with Blender's Python (`blender --background --python source/build_assets.py`) or a Python environment with `bpy==5.0.1`.
- `textures/painted-enamel-atlas.png`: base-color atlas generated with the built-in image-generation tool using v4/05-shift.png as the style reference. Prompt in `PROMPTS.md`.
- `models/*.glb`: 11 standalone exports with textures embedded.
- `manifest.json`: file names, descriptions, triangle counts and part names.
- `renders/turbine-generator-blender.png`: offline hero render.
- `renders/environment-kit-blender.png`: offline kit overview.
- `renders/turbine-generator-threejs.png`: actual browser renderer capture.
- `preview.html`: orbitable Three.js review with all assets and a sliding-door control.

Serve the shutdown-kit directory over HTTP and open `/assets/v4/preview.html`. It uses the existing game's installed Three.js package; run the game's dependency installation if `game/node_modules` is missing.

## Asset conventions

Blender source is Z up, front is -Y. GLB is Y up, metres. Asset roots are ground-level local origins. The sliding bulkhead meshes named `__panel__` move together along local +X; its frame stays fixed. The review viewer demonstrates this. No collision meshes, character rigs or animation clips are included yet.

The exports combine geometry by material and mechanical part. Each standalone GLB embeds the atlas for portability. A deployed game should consolidate shared textures and measure performance before shipping; the standalone collection duplicates texture bytes.

## Visual review and remaining work

This is a first asset pass, **not an exact v4 match or a complete game asset library**. Compared with v4/05-shift.png, the hero is softer and cleaner, the wear needs placement along seams and edges, and the turbine silhouette/console arrangement still needs refinement. The offline kit image uses review lighting, not the concept's dark environment lighting. The wall lamp is cropped at the top of the hero review image.

Before integration: match silhouettes and proportions against the reference; refine UVs and wear placement; assemble the reference camera scene; match hard amber lighting, cool shadows and contact occlusion; then compare the browser capture again. Remaining asset categories include the operator, Warden, rigs and movement animations, water and waterfall effects, full room architecture, sector-specific machinery, equipment, and screen/UI artwork. Do not treat the concept's proposed modes as implemented features.

The game code was not changed during this asset pass.
