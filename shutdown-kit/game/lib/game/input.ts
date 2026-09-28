import { actions } from './actions'

/** Shared mutable input state. Written by touch/keyboard handlers, read by the simulation. Screen space: +y is up. */
export const input = {
  joyX: 0,
  joyY: 0,
  keyX: 0,
  keyY: 0,
  runTouch: false,
  runKey: false,
  /** Mic-off locker fallback: holding pushes the needle up. */
  breathTouch: false,
  breathKey: false,
}

export function readBreath() {
  return input.breathTouch || input.breathKey
}

const KEY_DIRS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

const move = { x: 0, y: 0, run: false }

export function readInput() {
  const useKeys = input.keyX !== 0 || input.keyY !== 0
  move.x = useKeys ? input.keyX : input.joyX
  move.y = useKeys ? input.keyY : input.joyY
  move.run = input.runTouch || input.runKey
  return move
}

export function bindKeyboard() {
  const held = new Set<string>()

  const recompute = () => {
    let x = 0
    let y = 0
    for (const code of held) {
      const d = KEY_DIRS[code]
      if (d) {
        x += d[0]
        y += d[1]
      }
    }
    const len = Math.hypot(x, y)
    input.keyX = len ? x / len : 0
    input.keyY = len ? y / len : 0
  }

  const onDown = (e: KeyboardEvent) => {
    if (e.key === 'Shift') input.runKey = true
    if (!e.repeat && e.code === 'KeyE') actions.use = true
    if (!e.repeat && e.code === 'KeyQ') actions.hack = true
    if (!e.repeat && e.code === 'KeyF') actions.hide = true
    if (!e.repeat && e.code === 'KeyG') actions.decoy = true
    if (e.code === 'Space') {
      e.preventDefault()
      input.breathKey = true
    }
    if (KEY_DIRS[e.code]) {
      e.preventDefault()
      held.add(e.code)
      recompute()
    }
  }
  const onUp = (e: KeyboardEvent) => {
    if (e.key === 'Shift') input.runKey = false
    if (e.code === 'Space') input.breathKey = false
    if (held.delete(e.code)) recompute()
  }
  const onBlur = () => {
    held.clear()
    input.runKey = false
    input.breathKey = false
    recompute()
  }

  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('blur', onBlur)
  return () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('blur', onBlur)
    onBlur()
  }
}
