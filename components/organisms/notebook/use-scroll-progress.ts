import { useEffect, useRef, type RefObject } from 'react'
import { MathUtils } from 'three'

type Options = {
  /**
   * Once the scroll reaches this progress, never report less for the rest
   * of the visit; above it the progress still follows the scroll.
   */
  holdFrom?: number
}

// why: returns a ref, not state, so scrolling never re-renders React; the 3D
// loop (useFrame) reads `.current` on every frame instead.
// invariant: 0 while the section's top reaches the viewport top, 1 when its
// bottom reaches the viewport bottom; clamped in between.
export const useScrollProgress = (
  target: RefObject<HTMLElement | null>,
  { holdFrom }: Options = {}
) => {
  const progress = useRef(0)
  // invariant: only ever goes false → true, and lives in memory, so a reload
  // starts the animation over.
  const held = useRef(false)
  // why: the browser restores the scroll on reload, so a page reloaded past
  // the hold point would hold at once; holding needs the point to be reached
  // from before it, by scrolling, in this visit.
  const seenBeforeHold = useRef(false)

  useEffect(() => {
    const update = () => {
      const element = target.current
      if (!element) return
      const { top, height } = element.getBoundingClientRect()
      const scrollable = height - window.innerHeight
      const raw = scrollable > 0 ? MathUtils.clamp(-top / scrollable, 0, 1) : 0
      if (holdFrom !== undefined) {
        if (raw < holdFrom) seenBeforeHold.current = true
        else if (seenBeforeHold.current) held.current = true
      }
      progress.current =
        held.current && holdFrom !== undefined ? Math.max(raw, holdFrom) : raw
    }

    update()
    // why: passive tells the browser this listener never blocks scrolling.
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [target, holdFrom])

  return progress
}
