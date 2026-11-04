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

// why: each layer is drawn as horizontal slabs, each moved and composited
// on its own, so no moving layer is taller than about a screen on a phone
// (task portfolio-lp-mobile, 14); a whole front layer measured 8,397 px
// at 390 x 844. More slabs where the layer is taller (its speed).
export const PARALLAX_SLABS: Readonly<Record<ParallaxLayer, number>> = {
  back: 3,
  mid: 5,
  front: 10
}

// why: px a slab reaches past its share of the layer, above and below, so
// a near star's halo or a dust mote's blur on a seam is never cut; the back
// has neither, and its Milky Way must not be drawn twice where slabs meet.
export const SLAB_MARGIN: Readonly<Record<ParallaxLayer, number>> = {
  back: 0,
  mid: 16,
  front: 40
}

/** The slab of `count` that holds an item `top` percent down its layer. */
export const slabIndex = (top: number, count: number) =>
  Math.min(Math.max(Math.floor((top / 100) * count), 0), count - 1)

/**
 * CSS for slab `index` of `count`, in the layer's container units (`cqh`):
 * the slab's own box, and the offset that puts its content back at the
 * layer's origin, so items keep their percent of the layer.
 */
export const slabBox = (index: number, count: number, margin: number) => {
  const share = 100 / count
  return {
    top: `calc(${index * share}cqh - ${margin}px)`,
    height: `calc(${share}cqh + ${2 * margin}px)`,
    contentTop: `calc(${margin}px - ${index * share}cqh)`
  }
}
