'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, SRGBColorSpace, type Group } from 'three'
import { readColorToken } from '@/lib/color-tokens'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { LAYOUT_WIDTH, anchorToWorld } from './glass-motion'
import { lightDrift } from './light-drift'

// why: the hero's top left, behind the icons and clear of the copy below.
// Anchored to the view like the icons, so it stays on screen on narrow
// phones; on 1440×900 it rests at x -2.8, y 2.
const ANCHOR = [-0.56, 0.64] as const
const DEPTH = -1.5
const CORE_RADIUS = 0.14
const HALO_SIZE = 3.2
// why: an emissive core reads as over-exposed, like a lamp in a photo: past
// 1 the mist clips to white, so nothing lit in the scene outshines it.
const CORE_GAIN = 2
// why: candela, fading with the square of the distance; enough to tint the
// glass icons a few units away.
const INTENSITY = 160
const HALO_TEXTURE_SIZE = 256

/**
 * A soft round glow: the core colour at the centre fading through the halo
 * colour to transparent at the edge. Drawn once on a 2D canvas, so no image
 * is downloaded.
 */
const createHalo = (core: string, halo: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = HALO_TEXTURE_SIZE
  canvas.height = HALO_TEXTURE_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is not available for the halo.')
  const centre = HALO_TEXTURE_SIZE / 2
  const gradient = context.createRadialGradient(
    centre,
    centre,
    0,
    centre,
    centre,
    centre
  )
  gradient.addColorStop(0, core)
  gradient.addColorStop(0.08, core)
  gradient.addColorStop(0.3, halo)
  // why: the halo colour at zero alpha, not `transparent` (black at zero
  // alpha), which would darken the fade into a grey rim.
  gradient.addColorStop(1, `#${new Color(halo).getHexString()}00`)
  context.fillStyle = gradient
  context.fillRect(0, 0, HALO_TEXTURE_SIZE, HALO_TEXTURE_SIZE)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * The hero's light source: an emissive core with a soft halo, plus a real
 * point light at the same spot that tints the icons facing it. Core in mist,
 * halo in primary. It drifts in a slow figure-eight (light-drift.ts) and
 * rests under reduced motion.
 */
export const HeroLight = () => {
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when a canvas and the theme's CSS variables are available.
  const colors = useMemo(
    () => ({ core: readColorToken('mist'), halo: readColorToken('primary') }),
    []
  )
  const glow = useMemo(
    () => new Color(colors.core).multiplyScalar(CORE_GAIN),
    [colors]
  )
  const halo = useMemo(() => createHalo(colors.core, colors.halo), [colors])
  useEffect(() => () => halo.dispose(), [halo])
  // why: the view at the light's own depth; the selectors re-render only on
  // resize. Narrow views shrink the glow with them, as they do the icons.
  const viewport = useThree(state => state.viewport)
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  const view = viewport.getCurrentViewport(camera, [0, 0, DEPTH], size)
  const home = anchorToWorld(ANCHOR, view)
  const fit = Math.min(1, viewport.width / LAYOUT_WIDTH)
  const group = useRef<Group>(null)
  // why: read once and on change, not per frame; the light snaps back to
  // rest the moment reduced motion turns on (T9).
  const still = useRef(true)
  useEffect(() => {
    still.current = prefersReducedMotion()
    return onReducedMotionChange(() => {
      still.current = prefersReducedMotion()
    })
  }, [])

  useFrame(({ clock }) => {
    if (!group.current) return
    const drift = still.current ? { x: 0, y: 0 } : lightDrift(clock.elapsedTime)
    group.current.position.set(home.x + drift.x, home.y + drift.y, DEPTH)
  })

  return (
    <group ref={group} position={[home.x, home.y, DEPTH]} scale={fit}>
      {/* why: unlit, untoned and unfogged, so the core keeps its brightness
          at any distance. */}
      <mesh>
        <sphereGeometry args={[CORE_RADIUS, 32, 16]} />
        <meshBasicMaterial color={glow} toneMapped={false} fog={false} />
      </mesh>
      {/* why: a sprite always faces the camera, so the glow reads round from
          any angle; depthWrite off keeps it from hiding what is behind. */}
      <sprite scale={HALO_SIZE}>
        <spriteMaterial
          map={halo}
          transparent
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </sprite>
      <pointLight color={colors.core} intensity={INTENSITY} />
    </group>
  )
}
