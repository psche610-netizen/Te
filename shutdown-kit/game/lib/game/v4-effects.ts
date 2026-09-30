import { AdditiveBlending, Color, DoubleSide, FrontSide, type Material, NormalBlending, ShaderMaterial, Vector2 } from 'three'

/**
 * Runtime shaders for the kit's effect materials (manifest `effects`, reference `assets/v4/effects/v4-effects.js`).
 * All share one time uniform (`tickAssetEffects` in `assets.ts`). Every vertex shader applies
 * `instanceMatrix` when instanced, so the same material works on `InstancedAsset` and plain meshes.
 */

export const effectTime = { value: 0 }

const INSTANCE = /* glsl */ `
vec4 instanced(vec3 p) {
  vec4 v = vec4(p, 1.0);
#ifdef USE_INSTANCING
  v = instanceMatrix * v;
#endif
  return v;
}`

const OUTPUT = /* glsl */ `
#include <tonemapping_fragment>
#include <colorspace_fragment>`

/** effects.water: matte, opaque, no reflections; ripples in world xz so neighbouring tiles line up. */
function waterMaterial() {
  return new ShaderMaterial({
    name: 'water',
    uniforms: {
      time: effectTime,
      deep: { value: new Color('#142127') },
      mid: { value: new Color('#23474C') },
      crest: { value: new Color('#507C79') },
    },
    vertexShader: /* glsl */ `
      uniform float time;
      varying vec2 p;
      ${INSTANCE}
      void main() {
        vec4 w = modelMatrix * instanced(position);
        p = w.xz;
        w.y += sin(p.x * 3.0 + time) * cos(p.y * 2.0 - time * 0.7) * 0.018;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 deep, mid, crest;
      varying vec2 p;
      void main() {
        float w = sin(p.x * 7.0 + sin(p.y * 3.0 + time) * 1.8 + time) * sin(p.y * 8.0 - time * 0.8);
        float line = smoothstep(0.72, 0.91, w);
        float broad = 0.5 + 0.5 * sin(p.x * 0.8 + p.y * 1.4 + time * 0.3);
        vec3 base = mix(deep, mid, broad * 0.35);
        gl_FragColor = vec4(mix(base, crest, line * 0.58 + broad * 0.07), 1.0);
        ${OUTPUT}
      }`,
  })
}

/** effects["fall-water"] / effects.foam: UV v scrolls down the fall, foam breaks up into streaks. */
function fallMaterial(foam: boolean) {
  return new ShaderMaterial({
    name: foam ? 'foam' : 'fall-water',
    uniforms: {
      time: effectTime,
      base: { value: new Color(foam ? '#DED7BC' : '#23474C') },
      streak: { value: new Color(foam ? '#DED7BC' : '#507C79') },
    },
    transparent: foam,
    depthWrite: !foam,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      ${INSTANCE}
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * instanced(position);
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 base, streak;
      varying vec2 vUv;
      void main() {
        float v = vUv.y - time * ${foam ? '2.2' : '1.6'};
        float s = 0.5 + 0.5 * sin(vUv.x * ${foam ? '40.0' : '57.0'} + sin(v * 3.0) * 2.0) * sin(v * 9.0);
        ${
          foam
            ? 'float a = 0.85 * smoothstep(0.35, 0.7, s); if (a < 0.02) discard; gl_FragColor = vec4(base, a);'
            : 'gl_FragColor = vec4(mix(base, streak, smoothstep(0.55, 0.9, s) * 0.45), 1.0);'
        }
        ${OUTPUT}
      }`,
  })
}

/**
 * effects["foam-splash"]: rings pulse 1.2 Hz and scale 1..1.12 about the landing point, alpha fades
 * toward the outer edge. `center` = waterfall `fall_landing_blender` in glTF xz (Blender y → -z).
 */
function splashMaterial(center: [number, number]) {
  return new ShaderMaterial({
    name: 'foam-splash',
    uniforms: { time: effectTime, center: { value: new Vector2(...center) }, base: { value: new Color('#DED7BC') } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      uniform float time;
      uniform vec2 center;
      varying vec2 vUv;
      ${INSTANCE}
      void main() {
        vUv = uv;
        float k = 1.0 + 0.12 * (0.5 + 0.5 * sin(time * 7.54));
        vec3 v = position;
        v.xz = center + (v.xz - center) * k;
        gl_Position = projectionMatrix * modelViewMatrix * instanced(v);
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 base;
      varying vec2 vUv;
      void main() {
        float a = 0.7 * (1.0 - vUv.y) * (0.75 + 0.25 * sin(time * 7.54));
        gl_FragColor = vec4(base, a);
        ${OUTPUT}
      }`,
  })
}

/**
 * effects["molten-core"] (opaque) / effects["molten-glow"] (additive sheath). v runs down the pour.
 * The glow alpha is kept at 0.35 (spec 0.5) so it reads as a hot core, not bloom haze (section 2).
 */
function moltenMaterial(glow: boolean) {
  return new ShaderMaterial({
    name: glow ? 'molten-glow' : 'molten-core',
    uniforms: {
      time: effectTime,
      base: { value: new Color(glow ? '#FF4D08' : '#FF8C1F') },
      hot: { value: new Color(glow ? '#FF8C1F' : '#FFE0A0') },
    },
    transparent: glow,
    depthWrite: !glow,
    blending: glow ? AdditiveBlending : NormalBlending,
    side: glow ? DoubleSide : FrontSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      ${INSTANCE}
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * instanced(position);
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 base, hot;
      varying vec2 vUv;
      void main() {
        float v = vUv.y - time * ${glow ? '0.9' : '1.4'};
        float s = 0.5 + 0.5 * sin(vUv.x * 37.7 + sin(v * 2.0) * 1.5) * sin(v * 6.0);
        vec3 c = mix(base, hot, smoothstep(0.5, 0.9, s));
        ${glow ? 'gl_FragColor = vec4(c, 0.35 * (0.6 + 0.4 * s));' : 'gl_FragColor = vec4(c, 1.0);'}
        ${OUTPUT}
      }`,
  })
}

/** Landing point of the default waterfall (manifest `fall_landing_blender` [0,-0.7663,0]) in glTF xz. */
const FALL_LANDING: [number, number] = [0, 0.7663]

const FACTORIES: Record<string, () => Material> = {
  water: waterMaterial,
  'fall-water': () => fallMaterial(false),
  foam: () => fallMaterial(true),
  'foam-splash': () => splashMaterial(FALL_LANDING),
  'molten-core': () => moltenMaterial(false),
  'molten-glow': () => moltenMaterial(true),
}

const cache = new Map<string, Material>()

/** Shared shader material for a kit effect material name, or null if the name is a plain atlas material. */
export function effectMaterial(name: string): Material | null {
  const make = FACTORIES[name]
  if (!make) return null
  let m = cache.get(name)
  if (!m) cache.set(name, (m = make()))
  return m
}
