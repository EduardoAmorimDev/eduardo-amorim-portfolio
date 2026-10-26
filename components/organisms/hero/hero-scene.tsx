'use client'
import { Suspense, useMemo, type RefObject } from 'react'
import { StudioEnvironment } from '@/components/atoms/studio-environment'
import { readThemeColor } from '@/lib/color-tokens'
import { BlackHole } from './black-hole-mesh'
import { GlassElements } from './glass-elements'
import type { HoleBody } from './grid-motion'

type HeroSceneProps = {
  /** Where the hero's field puts the black hole, in hero px. */
  hole: RefObject<HoleBody>
}

/** The hero's 3D layer: the wandering black hole and the glass logo. */
export const HeroScene = ({ hole }: HeroSceneProps) => {
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when the theme's CSS variables can be read.
  const background = useMemo(() => readThemeColor('background'), [])

  return (
    <>
      {/* why: fog in the page colour sinks the farther icons into it, so
          depth reads without a floor or a horizon. */}
      <fog attach="fog" args={[background, 8, 16]} />
      <StudioEnvironment />
      <BlackHole hole={hole} />
      {/* why: Suspense renders nothing until the models have loaded. */}
      <Suspense fallback={null}>
        <GlassElements />
      </Suspense>
    </>
  )
}
