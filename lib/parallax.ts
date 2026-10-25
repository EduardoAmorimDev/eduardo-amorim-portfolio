export const PARALLAX_LAYERS = ['back', 'mid', 'front'] as const

export type ParallaxLayer = (typeof PARALLAX_LAYERS)[number]

// why: on-screen pixels a layer moves per scrolled pixel (T18). Content moves
// 1:1; the back drifts slowly, the front overtakes the content.
export const PARALLAX_SPEED: Readonly<Record<ParallaxLayer, number>> = {
  back: 0.2,
  mid: 0.5,
  front: 1.3
}

/**
 * Vertical shift for a layer at the top of a container whose top sits
 * `containerTop` px below the viewport top: the layer lands at
 * `speed × containerTop` and moves `speed` px per scrolled px.
 */
export const layerShift = (speed: number, containerTop: number) =>
  (speed - 1) * containerTop

/** Where the layer's top lands on screen once shifted. */
export const layerScreenTop = (speed: number, containerTop: number) =>
  containerTop + layerShift(speed, containerTop)

/**
 * CSS height a layer needs to stay filled from the moment the container
 * enters the viewport until it leaves: `speed` times the container plus a
 * screen.
 */
export const layerHeight = (speed: number) =>
  `calc(${Math.round(speed * 100)}% + 100svh)`
