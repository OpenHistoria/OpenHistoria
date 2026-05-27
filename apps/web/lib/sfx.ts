"use client"

/**
 * Tiny Web-Audio synth so we get satisfying click/chime/alert sounds without
 * shipping any audio assets. Everything is generated on demand and gated on
 * a `muted` flag persisted in localStorage so the player can shut it up.
 *
 * Each cue is a short envelope-shaped sine/triangle blip. We never schedule
 * multiple voices at once because the cues are too short to overlap and we
 * never auto-replay (no music, no looping).
 */

const STORAGE_KEY = "openhistoria:sfx-muted"

let sharedCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (sharedCtx) return sharedCtx
  // AudioContext requires a user gesture on most browsers; first play() call
  // happens inside an event handler so this is safe.
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextCtor) return null
    sharedCtx = new AudioContextCtor()
    return sharedCtx
  } catch {
    return null
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return
  try {
    if (muted) window.localStorage.setItem(STORAGE_KEY, "1")
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // best-effort
  }
}

interface Tone {
  freq: number
  duration: number
  type?: OscillatorType
  /** Peak gain on the envelope, 0..1. */
  peak?: number
  /** Optional pitch-glide endpoint. */
  toFreq?: number
}

function playSequence(tones: readonly Tone[]): void {
  if (isMuted()) return
  const audio = ctx()
  if (!audio) return
  // Resume the context on first interaction-driven call.
  if (audio.state === "suspended") {
    void audio.resume()
  }
  let cursor = audio.currentTime
  for (const tone of tones) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = tone.type ?? "sine"
    osc.frequency.setValueAtTime(tone.freq, cursor)
    if (tone.toFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, tone.toFreq),
        cursor + tone.duration
      )
    }
    const peak = tone.peak ?? 0.12
    gain.gain.setValueAtTime(0.0001, cursor)
    gain.gain.exponentialRampToValueAtTime(peak, cursor + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, cursor + tone.duration)
    osc.connect(gain).connect(audio.destination)
    osc.start(cursor)
    osc.stop(cursor + tone.duration + 0.02)
    cursor += tone.duration
  }
}

export const sfx = {
  click: () =>
    playSequence([{ freq: 600, duration: 0.07, type: "triangle", peak: 0.08 }]),
  chime: () =>
    playSequence([
      { freq: 660, duration: 0.12 },
      { freq: 990, duration: 0.18 },
    ]),
  alert: () =>
    playSequence([
      { freq: 440, duration: 0.12, type: "square", peak: 0.1 },
      { freq: 330, duration: 0.18, type: "square", peak: 0.1 },
    ]),
  achievement: () =>
    playSequence([
      { freq: 523, duration: 0.1 },
      { freq: 659, duration: 0.1 },
      { freq: 784, duration: 0.18 },
    ]),
  swoosh: () =>
    playSequence([
      { freq: 200, duration: 0.18, type: "sine", peak: 0.08, toFreq: 60 },
    ]),
}
