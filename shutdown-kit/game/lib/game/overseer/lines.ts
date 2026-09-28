/**
 * OVERSEER line bank. Dry, deadpan, corporate. Sentence case, no exclamation marks, no insults.
 * `{name}` placeholders are filled from the vars passed to `say()`.
 */
export const LINES = {
  nightStart: [
    'Good evening. Your shift has begun.',
    'Facility 07 is operating normally. Please keep it that way.',
    'Welcome back. Please remain productive.',
  ],
  shiftWarn: ['Please stand clear of the walls.', 'Rearranging. One moment.', 'Minor adjustments in progress.'],
  routeClosed: ['That route is closed now.', 'That corridor is no longer available.', 'Please use an alternative route.'],
  routeOpened: ['Route updated.', 'A new route is available. Temporarily.'],
  routeRestored: ['A route has been restored. Regulations require it.'],
  repairFail: ['I heard that.', 'That was loud.', 'Maintenance has noted the noise.'],
  generatorOnline: [
    'Generator {n} of {total} online. I noticed.',
    'That generator was not scheduled for repair.',
    'Unauthorized maintenance logged.',
  ],
  gatesPowered: ['Exit gates powered. Lockdown in sixty seconds.', 'You have sixty seconds. Then your shift is extended.'],
  lockdownSoon: ['Ten seconds. Please remain where you are.'],
  spotted: ['Please hold still.', 'Subject located.', 'I see you.'],
  lost: ['You were supposed to stay.', 'Temporarily misplaced. Not lost.'],
  secondWind: ['That should not have worked.', 'An exception has been logged.'],
  lockerEnter: ['Lockers are for equipment.', 'Please do not get comfortable.'],
  lockerInspect: ['Checking locker {n}.', 'Please remain inside the locker.'],
  lockerFound: ['There you are.'],
  lockerClear: ['Locker {n} is empty. Noted.', 'Nothing here. For now.'],
  lockerRepeat: ['Locker {n}. Again?', 'You seem to like locker {n}.'],
  lockerFirst: ['Checking locker {n} first.', 'Locker {n}. It is usually locker {n}.'],
  gas: [
    'The lockers near locker {n} are being ventilated. Please step out.',
    'Ventilating locker room {n}. For your comfort.',
  ],
  gasEvict: ['Please vacate the locker.', 'Thank you for stepping out.'],
  hackDoor: ['That door was locked for a reason.', 'Please do not touch the doors.'],
  hackWall: ['Please do not rearrange my facility.', 'That wall was where I wanted it.'],
  hackCamera: ['Camera {n} is experiencing difficulties.', 'I did not need that camera.'],
  cameraLogged: ['Camera {n} has you. Thank you.', 'Your movement has been logged.'],
  decoy: ['A noise maker. How thoughtful.', 'That is not you. I know that is not you.'],
  override: ['That override was not authorised.', 'You reversed my shift. I will remember that.'],
  weaverStart: ['The Weaver is listening. Please tread softly.', 'The Foundry has a new supervisor.'],
  dailyStart: ['Daily shift. Everyone gets the same night. Only some finish it.'],
  micLoud: ['I heard that.', 'Please keep your voice down.', 'Say that again.'],
  still: ['Please remain where you are.'],
  corridorSealed: ['You use this corridor a lot. It is being closed.', 'That route was becoming a habit.'],
  loudBias: ['I will be listening near there.', 'Patrols have been adjusted to your volume.'],
  rushLock: ['Generator rooms are now restricted.', 'You are repairing too quickly. Access reduced.'],
  coreStart: ['This is the Core. You are not authorized to be here.', 'Visitors are not permitted in the Core. Please turn back.'],
  coreSwitch1: ['Kill switch one. That one was decorative.', 'One switch. I have redundancies.'],
  coreSwitch2: ['Two switches. Please stop touching those.', 'Two. I would prefer you did not continue.'],
  coreSwitch3: ['Three. I have been very accommodating.', 'Three switches. Please reconsider. I will not ask again.'],
  coreSwitch4: ['Four.'],
  coreShutdown: ['Shutdown confirmed. Your shift is over.'],
  coreReject: ['Override rejected. The purge has been brought forward.', 'Incorrect. That will cost you.'],
  coreSecondUnit: ['A second unit has been assigned to you.', 'Additional staff have been dispatched to the Core.'],
  coreUnitLost: ['Unit lost. Another will be provided.', 'That unit has been written off.'],
  corePurge60: ['Sixty seconds until purge. Please remain where you are.'],
  corePurge30: ['Thirty seconds. The purge is not personal.'],
} satisfies Record<string, readonly string[]>

export type LineKey = keyof typeof LINES

/** 0 = ambient (dropped when busy), 1 = normal, 2 = urgent (interrupts). */
export const LINE_PRIORITY: Partial<Record<LineKey, 0 | 1 | 2>> = {
  nightStart: 0,
  lockerEnter: 0,
  routeOpened: 0,
  shiftWarn: 0,
  hackDoor: 0,
  hackWall: 0,
  hackCamera: 0,
  lockerClear: 0,
  generatorOnline: 1,
  spotted: 2,
  lockerFound: 2,
  gatesPowered: 2,
  lockdownSoon: 2,
  gas: 2,
  gasEvict: 2,
  secondWind: 2,
  coreSwitch1: 2,
  coreSwitch2: 2,
  coreSwitch3: 2,
  coreSwitch4: 2,
  coreShutdown: 2,
  coreSecondUnit: 2,
  corePurge60: 2,
  corePurge30: 2,
  coreUnitLost: 0,
}

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
]

/** Spoken number: "four". Falls back to digits above twenty. */
export const numberWord = (n: number) => WORDS[n] ?? String(n)

export function fillLine(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}
