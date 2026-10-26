import { HOLE } from './black-hole.ts'
import type { Point } from './grid-motion.ts'

// why: the task's limits (cosmos, criterion 29): 20 to 60 px/s, a new turn
// every 4 to 10 s, never more than 4 px in one frame, never stopping.
export const WANDER = {
  minSpeed: 20,
  maxSpeed: 60,
  /** Seconds each leg of the path takes. */
  minLeg: 4,
  maxLeg: 10,
  /** Largest change of speed from one leg to the next, in px/s. */
  maxSpeedStep: 8,
  /** Longest frame the path advances by; 60 px/s × 1/15 s = 4 px. */
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
   * Slack kept inside every limit, so a leg sampled as a polyline and cut
   * into whole frames still lands within it.
   */
  slack: 0.02,
  tries: 200
} as const

/** Where the black hole's centre may go, in hero px. */
export type Box = { left: number; top: number; right: number; bottom: number }

/**
 * The box the centre must stay in for the whole body (disk and arcs) to
 * keep HOLE.margin clear of every edge of a `width` × `height` hero.
 */
export const wanderBox = (
  width: number,
  height: number,
  horizon: number
): Box => {
  const x = width * HOLE.margin + HOLE.halfWidth * horizon
  const y = height * HOLE.margin + HOLE.halfHeight * horizon
  return { left: x, top: y, right: width - x, bottom: height - y }
}

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
      const next = anywhere()
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
  let planned = nextLeg(start, anywhere(), firstSpeed)
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
