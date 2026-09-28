import { NOISE } from './config'

export type NoiseKind = 'walk' | 'crouch' | 'run' | 'door' | 'repair-fail' | 'hack' | 'mic' | 'decoy'

export interface NoiseEvent {
  id: number
  kind: NoiseKind
  x: number
  z: number
  radius: number
  time: number
}

export interface NoiseBus {
  events: NoiseEvent[]
  nextId: number
}

export function createNoiseBus(): NoiseBus {
  return { events: [], nextId: 1 }
}

export function emitNoise(bus: NoiseBus, kind: NoiseKind, x: number, z: number, radius: number, time: number) {
  bus.events.push({ id: bus.nextId++, kind, x, z, radius, time })
}

export function pruneNoise(bus: NoiseBus, time: number) {
  let w = 0
  for (const e of bus.events) if (time - e.time <= NOISE.lifetime) bus.events[w++] = e
  bus.events.length = w
}
