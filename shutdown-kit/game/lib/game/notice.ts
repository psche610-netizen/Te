import { OBJECTIVES } from './config'
import type { GameSession } from './session'

export function notify(s: GameSession, text: string) {
  s.notice = { text, id: (s.notice?.id ?? 0) + 1 }
  s.noticeTimer = OBJECTIVES.noticeTime
}
