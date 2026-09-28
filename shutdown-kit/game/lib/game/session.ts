import { MISSIONS, missionForNight, type MissionKind } from './missions'
import { actions, clearActions } from './actions'
import type { Modifier } from './campaign'
import { HUNTER, LOCKER, MIC, MODIFIERS, NOISE, OBJECTIVES, PLAYER, PROGRESSION } from './config'
import type { Rng } from './daily'
import { throwDecoy, updateDecoys, type Decoy } from './decoy'
import { enterLocker, exitLocker, findLocker, updateHide, type HideState } from './hide'
import {
  alertHunter,
  createHunter,
  hunterCaught,
  hunterProfile,
  stunHunter,
  updateHunter,
  type HunterKind,
  type HunterMode,
  type HunterState,
} from './hunter'
import { readInput } from './input'
import { buildLevel } from './level/build'
import type { LevelData, LevelDef } from './level/types'
import { createNoiseBus, emitNoise, pruneNoise, type NoiseBus } from './noise'
import {
  assignTrials,
  findContext,
  findHackTarget,
  isFreeHack,
  notify,
  performHack,
  powerGates,
  setupNight,
  updateCameras,
  updateDoors,
  updateEndgame,
} from './objectives'
import { createDirector, updateDirector, type DirectorState } from './overseer/director'
import type { LineKey } from './overseer/lines'
import { createSubtitles, say, updateSubtitles, type Subtitle, type SubtitleState } from './overseer/subtitles'
import { createPlayer, updatePlayer, type PlayerState } from './player'
import { createShiftState, updateShift, type DoorLockSource, type ShiftState } from './shift'

export type NightStatus = 'playing' | 'failed' | 'escaped'
export type FailReason = 'caught' | 'lockdown' | 'fell'
export type TrialKind = 'needle' | 'wires' | 'hold'
export type ContextKind = 'repair' | 'gate'
export type HackKind = 'door' | 'wall' | 'camera'

export interface GeneratorState {
  trial: TrialKind
  repaired: boolean
}

export interface RepairState {
  generatorId: number
  trial: TrialKind
  night: number
  /** Quick Hands perk: slower motion, more time. */
  quick: boolean
  /** Steady perk: wider zones. */
  steady: boolean
}

/**
 * Sim-side perk flags. Second Wind, Deep Pockets, Decoy and Override are applied through
 * `secondWind` / `hackCharges` / `decoyCharges` / `overrideReady`.
 */
export interface SessionPerks {
  softStep: boolean
  quickHands: boolean
  steady: boolean
  awareness: boolean
  ghost: boolean
}

export interface NightStats {
  /** Times the hunter started a chase. */
  spotted: number
  /** Seconds spent holding still through locker checks. */
  breathHeld: number
  /** Player route in world units, for the Results map. */
  path: [number, number][]
  pathTimer: number
  prevMode: HunterMode
}

export interface HackTarget {
  kind: HackKind
  id: number
}

export interface Notice {
  text: string
  id: number
}

export interface GameSession {
  mission: MissionKind
  order: number[]
  night: number
  level: LevelData
  player: PlayerState
  hunter: HunterState
  noise: NoiseBus
  time: number
  status: NightStatus
  failReason: FailReason | null
  stepTimer: number
  generators: GeneratorState[]
  repaired: number
  repair: RepairState | null
  context: { kind: ContextKind; id: number } | null
  hackTarget: HackTarget | null
  hackCharges: number
  doorTimers: number[]
  doorLockSource: DoorLockSource[]
  shift: ShiftState
  gatesPowered: boolean
  openingGate: number | null
  /** Seconds left in the final chase; only meaningful once gates are powered. */
  finalChase: number
  revealTimer: number
  secondWind: boolean
  notice: Notice | null
  noticeTimer: number
  hide: HideState | null
  /** Locker the player could hide in right now. */
  hideTarget: number | null
  lockerCooldown: number
  /** Loudness above baseline, or null when the mic is off. */
  micSample: (() => number) | null
  /** Smoothed mic loudness. */
  micLevel: number
  micTimer: number
  /** OVERSEER subtitle queue. */
  subtitles: SubtitleState
  /** OVERSEER adaptive director (habit tracking + responses). */
  director: DirectorState
  /** Seconds of gas left per locker; gassed lockers can't be entered. */
  lockerGas: number[]
  modifier: Modifier
  perks: SessionPerks
  /** Ghost perk: seconds cameras stay unable to log the player. */
  ghostTimer: number
  /** Decoy perk: throws left, and decoys on the floor. */
  decoyCharges: number
  decoyEnabled: boolean
  decoys: Decoy[]
  /** Override perk: the next shift reversal (wall hack, or a shift-locked door) is free. */
  overrideReady: boolean
  /** First OVERSEER line of the night. */
  openingLine: LineKey
  stats: NightStats
  /** Set once the night's result has been handed to the store. */
  reported: boolean
}

export interface SessionOptions {
  night?: number
  secondWind?: boolean
  hackCharges?: number
  mic?: (() => number) | null
  modifier?: Modifier
  perks?: Partial<SessionPerks>
  hunter?: HunterKind
  /** Decoy perk throws; 0 = perk off. */
  decoys?: number
  override?: boolean
  /** Seeded night (Daily Night): fixes generator sites, spawn and trials. */
  rng?: Rng
  openingLine?: LineKey
}

export function createSession(def: LevelDef, opts: SessionOptions = {}): GameSession {
  const rng = opts.rng ?? Math.random
  const mission = missionForNight(opts.night ?? 1)
  const level = buildLevel(setupNight(def, rng, MISSIONS[mission].count))
  const player = createPlayer(level.spawn)
  const trials = assignTrials(level.generators.length, rng)
  const modifier = opts.modifier ?? 'none'
  clearActions()
  return {
    mission,
    order: level.generators.map((_, i) => i).sort((a, b) => {
      const ga = level.generators[a], gb = level.generators[b]
      return Math.hypot(ga.x - player.x, ga.z - player.z) - Math.hypot(gb.x - player.x, gb.z - player.z)
    }),
    night: opts.night ?? 1,
    level,
    player,
    hunter: createHunter(level, player, hunterProfile(opts.hunter)),
    noise: createNoiseBus(),
    time: 0,
    status: 'playing',
    failReason: null,
    stepTimer: 0,
    generators: trials.map((trial) => ({ trial, repaired: false })),
    repaired: 0,
    repair: null,
    context: null,
    hackTarget: null,
    hackCharges: opts.hackCharges ?? OBJECTIVES.hackChargesBase,
    doorTimers: level.doors.map(() => 0),
    doorLockSource: level.doors.map(() => null),
    shift:
      modifier === 'overtime'
        ? createShiftState(MODIFIERS.overtime.shiftInterval, MODIFIERS.overtime.firstDelay)
        : createShiftState(),
    gatesPowered: false,
    openingGate: null,
    finalChase: 0,
    revealTimer: 0,
    secondWind: opts.secondWind ?? false,
    notice: null,
    noticeTimer: 0,
    hide: null,
    hideTarget: null,
    lockerCooldown: 0,
    micSample: opts.mic ?? null,
    micLevel: 0,
    micTimer: 0,
    subtitles: createSubtitles(),
    director: createDirector(level.lockers.length),
    lockerGas: level.lockers.map(() => 0),
    modifier,
    perks: { softStep: false, quickHands: false, steady: false, awareness: false, ghost: false, ...opts.perks },
    ghostTimer: 0,
    decoyCharges: opts.decoys ?? 0,
    decoyEnabled: (opts.decoys ?? 0) > 0,
    decoys: [],
    overrideReady: opts.override ?? false,
    openingLine: opts.openingLine ?? 'nightStart',
    stats: { spotted: 0, breathHeld: 0, path: [[player.x, player.z]], pathTimer: 0, prevMode: 'patrol' },
    reported: false,
  }
}

function updateStats(s: GameSession, dt: number) {
  const st = s.stats
  const mode = s.hunter.mode
  if (mode === 'chase' && st.prevMode !== 'chase' && st.prevMode !== 'stunned') st.spotted++
  st.prevMode = mode
  if (s.hide?.check) st.breathHeld += dt
  if ((st.pathTimer -= dt) > 0 || st.path.length >= PROGRESSION.pathMaxPoints) return
  st.pathTimer = PROGRESSION.pathSampleInterval
  const [lx, lz] = st.path[st.path.length - 1]
  if (Math.hypot(s.player.x - lx, s.player.z - lz) > 0.5) st.path.push([s.player.x, s.player.z])
}

const MAX_DT = 1 / 30

function emitFootsteps(s: GameSession, dt: number) {
  const p = s.player
  s.stepTimer -= dt
  if (p.speed < 0.4 || s.stepTimer > 0) return
  const quiet = s.perks.softStep ? NOISE.softStepMultiplier : 1
  const radius = p.running ? NOISE.run : (p.crouching ? NOISE.crouch : NOISE.walk) * quiet
  emitNoise(s.noise, p.running ? 'run' : p.crouching ? 'crouch' : 'walk', p.x, p.z, radius, s.time)
  s.stepTimer = p.running ? NOISE.runInterval : NOISE.walkInterval
}

/** Mic → noise events at the player. Locker checks judge the level themselves. */
function updateMic(s: GameSession, dt: number) {
  if (!s.micSample) return
  s.micLevel += (s.micSample() - s.micLevel) * (1 - Math.exp(-MIC.response * dt))
  s.micTimer -= dt
  if (s.micLevel <= MIC.threshold || s.micTimer > 0 || s.hide?.check) return
  const scale = Math.min(1, Math.max(MIC.minRadiusFraction, s.micLevel / MIC.fullScale))
  const radius = NOISE.mic * scale * (s.hide ? LOCKER.muffle : 1)
  emitNoise(s.noise, 'mic', s.player.x, s.player.z, radius, s.time)
  s.micTimer = MIC.emitInterval
}

function resolveRepair(s: GameSession) {
  const result = actions.repairResult
  if (!s.repair || !result) return
  const id = s.repair.generatorId
  const gen = s.level.generators[id]
  s.repair = null
  if (result === 'success') {
    s.generators[id].repaired = true
    s.repaired++
    if (s.mission === 'restore') {
      for (const camera of s.level.cameras) { camera.blindTimer = 12; camera.seenTime = 0 }
    } else if (s.mission === 'relay') {
      s.hackCharges = Math.min(4, s.hackCharges + 1)
      s.shift.timer = Math.min(s.shift.timer, 3)
    } else {
      alertHunter(s.hunter, gen)
      emitNoise(s.noise, 'repair-fail', gen.x, gen.z, NOISE.repairFail, s.time)
      s.shift.interval = Math.max(16, s.shift.interval - 6)
      s.shift.timer = Math.min(s.shift.timer, 3)
    }
    if (s.repaired >= s.generators.length) powerGates(s)
    else notify(s, s.mission === 'restore' ? 'CAMERAS OFFLINE // 12 SECONDS' : s.mission === 'relay' ? 'RELAY CONNECTED // +1 HACK // SHIFT INCOMING' : 'POSITION BROADCAST // MOVE NOW')
  } else if (result === 'fail') {
    emitNoise(s.noise, 'repair-fail', gen.x, gen.z, NOISE.repairFail, s.time)
    notify(s, 'REPAIR FAILED')
    say(s, 'repairFail')
  }
}

function startUse(s: GameSession) {
  const ctx = s.context
  if (!ctx) return
  if (ctx.kind === 'repair') {
    const g = s.level.generators[ctx.id]
    s.repair = {
      generatorId: ctx.id,
      trial: s.generators[ctx.id].trial,
      night: s.night,
      quick: s.perks.quickHands,
      steady: s.perks.steady,
    }
    s.player.facing = Math.atan2(g.x - s.player.x, g.z - s.player.z)
    s.openingGate = null
  } else {
    s.openingGate = ctx.id
  }
  s.context = null
}

function onCaught(s: GameSession) {
  const { hunter, player } = s
  hunter.facing = Math.atan2(player.x - hunter.x, player.z - hunter.z)
  s.repair = null
  s.openingGate = null
  if (s.secondWind) {
    s.secondWind = false
    stunHunter(hunter, OBJECTIVES.secondWindStun)
    notify(s, 'SECOND WIND // RUN')
    say(s, 'secondWind')
    return
  }
  s.status = 'failed'
  s.failReason = 'caught'
}

export function stepSession(s: GameSession, rawDt: number) {
  if (s.status !== 'playing') {
    s.hunter.speed = 0
    s.player.speed = 0
    clearActions()
    return
  }
  const dt = Math.min(rawDt, MAX_DT)
  s.time += dt
  const { player, hunter } = s

  resolveRepair(s)
  const nearHunter = Math.hypot(player.x - hunter.x, player.z - hunter.z) < PLAYER.autoCrouchDistance

  if (actions.hide) {
    if (s.hide) exitLocker(s)
    else if (s.hideTarget !== null && !s.repair) enterLocker(s, s.hideTarget)
  }
  s.lockerCooldown = Math.max(0, s.lockerCooldown - dt)

  if (s.hide) {
    player.speed = 0
    player.vx = 0
    player.vz = 0
    player.running = false
    s.context = null
    s.hideTarget = null
  } else if (s.repair) {
    player.speed = 0
    player.vx = 0
    player.vz = 0
    player.running = false
    player.crouching = nearHunter
    s.context = null
    s.hideTarget = null
  } else {
    updatePlayer(player, dt, readInput(), s.level, nearHunter)
    emitFootsteps(s, dt)
    s.context = findContext(s)
    s.hideTarget = findLocker(s)
    if (actions.use) startUse(s)
  }

  s.hackTarget = s.repair || s.hide ? null : findHackTarget(s)
  if (actions.hack && s.hackTarget) performHack(s, s.hackTarget)
  if (actions.decoy && !s.hide && !s.repair) throwDecoy(s)
  clearActions()
  s.ghostTimer = Math.max(0, s.ghostTimer - dt)

  updateDoors(s, dt)
  updateShift(s, dt)
  updateCameras(s, dt)
  updateEndgame(s, dt)
  if (s.status !== 'playing') return

  updateMic(s, dt)
  updateDecoys(s, dt)
  const speedMul = s.gatesPowered ? HUNTER.finalChaseSpeedMultiplier : 1
  if (!s.hide?.check) {
    updateHunter(hunter, dt, { level: s.level, player, noise: s.noise, hidden: s.hide !== null }, speedMul)
  }
  const hideResult = updateHide(s, dt, s.micSample ? s.micLevel : null)
  pruneNoise(s.noise, s.time)

  if (hideResult === 'found' || hunterCaught(hunter, player, s.hide !== null)) onCaught(s)
  updateStats(s, dt)

  if (s.status === 'playing') updateDirector(s, dt)
  updateSubtitles(s.subtitles, dt)
  if (s.notice && (s.noticeTimer -= dt) <= 0) s.notice = null
}

/** Low-frequency view of the sim for the HTML overlay. Compared field by field each frame. */
export interface NightMirror {
  nightStatus: NightStatus
  failReason: FailReason | null
  hunterMode: HunterMode
  repaired: number
  totalGenerators: number
  context: ContextKind | null
  hackTarget: HackKind | null
  hackCharges: number
  /** The current hack target costs no charge (Override perk). */
  hackFree: boolean
  /** Decoy throws left, or null when the perk is off. */
  decoys: number | null
  /** Ghost perk active: cameras can't log the player. */
  ghost: boolean
  repair: RepairState | null
  gatesPowered: boolean
  /** Whole seconds left in the final chase. */
  finalChase: number
  /** Rounded 0..1 while a gate is opening, else null. */
  gateProgress: number | null
  notice: Notice | null
  secondWindReady: boolean
  canHide: boolean
  hidden: boolean
  lockerCheck: boolean
  micActive: boolean
  subtitle: Subtitle | null
  /** Whole seconds left on the Core PURGE timer, null outside the Core. */
  purge: number | null
  purgeMax: number
}

export function mirrorSession(s: GameSession): NightMirror {
  const opening = s.openingGate !== null ? s.level.gates[s.openingGate].progress : null
  return {
    nightStatus: s.status,
    failReason: s.failReason,
    hunterMode: s.hunter.mode,
    repaired: s.repaired,
    totalGenerators: s.generators.length,
    context: s.context?.kind ?? null,
    hackTarget: s.hackTarget?.kind ?? null,
    hackCharges: s.hackCharges,
    hackFree: s.hackTarget !== null && isFreeHack(s, s.hackTarget),
    decoys: s.decoyEnabled ? s.decoyCharges : null,
    ghost: s.ghostTimer > 0,
    repair: s.repair,
    gatesPowered: s.gatesPowered,
    finalChase: Math.ceil(s.finalChase),
    gateProgress: opening === null ? null : Math.round(opening * 20) / 20,
    notice: s.notice,
    secondWindReady: s.secondWind,
    canHide: s.hideTarget !== null,
    hidden: s.hide !== null,
    lockerCheck: s.hide?.check != null,
    micActive: s.micSample !== null,
    subtitle: s.subtitles.current,
    purge: null,
    purgeMax: 0,
  }
}
