// why: the task's numbers (space, criteria 2, 3 and 6; black-hole-alive, 3
// and 14: 30% of the stars blink, from 15% to whole, in 1.5 to 4 s, at half
// the brightness they had), measured at 1440×900 in CSS px.
export const SPACE = {
  /** Stars inside a 1440×900 hero; the density holds at any size. */
  stars: 2000,
  designArea: 1440 * 900,
  /** Share of stars that twinkle, how far down and how slowly. */
  twinkleShare: 0.3,
  twinkleLow: 0.15,
  twinkleSeconds: [1.5, 4],
  /** Share of stars tinted towards primary or steel. */
  tintShare: 0.15,
  /** Every star, small or bright, at 2/3 of its size (black-hole-bare, 2). */
  scale: 2 / 3
} as const

export type BrightStar = {
  /** Place as a share of the hero's width and height. */
  at: readonly [number, number]
  /** Core, halo and spike diameters, px. */
  core: number
  halo: number
  spikes: number
}

// why: a column falling towards the planet's horizon, as in the reference,
// right of the copy's box (which ends at 87% of a 1440 px hero) and clear
// of the black hole's resting point (task space, 3).
export const BRIGHT_STARS: readonly BrightStar[] = [
  { at: [0.9, 0.2], core: 8, halo: 80, spikes: 140 },
  { at: [0.92, 0.56], core: 4, halo: 32, spikes: 56 },
  { at: [0.905, 0.72], core: 3, halo: 14, spikes: 22 },
  // why: a large one in the bottom right corner (task black-hole-alive, 8)
  // and one in the top left (14).
  { at: [0.935, 0.84], core: 8, halo: 80, spikes: 140 },
  { at: [0.06, 0.09], core: 8, halo: 80, spikes: 140 }
]

export type Random = () => number
export type Box = { left: number; top: number; right: number; bottom: number }

const between = (random: Random, [low, high]: readonly [number, number]) =>
  low + (high - low) * random()

export type Star = {
  /** Position in px, relative to the hero's top left corner. */
  x: number
  y: number
  /** Diameter, px. */
  size: number
  /** Peak brightness, 0 to 1. */
  brightness: number
  /** 0 mist or snow; 1 primary; 2 steel. */
  tint: 0 | 1 | 2
  /** Twinkle period in seconds, 0 for a steady star. */
  period: number
  /** Twinkle phase, 0 to 1. */
  phase: number
}

/** Side of the grid cell that holds one star, px. */
export const starCell = () => Math.sqrt(SPACE.designArea / SPACE.stars)

/**
 * One star per grid cell, jittered inside it, over `area` (hero px): the
 * density is the same on any screen and no patch is left bare.
 */
export const createStars = (random: Random, area: Box): Star[] => {
  const cell = starCell()
  const stars: Star[] = []
  for (let top = area.top; top < area.bottom; top += cell)
    for (let left = area.left; left < area.right; left += cell) {
      const shade = random()
      const twinkles = random() < SPACE.twinkleShare
      stars.push({
        x: left + random() * cell,
        y: top + random() * cell,
        size: SPACE.scale * (random() < 0.75 ? 1 : between(random, [1.4, 2])),
        // why: most stars faint, a few bright, as in the reference sky;
        // halved, so the bright ones stand out (black-hole-alive, 14).
        brightness: 0.5 * (0.3 + 0.7 * random() ** 2.2),
        tint: shade < SPACE.tintShare / 2 ? 1 : shade < SPACE.tintShare ? 2 : 0,
        period: twinkles ? between(random, SPACE.twinkleSeconds) : 0,
        phase: random()
      })
    }
  return stars
}

/** A star's brightness `seconds` in: steady, or from twinkleLow to 1. */
export const starGlow = (star: Star, seconds: number) => {
  if (!star.period) return star.brightness
  const wave =
    0.5 + 0.5 * Math.cos(2 * Math.PI * (seconds / star.period + star.phase))
  return star.brightness * (SPACE.twinkleLow + (1 - SPACE.twinkleLow) * wave)
}

/** A seeded generator, so the same sky comes back for the same seed. */
export const seeded = (seed: number): Random => {
  let state = Math.floor(seed * 2147483646) % 2147483647 || 1
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

// why: more bright stars over the sky, two large, four medium and six small
// (task black-hole-alive, 4), blinking slowly, off the copy's band.
const FEATURED = [
  { count: 2, size: [5, 6] },
  { count: 4, size: [3, 4] },
  { count: 6, size: [2.2, 2.8] }
] as const

/**
 * The extra bright stars of a `width` × `height` px hero: placed off the
 * copy's band (12–88% wide × 28–80% tall), full brightness, so their
 * sprites carry spikes, and blinking in 3 to 6 s.
 */
export const createFeatured = (
  random: Random,
  width: number,
  height: number
): Star[] => {
  const stars: Star[] = []
  for (const kind of FEATURED)
    for (let index = 0; index < kind.count; index++) {
      let x = 0
      let y = 0
      for (let tries = 0; tries < 100; tries++) {
        x = random()
        y = random() * 0.8
        if (!(x > 0.12 && x < 0.88 && y > 0.28 && y < 0.8)) break
      }
      stars.push({
        x: x * width,
        y: y * height,
        size: SPACE.scale * between(random, kind.size),
        brightness: 0.9 + 0.1 * random(),
        tint: 0,
        period: between(random, [3, 6]),
        phase: random()
      })
    }
  return stars
}
