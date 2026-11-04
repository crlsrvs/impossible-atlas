import { hashSeed } from './world'
import type { Archetype, Atmosphere, Vec3, WorldData } from './world'

export const CAMERA_VIEWS = ['orbit', 'closeup', 'zenith'] as const
export type CameraView = (typeof CAMERA_VIEWS)[number]

export const CAMERA_VIEW_LABELS: Record<CameraView, string> = {
  orbit: 'Vista orbital',
  closeup: 'Enfoque de anomalía',
  zenith: 'Vista cenital',
}

export interface CameraPose {
  position: Vec3
  target: Vec3
}

export function getCameraPose(world: WorldData, view: CameraView): CameraPose {
  if (view === 'zenith') {
    return {
      position: [0.01, 16.5, 4.2],
      target: [0, 0, 0],
    }
  }
  if (view === 'closeup') {
    switch (world.config.archetype) {
      case 'archipelago':
        return { position: [3.8, 3.1, 5.6], target: [0, 1.3, -0.2] }
      case 'planet':
        return { position: [5.4, 3.8, 6.2], target: [0, 0.6, 0] }
      case 'ocean':
        return { position: [4.6, 2.5, 5.8], target: [0, 0.9, -0.4] }
      case 'crystal':
        return { position: [4.2, 2.8, 5.5], target: [0, 0.8, 0] }
      case 'city':
        return { position: [5.1, 3.6, 6.1], target: [0, 1.1, 0] }
      case 'desert':
        return { position: [4.5, 2.7, 5.8], target: [0, 0.8, 0] }
      case 'jellyfish':
        return { position: [4.8, 2.9, 6.0], target: [0, 1.2, 0] }
      case 'volcano':
        return { position: [4.9, 3.4, 5.9], target: [0, 0.9, 0] }
    }
  }
  return {
    position: [9, 6.5, 11],
    target: [0, 0.1, 0],
  }
}

export interface SoundscapeParameters {
  rootHz: number
  chordRatios: readonly [number, number, number]
  shimmerHz: number
  filterCutoffHz: number
  lfoHz: number
  waveform: OscillatorType
}

const BASE_ROOTS: Record<Archetype, number> = {
  archipelago: 146.83, // D3
  planet: 164.81, // E3
  ocean: 130.81, // C3
  crystal: 196.0, // G3
  city: 174.61, // F3
  desert: 155.56, // D#3
  jellyfish: 185.0, // F#3
  volcano: 110.0, // A2
}

const ATMOSPHERE_CHORDS: Record<Atmosphere, readonly [number, number, number]> = {
  dusk: [1, 1.5, 1.875], // Root, 5th, Maj7
  dawn: [1, 1.25, 1.5], // Major triad
  nebula: [1, 1.333, 1.778], // Quartal suspended
}

const WAVEFORMS: Record<Archetype, OscillatorType> = {
  archipelago: 'sine',
  planet: 'triangle',
  ocean: 'sine',
  crystal: 'triangle',
  city: 'sine',
  desert: 'triangle',
  jellyfish: 'sine',
  volcano: 'sawtooth',
}

export function computeSoundscape(world: WorldData): SoundscapeParameters {
  const { config } = world
  const seedOffset = ((hashSeed(config.seed) % 9) - 4) * 1.2
  const rootHz = Number((BASE_ROOTS[config.archetype] + seedOffset).toFixed(2))
  const chordRatios = ATMOSPHERE_CHORDS[config.atmosphere]
  const shimmerMultiplier = 2 + (config.surrealism / 100) * 1.5
  const shimmerHz = Number((rootHz * shimmerMultiplier).toFixed(2))
  const filterCutoffHz = Math.round(
    260 + config.lightIntensity * 5.2 + (config.archetype === 'crystal' ? 280 : 0),
  )
  const lfoHz = Number((0.06 + (config.animationSpeed / 100) * 0.28).toFixed(3))
  return {
    rootHz,
    chordRatios,
    shimmerHz,
    filterCutoffHz,
    lfoHz,
    waveform: WAVEFORMS[config.archetype],
  }
}

export class AmbientSoundscape {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private lfo: OscillatorNode | null = null
  private oscillators: OscillatorNode[] = []
  private active = false

  start(world: WorldData, muted = false): boolean {
    if (typeof window === 'undefined') return false
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return false

    try {
      if (!this.ctx) {
        this.ctx = new AudioCtx()
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume()
      }
      this.stopNodes()

      const params = computeSoundscape(world)
      const now = this.ctx.currentTime

      const master = this.ctx.createGain()
      master.gain.setValueAtTime(0.0001, now)
      master.gain.exponentialRampToValueAtTime(muted ? 0.0001 : 0.065, now + 0.8)

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(params.filterCutoffHz, now)
      filter.Q.setValueAtTime(1.2, now)

      const lfo = this.ctx.createOscillator()
      const lfoGain = this.ctx.createGain()
      lfo.frequency.setValueAtTime(params.lfoHz, now)
      lfoGain.gain.setValueAtTime(75, now)
      lfo.connect(lfoGain)
      lfoGain.connect(filter.frequency)
      lfo.start(now)

      const oscs: OscillatorNode[] = []
      params.chordRatios.forEach((ratio, index) => {
        const osc = this.ctx!.createOscillator()
        const voiceGain = this.ctx!.createGain()
        osc.type = index === 0 ? params.waveform : 'sine'
        osc.frequency.setValueAtTime(params.rootHz * ratio, now)
        osc.detune.setValueAtTime((index - 1) * 4.5, now)
        voiceGain.gain.setValueAtTime(index === 0 ? 0.45 : 0.25, now)
        osc.connect(voiceGain)
        voiceGain.connect(filter)
        osc.start(now)
        oscs.push(osc)
      })

      const shimmer = this.ctx.createOscillator()
      const shimmerGain = this.ctx.createGain()
      shimmer.type = 'sine'
      shimmer.frequency.setValueAtTime(params.shimmerHz, now)
      shimmerGain.gain.setValueAtTime(0.07, now)
      shimmer.connect(shimmerGain)
      shimmerGain.connect(filter)
      shimmer.start(now)
      oscs.push(shimmer)

      filter.connect(master)
      master.connect(this.ctx.destination)

      this.master = master
      this.filter = filter
      this.lfo = lfo
      this.oscillators = oscs
      this.active = true
      return true
    } catch {
      return false
    }
  }

  update(world: WorldData, muted = false): void {
    if (!this.active || !this.ctx || !this.master || !this.filter) return
    const params = computeSoundscape(world)
    const now = this.ctx.currentTime
    this.master.gain.setTargetAtTime(muted ? 0.0001 : 0.065, now, 0.25)
    this.filter.frequency.setTargetAtTime(params.filterCutoffHz, now, 0.3)
    if (this.lfo) {
      this.lfo.frequency.setTargetAtTime(params.lfoHz, now, 0.3)
    }
    params.chordRatios.forEach((ratio, index) => {
      const osc = this.oscillators[index]
      if (osc) {
        osc.type = index === 0 ? params.waveform : 'sine'
        osc.frequency.setTargetAtTime(params.rootHz * ratio, now, 0.35)
      }
    })
    const shimmer = this.oscillators[3]
    if (shimmer) {
      shimmer.frequency.setTargetAtTime(params.shimmerHz, now, 0.35)
    }
  }

  private stopNodes(): void {
    for (const osc of this.oscillators) {
      try {
        osc.stop()
        osc.disconnect()
      } catch {
        /* already stopped */
      }
    }
    this.oscillators = []
    if (this.lfo) {
      try {
        this.lfo.stop()
        this.lfo.disconnect()
      } catch {
        /* already stopped */
      }
      this.lfo = null
    }
    if (this.filter) {
      this.filter.disconnect()
      this.filter = null
    }
    if (this.master) {
      this.master.disconnect()
      this.master = null
    }
  }

  stop(): void {
    this.active = false
    this.stopNodes()
  }

  dispose(): void {
    this.stop()
    if (this.ctx) {
      void this.ctx.close().catch(() => {})
      this.ctx = null
    }
  }
}
