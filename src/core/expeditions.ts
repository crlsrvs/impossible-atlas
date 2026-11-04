import type { FeatureKind, GenerationContext, Vec3 } from './world'

function feature(
  ctx: GenerationContext,
  kind: FeatureKind,
  position: Vec3,
  scale: Vec3 = [1, 1, 1],
  rotation: Vec3 = [0, 0, 0],
) {
  ;(ctx.data.features ??= []).push({
    kind,
    position,
    scale,
    rotation,
    variant: ctx.data.variant,
    phase: ctx.random() * Math.PI * 2,
  })
}

function scatterRim(
  ctx: GenerationContext,
  center: Vec3,
  radius: number,
  amount: number,
  inner = 0.8,
  size = 0.45,
) {
  for (let i = 0; i < amount; i++) {
    const angle = ctx.random() * Math.PI * 2
    const distance = radius * (inner + ctx.random() * (1 - inner))
    ctx.data.plants.push({
      position: [
        center[0] + Math.cos(angle) * distance,
        center[1],
        center[2] + Math.sin(angle) * distance,
      ],
      scale: size * (0.6 + ctx.random() * 0.7),
      rotation: [0, ctx.random() * Math.PI * 2, 0],
      variant: Math.floor(ctx.random() * 3),
    })
  }
}
function orbitingFragments(ctx: GenerationContext, radius: number, height: number, amount: number) {
  for (let i = 0; i < amount; i++) {
    const angle = i * 2.399963
    ctx.data.rocks.push({
      position: [
        Math.cos(angle) * radius,
        height + (ctx.random() - 0.5) * 1.5,
        Math.sin(angle) * radius,
      ],
      scale: 0.14 + ctx.random() * (0.2 + ctx.anomaly * 0.12),
      rotation: [ctx.random(), ctx.random(), 0],
      variant: i % 3,
    })
  }
}

export function generateCity(ctx: GenerationContext) {
  const { data, layout, anomaly } = ctx
  data.islands.push({ position: [0, -0.65, 0], radius: 1.8, depth: 1.8, inverted: false })
  feature(ctx, 'tower', [0, -0.55, 0], [0.95, 2.6 + anomaly * 0.5, 0.95])
  const satellites = 3 + data.variant
  for (let i = 0; i < satellites; i++) {
    const angle = (i / satellites) * Math.PI * 2 + 0.35
    const distance = 3.35 + layout() * 0.2
    const x = Math.cos(angle) * distance
    const z = Math.sin(angle) * distance
    const radius = 0.65 + layout() * 0.25
    data.islands.push({
      position: [x, -0.65, z],
      radius,
      depth: 1 + layout() * 0.5,
      inverted: false,
    })
    feature(
      ctx,
      'tower',
      [x, -0.55, z],
      [0.45 + layout() * 0.12, 1.1 + layout() * 1.1 + anomaly * 0.3, 0.5],
    )
    const start = 1.4
    const end = distance - radius * 0.55
    feature(
      ctx,
      'bridge',
      [(Math.cos(angle) * (start + end)) / 2, -0.59, (Math.sin(angle) * (start + end)) / 2],
      [0.3, 1, end - start],
      [0, Math.atan2(Math.cos(angle), Math.sin(angle)), 0],
    )
    scatterRim(
      ctx,
      [x, -0.6, z],
      radius * 0.88,
      Math.max(2, Math.round(ctx.count * 0.13)),
      0.85,
      0.24,
    )
  }
  scatterRim(ctx, [0, -0.6, 0], 1.55, Math.round(ctx.count * 0.65), 0.84, 0.38)
  orbitingFragments(ctx, 3.9, -1.6, 7)
  data.anomalies.push('puentes sin soporte', 'coronas de torres suspendidas')
}

export function generateDesert(ctx: GenerationContext) {
  const { data, layout, anomaly } = ctx
  data.islands.push({ position: [0, -0.65, 0], radius: 3.5, depth: 0.9, inverted: false })
  feature(
    ctx,
    'hourglass',
    [0, -0.72, 0],
    [0.95, 0.95 + anomaly * 0.1, 0.95],
    [0, data.variant * 0.35, 0],
  )
  for (let i = 0; i < 3 + data.variant; i++) {
    const angle = (i / (3 + data.variant)) * Math.PI * 2 + 0.45
    feature(
      ctx,
      'obelisk',
      [Math.cos(angle) * 2.65, -0.6, Math.sin(angle) * 2.65],
      [0.32, 1.1 + layout() * 0.7, 0.32],
      [0, angle, 0],
    )
  }
  for (let i = 0; i < 3; i++)
    feature(
      ctx,
      'dune',
      [-1.9 + i * 1.7, -0.63, -1.4],
      [0.95 + layout() * 0.2, 0.35 + layout() * 0.25, 0.7],
      [0, i * 0.6, 0],
    )
  for (let i = 0; i < 1 + data.variant; i++)
    feature(
      ctx,
      'sun',
      [-2.3 + i * 2, 2.3 + Math.sin(i * 1.3) * 0.7, -1.5 - i * 0.15],
      [0.36 + (i === 0 ? 0.18 : 0), 0.36 + (i === 0 ? 0.18 : 0), 0.36 + (i === 0 ? 0.18 : 0)],
    )
  scatterRim(ctx, [0, -0.6, 0], 2.9, Math.round(ctx.count * 0.7), 0.55, 0.4)
  orbitingFragments(ctx, 3.6, -0.8, 5)
  data.anomalies.push('arena que asciende', 'soles suspendidos')
}

export function generateJellyfish(ctx: GenerationContext) {
  const { data, layout, anomaly } = ctx
  data.islands.push({ position: [0, -1.5, 0], radius: 3.25, depth: 0.9, inverted: false })
  feature(ctx, 'jellyfish', [0, 1.8, 0], [1.15, 1.15, 1.15])
  const amount = 3 + data.variant
  for (let i = 0; i < amount; i++) {
    const angle = (i / amount) * Math.PI * 2 + 0.25
    const scale = 0.48 + layout() * 0.27 + anomaly * 0.1
    feature(
      ctx,
      'jellyfish',
      [Math.cos(angle) * 2.6, 0.8 + layout() * 1.15, Math.sin(angle) * 2.4],
      [scale, scale, scale],
    )
  }
  scatterRim(ctx, [0, -1.46, 0], 2.8, ctx.count + 4, 0.3, 0.5)
  orbitingFragments(ctx, 3.3, 0.1, 8)
  data.anomalies.push('medusas que flotan en el aire', 'burbujas en órbita')
}

export function generateVolcano(ctx: GenerationContext) {
  const { data, anomaly } = ctx
  data.islands.push({ position: [0, -0.9, 0], radius: 3.3, depth: 1.25, inverted: false })
  const width = [1, 1.08, 0.9][data.variant]
  feature(
    ctx,
    'volcano',
    [0, -0.87, 0],
    [width, 0.9 + data.variant * 0.12 + anomaly * 0.15, width],
    [0, data.variant * 0.5, 0],
  )
  if (data.variant === 2)
    feature(ctx, 'volcano', [2.2, -0.88, -0.9], [0.32, 0.42, 0.32], [0, 1.3, 0])
  scatterRim(ctx, [0, -0.86, 0], 2.9, ctx.count + 3, 0.83, 0.48)
  orbitingFragments(ctx, 3.45, 0.9, 7 + data.variant)
  data.anomalies.push('cascadas de lava en el vacío', 'rocas de obsidiana en órbita')
}
