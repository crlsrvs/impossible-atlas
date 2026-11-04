import { describe, expect, it } from 'vitest'
import {
  ARCHETYPES,
  createRandom,
  DEFAULT_CONFIG,
  CUSTOMIZATION_DEFAULTS,
  CUSTOMIZATION_PARAMETERS,
  generateWorld,
  hashSeed,
  mutateWorld,
  normalizeConfig,
  PALETTES,
  resolvePalette,
  randomizeWorld,
} from './world'

describe('procedural engine', () => {
  it('replays the PRNG exactly with the same seed', () => {
    const a = createRandom('a')
    const b = createRandom('a')
    expect(Array.from({ length: 50 }, a)).toEqual(Array.from({ length: 50 }, b))
  })
  it('has a stable PRNG reference sequence to detect accidental generator changes', () => {
    const random = createRandom('atlas-v1')
    expect(Array.from({ length: 4 }, random)).toMatchInlineSnapshot(`
      [
        0.09938953653909266,
        0.9074591824319214,
        0.7177861598320305,
        0.7368514339905232,
      ]
    `)
  })
  it.each(ARCHETYPES)(
    '%s is deterministic, finite, bounded, and has two real anomalies',
    (archetype) => {
      const config = { ...DEFAULT_CONFIG, archetype }
      const a = generateWorld(config)
      expect(a).toEqual(generateWorld(config))
      expect(a.anomalies.length).toBeGreaterThanOrEqual(2)
      expect(a.plants.length).toBeLessThan(100)
      expect(a.particles.length).toBeLessThanOrEqual(95)
      expect(a.name.length).toBeGreaterThan(8)
      for (const item of [...a.plants, ...a.rocks, ...a.monuments]) {
        expect(item.position.every(Number.isFinite)).toBe(true)
        expect(item.rotation.every(Number.isFinite)).toBe(true)
        expect(item.scale).toBeGreaterThan(0)
      }
      a.anomalies.forEach((anomaly) => expect(a.description).toContain(anomaly))
    },
  )
  it.each(ARCHETYPES)(
    '%s provides three structural variants and perceptible seed changes',
    (archetype) => {
      const worlds = Array.from({ length: 40 }, (_, i) =>
        generateWorld({ ...DEFAULT_CONFIG, seed: `seed-${i}`, archetype }),
      )
      expect(new Set(worlds.map((world) => world.variant)).size).toBe(3)
      expect(new Set(worlds.map((world) => JSON.stringify(world.plants))).size).toBe(40)
    },
  )
  it('normalizes hostile input without NaN or extreme density', () => {
    const config = normalizeConfig({
      seed: '',
      density: Infinity,
      surrealism: -900,
      archetype: 'unknown',
      palette: null,
    })
    expect(config).toMatchObject({
      seed: DEFAULT_CONFIG.seed,
      density: 55,
      surrealism: 0,
      archetype: 'archipelago',
      palette: 'auto',
    })
    expect(normalizeConfig({ density: 500, surrealism: NaN })).toMatchObject({
      density: 100,
      surrealism: 65,
    })
    expect(normalizeConfig(null)).toBeDefined()
    expect(normalizeConfig({ seed: 'x'.repeat(200) }).seed.length).toBe(72)
  })
  it('preserves composition and palette when mutating, but changes details', () => {
    const config = { ...DEFAULT_CONFIG, palette: 'auto' as const }
    const next = mutateWorld(config)
    const a = generateWorld(config)
    const b = generateWorld(next)
    expect(next.archetype).toBe(config.archetype)
    expect(a.islands).toEqual(b.islands)
    expect(a.rings).toEqual(b.rings)
    expect(a.name).toBe(b.name)
    expect(a.paletteId).toBe(b.paletteId)
    expect(a.plants).not.toEqual(b.plants)
    expect(mutateWorld(next).seed).toBe(`${config.seed}~2`)
  })
  it('distributes alien vegetation directly on the planet surface', () => {
    const world = generateWorld({ ...DEFAULT_CONFIG, archetype: 'planet' })
    world.plants.forEach((plant) => expect(Math.hypot(...plant.position)).toBeCloseTo(2.4, 9))
  })
  it('preserves the composition when mutating long seeds or seeds with a tilde', () => {
    for (const seed of ['x'.repeat(200), 'a~garden', 'a~99']) {
      const config = normalizeConfig({ ...DEFAULT_CONFIG, seed })
      const next = mutateWorld(config)
      expect(generateWorld(config).islands).toEqual(generateWorld(next).islands)
      expect(generateWorld(config).name).toBe(generateWorld(next).name)
      expect(generateWorld(config).plants).not.toEqual(generateWorld(next).plants)
    }
  })
  it.each(ARCHETYPES)('%s responds to density and surrealism within safe budgets', (archetype) => {
    const sparse = generateWorld({ ...DEFAULT_CONFIG, archetype, density: 0, surrealism: 0 })
    const dense = generateWorld({ ...DEFAULT_CONFIG, archetype, density: 100, surrealism: 100 })
    expect(dense.plants.length).toBeGreaterThan(sparse.plants.length)
    expect(dense).not.toEqual(sparse)
    expect(dense.plants.length).toBeLessThan(100)
    expect(dense.islands.length).toBeLessThan(8)
  })
  it('supports every palette with reproducible auto selection', () => {
    PALETTES.forEach((palette) =>
      expect(generateWorld({ ...DEFAULT_CONFIG, palette }).paletteId).toBe(palette),
    )
    const config = { ...DEFAULT_CONFIG, palette: 'auto' as const }
    expect(resolvePalette(config)).toBe(resolvePalette(config))
  })
})

describe('world customization', () => {
  const legacyFingerprints = {
    archipelago: 1211261556,
    planet: 1191565668,
    ocean: 1735062756,
    crystal: 466180155,
  }
  it.each(['archipelago', 'planet', 'ocean', 'crystal'] as const)(
    'preserves the original %s geometry with neutral defaults',
    (archetype) => {
      const world = generateWorld(
        normalizeConfig({ ...DEFAULT_CONFIG, archetype, schemaVersion: 1 }),
      )
      const data = { ...world } as Partial<typeof world>
      delete data.config
      expect(hashSeed(JSON.stringify(data))).toBe(legacyFingerprints[archetype])
    },
  )
  it.each(ARCHETYPES)(
    'applies composition, vegetation, fragments and particles to %s',
    (archetype) => {
      const base = generateWorld({ ...DEFAULT_CONFIG, archetype })
      const custom = generateWorld({
        ...DEFAULT_CONFIG,
        archetype,
        vegetationSize: 100,
        fragmentSize: 0,
        particleDensity: 0,
      })
      expect(custom.plants.map((item) => item.position)).toEqual(
        base.plants.map((item) => item.position),
      )
      custom.plants.forEach((item, i) => expect(item.scale).toBeCloseTo(base.plants[i].scale * 1.5))
      custom.rocks.forEach((item, i) => expect(item.scale).toBeCloseTo(base.rocks[i].scale * 0.5))
      expect(custom.particles).toEqual([])
      expect(
        generateWorld({ ...DEFAULT_CONFIG, archetype, particleDensity: 100, density: 100 })
          .particles.length,
      ).toBeLessThanOrEqual(190)
      for (const [i, composition] of (['minimal', 'balanced', 'complex'] as const).entries()) {
        expect(generateWorld({ ...DEFAULT_CONFIG, archetype, composition }).variant).toBe(i)
      }
    },
  )
  it('normalizes every added numeric field and invalid composition', () => {
    for (const key of CUSTOMIZATION_PARAMETERS) {
      expect(normalizeConfig({ ...DEFAULT_CONFIG, [key]: Infinity })[key]).toBe(50)
      expect(normalizeConfig({ ...DEFAULT_CONFIG, [key]: -10 })[key]).toBe(0)
      expect(normalizeConfig({ ...DEFAULT_CONFIG, [key]: 900 })[key]).toBe(100)
    }
    expect(normalizeConfig({ ...DEFAULT_CONFIG, composition: 'invalid' }).composition).toBe('auto')
  })
  it('randomizes all editable properties reproducibly and stays in safe ranges', () => {
    const configs = Array.from({ length: 80 }, (_, i) => randomizeWorld(`random-${i}`))
    expect(randomizeWorld('same')).toEqual(randomizeWorld('same'))
    for (const key of [
      'archetype',
      'palette',
      'atmosphere',
      'composition',
      'density',
      'surrealism',
      ...CUSTOMIZATION_PARAMETERS,
    ] as const) {
      expect(new Set(configs.map((config) => config[key])).size).toBeGreaterThan(1)
    }
    configs.forEach((config) => {
      expect(normalizeConfig(config)).toEqual(config)
      expect(config.palette).not.toBe('auto')
      expect(config.composition).not.toBe('auto')
      for (const key of CUSTOMIZATION_PARAMETERS) {
        expect(config[key]).toBeGreaterThanOrEqual(0)
        expect(config[key]).toBeLessThanOrEqual(100)
      }
      expect(generateWorld(config)).toEqual(generateWorld(config))
    })
  })
  it('keeps all customization values during mutation', () => {
    const config = randomizeWorld('custom-mutation')
    expect(mutateWorld(config)).toMatchObject(
      Object.fromEntries(
        Object.keys(CUSTOMIZATION_DEFAULTS).map((key) => [
          key,
          config[key as keyof typeof CUSTOMIZATION_DEFAULTS],
        ]),
      ),
    )
  })
})
