/**
 * Masks that fade a decorated block's sky over half a screen at its edges,
 * so it cross-fades with whatever meets it there instead of ending on a
 * line (task reach-and-seams, 1 and 7): `out` at the bottom only, `both` at
 * the top too, where the hero's spill dissolves under it.
 */
export const SKY_FADE = {
  out: '[mask-image:linear-gradient(to_bottom,black_calc(100%-50svh),transparent)]',
  both: '[mask-image:linear-gradient(to_bottom,transparent,black_50svh,black_calc(100%-50svh),transparent)]'
} as const

export type SkyFade = keyof typeof SKY_FADE
