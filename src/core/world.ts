export const SCHEMA_VERSION = 2 as const
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1, SCHEMA_VERSION]
export const ARCHETYPES = [
  'archipelago',
  'planet',
  'ocean',
  'crystal',
  'city',
  'desert',
  'jellyfish',
  'volcano',
] as const
export type Archetype = (typeof ARCHETYPES)[number]
export const PALETTES = ['pastel', 'violet', 'emerald', 'sunset', 'ocean'] as const
export type PaletteId = (typeof PALETTES)[number]
export const ATMOSPHERES = ['dusk', 'dawn', 'nebula'] as const
export type Atmosphere = (typeof ATMOSPHERES)[number]
export const COMPOSITIONS = ['auto', 'minimal', 'balanced', 'complex'] as const
export type Composition = (typeof COMPOSITIONS)[number]
export const CUSTOMIZATION_PARAMETERS = [
  'vegetationSize',
  'fragmentSize',
  'particleDensity',
  'animationSpeed',
  'lightIntensity',
] as const
export type CustomizationParameter = (typeof CUSTOMIZATION_PARAMETERS)[number]
export interface WorldConfig {
  schemaVersion: typeof SCHEMA_VERSION
  seed: string
  archetype: Archetype
  palette: PaletteId | 'auto'
  surrealism: number
  density: number
  atmosphere: Atmosphere
  composition: Composition
  vegetationSize: number
  fragmentSize: number
  particleDensity: number
  animationSpeed: number
  lightIntensity: number
}
export const CUSTOMIZATION_DEFAULTS = {
  composition: 'auto' as const,
  vegetationSize: 50,
  fragmentSize: 50,
  particleDensity: 50,
  animationSpeed: 50,
  lightIntensity: 50,
}
export type Vec3 = [number, number, number]
export interface Island {
  position: Vec3
  radius: number
  depth: number
  inverted: boolean
}
export interface Decoration {
  position: Vec3
  scale: number
  rotation: Vec3
  variant: number
}
export interface Ring {
  position: Vec3
  radius: number
  rotation: Vec3
  broken: boolean
}
export type FeatureKind =
  'tower' | 'bridge' | 'hourglass' | 'obelisk' | 'sun' | 'dune' | 'jellyfish' | 'volcano'
export interface WorldFeature {
  kind: FeatureKind
  position: Vec3
  rotation: Vec3
  scale: Vec3
  variant: number
  phase: number
}
export interface WorldData {
  config: WorldConfig
  name: string
  description: string
  variant: number
  paletteId: PaletteId
  islands: Island[]
  plants: Decoration[]
  rocks: Decoration[]
  monuments: Decoration[]
  rings: Ring[]
  particles: Vec3[]
  anomalies: string[]
  features?: WorldFeature[]
}
export interface Palette {
  name: string
  background: string
  ground: string
  rock: string
  rockLight: string
  foliage: string
  foliageLight: string
  accent: string
  water: string
  light: string
}
export const palettes: Record<PaletteId, Palette> = {
  pastel: {
    name: 'Dreamy Pastel',
    background: '#111b19',
    ground: '#83b7a3',
    rock: '#374b4b',
    rockLight: '#648b7d',
    foliage: '#e9a897',
    foliageLight: '#f9d7ac',
    accent: '#d8efbd',
    water: '#de9db6',
    light: '#fce0c5',
  },
  violet: {
    name: 'Cosmic Violet',
    background: '#171323',
    ground: '#8c76ad',
    rock: '#3c345f',
    rockLight: '#716195',
    foliage: '#bda4e3',
    foliageLight: '#e7c3ed',
    accent: '#9fe5e8',
    water: '#b68cc8',
    light: '#dfd0ff',
  },
  emerald: {
    name: 'Emerald Mystery',
    background: '#0d1b19',
    ground: '#589e7c',
    rock: '#25453f',
    rockLight: '#4b7765',
    foliage: '#89d5a5',
    foliageLight: '#c4e6a7',
    accent: '#e7d48f',
    water: '#c994aa',
    light: '#e1f4cb',
  },
  sunset: {
    name: 'Sunset Gold',
    background: '#211713',
    ground: '#c09161',
    rock: '#655046',
    rockLight: '#ab7a5b',
    foliage: '#d88972',
    foliageLight: '#ffd199',
    accent: '#f8e4aa',
    water: '#d988a0',
    light: '#ffdbb5',
  },
  ocean: {
    name: 'Deep Ocean',
    background: '#101c27',
    ground: '#5b9aa3',
    rock: '#2e465c',
    rockLight: '#557f92',
    foliage: '#8cc4c5',
    foliageLight: '#bedfcf',
    accent: '#e7bbd9',
    water: '#bc8eae',
    light: '#c5e9ff',
  },
}
export const archetypeInfo: Record<
  Archetype,
  { name: string; label: string; index: string; short: string }
> = {
  archipelago: {
    name: 'Floating Archipelago',
    label: 'Archipiélago flotante',
    index: '01',
    short: 'Tierras suspendidas',
  },
  planet: {
    name: 'Tiny Alien Planet',
    label: 'Pequeño planeta alienígena',
    index: '02',
    short: 'Órbitas diminutas',
  },
  ocean: {
    name: 'Pink Ocean Sanctuary',
    label: 'Santuario del océano rosa',
    index: '03',
    short: 'Mareas de otro universo',
  },
  crystal: {
    name: 'Crystal Wilderness',
    label: 'Naturaleza cristalina',
    index: '04',
    short: 'Minerales que sueñan',
  },
  city: {
    name: 'Cloudborne Citadel',
    label: 'Ciudad suspendida',
    index: '05',
    short: 'Torres y puentes sobre el vacío',
  },
  desert: {
    name: 'Desert of Suns',
    label: 'Desierto de los soles',
    index: '06',
    short: 'Donde la arena desafía al tiempo',
  },
  jellyfish: {
    name: 'Jellyfish Garden',
    label: 'Jardín de medusas',
    index: '07',
    short: 'Un arrecife que aprendió a volar',
  },
  volcano: {
    name: 'Obsidian Caldera',
    label: 'Volcán de obsidiana',
    index: '08',
    short: 'Lava que cae hacia ninguna parte',
  },
}
export const DEFAULT_CONFIG: WorldConfig = {
  schemaVersion: SCHEMA_VERSION,
  seed: 'ATLAS-0742',
  archetype: 'archipelago',
  palette: 'pastel',
  surrealism: 65,
  density: 55,
  atmosphere: 'dusk',
  ...CUSTOMIZATION_DEFAULTS,
}

export function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619)
  return hash >>> 0
}
export function createRandom(seed: string) {
  let state = hashSeed(seed)
  return () => {
    state += 0x6d2b79f5
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const choice = <T>(values: readonly T[], value: unknown, fallback: T): T =>
  values.includes(value as T) ? (value as T) : fallback
const bounded = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.min(100, Math.max(0, value)))
    : fallback
const mutationSuffix = /~(\d{1,6})$/
const rootSeedOf = (seed: string) => seed.replace(mutationSuffix, '')
function normalizeSeed(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_CONFIG.seed
  const seed = value.trim()
  const suffix = seed.match(mutationSuffix)?.[0] ?? ''
  return rootSeedOf(seed).slice(0, 72) + suffix
}
export function normalizeConfig(input: unknown): WorldConfig {
  const value = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  // Legacy worlds acquire neutral settings: their composition and appearance stay intact.
  const customization = value.schemaVersion === 1 ? {} : value
  return {
    schemaVersion: SCHEMA_VERSION,
    seed: normalizeSeed(value.seed),
    archetype: choice(ARCHETYPES, value.archetype, DEFAULT_CONFIG.archetype),
    palette: choice([...PALETTES, 'auto'] as const, value.palette, 'auto'),
    surrealism: bounded(value.surrealism, 65),
    density: bounded(value.density, 55),
    atmosphere: choice(ATMOSPHERES, value.atmosphere, 'dusk'),
    composition: choice(COMPOSITIONS, customization.composition, 'auto'),
    vegetationSize: bounded(customization.vegetationSize, 50),
    fragmentSize: bounded(customization.fragmentSize, 50),
    particleDensity: bounded(customization.particleDensity, 50),
    animationSpeed: bounded(customization.animationSpeed, 50),
    lightIntensity: bounded(customization.lightIntensity, 50),
  }
}
export function newSeed(): string {
  return `ATLAS-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase()}`
}
export function randomizeWorld(seed = newSeed()): WorldConfig {
  const random = createRandom(`${seed}:properties:v2`)
  const pick = <T>(values: readonly T[]): T => values[Math.floor(random() * values.length)]
  const percent = () => Math.floor(random() * 101)
  return normalizeConfig({
    schemaVersion: SCHEMA_VERSION,
    seed,
    archetype: pick(ARCHETYPES),
    palette: pick(PALETTES),
    atmosphere: pick(ATMOSPHERES),
    surrealism: percent(),
    density: percent(),
    composition: pick(COMPOSITIONS.slice(1)),
    vegetationSize: percent(),
    fragmentSize: percent(),
    particleDensity: percent(),
    animationSpeed: percent(),
    lightIntensity: percent(),
  })
}
export function mutateWorld(config: WorldConfig): WorldConfig {
  const root = rootSeedOf(config.seed)
  const previous = Number(config.seed.match(mutationSuffix)?.[1] ?? 0)
  const version =
    Number.isSafeInteger(previous) && previous >= 0 && previous < 999999 ? previous + 1 : 1
  // Reserve suffix space at validation time so the root always survives a mutation.
  return { ...config, seed: `${root}~${version}`, palette: resolvePalette(config) }
}
export function resolvePalette(config: WorldConfig): PaletteId {
  return config.palette === 'auto'
    ? PALETTES[hashSeed(rootSeedOf(config.seed)) % PALETTES.length]
    : config.palette
}

type Random = ReturnType<typeof createRandom>
export interface GenerationContext {
  data: WorldData
  random: Random
  layout: Random
  count: number
  anomaly: number
}
const decoration = (
  position: Vec3,
  scale: number,
  random: Random,
  rotation: Vec3 = [0, 0, 0],
): Decoration => ({
  position,
  scale,
  rotation: [rotation[0], rotation[1] + random() * Math.PI * 2, rotation[2]],
  variant: Math.floor(random() * 3),
})

function populateIsland(ctx: GenerationContext, island: Island, multiplier = 1) {
  const { random, data, count } = ctx
  const amount = Math.round(count * multiplier)
  for (let i = 0; i < amount; i++) {
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * island.radius * 0.78
    const position: Vec3 = [
      island.position[0] + Math.cos(angle) * radius,
      island.position[1] + 0.08,
      island.position[2] + Math.sin(angle) * radius,
    ]
    // Keep the central portal's opening clear.
    if (
      data.config.archetype === 'archipelago' &&
      Math.abs(position[0]) < 0.95 &&
      position[2] > -1.05
    )
      continue
    data.plants.push(
      decoration(position, (0.35 + random() * 0.65) * (0.8 + ctx.anomaly * 0.6), random),
    )
  }
}

function generateArchipelago(ctx: GenerationContext) {
  const { data, layout, random, anomaly } = ctx
  data.islands.push({ position: [0, 0, 0], radius: 2.65, depth: 2.7, inverted: false })
  const count = 3 + data.variant
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.4
    const distance = 3.8 + layout() * 0.65
    data.islands.push({
      position: [
        Math.cos(angle) * distance,
        -0.5 + layout() * 1.9,
        Math.sin(angle) * distance * 0.7,
      ],
      radius: 0.65 + layout() * 0.5,
      depth: 1 + layout(),
      inverted: i === count - 1 && anomaly > 0.75,
    })
  }
  data.islands.forEach((island, i) => populateIsland(ctx, island, i === 0 ? 1 : 0.22))
  data.rings.push({
    position: [0, 1.7, -0.35],
    radius: 1.62 + data.variant * 0.12,
    rotation: [0, 0.15, -0.13],
    broken: true,
  })
  for (let i = 0; i < 7 + Math.round(anomaly * 7); i++) {
    const angle = i * 2.4
    data.rocks.push(
      decoration(
        [Math.cos(angle) * (3.4 + random()), -0.5 - random() * 2.7, Math.sin(angle) * 3.2],
        0.12 + random() * 0.28,
        random,
      ),
    )
  }
  data.anomalies.push('rocas en órbita', 'un portal suspendido')
  if (anomaly > 0.5) {
    data.plants.push(decoration([1.1, -1.8, 0], 0.7, random, [Math.PI, 0, 0]))
    data.anomalies.push('un árbol invertido')
  }
}

function generatePlanet(ctx: GenerationContext) {
  const { data, random, layout, count, anomaly } = ctx
  const radius = 2.4
  // Fibonacci distribution with small deterministic angular offsets: every stem is tangent to the sphere.
  for (let i = 0; i < count + 12; i++) {
    const y = 1 - (i / (count + 11)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const angle = i * 2.399963 + layout() * 0.18
    const n: Vec3 = [Math.cos(angle) * r, y, Math.sin(angle) * r]
    data.plants.push({
      position: n.map((v) => v * radius) as Vec3,
      scale: 0.35 + random() * (0.55 + anomaly * 0.65),
      rotation: [Math.acos(n[1]), Math.atan2(n[0], n[2]), 0],
      variant: (i + data.variant) % 3,
    })
  }
  data.rings.push({
    position: [0, 0, 0],
    radius: 3.35 + data.variant * 0.25,
    rotation: [1.15, 0.2, -0.35 + data.variant * 0.3],
    broken: false,
  })
  for (let i = 0; i < 4 + data.variant; i++) {
    const angle = (i / (4 + data.variant)) * Math.PI * 2
    data.rocks.push(
      decoration(
        [Math.cos(angle) * 4, Math.sin(angle) * 1.3, Math.sin(angle) * 3.6],
        0.22 + random() * 0.27,
        random,
      ),
    )
  }
  data.anomalies.push('hongos gigantes', 'satélites en órbita')
}

function generateOcean(ctx: GenerationContext) {
  const { data, layout, random, anomaly } = ctx
  const count = 3 + data.variant
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.4
    const island: Island = {
      position: [Math.cos(angle) * 2.7, 0.06, Math.sin(angle) * 2.7],
      radius: i === 0 ? 1.1 : 0.55 + layout() * 0.4,
      depth: 0.7,
      inverted: false,
    }
    data.islands.push(island)
    populateIsland(ctx, island, 0.2)
  }
  data.monuments.push(decoration([0, 0.2 + anomaly * 0.5, -0.5], 1.2, random))
  data.rings.push({
    position: [0, 0.03, 0],
    radius: 4.5,
    rotation: [Math.PI / 2, 0, 0],
    broken: false,
  })
  for (let i = 0; i < 5 + data.variant; i++) {
    const angle = i * 2.4
    data.rocks.push(
      decoration(
        [Math.cos(angle) * 3.6, 1.3 + random() * anomaly * 2.5, Math.sin(angle) * 3.6],
        0.12 + random() * 0.23,
        random,
      ),
    )
  }
  data.anomalies.push('agua suspendida', 'un santuario que levita')
}

function generateCrystal(ctx: GenerationContext) {
  const { data, random, layout, anomaly } = ctx
  data.islands.push({ position: [0, -0.7, 0], radius: 3.4, depth: 1.3, inverted: false })
  for (let i = 0; i < ctx.count + 9; i++) {
    const angle = random() * Math.PI * 2
    const distance = 0.9 + Math.sqrt(random()) * 2.3
    data.plants.push(
      decoration(
        [Math.cos(angle) * distance, -0.7, Math.sin(angle) * distance],
        0.35 + random() * 0.9,
        random,
        [random() * 0.25, 0, random() * 0.25],
      ),
    )
  }
  for (let i = 0; i < 3 + data.variant; i++) {
    const angle = i * 2.4
    data.monuments.push(
      decoration(
        [Math.cos(angle) * 0.55, -0.72, Math.sin(angle) * 0.55],
        1.1 + layout() * 0.5 + anomaly * 0.5,
        random,
        [0.13, 0, (i - 1) * 0.15],
      ),
    )
  }
  data.rings.push({
    position: [0, 2, 0],
    radius: 2.1,
    rotation: [1.2, 0.3, 0.1 + data.variant * 0.3],
    broken: false,
  })
  for (let i = 0; i < 6; i++) {
    const angle = i * 2.4
    data.rocks.push(
      decoration(
        [Math.cos(angle) * 2.6, 1.4 + random() * anomaly * 2, Math.sin(angle) * 2.6],
        0.2 + random() * 0.2,
        random,
      ),
    )
  }
  data.anomalies.push('cristales suspendidos', 'un anillo luminoso')
}

export const generators: Record<Archetype, (context: GenerationContext) => void> = {
  archipelago: generateArchipelago,
  planet: generatePlanet,
  ocean: generateOcean,
  crystal: generateCrystal,
  city: generateCity,
  desert: generateDesert,
  jellyfish: generateJellyfish,
  volcano: generateVolcano,
}
export function generateWorld(input: WorldConfig): WorldData {
  const config = normalizeConfig(input)
  const rootSeed = rootSeedOf(config.seed)
  const random = createRandom(`${config.seed}:details:v1`)
  const layout = createRandom(`${rootSeed}:structure:${config.archetype}:v1`)
  const adjectives = [
    'Quiet',
    'Amber',
    'Velvet',
    'Hollow',
    'Luminous',
    'Distant',
    'Wandering',
    'Hidden',
    'Silver',
    'Tender',
    'Dreaming',
    'Endless',
  ]
  const nouns: Record<Archetype, string[]> = {
    archipelago: ['Isles', 'Gardens', 'Drift', 'Horizon', 'Passage', 'Heavens'],
    planet: ['Moon', 'Orbit', 'Solstice', 'Satellite', 'Cosmos', 'Sphere'],
    ocean: ['Tides', 'Sanctuary', 'Lagoon', 'Reverie', 'Waters', 'Shoal'],
    crystal: ['Prism', 'Wilderness', 'Echo', 'Cathedral', 'Bloom', 'Caverns'],
    city: ['Citadel', 'Skyline', 'Bastion', 'Towers', 'Metropolis', 'Kingdom'],
    desert: ['Dunes', 'Sundial', 'Hourglass', 'Mirage', 'Sands', 'Oasis'],
    jellyfish: ['Reef', 'Ballet', 'Drifters', 'Lanterns', 'Shoal', 'Currents'],
    volcano: ['Caldera', 'Embers', 'Furnace', 'Eruption', 'Inferno', 'Crater'],
  }
  const nameRandom = createRandom(`${rootSeed}:name`)
  const name = `${['The', 'Beyond the', 'A Place of'][Math.floor(nameRandom() * 3)]} ${adjectives[Math.floor(nameRandom() * adjectives.length)]} ${nouns[config.archetype][Math.floor(nameRandom() * 6)]}`
  const seededVariant = Math.floor(layout() * 3)
  const data: WorldData = {
    config,
    name,
    description: '',
    variant:
      config.composition === 'auto' ? seededVariant : COMPOSITIONS.indexOf(config.composition) - 1,
    paletteId: resolvePalette(config),
    islands: [],
    plants: [],
    rocks: [],
    monuments: [],
    rings: [],
    particles: [],
    anomalies: [],
  }
  generators[config.archetype]({
    data,
    random,
    layout,
    count: 8 + Math.round(config.density * 0.34),
    anomaly: config.surrealism / 100,
  })
  data.plants.forEach((plant) => {
    plant.scale *= 0.5 + config.vegetationSize / 100
  })
  data.rocks.forEach((rock) => {
    rock.scale *= 0.5 + config.fragmentSize / 100
  })
  const particleCount = Math.round(
    ((45 + Math.round(config.density * 0.5)) * config.particleDensity) / 50,
  )
  for (let i = 0; i < particleCount; i++)
    data.particles.push([(random() - 0.5) * 17, (random() - 0.4) * 11, (random() - 0.5) * 14])
  const openings: Record<Archetype, string> = {
    archipelago: 'Un jardín sobre el vacío',
    planet: 'Un pequeño universo de vegetación desmesurada',
    ocean: 'Un océano de mareas rosadas',
    crystal: 'Un paisaje de minerales luminosos',
    city: 'Una ciudad de torres escalonadas sobre islas flotantes',
    desert: 'Un desierto de dunas, obeliscos y un reloj de arena',
    jellyfish: 'Un arrecife de vegetación luminosa bajo un cielo vivo',
    volcano: 'Una caldera de roca volcánica encendida desde dentro',
  }
  data.description = `${openings[config.archetype]}, con ${data.anomalies.slice(0, -1).join(', ')} y ${data.anomalies.at(-1)}.`
  return data
}
import { generateCity, generateDesert, generateJellyfish, generateVolcano } from './expeditions'
