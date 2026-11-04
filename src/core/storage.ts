import {
  ARCHETYPES,
  CUSTOMIZATION_PARAMETERS,
  normalizeConfig,
  SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
} from './world'
import type { Archetype, WorldConfig, WorldData } from './world'

export const STORAGE_KEY = 'impossible-atlas:favorites:v1'
export const QUALITY_STORAGE_KEY = 'impossible-atlas:quality:v1'
export const QUALITY_PROFILES = ['auto', 'eco', 'high'] as const
export type QualityProfile = (typeof QUALITY_PROFILES)[number]
export const MAX_HISTORY = 50

export interface Favorite {
  id: string
  name: string
  config: WorldConfig
  savedAt: string
}
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
export interface HistoryState {
  entries: WorldConfig[]
  index: number
}
export function configKey(config: WorldConfig): string {
  return JSON.stringify(normalizeConfig(config))
}
export function createFavorite(world: WorldData): Favorite {
  return {
    id: configKey(world.config),
    name: world.name,
    config: world.config,
    savedAt: new Date().toISOString(),
  }
}
function parseFavoriteItems(value: unknown): { favorites: Favorite[]; skipped: boolean } {
  if (!Array.isArray(value)) return { favorites: [], skipped: true }
  const favorites: Favorite[] = []
  let skipped = false
  for (const item of value.slice(0, 100)) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.name !== 'string' ||
      !item.config ||
      !SUPPORTED_SCHEMA_VERSIONS.includes(item.config.schemaVersion) ||
      typeof item.config.seed !== 'string' ||
      typeof item.savedAt !== 'string' ||
      !Number.isFinite(Date.parse(item.savedAt))
    ) {
      skipped = true
      continue
    }
    const config = normalizeConfig(item.config)
    const id = configKey(config)
    if (!favorites.some((favorite) => favorite.id === id))
      favorites.push({ id, name: item.name.slice(0, 120), config, savedAt: item.savedAt })
  }
  return { favorites, skipped }
}
export function readFavorites(storage: StorageLike): { favorites: Favorite[]; warning?: string } {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return { favorites: [] }
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value))
      return { favorites: [], warning: 'La colección guardada no es válida.' }
    const { favorites, skipped } = parseFavoriteItems(value)
    return {
      favorites,
      warning: skipped ? 'Se omitieron mundos incompatibles de la colección.' : undefined,
    }
  } catch {
    return {
      favorites: [],
      warning: 'No se pudo leer la colección. El almacenamiento puede estar bloqueado.',
    }
  }
}
export function writeFavorites(storage: StorageLike, favorites: Favorite[]): string | undefined {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    return undefined
  } catch {
    return 'No se pudo guardar la colección. Revisa el espacio o los permisos del navegador.'
  }
}
export function filterFavorites(
  favorites: readonly Favorite[],
  archetype: Archetype | 'all',
  query = '',
): Favorite[] {
  const normalizedQuery = query.trim().toLowerCase()
  return favorites.filter((item) => {
    if (archetype !== 'all' && item.config.archetype !== archetype) return false
    if (!normalizedQuery) return true
    return (
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.config.seed.toLowerCase().includes(normalizedQuery)
    )
  })
}
export function exportFavoritesJson(favorites: readonly Favorite[]): string {
  return JSON.stringify(
    {
      atlasVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      favorites,
    },
    null,
    2,
  )
}
export function importFavoritesJson(
  raw: string,
  existing: readonly Favorite[] = [],
): { favorites: Favorite[]; added: number; warning?: string } {
  try {
    const parsed: unknown = JSON.parse(raw)
    const list = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as { favorites?: unknown }).favorites)
        ? (parsed as { favorites: unknown[] }).favorites
        : null
    if (!list) {
      return {
        favorites: [...existing],
        added: 0,
        warning: 'El archivo no contiene una colección válida de Impossible Atlas.',
      }
    }
    const { favorites: imported, skipped } = parseFavoriteItems(list)
    if (imported.length === 0 && list.length > 0) {
      return {
        favorites: [...existing],
        added: 0,
        warning: 'No se encontraron mundos compatibles en el archivo importado.',
      }
    }
    const merged: Favorite[] = [...existing]
    let added = 0
    let capped = false
    for (const item of imported) {
      if (merged.some((fav) => fav.id === item.id)) continue
      if (merged.length >= 100) {
        capped = true
        break
      }
      merged.push(item)
      added++
    }
    const warning = capped
      ? 'Se alcanzó el límite de 100 mundos al importar la colección.'
      : skipped
        ? 'Algunos mundos incompatibles fueron omitidos durante la importación.'
        : undefined
    return { favorites: merged, added, warning }
  } catch {
    return {
      favorites: [...existing],
      added: 0,
      warning: 'No se pudo leer el archivo JSON de la colección.',
    }
  }
}
export function readQualityProfile(storage: StorageLike): QualityProfile {
  try {
    const raw = storage.getItem(QUALITY_STORAGE_KEY)
    return QUALITY_PROFILES.includes(raw as QualityProfile) ? (raw as QualityProfile) : 'auto'
  } catch {
    return 'auto'
  }
}
export function writeQualityProfile(storage: StorageLike, profile: QualityProfile): void {
  try {
    storage.setItem(QUALITY_STORAGE_KEY, profile)
  } catch {
    /* Optional preference */
  }
}
export function createHistory(initial: WorldConfig): HistoryState {
  return { entries: [normalizeConfig(initial)], index: 0 }
}
export function pushHistory(state: HistoryState, next: WorldConfig): HistoryState {
  const normalized = normalizeConfig(next)
  const current = state.entries[state.index]
  if (current && configKey(current) === configKey(normalized)) return state
  const head = state.entries.slice(0, state.index + 1)
  const updated = [...head, normalized].slice(-MAX_HISTORY)
  return {
    entries: updated,
    index: updated.length - 1,
  }
}
export function stepHistory(
  state: HistoryState,
  delta: -1 | 1,
): { state: HistoryState; config: WorldConfig } {
  const nextIndex = Math.min(state.entries.length - 1, Math.max(0, state.index + delta))
  return {
    state: { ...state, index: nextIndex },
    config: state.entries[nextIndex],
  }
}
export function isValidArchetypeFilter(value: string): value is Archetype | 'all' {
  return value === 'all' || ARCHETYPES.includes(value as Archetype)
}
export function serializeWorld(config: WorldConfig): string {
  return new URLSearchParams({
    v: String(config.schemaVersion),
    seed: config.seed,
    type: config.archetype,
    palette: config.palette,
    surrealism: String(config.surrealism),
    density: String(config.density),
    atmosphere: config.atmosphere,
    composition: config.composition,
    ...Object.fromEntries(CUSTOMIZATION_PARAMETERS.map((key) => [key, String(config[key])])),
  }).toString()
}
export function parseWorld(search: string): { config?: WorldConfig; warning?: string } {
  const params = new URLSearchParams(search)
  if (!params.size) return {}
  const version = Number(params.get('v'))
  if (!params.has('v') || !SUPPORTED_SCHEMA_VERSIONS.includes(version))
    return {
      warning: 'Este enlace usa una versión de mundo incompatible. Abrimos un mundo seguro.',
    }
  const raw = {
    schemaVersion: SCHEMA_VERSION,
    seed: params.get('seed'),
    archetype: params.get('type'),
    palette: params.get('palette'),
    surrealism: params.has('surrealism') ? Number(params.get('surrealism')) : undefined,
    density: params.has('density') ? Number(params.get('density')) : undefined,
    atmosphere: params.get('atmosphere'),
  }
  // v1 links have no customization fields. Missing optional v2 fields use neutral defaults.
  const customization: Record<string, unknown> = {}
  if (version >= 2) {
    if (params.has('composition')) customization.composition = params.get('composition')
    for (const key of CUSTOMIZATION_PARAMETERS) {
      if (params.has(key)) customization[key] = Number(params.get(key))
    }
  }
  const input = { ...raw, ...customization }
  const config = normalizeConfig(input)
  const invalid = Object.entries(input).some(
    ([key, value]) => value !== config[key as keyof WorldConfig],
  )
  return {
    config,
    warning: invalid
      ? 'Ajustamos los parámetros inválidos del enlace a valores seguros.'
      : undefined,
  }
}
