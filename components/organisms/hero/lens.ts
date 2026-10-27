import type { Point } from './grid-motion.ts'

// why: the task's numbers (gravity, criteria 16–21; cosmos, 25 and 27): no
// ring; full up to 80 px from the centre, fading to nothing at 160 px; 6 to
// 10 stars of 2 to 3 px joined by 1 px lines, drifting at most 10 px/s; it
// trails the pointer by under 100 ms, opens in 150 ms, closes under 300 ms.
export const LENS = {
  /** Where the fade ends: nothing of the lens shows past it. */
  radius: 160,
  /** Where the fade starts: the lens is whole within it. */
  inner: 80,
  lineWidth: 1,
  lineAlpha: 0.35,
  minStars: 6,
  maxStars: 10,
  minStarSize: 2,
  maxStarSize: 3,
  minDrift: 3,
  maxDrift: 10,
  /** Stars keep this far inside the fade's end, where they still show. */
  inset: 30,
  /** How fast the lens closes the gap to the pointer, per second. */
  follow: 60,
  /** Time to open fully and to close fully, in ms. */
  openMs: 150,
  closeMs: 250
} as const

/**
 * How much of the lens shows at `distance` px from its centre: 1 within
 * `inner`, 0 from `radius` out, falling linearly between, so no edge shows.
 */
export const lensIntensity = (
  distance: number,
  radius: number = LENS.radius,
  inner: number = LENS.inner
) => {
  if (distance <= inner) return 1
  if (distance >= radius) return 0
  return (radius - distance) / (radius - inner)
}

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
