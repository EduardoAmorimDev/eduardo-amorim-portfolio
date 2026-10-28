'use client'
import type { RefObject } from 'react'
import { BEHIND_LAYER } from './black-hole'
import { BlackHole } from './black-hole-mesh'
import type { HoleBody } from './grid-motion'
import { SpaceSky } from './space-sky'

type HeroSceneProps = {
  /** Where the hero's field puts the black hole, in hero px. */
  hole: RefObject<HoleBody>
}

/**
 * The hero's 3D layer: the wandering black hole and, behind it and seen
 * through its lens, a sky of stars (task space).
 */
export const HeroScene = ({ hole }: HeroSceneProps) => (
  <>
    <SpaceSky />
    <BlackHole hole={hole} behind={BEHIND_LAYER} />
  </>
)
