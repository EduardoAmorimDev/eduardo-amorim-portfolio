import { useEffect, useRef, type RefObject } from 'react'
import { MathUtils } from 'three'

// why: scroll offsets are rounded to device pixels, so stopping at the very
// end can read 0.999; by 0.99 the laptop is already open and lit.
const HOLD_FROM = 0.99

type Options = {
  /** Once the progress reaches the end, keep it at 1 for the rest of the visit. */
  holdAtEnd?: boolean
}

// why: returns a ref, not state, so scrolling never re-renders React; the 3D
// loop (useFrame) reads `.current` on every frame instead.
// invariant: 0 while the section's top reaches the viewport top, 1 when its
// bottom reaches the viewport bottom; clamped in between.
export const useScrollProgress = (
  target: RefObject<HTMLElement | null>,
  { holdAtEnd = false }: Options = {}
) => {
  const progress = useRef(0)
  // invariant: only ever goes false → true, and lives in memory, so a reload
  // starts the animation over.
  const held = useRef(false)
  // why: the browser restores the scroll on reload, so a page reloaded at or
  // below the end would hold at once; holding needs the end to be reached
  // from before it, by scrolling, in this visit.
  const seenBeforeEnd = useRef(false)

  useEffect(() => {
    const update = () => {
      const element = target.current
      if (!element || held.current) return
      const { top, height } = element.getBoundingClientRect()
      const scrollable = height - window.innerHeight
      progress.current =
        scrollable > 0 ? MathUtils.clamp(-top / scrollable, 0, 1) : 0
      if (progress.current < HOLD_FROM) seenBeforeEnd.current = true
      else if (holdAtEnd && seenBeforeEnd.current) {
        held.current = true
        progress.current = 1
      }
    }

    update()
    // why: passive tells the browser this listener never blocks scrolling.
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [target, holdAtEnd])

  return progress
}
