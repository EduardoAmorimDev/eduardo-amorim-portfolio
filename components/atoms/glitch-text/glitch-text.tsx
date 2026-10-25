'use client'
import { useEffect, useRef } from 'react'
import {
  BURST,
  IDLE_GLITCH,
  clipPath,
  requestBurst,
  type GlitchFrame
} from '@/lib/glitch'
import { prefersReducedMotion } from '@/lib/media-preferences'

type GlitchTextProps = {
  as: 'h1' | 'h2'
  text: string
  id?: string
  className?: string
}

// invariant: copy n paints frame.copies[n]; its colour is --glitch-<copy> in
// app/globals.css, so a theme swaps the colours without touching this file.
const COPIES = ['a', 'b'] as const

// why: share of the heading that must be on screen to count as entering it.
const ENTRY_RATIO = 0.5

/**
 * A heading that glitches in one burst on entering the viewport or on hover,
 * never on its own nor under reduced motion; `data-glitch` is "on" meanwhile.
 * The copies are aria-hidden, so its accessible name is `text`, once.
 */
export const GlitchText = ({
  as: Tag,
  text,
  id,
  className = ''
}: GlitchTextProps) => {
  const root = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const heading = root.current
    if (!heading) return
    const copies = [
      ...heading.querySelectorAll<HTMLElement>('[data-glitch-copy]')
    ]
    const timers: number[] = []
    let history = IDLE_GLITCH

    // why: frames are written straight to the DOM from timers, so a burst
    // never re-renders React and keeps its timing under a busy render loop.
    const paint = ({ copies: slices }: GlitchFrame) => {
      heading.dataset.glitch = slices ? 'on' : 'off'
      copies.forEach((copy, index) => {
        const slice = slices?.[index]
        copy.style.transform = slice ? `translateX(${slice.x}px)` : ''
        copy.style.clipPath = slice ? clipPath(slice) : ''
      })
    }

    const trigger = () => {
      // why: under reduced motion the heading stays clean (T29).
      if (prefersReducedMotion()) return
      const now = performance.now()
      const burst = requestBurst(history, now)
      if (!burst) return
      history = burst.history
      for (const frame of BURST) {
        const delay = burst.start - now + frame.at
        timers.push(window.setTimeout(() => paint(frame), delay))
      }
    }

    let visible = false
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const nowVisible = entry.intersectionRatio >= ENTRY_RATIO
          if (nowVisible && !visible) trigger()
          visible = nowVisible
        }
      },
      { threshold: [0, ENTRY_RATIO] }
    )
    observer.observe(heading)
    heading.addEventListener('pointerenter', trigger)

    return () => {
      observer.disconnect()
      heading.removeEventListener('pointerenter', trigger)
      timers.forEach(timer => window.clearTimeout(timer))
    }
  }, [])

  return (
    <Tag
      ref={root}
      id={id}
      data-glitch="off"
      className={`group relative ${className}`}
    >
      {text}
      {COPIES.map(copy => (
        <span
          key={copy}
          aria-hidden="true"
          data-glitch-copy={copy}
          className="pointer-events-none invisible absolute inset-0 select-none group-data-[glitch=on]:visible"
          style={{ color: `var(--glitch-${copy})` }}
        >
          {text}
        </span>
      ))}
    </Tag>
  )
}
