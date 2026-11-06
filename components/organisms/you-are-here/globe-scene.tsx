'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  BackSide,
  Color,
  MathUtils,
  Quaternion,
  Vector3,
  type Group,
  type Mesh
} from 'three'
import { readColorToken, readThemeColor } from '@/lib/color-tokens'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import type { VisitorPlace } from '@/lib/visitor-place'
import { globeLayout } from './globe-layout'
import { GlobeVapor } from './globe-vapor'
import { landDots, loadLandMask, toSphere } from './land-dots'

// why: enough lattice points that the continents read as dotted shapes at
// ~700 px across; about a third of them fall on land.
const LATTICE = 52000
// why: the globe idles turning east until it knows where to go, then turns
// to put the visitor's place just above its middle, facing the viewer.
const IDLE_SPIN = 0.06
const ARRIVAL_SMOOTHING = 1.6
const PLACE_ABOVE_MIDDLE = 0.22
// why: one pulse of the pin's ring every 2.4 s, growing to 3.2× its size.
const PULSE = { seconds: 2.4, growth: 2.2 }
// why: the canvas never counts more than this share as risen above the
// section, so an odd measurement cannot squeeze the globe to nothing.
const MAX_LIFT = 0.6

const DOT_VERTEX = /* glsl */ `
uniform float uSize;
varying float vFacing;
void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  // invariant: on the unit sphere the position is its own normal.
  vFacing = normalize(normalMatrix * position).z;
  gl_PointSize = uSize / -view.z;
  gl_Position = projectionMatrix * view;
}
`

const DOT_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uRim;
uniform float uGlow;
varying float vFacing;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float round = smoothstep(0.5, 0.2, length(c));
  // why: a translucent Earth: the far side's land shows through, faint and
  // violet; the near side glows, brightest facing the viewer.
  float alpha = round * mix(0.18, 0.7, smoothstep(-0.15, 0.45, vFacing));
  vec3 col = mix(uRim, uColor, smoothstep(0.0, 0.7, vFacing));
  // why: without the bloom (lite) the land itself burns whiter and denser,
  // as the bloom's spill made it look.
  col = mix(col, vec3(1.0), uGlow * 0.45);
  gl_FragColor = vec4(col, min(alpha * (1.0 + uGlow * 0.9), 1.0));
}
`

const HALO_VERTEX = /* glsl */ `
varying float vRim;
void main() {
  vec3 normal = normalize(normalMatrix * normal);
  vRim = 1.0 - abs(normal.z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
varying float vRim;
void main() {
  // why: a thin atmosphere hugging the limb; the bloom turns its light
  // into the glow around the Earth.
  float rim = smoothstep(0.6, 1.0, vRim);
  gl_FragColor = vec4(uColor, rim * rim * (1.0 - smoothstep(0.94, 1.0, vRim)) * 0.8 * (1.0 + uGlow));
}
`

// why: the bloom's light painted once, for lite: a soft glow over the disc
// and around the limb, in globe radii (the quad spans GLOW_SPAN of them).
const GLOW_SPAN = 1.8
const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const GLOW_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0 * ${GLOW_SPAN.toFixed(2)};
  float limb = exp(-pow((r - 1.0) * 4.0, 2.0));
  float spill = exp(-max(r - 1.0, 0.0) * 3.5) * smoothstep(${GLOW_SPAN.toFixed(2)}, 1.2, r);
  float disc = 1.0 - smoothstep(0.85, 1.0, r);
  float light = (0.55 * limb + 0.4 * spill + 0.15 * disc) * uStrength;
  // invariant: blended additively, alpha weighs the colour, as the dots do.
  gl_FragColor = vec4(uColor, min(light, 1.0));
}
`

type GlobeSceneProps = {
  /** Where to put the pin; null while unknown or when it cannot be found. */
  place: VisitorPlace | null
  /** The section's height in CSS px; the canvas rises above it. */
  stageHeight: number
  /** Paints the bloom's light itself, for a canvas drawn without it. */
  glow?: boolean
}

/**
 * The dotted Earth, its halo, the pin on the visitor's place and the vapour
 * around it. The globe turns on its own; only the vapour answers the cursor.
 */
export const GlobeScene = ({
  place,
  stageHeight,
  glow = false
}: GlobeSceneProps) => {
  const globe = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const [dots, setDots] = useState<Float32Array | null>(null)
  const dpr = useThree(state => state.viewport.dpr)
  const canvasHeight = useThree(state => state.size.height)
  const viewport = useThree(state => state.viewport)
  const lift =
    stageHeight > 0 && canvasHeight > 0
      ? MathUtils.clamp(1 - stageHeight / canvasHeight, 0, MAX_LIFT)
      : 0
  const layout = globeLayout(viewport, lift)
  const still = useRef(false)
  // invariant: the globe's turn is its aim alone: the idle spin, then the
  // way to the pin.
  const aim = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const sync = () => {
      still.current = prefersReducedMotion()
    }
    sync()
    return onReducedMotionChange(sync)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadLandMask(controller.signal)
      .then(mask => setDots(landDots(mask, LATTICE)))
      // why: without the mask the globe is its halo and core alone; the
      // section still reads, so the failure needs no message.
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  const colors = useMemo(
    () => ({
      core: new Color(readThemeColor('background')).lerp(
        new Color(readColorToken('steel')),
        0.12
      ),
      // why: the Earth glows light blue: its land a blue-white, its limb
      // and far side the sky colour, which the bloom spreads as light.
      dot: new Color(readColorToken('mist')).lerp(
        new Color(readColorToken('sky')),
        0.55
      ),
      rim: new Color(readColorToken('sky')),
      pin: new Color(readColorToken('mist')),
      vapor: new Color(readColorToken('sky')).lerp(
        new Color(readColorToken('mist')),
        0.4
      )
    }),
    []
  )
  // invariant: points shrink with distance; 3.4 is the camera's, so a dot
  // in the globe's middle is 2.6 CSS px.
  const dotUniforms = useMemo(
    () => ({
      uSize: { value: 2.6 * dpr * 3.4 },
      uColor: { value: colors.dot },
      uRim: { value: colors.rim },
      uGlow: { value: Number(glow) }
    }),
    [colors, dpr, glow]
  )
  const haloUniforms = useMemo(
    () => ({ uColor: { value: colors.rim }, uGlow: { value: Number(glow) } }),
    [colors, glow]
  )
  const glowUniforms = useMemo(
    () => ({
      // why: the bloom's spill reads whiter than the limb it comes from.
      uColor: { value: colors.rim.clone().lerp(new Color('#ffffff'), 0.4) },
      uStrength: { value: 1 }
    }),
    [colors]
  )

  const pin = useMemo(() => {
    if (!place) return null
    const position = new Vector3(
      ...toSphere(place.latitude, place.longitude, 1.005)
    )
    // why: the ring lies flat on the ground, facing out of the sphere.
    const facing = new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      position.clone().normalize()
    )
    return {
      position,
      facing,
      target: {
        x: MathUtils.degToRad(place.latitude) - PLACE_ABOVE_MIDDLE,
        y: -MathUtils.degToRad(place.longitude)
      }
    }
  }, [place])

  useFrame(({ clock }, delta) => {
    const body = globe.current
    if (!body) return
    const target = aim.current
    if (pin) {
      const step = still.current ? 1 : 1 - Math.exp(-ARRIVAL_SMOOTHING * delta)
      target.x += (pin.target.x - target.x) * step
      // invariant: turn the short way round, whatever the idle spin left.
      const turn =
        MathUtils.euclideanModulo(
          pin.target.y - target.y + Math.PI,
          Math.PI * 2
        ) - Math.PI
      target.y += turn * step
    } else if (!still.current) {
      target.y += IDLE_SPIN * delta
    }
    body.rotation.x = target.x
    body.rotation.y = target.y

    if (ring.current) {
      const t = still.current ? 0.35 : (clock.elapsedTime / PULSE.seconds) % 1
      ring.current.scale.setScalar(1 + t * PULSE.growth)
      const material = ring.current.material
      if (!Array.isArray(material)) material.opacity = (1 - t) * 0.9
    }
  })

  return (
    <group position={[layout.x, layout.y, 0]} scale={layout.scale}>
      {glow && (
        <mesh renderOrder={-2} scale={GLOW_SPAN * 2}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            uniforms={glowUniforms}
            vertexShader={GLOW_VERTEX}
            fragmentShader={GLOW_FRAGMENT}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}
      <mesh scale={1.04}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          uniforms={haloUniforms}
          vertexShader={HALO_VERTEX}
          fragmentShader={HALO_FRAGMENT}
          side={BackSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <GlobeVapor still={still} color={colors.vapor} />
      <group ref={globe}>
        {/* why: a tinted, see-through body: it shades the globe without
            hiding the far side's land. */}
        <mesh renderOrder={-1}>
          <sphereGeometry args={[0.99, 64, 64]} />
          <meshBasicMaterial
            color={colors.core}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
        {dots && (
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[dots, 3]} />
            </bufferGeometry>
            <shaderMaterial
              uniforms={dotUniforms}
              vertexShader={DOT_VERTEX}
              fragmentShader={DOT_FRAGMENT}
              transparent
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </points>
        )}
        {pin && (
          <group>
            <mesh position={pin.position}>
              <sphereGeometry args={[0.018, 16, 16]} />
              <meshBasicMaterial color={colors.pin} toneMapped={false} />
            </mesh>
            <mesh ref={ring} position={pin.position} quaternion={pin.facing}>
              <ringGeometry args={[0.03, 0.038, 48]} />
              <meshBasicMaterial
                color={colors.rim}
                transparent
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        )}
      </group>
    </group>
  )
}
