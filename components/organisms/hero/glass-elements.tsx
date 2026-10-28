'use client'
import { MeshTransmissionMaterial, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  CanvasTexture,
  Mesh,
  SRGBColorSpace,
  Vector3,
  type Group,
  type BufferGeometry,
  type Matrix4,
  type Texture
} from 'three'
import { readColorToken } from '@/lib/color-tokens'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { BEHIND_LAYER } from './black-hole'
import {
  GLASS_LAYOUT,
  LAYOUT_WIDTH,
  anchorToWorld,
  type GlassLayout
} from './glass-motion'
import type { HoleBody } from './grid-motion'

// why: the logo is pulled by the black hole and by the mouse, each at most
// 8 px, weaker with distance (half at `reach` px); the mouse wins while it
// is over the hero, easing in and out at `swap` per second, and the logo
// follows the pull at `follow` per second (task black-hole-alive, 13).
const PULL = { most: 8, holeReach: 400, mouseReach: 500, swap: 4, follow: 6 }

// why: the models come from canvas-lab (assets/glass/<name>.glb); each is
// centred on its origin with its largest side at 1 unit. Only their geometry
// is used here; the glass look comes from the material below.
const modelUrl = (name: GlassLayout['name']) => `/models/glass/${name}.glb`
// why: diagonal bands, repeated so every icon spans several of them; the
// refraction bends them inside the glass, which is what reads as glass.
const BACKDROP = { size: 512, repeats: 4 }
// why: below 1 the real scene (the black hole, the grid) shows through, so
// the logo reads as translucent instead of solid coloured glass.
const GLASS_OPACITY = 0.7

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
      samples={4}
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
  backdrop: Texture
  /** When given, the black hole and the mouse pull the icon (PULL). */
  hole?: RefObject<HoleBody>
  /** Times its designed size. */
  grow?: number
}

const GlassElement = ({
  layout,
  backdrop,
  hole,
  grow = 1
}: GlassElementProps) => {
  const { scene } = useGLTF(modelUrl(layout.name), false)
  // why: the view at the icon's own depth, so anchors reach the visible edges
  // at that distance; the selectors re-render only on resize.
  const viewport = useThree(state => state.viewport)
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  const view = viewport.getCurrentViewport(camera, [0, 0, layout.depth], size)
  const home = anchorToWorld(layout.anchor, view)
  // invariant: never above 1, so wide screens keep the designed size.
  const fit = Math.min(1, viewport.width / LAYOUT_WIDTH)
  const group = useRef<Group>(null)
  const onScreen = useMemo(() => new Vector3(), [])
  const gl = useThree(state => state.gl)
  const mouse = useRef<{ x: number; y: number } | null>(null)
  const pull = useRef({ x: 0, y: 0, mouse: 0 })
  const still = useRef(true)

  useEffect(() => {
    if (!hole) return
    still.current = prefersReducedMotion()
    const stopMotion = onReducedMotionChange(() => {
      still.current = prefersReducedMotion()
    })
    // why: only a mouse pulls, as with the hero's other pointer effects.
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const box = gl.domElement.getBoundingClientRect()
      const x = event.clientX - box.left
      const y = event.clientY - box.top
      mouse.current =
        x >= 0 && y >= 0 && x <= box.width && y <= box.height ? { x, y } : null
    }
    const onLeave = () => {
      mouse.current = null
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      stopMotion()
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [hole, gl])

  useFrame((_, delta) => {
    const body = group.current
    const black = hole?.current
    if (!body || !black?.horizon || !size.width) return
    onScreen.set(home.x, home.y, layout.depth).project(camera)
    const x = ((onScreen.x + 1) / 2) * size.width
    const y = ((1 - onScreen.y) / 2) * size.height
    /** The pull towards (tx, ty) px: at most PULL.most, half at `reach`. */
    const towards = (tx: number, ty: number, reach: number) => {
      const dx = tx - x
      const dy = ty - y
      const gap = Math.hypot(dx, dy) || 1
      const strength = PULL.most / (1 + (gap / reach) ** 2)
      return { x: (dx / gap) * strength, y: (dy / gap) * strength }
    }
    const fromHole = towards(black.x, black.y, PULL.holeReach)
    const point = still.current ? null : mouse.current
    const fromMouse = point
      ? towards(point.x, point.y, PULL.mouseReach)
      : { x: 0, y: 0 }
    const now = pull.current
    const swap = Math.min(1, PULL.swap * delta)
    now.mouse += ((point ? 1 : 0) - now.mouse) * swap
    // why: the mouse has priority: while it is over the hero its pull
    // replaces the black hole's.
    const aimX = fromHole.x + (fromMouse.x - fromHole.x) * now.mouse
    const aimY = fromHole.y + (fromMouse.y - fromHole.y) * now.mouse
    const follow = still.current ? 1 : Math.min(1, PULL.follow * delta)
    now.x += (aimX - now.x) * follow
    now.y += (aimY - now.y) * follow
    // invariant: px to world units at the icon's depth.
    const unit = view.width / size.width
    body.position.set(
      home.x + now.x * unit,
      home.y - now.y * unit,
      layout.depth
    )
  })

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

  return (
    // why: only the black hole moves in the hero (task black-hole-apple,
    // 1–2): every icon holds its resting pose and ignores the pointer.
    <group
      ref={group}
      position={[home.x, home.y, layout.depth]}
      rotation={[...layout.pose]}
      scale={layout.size * fit * grow}
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
 * The translucent glass icons of the hero, all at rest: the logo, in front,
 * and the icons behind the black hole, seen through its lens.
 */
export const GlassElements = () => {
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when a canvas and the theme's CSS variables are available.
  const backdrop = useMemo(() => createBackdrop(), [])
  useEffect(() => () => backdrop.dispose(), [backdrop])

  return (
    <>
      {GLASS_LAYOUT.map(layout => (
        <GlassElement key={layout.name} layout={layout} backdrop={backdrop} />
      ))}
    </>
  )
}

// why: only the logo is in the hero now (task black-hole-alive, 11).
useGLTF.preload(modelUrl('logo'), false)

type GlassLogoProps = {
  /** Where the hero's field puts the black hole, in hero px. */
  hole: RefObject<HoleBody>
}

/**
 * The glass logo alone, twice its size, in the middle of the hero: in
 * front of the black hole and behind the copy, pulled by the black hole and
 * the mouse (PULL; task black-hole-alive, 13).
 */
export const GlassLogo = ({ hole }: GlassLogoProps) => {
  const backdrop = useMemo(() => createBackdrop(), [])
  useEffect(() => () => backdrop.dispose(), [backdrop])
  const logo = GLASS_LAYOUT.find(layout => layout.name === 'logo')
  if (!logo) return null
  return (
    <GlassElement
      layout={{ ...logo, anchor: [0, 0] }}
      backdrop={backdrop}
      hole={hole}
      grow={2}
    />
  )
}
