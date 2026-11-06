/** A source of values in [0, 1), like Math.random. */
export type Random = () => number

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/**
 * How much of the hero is still on screen, from its top's distance to the
 * viewport top (negative once scrolled past) and its height: 1 at rest, 0
 * once its bottom has left the top of the screen.
 */
export const heroPresence = (top: number, height: number) =>
  height > 0 ? clamp01(1 + top / height) : 0

/**
 * How far a section has come into view from below, from its top's distance
 * to the viewport top: 0 while under the screen, 1 once at the top.
 */
export const entryShare = (top: number, viewport: number) =>
  viewport > 0 ? clamp01(1 - top / viewport) : 0

/**
 * The gain of each of the page's three sounds: the black hole while the hero
 * shows, the planet as the contact section comes in, space in between.
 * invariant: equal power, so a crossfade never dips or swells in loudness.
 */
export const layerMix = (hero: number, planet: number) => ({
  blackHole: rise(hero),
  space: rise(1 - hero) * rise(1 - planet),
  planet: rise(planet)
})

// invariant: exactly 0 and 1 at the ends (cos(π/2) is 6e-17, not 0), so a
// silent layer reads as silent and stops scheduling its sounds.
const rise = (share: number) =>
  share <= 0 ? 0 : share >= 1 ? 1 : Math.sin((share * Math.PI) / 2)

/**
 * One breath of the planet's air: a rise of 3 to 4.5 s to a crest of 0.8 to
 * 1, then a fall of 4 to 6 s; uneven, so the waves never fall into a beat.
 */
export const breath = (random: Random) => ({
  rise: 3 + random() * 1.5,
  crest: 0.8 + random() * 0.2,
  fall: 4 + random() * 2
})

/**
 * A crowd's talk as a level over time: `length` samples at `rate` Hz, in
 * [0, 1]. Syllables of 0.1 to 0.25 s, each a soft arch at a level of 0.3 to
 * 1, in phrases of 3 to 9, with pauses of 0.2 to 0.8 s between phrases.
 * invariant: it starts and ends at rest, so it loops without a jump.
 */
export const murmurEnvelope = (
  length: number,
  rate: number,
  random: Random
) => {
  const levels = new Float32Array(length)
  const longest = Math.ceil(0.25 * rate)
  let at = 0
  while (at + longest < length) {
    const count = 3 + Math.floor(random() * 7)
    for (
      let syllable = 0;
      syllable < count && at + longest < length;
      syllable++
    ) {
      const span = Math.max(2, Math.round((0.1 + random() * 0.15) * rate))
      const level = 0.3 + random() * 0.7
      for (let step = 0; step < span; step++, at++)
        levels[at] = level * Math.sin((Math.PI * step) / span)
    }
    at += Math.round((0.2 + random() * 0.6) * rate)
  }
  return levels
}

/**
 * One slow swing of the light's blade, its "vwoom": a rise of 0.6 to 1 s,
 * a fall of 1.2 to 1.8 s, and the next swing 3.5 to 6 s after this one
 * began, so the blade is never still for long and never swings in a beat.
 */
export const swing = (random: Random) => ({
  rise: 0.6 + random() * 0.4,
  fall: 1.2 + random() * 0.6,
  next: 3.5 + random() * 2.5
})
