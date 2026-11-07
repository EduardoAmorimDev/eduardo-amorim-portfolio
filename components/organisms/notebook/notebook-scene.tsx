'use client'
import { Suspense, useEffect, useMemo, type RefObject } from 'react'
import { CanvasTexture } from 'three'
import { StudioEnvironment } from '@/components/atoms/studio-environment'
import { readColorToken, readThemeColor } from '@/lib/color-tokens'
import { DeviceCarousel } from './device-carousel'
import type { Device } from './stages'

// why: the projects section alone (app/embed/projetos), shown live on every
// device's screen, laid out at that device's width.
const SCREEN_URL = '/embed/projetos'
// invariant: the laptop floats around y = 0; the floor sits below its lowest
// point in every pose, plus room for the bobbing.
const FLOOR_Y = -2
// why: spotlight intensity is in candela and fades with the square of the
// distance; ~8 units down to the floor needs this much to light it visibly.
const SPOT_INTENSITY = 300
const FLOOR_SIZE = 30
// why: fractions of the floor's half width; opaque around the laptop, then
// fading out well before the plane's edge, into the page background.
const FLOOR_FADE = { from: 0.25, to: 0.7 }
const FLOOR_MASK_SIZE = 256

const readSceneColors = () => ({
  background: readThemeColor('background'),
  keyLight: readColorToken('primary'),
  fillLight: readColorToken('mist')
})

/** An alpha map: white (opaque) in the middle, black (clear) at the rim. */
const createFloorMask = () => {
  const canvas = document.createElement('canvas')
  canvas.width = FLOOR_MASK_SIZE
  canvas.height = FLOOR_MASK_SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is not available for the floor.')
  const centre = FLOOR_MASK_SIZE / 2
  const gradient = context.createRadialGradient(
    centre,
    centre,
    centre * FLOOR_FADE.from,
    centre,
    centre,
    centre * FLOOR_FADE.to
  )
  gradient.addColorStop(0, 'white')
  gradient.addColorStop(1, 'black')
  context.fillStyle = gradient
  context.fillRect(0, 0, FLOOR_MASK_SIZE, FLOOR_MASK_SIZE)
  return new CanvasTexture(canvas)
}

type NotebookSceneProps = {
  progress: RefObject<number>
  /** Whether the devices' screens show the live site; black otherwise. */
  screenLive: boolean
  /** The visitor's own device, which the carousel ends on. */
  viewer: Device
}

/** Phone, tablet and laptop on a floor, under two spotlights, driven by the scroll. */
export const NotebookScene = ({
  progress,
  screenLive,
  viewer
}: NotebookSceneProps) => {
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when the theme's CSS variables can be read.
  const colors = useMemo(() => readSceneColors(), [])
  const floorMask = useMemo(() => createFloorMask(), [])
  useEffect(() => () => floorMask.dispose(), [floorMask])

  return (
    <>
      {/* why: no scene background; the canvas is transparent, so the sky is
          the page's own background. Fog in that colour fades the far floor
          into it, with no horizon line. */}
      <fog attach="fog" args={[colors.background, 8, 16]} />

      <StudioEnvironment />

      {/* why: spotlights shine as a cone towards `target` (the origin by
          default), like stage lights; both sit above the laptop, side by
          side, and light up the floor in the brand's violet and mist. */}
      <spotLight
        color={colors.keyLight}
        position={[-1.5, 6, 1]}
        angle={0.6}
        penumbra={0.6}
        intensity={SPOT_INTENSITY}
      />
      <spotLight
        color={colors.fillLight}
        position={[1.5, 6, 1]}
        angle={0.6}
        penumbra={0.6}
        intensity={SPOT_INTENSITY}
      />

      {/* why: Suspense renders nothing until the model has loaded. */}
      <Suspense fallback={null}>
        <DeviceCarousel
          progress={progress}
          screenUrl={screenLive ? SCREEN_URL : undefined}
          viewer={viewer}
        />
      </Suspense>

      {/* why: a plane is vertical by default; -90° around X lays it flat
          to act as the floor the spotlights shine on. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, 0]}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial
          color={colors.background}
          roughness={0.9}
          alphaMap={floorMask}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* why: no shadow is computed while the stage runs: the contact
          shadow drew the scene again from below and blurred it every
          frame, which a phone's GPU could not afford (the user, 2026-11-07,
          for every device). */}
    </>
  )
}
