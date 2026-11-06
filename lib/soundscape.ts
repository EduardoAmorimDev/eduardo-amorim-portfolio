/** A source of values in [0, 1), like Math.random. */
export type Random = () => number

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const between = (random: Random, low: number, high: number) =>
  low + random() * (high - low)

const whole = (random: Random, low: number, high: number) =>
  Math.min(high, low + Math.floor(random() * (high - low + 1)))

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

/** The first two formants (Hz) of the vowels a, e, i, o and u. */
export const VOWELS = [
  [730, 1090],
  [530, 1840],
  [270, 2290],
  [570, 840],
  [300, 870]
] as const satisfies readonly [
  readonly [number, number],
  ...(readonly [number, number])[]
]

export type Syllable = {
  seconds: number
  formants: readonly [number, number]
  /** The voice's pitch, in Hz. */
  pitch: number
}

/**
 * A phrase of murmur, too far off to make out: 3 to 10 syllables of 0.12 to
 * 0.26 s, the pitch around `voice` (Hz) and falling as a sentence does,
 * then a pause of 0.6 to 2.8 s before the next.
 */
export const phrase = (random: Random, voice: number) => {
  const count = whole(random, 3, 10)
  const syllables: Syllable[] = Array.from({ length: count }, (_, at) => ({
    seconds: between(random, 0.12, 0.26),
    formants: pick(VOWELS, random),
    pitch: voice * between(random, 0.9, 1.15) * (1 - (0.15 * at) / count)
  }))
  return { syllables, pause: between(random, 0.6, 2.8) }
}

/**
 * A run of typing: 4 to 20 keys 0.07 to 0.2 s apart, then a pause of 1.5 to
 * 6 s while the typist reads.
 */
export const typingRun = (random: Random) => ({
  gaps: Array.from({ length: whole(random, 4, 20) }, () =>
    between(random, 0.07, 0.2)
  ),
  pause: between(random, 1.5, 6)
})

/** A key's click: `length` samples of white noise decaying fast. */
export const keyClick = (length: number, random: Random) =>
  Float32Array.from(
    { length },
    (_, at) => (random() * 2 - 1) * Math.exp((-6 * at) / Math.max(length, 1))
  )
