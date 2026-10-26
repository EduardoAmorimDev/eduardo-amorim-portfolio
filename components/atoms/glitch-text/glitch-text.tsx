'use client'
import { useEffect, useRef } from 'react'
import {
  BURST,
  IDLE_GLITCH,
  burstWait,
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

// why: share of the heading that must be on screen for it to glitch.
const VISIBLE_RATIO = 0.5

/**
 * A heading that glitches in short, subtle bursts on its own, at random
 * moments 5 to 12 s apart (lib/glitch.ts), only while at least half of it is
 * on screen and never under reduced motion; `data-glitch` is "on" during a
 * burst. Nothing else triggers one. The copies are aria-hidden, so its
 * accessible name is `text`, once.
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
    const frames: number[] = []
    let visible = false
    let wait = 0
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

    // invariant: one wait is armed at a time, and only while the heading is
    // visible; the next is armed when the burst ends, so they never overlap.
    const arm = () => {
      window.clearTimeout(wait)
      wait = visible ? window.setTimeout(burst, burstWait(Math.random())) : 0
    }

    const burst = () => {
      // why: under reduced motion the heading stays clean (task cosmos, 11).
      if (prefersReducedMotion()) return arm()
      const now = performance.now()
      const started = requestBurst(history, now)
      if (!started) return arm()
      history = started.history
      for (const frame of BURST) {
        const last = frame.copies === null
        frames.push(
          window.setTimeout(
            () => {
              paint(frame)
              if (last) arm()
            },
            started.start - now + frame.at
          )
        )
      }
    }

    const observer = new IntersectionObserver(
      entries => {
        const latest = entries.at(-1)
        if (!latest) return
        const nowVisible = latest.intersectionRatio >= VISIBLE_RATIO
        if (nowVisible === visible) return
        visible = nowVisible
        // why: entering arms a fresh wait; leaving drops it, so a burst is
        // never armed for a heading nobody sees.
        arm()
      },
      { threshold: [0, VISIBLE_RATIO] }
    )
    observer.observe(heading)

    return () => {
      observer.disconnect()
      window.clearTimeout(wait)
      frames.forEach(frame => window.clearTimeout(frame))
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
