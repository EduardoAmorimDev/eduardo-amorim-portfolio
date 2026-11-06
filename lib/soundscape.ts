/** A source of values in [0, 1), like Math.random. */
export type Random = () => number

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** One item of a non-empty list, drawn with `random`. */
export const pick = <List extends readonly [unknown, ...unknown[]]>(
  list: List,
  random: Random
): List[number] =>
  list[Math.min(list.length - 1, Math.floor(random() * list.length))] ?? list[0]

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
