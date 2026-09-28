import { MIC } from './config'

let stream: MediaStream | null = null
let ctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let buf: Float32Array<ArrayBuffer> | null = null
let baseline = 0
let calibrated = false

export function micReady() {
  return analyser !== null && stream !== null && stream.active && calibrated
}

/**
 * Ask for the mic and wire an AnalyserNode. Call from a click handler: the AudioContext is
 * created before the first await so it starts inside the user gesture.
 */
export async function requestMic(): Promise<boolean> {
  if (analyser && stream?.active) return true
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false
  try {
    ctx = new AudioContext()
    void ctx.resume()
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    const source = ctx.createMediaStreamSource(stream)
    analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)
    buf = new Float32Array(analyser.fftSize)
    return true
  } catch {
    stopMic()
    return false
  }
}

/** Raw RMS of the latest audio frame, 0..1. */
export function micRms() {
  if (!analyser || !buf) return 0
  analyser.getFloatTimeDomainData(buf)
  let sum = 0
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
  return Math.sqrt(sum / buf.length)
}

/** Level above the calibrated room baseline. */
export function micLoudness() {
  return Math.max(0, micRms() - baseline)
}

/** Sample the room for `MIC.calibrationSeconds` and set the baseline. */
export function calibrateMic(onTick: (secondsLeft: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const samples: number[] = []
    const total = MIC.calibrationSeconds * 1000
    const start = performance.now()
    const id = window.setInterval(() => {
      samples.push(micRms())
      const elapsed = performance.now() - start
      onTick(Math.max(0, (total - elapsed) / 1000))
      if (elapsed < total) return
      window.clearInterval(id)
      samples.sort((a, b) => a - b)
      baseline = (samples[Math.floor(samples.length * 0.9)] ?? 0) + MIC.baselineMargin
      calibrated = true
      resolve()
    }, 50)
  })
}

export function stopMic() {
  stream?.getTracks().forEach((t) => t.stop())
  void ctx?.close().catch(() => {})
  stream = null
  ctx = null
  analyser = null
  buf = null
  baseline = 0
  calibrated = false
}

/** 0..1 meter fill. Square-root scale so quiet sounds still register. */
export function meterFill(level: number) {
  return Math.sqrt(Math.min(1, Math.max(0, level) / MIC.fullScale))
}
