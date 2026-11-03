import { useEffect, useRef, type RefObject } from 'react'
import { MathUtils } from 'three'

// why: returns a ref, not state, so scrolling never re-renders React; the 3D
// loop (useFrame) reads `.current` on every frame instead.
// invariant: 0 while the section's top reaches the viewport top, 1 when its
// bottom reaches the viewport bottom; clamped in between.
export const useScrollProgress = (target: RefObject<HTMLElement | null>) => {
  const progress = useRef(0)

  useEffect(() => {
    const update = () => {
      const element = target.current
      if (!element) return
      const { top, height } = element.getBoundingClientRect()
      const scrollable = height - window.innerHeight
      progress.current =
        scrollable > 0 ? MathUtils.clamp(-top / scrollable, 0, 1) : 0
    }

    update()
    // why: passive tells the browser this listener never blocks scrolling.
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [target])

  return progress
}
