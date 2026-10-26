'use client'
import { Suspense, useMemo } from 'react'
import { StudioEnvironment } from '@/components/atoms/studio-environment'
import { readThemeColor } from '@/lib/color-tokens'
import { GlassElements } from './glass-elements'
import { HeroLight } from './hero-light'

/** The hero's 3D layer: the drifting light and the glass icons. */
export const HeroScene = () => {
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when the theme's CSS variables can be read.
  const background = useMemo(() => readThemeColor('background'), [])

  return (
    <>
      {/* why: fog in the page colour sinks the farther icons into it, so
          depth reads without a floor or a horizon. */}
      <fog attach="fog" args={[background, 8, 16]} />
      <StudioEnvironment />
      <HeroLight />
      {/* why: Suspense renders nothing until the models have loaded. */}
      <Suspense fallback={null}>
        <GlassElements />
      </Suspense>
    </>
  )
}
