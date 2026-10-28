'use client'
import { MeshTransmissionMaterial, useGLTF } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  MathUtils,
  Mesh,
  SRGBColorSpace,
  type BufferGeometry,
  type Group,
  type Matrix4,
  type Texture
} from 'three'
import { readColorToken } from '@/lib/color-tokens'
import { BEHIND_LAYER } from './black-hole'
import {
  GLASS_LAYOUT,
  LAYOUT_WIDTH,
  anchorToWorld,
  motionTarget,
  type GlassLayout
} from './glass-motion'

// why: the models come from canvas-lab (assets/glass/<name>.glb); each is
// centred on its origin with its largest side at 1 unit. Only their geometry
// is used here; the glass look comes from the material below.
const modelUrl = (name: GlassLayout['name']) => `/models/glass/${name}.glb`
// why: low values glide; the icons should ease into every change, never snap.
const SMOOTHING = 3
// why: diagonal bands, repeated so every icon spans several of them; the
// refraction bends them inside the glass, which is what reads as glass.
const BACKDROP = { size: 512, repeats: 4 }
// why: below 1 the real scene (the black hole, the grid) shows through, so
// the logo reads as translucent instead of solid coloured glass.
const GLASS_OPACITY = 0.7
const STILL_POINTER = { x: 0, y: 0 }

/**
 * What the glass refracts, in place of the near-black scene behind it: the
 * brand's violet with mist streaks and steel shadows; mostly violet, since
 * mist blended with the dark scene behind turns grey. No ink, which would
 * turn whole icons opaque black where its band lands.
 */
const createBackdrop = () => {
  const canvas = document.createElement('canvas')
  canvas.width = BACKDROP.size
  canvas.height = BACKDROP.size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is not available for the glass.')
  const primary = readColorToken('primary')
  const bands = [
    readColorToken('steel'),
    primary,
    readColorToken('mist'),
    primary,
    primary
  ]
  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  )
  const stops = bands.length * BACKDROP.repeats
  for (let i = 0; i <= stops; i++) {
    gradient.addColorStop(i / stops, bands[i % bands.length])
  }
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

type Part = {
  key: string
  geometry: BufferGeometry
  matrix: Matrix4
}

type GlassPartProps = { part: Part; backdrop: Texture; layer: number }

const GlassPart = ({ part, backdrop, layer }: GlassPartProps) => (
  <mesh
    // why: a layer is per object, not inherited, so each mesh is moved to it.
    ref={mesh => mesh?.layers.set(layer)}
    geometry={part.geometry}
    matrix={part.matrix}
    matrixAutoUpdate={false}
  >
    {/* why: a given `buffer` makes drei skip its per-frame render of the
        scene, so the glass icons cost no extra passes. */}
    <MeshTransmissionMaterial
      buffer={backdrop}
      transparent
      opacity={GLASS_OPACITY}
      samples={8}
      thickness={0.35}
      roughness={0.04}
      ior={1.45}
      chromaticAberration={0.3}
      // hazard: blur and distortion jitter every pixel with noise, which
      // showed as grain on the glass; both stay off.
      anisotropicBlur={0}
      distortion={0}
      clearcoat={1}
      clearcoatRoughness={0.05}
      iridescence={1}
      iridescenceIOR={1.3}
      iridescenceThicknessRange={[200, 420]}
      envMapIntensity={2}
    />
  </mesh>
)

type GlassElementProps = {
  layout: GlassLayout
  phase: number
  backdrop: Texture
}

const GlassElement = ({ layout, phase, backdrop }: GlassElementProps) => {
  const { scene } = useGLTF(modelUrl(layout.name), false)
  const body = useRef<Group>(null)
  const hover = useRef<{ x: number; y: number } | null>(null)
  // why: the view at the icon's own depth, so anchors reach the visible edges
  // at that distance; the selectors re-render only on resize.
  const viewport = useThree(state => state.viewport)
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  const view = viewport.getCurrentViewport(camera, [0, 0, layout.depth], size)
  const home = anchorToWorld(layout.anchor, view)
  // invariant: never above 1, so wide screens keep the designed size.
  const fit = Math.min(1, viewport.width / LAYOUT_WIDTH)

  // why: each mesh is re-rendered with its transform baked into one matrix,
  // so the model's own material and nested groups are never mutated.
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true)
    const found: Part[] = []
    scene.traverse(object => {
      if (object instanceof Mesh) {
        const { uuid, geometry, matrixWorld } = object
        found.push({ key: uuid, geometry, matrix: matrixWorld.clone() })
      }
    })
    return found
  }, [scene])

  useFrame(({ clock, pointer }, delta) => {
    const group = body.current
    if (!group) return
    // why: an icon behind the black hole is deaf to the pointer; it only
    // bobs and sways (task black-hole-behind, 8).
    const target = motionTarget(
      layout.behind ? STILL_POINTER : pointer,
      layout.behind ? null : hover.current,
      clock.elapsedTime,
      phase
    )
    const damp = (from: number, to: number) =>
      MathUtils.damp(from, to, SMOOTHING, delta)
    group.position.x = damp(group.position.x, home.x + target.shiftX)
    group.position.y = damp(group.position.y, home.y + target.shiftY)
    group.rotation.x = damp(group.rotation.x, layout.pose[0] + target.rotationX)
    group.rotation.y = damp(group.rotation.y, layout.pose[1] + target.rotationY)
    group.scale.setScalar(damp(group.scale.x, layout.size * fit * target.scale))
  })

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    const group = body.current
    if (!group) return
    // why: the nearest icon takes the hover; the ones behind stay at rest.
    event.stopPropagation()
    // invariant: the model is 1 unit wide, so its local space spans -0.5..0.5;
    // doubling it gives the -1..1 offset motionTarget expects.
    const local = group.worldToLocal(event.point.clone())
    hover.current = { x: local.x * 2, y: local.y * 2 }
  }

  return (
    <group
      ref={body}
      position={[home.x, home.y, layout.depth]}
      rotation={[...layout.pose]}
      scale={layout.size * fit}
      onPointerMove={onPointerMove}
      onPointerOut={() => (hover.current = null)}
    >
      {parts.map(part => (
        <GlassPart
          key={part.key}
          part={part}
          backdrop={backdrop}
          layer={layout.behind ? BEHIND_LAYER : 0}
        />
      ))}
    </group>
  )
}

/**
 * The translucent glass icons of the hero: the logo, in front, leaning to
 * the pointer, and the icons behind the black hole, seen through its lens.
 */
export const GlassElements = () => {
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when a canvas and the theme's CSS variables are available.
  const backdrop = useMemo(() => createBackdrop(), [])
  useEffect(() => () => backdrop.dispose(), [backdrop])

  return (
    <>
      {GLASS_LAYOUT.map((layout, index) => (
        // why: spreading the phases keeps the icons from bobbing in unison.
        <GlassElement
          key={layout.name}
          layout={layout}
          phase={index * 1.7}
          backdrop={backdrop}
        />
      ))}
    </>
  )
}

for (const { name } of GLASS_LAYOUT) useGLTF.preload(modelUrl(name), false)
