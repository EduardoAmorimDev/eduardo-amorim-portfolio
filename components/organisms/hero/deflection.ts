import { LIFT, liftScale } from './black-hole.ts'

// why: lengths in Schwarzschild radii. A ray passing the black hole closer
// than 3√3/2 of them spirals in (Bozza, arXiv:gr-qc/0208075, eq. 49); on
// screen that impact is the horizon drawn (task black-hole-lensing, 2), so
// a screen distance in horizon radii times this is the ray's impact.
export const CRITICAL_IMPACT = (3 * Math.sqrt(3)) / 2

// why: the Einstein ring at 1.6 horizon radii above and below the black
// hole, half risen (black-hole-apple, 4; it was 2 in black-hole-lensing).
export const EINSTEIN = { radius: 1.6, lift: LIFT.still } as const

// why: midpoint steps of the deflection integral; within 0.1% of the weak
// field at b = 1000 and 0.05% of the strong field at 1.001 b_c.
const STEPS = 4000
const HALVINGS = 52

/** The value in [low, high] where the rising `f` reaches `target`. */
const solve = (
  f: (x: number) => number,
  target: number,
  low: number,
  high: number
) => {
  let lo = low
  let hi = high
  for (let step = 0; step < HALVINGS; step++) {
    const mid = (lo + hi) / 2
    if (f(mid) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * How far a ray of `impact` Schwarzschild radii is bent, in radians:
 * α = 2∫₀^{u₀} du / √(1/b² − u² + u³) − π, u₀ the inverse of its closest
 * approach r₀, b² = r₀³/(r₀ − 1). Infinity once the ray is captured.
 */
export const deflection = (impact: number) => {
  if (!(impact > CRITICAL_IMPACT)) return Infinity
  // invariant: r³/(r − 1) rises from its minimum b_c² at r = 1.5, and r = b
  // already passes b², so the closest approach lies between them.
  const closest = solve(r => r ** 3 / (r - 1), impact * impact, 1.5, impact)
  const turn = 1 / closest
  const inverseSquare = 1 / (impact * impact)
  let sum = 0
  // why: u = u₀(1 − t²) turns the root at u₀ into a finite integrand.
  for (let step = 0; step < STEPS; step++) {
    const t = (step + 0.5) / STEPS
    const u = turn * (1 - t * t)
    sum += (2 * turn * t) / Math.sqrt(inverseSquare - u * u + u * u * u)
  }
  return (2 * sum) / STEPS - Math.PI
}

/** The deflection of the ray seen `theta` horizon radii from the centre. */
const bentBy = (theta: number) => deflection(theta * CRITICAL_IMPACT)

/** The share of D_L·D_LS/D_S at `lift`, the hole on the grid at lift 0. */
const lensShare = (lift: number) => {
  // invariant: the black hole looks liftScale(lift) its size, so it sits at
  // LIFT.lowest / liftScale of the grid's distance from the viewer.
  const nearness = LIFT.lowest / liftScale(lift)
  return nearness * (1 - nearness)
}

const RESTING_BEND = EINSTEIN.radius / bentBy(EINSTEIN.radius)

/**
 * The thin lens' K at `lift`, in horizon radii: a point of the grid β from
 * the centre is seen at θ where β = θ − K·α(θ). It is 0 resting on the grid
 * and grows with D_L·D_LS/D_S as the black hole rises, as a real lens does.
 */
export const bendAt = (lift: number) =>
  (RESTING_BEND * lensShare(lift)) / lensShare(EINSTEIN.lift)

/** Where the ray seen `theta` horizon radii out comes from, signed. */
export const sourceRadius = (theta: number, bend: number) =>
  bend > 0 ? theta - bend * bentBy(theta) : theta

const rings = new Map<number, number>()

// why: the lens follows a dipole whose poles are left and right of the
// shadow, bending as the field line through each point (black-hole-flow,
// 2): |sin φ|^0.5 keeps it near whole at most angles and drops it only at
// the poles; the light also flows round a circle of 1.6 horizon radii, as
// a liquid round a cylinder (black-hole-flow, 3).
export const FIELD = { exponent: 0.5 } as const
export const FLOW = { radius: 1.6 } as const

/** How much of the lens reaches `angle` radians off the poles' axis. */
export const fieldShare = (angle: number) =>
  Math.abs(Math.sin(angle)) ** FIELD.exponent

/**
 * Where the ray seen `theta` horizon radii out, `angle` radians off the
 * poles' axis (the horizontal), comes from, by the lens alone: the lens of
 * the field line through that point, ρ = θ / fieldShare(angle).
 */
export const sourceRadiusAt = (theta: number, angle: number, bend: number) => {
  const share = fieldShare(angle)
  return share > 0 && bend > 0 ? theta - bend * bentBy(theta / share) : theta
}

/**
 * The point behind the black hole that the screen point (x, y) shows, both
 * in horizon radii from its centre, x to the right and y up: the dipole
 * lens, radial, plus the flow round the circle, a²·(x, −y)/r².
 */
export const behindPoint = (x: number, y: number, bend: number) => {
  const r2 = x * x + y * y
  const theta = Math.sqrt(r2)
  const beta = sourceRadiusAt(theta, Math.atan2(y, x), bend)
  const flow = (FLOW.radius * FLOW.radius) / r2
  return {
    x: (x * beta) / theta + flow * x,
    y: (y * beta) / theta - flow * y
  }
}

/** The Einstein ring's radius, in horizon radii, for a lens of `bend`. */
export const einsteinRadius = (bend: number) => {
  if (!(bend > 0)) return 1
  const known = rings.get(bend)
  if (known !== undefined) return known
  // invariant: sourceRadius rises from −∞ just past the horizon and is
  // positive by 2 + bend, where bend·α stays below 0.56·bend.
  const ring = solve(theta => sourceRadius(theta, bend), 0, 1, 2 + bend)
  rings.set(bend, ring)
  return ring
}

/**
 * Where a point `distance` horizon radii from the centre is seen on its own
 * side, past the Einstein ring, through a lens of `bend`.
 */
export const outerImage = (distance: number, bend: number) => {
  if (!(bend > 0)) return Math.max(distance, 1)
  const ring = einsteinRadius(bend)
  return solve(
    theta => sourceRadius(theta, bend),
    distance,
    ring,
    distance + ring + 1
  )
}

/**
 * Where the same point is seen mirrored, on the opposite side, between the
 * horizon and the Einstein ring; null with no lens.
 */
export const innerImage = (distance: number, bend: number) =>
  bend > 0
    ? solve(
        theta => sourceRadius(theta, bend),
        -distance,
        1,
        einsteinRadius(bend)
      )
    : null

/**
 * The deflection at `size` evenly spread values of s = 1/θ, θ in horizon
 * radii: s = 0 is far away, with no bend, and s = 1 the horizon itself,
 * where the bend is capped at that of a ray 10⁻⁴ radii past it.
 */
export const deflectionTable = (size: number) => {
  const table = new Float32Array(size)
  const edge = 1 / (1 + 1e-4)
  for (let index = 1; index < size; index++)
    table[index] = bentBy(1 / Math.min(index / (size - 1), edge))
  return table
}
