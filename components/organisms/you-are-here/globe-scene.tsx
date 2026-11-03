'use client'
import { Html } from '@react-three/drei'
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
import { landDots, loadLandMask, toSphere } from './land-dots'

// why: enough lattice points that the continents read as dotted shapes at
// ~700 px across; about a third of them fall on land.
const LATTICE = 36000
// why: the globe idles turning east until it knows where to go, then turns
// to put the visitor's place just above its middle, facing the viewer.
const IDLE_SPIN = 0.06
const ARRIVAL_SMOOTHING = 1.6
const PLACE_ABOVE_MIDDLE = 0.22
// why: dragging turns the globe (rad per CSS px), it coasts on after a
// flick, and a few seconds after the last touch it turns back to the pin;
// the cursor alone tilts it a little towards itself.
const DRAG = { perPx: 0.006, inertia: 3, returnAfter: 3, homing: 1.2 }
const HOVER = { tilt: 0.18, smoothing: 3 }
const MAX_PITCH = 1.3
// why: one pulse of the pin's ring every 2.4 s, growing to 3.2× its size.
const PULSE = { seconds: 2.4, growth: 2.2 }

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
varying float vFacing;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float round = smoothstep(0.5, 0.32, length(c));
  // why: the far side fades out and the limb takes the brand's violet.
  float alpha = round * smoothstep(-0.05, 0.35, vFacing);
  vec3 col = mix(uRim, uColor, smoothstep(0.1, 0.7, vFacing));
  gl_FragColor = vec4(col, alpha);
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
varying float vRim;
void main() {
  // why: a thin, soft atmosphere hugging the limb, not a neon ring.
  float rim = smoothstep(0.55, 1.0, vRim);
  gl_FragColor = vec4(uColor, rim * rim * (1.0 - smoothstep(0.92, 1.0, vRim)) * 0.55);
}
`

type GlobeSceneProps = {
  /** Where to put the pin; null while unknown or when it cannot be found. */
  place: VisitorPlace | null
}

type Viewport = { width: number; height: number }

// why: like the hero's black hole, the Earth sits right of the copy on wide
// screens and above it on tall ones; radius in scene units at the origin.
const layoutFor = ({ width, height }: Viewport) =>
  width > height
    ? { x: width * 0.2, y: 0, scale: Math.min(height * 0.3, width * 0.2) }
    : { x: 0, y: height * 0.2, scale: Math.min(width * 0.4, height * 0.22) }

/** The dotted Earth, its halo, and the pin on the visitor's place. */
export const GlobeScene = ({ place }: GlobeSceneProps) => {
  const globe = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const label = useRef<HTMLDivElement>(null)
  const [dots, setDots] = useState<Float32Array | null>(null)
  const dpr = useThree(state => state.viewport.dpr)
  const layout = layoutFor(useThree(state => state.viewport))
  const still = useRef(false)
  const gl = useThree(state => state.gl)
  // invariant: the globe's turn is its aim (pin or idle spin) plus what the
  // visitor's drag added (offset) plus the cursor's tilt (hover).
  const aim = useRef({ x: 0, y: 0 })
  const offset = useRef({ x: 0, y: 0 })
  const velocity = useRef({ x: 0, y: 0 })
  const hover = useRef({ x: 0, y: 0, smoothX: 0, smoothY: 0 })
  const drag = useRef({ id: -1, x: 0, y: 0, at: 0, touchedAt: -Infinity })

  useEffect(() => {
    const canvas = gl.domElement
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) return
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        at: performance.now(),
        touchedAt: performance.now() / 1000
      }
      velocity.current = { x: 0, y: 0 }
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      const { left, top, width, height } = canvas.getBoundingClientRect()
      hover.current.x = ((event.clientX - left) / width) * 2 - 1
      hover.current.y = ((event.clientY - top) / height) * 2 - 1
      const current = drag.current
      if (event.pointerId !== current.id) return
      const now = performance.now()
      const dx = (event.clientX - current.x) * DRAG.perPx
      const dy = (event.clientY - current.y) * DRAG.perPx
      const seconds = Math.max((now - current.at) / 1000, 1 / 240)
      offset.current.y += dx
      offset.current.x += dy
      velocity.current = { x: dy / seconds, y: dx / seconds }
      drag.current = {
        ...current,
        x: event.clientX,
        y: event.clientY,
        at: now,
        touchedAt: now / 1000
      }
    }
    const up = (event: PointerEvent) => {
      if (event.pointerId !== drag.current.id) return
      drag.current = { ...drag.current, id: -1 }
    }
    const leave = () => {
      hover.current.x = 0
      hover.current.y = 0
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('pointerleave', leave)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('pointerleave', leave)
    }
  }, [gl])
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
      dot: new Color(readColorToken('mist')),
      rim: new Color(readColorToken('primary')).lerp(
        new Color(readColorToken('mist')),
        0.25
      ),
      pin: new Color(readColorToken('mist'))
    }),
    []
  )
  // invariant: points shrink with distance; 3.4 is the camera's, so a dot
  // in the globe's middle is 2.6 CSS px.
  const dotUniforms = useMemo(
    () => ({
      uSize: { value: 2.6 * dpr * 3.4 },
      uColor: { value: colors.dot },
      uRim: { value: colors.rim }
    }),
    [colors, dpr]
  )
  const haloUniforms = useMemo(
    () => ({ uColor: { value: colors.rim } }),
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
      tip: position.clone().multiplyScalar(1.16),
      target: {
        x: MathUtils.degToRad(place.latitude) - PLACE_ABOVE_MIDDLE,
        y: -MathUtils.degToRad(place.longitude)
      }
    }
  }, [place])

  useFrame(({ clock, camera }, delta) => {
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

    const turned = offset.current
    if (drag.current.id === -1) {
      const spin = velocity.current
      if (!still.current) {
        turned.x += spin.x * delta
        turned.y += spin.y * delta
      }
      const coast = still.current ? 0 : Math.exp(-DRAG.inertia * delta)
      spin.x *= coast
      spin.y *= coast
      // invariant: whole turns are invisible, so the offset is kept within
      // half a turn and homing never spins the globe round several times.
      turned.y =
        MathUtils.euclideanModulo(turned.y + Math.PI, Math.PI * 2) - Math.PI
      const idle = performance.now() / 1000 - drag.current.touchedAt
      if (pin && idle > DRAG.returnAfter) {
        const home = still.current ? 0 : Math.exp(-DRAG.homing * delta)
        turned.x *= home
        turned.y *= home
      }
    }
    const tilt = hover.current
    const reach = still.current ? 0 : 1
    tilt.smoothX = MathUtils.damp(
      tilt.smoothX,
      tilt.x * reach,
      HOVER.smoothing,
      delta
    )
    tilt.smoothY = MathUtils.damp(
      tilt.smoothY,
      tilt.y * reach,
      HOVER.smoothing,
      delta
    )
    body.rotation.x = MathUtils.clamp(
      target.x + turned.x + tilt.smoothY * HOVER.tilt,
      -MAX_PITCH,
      MAX_PITCH
    )
    body.rotation.y = target.y + turned.y + tilt.smoothX * HOVER.tilt

    if (ring.current) {
      const t = still.current ? 0.35 : (clock.elapsedTime / PULSE.seconds) % 1
      ring.current.scale.setScalar(1 + t * PULSE.growth)
      const material = ring.current.material
      if (!Array.isArray(material)) material.opacity = (1 - t) * 0.9
    }
    if (label.current && pin) {
      const world = pin.position.clone().applyMatrix4(body.matrixWorld)
      const toCamera = camera.position.clone().sub(world).normalize()
      const out = world.clone().sub(body.getWorldPosition(new Vector3()))
      // why: the label shows only once its place has turned to the front.
      const front = out.normalize().dot(toCamera)
      label.current.style.opacity = String(
        MathUtils.smoothstep(front, 0.55, 0.8)
      )
    }
  })

  return (
    <group position={[layout.x, layout.y, 0]} scale={layout.scale}>
      <mesh scale={1.08}>
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
      <group ref={globe}>
        <mesh>
          <sphereGeometry args={[0.995, 64, 64]} />
          <meshBasicMaterial color={colors.core} />
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
            <Html position={pin.tip} center zIndexRange={[20, 0]}>
              <div
                ref={label}
                className="glass-card text-caption text-mist pointer-events-none rounded-full px-3 py-1 font-semibold tracking-[0.2em] whitespace-nowrap uppercase opacity-0"
              >
                Você está aqui
              </div>
            </Html>
          </group>
        )}
      </group>
    </group>
  )
}
