import { drone, sfx } from './audio'
import { JUICE } from './config'
import type { CoreSession } from './core/session'
import { haptic } from './haptics'
import type { HunterMode } from './hunter'
import type { NoiseEvent } from './noise'
import type { PlayerState } from './player'
import type { FailReason, GameSession, NightStatus } from './session'

/**
 * Phase 11 feedback layer. Reads sim state once per frame, diffs it against the previous frame
 * and fires SFX, haptics, screen shake and the proximity heartbeat. The sim itself stays untouched.
 */

export interface JuiceHunter {
  x: number
  z: number
  walkPhase: number
  mode: HunterMode
  active?: boolean
}

export interface JuiceSource {
  player: PlayerState
  hunters: readonly JuiceHunter[]
  status: NightStatus
  failReason: FailReason | null
  secondWind: boolean
  /** Generators repaired, or kill switches thrown in the Core. */
  progress: number
  hidden: boolean
  shiftCount: number
  gatesPowered: boolean
  noise: readonly NoiseEvent[]
}

/** Shared per-frame values read by the camera rig (shake) and the HTML proximity frame. */
export const juiceLive = { danger: 0, trauma: 0, pulse: 0 }

export interface JuiceState {
  started: boolean
  status: NightStatus
  secondWind: boolean
  progress: number
  shiftCount: number
  gatesPowered: boolean
  lastNoiseId: number
  playerStep: number
  hunterSteps: number[]
  heartTimer: number
  droneTimer: number
  danger: number
}

export function createJuice(): JuiceState {
  return {
    started: false,
    status: 'playing',
    secondWind: false,
    progress: 0,
    shiftCount: 0,
    gatesPowered: false,
    lastNoiseId: 0,
    playerStep: 0,
    hunterSteps: [],
    heartTimer: 0,
    droneTimer: 0,
    danger: 0,
  }
}

const NO_NOISE: readonly NoiseEvent[] = []

export function gridJuiceSource(s: GameSession): JuiceSource {
  return {
    player: s.player,
    hunters: [s.hunter],
    status: s.status,
    failReason: s.failReason,
    secondWind: s.secondWind,
    progress: s.repaired,
    hidden: s.hide !== null,
    shiftCount: s.shift.count,
    gatesPowered: s.gatesPowered,
    noise: s.noise.events,
  }
}

export function coreJuiceSource(s: CoreSession): JuiceSource {
  return {
    player: s.player,
    hunters: s.hunters,
    status: s.status,
    failReason: s.failReason,
    secondWind: s.secondWind,
    progress: s.activated,
    hidden: false,
    shiftCount: 0,
    gatesPowered: false,
    noise: NO_NOISE,
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const stepIndex = (phase: number) => Math.floor(phase / Math.PI)

function addTrauma(v: number) {
  juiceLive.trauma = Math.min(1, juiceLive.trauma + v)
}

function sync(j: JuiceState, src: JuiceSource) {
  j.started = true
  j.status = src.status
  j.secondWind = src.secondWind
  j.progress = src.progress
  j.shiftCount = src.shiftCount
  j.gatesPowered = src.gatesPowered
  j.lastNoiseId = src.noise.reduce((m, e) => Math.max(m, e.id), 0)
  j.playerStep = stepIndex(src.player.walkPhase)
  j.hunterSteps = src.hunters.map((h) => stepIndex(h.walkPhase))
}

export function stepJuice(j: JuiceState, src: JuiceSource, dt: number) {
  if (!j.started) sync(j, src)
  juiceLive.trauma = Math.max(0, juiceLive.trauma - JUICE.shake.decay * dt)
  juiceLive.pulse = Math.max(0, juiceLive.pulse - JUICE.vignette.pulseDecay * dt)
  const playing = src.status === 'playing'
  const p = src.player

  // Night outcome.
  if (src.status !== j.status) {
    if (src.status === 'failed') {
      if (src.failReason === 'lockdown') {
        sfx.failBuzz()
        haptic('medium')
      } else {
        sfx.caught()
        haptic('heavy')
        addTrauma(JUICE.shake.caught)
      }
    } else if (src.status === 'escaped') {
      sfx.escape()
    }
    j.status = src.status
  }

  // Second Wind used.
  if (j.secondWind && !src.secondWind && playing) {
    sfx.secondWind()
    haptic('heavy')
    addTrauma(JUICE.shake.secondWind)
  }
  j.secondWind = src.secondWind

  if (src.progress > j.progress) {
    sfx.repair()
    haptic('light')
  }
  j.progress = src.progress

  // Shift executed (shift.ts plays the slam itself).
  const shifted = src.shiftCount > j.shiftCount
  if (shifted) {
    addTrauma(JUICE.shake.wallSlam)
    haptic('medium')
  }
  j.shiftCount = src.shiftCount

  if (src.gatesPowered && !j.gatesPowered) {
    sfx.gatesPowered()
    haptic('medium')
  }
  j.gatesPowered = src.gatesPowered

  let maxId = j.lastNoiseId
  for (const e of src.noise) {
    if (e.id <= j.lastNoiseId) continue
    if (e.id > maxId) maxId = e.id
    if (e.kind === 'repair-fail') {
      sfx.failBuzz()
      haptic('medium')
      addTrauma(JUICE.shake.repairFail)
    } else if (e.kind === 'door' && !shifted) {
      sfx.doorSlam()
    }
  }
  j.lastNoiseId = maxId

  // Player footsteps: one per half walk cycle.
  const step = stepIndex(p.walkPhase)
  if (step !== j.playerStep) {
    j.playerStep = step
    if (playing && !src.hidden && p.speed > 0.4) sfx.footstep(p.running ? 'run' : p.crouching ? 'crouch' : 'walk')
  }

  // Hunter servos + nearest hunter.
  let nearest = Infinity
  let chasing = false
  src.hunters.forEach((h, i) => {
    const active = h.active !== false
    const d = Math.hypot(h.x - p.x, h.z - p.z)
    const hs = stepIndex(h.walkPhase)
    if (hs !== j.hunterSteps[i]) {
      j.hunterSteps[i] = hs
      const level = 1 - d / JUICE.servoRange
      if (playing && active && level > 0.05) sfx.servo(level)
    }
    if (active && d < nearest) {
      nearest = d
      chasing = h.mode === 'chase'
    }
  })

  // Danger level drives the heartbeat, the proximity frame and the drone.
  let target = 0
  if (playing && nearest < JUICE.heartbeatRange) {
    target = clamp01((JUICE.heartbeatRange - nearest) / (JUICE.heartbeatRange - JUICE.heartbeatNear))
    if (chasing) target = Math.min(1, target + JUICE.chaseBoost)
  }
  j.danger += (target - j.danger) * (1 - Math.exp(-JUICE.dangerResponse * dt))
  juiceLive.danger = j.danger

  if (playing && j.danger > 0.08) {
    j.heartTimer -= dt
    if (j.heartTimer <= 0) {
      sfx.heartbeat(j.danger)
      juiceLive.pulse = 1
      if (j.danger > 0.7) haptic('light')
      j.heartTimer = JUICE.heartbeatSlow + (JUICE.heartbeatFast - JUICE.heartbeatSlow) * j.danger
    }
  } else {
    j.heartTimer = 0
  }

  if ((j.droneTimer -= dt) <= 0) {
    j.droneTimer = 0.1
    drone.update(playing ? j.danger : 0)
  }
}

/** Scene unmount: fade the drone out and clear shared values. */
export function endJuice() {
  drone.stop()
  juiceLive.danger = 0
  juiceLive.trauma = 0
  juiceLive.pulse = 0
}
