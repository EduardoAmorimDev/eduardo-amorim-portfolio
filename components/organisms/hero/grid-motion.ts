// why: the limits come from the task (gravity, criteria 1–8), in CSS px of
// the hero at 1440×900: a sheet seen from above like the reference image,
// leaning 50° back from the screen, so a cell at the hero's middle is
// cos 50° ≈ 0.64 as tall as its 48 px width, ≈ 0.51 at the top and ≈ 0.77
// at the bottom, with verticals ≈ 0.67 as far apart at the top.
export const GRID = {
  spacing: 48,
  /** How far the sheet leans back from the screen, about the midline. */
  tilt: (50 * Math.PI) / 180,
  /** Pinhole focal length as a share of the hero's height; sets the depth. */
  focal: 3,
  /** Distance between the points a line is drawn through. */
  step: 4
} as const

// why: in sheet px (screen px at the hero's middle row). The pointer pinches
// the verticals towards it and sinks the horizontals into a well; `core`
// keeps the pinch from pulling a point past the pointer (pull / core < 1),
// so lines never fold over each other.
export const POINTER_WELL = {
  radius: 180,
  pull: 14,
  sink: 14,
  core: 16
} as const

// why: sizes at the black hole's design scale (1 at 1440×900); they shrink
// with it on narrow screens, and with depth like the sheet. `pull` equals
// the horizon radius, so a point is never pulled past the centre, only into
// the horizon; `sink` sets the well's depth, 40–80 px on screen (criterion
// 4), shallow enough that no row sinks past the next one.
export const HOLE_WELL = {
  radius: 280,
  pull: 48,
  sink: 84
} as const

export type Point = { x: number; y: number }

/** The pointer's well: where it is and how deep, 0 (gone) to 1 (full). */
export type PointerBody = Point & { strength: number }

/** The black hole's well: its centre, horizon radius and scale, in px. */
export type HoleBody = Point & { horizon: number; scale: number }

/** A point of the sheet: `u` across, `v` up the sheet, both from the centre. */
export type SheetPoint = { u: number; v: number }

/** The perspective of a hero `width` × `height` px. */
export type Sheet = {
  width: number
  height: number
  /** Screen x of vertical line `u` (sheet px from the centre) at screen y. */
  verticalX: (u: number, y: number) => number
  /** Sheet positions `u` of the vertical lines covering the whole hero. */
  verticals: readonly number[]
  /** Screen y of the horizontal lines, top to bottom. */
  rows: readonly number[]
  /** The sheet point drawn at screen point `point`, with the sheet flat. */
  toSheet: (point: Point) => SheetPoint
  /** Where sheet point `at` is drawn once sunk `depth` px into the sheet. */
  toScreen: (at: SheetPoint, depth: number) => Point
}

/**
 * How much a sheet px measures on screen at screen y, in a hero `height` px
 * tall: 1 at the midline, less higher up (farther), more lower down. It is
 * also a cell's width over GRID.spacing there.
 */
export const sheetScale = (height: number, y: number) =>
  1 - ((height / 2 - y) * Math.tan(GRID.tilt)) / (GRID.focal * height)

/**
 * A sheet tilted GRID.tilt about the hero's horizontal midline, seen through
 * a pinhole: a vertical line stays straight and leans towards the centre as
 * it recedes, so lines are closer at the top; at the midline the scale is 1
 * and lines sit GRID.spacing apart.
 */
export const sheet = (width: number, height: number): Sheet => {
  const cx = width / 2
  const cy = height / 2
  const focal = GRID.focal * height
  const cos = Math.cos(GRID.tilt)
  const sin = Math.sin(GRID.tilt)
  // invariant: sheet point (u, v) sunk `depth` along the sheet's normal sits
  // at (u, v·cos − depth·sin, focal + v·sin + depth·cos) in camera space,
  // the camera at the origin looking down +z with y up.
  const toScreen = ({ u, v }: SheetPoint, depth: number) => {
    const z = focal + v * sin + depth * cos
    return {
      x: cx + (focal * u) / z,
      y: cy - (focal * (v * cos - depth * sin)) / z
    }
  }
  const toSheet = ({ x, y }: Point) => {
    const dy = cy - y
    const v = (dy * focal) / (focal * cos - dy * sin)
    return { u: (x - cx) / sheetScale(height, y), v }
  }
  // invariant: an unsized hero (before its first layout) has no lines.
  if (!(width > 0 && height > 0))
    return {
      width,
      height,
      verticalX: () => 0,
      verticals: [],
      rows: [],
      toSheet,
      toScreen
    }
  const verticalX = (u: number, y: number) => cx + u * sheetScale(height, y)

  // why: lines converge at the top, so the widest reach is needed there.
  const reach =
    cx / Math.min(sheetScale(height, 0), sheetScale(height, height)) +
    GRID.spacing
  const verticals: number[] = []
  for (let u = GRID.spacing / 2; u <= reach; u += GRID.spacing)
    verticals.push(-u, u)
  verticals.sort((a, b) => a - b)

  const rowY = (v: number) => toScreen({ u: 0, v }, 0).y
  // hazard: below the midline the sheet nears the viewer; past
  // v = −focal / sin it would be behind the pinhole, where rowY wraps round,
  // so the walk stops well short of it.
  const nearest = (-0.9 * focal) / sin
  const rows: number[] = []
  for (
    let v = -GRID.spacing / 2;
    v > nearest && rowY(v) <= height + 1;
    v -= GRID.spacing
  )
    rows.push(rowY(v))
  for (let v = GRID.spacing / 2; rowY(v) >= -1; v += GRID.spacing)
    rows.push(rowY(v))
  rows.sort((a, b) => a - b)

  return { width, height, verticalX, verticals, rows, toSheet, toScreen }
}

/** Smooth falloff: 1 at the centre, 0 from `radius` out. */
const falloff = (distance: number, radius: number) => {
  if (distance >= radius) return 0
  const reach = 1 - (distance * distance) / (radius * radius)
  return reach * reach
}

/** A body's well, in sheet px: its centre and how far it reaches. */
type Well = SheetPoint & { radius: number }

/**
 * How far the pointer's well moves a sheet point: `u` is the sideways pull
 * towards the pointer, so vertical lines bend to it, and `depth` how far
 * the sheet sinks there, so horizontal lines sag into the well.
 */
export const pointerShift = (
  at: SheetPoint,
  body: SheetPoint,
  strength: number
) => {
  const du = at.u - body.u
  const distance = Math.hypot(du, at.v - body.v)
  const { radius, pull, sink, core } = POINTER_WELL
  if (distance >= radius || strength <= 0) return { u: 0, depth: 0 }
  const depth = falloff(distance, radius) * strength
  const pinch = distance > 0 ? Math.min(1, distance / core) / distance : 0
  return { u: -du * pull * depth * pinch, depth: sink * depth }
}

/**
 * How far the black hole's well moves a sheet point: `u` pulls it sideways
 * towards the centre, strongest at the horizon and gone at the well's
 * radius, never past the centre; `depth` sinks the sheet into the well.
 * `horizon` is the horizon's radius in sheet px; sizes follow `scale`.
 */
export const holeShift = (
  at: SheetPoint,
  body: SheetPoint,
  horizon: number,
  scale: number
) => {
  const du = at.u - body.u
  const distance = Math.hypot(du, at.v - body.v)
  const radius = HOLE_WELL.radius * scale
  const pull = HOLE_WELL.pull * scale
  if (distance >= radius) return { u: 0, depth: 0 }
  const depth = HOLE_WELL.sink * scale * falloff(distance, radius)
  if (distance === 0) return { u: 0, depth }
  const towards =
    distance <= horizon
      ? Math.min(pull, distance)
      : pull *
        falloff(distance - horizon, radius - horizon) *
        Math.min(1, distance / pull)
  return { u: (-du / distance) * towards, depth }
}

/** The pointer's and the black hole's wells in a sheet, in sheet px. */
export type Wells = {
  pointer: (Well & { strength: number }) | null
  hole: (Well & { horizon: number; scale: number }) | null
}

/** Places both bodies on the sheet, from where they are on screen. */
export const wellsOf = (
  grid: Sheet,
  pointer: PointerBody | null,
  hole: HoleBody | null
): Wells => ({
  pointer:
    pointer && pointer.strength > 0
      ? {
          ...grid.toSheet(pointer),
          radius: POINTER_WELL.radius,
          strength: pointer.strength
        }
      : null,
  hole:
    hole && hole.horizon > 0
      ? {
          ...grid.toSheet(hole),
          radius: HOLE_WELL.radius * hole.scale,
          horizon: hole.horizon / sheetScale(grid.height, hole.y),
          scale: hole.scale
        }
      : null
})

/**
 * Where a point of the flat sheet, given on screen, is drawn with both
 * wells applied. A point of a vertical line takes only the sideways pull and
 * a point of a horizontal line only the sinking, so the verticals bend
 * towards each body and the horizontals sag into its well, each symmetric
 * about it.
 */
export const displace = (
  grid: Sheet,
  point: Point,
  wells: Wells,
  vertical: boolean
): Point => {
  const at = grid.toSheet(point)
  const byPointer = wells.pointer
    ? pointerShift(at, wells.pointer, wells.pointer.strength)
    : { u: 0, depth: 0 }
  const byHole = wells.hole
    ? holeShift(at, wells.hole, wells.hole.horizon, wells.hole.scale)
    : { u: 0, depth: 0 }
  if (vertical)
    return grid.toScreen({ u: at.u + byPointer.u + byHole.u, v: at.v }, 0)
  return grid.toScreen(at, byPointer.depth + byHole.depth)
}
