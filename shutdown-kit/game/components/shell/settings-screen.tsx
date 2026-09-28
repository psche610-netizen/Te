'use client'

import { useState } from 'react'
import { micReady, stopMic } from '@/lib/game/mic'
import { useGameStore, type Settings } from '@/lib/game/store'
import { BTN_GHOST } from './styles'

function Toggle({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-concrete py-2 md:py-4">
      <div>
        <p className="text-sm tracking-label text-bone md:text-lg">{label}</p>
        <p className="text-[10px] tracking-label text-concrete md:text-xs">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className="pointer-events-auto flex h-9 w-28 shrink-0 border border-bone text-xs tracking-label focus-visible:outline-1 focus-visible:outline-bone"
      >
        <span className={`flex flex-1 items-center justify-center ${on ? 'bg-signal text-ink' : 'text-concrete'}`}>ON</span>
        <span className={`flex flex-1 items-center justify-center ${on ? 'text-concrete' : 'bg-bone text-ink'}`}>OFF</span>
      </button>
    </div>
  )
}

/** Settings: mic on/off + recalibrate, sound, haptics, reset save. */
export function SettingsScreen() {
  const settings = useGameStore((s) => s.settings)
  const update = useGameStore((s) => s.updateSettings)
  const setScreen = useGameStore((s) => s.setScreen)
  const openCalibration = useGameStore((s) => s.openCalibration)
  const resetSave = useGameStore((s) => s.resetSave)
  const [confirmReset, setConfirmReset] = useState(false)

  const setMic = (on: boolean) => {
    if (on) {
      openCalibration('settings')
      return
    }
    stopMic()
    update({ micEnabled: false })
  }

  const set = (key: keyof Omit<Settings, 'micEnabled'>) => (on: boolean) => update({ [key]: on })

  return (
    <div className="absolute inset-0 overflow-y-auto bg-ink safe-area">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-2 p-4 md:gap-4 md:p-8">
        <div className="flex items-end justify-between border-b border-concrete pb-2">
          <h1 className="font-display text-4xl leading-none text-bone md:text-6xl">SETTINGS</h1>
          <button type="button" className={BTN_GHOST} onClick={() => setScreen('title')}>
            {'\u2190 BACK'}
          </button>
        </div>

        <Toggle
          label="MICROPHONE"
          hint={
            settings.micEnabled
              ? micReady()
                ? 'LIVE // YOUR VOICE IS NOISE'
                : 'ON // RECALIBRATES BEFORE THE NEXT NIGHT'
              : 'OFF // NOISE FROM ACTIONS ONLY'
          }
          on={settings.micEnabled}
          onChange={setMic}
        />
        {settings.micEnabled && (
          <button type="button" className={`${BTN_GHOST} self-start`} onClick={() => openCalibration('settings')}>
            {'RECALIBRATE \u2192'}
          </button>
        )}
        <Toggle label="SOUND" hint="SHIFT KLAXON AND SFX" on={settings.sound} onChange={set('sound')} />
        <Toggle label="HAPTICS" hint="VIBRATION ON SUPPORTED DEVICES" on={settings.haptics} onChange={set('haptics')} />

        <div className="mt-auto flex items-center justify-between gap-4 pt-2">
          <p className="text-[10px] tracking-label text-concrete">{'SAVE FILE // STORED ON THIS DEVICE'}</p>
          {confirmReset ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  resetSave()
                  setConfirmReset(false)
                }}
                className="pointer-events-auto border border-danger px-3 py-2 text-xs tracking-label text-danger transition-colors hover:bg-danger hover:text-ink"
              >
                CONFIRM ERASE
              </button>
              <button type="button" className={BTN_GHOST} onClick={() => setConfirmReset(false)}>
                CANCEL
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="pointer-events-auto border border-concrete px-3 py-2 text-xs tracking-label text-concrete transition-colors hover:border-bone hover:text-bone"
            >
              RESET SAVE
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
