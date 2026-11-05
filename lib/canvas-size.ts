/**
 * What every `<Canvas>` measures itself on (r3f's `resize`): resizes only;
 * r3f's scroll tracking re-rendered each canvas for a position none reads,
 * and those that need it read it live (task portfolio-lp-60fps, 1).
 */
export const STILL_SIZE = { scroll: false } as const
