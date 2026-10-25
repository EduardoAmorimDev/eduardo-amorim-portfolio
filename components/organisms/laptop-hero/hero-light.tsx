'use client'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, Color, SRGBColorSpace } from 'three'
import { readColorToken } from '@/lib/color-tokens'
import { LAYOUT_WIDTH, anchorToWorld } from './glass-motion'

// why: above and behind the laptop, off to its left, clear of the glass
// icons, so it lights the floor and the laptop's left side more than their
// right (T16–T17). Anchored to the view like the icons, so it stays on
// screen on narrow phones; on 1440×900 it lands at x -2.8, y 2.
const ANCHOR = [-0.56, 0.64] as const
const DEPTH = -1.5
const CORE_RADIUS = 0.14
const HALO_SIZE = 3.2
// why: an emissive core reads as over-exposed, like a lamp in a photo: past
// 1 the mist clips to white, so nothing lit in the scene outshines it.
const CORE_GAIN = 2
// why: candela, fading with the square of the distance; ~4 units down to the
// floor needs this much to brighten it visibly under the spotlights.
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
  // alpha), which would darken the fade into a grey rim on the light theme.
  gradient.addColorStop(1, `#${new Color(halo).getHexString()}00`)
  context.fillStyle = gradient
  context.fillRect(0, 0, HALO_TEXTURE_SIZE, HALO_TEXTURE_SIZE)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * The hero's light source: an emissive core with a soft halo, plus a real
 * point light at the same spot so the laptop and the floor facing it
 * brighten. Core in mist, halo in primary (task Unresolved 7).
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

  return (
    <group position={[home.x, home.y, DEPTH]} scale={fit}>
      {/* why: unlit, untoned and unfogged, so the core keeps its brightness
          at any distance and in either theme. */}
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
