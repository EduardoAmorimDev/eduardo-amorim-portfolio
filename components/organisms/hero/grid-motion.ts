// why: the limits come from the task (cosmos, criteria 16–20), in CSS px of
// the hero at 1440×900: a sheet tilted 30° whose lines are 48 px apart at the
// hero's middle; the pointer sinks it within 180 px, the black hole within
// 280 px, by at most 48 px.
export const GRID = {
  spacing: 48,
  /** How far the sheet leans back about the hero's horizontal midline. */
  tilt: Math.PI / 6,
  /** Pinhole focal length as a share of the hero's height; sets the depth. */
  focal: 1.6,
  /** Distance between the points a line is drawn through. */
  step: 4
} as const

// why: the pointer pinches the vertical lines towards it and sinks the
// horizontal ones; `core` keeps the pinch from pulling a point past the
// pointer (pull / core < 1), so lines never fold over each other.
export const POINTER_WELL = {
  radius: 180,
  pull: 14,
  sink: 12,
  core: 16
} as const

// why: sizes at the black hole's design scale (1 at 1440×900); they shrink
// with it on narrow screens. `pull` equals the horizon radius, so a point is
// never pulled past the centre, only into the horizon.
export const HOLE_WELL = {
  radius: 280,
  pull: 48
} as const

export type Point = { x: number; y: number }

/** The pointer's well: where it is and how deep, 0 (gone) to 1 (full). */
export type PointerBody = Point & { strength: number }

/** The black hole's well: its centre, horizon radius and scale, in px. */
export type HoleBody = Point & { horizon: number; scale: number }

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
}

/**
 * A sheet tilted GRID.tilt about the hero's horizontal midline, seen through
 * a pinhole: a vertical line stays straight and leans towards the centre as
 * it recedes, so lines are closer at the top; at the midline the scale is 1
 * and lines sit GRID.spacing apart.
 */
export const sheet = (width: number, height: number): Sheet => {
  // invariant: an unsized hero (before its first layout) has no lines.
  if (!(width > 0 && height > 0))
    return { width, height, verticalX: () => 0, verticals: [], rows: [] }
  const cx = width / 2
  const cy = height / 2
  const focal = GRID.focal * height
  const tan = Math.tan(GRID.tilt)
  const cos = Math.cos(GRID.tilt)
  const sin = Math.sin(GRID.tilt)
  // invariant: the scale at screen y is 1 − (cy − y)·tan/focal, linear in y,
  // which is why a projected vertical line is straight.
  const scale = (y: number) => 1 - ((cy - y) * tan) / focal
  const verticalX = (u: number, y: number) => cx + u * scale(y)

  // why: lines converge at the top, so the widest reach is needed there.
  const reach = cx / Math.min(scale(0), scale(height)) + GRID.spacing
  const verticals: number[] = []
  for (let u = GRID.spacing / 2; u <= reach; u += GRID.spacing)
    verticals.push(-u, u)
  verticals.sort((a, b) => a - b)

  // invariant: a row at sheet distance v above the midline lands at
  // cy − v·cos·focal / (focal + v·sin) on screen.
  const rowY = (v: number) => cy - (v * cos * focal) / (focal + v * sin)
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

  return { width, height, verticalX, verticals, rows }
}

/** Smooth falloff: 1 at the centre, 0 from `radius` out. */
const falloff = (distance: number, radius: number) => {
  if (distance >= radius) return 0
  const reach = 1 - (distance * distance) / (radius * radius)
  return reach * reach
}

/**
 * How far the pointer's well moves a point: sideways towards the pointer,
 * so vertical lines bend to it, and down, so horizontal lines sag.
 */
export const pointerShift = (point: Point, body: PointerBody): Point => {
  const dx = point.x - body.x
  const dy = point.y - body.y
  const distance = Math.hypot(dx, dy)
  const { radius, pull, sink, core } = POINTER_WELL
  if (distance >= radius || body.strength <= 0) return { x: 0, y: 0 }
  const depth = falloff(distance, radius) * body.strength
  const pinch = distance > 0 ? Math.min(1, distance / core) / distance : 0
  return { x: -dx * pull * depth * pinch, y: sink * depth }
}

/**
 * How far the black hole's well moves a point: straight towards its centre,
 * strongest at the horizon and gone at HOLE_WELL.radius (scaled). Inside
 * the horizon a point falls to the centre, never past it.
 */
export const holeShift = (point: Point, body: HoleBody): Point => {
  const dx = point.x - body.x
  const dy = point.y - body.y
  const distance = Math.hypot(dx, dy)
  const radius = HOLE_WELL.radius * body.scale
  const pull = HOLE_WELL.pull * body.scale
  if (distance >= radius || distance === 0) return { x: 0, y: 0 }
  const towards =
    distance <= body.horizon
      ? Math.min(pull, distance)
      : pull *
        falloff(distance - body.horizon, radius - body.horizon) *
        Math.min(1, distance / pull)
  return { x: (-dx / distance) * towards, y: (-dy / distance) * towards }
}

/**
 * Where a point of the sheet is drawn, with both wells applied. A point of
 * a vertical line takes only the pointer's sideways pull and a point of a
 * horizontal line only its sink, so the verticals bend towards the pointer
 * and the horizontals sag beneath it, each symmetric about it.
 */
export const displace = (
  point: Point,
  pointer: PointerBody | null,
  hole: HoleBody | null,
  vertical: boolean
): Point => {
  const pulled = pointer ? pointerShift(point, pointer) : { x: 0, y: 0 }
  const byPointer = vertical ? { x: pulled.x, y: 0 } : { x: 0, y: pulled.y }
  const byHole = hole ? holeShift(point, hole) : { x: 0, y: 0 }
  return {
    x: point.x + byPointer.x + byHole.x,
    y: point.y + byPointer.y + byHole.y
  }
}
