'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  Color,
  PerspectiveCamera,
  Vector3,
  type Group,
  type ShaderMaterial
} from 'three'
import { readColorToken } from '@/lib/color-tokens'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { BentLight } from './bent-light'
import { DISK, DISK_POSE, HOLE, diskPose } from './black-hole'
import { HERO_CAMERA } from './glass-motion'
import type { HoleBody } from './grid-motion'

// why: how far from the camera the black hole floats, in world units; behind
// the logo (≈7 away), so the glass sits in front of it.
const DEPTH = 8.5
// why: the quad's half size in horizon radii: the disk's outer edge (8)
// plus room for its glow to fade out before the quad ends.
const SPAN = 9.5
// why: candela, fading with the square of the distance; enough to light the
// logo's facing side a few units away (cosmos 31), doubled with the black
// hole (black-hole-scale 1), whose larger glow behind the glass lifts both
// of the logo's sides alike.
const INTENSITY = 320
// why: the light takes the disk's colour: mist warmed towards the brand blue.
const LIGHT_BLEND = 0.4

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// why: one pass on a camera-facing quad, in horizon radii: a ring seen
// uTilt above its plane, axis leaning uRoll, its near half in front of the
// horizon, its far half past it and bent into a ring round it, so the
// hole reads as a sphere; mist, primary and ink only (gravity 13).
const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uInk;
  uniform vec3 uMist;
  uniform vec3 uPrimary;
  uniform float uInnerTurn;
  uniform float uOuterTurn;
  uniform float uTilt;
  uniform float uRoll;
  varying vec2 vUv;

  #define TAU 6.283185307179586
  const float SPAN = ${SPAN.toFixed(2)};
  const float DISK_IN = ${DISK.inner.toFixed(2)};
  const float DISK_OUT = ${DISK.outer.toFixed(2)};
  const float ARC_OUT = ${HOLE.halfHeight.toFixed(2)};
  const float ARC_TOP = ${HOLE.topHeight.toFixed(2)};
  // Where the vertical disk's feet reach along the horizontal one's plane.
  const float FOOT_OUT = 2.15;
  // why: the disk grew from 4 to DISK_OUT radii and the arcs' bands doubled
  // (task black-hole-wide, 4); its light, colour and filaments are read at
  // the radius they had at 4, so it looks the same, only larger.
  const float LOOK_OUT = 4.0;
  const float ARC_IN = 1.05;
  const float RING = 1.04;
  // The disk's own thickness, in horizon radii, and how much brighter its
  // approaching (left) side is than its receding one: 1 ± BEAM.
  const float THICK = 0.12;
  const float BEAM = 0.45;
  // How much brighter and denser the gas is than at first: 1.5×, so both
  // disks glow white hot.
  const float GLOW = 1.5;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1) * 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float weight = 0.5;
    for (int layer = 0; layer < 4; layer++) {
      value += weight * noise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      weight *= 0.5;
    }
    return value;
  }

  // The radius, on a disk reaching LOOK_OUT, whose look a point takes.
  float look(float radius) {
    return DISK_IN + (radius - DISK_IN) * (LOOK_OUT - DISK_IN) / (DISK_OUT - DISK_IN);
  }

  // The same for the arcs, whose bands are twice as wide.
  float arcLook(float radius) {
    return ARC_IN + (radius - ARC_IN) * 0.5;
  }

  // Wisps of gas at a radius and angle of the disk: noise in (around the
  // orbit, across it), long along the orbit and thin across, its radius
  // bent by a slower turbulence so each filament wavers and breaks. It
  // turns once every uInnerTurn s at the inner edge, uOuterTurn s outside.
  float wisps(float radius, float angle, float edge) {
    float share = clamp((radius - DISK_IN) / (DISK_OUT - DISK_IN), 0.0, 1.0);
    float turn = mix(uInnerTurn, uOuterTurn, share);
    float phase = angle - TAU * uTime / turn;
    vec2 around = vec2(cos(phase), sin(phase)) * 2.6;
    float seen = look(radius);
    float swirl = fbm(vec3(around * 0.8, seen * 2.0));
    float strand = fbm(vec3(around, (seen + swirl * 0.35) * 9.0 * GLOW));
    return smoothstep(0.34 - edge, 0.7 + edge, strand);
  }

  // The disks' gas: a full, glowing body of gas with crisp wisps over it,
  // so its slow turn stays visible; both disks show the same gas.
  float diskGas(float radius, float angle) {
    return GLOW * (0.3 * GLOW + 1.4 * wisps(radius, angle, 0.04));
  }

  // Doppler beaming: the side turning towards the viewer (cos < 0, the
  // left) is brighter than the side turning away.
  float beam(float cosine) {
    return 1.0 - BEAM * cosine;
  }

  // The horizontal disk's colour at a radius of its plane: mist inside,
  // primary towards its outer edge.
  vec3 diskTint(float radius) {
    return mix(uMist, uPrimary, smoothstep(DISK_IN, LOOK_OUT - 0.6, look(radius)));
  }

  // why: band t of the vertical disk's top is the image of the horizontal
  // disk's ring at plane radius rho(t): it arcs round the horizon at radius
  // ARC_IN to ARC_TOP and, at the sides, lies on that ring's far half. The
  // 6-norm of the two heights rises past both where they cross, as in the
  // reference (task black-hole-disk-colors, 2).
  vec2 bandHeights6(float t, float x, float lean) {
    float arc = ARC_IN + (ARC_TOP - ARC_IN) * t;
    float rho = DISK_IN + (DISK_OUT - DISK_IN) * t;
    float circle = max(arc * arc - x * x, 0.0);
    float ring = max(rho * rho - x * x, 0.0);
    float lean2 = lean * lean;
    // why: sixth powers by multiplication; sqrt and pow cost far more here.
    return vec2(circle * circle * circle, lean2 * lean2 * lean2 * ring * ring * ring);
  }

  float bandHeight6(float t, float x, float lean) {
    vec2 h = bandHeights6(t, x, lean);
    return h.x + h.y;
  }

  // invariant: a band's height grows with t, so the band through (x, y) is
  // found by bisection, comparing sixth powers (y >= 0, so the order holds);
  // past -0.2 or 1.3 it is clamped, beyond both fades.
  float bandAt(float x, float y6, float lean) {
    float low = -0.2;
    float high = 1.3;
    for (int k = 0; k < 12; k++) {
      float mid = 0.5 * (low + high);
      if (bandHeight6(mid, x, lean) < y6) low = mid;
      else high = mid;
    }
    return 0.5 * (low + high);
  }

  // The disk's light at q (disk-aligned screen coordinates), without its
  // gas: x for its near half, in front of the horizon, y for its far half,
  // behind it. A few rows around q give it thickness; the gas is read once,
  // at q, so the rows never smear it into a blur.
  vec2 diskRows(vec2 q, float lean) {
    vec2 lit = vec2(0.0);
    for (int k = -1; k <= 1; k++) {
      float y = q.y + float(k) * THICK * 0.5;
      vec2 onDisk = vec2(q.x, y / lean);
      float radius = length(onDisk);
      float seen = look(radius);
      float band = smoothstep(DISK_IN - 0.05, DISK_IN + 0.2, radius)
        * (1.0 - smoothstep(LOOK_OUT - 0.45, LOOK_OUT, seen));
      if (band <= 0.0) continue;
      float heat = 0.85 * pow(DISK_IN / max(seen, DISK_IN), 1.1);
      float light = band * heat
        * beam(onDisk.x / max(radius, 1e-4))
        * (1.0 - abs(float(k)) * 0.3);
      if (y < 0.0) lit.x = max(lit.x, light);
      else lit.y = max(lit.y, light);
    }
    return lit;
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0 * SPAN;
    float c = cos(uRoll);
    float s = sin(uRoll);
    // The screen point in the disk's own axes, its lean undone.
    vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
    float lean = max(sin(uTilt), 0.02);
    float r = length(q);
    float glow = 0.22 * exp(-max(r - 1.0, 0.0) * 1.3)
      * (1.0 - smoothstep(SPAN * 0.7, SPAN, r));
    // why: most of the quad lies past the arcs and the disk, where only the
    // glow shows; it skips the rest, which would add nothing there.
    // invariant: past r = 2.3 no arc, foot or ring reaches (ARC_TOP 1.8,
    // FOOT_OUT 2.15); past plane radius DISK_OUT + 0.4 no disk row nor top
    // band (it fades out by t = 1.1, plane radius 8.29) does.
    float nearest = length(vec2(q.x, max(abs(q.y) - THICK * 0.5, 0.0) / lean));
    if (r > 2.3 && nearest > DISK_OUT + 0.4) {
      vec3 faint = uPrimary * glow;
      float faintAlpha = clamp(max(max(faint.r, faint.g), faint.b), 0.0, 1.0);
      gl_FragColor = vec4(min(faint / max(faintAlpha, 1e-4), vec3(1.0)), faintAlpha);
      #include <colorspace_fragment>
      return;
    }
    float theta = atan(q.y, q.x);
    float sine = sin(theta);
    float cosine = cos(theta);

    vec2 onPlane = vec2(q.x, q.y / lean);
    float planeRadius = length(onPlane);
    float planeAngle = atan(onPlane.y, onPlane.x);
    vec3 diskColor = diskTint(planeRadius);
    // why: the gas is the costly part (64 hashes a read), so it is read only
    // where some light uses it, and the plane's once for the disk and feet;
    // -1 marks it unread. The gas is positive, so max over rows commutes.
    float planeGas = -1.0;
    vec2 lit = diskRows(q, lean);
    if (lit.x + lit.y > 0.0) {
      planeGas = diskGas(planeRadius, planeAngle);
      lit *= planeGas;
    }

    float outside = smoothstep(0.99, 1.01, r);
    float upper = step(0.0, q.y);

    // The vertical disk's top: bands of the horizontal disk's own colour and
    // gas (bandAt), white by the horizon and primary at its outer edge, each
    // running down the sides into the far half where that ring lies.
    float top = 0.0;
    float rho = DISK_IN;
    float x = abs(q.x);
    float y2 = q.y * q.y;
    float y6 = y2 * y2 * y2;
    // why: the bands fade out below t = -0.12 and past t = 1.1; outside
    // that span (most of the quad) the top is dark and is not searched.
    if (upper * outside > 0.0
      && bandHeight6(-0.12, x, lean) < y6
      && bandHeight6(1.1, x, lean) > y6) {
      float band = bandAt(x, y6, lean);
      rho = DISK_IN + (DISK_OUT - DISK_IN) * clamp(band, 0.0, 1.0);
      vec2 heights = bandHeights6(band, x, lean);
      // why: where the band lies on the far half, it shows the far
      // half's own gas and light; where it arcs, the gas round the arc.
      float lying = smoothstep(0.35, 0.65, heights.y / max(heights.x + heights.y, 1e-6));
      float arcGas = lying < 1.0 ? diskGas(rho, theta) : 0.0;
      float flatGas = lying > 0.0 ? diskGas(rho, planeAngle) : 0.0;
      float topGas = mix(arcGas, flatGas, lying);
      float topBand = smoothstep(-0.12, 0.04, band) * (1.0 - smoothstep(0.73, 1.1, band));
      // why: round the arc, the arc's own fall-off at half the disk's light,
      // so it keeps its filaments instead of burning white; on the far half,
      // the disk's own heat and whole light, to match the disk it joins.
      float arcRadius = ARC_IN + (ARC_TOP - ARC_IN) * clamp(band, 0.0, 1.0);
      float heat = mix(
        0.5 * pow(ARC_IN / arcLook(arcRadius), 2.2),
        0.85 * pow(DISK_IN / look(rho), 1.1),
        lying
      );
      top = topBand * heat * topGas
        * beam(mix(cosine, onPlane.x / max(planeRadius, 1e-4), lying));
    }

    // The vertical disk's bottom: ARC_OUT below, its feet widened along the
    // horizontal disk's plane to FOOT_OUT and taking its gas.
    // hazard: the fade-out must start past ARC_IN, or the band vanishes.
    float foot = 1.0 - smoothstep(0.1, 0.33, abs(sine));
    // why: below, only dark blue (task black-hole-disk-colors, 5); towards
    // the sides it starts from the disk's colour, so the middle row has no seam.
    float below = smoothstep(0.1, 0.34, -sine);
    float bottom = 0.0;
    if (upper < 1.0 && outside > 0.0) {
      float rise = smoothstep(-0.2, 0.6, sine);
      float outer = mix(mix(ARC_OUT, ARC_TOP, rise), FOOT_OUT, foot);
      float arcBand = smoothstep(ARC_IN - 0.02, ARC_IN + 0.04, r)
        * (1.0 - smoothstep(outer - 0.1, outer + 0.04, r));
      if (arcBand > 0.0) {
        float roundGas = foot < 1.0 ? diskGas(r, theta) : 0.0;
        if (foot > 0.0 && planeGas < 0.0) planeGas = diskGas(planeRadius, planeAngle);
        float arcGas = mix(roundGas, foot > 0.0 ? planeGas : 0.0, foot);
        // why: dim below the horizon, 35%, whole at the feet.
        float weight = max(mix(0.35, 1.0, smoothstep(-0.3, 0.4, sine)), foot);
        float near = arcLook(r);
        float fall = mix(pow(ARC_IN / near, 2.2), pow(ARC_IN / near, 0.8), foot);
        bottom = arcBand * weight * fall * arcGas * beam(cosine)
          * mix(0.5, 0.35, foot);
      }
    }
    vec3 bottomColor = mix(diskColor, uPrimary, below);

    // why: under the horizon the photon ring is the one thin white line;
    // 0.020 there, from 0.028 above (task black-hole-disk-colors, 6).
    float ringWidth = mix(0.028, 0.020, below);
    float ring = exp(-pow((r - RING) / ringWidth, 2.0)) * 1.4;

    // why: where the top's bands lie on the far half, the brighter of the
    // two shows; summed, the join burned into a white blot.
    float farLight = lit.y * outside;
    vec3 far = upper * outside * top > farLight
      ? diskTint(rho) * top * outside
      : diskColor * farLight;
    vec3 light = uPrimary * glow + uMist * ring
      + (1.0 - upper) * bottomColor * bottom * outside
      // why: where the near and far halves meet, at the disk's middle row,
      // the brighter one shows; summed, they drew a straight white line.
      + (lit.x > farLight && lit.x > upper * outside * top ? diskColor * lit.x : far);
    float alpha = clamp(max(max(light.r, light.g), light.b), 0.0, 1.0);
    vec3 shown = min(light / max(alpha, 1e-4), vec3(1.0));
    // Inside the horizon: ink, with the near half of the disk over it.
    vec3 inside = min(uInk + diskColor * lit.x, vec3(1.0));
    gl_FragColor = vec4(mix(inside, shown, outside), mix(1.0, alpha, outside));
    #include <colorspace_fragment>
  }
`

type BlackHoleProps = {
  /** Where the hero's field puts the black hole, in hero px. */
  hole: RefObject<HoleBody>
  /** The layer of whatever lies behind it, which it bends and lights. */
  behind: number
}

/**
 * The black hole that wanders over the hero's grid: a camera-facing quad
 * with the horizon, photon ring and a tilted, slowly turning disk, and a point
 * light of the disk's colour that lights the glass logo, over what lies
 * `behind` it, bent by its gravity (bent-light.tsx). Its place and size
 * come from the hero's field (use-hero-field.ts), which also sinks the grid
 * into its well; the disk turns unless reduced motion is on.
 */
export const BlackHole = ({ hole, behind }: BlackHoleProps) => {
  // why: <Canvas> renders this only in the browser, after mount, which is
  // when the theme's CSS variables are available.
  const colors = useMemo(
    () => ({
      ink: new Color(readColorToken('ink')),
      mist: new Color(readColorToken('mist')),
      primary: new Color(readColorToken('primary'))
    }),
    []
  )
  const light = useMemo(
    () => colors.mist.clone().lerp(colors.primary, LIGHT_BLEND),
    [colors]
  )
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uInk: { value: colors.ink },
      uMist: { value: colors.mist },
      uPrimary: { value: colors.primary },
      uInnerTurn: { value: DISK.innerTurn },
      uOuterTurn: { value: DISK.outerTurn },
      // why: the disk holds one pose, DISK_POSE's tilt and slant; a
      // swinging tilt read as the disk growing and shrinking.
      uTilt: { value: diskPose(0, true).tilt },
      uRoll: { value: DISK_POSE.slant }
    }),
    [colors]
  )
  const group = useRef<Group>(null)
  const material = useRef<ShaderMaterial>(null)
  const ray = useMemo(() => new Vector3(), [])
  const forward = useMemo(() => new Vector3(), [])
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  // why: read once and on change, not per frame.
  const still = useRef(true)
  useEffect(() => {
    still.current = prefersReducedMotion()
    return onReducedMotionChange(() => {
      still.current = prefersReducedMotion()
    })
  }, [])

  useFrame((_, delta) => {
    const body = group.current
    if (!body) return
    const { x, y, horizon } = hole.current
    body.visible = horizon > 0
    if (!horizon) return
    // invariant: the quad sits DEPTH ahead of the camera along the ray
    // through (x, y), facing it, so it is drawn exactly where the grid's
    // well is and at the same size anywhere on screen.
    ray
      .set((x / size.width) * 2 - 1, 1 - (y / size.height) * 2, 0.5)
      .unproject(camera)
      .sub(camera.position)
      .normalize()
    camera.getWorldDirection(forward)
    body.position
      .copy(camera.position)
      .addScaledVector(ray, DEPTH / ray.dot(forward))
    body.quaternion.copy(camera.quaternion)
    const fov =
      camera instanceof PerspectiveCamera ? camera.fov : HERO_CAMERA.fov
    const focal = size.height / (2 * Math.tan((fov * Math.PI) / 360))
    body.scale.setScalar((horizon * DEPTH) / focal)
    const shader = material.current?.uniforms
    const time = shader?.uTime
    if (!shader || !time) return
    if (!still.current) time.value += delta
  })

  return (
    <group ref={group} visible={false}>
      <mesh scale={2 * SPAN}>
        <planeGeometry />
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        // why: a light only reaches the layers it is on; the disk lights
        // what lies behind as well (task black-hole-behind, 5).
        ref={lamp => lamp?.layers.enable(behind)}
        color={light}
        intensity={INTENSITY}
      />
      <BentLight hole={hole} behind={behind} />
    </group>
  )
}
