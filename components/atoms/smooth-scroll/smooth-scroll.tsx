'use client'
import ReactLenis from 'lenis/react'
import { useLiteMode } from '@/lib/use-lite-mode'

/**
 * Lenis's smooth scroll for the whole page; lite hands scrolling back to the
 * browser, as Lenis reads the scroll and runs a loop every frame (task
 * portfolio-lp-60fps, 6).
 */
export const SmoothScroll = () => {
  const lite = useLiteMode()
  // why: anchors lets Lenis run in-page links (the hero CTA) through its own
  // smooth scroll instead of the browser's jump.
  return lite ? null : <ReactLenis root options={{ anchors: true }} />
}
