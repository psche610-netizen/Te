import { JUICE } from './config'
import { useGameStore } from './store'

/**
 * Synthesized SFX (Web Audio). No sample files. Unlocked on the first pointer / key press.
 * Everything routes through one master gain and honors `settings.sound`.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null

function unlock() {
  if (!ctx) {
    try {
      ctx = new AudioContext()
    } catch {
      return
    }
    master = ctx.createGain()
    master.gain.value = JUICE.volume.master
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('keydown', unlock)
}

const soundOn = () => useGameStore.getState().settings.sound

function audio() {
  if (!ctx || !master || ctx.state !== 'running' || !soundOn()) return null
  return ctx
}

function tone(
  a: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  endFreq = freq,
) {
  if (peak <= 0 || !master) return
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  osc.frequency.linearRampToValueAtTime(endFreq, start + dur)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + 0.02)
  gain.gain.linearRampToValueAtTime(0, start + dur)
  osc.connect(gain).connect(master)
  osc.start(start)
  osc.stop(start + dur + 0.05)
}

function noise(a: AudioContext) {
  if (!noiseBuffer) {
    const len = a.sampleRate
    noiseBuffer = a.createBuffer(1, len, a.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

/** Filtered white-noise hit with an exponential tail. */
function burst(
  a: AudioContext,
  start: number,
  dur: number,
  peak: number,
  freq: number,
  filter: BiquadFilterType = 'bandpass',
  q = 1,
) {
  if (peak <= 0 || !master) return
  const src = a.createBufferSource()
  src.buffer = noise(a)
  const f = a.createBiquadFilter()
  f.type = filter
  f.frequency.value = freq
  f.Q.value = q
  const g = a.createGain()
  g.gain.setValueAtTime(peak, start)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  src.connect(f).connect(g).connect(master)
  src.start(start, Math.random() * Math.max(0, 0.95 - dur), dur + 0.02)
}

const V = JUICE.volume

export type StepKind = 'walk' | 'run' | 'crouch'

export const sfx = {
  /** Two-tone facility klaxon, played at the start of a shift telegraph. */
  shiftWarning() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    for (let i = 0; i < 3; i++) {
      tone(a, 220, t + i * 0.5, 0.22, 'square', 0.05)
      tone(a, 165, t + i * 0.5 + 0.24, 0.22, 'square', 0.05)
    }
  },
  /** Wall slide grind + low slam when pieces lock into place. */
  wallSlam() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    burst(a, t, 0.55, 0.06, 320, 'lowpass', 0.7)
    tone(a, 90, t, 0.35, 'sawtooth', 0.08, 40)
    tone(a, 60, t, 0.5, 'sine', 0.15, 30)
  },
  footstep(kind: StepKind) {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    const peak = V.footstep * (kind === 'run' ? 1.6 : kind === 'crouch' ? 0.45 : 1)
    burst(a, t, kind === 'run' ? 0.07 : 0.05, peak, kind === 'run' ? 650 : 950, 'bandpass', 1.4)
    tone(a, 70, t, 0.05, 'sine', peak * 0.8, 50)
  },
  /** Hunter step: servo whine + mechanical tick. `level` 0..1 by distance. */
  servo(level: number) {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    const p = V.servo * level
    tone(a, 190, t, 0.09, 'square', p * 0.5, 130)
    tone(a, 95, t, 0.12, 'sawtooth', p * 0.6, 70)
    burst(a, t, 0.05, p * 0.8, 2400, 'bandpass', 4)
  },
  repair() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    tone(a, 440, t, 0.12, 'sine', 0.07)
    tone(a, 660, t + 0.12, 0.18, 'sine', 0.07)
  },
  failBuzz() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    tone(a, 110, t, 0.45, 'sawtooth', 0.09)
    tone(a, 116, t, 0.45, 'square', 0.05)
  },
  doorSlam() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    burst(a, t, 0.18, 0.1, 220, 'lowpass', 0.7)
    tone(a, 70, t, 0.2, 'sine', 0.1, 40)
  },
  /** Lub-dub. `intensity` 0..1. */
  heartbeat(intensity: number) {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    const p = V.heartbeat * (0.35 + 0.65 * intensity)
    tone(a, 64, t, 0.11, 'triangle', p, 40)
    tone(a, 58, t + 0.17, 0.1, 'triangle', p * 0.7, 38)
  },
  caught() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    burst(a, t, 0.5, 0.25, 300, 'lowpass', 0.8)
    tone(a, 70, t, 0.8, 'sawtooth', 0.12, 30)
    tone(a, 220, t, 0.4, 'square', 0.06, 55)
  },
  secondWind() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    burst(a, t, 0.25, 0.15, 260, 'lowpass', 0.8)
    tone(a, 520, t, 0.3, 'sine', 0.06, 260)
  },
  gatesPowered() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    for (let i = 0; i < 2; i++) {
      tone(a, 330, t + i * 0.4, 0.18, 'square', 0.04)
      tone(a, 440, t + i * 0.4 + 0.2, 0.18, 'square', 0.04)
    }
  },
  escape() {
    const a = audio()
    if (!a) return
    const t = a.currentTime
    tone(a, 262, t, 0.3, 'sine', 0.05)
    tone(a, 330, t + 0.25, 0.3, 'sine', 0.05)
    tone(a, 392, t + 0.5, 0.5, 'sine', 0.05)
  },
}

interface DroneNodes {
  gain: GainNode
  filter: BiquadFilterNode
  oscs: OscillatorNode[]
}

let droneNodes: DroneNodes | null = null

function buildDrone(a: AudioContext, out: AudioNode): DroneNodes {
  const D = JUICE.drone
  const gain = a.createGain()
  gain.gain.value = 0
  const filter = a.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = D.filter
  filter.Q.value = 0.8
  const lfo = a.createOscillator()
  lfo.frequency.value = D.lfoRate
  const lfoGain = a.createGain()
  lfoGain.gain.value = D.lfoDepth
  lfo.connect(lfoGain).connect(filter.frequency)
  const oscs = D.freqs.map((f, i) => {
    const o = a.createOscillator()
    o.type = i === D.freqs.length - 1 ? 'sine' : 'sawtooth'
    o.frequency.value = f
    o.connect(filter)
    return o
  })
  filter.connect(gain).connect(out)
  const all = [...oscs, lfo]
  for (const o of all) o.start()
  return { gain, filter, oscs: all }
}

/** Ambient facility drone. Louder and brighter with `level` (0..1 danger). */
export const drone = {
  update(level: number) {
    if (!ctx || !master || ctx.state !== 'running') return
    if (!droneNodes) {
      if (!soundOn()) return
      droneNodes = buildDrone(ctx, master)
    }
    const D = JUICE.drone
    const t = ctx.currentTime
    const g = soundOn() ? D.base + D.danger * level : 0
    droneNodes.gain.gain.setTargetAtTime(g, t, 0.3)
    droneNodes.filter.frequency.setTargetAtTime(D.filter + (D.filterDanger - D.filter) * level, t, 0.3)
  },
  stop() {
    if (!droneNodes || !ctx) return
    const t = ctx.currentTime
    droneNodes.gain.gain.setTargetAtTime(0, t, 0.15)
    for (const o of droneNodes.oscs) o.stop(t + 0.8)
    droneNodes = null
  },
}
