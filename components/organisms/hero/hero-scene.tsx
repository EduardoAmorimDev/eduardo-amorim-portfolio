'use client'
import type { RefObject } from 'react'
import { BEHIND_LAYER } from './black-hole'
import { BlackHole } from './black-hole-mesh'
import type { HoleBody } from './grid-motion'

type HeroSceneProps = {
  /** Where the hero's field puts the black hole, in hero px. */
  hole: RefObject<HoleBody>
}

/**
 * The hero's 3D layer: the wandering black hole alone, for now (task
 * black-hole-joined-disk, 1); the glass icons and the text wall wait.
 */
export const HeroScene = ({ hole }: HeroSceneProps) => (
  <BlackHole hole={hole} behind={BEHIND_LAYER} />
)
