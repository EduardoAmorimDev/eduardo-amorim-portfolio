import { HOLE, horizonRadius } from './black-hole.ts'
import type { Point } from './grid-motion.ts'

// why: 2.5 to 7.5 px/s, half the pace of black-hole-behind 11, never more
// than 4 px in one frame, never stopping; a new turn every 6 to 16 s, so
// a hop reaches ~108 px and the path roams the whole hero (task
// black-hole-wide, 8) instead of circling where it began.
export const WANDER = {
  minSpeed: 2.5,
  maxSpeed: 7.5,
  /** Seconds each leg of the path takes. */
  minLeg: 6,
  maxLeg: 16,
  /** Waypoints drawn per hop; the one nearest the current goal corner wins. */
  aim: 8,
  /** A goal corner counts as reached within this share of the diagonal. */
  reached: 0.15,
  /** Largest change of speed from one leg to the next, in px/s. */
  maxSpeedStep: 1,
  /** Longest frame the path advances by; 7.5 px/s × 1/15 s = 0.5 px. */
  maxFrame: 1 / 15,
  /** The turn at each waypoint, so every leg really changes direction. */
  minTurn: Math.PI / 12,
  maxTurn: (5 * Math.PI) / 6,
  /** The turns allowed when nothing else fits, e.g. in a corner. */
  minTurnCornered: 0.06,
  maxTurnCornered: (17 * Math.PI) / 18,
  /** Points sampled along a leg to measure it. */
  samples: 192,
  /** Shortest hop between waypoints, in multiples of minSpeed × minLeg. */
  minHop: 1.25,
  /**
   * Longest hop between waypoints, in multiples of maxSpeed × maxLeg: a leg
   * runs about a hop, so a longer one could not fit maxLeg at maxSpeed.
   */
  maxHop: 0.9,
  /**
   * Slack kept inside every limit, so a leg sampled as a polyline and cut
   * into whole frames still lands within it.
   */
  slack: 0.02,
  tries: 200
} as const

/** Where the black hole's centre may go, in hero px. */
export type Box = { left: number; top: number; right: number; bottom: number }

/**
 * The box the centre must stay in for the sphere and its arcs (HOLE.
 * halfHeight horizon radii around it) to keep HOLE.margin clear of every
 * edge of a `width` × `height` hero, for a horizon of radius `horizon`. The
 * disk, wider, may run past the edges (task black-hole-scale, criterion 3).
 */
export const wanderBox = (
  width: number,
  height: number,
  horizon: number
): Box => {
  const reach = Math.max(HOLE.halfHeight, HOLE.topHeight) * horizon
  const x = width * HOLE.margin + reach
  const y = height * HOLE.margin + reach
  return { left: x, top: y, right: width - x, bottom: height - y }
}

/**
 * The black hole's box in a `width` × `height` hero, for its fixed size
 * (black-hole-apple, 7).
 */
export const holeBox = (width: number, height: number) =>
  wanderBox(width, height, horizonRadius(width, height))

/** One leg: a quadratic curve from `from` towards `via`, ending at `to`. */
type Leg = {
  from: Point
  via: Point
  to: Point
  speed: number
  /** Arc length at each of WANDER.samples + 1 evenly spaced parameters. */
  lengths: number[]
}

const curve = (
  { from, via, to }: Pick<Leg, 'from' | 'via' | 'to'>,
  t: number
) => {
  const a = (1 - t) * (1 - t)
  const b = 2 * (1 - t) * t
  const c = t * t
  return {
    x: a * from.x + b * via.x + c * to.x,
    y: a * from.y + b * via.y + c * to.y
  }
}

const measure = (leg: Pick<Leg, 'from' | 'via' | 'to'>) => {
  const lengths = [0]
  let previous = leg.from
  for (let index = 1; index <= WANDER.samples; index++) {
    const point = curve(leg, index / WANDER.samples)
    lengths.push(
      (lengths[index - 1] ?? 0) +
        Math.hypot(point.x - previous.x, point.y - previous.y)
    )
    previous = point
  }
  return lengths
}

const turnAngle = (from: Point, via: Point, to: Point) => {
  const a = Math.atan2(via.y - from.y, via.x - from.x)
  const b = Math.atan2(to.y - via.y, to.x - via.x)
  const turn = Math.abs(b - a) % (2 * Math.PI)
  return turn > Math.PI ? 2 * Math.PI - turn : turn
}

const midpoint = (a: Point, b: Point) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2
})

/**
 * A slow, endless, random path inside `box`, starting at `start` (which
 * must lie inside it). Each leg is a quadratic curve through the midpoints
 * of random waypoints, so the path is smooth and, like its waypoints, never
 * leaves the box; each leg turns and takes WANDER.minLeg to maxLeg seconds.
 */
export const createWander = (random: () => number, box: Box, start: Point) => {
  const anywhere = () => ({
    x: box.left + random() * (box.right - box.left),
    y: box.top + random() * (box.bottom - box.top)
  })
  const longest = WANDER.maxHop * WANDER.maxSpeed * WANDER.maxLeg
  /** A random point of the box within WANDER.maxHop of `from`. */
  const reachable = (from: Point) => {
    for (let attempt = 0; attempt < WANDER.tries; attempt++) {
      const point = anywhere()
      if (Math.hypot(point.x - from.x, point.y - from.y) <= longest)
        return point
    }
    return anywhere()
  }
  // why: the corners in turn, top right first, as the path starts top left
  // (task black-hole-wide, 7–8), so it crosses the hero instead of circling.
  const corners: Point[] = [
    { x: box.right, y: box.top },
    { x: box.right, y: box.bottom },
    { x: box.left, y: box.bottom },
    { x: box.left, y: box.top }
  ]
  const diagonal = Math.hypot(box.right - box.left, box.bottom - box.top)
  let goal = 0
  /** Of WANDER.aim reachable points, the one nearest the goal corner. */
  const near = (from: Point) => {
    const target = corners[goal % corners.length] ?? from
    if (
      Math.hypot(target.x - from.x, target.y - from.y) <=
      WANDER.reached * diagonal
    )
      goal++
    const aim = corners[goal % corners.length] ?? from
    let best = reachable(from)
    for (let draw = 1; draw < WANDER.aim; draw++) {
      const point = reachable(from)
      if (
        Math.hypot(point.x - aim.x, point.y - aim.y) <
        Math.hypot(best.x - aim.x, best.y - aim.y)
      )
        best = point
    }
    return best
  }

  /**
   * The next leg from `from` towards `via`, or null if none fits. `relax` 1
   * lets the speed change more than WANDER.maxSpeedStep; 2 also widens the
   * turn to WANDER.minTurnCornered–maxTurnCornered and, failing all, takes
   * a leg at a clamped speed. No level allows a reversal, which would make a
   * cusp, nor a leg that does not turn.
   */
  const plan = (from: Point, via: Point, speed: number, relax: 0 | 1 | 2) => {
    let fallback: { leg: Leg; next: Point; stray: number } | null = null
    for (let attempt = 0; attempt < WANDER.tries; attempt++) {
      const next = near(via)
      const to = midpoint(via, next)
      const lengths = measure({ from, via, to })
      const length = lengths[WANDER.samples] ?? 0
      const turn = turnAngle(from, via, to)
      const step = relax ? WANDER.maxSpeed : WANDER.maxSpeedStep
      const { slack } = WANDER
      const low = Math.max(
        WANDER.minSpeed * (1 + slack),
        speed - step,
        length / (WANDER.maxLeg * (1 - slack))
      )
      const high = Math.min(
        WANDER.maxSpeed * (1 - slack),
        speed + step,
        length / (WANDER.minLeg * (1 + slack))
      )
      // why: the next leg starts halfway from `via` to `next`; too short a
      // hop there leaves it no room to last WANDER.minLeg at minSpeed.
      const hop = Math.hypot(next.x - via.x, next.y - via.y)
      const shortest = WANDER.minHop * WANDER.minSpeed * WANDER.minLeg
      const sharpest = relax === 2 ? WANDER.maxTurnCornered : WANDER.maxTurn
      const softest = relax === 2 ? WANDER.minTurnCornered : WANDER.minTurn
      if (turn > sharpest || turn < softest || hop < shortest) continue
      if (low <= high)
        return {
          leg: { from, via, to, speed: low + random() * (high - low), lengths },
          next
        }
      // why: failing every limit, the leg whose time strays least from
      // WANDER.minLeg to maxLeg at a speed kept inside its own limits.
      const clamped = Math.min(
        WANDER.maxSpeed * (1 - slack),
        Math.max(WANDER.minSpeed * (1 + slack), length / WANDER.maxLeg)
      )
      const time = length / clamped
      const stray = Math.max(WANDER.minLeg - time, time - WANDER.maxLeg, 0)
      if (length > 0 && (!fallback || stray < fallback.stray))
        fallback = {
          leg: { from, via, to, speed: clamped, lengths },
          next,
          stray
        }
    }
    return relax === 2 ? fallback : null
  }

  const nextLeg = (from: Point, via: Point, speed: number) =>
    plan(from, via, speed, 0) ??
    plan(from, via, speed, 1) ??
    plan(from, via, speed, 2) ?? {
      // invariant: unreachable unless the box has no area; the body then
      // circles in place rather than stopping.
      leg: {
        from,
        via,
        to: from,
        speed: WANDER.minSpeed,
        lengths: measure({ from, via, to: from })
      },
      next: from
    }

  const firstSpeed =
    WANDER.minSpeed +
    (0.25 + random() * 0.5) * (WANDER.maxSpeed - WANDER.minSpeed)
  let planned = nextLeg(start, near(start), firstSpeed)
  let leg = planned.leg
  let travelled = 0
  let index = 0
  let position = start

  const pointAt = (distance: number) => {
    const { lengths } = leg
    let low = 0
    let high: number = WANDER.samples
    while (high - low > 1) {
      const middle = (low + high) >> 1
      if ((lengths[middle] ?? 0) <= distance) low = middle
      else high = middle
    }
    const from = lengths[low] ?? 0
    const to = lengths[high] ?? from
    const share = to > from ? (distance - from) / (to - from) : 0
    return curve(leg, (low + share) / WANDER.samples)
  }

  const legLength = () => leg.lengths[WANDER.samples] ?? 0

  return {
    /**
     * Advances the path by `seconds` (capped at WANDER.maxFrame, so a long
     * frame never makes it jump) and returns where it is now.
     */
    step(seconds: number) {
      let distance = leg.speed * Math.min(Math.max(seconds, 0), WANDER.maxFrame)
      while (travelled + distance >= legLength()) {
        distance -= legLength() - travelled
        planned = nextLeg(leg.to, planned.next, leg.speed)
        leg = planned.leg
        travelled = 0
        index++
        if (legLength() <= 0) break
      }
      travelled += distance
      position = pointAt(travelled)
      return position
    },
    get position() {
      return position
    },
    /** Speed of the current leg, in px/s. */
    get speed() {
      return leg.speed
    },
    /** Number of the current leg; it grows by one at each turn. */
    get leg() {
      return index
    }
  }
}

export type Wander = ReturnType<typeof createWander>

/** A path the black hole follows: where it is after `seconds` more. */
export type Path = { step(seconds: number): Point }

// why: the black hole circles the copy instead of crossing it (task
// black-hole-alive, 10): one lap of the lanes between the copy and the edge
// of its box, at 3.5 to 6.5 px/s, swaying across each lane, and trailing
// the lap by CIRCUIT.lag s, which rounds its corners.
export const CIRCUIT = {
  speed: 5,
  speedSway: 1.5,
  speedPeriod: 37,
  /** Share of each lane's half width it sways across. */
  sway: 0.45,
  swayPeriod: 23,
  lag: 3
} as const

/**
 * A closed lap of `box` round `copy` (both in hero px), clockwise from its
 * top left corner, starting at the lap's point nearest `start`. Each lane
 * runs midway between the copy and the box's edge; where the copy leaves no
 * room, the lane keeps to the box's edge.
 */
export const createCircuit = (
  random: () => number,
  box: Box,
  copy: Box | null,
  start: Point
): Path => {
  const inner = copy ?? {
    left: box.left + (box.right - box.left) * 0.3,
    top: box.top + (box.bottom - box.top) * 0.3,
    right: box.right - (box.right - box.left) * 0.3,
    bottom: box.bottom - (box.bottom - box.top) * 0.3
  }
  const lane = (edge: number, side: number, low: number, high: number) =>
    Math.min(high, Math.max(low, (edge + side) / 2))
  const left = lane(
    box.left,
    Math.max(box.left, inner.left),
    box.left,
    box.right
  )
  const right = lane(
    box.right,
    Math.min(box.right, inner.right),
    left,
    box.right
  )
  const top = lane(box.top, Math.max(box.top, inner.top), box.top, box.bottom)
  const bottom = lane(
    box.bottom,
    Math.min(box.bottom, inner.bottom),
    top,
    box.bottom
  )
  // invariant: how far each lane may sway and still keep off the copy and
  // inside the box: its half width.
  const halfWidth = {
    top: Math.max(0, Math.min(top - box.top, inner.top - top)),
    right: Math.max(0, Math.min(box.right - right, right - inner.right)),
    bottom: Math.max(0, Math.min(box.bottom - bottom, bottom - inner.bottom)),
    left: Math.max(0, Math.min(left - box.left, inner.left - left))
  }
  const width = right - left
  const height = bottom - top
  const lap = 2 * (width + height)

  /** The lap's point `distance` px along it, and its outward normal. */
  const along = (distance: number) => {
    let d = ((distance % lap) + lap) % lap
    if (d < width)
      return { x: left + d, y: top, nx: 0, ny: -1, half: halfWidth.top }
    d -= width
    if (d < height)
      return { x: right, y: top + d, nx: 1, ny: 0, half: halfWidth.right }
    d -= height
    if (d < width)
      return { x: right - d, y: bottom, nx: 0, ny: 1, half: halfWidth.bottom }
    d -= width
    return { x: left, y: bottom - d, nx: -1, ny: 0, half: halfWidth.left }
  }

  // why: the lap's point nearest `start`, so a resize picks up where the
  // black hole is instead of jumping.
  let travelled = 0
  let nearest = Infinity
  for (let d = 0; d < lap; d += 2) {
    const p = along(d)
    const gap = Math.hypot(p.x - start.x, p.y - start.y)
    if (gap < nearest) {
      nearest = gap
      travelled = d
    }
  }
  const phase = random() * 2 * Math.PI
  let time = 0
  const position = { ...start }

  return {
    step(seconds: number) {
      const dt = Math.min(Math.max(seconds, 0), WANDER.maxFrame)
      time += dt
      const speed =
        CIRCUIT.speed +
        CIRCUIT.speedSway *
          Math.sin((2 * Math.PI * time) / CIRCUIT.speedPeriod + phase)
      travelled += speed * dt
      const at = along(travelled)
      const offset =
        CIRCUIT.sway *
        at.half *
        Math.sin((2 * Math.PI * time) / CIRCUIT.swayPeriod + phase)
      const target = { x: at.x + at.nx * offset, y: at.y + at.ny * offset }
      // why: trailing the lap rounds its corners; the pace stays the lap's,
      // and never above WANDER.maxSpeed, even catching up after a resize.
      const follow = 1 - Math.exp(-dt / CIRCUIT.lag)
      let dx = (target.x - position.x) * follow
      let dy = (target.y - position.y) * follow
      const move = Math.hypot(dx, dy)
      const most = WANDER.maxSpeed * dt
      if (move > most) {
        dx *= most / move
        dy *= most / move
      }
      position.x += dx
      position.y += dy
      return { ...position }
    }
  }
}
