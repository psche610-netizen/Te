import { SUBTITLE } from '../config'
import { fillLine, LINE_PRIORITY, LINES, type LineKey } from './lines'

export interface Subtitle {
  text: string
  id: number
  priority: number
}

export interface SubtitleState {
  current: Subtitle | null
  timer: number
  queue: Subtitle[]
  /** Pause before the next queued line. */
  gap: number
  /** Seconds since the last line ended (for ambient spacing). */
  idle: number
  cooldowns: Partial<Record<LineKey, number>>
  lastVariant: Partial<Record<LineKey, number>>
  nextId: number
  /** Every line shown this night, for tests and results. */
  log: string[]
}

interface HasSubtitles {
  subtitles: SubtitleState
}

type Rng = () => number

export function createSubtitles(): SubtitleState {
  return { current: null, timer: 0, queue: [], gap: 0, idle: 999, cooldowns: {}, lastVariant: {}, nextId: 1, log: [] }
}

const duration = (text: string) =>
  Math.min(SUBTITLE.maxTime, Math.max(SUBTITLE.minTime, SUBTITLE.baseTime + text.length * SUBTITLE.perChar))

function show(st: SubtitleState, line: Subtitle) {
  st.current = line
  st.timer = duration(line.text)
  st.log.push(line.text)
}

/**
 * OVERSEER speaks. Urgent lines interrupt, others queue (bounded), ambient lines are dropped when busy.
 * Returns false if the line was skipped (cooldown or busy).
 */
export function say(
  s: HasSubtitles,
  key: LineKey,
  vars: Record<string, string | number> = {},
  rng: Rng = Math.random,
) {
  const st = s.subtitles
  if ((st.cooldowns[key] ?? 0) > 0) return false
  const priority = LINE_PRIORITY[key] ?? 1
  const busy = st.current !== null || st.queue.length > 0
  if (priority === 0 && (busy || st.idle < SUBTITLE.ambientGap)) return false

  const variants = LINES[key]
  let pick = Math.floor(rng() * variants.length)
  if (variants.length > 1 && pick === st.lastVariant[key]) pick = (pick + 1) % variants.length
  st.lastVariant[key] = pick
  st.cooldowns[key] = SUBTITLE.cooldowns[key] ?? SUBTITLE.defaultCooldown

  const line: Subtitle = { text: fillLine(variants[pick], vars), id: st.nextId++, priority }
  if (!st.current && st.gap <= 0) {
    show(st, line)
  } else if (st.current && priority > st.current.priority) {
    show(st, line)
  } else {
    if (st.queue.length >= SUBTITLE.maxQueue) {
      const weakest = st.queue.reduce((w, q, i) => (q.priority < st.queue[w].priority ? i : w), 0)
      if (st.queue[weakest].priority >= priority) return false
      st.queue.splice(weakest, 1)
    }
    st.queue.push(line)
    st.queue.sort((a, b) => b.priority - a.priority)
  }
  return true
}

export function updateSubtitles(st: SubtitleState, dt: number) {
  for (const k in st.cooldowns) {
    const key = k as LineKey
    st.cooldowns[key] = Math.max(0, (st.cooldowns[key] ?? 0) - dt)
  }
  if (st.current) {
    st.timer -= dt
    if (st.timer <= 0) {
      st.current = null
      st.gap = SUBTITLE.gap
      st.idle = 0
    }
    return
  }
  st.idle += dt
  if (st.gap > 0) st.gap -= dt
  if (st.gap <= 0 && st.queue.length) show(st, st.queue.shift()!)
}
