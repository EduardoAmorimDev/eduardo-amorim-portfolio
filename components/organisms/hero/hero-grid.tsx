'use client'
import { useEffect, useRef } from 'react'
import { readThemeColor } from '@/lib/color-tokens'
import {
  onReducedMotionChange,
  onSchemeChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { bendEnergy, bentLine, gridLines, type LinePoint } from './grid-motion'

type Point = { x: number; y: number }

/**
 * The line grid behind the hero's 3D scene. Moving the pointer over it bends
 * the nearby lines for a moment (grid-motion.ts). It never takes the pointer:
 * it listens on the window, so the glass icons above keep their hover.
 */
export const HeroGrid = () => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let color = readThemeColor('grid-line')
    let size = { width: 0, height: 0 }
    let pointer: Point | null = null
    let movedAt = -Infinity
    let frame = 0

    const stroke = (line: LinePoint[], vertical: boolean) => {
      // why: +0.5 centres a 1 px line on a pixel column, so straight lines
      // stay crisp instead of smearing over two.
      line.forEach(({ along, across }, index) => {
        const x = (vertical ? across : along) + 0.5
        const y = (vertical ? along : across) + 0.5
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
    }

    const draw = (energy: number) => {
      const { width, height } = size
      context.clearRect(0, 0, width, height)
      context.strokeStyle = color
      context.lineWidth = 1
      context.beginPath()
      for (const x of gridLines(width))
        stroke(
          bentLine(
            x,
            height,
            pointer && { across: pointer.x, along: pointer.y },
            energy
          ),
          true
        )
      for (const y of gridLines(height))
        stroke(
          bentLine(
            y,
            width,
            pointer && { across: pointer.y, along: pointer.x },
            energy
          ),
          false
        )
      context.stroke()
    }

    // why: frames run only while a bend is fading; at rest the grid is drawn
    // once and costs nothing.
    const tick = () => {
      frame = 0
      const energy = bendEnergy(performance.now() - movedAt)
      draw(energy)
      if (energy > 0) frame = requestAnimationFrame(tick)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      size = { width: canvas.clientWidth, height: canvas.clientHeight }
      canvas.width = Math.round(size.width * dpr)
      canvas.height = Math.round(size.height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(bendEnergy(performance.now() - movedAt))
    }

    // why: touch has no hover to follow (task Unresolved 3), and reduced
    // motion keeps the grid still (T29).
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || prefersReducedMotion()) return
      const box = canvas.getBoundingClientRect()
      const x = event.clientX - box.left
      const y = event.clientY - box.top
      if (x < 0 || y < 0 || x > box.width || y > box.height) return
      pointer = { x, y }
      movedAt = performance.now()
      schedule()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('pointermove', onMove, { passive: true })
    const stopScheme = onSchemeChange(() => {
      color = readThemeColor('grid-line')
      schedule()
    })
    const stopMotion = onReducedMotionChange(() => {
      movedAt = -Infinity
      schedule()
    })
    return () => {
      observer.disconnect()
      window.removeEventListener('pointermove', onMove)
      stopScheme()
      stopMotion()
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      data-testid="hero-grid"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full opacity-[0.14]"
    />
  )
}
