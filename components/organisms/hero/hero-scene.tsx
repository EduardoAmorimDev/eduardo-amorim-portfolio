'use client'
import { Suspense, type RefObject } from 'react'
import { StudioEnvironment } from '@/components/atoms/studio-environment'
import { BEHIND_LAYER } from './black-hole'
import { BlackHole } from './black-hole-mesh'
import { GlassLogo } from './glass-elements'
import type { HoleBody } from './grid-motion'
import { SpaceSky } from './space-sky'

type HeroSceneProps = {
  /** Where the hero's field puts the black hole, in hero px. */
  hole: RefObject<HoleBody>
}

/**
 * The hero's 3D layer: the wandering black hole and, behind it and seen
 * through its lens, a sky of stars (task space); in front of it, the glass
 * logo (task black-hole-alive, 11).
 */
export const HeroScene = ({ hole }: HeroSceneProps) => (
  <>
    <SpaceSky />
    {/* why: the glass logo needs a studio to reflect; Suspense draws
        nothing until its model has loaded. */}
    <StudioEnvironment />
    <Suspense fallback={null}>
      <GlassLogo hole={hole} />
    </Suspense>
    <BlackHole hole={hole} behind={BEHIND_LAYER} />
  </>
)
