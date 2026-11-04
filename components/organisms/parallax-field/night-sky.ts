// why: a seeded generator draws the sky, so every star keeps its place,
// size and tint across visits and the server and the browser agree on
// them; integer maths (mulberry32) gives the same draws in every engine.
const seeded = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round = (value: number) => Math.round(value * 1000) / 1000

/** The colours a star can take, as named colour tokens. */
export type StarTint = 'mist' | 'snow' | 'dawn' | 'sky'

/**
 * The Milky Way, in percent of its layer: a band whose middle runs from
 * `start` (top at the left edge) to `end` (top at the right edge), `half`
 * above and below that line.
 */
export const MILKY_WAY = { start: 10, end: 90, half: 9 } as const

/**
 * The Milky Way's clouds: a seamless luminance tile (scripts/milky-way-
 * clouds.mjs) repeated at a fixed size, so they keep their shape however
 * tall the layer is (task portfolio-lp-mobile, 1); `pixels` is the image's
 * own size, 1.5 per CSS px, under 2x on a 3x screen (3).
 */
export const CLOUDS = { url: '/sky/clouds.webp', tile: 768, pixels: 1152 }

/** Top of the Milky Way's middle line at `left` percent across. */
export const bandMiddle = (left: number) =>
  MILKY_WAY.start + ((MILKY_WAY.end - MILKY_WAY.start) * left) / 100

// why: a real sky has far more faint stars than bright ones; most are a
// pixel at under half brightness, one in thirty is a bright 2.5 px star.
const magnitude = (draw: number, next: () => number) => {
  if (draw < 0.7) return { size: 1, peak: 0.2 + 0.3 * next() }
  if (draw < 0.95) return { size: 1.5, peak: 0.45 + 0.3 * next() }
  if (draw < 0.975) return { size: 2, peak: 0.75 + 0.2 * next() }
  return { size: 2.5, peak: 0.95 + 0.05 * next() }
}

// why: most stars read blue-white, then white, a few warm and a few hot
// blue, the spread of star colours seen by eye.
const tint = (draw: number): StarTint =>
  draw < 0.55 ? 'mist' : draw < 0.8 ? 'snow' : draw < 0.92 ? 'dawn' : 'sky'

const FAR_STARS = 240
// why: this share of the far stars crowds into the Milky Way, which makes
// the band read as stars as well as a glow.
const IN_BAND = 0.42

/** Far stars: positions in percent of the layer, twinkle timing in s. */
export const farStars = () => {
  const next = seeded(20261104)
  return Array.from({ length: FAR_STARS }, () => {
    const left = next() * 100
    // invariant: three draws summed lean towards the band's middle and
    // stay within 0.9 × half of it, so a band star is always inside it.
    const spread = (next() + next() + next() - 1.5) * 0.6 * MILKY_WAY.half
    const top = next() < IN_BAND ? bandMiddle(left) + spread : next() * 100
    const period = 3 + 5 * next()
    return {
      top: round(top),
      left: round(left),
      ...magnitude(next(), next),
      tint: tint(next()),
      period: round(period),
      phase: round(period * next())
    }
  }).map(star => ({ ...star, peak: round(star.peak) }))
}

/** Near stars: a few bright ones, scattered, 2 to 3 px. */
export const nearStars = () => {
  const next = seeded(4111)
  return Array.from({ length: 18 }, () => ({
    top: round(next() * 100),
    left: round(next() * 100),
    size: 2 + Math.round(next())
  }))
}

/** Dust: blurred motes rushing past the left and right edges. */
export const dustMotes = () => {
  const next = seeded(977)
  return Array.from({ length: 10 }, (_, index) => ({
    top: round(next() * 100),
    left: round(index % 2 === 0 ? 2 + 6 * next() : 88 + 8 * next()),
    size: 6 + Math.round(10 * next())
  }))
}
