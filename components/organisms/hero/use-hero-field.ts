'use client'
import { useEffect, useRef, type RefObject } from 'react'
import { RENDER_LEAD } from '@/components/atoms/render-gate'
import { readColorToken, readThemeColor } from '@/lib/color-tokens'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { useNearViewport } from '@/lib/use-near-viewport'
import {
  holeLift,
  holeScale,
  horizonAt,
  liftScale,
  restPoint,
  wellStrength
} from './black-hole'
import { createWander, holeBox, type Wander } from './black-hole-path'
import {
  GRID,
  HOLE_WELL,
  POINTER_WELL,
  displace,
  sheet,
  sheetScale,
  wellsOf,
  type HoleBody,
  type Point,
  type PointerBody
} from './grid-motion'
import { LENS, constellation, createStars, driftStars } from './lens'

// why: the well trails the pointer by well under 150 ms (criterion 18): at
// 40/s, 150 ms leaves 0.25% of any jump; it builds up in 100 ms and fades
// out in 600 ms, inside the 800 ms the task allows (criterion 19).
const WELL = { follow: 40, riseMs: 100, fadeMs: 600 }
// why: past this, a line lies wholly outside every well and is drawn as two
// points instead of one every GRID.step px.
const REACH_SLACK = 4

type FieldElements = {
  section: HTMLElement
  /** The grid's canvas; without one, no grid is drawn. */
  grid: HTMLCanvasElement | null
  lens: HTMLCanvasElement
  hole: RefObject<HoleBody>
}

const damp = (from: number, to: number, rate: number, seconds: number) =>
  to + (from - to) * Math.exp(-rate * seconds)

/**
 * The hero's 2D layers and the bodies that move them: the black hole's path,
 * the pointer's well in the grid and the lens. One frame loop drives all of
 * them while `start`ed; it idles once nothing moves (reduced motion, no
 * pointer) and costs nothing while stopped.
 */
const createHeroField = ({ section, grid, lens, hole }: FieldElements) => {
  const gridContext = grid?.getContext('2d') ?? null
  const lensContext = lens.getContext('2d')
  if (!lensContext) return null
  const gridColor = readThemeColor('grid-line')
  const lensColor = readColorToken('mist')
  const solid = section.querySelector<HTMLElement>('[data-lens="solid"]')
  const outline = section.querySelector<HTMLElement>('[data-lens="outline"]')
  const title = solid?.querySelector<HTMLElement>('h1') ?? null

  let width = 0
  let height = 0
  let dpr = 1
  let geometry = sheet(0, 0)
  let still = prefersReducedMotion()
  let wander: Wander | null = null
  let client: Point | null = null
  let target: Point | null = null
  // why: the lens opens only over the title (task gravity, criterion 16);
  // the pointer's well keeps the whole hero.
  let onTitle: Point | null = null
  const well: PointerBody = { x: 0, y: 0, strength: 0 }
  const view = { x: 0, y: 0, open: 0, stars: createStars(Math.random) }
  let running = false
  let frame = 0
  let last = 0
  // invariant: the black hole's rise and fall advances only while the loop
  // runs, so it resumes where it paused, like its path.
  let lifted = 0

  // why: the black hole sits on the sheet, so it shrinks with depth like
  // the cells around it (task gravity, criterion 6); risen off it, it looks
  // larger and its well weakens (task black-hole-scale, criteria 8–9).
  const placeHole = (at: Point) => {
    const lift = holeLift(lifted, still)
    hole.current = {
      x: at.x,
      y: at.y,
      horizon: horizonAt(width, height, at.y) * liftScale(lift),
      scale: holeScale(width, height),
      strength: wellStrength(lift),
      lift
    }
  }

  /** A new path from where the black hole is, or rest under reduced motion. */
  const resetPath = () => {
    const rest = restPoint(width, height)
    const box = holeBox(width, height)
    const { x, y } = hole.current.horizon ? hole.current : rest
    const start = {
      x: Math.min(box.right, Math.max(box.left, x)),
      y: Math.min(box.bottom, Math.max(box.top, y))
    }
    wander = still ? null : createWander(Math.random, box, start)
    placeHole(still ? rest : start)
  }

  const resize = () => {
    // invariant: the lens' canvas covers the hero, as the grid's does.
    width = lens.clientWidth
    height = lens.clientHeight
    dpr = window.devicePixelRatio || 1
    for (const canvas of grid ? [grid, lens] : [lens]) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }
    geometry = sheet(width, height)
    resetPath()
    // hazard: resizing a canvas clears it; redrawn at once, the grid never
    // shows a blank frame while it waits for the next one.
    if (running) {
      drawGrid()
      drawLens()
    }
    wake()
  }

  /** The pointer, in hero px, if a mouse is over the hero. */
  const locate = () => {
    if (!client) return null
    const box = section.getBoundingClientRect()
    const x = client.x - box.left
    const y = client.y - box.top
    return x >= 0 && y >= 0 && x <= box.width && y <= box.height
      ? { x, y }
      : null
  }

  /** The pointer, in hero px, if it is over the title's box. */
  const locateOnTitle = (at: Point | null) => {
    const box = title?.getBoundingClientRect()
    if (!at || !client || !box) return null
    return client.x >= box.left &&
      client.x <= box.right &&
      client.y >= box.top &&
      client.y <= box.bottom
      ? at
      : null
  }

  const advance = (seconds: number) => {
    if (!still) lifted += seconds
    placeHole(
      wander && !still ? wander.step(seconds) : restPoint(width, height)
    )
    const aim = still ? null : target
    if (aim) {
      if (well.strength === 0) Object.assign(well, aim)
      well.x = damp(well.x, aim.x, WELL.follow, seconds)
      well.y = damp(well.y, aim.y, WELL.follow, seconds)
      well.strength = Math.min(
        1,
        well.strength + (seconds * 1000) / WELL.riseMs
      )
    } else
      well.strength = Math.max(
        0,
        well.strength - (seconds * 1000) / WELL.fadeMs
      )
    const lensAim = still ? null : onTitle
    if (lensAim) {
      if (view.open === 0) Object.assign(view, lensAim)
      view.x = damp(view.x, lensAim.x, LENS.follow, seconds)
      view.y = damp(view.y, lensAim.y, LENS.follow, seconds)
      view.open = Math.min(1, view.open + (seconds * 1000) / LENS.openMs)
    } else view.open = Math.max(0, view.open - (seconds * 1000) / LENS.closeMs)
    if (view.open > 0) driftStars(view.stars, seconds)
  }

  /** Whether a line from `a` to `b` passes within `reach` of `body`. */
  const near = (a: Point, b: Point, body: Point, reach: number) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = dx * dx + dy * dy
    const t = length
      ? Math.max(
          0,
          Math.min(1, ((body.x - a.x) * dx + (body.y - a.y) * dy) / length)
        )
      : 0
    return Math.hypot(a.x + t * dx - body.x, a.y + t * dy - body.y) < reach
  }

  const drawGrid = () => {
    if (!gridContext) return
    const body = hole.current
    const pointer = well.strength > 0 ? well : null
    const wells = wellsOf(geometry, pointer, body.horizon > 0 ? body : null)
    // why: a well's radius is in sheet px; on screen it is widest at the
    // hero's foot, where the sheet is nearest.
    const nearest = sheetScale(height, height)
    const holeReach = HOLE_WELL.radius * body.scale * nearest + REACH_SLACK
    const pointerReach = POINTER_WELL.radius * nearest + REACH_SLACK
    const bent = (a: Point, b: Point) =>
      (body.horizon > 0 && near(a, b, body, holeReach)) ||
      (pointer !== null && near(a, b, pointer, pointerReach))

    gridContext.setTransform(dpr, 0, 0, dpr, 0, 0)
    gridContext.clearRect(0, 0, width, height)
    gridContext.save()
    // invariant: no line is ever drawn inside the event horizon (criterion
    // 21); the even-odd clip leaves the hero minus that disc.
    if (body.horizon > 0) {
      gridContext.beginPath()
      gridContext.rect(0, 0, width, height)
      // why: a pixel past the horizon, so the clip's antialiased edge never
      // leaves a trace of a line inside it; the photon ring covers the gap.
      gridContext.arc(body.x, body.y, body.horizon + 1, 0, 2 * Math.PI)
      gridContext.clip('evenodd')
    }
    gridContext.strokeStyle = gridColor
    gridContext.lineWidth = 1
    gridContext.beginPath()
    const trace = (points: Point[], vertical: boolean) =>
      points.forEach(({ x, y }, index) => {
        const at = displace(geometry, { x, y }, wells, vertical)
        if (index === 0) gridContext.moveTo(at.x, at.y)
        else gridContext.lineTo(at.x, at.y)
      })

    for (const u of geometry.verticals) {
      const top = { x: geometry.verticalX(u, 0), y: 0 }
      const bottom = { x: geometry.verticalX(u, height), y: height }
      if (Math.max(top.x, bottom.x) < -GRID.spacing) continue
      if (Math.min(top.x, bottom.x) > width + GRID.spacing) continue
      if (!bent(top, bottom)) {
        trace([top, bottom], true)
        continue
      }
      const points: Point[] = []
      for (let y = 0; y < height; y += GRID.step)
        points.push({ x: geometry.verticalX(u, y), y })
      points.push(bottom)
      trace(points, true)
    }
    for (const row of geometry.rows) {
      // why: +0.5 centres a straight 1 px row on a pixel row, so it stays
      // crisp instead of smearing over two.
      const y = Math.round(row) + 0.5
      const left = { x: 0, y }
      const right = { x: width, y }
      if (!bent(left, right)) {
        trace([left, right], false)
        continue
      }
      const points: Point[] = []
      for (let x = 0; x < width; x += GRID.step) points.push({ x, y })
      points.push(right)
      trace(points, false)
    }
    gridContext.stroke()
    gridContext.restore()
  }

  let lensShown = false
  const drawLens = () => {
    if (view.open === 0 && !lensShown) return
    lensContext.setTransform(dpr, 0, 0, dpr, 0, 0)
    lensContext.clearRect(0, 0, width, height)
    const titleBox = solid?.getBoundingClientRect()
    const heroBox = section.getBoundingClientRect()
    const scale = 1 - (1 - view.open) ** 3
    const radius = LENS.radius * scale
    const inner = LENS.inner * scale
    for (const element of [solid, outline]) {
      if (!element || !titleBox) continue
      element.style.setProperty(
        '--lens-x',
        `${view.x + heroBox.left - titleBox.left}px`
      )
      element.style.setProperty(
        '--lens-y',
        `${view.y + heroBox.top - titleBox.top}px`
      )
      element.style.setProperty(
        '--lens-in',
        view.open > 0 ? `${inner}px` : '-1px'
      )
      element.style.setProperty(
        '--lens-out',
        view.open > 0 ? `${radius}px` : '-1px'
      )
    }
    lensShown = view.open > 0
    if (!lensShown) return

    lensContext.save()
    lensContext.strokeStyle = lensColor
    lensContext.fillStyle = lensColor
    const at = (index: number) => {
      const star = view.stars[index]
      return star
        ? { x: view.x + star.x * scale, y: view.y + star.y * scale }
        : null
    }
    lensContext.lineWidth = LENS.lineWidth
    lensContext.globalAlpha = LENS.lineAlpha * view.open
    lensContext.beginPath()
    for (const [a, b] of constellation(view.stars)) {
      const from = at(a)
      const to = at(b)
      if (!from || !to) continue
      lensContext.moveTo(from.x, from.y)
      lensContext.lineTo(to.x, to.y)
    }
    lensContext.stroke()
    lensContext.globalAlpha = view.open
    view.stars.forEach((star, index) => {
      const point = at(index)
      if (!point) return
      lensContext.beginPath()
      lensContext.arc(point.x, point.y, star.size / 2, 0, 2 * Math.PI)
      lensContext.fill()
    })
    // invariant: the lens has no edge (criterion 18): whatever was drawn
    // keeps the share lensIntensity gives it, whole within `inner`, linear
    // down to nothing at `radius`, the same fade the title's masks use.
    const fade = lensContext.createRadialGradient(
      view.x,
      view.y,
      inner,
      view.x,
      view.y,
      Math.max(radius, inner + 1e-3)
    )
    fade.addColorStop(0, '#000')
    fade.addColorStop(1, 'transparent')
    lensContext.globalAlpha = 1
    lensContext.globalCompositeOperation = 'destination-in'
    lensContext.fillStyle = fade
    lensContext.fillRect(0, 0, width, height)
    lensContext.restore()
  }

  const tick = (now: number) => {
    frame = 0
    // why: nothing to draw into until the first resize has sized the hero.
    if (!width || !height) return
    const seconds = last ? (now - last) / 1000 : 0
    last = now
    advance(seconds)
    drawGrid()
    drawLens()
    const moving = !still || well.strength > 0 || view.open > 0
    if (running && moving) frame = requestAnimationFrame(tick)
    else last = 0
  }

  function wake() {
    if (running && !frame) frame = requestAnimationFrame(tick)
  }

  const follow = () => {
    target = locate()
    onTitle = locateOnTitle(target)
    if (!onTitle && view.open === 0) view.stars = createStars(Math.random)
    wake()
  }

  // why: only a mouse hovers; touch and pen get neither the well nor the
  // lens (criteria 18, 27). The window hears every move, so nothing laid
  // over the grid takes the pointer from it, nor it from them.
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return
    client = { x: event.clientX, y: event.clientY }
    follow()
  }
  const onLeave = () => {
    client = null
    follow()
  }
  const onMotion = () => {
    still = prefersReducedMotion()
    resetPath()
    wake()
  }

  const observer = new ResizeObserver(resize)
  observer.observe(lens)
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('scroll', follow, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  const stopMotion = onReducedMotionChange(onMotion)

  /** Freezes every body where it is until the next start. */
  const stop = () => {
    running = false
    cancelAnimationFrame(frame)
    frame = 0
    last = 0
  }

  return {
    start() {
      running = true
      wake()
    },
    stop,
    dispose() {
      stop()
      observer.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', follow)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      stopMotion()
    }
  }
}

type HeroFieldRefs = {
  section: RefObject<HTMLElement | null>
  /** The grid's canvas; the hero draws none for now (black-hole-behind 1). */
  grid?: RefObject<HTMLCanvasElement | null>
  lens: RefObject<HTMLCanvasElement | null>
  hole: RefObject<HoleBody>
}

/**
 * Runs the hero's grid, lens and black hole path while the hero is near the
 * screen, with the same lead as the 3D scene's RenderGate, so both pause
 * and resume together.
 */
export const useHeroField = ({ section, grid, lens, hole }: HeroFieldRefs) => {
  const near = useNearViewport(section, RENDER_LEAD)
  const field = useRef<ReturnType<typeof createHeroField>>(null)

  useEffect(() => {
    if (!section.current || !lens.current) return
    const created = createHeroField({
      section: section.current,
      grid: grid?.current ?? null,
      lens: lens.current,
      hole
    })
    field.current = created
    return () => {
      created?.dispose()
      field.current = null
    }
  }, [section, grid, lens, hole])

  useEffect(() => {
    if (near) field.current?.start()
    else field.current?.stop()
  }, [near])
}
