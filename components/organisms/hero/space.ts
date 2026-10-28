// why: the task's numbers (space, criteria 2, 3 and 6), measured at
// 1440×900 in CSS px; the user takes them as starting values (Unresolved 2).
export const SPACE = {
  /** Stars inside a 1440×900 hero; the density holds at any size. */
  stars: 2000,
  designArea: 1440 * 900,
  /** Share of stars that twinkle, how far down and how slowly. */
  twinkleShare: 0.15,
  twinkleLow: 0.4,
  twinkleSeconds: [2, 6],
  /** Share of stars tinted towards primary or steel. */
  tintShare: 0.15
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
  { at: [0.905, 0.72], core: 3, halo: 14, spikes: 22 }
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
        size: random() < 0.75 ? 1 : between(random, [1.4, 2]),
        // why: most stars faint, a few bright, as in the reference sky.
        brightness: 0.3 + 0.7 * random() ** 2.2,
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
