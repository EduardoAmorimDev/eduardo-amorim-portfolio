import type { Point } from './grid-motion.ts'

// why: the task's numbers (cosmos, criteria 24–27): a 120 px circle with a
// faint mist ring, 6 to 10 stars of 2 to 3 px joined by 1 px lines, drifting
// at most 10 px/s; it trails the pointer by under 100 ms and closes in under
// 300 ms.
export const LENS = {
  radius: 120,
  ringAlpha: 0.3,
  ringWidth: 1,
  lineWidth: 1,
  lineAlpha: 0.35,
  minStars: 6,
  maxStars: 10,
  minStarSize: 2,
  maxStarSize: 3,
  minDrift: 3,
  maxDrift: 10,
  /** Stars keep this far inside the ring, so none touches it. */
  inset: 10,
  /** How fast the lens closes the gap to the pointer, per second. */
  follow: 60,
  /** Time to open fully and to close fully, in ms. */
  openMs: 150,
  closeMs: 250
} as const

/** A star, relative to the lens centre, with its drift in px/s. */
export type Star = Point & { vx: number; vy: number; size: number }

const between = (random: () => number, low: number, high: number) =>
  low + random() * (high - low)

/** A fresh constellation of LENS.minStars to maxStars stars. */
export const createStars = (random: () => number): Star[] => {
  const count =
    LENS.minStars + Math.floor(random() * (LENS.maxStars - LENS.minStars + 1))
  const room = LENS.radius - LENS.inset
  return Array.from({ length: count }, () => {
    // invariant: √ of a uniform draw spreads points evenly over the disc.
    const distance = room * Math.sqrt(random())
    const angle = random() * 2 * Math.PI
    const heading = random() * 2 * Math.PI
    const speed = between(random, LENS.minDrift, LENS.maxDrift)
    return {
      x: distance * Math.cos(angle),
      y: distance * Math.sin(angle),
      vx: speed * Math.cos(heading),
      vy: speed * Math.sin(heading),
      size: between(random, LENS.minStarSize, LENS.maxStarSize)
    }
  })
}

/**
 * Moves every star by its drift over `seconds`; a star reaching the edge of
 * its room bounces back in, so none ever leaves the circle.
 */
export const driftStars = (stars: Star[], seconds: number) => {
  const room = LENS.radius - LENS.inset
  for (const star of stars) {
    star.x += star.vx * seconds
    star.y += star.vy * seconds
    const distance = Math.hypot(star.x, star.y)
    if (distance <= room) continue
    // why: mirror the drift about the edge's normal and step back inside.
    const nx = star.x / distance
    const ny = star.y / distance
    const outward = star.vx * nx + star.vy * ny
    if (outward > 0) {
      star.vx -= 2 * outward * nx
      star.vy -= 2 * outward * ny
    }
    star.x = nx * room
    star.y = ny * room
  }
}

/** Pairs of stars to join: each star with its nearest neighbour. */
export const constellation = (stars: readonly Star[]) => {
  const seen = new Set<string>()
  const pairs: [number, number][] = []
  stars.forEach((star, index) => {
    let nearest = -1
    let best = Infinity
    stars.forEach((other, at) => {
      const distance = Math.hypot(other.x - star.x, other.y - star.y)
      if (at !== index && distance < best) {
        best = distance
        nearest = at
      }
    })
    const pair: [number, number] = [
      Math.min(index, nearest),
      Math.max(index, nearest)
    ]
    const key = pair.join('-')
    if (nearest < 0 || seen.has(key)) return
    seen.add(key)
    pairs.push(pair)
  })
  return pairs
}
