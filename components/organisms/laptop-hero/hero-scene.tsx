'use client'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { Suspense, useMemo, type RefObject } from 'react'
import { readColorToken } from '@/lib/color-tokens'
import { GlassElements } from './glass-elements'
import { Laptop } from './laptop'

// why: the latest landing page, shown live on the laptop's screen.
const SCREEN_URL = 'https://kune-joaoeduardoajs-projects.vercel.app/en'
// invariant: the laptop floats around y = 0; the floor sits below its lowest
// point in every pose, plus room for the bobbing.
const FLOOR_Y = -2
// why: spotlight intensity is in candela and fades with the square of the
// distance; ~8 units down to the floor needs this much to light it visibly.
const SPOT_INTENSITY = 300

type HeroSceneProps = { progress: RefObject<number> }

export const HeroScene = ({ progress }: HeroSceneProps) => {
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when the theme's CSS variables can be read.
  const colors = useMemo(
    () => ({
      background: readColorToken('ink'),
      keyLight: readColorToken('primary'),
      fillLight: readColorToken('mist'),
      floor: readColorToken('ink')
    }),
    []
  )

  return (
    <>
      <color attach="background" args={[colors.background]} />
      {/* why: fog in the background colour fades the far floor into the
          backdrop, so the plane's edge never shows as a horizon line. */}
      <fog attach="fog" args={[colors.background, 8, 16]} />

      {/* why: metal is mostly reflection, so aluminium renders black
          without an environment to reflect. Lightformers paint glowing
          panels into it, tinted like the spotlights so reflections match
          the light on the floor. Nothing is downloaded. */}
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          color={colors.keyLight}
          intensity={3}
          position={[-3, 4, 2]}
          scale={[4, 2, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          color={colors.fillLight}
          intensity={3}
          position={[3, 4, 2]}
          scale={[4, 2, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.8}
          position={[0, 1, 6]}
          scale={[8, 3, 1]}
          target={[0, 0, 0]}
        />
        {/* why: glass reads as glass only through what its curves reflect;
            tall strips at the sides and a ring above draw the bright streaks
            along the edges of the glass icons. */}
        <Lightformer
          form="rect"
          color={colors.keyLight}
          intensity={2}
          position={[-6, 0, 1]}
          scale={[1, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          color={colors.fillLight}
          intensity={1.5}
          position={[6, 0, -1]}
          scale={[1, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          color={colors.fillLight}
          intensity={2}
          position={[0, 6, -3]}
          scale={3}
          target={[0, 0, 0]}
        />
      </Environment>

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
        <Laptop progress={progress} screenUrl={SCREEN_URL} />
      </Suspense>
      {/* why: its own boundary, so the laptop never waits for the icons. */}
      <Suspense fallback={null}>
        <GlassElements />
      </Suspense>

      {/* why: a plane is vertical by default; -90° around X lays it flat
          to act as the floor the spotlights shine on. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={colors.floor} roughness={0.9} />
      </mesh>

      {/* why: shadow maps gave two hard shadows, one per light.
          ContactShadows renders the scene from below and blurs it into
          one soft shadow; `far` is how high it still sees the laptop, so
          the shadow fades as the laptop floats up. */}
      <ContactShadows
        position={[0, FLOOR_Y + 0.01, 0]}
        scale={12}
        far={4}
        blur={3}
        opacity={0.7}
        resolution={512}
      />
    </>
  )
}
