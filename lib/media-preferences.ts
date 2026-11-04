const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

const onQueryChange = (query: string, listener: () => void) => {
  const list = window.matchMedia(query)
  list.addEventListener('change', listener)
  return () => list.removeEventListener('change', listener)
}

/** Calls `listener` whenever the reduced-motion preference changes. */
export const onReducedMotionChange = (listener: () => void) =>
  onQueryChange(REDUCED_MOTION, listener)

// why: read at the moment of use, never cached, so a preference changed with
// the page open applies to the very next trigger.
export const prefersReducedMotion = () =>
  window.matchMedia(REDUCED_MOTION).matches

// why: only a device with a mouse or trackpad has a pointer to replace
// (task reach-and-seams, 25); touch keeps the system's behaviour.
export const FINE_POINTER = '(hover: hover) and (pointer: fine)'

/** Whether the device points with a mouse or trackpad, read at the moment. */
export const prefersFinePointer = () => window.matchMedia(FINE_POINTER).matches
