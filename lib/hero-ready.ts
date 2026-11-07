const EVENT = 'hero-ready'
let ready = false

/** Marks the hero's first frame as drawn; the later calls change nothing. */
export const markHeroReady = () => {
  if (ready) return
  ready = true
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Calls `listener` once the hero has drawn its first frame, at once if it
 * already has; returns a function that cancels the wait.
 */
export const onHeroReady = (listener: () => void) => {
  if (ready) {
    listener()
    return () => undefined
  }
  window.addEventListener(EVENT, listener, { once: true })
  return () => window.removeEventListener(EVENT, listener)
}
