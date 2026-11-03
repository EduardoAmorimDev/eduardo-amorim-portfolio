import { useEffect, useRef } from 'react'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from './media-preferences'

// why: a ref, not state, so a render loop (useFrame) can read the visitor's
// motion preference every frame without re-rendering React; it follows the
// preference if it changes with the page open.
export const useReducedMotionRef = () => {
  const still = useRef(false)
  useEffect(() => {
    const sync = () => {
      still.current = prefersReducedMotion()
    }
    sync()
    return onReducedMotionChange(sync)
  }, [])
  return still
}
