'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { visibleBand } from '@/lib/visible-band'

// why: a tenth of a screen of rows drawn past each edge, so a smooth scroll
// that moves the canvas after this frame's read still uncovers drawn rows.
const MARGIN = 0.1
// invariant: before every other frame callback, so whatever renders to the
// screen this frame finds the box already set.
const FIRST = -10

/**
 * Limits its `<Canvas>`'s drawing to the rows on screen, so a canvas taller
 * than the window, or half scrolled out of it, shades only what is seen.
 * Render targets keep their own scissor. Place it inside the `<Canvas>`.
 */
export const VisibleScissor = () => {
  const gl = useThree(state => state.gl)

  useEffect(() => () => gl.setScissorTest(false), [gl])

  useFrame(({ size }) => {
    const { top } = gl.domElement.getBoundingClientRect()
    const band = visibleBand(
      top,
      size.height,
      window.innerHeight,
      window.innerHeight * MARGIN
    )
    gl.setScissor(0, band.y, size.width, band.height)
    gl.setScissorTest(true)
  }, FIRST)

  return null
}
