/**
 * What every `<Canvas>` on the page measures itself on (r3f's `resize`):
 * resizes only. Left to r3f, each canvas listened to every scroll and
 * re-rendered once it settled, for a position no scene here reads; the
 * ones that need it read it live (task portfolio-lp-60fps, 1).
 */
export const STILL_SIZE = { scroll: false } as const
