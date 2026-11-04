import { describe, expect, it } from 'vitest'
import { ARCHETYPES, DEFAULT_CONFIG, generateWorld, randomizeWorld } from './world'
import {
  configKey,
  createFavorite,
  createHistory,
  exportFavoritesJson,
  filterFavorites,
  importFavoritesJson,
  isValidArchetypeFilter,
  MAX_HISTORY,
  parseWorld,
  pushHistory,
  readFavorites,
  readQualityProfile,
  serializeWorld,
  stepHistory,
  STORAGE_KEY,
  writeFavorites,
  writeQualityProfile,
} from './storage'
import type { StorageLike } from './storage'

function memoryStorage(): StorageLike {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
  }
}
describe('versioned sharing', () => {
  it.each(ARCHETYPES)('round-trips the complete %s world through the URL', (archetype) => {
    const config = { ...DEFAULT_CONFIG, archetype, seed: 'espacio + & ñ / ~1' }
    const result = parseWorld(`?${serializeWorld(config)}`)
    expect(result.warning).toBeUndefined()
    expect(result.config).toEqual(config)
    expect(generateWorld(result.config!)).toEqual(generateWorld(config))
  })
  it('rejects an unknown or missing generator version', () => {
    expect(parseWorld('?v=99&seed=a').config).toBeUndefined()
    expect(parseWorld('?seed=a').warning).toBeTruthy()
    expect(parseWorld('')).toEqual({})
  })
  it('recovers invalid parameters with visible warnings', () => {
    const result = parseWorld('?v=1&density=999&surrealism=NaN&type=broken')
    expect(result.config?.density).toBe(100)
    expect(result.config?.surrealism).toBe(65)
    expect(result.config?.archetype).toBe('archipelago')
    expect(result.warning).toBeTruthy()
  })
  it('round-trips every randomized customization parameter', () => {
    const config = randomizeWorld('custom-url')
    expect(parseWorld(`?${serializeWorld(config)}`)).toEqual({ config, warning: undefined })
  })
  it('loads legacy URLs with neutral customization without a warning', () => {
    const legacy =
      '?v=1&seed=ATLAS-0742&type=archipelago&palette=pastel&surrealism=65&density=55&atmosphere=dusk'
    expect(parseWorld(legacy)).toEqual({ config: DEFAULT_CONFIG, warning: undefined })
  })
  it('normalizes corrupt custom properties in v2 links and warns', () => {
    const params = new URLSearchParams(serializeWorld(DEFAULT_CONFIG))
    params.set('vegetationSize', '999')
    params.set('animationSpeed', 'NaN')
    params.set('composition', 'broken')
    const result = parseWorld(`?${params}`)
    expect(result.config).toMatchObject({
      vegetationSize: 100,
      animationSpeed: 50,
      composition: 'auto',
    })
    expect(result.warning).toBeTruthy()
  })
})
describe('favorites', () => {
  it('persists and restores complete world configurations', () => {
    const storage = memoryStorage()
    const favorite = createFavorite(generateWorld(DEFAULT_CONFIG))
    expect(writeFavorites(storage, [favorite])).toBeUndefined()
    const loaded = readFavorites(storage)
    expect(loaded.favorites).toEqual([favorite])
    expect(configKey(loaded.favorites[0].config)).toBe(favorite.id)
    writeFavorites(storage, [])
    expect(readFavorites(storage).favorites).toEqual([])
  })
  it('handles corrupt JSON, invalid shapes and incompatible versions', () => {
    const storage = memoryStorage()
    for (const raw of ['{bad', '{}', '[null,1,{}, {"name":"old","config":{"schemaVersion":99}}]']) {
      storage.setItem(STORAGE_KEY, raw)
      expect(readFavorites(storage).favorites).toEqual([])
      expect(readFavorites(storage).warning).toBeTruthy()
    }
  })
  it('recovers valid entries and deduplicates normalized configurations', () => {
    const storage = memoryStorage()
    const valid = createFavorite(generateWorld(DEFAULT_CONFIG))
    storage.setItem(STORAGE_KEY, JSON.stringify([null, valid, valid]))
    expect(readFavorites(storage).favorites).toEqual([valid])
    expect(readFavorites(storage).warning).toBeTruthy()
  })
  it('reports storage failure without claiming a successful save', () => {
    const blocked: StorageLike = {
      getItem: () => {
        throw Error('blocked')
      },
      setItem: () => {
        throw Error('quota')
      },
    }
    expect(readFavorites(blocked).warning).toBeTruthy()
    expect(writeFavorites(blocked, [])).toBeTruthy()
  })
  it('loads v1 favorites without losing their world and persists customized v2 worlds', () => {
    const storage = memoryStorage()
    const legacyConfig = {
      schemaVersion: 1,
      seed: 'ATLAS-0742',
      archetype: 'archipelago',
      palette: 'pastel',
      surrealism: 65,
      density: 55,
      atmosphere: 'dusk',
    }
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'old-id',
          name: 'Legacy world',
          savedAt: '2026-10-19T00:00:00.000Z',
          config: legacyConfig,
        },
      ]),
    )
    const loaded = readFavorites(storage)
    expect(loaded.warning).toBeUndefined()
    expect(loaded.favorites[0].config).toEqual(DEFAULT_CONFIG)
    const favorite = createFavorite(generateWorld(randomizeWorld('favorite-v2')))
    writeFavorites(storage, [favorite, ...loaded.favorites])
    expect(readFavorites(storage).favorites.map((item) => item.config)).toEqual([
      favorite.config,
      DEFAULT_CONFIG,
    ])
  })
  it('filters favorites by archetype and search query across name and seed', () => {
    const favArch = createFavorite(generateWorld({ ...DEFAULT_CONFIG, seed: 'ALPHA-10' }))
    const favCrystal = createFavorite(
      generateWorld({ ...DEFAULT_CONFIG, archetype: 'crystal', seed: 'BETA-20' }),
    )
    const list = [favArch, favCrystal]
    expect(filterFavorites(list, 'all')).toEqual(list)
    expect(filterFavorites(list, 'crystal')).toEqual([favCrystal])
    expect(filterFavorites(list, 'all', 'beta-20')).toEqual([favCrystal])
    expect(filterFavorites(list, 'all', favArch.name.slice(0, 6))).toContainEqual(favArch)
    expect(isValidArchetypeFilter('all')).toBe(true)
    expect(isValidArchetypeFilter('volcano')).toBe(true)
    expect(isValidArchetypeFilter('unknown')).toBe(false)
  })
  it('exports and imports collections with deduplication and 100-item limit', () => {
    const favA = createFavorite(generateWorld({ ...DEFAULT_CONFIG, seed: 'EXP-1' }))
    const favB = createFavorite(
      generateWorld({ ...DEFAULT_CONFIG, archetype: 'volcano', seed: 'EXP-2' }),
    )
    const exported = exportFavoritesJson([favA, favB])
    const imported = importFavoritesJson(exported, [favA])
    expect(imported.warning).toBeUndefined()
    expect(imported.added).toBe(1)
    expect(imported.favorites).toEqual([favA, favB])

    expect(importFavoritesJson('{corrupt', [favA]).warning).toBeTruthy()
    expect(importFavoritesJson('{"favorites": "bad"}', [favA]).warning).toBeTruthy()

    const hundred = Array.from({ length: 100 }, (_, i) =>
      createFavorite(generateWorld({ ...DEFAULT_CONFIG, seed: `CAP-${i}` })),
    )
    const extra = createFavorite(generateWorld({ ...DEFAULT_CONFIG, seed: 'CAP-EXTRA' }))
    const capped = importFavoritesJson(exportFavoritesJson([extra]), hundred)
    expect(capped.favorites.length).toBe(100)
    expect(capped.added).toBe(0)
    expect(capped.warning).toBeTruthy()
  })
})

describe('session history and quality profile', () => {
  it('navigates backward and forward and truncates future entries on branch', () => {
    let history = createHistory(DEFAULT_CONFIG)
    const second = { ...DEFAULT_CONFIG, seed: 'HIST-2', archetype: 'crystal' as const }
    const third = { ...DEFAULT_CONFIG, seed: 'HIST-3', archetype: 'city' as const }
    history = pushHistory(history, DEFAULT_CONFIG)
    expect(history.entries.length).toBe(1)

    history = pushHistory(history, second)
    history = pushHistory(history, third)
    expect(history.index).toBe(2)

    const back = stepHistory(history, -1)
    expect(back.config).toEqual(second)
    expect(back.state.index).toBe(1)

    const forward = stepHistory(back.state, 1)
    expect(forward.config).toEqual(third)

    const branched = pushHistory(back.state, { ...DEFAULT_CONFIG, seed: 'HIST-BRANCH' })
    expect(branched.entries.length).toBe(3)
    expect(branched.entries[2].seed).toBe('HIST-BRANCH')
  })
  it('caps history length at MAX_HISTORY', () => {
    let history = createHistory(DEFAULT_CONFIG)
    for (let i = 0; i < MAX_HISTORY + 15; i++) {
      history = pushHistory(history, { ...DEFAULT_CONFIG, seed: `SEED-${i}` })
    }
    expect(history.entries.length).toBe(MAX_HISTORY)
    expect(history.index).toBe(MAX_HISTORY - 1)
  })
  it('persists and normalizes quality profiles safely', () => {
    const storage = memoryStorage()
    expect(readQualityProfile(storage)).toBe('auto')
    writeQualityProfile(storage, 'high')
    expect(readQualityProfile(storage)).toBe('high')
    storage.setItem('impossible-atlas:quality:v1', 'invalid')
    expect(readQualityProfile(storage)).toBe('auto')
  })
})
