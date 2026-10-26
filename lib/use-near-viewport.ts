import { useEffect, useState, type RefObject } from 'react'

/**
 * Whether `target` is on screen or within `margin` of it; `margin` is an
 * IntersectionObserver `rootMargin`, e.g. `'25% 0px'` for a quarter screen
 * above and below.
 */
export const useNearViewport = (
  target: RefObject<Element | null>,
  margin: string
) => {
  // why: false until the observer first reports, so a page that loads
  // already scrolled starts no work for what it cannot see.
  const [near, setNear] = useState(false)

  useEffect(() => {
    const element = target.current
    if (!element) return
    const observer = new IntersectionObserver(
      entries => {
        const latest = entries.at(-1)
        if (latest) setNear(latest.isIntersecting)
      },
      { rootMargin: margin }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [target, margin])

  return near
}
