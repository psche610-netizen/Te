'use client'

import { useEffect, useState } from 'react'
import { enterFullscreenLandscape, exitFullscreen } from '@/lib/game/fullscreen'

export function FullscreenButton() {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  return (
    <button
      type="button"
      onClick={() => (fullscreen ? exitFullscreen() : enterFullscreenLandscape())}
      className="pointer-events-auto border border-concrete px-3 py-2 text-xs tracking-label text-bone transition-colors hover:border-bone focus-visible:outline-1"
    >
      {fullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
    </button>
  )
}
