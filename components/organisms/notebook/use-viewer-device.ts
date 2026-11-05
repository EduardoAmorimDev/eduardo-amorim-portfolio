import { useSyncExternalStore } from 'react'
import { viewerDevice, type Device } from './stages'

const onResize = (listener: () => void) => {
  window.addEventListener('resize', listener)
  return () => window.removeEventListener('resize', listener)
}
// invariant: innerWidth is the width CSS media queries read, scrollbar
// included, so the device switches where Tailwind's md and lg do.
const current = () => viewerDevice(window.innerWidth)
// why: the server cannot see the window; the laptop keeps today's order
// until hydration reads the real width.
const onServer = (): Device => 'laptop'

/** The visitor's device by the window's width, again on every resize. */
export const useViewerDevice = () =>
  useSyncExternalStore(onResize, current, onServer)
