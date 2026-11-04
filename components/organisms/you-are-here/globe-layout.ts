/** A canvas's size in scene units at the globe's depth. */
export type Viewport = { width: number; height: number }

/**
 * Where the globe sits and how big it is (its radius), in scene units from
 * the canvas's centre. `lift` is the share of the canvas's height that
 * rises above the section, so the globe is laid out in the section alone.
 */
export const globeLayout = ({ width, height }: Viewport, lift: number) => {
  const stage = height * (1 - lift)
  // invariant: the canvas ends at the section's bottom, so the section's
  // middle sits half the lifted part below the canvas's middle.
  const middle = (-height * lift) / 2
  // why: like the hero's black hole, the Earth sits right of the copy on
  // wide screens and above it on tall ones.
  return width > stage
    ? { x: width * 0.2, y: middle, scale: Math.min(stage * 0.3, width * 0.2) }
    : {
        x: 0,
        y: middle + stage * 0.2,
        scale: Math.min(width * 0.4, stage * 0.22)
      }
}
