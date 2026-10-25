import { useEffect, useState } from 'react'

const DARK_SCHEME = '(prefers-color-scheme: dark)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

const onQueryChange = (query: string, listener: () => void) => {
  const list = window.matchMedia(query)
  list.addEventListener('change', listener)
  return () => list.removeEventListener('change', listener)
}

/** Calls `listener` whenever the system switches between light and dark. */
export const onSchemeChange = (listener: () => void) =>
  onQueryChange(DARK_SCHEME, listener)

/** Calls `listener` whenever the reduced-motion preference changes. */
export const onReducedMotionChange = (listener: () => void) =>
  onQueryChange(REDUCED_MOTION, listener)

// why: read at the moment of use, never cached, so a preference changed with
// the page open applies to the very next trigger.
export const prefersReducedMotion = () =>
  window.matchMedia(REDUCED_MOTION).matches

/**
 * A value derived from the theme's CSS (e.g. colours read with
 * readThemeColor), read again whenever the colour scheme changes, so the
 * page follows the system without a reload. Client-only: call it after mount.
 * `read` must be stable (declared at module level).
 */
export const useSchemeValue = <T>(read: () => T) => {
  const [value, setValue] = useState(read)
  useEffect(() => onSchemeChange(() => setValue(() => read())), [read])
  return value
}
