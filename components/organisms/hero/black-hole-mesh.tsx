'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import { Color, PerspectiveCamera, Vector3, type Group } from 'three'
import { readColorToken } from '@/lib/color-tokens'
import { BentLight } from './bent-light'
import { HERO_CAMERA } from './glass-motion'
import type { HoleBody } from './grid-motion'

// why: how far from the camera the black hole floats, in world units; behind
// the logo (≈7 away), so the glass sits in front of it.
const DEPTH = 8.5
// why: the quad's half size in horizon radii: room for the glow to fade
// out before the quad ends.
const SPAN = 4.6
// why: candela, fading with the square of the distance; enough to light the
// logo's facing side a few units away (cosmos 31), doubled with the black
// hole (black-hole-scale 1), whose larger glow behind the glass lifts both
// of the logo's sides alike.
const INTENSITY = 320
// why: the light takes the glow's colour: mist warmed towards the brand blue.
const LIGHT_BLEND = 0.4

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// why: one pass on a camera-facing quad, in horizon radii: the shadow in
// ink, the thin photon ring hugging it and a faint glow fading out, with no
// accretion disk; mist, primary and ink only.
const fragmentShader = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uMist;
  uniform vec3 uPrimary;
  varying vec2 vUv;

  const float SPAN = ${SPAN.toFixed(2)};
  const float RING = 1.04;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0 * SPAN;
    float r = length(p);
    float ring = exp(-pow((r - RING) / 0.028, 2.0)) * 1.4;
    float glow = 0.22 * exp(-max(r - 1.0, 0.0) * 1.3)
      * (1.0 - smoothstep(SPAN * 0.7, SPAN, r));
    float outside = smoothstep(0.99, 1.01, r);
    vec3 light = uPrimary * glow + uMist * ring;
    float alpha = clamp(max(max(light.r, light.g), light.b), 0.0, 1.0);
    vec3 shown = min(light / max(alpha, 1e-4), vec3(1.0));
    gl_FragColor = vec4(mix(uInk, shown, outside), mix(1.0, alpha, outside));
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
 * The black hole that wanders over the hero: a camera-facing quad with the
 * shadow, the photon ring and a faint glow, and a point light of the glow's
 * colour that lights the glass icons, over what lies `behind` it, bent by
 * its gravity (bent-light.tsx). Its place and size come from the hero's
 * field (use-hero-field.ts).
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
      uInk: { value: colors.ink },
      uMist: { value: colors.mist },
      uPrimary: { value: colors.primary }
    }),
    [colors]
  )
  const group = useRef<Group>(null)
  const ray = useMemo(() => new Vector3(), [])
  const forward = useMemo(() => new Vector3(), [])
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  useFrame(() => {
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
  })

  return (
    <group ref={group} visible={false}>
      <mesh scale={2 * SPAN}>
        <planeGeometry />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        // why: a light only reaches the layers it is on; it lights what lies
        // behind as well (task black-hole-behind, 5).
        ref={lamp => lamp?.layers.enable(behind)}
        color={light}
        intensity={INTENSITY}
      />
      <BentLight hole={hole} behind={behind} />
    </group>
  )
}
