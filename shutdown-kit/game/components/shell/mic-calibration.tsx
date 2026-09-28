'use client'

import { useState } from 'react'
import { MIC } from '@/lib/game/config'
import { calibrateMic, micLoudness, micReady, micRms, requestMic, stopMic } from '@/lib/game/mic'
import { useGameStore } from '@/lib/game/store'
import { MicMeter } from './mic-meter'

type Phase = 'intro' | 'requesting' | 'calibrating' | 'ready' | 'denied'

const PRIMARY =
  'pointer-events-auto h-12 w-44 border border-signal bg-signal text-sm tracking-label text-ink transition-colors hover:bg-bone hover:border-bone disabled:opacity-40 md:h-14 md:w-56 md:text-base'
const SECONDARY =
  'pointer-events-auto h-12 w-44 border border-bone text-sm tracking-label text-bone transition-colors hover:bg-bone hover:text-ink disabled:opacity-40 md:h-14 md:w-56 md:text-base'

export function MicCalibration() {
  const finish = useGameStore((s) => s.finishCalibration)
  const cancel = useGameStore((s) => s.cancelCalibration)
  const toSettings = useGameStore((s) => s.calibrateReturn === 'settings')
  const [phase, setPhase] = useState<Phase>(() => (micReady() ? 'ready' : 'intro'))
  const [secondsLeft, setSecondsLeft] = useState<number>(MIC.calibrationSeconds)

  const read = () => (phase === 'ready' ? micLoudness() : phase === 'calibrating' ? micRms() : 0)

  const useMic = async () => {
    setPhase('requesting')
    if (!(await requestMic())) {
      setPhase('denied')
      return
    }
    setSecondsLeft(MIC.calibrationSeconds)
    setPhase('calibrating')
    await calibrateMic((left) => setSecondsLeft(Math.ceil(left)))
    setPhase('ready')
  }

  const playWithoutMic = () => {
    stopMic()
    finish(false)
  }

  const status: Record<Phase, string> = {
    intro: 'YOUR MICROPHONE BECOMES NOISE IN THE FACILITY',
    requesting: 'AWAITING PERMISSION',
    calibrating: `STAY SILENT FOR ${secondsLeft} ${secondsLeft === 1 ? 'SECOND' : 'SECONDS'}`,
    ready: 'BASELINE RECORDED // SPEAK TO TEST',
    denied: 'MICROPHONE UNAVAILABLE // CHECK BROWSER PERMISSIONS',
  }

  return (
    <div className="absolute inset-0 overflow-y-auto bg-ink safe-area">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center gap-5 px-8 py-6 md:gap-8">
        <div className="flex w-full max-w-md items-center gap-4" role="presentation">
          <span className="h-px flex-1 bg-concrete" />
          <p className="text-xs tracking-label text-concrete md:text-sm">CALIBRATION</p>
          <span className="h-px flex-1 bg-concrete" />
        </div>

        <h1 className="text-balance text-center font-display text-5xl leading-none text-bone md:text-8xl">
          IT CAN HEAR YOU.
        </h1>

        <MicMeter bars={44} read={read} taper showThreshold className="mt-4 h-16 w-full md:h-28" />

        <p className="text-center text-xs tracking-label text-concrete md:text-base" aria-live="polite">
          {status[phase]}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {phase === 'ready' ? (
            <>
              <button type="button" className={PRIMARY} onClick={() => finish(true)}>
                {toSettings ? 'SAVE' : 'BEGIN NIGHT'}
              </button>
              <button type="button" className={SECONDARY} onClick={useMic}>
                RECALIBRATE
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={PRIMARY}
                disabled={phase === 'requesting' || phase === 'calibrating'}
                onClick={useMic}
              >
                {phase === 'denied' ? 'TRY AGAIN' : 'USE MIC'}
              </button>
              <button type="button" className={SECONDARY} disabled={phase === 'calibrating'} onClick={playWithoutMic}>
                PLAY WITHOUT MIC
              </button>
            </>
          )}
        </div>

        <div className="flex gap-6">
          {phase === 'ready' && (
            <button
              type="button"
              onClick={playWithoutMic}
              className="text-xs tracking-label text-concrete transition-colors hover:text-bone"
            >
              PLAY WITHOUT MIC
            </button>
          )}
          <button
            type="button"
            onClick={cancel}
            disabled={phase === 'calibrating'}
            className="text-xs tracking-label text-concrete transition-colors hover:text-bone disabled:opacity-40"
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  )
}
