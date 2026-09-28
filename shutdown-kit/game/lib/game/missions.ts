import type { GameSession } from './session'

export type MissionKind = 'restore' | 'relay' | 'overload'
export const MISSIONS = {
  restore: { title: 'CUT THE FEED', count: 3, brief: 'Restore three generators in any order. Each repair cuts camera power for 12 seconds. Use that window to move.', verb: 'RESTORE' },
  relay: { title: 'BREAK THE CIRCUIT', count: 3, brief: 'Connect three relays in sequence. Only the marked relay is active. Each connection restores one hack charge; the facility shifts after every connection.', verb: 'CONNECT' },
  overload: { title: 'TRIGGER THE COLLAPSE', count: 4, brief: 'Overload four generators in any order. Each one broadcasts your position and accelerates the next shift. Finish, then reach an exit before lockdown.', verb: 'OVERLOAD' },
} as const
export function missionForNight(night: number): MissionKind {
  return night <= 1 ? 'restore' : night === 2 ? 'relay' : 'overload'
}
export function generatorAvailable(s: GameSession, id: number) {
  return !s.generators[id].repaired && (s.mission !== 'relay' || s.order[s.repaired] === id)
}
