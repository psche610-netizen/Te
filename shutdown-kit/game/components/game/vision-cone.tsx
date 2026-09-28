'use client'

import { useCallback } from 'react'
import { HUNTER } from '@/lib/game/config'
import { viewAngle, type HunterMode, type HunterState } from '@/lib/game/hunter'
import type { LevelData } from '@/lib/game/level/types'
import { FanCone, type FanState } from './fan-cone'

export const HALF_FOV = ((HUNTER.visionAngleDeg / 2) * Math.PI) / 180

export const CONE_OPACITY: Record<HunterMode, number> = {
  patrol: 0.16,
  search: 0.2,
  suspicious: 0.26,
  investigate: 0.26,
  chase: 0.36,
  stunned: 0,
}

export function VisionCone({ hunter: h, level }: { hunter: HunterState; level: LevelData }) {
  const read = useCallback(
    (out: FanState) => {
      out.x = h.x
      out.z = h.z
      out.angle = viewAngle(h)
      out.opacity = CONE_OPACITY[h.mode]
    },
    [h],
  )
  return <FanCone level={level} range={h.profile.visionRange} halfFov={h.profile.halfFov} read={read} />
}
