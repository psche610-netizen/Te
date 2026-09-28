'use client'

import { PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import { LOCKER } from '@/lib/game/config'
import { lockerPoint } from '@/lib/game/hide'
import type { GameSession } from '@/lib/game/session'
import { useGameStore } from '@/lib/game/store'

/** Eye inside the locker door looking out. Mounted only while hidden; drei restores the iso camera on unmount. */
function SlitCamera({ session }: { session: GameSession }) {
  const cam = useRef<PerspectiveCameraImpl>(null)
  const view = useMemo(() => {
    const id = session.hide?.lockerId ?? 0
    const eye = lockerPoint(session.level, id, 0.4)
    const look = lockerPoint(session.level, id, 6)
    return { eye, look }
  }, [session])

  useLayoutEffect(() => {
    const c = cam.current
    if (!c) return
    c.position.set(view.eye.x, LOCKER.camera.eyeHeight, view.eye.z)
    c.lookAt(view.look.x, LOCKER.camera.eyeHeight - 0.1, view.look.z)
  }, [view])

  useFrame(({ clock }) => {
    const c = cam.current
    if (c) c.position.y = LOCKER.camera.eyeHeight + Math.sin(clock.elapsedTime * 1.6) * 0.012
  })

  return <PerspectiveCamera ref={cam} makeDefault fov={LOCKER.camera.fov} near={0.05} far={60} />
}

export function LockerCamera({ session }: { session: GameSession }) {
  const hidden = useGameStore((s) => s.hidden)
  return hidden && session.hide ? <SlitCamera session={session} /> : null
}
