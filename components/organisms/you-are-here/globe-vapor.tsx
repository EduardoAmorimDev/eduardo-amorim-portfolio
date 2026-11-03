'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  type Color,
  type Group,
  type LineSegments,
  type Points
} from 'three'

// why: a shell of drifting nodes around the globe, linked when close, like
// vapour or a network around the Earth; enough nodes for a web, few enough
// that linking every pair each frame (~29k checks) stays well under 1 ms.
const NODES = 240
const SHELL = { inner: 1.06, outer: 1.5 }
const LINK = 0.4
const MAX_LINKS = 1400
// why: the cursor pushes the vapour aside like air (radius and push in globe
// radii); nodes spring back to their drift once it has passed.
const PUSH = { radius: 0.42, strength: 0.32, spring: 3.2 }

/** Where the pointer is over the canvas, -1..1, and whether it is there. */
export type PointerInCanvas = { x: number; y: number; inside: boolean }

// why: a fixed hash per index, so the vapour looks the same on every visit.
const hash = (index: number, salt: number) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453
  return value - Math.floor(value)
}

const createWeb = () => ({
  nodes: Array.from({ length: NODES }, (_, index) => ({
    theta: hash(index, 1) * Math.PI * 2,
    // invariant: acos of a uniform -1..1 spreads nodes evenly over the
    // sphere instead of crowding the poles.
    phi: Math.acos(2 * hash(index, 2) - 1),
    radius: SHELL.inner + (SHELL.outer - SHELL.inner) * hash(index, 3) ** 0.7,
    drift: 0.03 + 0.06 * hash(index, 4),
    bob: 0.6 + hash(index, 5),
    phase: hash(index, 6) * Math.PI * 2,
    push: new Vector3()
  })),
  positions: new BufferAttribute(new Float32Array(NODES * 3), 3),
  sizes: new BufferAttribute(
    Float32Array.from({ length: NODES }, (_, index) =>
      hash(index, 7) > 0.9 ? 5 : 2 + 2 * hash(index, 8)
    ),
    1
  ),
  linePositions: new BufferAttribute(new Float32Array(MAX_LINKS * 6), 3),
  lineColors: new BufferAttribute(new Float32Array(MAX_LINKS * 6), 3),
  raycaster: new Raycaster(),
  plane: new Plane(new Vector3(0, 0, 1), 0),
  ndc: new Vector2(),
  hit: new Vector3(),
  cursor: new Vector3(),
  home: new Vector3(),
  away: new Vector3()
})

type GlobeVaporProps = {
  pointer: RefObject<PointerInCanvas>
  still: RefObject<boolean>
  color: Color
}

/** The vapour web around the globe, parted by the cursor. */
export const GlobeVapor = ({ pointer, still, color }: GlobeVaporProps) => {
  const group = useRef<Group>(null)
  const dots = useRef<Points>(null)
  const lines = useRef<LineSegments>(null)
  // why: everything the frame loop rewrites lives in a ref, React's place
  // for mutable values, created on the first frame.
  const web = useRef<ReturnType<typeof createWeb>>(null)
  const dpr = useThree(state => state.viewport.dpr)
  const uniforms = useMemo(
    () => ({ uColor: { value: color }, uDpr: { value: dpr } }),
    [color, dpr]
  )

  useFrame(({ clock, camera }, delta) => {
    const shell = group.current
    const nodePoints = dots.current
    const links = lines.current
    if (!shell || !nodePoints || !links) return
    if (!web.current) {
      web.current = createWeb()
      nodePoints.geometry.setAttribute('position', web.current.positions)
      nodePoints.geometry.setAttribute('size', web.current.sizes)
      links.geometry.setAttribute('position', web.current.linePositions)
      links.geometry.setAttribute('color', web.current.lineColors)
    }
    const { nodes, raycaster, plane, ndc, hit, cursor, home, away } =
      web.current
    const positions = web.current.positions.array
    const t = still.current ? 0 : clock.elapsedTime

    // why: the cursor, cast onto the globe's front plane, in the web's own
    // space, where the push is measured.
    const there = pointer.current
    let pushing = there.inside && !still.current
    if (pushing) {
      ndc.set(there.x, -there.y)
      raycaster.setFromCamera(ndc, camera)
      shell.updateWorldMatrix(true, false)
      plane.constant = -shell.getWorldPosition(away).z
      pushing = raycaster.ray.intersectPlane(plane, hit) !== null
      if (pushing) cursor.copy(shell.worldToLocal(hit))
    }

    const spring = 1 - Math.exp(-PUSH.spring * delta)
    nodes.forEach((node, index) => {
      const theta = node.theta + t * node.drift
      const phi = node.phi + 0.06 * Math.sin(t * 0.3 * node.bob + node.phase)
      home.set(
        node.radius * Math.sin(phi) * Math.sin(theta),
        node.radius * Math.cos(phi),
        node.radius * Math.sin(phi) * Math.cos(theta)
      )
      away.set(home.x - cursor.x, home.y - cursor.y, 0)
      const reach = away.length()
      const force = pushing
        ? PUSH.strength * Math.exp(-(reach * reach) / PUSH.radius ** 2)
        : 0
      if (reach > 1e-4) away.multiplyScalar(force / reach)
      else away.set(0, 0, 0)
      // why: the front of the web parts most; the back, behind the globe,
      // barely stirs.
      away.multiplyScalar(home.z > 0 ? 1 : 0.3)
      node.push.lerp(away, spring)
      positions[index * 3] = home.x + node.push.x
      positions[index * 3 + 1] = home.y + node.push.y
      positions[index * 3 + 2] = home.z + node.push.z
    })
    web.current.positions.needsUpdate = true

    const linePositions = web.current.linePositions.array
    const lineColors = web.current.lineColors.array
    let count = 0
    for (let a = 0; a < NODES && count < MAX_LINKS; a++) {
      const ax = positions[a * 3] ?? 0
      const ay = positions[a * 3 + 1] ?? 0
      const az = positions[a * 3 + 2] ?? 0
      for (let b = a + 1; b < NODES && count < MAX_LINKS; b++) {
        const bx = positions[b * 3] ?? 0
        const by = positions[b * 3 + 1] ?? 0
        const bz = positions[b * 3 + 2] ?? 0
        const gap = Math.hypot(bx - ax, by - ay, bz - az)
        if (gap > LINK) continue
        // why: additive light, so a dimmer colour is a fainter line: links
        // fade with length and towards the back of the shell.
        const fade =
          (1 - gap / LINK) ** 2 * (0.35 + 0.65 * ((az + bz) / 3 + 0.5))
        const at = count * 6
        linePositions.set([ax, ay, az, bx, by, bz], at)
        lineColors.set(
          [
            color.r * fade,
            color.g * fade,
            color.b * fade,
            color.r * fade,
            color.g * fade,
            color.b * fade
          ],
          at
        )
        count++
      }
    }
    links.geometry.setDrawRange(0, count * 2)
    web.current.linePositions.needsUpdate = true
    web.current.lineColors.needsUpdate = true
  })

  return (
    <group ref={group}>
      <lineSegments ref={lines} frustumCulled={false}>
        <bufferGeometry />
        <lineBasicMaterial
          vertexColors
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          opacity={0.9}
        />
      </lineSegments>
      <points ref={dots} frustumCulled={false}>
        <bufferGeometry />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={NODE_VERTEX}
          fragmentShader={NODE_FRAGMENT}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  )
}

const NODE_VERTEX = /* glsl */ `
attribute float size;
uniform float uDpr;
varying float vDepth;
void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vDepth = position.z;
  // invariant: 3.4 is the camera's distance, so size is CSS px mid-globe.
  gl_PointSize = size * uDpr * 3.4 / -view.z;
  gl_Position = projectionMatrix * view;
}
`

const NODE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vDepth;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float glow = smoothstep(0.5, 0.0, d);
  // why: nodes behind the globe glow fainter, giving the shell depth.
  float back = 0.35 + 0.65 * smoothstep(-1.2, 0.8, vDepth);
  gl_FragColor = vec4(uColor * glow * glow * 2.2 * back, 1.0);
}
`
