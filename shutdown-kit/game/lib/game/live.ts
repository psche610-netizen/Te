import type { GameSession } from './session'

/**
 * Read-only handle for HTML overlays that need per-frame values (meters, needles)
 * without pushing them through the store. Set and cleared by `GameScene`.
 */
export const live: { session: GameSession | null } = { session: null }
