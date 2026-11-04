import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Object3D,
  Quaternion,
  Spherical,
  Vector3,
} from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { archetypeInfo, hashSeed, palettes } from '../core/world'
import type { Decoration, Island, Palette, Vec3, WorldData } from '../core/world'
import { getCameraPose } from '../core/audio'
import type { CameraView } from '../core/audio'
import type { QualityProfile } from '../core/storage'
import ExpeditionElements from './ExpeditionElements'

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <SceneFallback /> : this.props.children
  }
}
function SceneFallback() {
  return (
    <div className="scene-fallback" role="alert">
      <div className="fallback-orbit">◌</div>
      <h2>Este universo necesita WebGL</h2>
      <p>
        Activa la aceleración gráfica o prueba con un navegador actualizado. Tus mundos guardados
        siguen disponibles.
      </p>
      <button className="text-button" onClick={() => location.reload()}>
        Volver a intentar ↗
      </button>
    </div>
  )
}

function islandGeometry(island: Island): BufferGeometry {
  const vertices: number[] = []
  const colors: number[] = []
  const sides = 9
  const rings = [0, -0.2, -island.depth * 0.53, -island.depth]
  const radii = [0.94, 1.04, 0.66, 0.12]
  const faceColors = ['#a7bab0', '#8da99c', '#6f8a7e', '#94a99c', '#627b74']
  const point = (ring: number, i: number): Vec3 => {
    const a = (i / sides) * Math.PI * 2
    const noise = 1 + Math.sin(i * 17.4) * 0.08
    return [
      Math.cos(a) * island.radius * radii[ring] * noise,
      rings[ring],
      Math.sin(a) * island.radius * radii[ring] * noise,
    ]
  }
  const triangle = (a: Vec3, b: Vec3, c: Vec3, shade: number) => {
    vertices.push(...a, ...b, ...c)
    const color = new Color(faceColors[shade % faceColors.length])
    for (let j = 0; j < 3; j++) colors.push(color.r, color.g, color.b)
  }
  for (let i = 0; i < sides; i++) {
    triangle([0, 0, 0], point(0, i + 1), point(0, i), 0)
    for (let r = 0; r < 3; r++) {
      triangle(point(r, i), point(r, i + 1), point(r + 1, i), i + r)
      triangle(point(r, i + 1), point(r + 1, i + 1), point(r + 1, i), i + r + 1)
    }
    triangle(point(3, i), point(3, i + 1), [0, -island.depth * 1.08, 0], i)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}
function Land({ island, palette }: { island: Island; palette: Palette }) {
  const geometry = useMemo(() => islandGeometry(island), [island])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <group position={island.position} rotation={island.inverted ? [Math.PI, 0, 0] : [0, 0, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={palette.rockLight} vertexColors roughness={0.92} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <circleGeometry args={[island.radius * 0.94, 9]} />
        <meshStandardMaterial color={palette.ground} roughness={0.95} />
      </mesh>
      <mesh
        position={[island.radius * -0.4, -island.depth * 0.45, island.radius * 0.3]}
        scale={[0.28, 0.7, 0.28]}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.accent}
          emissiveIntensity={0.18}
          flatShading
        />
      </mesh>
    </group>
  )
}

type Shape = 'cone' | 'crystal' | 'stem' | 'crown' | 'cap' | 'rock' | 'orb'
function CrystalGeometry() {
  const geometry = useMemo(() => {
    const vertices: number[] = []
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const b = ((i + 1) / 5) * Math.PI * 2
      const lowA: Vec3 = [Math.cos(a) * 0.25, -0.9, Math.sin(a) * 0.25]
      const lowB: Vec3 = [Math.cos(b) * 0.25, -0.9, Math.sin(b) * 0.25]
      const highA: Vec3 = [lowA[0], 0.45, lowA[2]]
      const highB: Vec3 = [lowB[0], 0.45, lowB[2]]
      vertices.push(
        ...lowA,
        ...highA,
        ...lowB,
        ...lowB,
        ...highA,
        ...highB,
        ...highA,
        0,
        0.9,
        0,
        ...highB,
        ...lowB,
        0,
        -0.9,
        0,
        ...lowA,
      )
    }
    const result = new BufferGeometry()
    result.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    result.computeVertexNormals()
    return result
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <primitive object={geometry} attach="geometry" />
}
interface BatchProps {
  items: Decoration[]
  shape: Shape
  color: string
  offset?: number
  scale?: Vec3
  spherical?: boolean
  emissive?: boolean
}
function InstanceBatch({
  items,
  shape,
  color,
  offset = 0,
  scale = [1, 1, 1],
  spherical = false,
  emissive = false,
}: BatchProps) {
  const ref = useRef<InstancedMesh>(null)
  const [sx, sy, sz] = scale
  useLayoutEffect(() => {
    const obj = new Object3D()
    const up = new Vector3(0, 1, 0)
    const normal = new Vector3()
    const orientation = new Quaternion()
    items.forEach((item, i) => {
      obj.position.set(...item.position)
      if (spherical) {
        normal.set(...item.position).normalize()
        orientation.setFromUnitVectors(up, normal)
        obj.quaternion.copy(orientation)
      } else obj.rotation.set(...item.rotation)
      obj.translateY(offset * item.scale)
      obj.scale.set(item.scale * sx, item.scale * sy, item.scale * sz)
      obj.updateMatrix()
      ref.current!.setMatrixAt(i, obj.matrix)
      ref.current!.setColorAt(i, new Color(color).multiplyScalar(0.82 + item.variant * 0.13))
    })
    ref.current!.instanceMatrix.needsUpdate = true
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [items, color, offset, sx, sy, sz, spherical])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      {shape === 'cone' && <coneGeometry args={[0.4, 1.5, 6]} />}
      {shape === 'crystal' && <CrystalGeometry />}
      {shape === 'stem' && <cylinderGeometry args={[0.065, 0.09, 0.7, 5]} />}
      {shape === 'crown' && <icosahedronGeometry args={[0.47, 0]} />}
      {shape === 'cap' && <sphereGeometry args={[0.65, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.6]} />}
      {shape === 'rock' && <icosahedronGeometry args={[1, 0]} />}
      {shape === 'orb' && <sphereGeometry args={[1, 10, 8]} />}
      <meshStandardMaterial
        color="white"
        roughness={shape === 'crystal' ? 0.27 : 0.85}
        metalness={shape === 'crystal' ? 0.25 : 0.04}
        emissive={emissive ? color : '#000000'}
        emissiveIntensity={emissive ? 0.25 : 0}
        flatShading
        transparent={shape === 'orb'}
        opacity={shape === 'orb' ? 0.48 : 1}
      />
    </instancedMesh>
  )
}

function Plants({ world, palette }: { world: WorldData; palette: Palette }) {
  const spherical = world.config.archetype === 'planet'
  if (world.config.archetype === 'desert')
    return (
      <>
        <InstanceBatch
          items={world.plants}
          shape="stem"
          color={palette.foliage}
          offset={0.65}
          scale={[2.6, 2, 2.6]}
        />
        <InstanceBatch
          items={world.plants}
          shape="crown"
          color={palette.foliage}
          offset={1.3}
          scale={[0.36, 0.5, 0.36]}
        />
        <InstanceBatch
          items={world.plants}
          shape="cap"
          color={palette.foliageLight}
          offset={1.55}
          scale={[0.18, 0.24, 0.18]}
        />
      </>
    )
  if (world.config.archetype === 'jellyfish')
    return (
      <>
        <InstanceBatch
          items={world.plants}
          shape="cone"
          color={palette.foliage}
          offset={0.45}
          scale={[0.8, 0.6, 0.8]}
          emissive
        />
        <InstanceBatch
          items={world.plants}
          shape="crown"
          color={palette.foliageLight}
          offset={0.72}
          scale={[0.34, 0.8, 0.34]}
          emissive
        />
      </>
    )
  if (world.config.archetype === 'volcano')
    return (
      <>
        <InstanceBatch
          items={world.plants}
          shape="crystal"
          color={palette.rock}
          offset={0.75}
          scale={[0.8, 0.85, 0.8]}
        />
        <InstanceBatch
          items={world.plants}
          shape="rock"
          color={palette.rockLight}
          offset={0.08}
          scale={[0.36, 0.18, 0.36]}
        />
      </>
    )
  if (world.config.archetype === 'crystal')
    return (
      <>
        <InstanceBatch
          items={world.plants}
          shape="crystal"
          color={palette.foliage}
          offset={0.8}
          scale={[1, 1, 1]}
          emissive
        />
        <InstanceBatch
          items={world.plants}
          shape="crystal"
          color={palette.foliageLight}
          offset={0.35}
          scale={[0.6, 0.5, 0.6]}
          emissive
        />
      </>
    )
  return (
    <>
      <InstanceBatch
        items={world.plants}
        shape="stem"
        color={palette.rockLight}
        offset={0.32}
        spherical={spherical}
      />
      <InstanceBatch
        items={world.plants}
        shape={spherical ? 'cap' : 'cone'}
        color={palette.foliage}
        offset={spherical ? 0.78 : 1.08}
        spherical={spherical}
        scale={spherical ? [1, 0.75, 1] : [1, 1, 1]}
      />
      <InstanceBatch
        items={world.plants}
        shape={spherical ? 'crown' : 'cone'}
        color={palette.foliageLight}
        offset={spherical ? 0.78 : 1.52}
        spherical={spherical}
        scale={spherical ? [0.55, 0.55, 0.55] : [0.72, 0.7, 0.72]}
      />
    </>
  )
}

function Monument({
  item,
  palette,
  crystal,
}: {
  item: Decoration
  palette: Palette
  crystal: boolean
}) {
  return (
    <group position={item.position} rotation={item.rotation} scale={item.scale}>
      {crystal ? (
        <>
          <mesh position={[0, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.33, 2.1, 5]} />
            <meshStandardMaterial
              color={palette.foliage}
              roughness={0.3}
              metalness={0.25}
              emissive={palette.foliage}
              emissiveIntensity={0.25}
              flatShading
            />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <coneGeometry args={[0.22, 0.8, 5]} />
            <meshStandardMaterial
              color={palette.foliageLight}
              emissive={palette.foliageLight}
              emissiveIntensity={0.35}
              flatShading
            />
          </mesh>
          <mesh position={[0, 1, 0.3]}>
            <boxGeometry args={[0.025, 1.6, 0.015]} />
            <meshBasicMaterial color={palette.accent} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 0.03, 0]} receiveShadow>
            <cylinderGeometry args={[1.05, 1.2, 0.16, 8]} />
            <meshStandardMaterial color={palette.rockLight} flatShading />
          </mesh>
          {[-0.64, 0.64].map((x) => (
            <mesh key={x} position={[x, 0.85, 0]} castShadow>
              <cylinderGeometry args={[0.13, 0.2, 1.5, 6]} />
              <meshStandardMaterial color={palette.accent} roughness={0.8} />
            </mesh>
          ))}
          <mesh position={[0, 1.65, 0]} castShadow>
            <boxGeometry args={[1.7, 0.24, 0.45]} />
            <meshStandardMaterial color={palette.accent} />
          </mesh>
          <mesh position={[0, 2, 0]} rotation={[0, Math.PI / 4, 0]}>
            <octahedronGeometry args={[0.35]} />
            <meshStandardMaterial
              color={palette.foliageLight}
              emissive={palette.foliageLight}
              emissiveIntensity={0.4}
            />
          </mesh>
        </>
      )}
    </group>
  )
}

function Ocean({ palette, variant }: { palette: Palette; variant: number }) {
  return (
    <group>
      <mesh position={[0, -0.17, 0]} receiveShadow>
        <cylinderGeometry args={[4.45, 4.2, 0.36, 80]} />
        <meshStandardMaterial color={palette.water} roughness={0.3} metalness={0.3} />
      </mesh>
      {[1.3, 2.1, 3.3, 4.1].map((radius, i) => (
        <mesh
          key={radius}
          position={[0.1 * variant, 0.018 + i * 0.003, 0]}
          rotation={[-Math.PI / 2, 0, i * 0.4]}
        >
          <torusGeometry args={[radius, 0.012, 4, 100, Math.PI * (1.4 + i * 0.1)]} />
          <meshBasicMaterial color={palette.foliageLight} transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  )
}

function FloatingObjects({
  world,
  palette,
  paused,
}: {
  world: WorldData
  palette: Palette
  paused: boolean
}) {
  const ref = useRef<Group>(null)
  const time = useRef(0)
  useFrame((_, delta) => {
    if (!paused && ref.current) {
      time.current += (Math.min(delta, 0.05) * world.config.animationSpeed) / 50
      ref.current.rotation.y = time.current * 0.035
      ref.current.position.y = Math.sin(time.current * 0.6) * 0.1
    }
  })
  return (
    <group ref={ref}>
      <InstanceBatch
        items={world.rocks}
        shape={
          world.config.archetype === 'jellyfish'
            ? 'orb'
            : ['crystal', 'volcano'].includes(world.config.archetype)
              ? 'crystal'
              : 'rock'
        }
        color={
          world.config.archetype === 'jellyfish'
            ? palette.accent
            : world.config.archetype === 'ocean'
              ? palette.water
              : palette.rockLight
        }
        scale={world.config.archetype === 'crystal' ? [0.8, 1.4, 0.8] : [1, 1, 1]}
        emissive={['ocean', 'jellyfish'].includes(world.config.archetype)}
      />
    </group>
  )
}
function Particles({ world, color, paused }: { world: WorldData; color: string; paused: boolean }) {
  const ref = useRef<Group>(null)
  const items = useMemo(
    () =>
      world.particles.map((position, i) => ({
        position,
        rotation: [0, 0, 0] as Vec3,
        scale: i % 7 === 0 ? 0.022 : 0.009,
        variant: i % 3,
      })),
    [world.particles],
  )
  useFrame((_, delta) => {
    if (ref.current && !paused)
      ref.current.rotation.y += (Math.min(delta, 0.05) * 0.012 * world.config.animationSpeed) / 50
  })
  return (
    <group ref={ref}>
      <InstanceBatch items={items} shape="rock" color={color} emissive />
    </group>
  )
}

function Diorama({ world, paused }: { world: WorldData; paused: boolean }) {
  const palette = palettes[world.paletteId]
  const landPalette =
    world.config.archetype === 'volcano'
      ? { ...palette, ground: palette.rock }
      : world.config.archetype === 'desert'
        ? { ...palette, ground: palette.light, rockLight: palette.ground }
        : world.config.archetype === 'jellyfish'
          ? { ...palette, ground: palette.rock }
          : palette
  const ref = useRef<Group>(null)
  const progress = useRef(0)
  useFrame((_, delta) => {
    if (!ref.current) return
    progress.current = paused ? 1 : Math.min(1, progress.current + delta * 1.5)
    const scale = 0.88 + 0.12 * (1 - Math.pow(1 - progress.current, 3))
    ref.current.scale.setScalar(scale)
  })
  return (
    <group ref={ref}>
      {world.islands.map((island, i) => (
        <Land key={i} island={island} palette={landPalette} />
      ))}
      {world.config.archetype === 'planet' && (
        <group>
          <mesh castShadow receiveShadow>
            <icosahedronGeometry args={[2.4, 2]} />
            <meshStandardMaterial color={palette.ground} flatShading roughness={0.9} />
          </mesh>
          <mesh rotation={[0.3, 0.6, 0.4]} scale={[1.01, 1.01, 1.01]}>
            <icosahedronGeometry args={[2.37, 1]} />
            <meshStandardMaterial
              color={palette.rockLight}
              flatShading
              wireframe
              transparent
              opacity={0.14}
            />
          </mesh>
        </group>
      )}
      {world.config.archetype === 'ocean' && <Ocean palette={palette} variant={world.variant} />}
      <Plants world={world} palette={palette} />
      <ExpeditionElements world={world} palette={palette} paused={paused} />
      {world.config.archetype === 'archipelago' && (
        <group>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh
              key={i}
              position={[Math.sin(i * 0.5) * 0.1, 0.035, 2.1 - i * 0.35]}
              rotation={[0, i * 0.12, 0]}
              receiveShadow
            >
              <cylinderGeometry args={[0.24 - i * 0.008, 0.25 - i * 0.008, 0.055, 6]} />
              <meshStandardMaterial color={palette.accent} roughness={0.85} />
            </mesh>
          ))}
          {[-0.63, 0.63].map((x) => (
            <mesh key={x} position={[x, 0.33, 0.7]} castShadow>
              <boxGeometry args={[0.12, 0.65, 0.12]} />
              <meshStandardMaterial color={palette.rockLight} />
            </mesh>
          ))}
        </group>
      )}
      {world.monuments.map((item, i) => (
        <Monument
          key={i}
          item={item}
          palette={palette}
          crystal={world.config.archetype === 'crystal'}
        />
      ))}
      {world.rings.map((ring, i) => (
        <group key={i} position={ring.position} rotation={ring.rotation}>
          {ring.broken ? (
            Array.from({ length: 7 }, (_, segment) => (
              <mesh key={segment} rotation={[0, 0, (segment / 7) * Math.PI * 2]} castShadow>
                <torusGeometry args={[ring.radius, 0.15, 5, 10, (Math.PI * 2) / 7 - 0.06]} />
                <meshStandardMaterial
                  color={segment % 2 ? palette.accent : palette.rockLight}
                  metalness={0.15}
                  roughness={0.65}
                  flatShading
                />
              </mesh>
            ))
          ) : (
            <mesh>
              <torusGeometry args={[ring.radius, 0.027, 6, 100]} />
              <meshStandardMaterial
                color={palette.accent}
                emissive={palette.accent}
                emissiveIntensity={0.65}
              />
            </mesh>
          )}
          {ring.broken && (
            <mesh>
              <torusGeometry args={[ring.radius - 0.22, 0.016, 4, 100]} />
              <meshBasicMaterial color={palette.accent} transparent opacity={0.75} />
            </mesh>
          )}
        </group>
      ))}
      <FloatingObjects world={world} palette={palette} paused={paused} />
      <Particles world={world} color={palette.accent} paused={paused} />
    </group>
  )
}

function CameraRig({
  world,
  view,
  reset,
  paused,
}: {
  world: WorldData
  view: CameraView
  reset: number
  paused: boolean
}) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera, gl } = useThree()
  const pose = useMemo(() => getCameraPose(world, view), [world, view])
  useEffect(() => {
    camera.position.set(...pose.position)
    controls.current?.target.set(...pose.target)
    controls.current?.update()
  }, [camera, pose, reset])
  useEffect(() => {
    const canvas = gl.domElement
    canvas.setAttribute('tabindex', '0')
    canvas.setAttribute(
      'aria-label',
      'Explorar mundo 3D. Flechas para rotar, más y menos para zoom, R para restablecer.',
    )
    const handleKey = (event: KeyboardEvent) => {
      if (
        !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'r', 'R'].includes(
          event.key,
        )
      )
        return
      event.preventDefault()
      const target = controls.current?.target ?? new Vector3(...pose.target)
      const offset = camera.position.clone().sub(target)
      const spherical = new Spherical().setFromVector3(offset)
      if (event.key === 'ArrowLeft') spherical.theta -= 0.12
      if (event.key === 'ArrowRight') spherical.theta += 0.12
      if (event.key === 'ArrowUp') spherical.phi = Math.max(0.18, spherical.phi - 0.1)
      if (event.key === 'ArrowDown') spherical.phi = Math.min(Math.PI * 0.72, spherical.phi + 0.1)
      if (event.key === '+' || event.key === '=')
        spherical.radius = Math.max(5, spherical.radius - 0.7)
      if (event.key === '-') spherical.radius = Math.min(23, spherical.radius + 0.7)
      camera.position.copy(new Vector3().setFromSpherical(spherical).add(target))
      if (event.key.toLowerCase() === 'r') {
        camera.position.set(...pose.position)
        controls.current?.target.set(...pose.target)
      }
      controls.current?.update()
    }
    canvas.addEventListener('keydown', handleKey)
    return () => canvas.removeEventListener('keydown', handleKey)
  }, [camera, gl, pose])
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={5}
      maxDistance={23}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI * 0.72}
      enableDamping={!paused}
      dampingFactor={0.07}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      target={pose.target}
    />
  )
}
function PostcardExporter({
  world,
  captureRequest,
  onCaptured,
}: {
  world: WorldData
  captureRequest: number
  onCaptured?: (success: boolean) => void
}) {
  const { gl, scene, camera } = useThree()
  const handled = useRef(0)
  useEffect(() => {
    if (!captureRequest || captureRequest === handled.current) return
    handled.current = captureRequest
    try {
      gl.render(scene, camera)
      const source = gl.domElement
      const width = 1600
      const height = 1000
      const postcard = document.createElement('canvas')
      postcard.width = width
      postcard.height = height
      const ctx = postcard.getContext('2d')
      if (!ctx) {
        onCaptured?.(false)
        return
      }
      const palette = palettes[world.paletteId]
      const info = archetypeInfo[world.config.archetype]
      const worldNumber = String(hashSeed(world.config.seed) % 10000).padStart(4, '0')

      ctx.fillStyle = palette.background
      ctx.fillRect(0, 0, width, height)

      const glow = ctx.createRadialGradient(
        width * 0.52,
        height * 0.45,
        40,
        width * 0.52,
        height * 0.45,
        width * 0.52,
      )
      glow.addColorStop(0, `${palette.accent}24`)
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      const scale = Math.min((width * 0.92) / source.width, (height * 0.88) / source.height)
      const drawW = source.width * scale
      const drawH = source.height * scale
      const drawX = (width - drawW) / 2
      const drawY = (height - drawH) / 2 - 20
      ctx.drawImage(source, drawX, drawY, drawW, drawH)

      ctx.strokeStyle = `${palette.accent}38`
      ctx.lineWidth = 1.5
      ctx.strokeRect(44, 44, width - 88, height - 88)

      ctx.fillStyle = palette.accent
      ctx.font = '600 13px Manrope, sans-serif'
      ctx.fillText(`IMPOSSIBLE ATLAS  ·  N.º ${worldNumber}`, 80, 92)

      ctx.fillStyle = '#bcc9b1'
      ctx.font = '500 13px "DM Sans", sans-serif'
      ctx.fillText(`${info.index} / ${info.name.toUpperCase()}`, 80, height - 150)

      ctx.fillStyle = '#eef0e2'
      ctx.font = '400 52px Georgia, serif'
      ctx.fillText(world.name, 80, height - 96)

      ctx.fillStyle = '#9aa894'
      ctx.font = '400 16px "DM Sans", sans-serif'
      ctx.fillText(world.description, 80, height - 64)

      ctx.textAlign = 'right'
      ctx.fillStyle = palette.accent
      ctx.font = '500 13px monospace'
      ctx.fillText(`SEMILLA ${world.config.seed}`, width - 80, height - 64)

      const dataUrl = postcard.toDataURL('image/png')
      const link = document.createElement('a')
      const safeSeed = world.config.seed.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
      link.download = `impossible-atlas-${safeSeed}.png`
      link.href = dataUrl
      link.click()
      onCaptured?.(true)
    } catch {
      onCaptured?.(false)
    }
  }, [captureRequest, camera, gl, onCaptured, scene, world])
  return null
}
function ContextMonitor({ onLost }: { onLost: (lost: boolean) => void }) {
  const { gl } = useThree()
  useEffect(() => {
    const handleLost = (event: Event) => {
      event.preventDefault()
      onLost(true)
    }
    const canvas = gl.domElement
    canvas.addEventListener('webglcontextlost', handleLost)
    return () => canvas.removeEventListener('webglcontextlost', handleLost)
  }, [gl, onLost])
  return null
}
export default function WorldScene({
  world,
  paused,
  reset,
  view = 'orbit',
  quality = 'auto',
  captureRequest = 0,
  onCaptured,
}: {
  world: WorldData
  paused: boolean
  reset: number
  view?: CameraView
  quality?: QualityProfile
  captureRequest?: number
  onCaptured?: (success: boolean) => void
}) {
  const [lost, setLost] = useState(false)
  const palette = palettes[world.paletteId]
  const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches
  const useShadows = quality === 'high' ? true : quality === 'eco' ? false : !mobile
  const maxDpr = quality === 'high' ? 2 : quality === 'eco' ? 1.1 : mobile ? 1.3 : 1.75
  const lightMultiplier = 0.5 + world.config.lightIntensity / 100
  const supported = useMemo(() => {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2')
      if (!context) return false
      context.getExtension('WEBGL_lose_context')?.loseContext()
      return true
    } catch {
      return false
    }
  }, [])
  if (!supported || lost) return <SceneFallback />
  return (
    <SceneBoundary>
      <Canvas
        camera={{ position: [9, 6.5, 11], fov: mobile ? 48 : 42, near: 0.1, far: 70 }}
        frameloop={paused ? 'demand' : 'always'}
        dpr={[1, maxDpr]}
        shadows={useShadows}
        gl={{
          antialias: quality !== 'eco',
          alpha: true,
          powerPreference: quality === 'eco' ? 'low-power' : 'high-performance',
        }}
      >
        <fog attach="fog" args={[palette.background, 22, 45]} />
        <ambientLight
          intensity={0.9 * lightMultiplier}
          color={world.config.atmosphere === 'nebula' ? '#c5b4f4' : palette.light}
        />
        <hemisphereLight args={[palette.light, palette.rock, 1.5 * lightMultiplier]} />
        <directionalLight
          position={[-4, 9, 5]}
          intensity={(world.config.atmosphere === 'dawn' ? 3.6 : 2.7) * lightMultiplier}
          color={palette.light}
          castShadow={useShadows}
          shadow-mapSize={quality === 'high' ? [1536, 1536] : [1024, 1024]}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
          shadow-normalBias={0.04}
        />
        <directionalLight
          position={[5, 3, -6]}
          intensity={2.2 * lightMultiplier}
          color={world.config.atmosphere === 'nebula' ? '#c3a6ff' : palette.foliage}
        />
        <Diorama key={JSON.stringify(world.config)} world={world} paused={paused} />
        <CameraRig world={world} view={view} reset={reset} paused={paused} />
        <PostcardExporter world={world} captureRequest={captureRequest} onCaptured={onCaptured} />
        <ContextMonitor onLost={setLost} />
      </Canvas>
    </SceneBoundary>
  )
}
