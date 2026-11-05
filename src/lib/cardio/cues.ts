import type { TimelineState } from "./timeline"

export type Cue = "phase" | "tick" | "end"

function secondsLeft(ms: number): number {
  return Math.ceil(ms / 1000)
}

export function detectCue(prev: TimelineState | null, next: TimelineState): Cue | null {
  if (prev === null) return null

  if (next.kind === "phased" && prev.kind === "phased") {
    if (next.finished && !prev.finished) return "end"
    if (next.finished) return null
    if (next.phaseIndex !== prev.phaseIndex) return "phase"
    const before = secondsLeft(prev.phaseRemainingMs)
    const after = secondsLeft(next.phaseRemainingMs)
    if (after !== before && after >= 1 && after <= 3) return "tick"
    return null
  }

  if (next.kind === "countdown" && prev.kind === "countdown") {
    if (next.finished && !prev.finished) return "end"
    if (next.finished) return null
    const before = secondsLeft(prev.totalRemainingMs)
    const after = secondsLeft(next.totalRemainingMs)
    if (after !== before && after >= 1 && after <= 3) return "tick"
    return null
  }

  return null
}

let audioContext: AudioContext | null = null

type AudioSessionLike = { type: string }

function getAudioSession(): AudioSessionLike | null {
  if (typeof navigator === "undefined" || !("audioSession" in navigator)) return null
  return (navigator as unknown as { audioSession: AudioSessionLike }).audioSession
}

export function unlockAudio(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    if (!audioContext) audioContext = new Ctor()
    if (audioContext.state !== "running") void audioContext.resume()
    // iOS : "ambient" se mélange à la musique de l'utilisateur (Musique, Spotify…) au lieu de
    // l'interrompre. Contrepartie : l'interrupteur silencieux coupe les bips (la vibration reste).
    // Ne PAS remettre "playback" : cette catégorie est exclusive et coupe la musique.
    const session = getAudioSession()
    if (session) session.type = "ambient"
  } catch {
    // audio indisponible : la séance continue sans son
  }
}

// À appeler en quittant la séance : sans ça, le contexte audio (variable de module, donc conservé
// d'une page à l'autre dans la PWA) garde la session audio prise tant que l'app n'est pas fermée.
export function releaseAudio(): void {
  try {
    const session = getAudioSession()
    if (session) session.type = "auto"
    const ctx = audioContext
    audioContext = null
    if (ctx && ctx.state !== "closed") void ctx.close().catch(() => {})
  } catch {
    // ignoré
  }
}

function beep(frequency: number, durationSeconds: number): void {
  if (!audioContext) return
  try {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.frequency.value = frequency
    const t = audioContext.currentTime
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + durationSeconds)
    oscillator.start(t)
    oscillator.stop(t + durationSeconds)
  } catch {
    // ignoré
  }
}

export function playCue(cue: Cue): void {
  if (cue === "tick") beep(660, 0.1)
  else if (cue === "phase") beep(880, 0.2)
  else beep(880, 0.7)

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(cue === "end" ? [300, 100, 300] : cue === "phase" ? 150 : 40)
  }
}

export async function requestWakeLock(): Promise<(() => void) | null> {
  try {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return null
    const sentinel = await navigator.wakeLock.request("screen")
    return () => {
      void sentinel.release().catch(() => {})
    }
  } catch {
    return null
  }
}
