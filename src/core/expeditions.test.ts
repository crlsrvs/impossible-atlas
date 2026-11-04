import { describe, expect, it } from 'vitest'
import { ARCHETYPES, ATMOSPHERES, DEFAULT_CONFIG, generateWorld, mutateWorld } from './world'
import { CAMERA_VIEWS, computeSoundscape, getCameraPose } from './audio'

describe('new expeditions', () => {
  it.each(['city', 'desert', 'jellyfish', 'volcano'] as const)(
    '%s has bounded, finite and reproducible features',
    (archetype) => {
      for (const seed of ['ATLAS-0742', 'expedition-one', 'expedition-two']) {
        const config = { ...DEFAULT_CONFIG, archetype, seed, density: 100, surrealism: 100 }
        const world = generateWorld(config)
        expect(world.features?.length).toBeGreaterThan(0)
        expect(world.features!.length).toBeLessThan(24)
        for (const feature of world.features!) {
          expect(feature.position.every(Number.isFinite)).toBe(true)
          expect(feature.rotation.every(Number.isFinite)).toBe(true)
          expect(
            feature.scale.every((value) => Number.isFinite(value) && value > 0 && value <= 5),
          ).toBe(true)
          expect(Number.isFinite(feature.phase)).toBe(true)
        }
        expect(generateWorld(config)).toEqual(world)
        const mutated = generateWorld(mutateWorld(config))
        expect(
          mutated.features?.map(({ kind, position, scale }) => ({ kind, position, scale })),
        ).toEqual(world.features?.map(({ kind, position, scale }) => ({ kind, position, scale })))
      }
    },
  )
  it('gives each new family its own principal feature', () => {
    for (const [archetype, kind] of [
      ['city', 'tower'],
      ['desert', 'hourglass'],
      ['jellyfish', 'jellyfish'],
      ['volcano', 'volcano'],
    ] as const) {
      expect(
        generateWorld({ ...DEFAULT_CONFIG, archetype }).features?.some(
          (feature) => feature.kind === kind,
        ),
      ).toBe(true)
    }
  })
  it.each(ARCHETYPES)(
    'computes finite camera poses and deterministic soundscape parameters for %s',
    (archetype) => {
      for (const atmosphere of ATMOSPHERES) {
        const world = generateWorld({ ...DEFAULT_CONFIG, archetype, atmosphere })
        const soundscape = computeSoundscape(world)
        expect(soundscape).toEqual(computeSoundscape(world))
        expect(soundscape.rootHz).toBeGreaterThan(80)
        expect(soundscape.shimmerHz).toBeGreaterThan(soundscape.rootHz)
        expect(soundscape.filterCutoffHz).toBeGreaterThan(200)
        expect(soundscape.lfoHz).toBeGreaterThan(0)
        for (const view of CAMERA_VIEWS) {
          const pose = getCameraPose(world, view)
          expect(pose.position.every(Number.isFinite)).toBe(true)
          expect(pose.target.every(Number.isFinite)).toBe(true)
        }
      }
    },
  )
})
