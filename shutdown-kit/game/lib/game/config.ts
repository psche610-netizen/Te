/**
 * All gameplay tunables live here. Keep numbers out of simulation modules.
 * Units: world units (1 grid cell = CELL_SIZE), seconds, 0..1 for normalized levels.
 */

export const PALETTE = {
  ink: '#0E0F12',
  graphite: '#1C1F24',
  concrete: '#5A5F66',
  bone: '#EDEAE3',
  signal: '#FF5A1F',
  danger: '#E5383B',
} as const

export type PaletteKey = keyof typeof PALETTE

export const GRID = {
  cellSize: 2,
  wallHeight: 2.0,
  wallThickness: 0.3,
  postThickness: 0.42,
  doorHeight: 1.72,
} as const

export const CAMERA = {
  /** Isometric offset direction from the target (normalized in code). */
  offset: [1, 1.15, 1] as const,
  distance: 40,
  zoom: 42,
  zoomMobile: 28,
  followLerp: 6,
  /** Gameplay: world units visible vertically; zoom = viewport height / this. */
  gameViewHeight: 15,
} as const

export const LIGHT = {
  ambientIntensity: 0.65,
  keyIntensity: 2.1,
  keyDirection: [8, 14, 5] as const,
  shadowMapSize: 2048,
} as const

export const PLAYER = {
  walkSpeed: 3.2,
  runSpeed: 5.6,
  crouchSpeed: 2.0,
  radius: 0.35,
  acceleration: 16,
  turnSpeed: 14,
  /** Walk-cycle radians per world unit travelled. */
  stepRate: 3.4,
  joystickDeadzone: 0.12,
  /** Hunter distance under which the player auto crouch-walks. */
  autoCrouchDistance: 6,
} as const

export const NOISE = {
  /** Radii in world units. */
  walk: 2.5,
  crouch: 1.2,
  run: 8,
  doorSlam: 6,
  wallSlide: 5,
  repairFail: 12,
  hackUse: 3,
  mic: 10,
  softStepMultiplier: 0.7,
  /** How long a noise event stays audible to hunters, seconds. */
  lifetime: 0.6,
  /** Seconds between footstep noise events. */
  walkInterval: 0.5,
  runInterval: 0.3,
  /** Noises at or above this radius skip SUSPICIOUS and go straight to INVESTIGATE. */
  loudRadius: 6,
} as const

export const HUNTER = {
  patrolSpeed: 2.2,
  investigateSpeed: 3.0,
  chaseSpeed: 5.0,
  finalChaseSpeedMultiplier: 1.25,
  visionRange: 9,
  visionAngleDeg: 70,
  /** Seconds of continuous sight (at max range) before SUSPICIOUS becomes CHASE. Faster when closer. */
  suspiciousTime: 1.2,
  /** How long SUSPICIOUS waits without sight or sound before investigating. */
  suspiciousHold: 1.4,
  /** Seen closer than this = instant CHASE. */
  instantChaseDistance: 3.5,
  searchTime: 6,
  searchRadiusCells: 3,
  catchDistance: 0.8,
  loseSightTime: 2.5,
  radius: 0.38,
  turnSpeed: 7,
  repathInterval: 0.25,
  patrolPause: 1.2,
  headScanSpeed: 1.6,
  headScanAmount: 0.7,
  /** Waypoint arrival tolerance, world units. */
  arriveDistance: 0.35,
  stepRate: 2.6,
} as const

/**
 * Per-hunter tuning. THE WARDEN = the base HUNTER values.
 * THE WEAVER (Sector 3): six legs, wide short sight, sharp hearing, quick to investigate, slower sprint.
 */
export const HUNTER_PROFILES = {
  warden: {
    patrolSpeed: HUNTER.patrolSpeed,
    investigateSpeed: HUNTER.investigateSpeed,
    chaseSpeed: HUNTER.chaseSpeed,
    visionRange: HUNTER.visionRange,
    visionAngleDeg: HUNTER.visionAngleDeg,
    /** Noise radius multiplier for what this hunter hears. */
    hearing: 1,
    stepRate: HUNTER.stepRate,
  },
  weaver: {
    patrolSpeed: 2.6,
    investigateSpeed: 3.7,
    chaseSpeed: 4.6,
    visionRange: 6.5,
    visionAngleDeg: 130,
    hearing: 1.35,
    stepRate: 4.2,
  },
} as const

export const SHIFT = {
  /** Seconds between scheduled shifts. */
  interval: 45,
  /** First shift comes sooner so the mechanic shows up early. */
  firstDelay: 25,
  /** If nothing could move, try again after this. */
  retryDelay: 6,
  /** Floor-track + sound warning before pieces move. */
  telegraph: 1.5,
  moveDuration: 0.6,
  wallsMin: 1,
  wallsMax: 2,
  /** Chance a shift also locks one open door. */
  doorChance: 0.5,
  doorLockTime: 20,
  /** Added to a random 0..1 * this when ranking pieces by distance to the player. */
  randomSpread: 10,
  /** Extra body clearance when planning / executing a closing piece. */
  planMargin: 0.6,
  executeMargin: 0.1,
  /** How often the route-safety net runs outside of shifts. */
  safetyInterval: 1,
} as const

export const OBJECTIVES = {
  generatorsPerNight: 5,
  finalChaseTime: 60,
  /** During the final chase, OVERSEER tells the hunter where you are this often. */
  finalRevealInterval: 12,
  hackChargesBase: 2,
  cameraBlindTime: 10,
  /** Hunter freeze after a Second Wind escape. */
  secondWindStun: 3,
  noticeTime: 2.6,
  /** Spawn at least this many cells (Chebyshev) from any active generator. */
  spawnGeneratorGap: 3,
} as const

export const REPAIR = {
  interactDistance: 1.9,
  stages: 3,
  needle: { speed: 3.0, speedPerNight: 0.5, speedPerStage: 0.5, zoneDeg: 54, zoneShrinkPerNight: 6 },
  wires: { count: 4, timePerCut: 2.8, timeShrinkPerNight: 0.3 },
  hold: { fillTime: 1.5, window: 0.2, windowShrinkPerNight: 0.02 },
} as const

export const PROGRESSION = {
  nightsPerSector: 3,
  maxEquipped: 3,
  startingScrap: 0,
  scrap: {
    perGenerator: 30,
    escape: 80,
    /** Stealth bonus on escape, minus `stealthPerSpot` each time the hunter started a chase. */
    stealthMax: 60,
    stealthPerSpot: 20,
    breathPerSecond: 2,
    /** Failed nights keep this share of generator scrap only. */
    failRate: 0.5,
    /** Final (modifier) night pays more. */
    finalNightMultiplier: 1.5,
  },
  /** Results route trace: seconds between samples, and a hard cap. */
  pathSampleInterval: 0.75,
  pathMaxPoints: 800,
} as const

export const PERK_EFFECTS = {
  /** Quick Hands: trial motion speed multiplier (lower = easier). */
  quickHandsMotion: 0.8,
  /** Quick Hands: wires time limit and hold fill time multiplier. */
  quickHandsTime: 1.2,
  /** Steady: repair zone / window width multiplier. */
  steadyZone: 1.35,
  deepPocketsCharges: 1,
  /** Awareness: hunter silhouette shows through walls within this distance. */
  awarenessDistance: 10,
  /** Foundry: Ghost. Cameras can't log the player for this long after any hack. */
  ghostTime: 5,
  /** Foundry: Decoy. Throws per night, max throw distance, delay before it sounds, pulses. */
  decoyCharges: 2,
  decoyRange: 6,
  decoyArm: 0.7,
  decoyPulses: 3,
  decoyInterval: 1.1,
  decoyNoise: 11,
} as const

export const MODIFIERS = {
  /** Sector 1 final night: the building shifts more often. */
  overtime: { shiftInterval: 30, firstDelay: 15 },
  /** Sector 2 final night: lights down, no vision cone, hunter body only visible up close. */
  blackout: { lightScale: 0.3, hunterRevealDistance: 6 },
} as const

export const GATE = {
  interactDistance: 2.1,
  /** Opening pauses if the player strays farther than this. */
  stayDistance: 2.6,
  openTime: 3,
  noiseInterval: 1,
  escapeDistance: 0.8,
} as const

export const HACK = {
  range: 2.8,
  cameraRange: 6.5,
  doorLockTime: 10,
} as const

export const SECURITY_CAMERA = {
  range: 7,
  fovDeg: 50,
  sweepDeg: 45,
  sweepSpeed: 0.55,
  /** Seconds in view before the camera reports you. */
  detectTime: 0.5,
  cooldown: 4,
  height: 1.75,
} as const

export const MIC = {
  calibrationSeconds: 3,
  /** Level above baseline (0..1 RMS) that counts as noise. */
  threshold: 0.035,
  /** Added on top of the 90th percentile of the silent calibration samples. */
  baselineMargin: 0.006,
  /** Loudness that maps to a full meter and the full `NOISE.mic` radius. */
  fullScale: 0.2,
  /** Sim-side smoothing rate (1/s) for the mic level. */
  response: 14,
  /** Seconds between mic noise events while above threshold. */
  emitInterval: 0.25,
  /** Quietest mic noise radius, as a fraction of `NOISE.mic`. */
  minRadiusFraction: 0.35,
  /** Survive a locker check by staying quiet this long. */
  lockerHoldSeconds: 4,
  /** Seconds above threshold during a locker check before you are found. */
  lockerGrace: 0.2,
} as const

export const LOCKER = {
  /** Where the player stands (and the camera sits) in front of the locker's center. */
  standOffset: 0.85,
  interactDistance: 1.2,
  /** Hunter (investigating / searching / chasing) this close to the locker starts a check. */
  searchDistance: 2.8,
  /** Where the hunter stands during a check, from the locker's center. */
  checkStand: 1.6,
  /** No new check for this long after one ends. */
  cooldown: 8,
  doorNoise: 3,
  foundNoise: 8,
  /** Mic noise while hidden is muffled by this factor. */
  muffle: 0.6,
  /** Mic-off fallback: keep the needle inside the moving zone. */
  fallback: {
    zoneWidth: 0.3,
    zoneSwing: 0.3,
    zoneSpeed: 1.3,
    zoneSpeedPerNight: 0.15,
    rise: 0.95,
    fall: 0.75,
    /** Seconds out of the zone (net) before you exhale. */
    grace: 0.6,
  },
  camera: { eyeHeight: 1.45, fov: 62 },
} as const

export const SUBTITLE = {
  /** On-screen time = base + perChar * length, clamped. */
  baseTime: 1.6,
  perChar: 0.05,
  minTime: 2.2,
  maxTime: 4.8,
  /** Pause between queued lines. */
  gap: 0.3,
  maxQueue: 2,
  /** Ambient (priority 0) lines are dropped if another line ended less than this ago. */
  ambientGap: 6,
  /** Seconds before the same line key may play again. Missing keys use `defaultCooldown`. */
  defaultCooldown: 4,
  cooldowns: {
    nightStart: 999,
    weaverStart: 999,
    dailyStart: 999,
    decoy: 8,
    shiftWarn: 20,
    spotted: 14,
    lost: 14,
    micLoud: 12,
    repairFail: 6,
    cameraLogged: 10,
    lockerEnter: 25,
    generatorOnline: 0,
    coreStart: 999,
    coreReject: 8,
    coreUnitLost: 12,
  } as Record<string, number>,
} as const

export const DIRECTOR = {
  /** Seconds between habit evaluations. */
  tickInterval: 1,
  /** Minimum seconds between any two director responses. */
  responseGap: 18,
  /** First response can't happen before this many seconds into the night. */
  warmup: 20,

  /** Stays still: seconds without moving (not hidden, not repairing). */
  stillSeconds: 12,
  /** Delay between "Please remain where you are." and the hunter being sent. */
  stillAlertDelay: 2.5,
  stillCooldown: 40,

  /** Same corridor: passes through one door / dynamic-wall slot before it gets sealed. */
  corridorUses: 4,
  /** Distance to a door / wall slot that counts as passing through. */
  corridorPassDistance: 1.1,
  /** Only seal it when the player is at least this far away. */
  corridorMinDistance: 5,
  corridorCooldown: 45,

  /** Loud: score gained per second above mic threshold, per second running, per failed repair. */
  loudMicRate: 1,
  loudRunRate: 0.25,
  loudRepairFail: 2,
  /** Score decays by this per second. */
  loudDecay: 0.05,
  loudThreshold: 4,
  /** Hunter patrols within this radius of the last loud spot for `biasDuration`. */
  biasRadius: 8,
  biasDuration: 40,
  loudCooldown: 45,

  /** Rushes generators: repairs finished less than this many seconds after the previous one (or night start). */
  rushInterval: 40,
  rushCount: 2,
  /** Doors within this range of an unrepaired generator get locked. */
  rushDoorRange: 7,
  rushDoors: 2,
  rushCooldown: 45,

  /** Lockers: uses of one locker before OVERSEER checks it first when searching. */
  lockerHabitUses: 2,
  /** Only divert to the favourite locker if it is this close to the hunter. */
  lockerFirstRange: 18,
  lockerFirstCooldown: 30,
  /** Total locker entries before OVERSEER gasses the favourite locker room. */
  gasEntries: 4,
  gasRadius: 6,
  gasDuration: 20,
  /** Seconds a hidden player gets to leave a gassed locker before being forced out. */
  gasEvictDelay: 3,
  gasCoughNoise: 7,
  gasCooldown: 90,
} as const

/** The Core finale arena (screen 08). World units, seconds, radians. */
export const CORE = {
  pillarRadius: 3.2,
  rings: [
    { inner: 4.2, outer: 6.6, speed: 0.1 },
    { inner: 7.6, outer: 10, speed: -0.075 },
    { inner: 11, outer: 13.4, speed: 0.055 },
  ],
  rim: { inner: 14.4, outer: 17.2 },
  spokeAngles: [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4],
  spokeHalfWidth: 0.9,
  segments: 12,
  /** Ring index + segment index per kill switch. Those segments never drop. */
  terminals: [
    { ring: 2, seg: 0 },
    { ring: 2, seg: 6 },
    { ring: 1, seg: 3 },
    { ring: 0, seg: 9 },
  ],
  terminalRadius: 0.6,
  useDistance: 1.9,
  spawn: { r: 15.8, angle: Math.PI / 4 },
  purge: 240,
  /** Seconds lost on a failed trial. */
  failPenalty: 8,
  /** Ring speed multiplier gained per switch. */
  speedPerSwitch: 0.35,
  dropInterval: 8,
  dropIntervalPerSwitch: 1.2,
  dropIntervalMin: 4,
  maxDropped: 5,
  warnTime: 2.2,
  downTime: 10,
  riseTime: 0.6,
  pathSampleInterval: 1,
  /** OVERSEER purge warnings, seconds left. */
  purgeWarnings: [60, 30],
  /** All 4 switches: rings spin down over `spinDown`, slits go dark at `slitOff`, results at `endingTime`. */
  spinDown: 2.5,
  slitOff: 1.6,
  endingTime: 6.5,
} as const

/** The two Core hunters. They move on the rim, rings and spokes only. */
export const CORE_HUNTER = {
  patrolSpeed: 2.3,
  investigateSpeed: 3.1,
  chaseSpeed: 4.5,
  /** Hunter speed multiplier gained per kill switch. */
  speedPerSwitch: 0.06,
  /** The second hunter joins at the first switch, or after this many seconds. */
  secondDelay: 50,
  /** Spawn on the rim at least this far (radians) from the player. */
  spawnMinAngle: Math.PI * 0.6,
  /** A hunter that falls with a dropped segment is replaced after this. */
  respawnTime: 9,
  /** Seconds stunned after a Second Wind escape. */
  secondWindStun: 3,
  /** Patrol targets lean toward the player's angle this often. */
  patrolPlayerBias: 0.6,
  patrolRetarget: 10,
  searchRadius: 4,
  /** Give up walking to a noise after this long and search where it stands. */
  investigateTimeout: 20,
  arriveDistance: 0.6,
  /** Waypoint look-ahead along an arc, world units. */
  arcLookAhead: 1.6,
  /** Seconds a blocked hunter keeps its reversed arc direction. */
  blockedTime: 1.6,
} as const

/** Phase 11 feedback: audio levels, heartbeat, proximity frame, screen shake, haptics. */
export const JUICE = {
  /** Hunter distance where the heartbeat starts, and where it peaks. */
  heartbeatRange: 12,
  heartbeatNear: 2,
  /** Seconds between beats at low and full danger. */
  heartbeatSlow: 1.1,
  heartbeatFast: 0.42,
  /** Added to danger while the nearest hunter is chasing. */
  chaseBoost: 0.35,
  /** Smoothing rate (1/s) for the danger level. */
  dangerResponse: 4,
  /** Hunter servo ticks are audible within this distance. */
  servoRange: 14,
  shake: {
    caught: 1,
    secondWind: 0.7,
    wallSlam: 0.35,
    repairFail: 0.25,
    /** Trauma lost per second. Offset = trauma^2 * maxOffset. */
    decay: 1.6,
    maxOffset: 0.6,
  },
  /** Flat ink frame that closes in (fraction of the short viewport side at full danger). */
  vignette: { maxWidth: 0.06, opacity: 0.85, ruleAt: 0.55, pulse: 0.25, pulseDecay: 4 },
  drone: {
    freqs: [48, 48.7, 24],
    base: 0.035,
    danger: 0.05,
    filter: 160,
    filterDanger: 280,
    lfoRate: 0.07,
    lfoDepth: 40,
  },
  volume: { master: 0.9, footstep: 0.05, servo: 0.05, heartbeat: 0.22 },
  /** Minimum seconds between light haptic taps. */
  hapticGap: 0.12,
} as const

export const PERF = {
  maxDpr: 1.75,
  maxDrawCalls: 150,
} as const
