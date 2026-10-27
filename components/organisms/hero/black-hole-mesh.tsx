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
import { DISK, HOLE, diskPose } from './black-hole'
import { HERO_CAMERA } from './glass-motion'
import type { HoleBody } from './grid-motion'

// why: how far from the camera the black hole floats, in world units; behind
// the logo (≈7 away), so the glass sits in front of it.
const DEPTH = 8.5
// why: the quad's half size in horizon radii: the disk's outer edge plus
// room for its glow to fade out before the quad ends.
const SPAN = 4.6
// why: candela, fading with the square of the distance; enough to light the
// logo's facing side a few units away (criterion 31).
const INTENSITY = 160
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
// horizon, its far half past it and bent over the top and, faintly, under
// it, so the hole reads as a sphere; mist, primary and ink only (gravity 13).
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
  const float ARC_IN = 1.08;
  const float RING = 1.04;
  // The disk's own thickness, in horizon radii, and how much brighter its
  // approaching (left) side is than its receding one: 1 ± BEAM.
  const float THICK = 0.1;
  const float BEAM = 0.45;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  // Streaks of gas at a radius and angle of the disk, turning once every
  // uInnerTurn s at the inner edge and uOuterTurn s at the outer one; read on
  // a circle, so a whole turn brings the same pattern back.
  float gas(float radius, float angle) {
    float share = clamp((radius - DISK_IN) / (DISK_OUT - DISK_IN), 0.0, 1.0);
    float turn = mix(uInnerTurn, uOuterTurn, share);
    float phase = angle - TAU * uTime / turn;
    vec2 circle = vec2(cos(phase), sin(phase)) * (1.6 + radius * 1.1);
    float streak = noise(circle * 2.3 + radius * 3.1) * 0.6
      + noise(circle * 5.9) * 0.4;
    return 0.15 + 1.25 * pow(streak, 1.8);
  }

  // Doppler beaming: the side turning towards the viewer (cos < 0, the
  // left) is brighter than the side turning away.
  float beam(float cosine) {
    return 1.0 - BEAM * cosine;
  }

  // The disk's light at q (disk-aligned screen coordinates): x for its near
  // half, in front of the horizon, y for its far half, behind it. A few
  // rows around q give it thickness.
  vec2 disk(vec2 q, float lean) {
    vec2 lit = vec2(0.0);
    for (int k = -2; k <= 2; k++) {
      float y = q.y + float(k) * THICK * 0.5;
      vec2 onDisk = vec2(q.x, y / lean);
      float radius = length(onDisk);
      float band = smoothstep(DISK_IN - 0.05, DISK_IN + 0.2, radius)
        * (1.0 - smoothstep(DISK_OUT - 0.45, DISK_OUT, radius));
      float heat = 0.85 * pow(DISK_IN / max(radius, DISK_IN), 1.1);
      float light = band * heat * gas(radius, atan(onDisk.y, onDisk.x))
        * beam(onDisk.x / max(radius, 1e-4))
        * (1.0 - abs(float(k)) * 0.22);
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
    float theta = atan(q.y, q.x);

    vec2 lit = disk(q, lean);
    float depth = smoothstep(DISK_IN, DISK_OUT - 0.6, length(vec2(q.x, q.y / lean)));
    vec3 diskColor = mix(uMist, uPrimary, depth);

    // The far half, bent over the top of the horizon from side to side.
    float arcBand = smoothstep(ARC_IN - 0.02, ARC_IN + 0.08, r)
      * (1.0 - smoothstep(ARC_OUT - 0.35, ARC_OUT, r));
    float arcRadius = mix(DISK_IN, DISK_OUT * 0.7,
      clamp((r - ARC_IN) / (ARC_OUT - ARC_IN), 0.0, 1.0));
    float over = arcBand * smoothstep(-0.05, 0.3, sin(theta))
      * pow(ARC_IN / r, 2.2) * gas(arcRadius, theta) * beam(cos(theta)) * 1.15;
    // Under the bottom: a thin, faint image just past the near half's edge.
    float edge = DISK_OUT * lean;
    float underBand = smoothstep(edge + 0.04, edge + 0.1, r)
      * (1.0 - smoothstep(edge + 0.14, edge + 0.22, r));
    float under = underBand * smoothstep(0.2, 0.75, -sin(theta))
      * gas(DISK_IN + 0.4, theta) * beam(cos(theta)) * 0.42;
    vec3 arcColor = mix(uMist, uPrimary, smoothstep(ARC_IN, ARC_OUT, r));

    float ring = exp(-pow((r - RING) / 0.028, 2.0)) * 1.4;
    float glow = 0.22 * exp(-max(r - 1.0, 0.0) * 1.3)
      * (1.0 - smoothstep(SPAN * 0.7, SPAN, r));

    float outside = smoothstep(0.99, 1.01, r);
    vec3 light = uPrimary * glow + uMist * ring
      + (arcColor * (over + under) + diskColor * lit.y) * outside
      + diskColor * lit.x;
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
}

/**
 * The black hole that wanders over the hero's grid: a camera-facing quad
 * with the horizon, photon ring and a tilted, rocking disk, and a point
 * light of the disk's colour that lights the glass logo. Its place and size come from
 * the hero's field (use-hero-field.ts), which also bends the grid around it;
 * the disk turns unless reduced motion is on.
 */
export const BlackHole = ({ hole }: BlackHoleProps) => {
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
      uTilt: { value: diskPose(0, true).tilt },
      uRoll: { value: 0 }
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
    const pose = diskPose(time.value, still.current)
    const tilt = shader.uTilt
    const roll = shader.uRoll
    if (tilt) tilt.value = pose.tilt
    if (roll) roll.value = pose.roll
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
      <pointLight color={light} intensity={INTENSITY} />
    </group>
  )
}
