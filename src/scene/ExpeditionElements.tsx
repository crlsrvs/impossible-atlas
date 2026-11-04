import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CatmullRomCurve3,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
  TubeGeometry,
  Vector3,
} from 'three'
import type { Palette, WorldData, WorldFeature } from '../core/world'

function Drift({
  phase,
  speed,
  paused,
  children,
}: {
  phase: number
  speed: number
  paused: boolean
  children: ReactNode
}) {
  const ref = useRef<Group>(null)
  const time = useRef(0)
  useFrame((_, delta) => {
    if (!ref.current || paused) return
    time.current += Math.min(delta, 0.05) * speed
    ref.current.position.y = Math.sin(time.current * 0.7 + phase) * 0.07
    ref.current.rotation.y = Math.sin(time.current * 0.25 + phase) * 0.12
  })
  return <group ref={ref}>{children}</group>
}

function TowerWindows({ color }: { color: string }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const object = new Object3D()
    let index = 0
    for (let face = 0; face < 4; face++) {
      const angle = (face * Math.PI) / 2
      for (const column of [-0.2, 0.2])
        for (const row of [0.23, 0.49, 0.75]) {
          object.position.set(
            Math.sin(angle) * 0.506 + Math.cos(angle) * column,
            row,
            Math.cos(angle) * 0.506 - Math.sin(angle) * column,
          )
          object.rotation.set(0, angle, 0)
          object.scale.set(0.075, 0.11, 0.012)
          object.updateMatrix()
          ref.current!.setMatrixAt(index++, object.matrix)
        }
    }
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 24]}>
      <boxGeometry />
      <meshBasicMaterial color={color} />
    </instancedMesh>
  )
}
function Tower({
  palette,
  feature,
  speed,
  paused,
}: {
  palette: Palette
  feature: WorldFeature
  speed: number
  paused: boolean
}) {
  return (
    <>
      <mesh position={[0, -0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.25, 0.16, 1.25]} />
        <meshStandardMaterial color={palette.rockLight} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry />
        <meshStandardMaterial color={palette.rockLight} roughness={0.8} />
      </mesh>
      <TowerWindows color={palette.accent} />
      <mesh position={[0, 1.025, 0]} castShadow>
        <boxGeometry args={[1.15, 0.12, 1.15]} />
        <meshStandardMaterial color={palette.foliageLight} />
      </mesh>
      <Drift phase={feature.phase} speed={speed} paused={paused}>
        <mesh position={[0, 1.22, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.65, 0.2, 4]} />
          <meshStandardMaterial color={palette.foliage} metalness={0.25} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <octahedronGeometry args={[0.12]} />
          <meshStandardMaterial
            color={palette.accent}
            emissive={palette.accent}
            emissiveIntensity={0.6}
          />
        </mesh>
      </Drift>
    </>
  )
}
function Bridge({ palette }: { palette: Palette }) {
  return (
    <>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 0.12, 1]} />
        <meshStandardMaterial color={palette.rockLight} />
      </mesh>
      {[-0.48, 0.48].map((x) => (
        <mesh key={x} position={[x, 0.25, 0]}>
          <boxGeometry args={[0.07, 0.06, 1]} />
          <meshStandardMaterial color={palette.accent} />
        </mesh>
      ))}
      {[-0.4, 0, 0.4].flatMap((z) =>
        [-0.48, 0.48].map((x) => (
          <mesh key={`${x}:${z}`} position={[x, 0.13, z]}>
            <boxGeometry args={[0.07, 0.25, 0.035]} />
            <meshStandardMaterial color={palette.accent} />
          </mesh>
        )),
      )}
    </>
  )
}

function RisingSand({ color, speed, paused }: { color: string; speed: number; paused: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  const time = useRef(0)
  const object = useMemo(() => new Object3D(), [])
  useFrame((_, delta) => {
    if (!ref.current) return
    if (!paused) time.current += Math.min(delta, 0.05) * speed * 0.25
    for (let i = 0; i < 16; i++) {
      const progress = (i / 16 + time.current) % 1
      object.position.set(
        Math.sin(i * 2.4) * 0.025,
        0.67 + progress * 1.75,
        Math.cos(i * 2.4) * 0.025,
      )
      object.scale.setScalar(0.018 + (i % 3) * 0.005)
      object.updateMatrix()
      ref.current.setMatrixAt(i, object.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 16]} frustumCulled={false}>
      <octahedronGeometry />
      <meshBasicMaterial color={color} />
    </instancedMesh>
  )
}
function Hourglass({
  palette,
  speed,
  paused,
}: {
  palette: Palette
  speed: number
  paused: boolean
}) {
  return (
    <>
      {[0.15, 2.83].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <cylinderGeometry args={[0.9, 0.9, 0.16, 10]} />
          <meshStandardMaterial color={palette.rockLight} metalness={0.25} roughness={0.6} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 0.85,
            1.5,
            Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 0.85,
          ]}
          castShadow
        >
          <cylinderGeometry args={[0.045, 0.045, 2.6, 6]} />
          <meshStandardMaterial color={palette.accent} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.65, 0.045, 1.1, 10, 1, true]} />
        <meshStandardMaterial
          color={palette.foliageLight}
          side={DoubleSide}
          transparent
          opacity={0.2}
          roughness={0.15}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.045, 0.65, 1.1, 10, 1, true]} />
        <meshStandardMaterial
          color={palette.foliageLight}
          side={DoubleSide}
          transparent
          opacity={0.2}
          roughness={0.15}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.56, 0]}>
        <coneGeometry args={[0.52, 0.3, 12]} />
        <meshStandardMaterial color={palette.accent} />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <cylinderGeometry args={[0.48, 0, 0.65, 10]} />
        <meshStandardMaterial color={palette.accent} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.075, 0.022, 5, 16]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>
      <RisingSand color={palette.accent} speed={speed} paused={paused} />
    </>
  )
}

function Jellyfish({
  feature,
  palette,
  speed,
  paused,
}: {
  feature: WorldFeature
  palette: Palette
  speed: number
  paused: boolean
}) {
  const tentacleGeometries = useMemo(
    () =>
      Array.from({ length: 6 + feature.variant }, (_, i) => {
        const angle = (i / (6 + feature.variant)) * Math.PI * 2
        const x = Math.cos(angle) * 0.43
        const z = Math.sin(angle) * 0.43
        const curve = new CatmullRomCurve3([
          new Vector3(x, 0, z),
          new Vector3(x * 1.1, -0.4, z + Math.sin(i + feature.phase) * 0.12),
          new Vector3(x * 0.6 + Math.sin(i) * 0.12, -0.85, z * 0.8),
          new Vector3(x * 0.55, -1.35 - Math.sin(i * 1.7) * 0.16, z * 0.55),
        ])
        return new TubeGeometry(curve, 10, i % 2 ? 0.014 : 0.023, 4, false)
      }),
    [feature.variant, feature.phase],
  )
  useEffect(
    () => () => {
      tentacleGeometries.forEach((geometry) => geometry.dispose())
    },
    [tentacleGeometries],
  )
  return (
    <Drift phase={feature.phase} speed={speed} paused={paused}>
      <mesh castShadow>
        <sphereGeometry args={[0.64, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={palette.foliage}
          transparent
          opacity={0.86}
          side={DoubleSide}
          emissive={palette.foliage}
          emissiveIntensity={0.18}
          roughness={0.35}
          flatShading
        />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.025, 5, 24]} />
        <meshStandardMaterial
          color={palette.foliageLight}
          emissive={palette.foliageLight}
          emissiveIntensity={0.6}
        />
      </mesh>
      {tentacleGeometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial
            color={i % 2 ? palette.accent : palette.foliageLight}
            emissive={palette.foliageLight}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </Drift>
  )
}

function LavaChannel({ paused, speed, phase }: { paused: boolean; speed: number; phase: number }) {
  const { curve, geometry } = useMemo(() => {
    const path = new CatmullRomCurve3([
      new Vector3(0.6, 1.91, 0),
      new Vector3(0.9, 1.66, 0.08),
      new Vector3(1.35, 1.03, 0.15),
      new Vector3(1.9, 0.22, 0.2),
      new Vector3(2.3, 0.055, 0.3),
      new Vector3(3.15, 0.03, 0.4),
      new Vector3(3.2, -1.15, 0.42),
    ])
    return {
      curve: path,
      geometry: new TubeGeometry(path, 32, 0.065, 6, false),
    }
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const bead = useRef<Mesh>(null)
  const time = useRef(phase)
  useFrame((_, delta) => {
    if (!bead.current) return
    if (!paused) time.current += Math.min(delta, 0.05) * speed * 0.12
    bead.current.position.copy(curve.getPoint(time.current % 1))
  })
  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#ff7844"
          emissive="#ff4b18"
          emissiveIntensity={1.6}
          roughness={0.6}
        />
      </mesh>
      <mesh ref={bead}>
        <icosahedronGeometry args={[0.085]} />
        <meshBasicMaterial color="#ffe5a1" />
      </mesh>
    </>
  )
}
function Volcano({
  feature,
  palette,
  speed,
  paused,
}: {
  feature: WorldFeature
  palette: Palette
  speed: number
  paused: boolean
}) {
  return (
    <>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 2, 1.9, 12, 1, true]} />
        <meshStandardMaterial color={palette.rock} roughness={0.95} side={DoubleSide} flatShading />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <cylinderGeometry args={[0.68, 0.42, 0.48, 12, 1, true]} />
        <meshStandardMaterial color={palette.rock} side={DoubleSide} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 1.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.44, 16]} />
        <meshStandardMaterial color="#ffb14e" emissive="#ff6832" emissiveIntensity={2.4} />
      </mesh>
      <mesh position={[0, 1.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.69, 0.055, 5, 12]} />
        <meshStandardMaterial color="#ffab65" emissive="#ff6832" emissiveIntensity={0.9} />
      </mesh>
      {[0.55, 2.65, 4.7].map((angle, i) => (
        <group key={angle} rotation={[0, angle + feature.variant * 0.2, 0]}>
          <LavaChannel speed={speed} paused={paused} phase={feature.phase + i * 0.3} />
        </group>
      ))}
    </>
  )
}

export default function ExpeditionElements({
  world,
  palette,
  paused,
}: {
  world: WorldData
  palette: Palette
  paused: boolean
}) {
  const speed = world.config.animationSpeed / 50
  return (
    <>
      {world.features?.map((feature, i) => (
        <group
          key={i}
          position={feature.position}
          rotation={feature.rotation}
          scale={feature.scale}
        >
          {feature.kind === 'tower' && (
            <Tower feature={feature} palette={palette} paused={paused} speed={speed} />
          )}
          {feature.kind === 'bridge' && <Bridge palette={palette} />}
          {feature.kind === 'hourglass' && (
            <Hourglass palette={palette} paused={paused} speed={speed} />
          )}
          {feature.kind === 'obelisk' && (
            <>
              <mesh position={[0, 0.6, 0]} castShadow>
                <cylinderGeometry args={[0.45, 0.65, 1.2, 4]} />
                <meshStandardMaterial color={palette.rockLight} metalness={0.15} flatShading />
              </mesh>
              <mesh position={[0, 1.5, 0]}>
                <octahedronGeometry args={[0.42]} />
                <meshStandardMaterial
                  color={palette.accent}
                  emissive={palette.accent}
                  emissiveIntensity={0.25}
                />
              </mesh>
            </>
          )}
          {feature.kind === 'dune' && (
            <mesh receiveShadow>
              <sphereGeometry args={[1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={palette.light} roughness={1} flatShading />
            </mesh>
          )}
          {feature.kind === 'sun' && (
            <Drift phase={feature.phase} paused={paused} speed={speed}>
              <mesh>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial
                  color={palette.foliageLight}
                  emissive={palette.foliageLight}
                  emissiveIntensity={0.8}
                  flatShading
                />
              </mesh>
              <mesh rotation={[0.5, 0.4, 0.15]}>
                <torusGeometry args={[1.4, 0.025, 4, 40]} />
                <meshBasicMaterial color={palette.accent} />
              </mesh>
            </Drift>
          )}
          {feature.kind === 'jellyfish' && (
            <Jellyfish feature={feature} palette={palette} paused={paused} speed={speed} />
          )}
          {feature.kind === 'volcano' && (
            <Volcano feature={feature} palette={palette} paused={paused} speed={speed} />
          )}
        </group>
      ))}
    </>
  )
}
