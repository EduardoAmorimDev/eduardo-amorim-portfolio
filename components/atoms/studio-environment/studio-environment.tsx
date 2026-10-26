'use client'
import { Environment, Lightformer } from '@react-three/drei'
import { useMemo } from 'react'
import { readColorToken } from '@/lib/color-tokens'

/**
 * The reflections every 3D scene of the page shares: glowing panels in the
 * brand's violet and mist, painted into an environment map. Nothing is
 * downloaded. Render it inside an R3F <Canvas>.
 */
export const StudioEnvironment = () => {
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when the theme's CSS variables can be read.
  const colors = useMemo(
    () => ({ key: readColorToken('primary'), fill: readColorToken('mist') }),
    []
  )

  return (
    // why: metal is mostly reflection, so aluminium renders black without an
    // environment to reflect; the panels are tinted like the spotlights so
    // reflections match the light on the floor.
    <Environment resolution={256}>
      <Lightformer
        form="rect"
        color={colors.key}
        intensity={3}
        position={[-3, 4, 2]}
        scale={[4, 2, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        color={colors.fill}
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
        color={colors.key}
        intensity={2}
        position={[-6, 0, 1]}
        scale={[1, 6, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        color={colors.fill}
        intensity={1.5}
        position={[6, 0, -1]}
        scale={[1, 6, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="ring"
        color={colors.fill}
        intensity={2}
        position={[0, 6, -3]}
        scale={3}
        target={[0, 0, 0]}
      />
    </Environment>
  )
}
