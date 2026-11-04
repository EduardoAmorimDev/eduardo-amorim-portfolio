/**
 * The rows of a canvas that are on screen, for a scissor box that keeps a
 * tall canvas from shading the part of it scrolled out of the window.
 */
export type Band = {
  /** From the canvas's bottom edge, in CSS px, as WebGL counts rows. */
  y: number
  /** CSS px tall; 0 when the canvas is wholly off screen. */
  height: number
}

/**
 * The on-screen band of a canvas whose top is `top` px below the window's
 * top, widened by `margin` px each side so a scroll in the same frame never
 * uncovers a row that was not drawn.
 */
export const visibleBand = (
  top: number,
  height: number,
  windowHeight: number,
  margin: number
): Band => {
  const from = Math.min(Math.max(-top - margin, 0), height)
  const to = Math.min(Math.max(windowHeight - top + margin, 0), height)
  return { y: height - to, height: Math.max(to - from, 0) }
}
