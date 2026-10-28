'use client'
import { useFBO } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  DataTexture,
  FloatType,
  MathUtils,
  NearestFilter,
  PerspectiveCamera,
  RedFormat,
  Vector2,
  type Mesh,
  type Object3D,
  type ShaderMaterial
} from 'three'
import { FIELD, FLOW, bendAt, deflectionTable } from './deflection'
import type { HoleBody } from './grid-motion'

// why: values of the deflection over s = 1/θ, 0 to 1; linear between them,
// the bend at the mirrored images (θ ≥ 1.1) is off by under 10⁻⁴ rad.
const TABLE_SIZE = 512
// why: the layer behind is drawn this many times the hero's width and
// height, centred on it, so a ray bent past an edge still finds what lies
// there (task black-hole-behind, 6–7); one texel per CSS px.
export const OVERSCAN = 2

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`

// why: a thin lens on the whole screen (task black-hole-lensing, 3–6): the
// pixel θ horizon radii from the centre shows what lies β = θ − K·α(θ)
// away, on the far side once β < 0, which mirrors it; inside the horizon,
// and past the layer behind (OVERSCAN heroes wide), nothing is shown.
const fragmentShader = /* glsl */ `
  uniform sampler2D uBehind;
  uniform sampler2D uDeflection;
  uniform vec2 uSize;
  uniform vec2 uCentre;
  uniform float uHorizon;
  uniform float uBend;
  uniform float uFlow;
  varying vec2 vUv;

  const int TABLE = ${TABLE_SIZE};

  float bentBy(float theta) {
    float at = float(TABLE - 1) / theta;
    int index = min(int(at), TABLE - 2);
    float low = texelFetch(uDeflection, ivec2(index, 0), 0).r;
    float high = texelFetch(uDeflection, ivec2(index + 1, 0), 0).r;
    return mix(low, high, at - float(index));
  }

  void main() {
    vec2 here = vec2(vUv.x, 1.0 - vUv.y) * uSize;
    vec2 q = (here - uCentre) / uHorizon;
    float theta = length(q);
    if (theta <= 1.0) discard;
    // hazard: pow() of a negative base is undefined in GLSL (NaN above the
    // centre, black-hole-flow 1); the angle's share comes from a square.
    float sine2 = (q.y * q.y) / (theta * theta);
    // hazard: pow(0, 0) is undefined in GLSL; a radial lens has share 1.
    float share = ${FIELD.exponent > 0 ? `pow(sine2, ${(FIELD.exponent / 2).toFixed(2)})` : '1.0'};
    float beta = share > 1e-6 ? theta - uBend * bentBy(theta / share) : theta;
    // invariant: as behindPoint (deflection.ts): the second push is radial,
    // a²·(x, y)/r², the same with y up or down.
    vec2 lensed = q * (beta / theta)
      + smoothstep(${FLOW.from.toFixed(2)}, ${FLOW.to.toFixed(2)}, theta)
        * uFlow * uFlow * vec2(q.x, q.y) / (theta * theta);
    vec2 from = (uCentre + lensed * uHorizon) / uSize;
    vec2 layer = 0.5 + (vec2(from.x, 1.0 - from.y) - 0.5) / ${OVERSCAN.toFixed(1)};
    if (any(lessThan(layer, vec2(0.0))) || any(greaterThan(layer, vec2(1.0))))
      discard;
    gl_FragColor = texture2D(uBehind, layer);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** Whether anything that draws lies on `layer` under `root`, shown. */
const drawsOn = (root: Object3D, layer: number) => {
  let found = false
  root.traverseVisible(object => {
    if (found || !object.layers.isEnabled(layer)) return
    found =
      'isMesh' in object ||
      'isPoints' in object ||
      'isLine' in object ||
      'isSprite' in object
  })
  return found
}

type BentLightProps = {
  /** Where the hero's field puts the black hole, in hero px. */
  hole: RefObject<HoleBody>
  /** The layer of whatever lies behind the black hole. */
  behind: number
}

/**
 * What lies behind the black hole, seen through it: every frame the
 * `behind` layer, which the camera never sees, is drawn off screen, OVERSCAN
 * heroes wide, and a full-screen pass shows it bent by a Schwarzschild lens
 * centred on the horizon.
 */
export const BentLight = ({ hole, behind }: BentLightProps) => {
  const deflection = useMemo(() => {
    const texture = new DataTexture(
      deflectionTable(TABLE_SIZE),
      TABLE_SIZE,
      1,
      RedFormat,
      FloatType
    )
    // why: float textures filter linearly only with an extension WebGL2
    // does not promise; the shader interpolates the table itself.
    texture.minFilter = NearestFilter
    texture.magFilter = NearestFilter
    texture.needsUpdate = true
    return texture
  }, [])
  const size = useThree(state => state.size)
  // why: no MSAA; it was for the glass icons' thin edges, which left the
  // hero, and was most of the ~46 ms the pass cost (task space, Landing).
  const target = useFBO(size.width * OVERSCAN, size.height * OVERSCAN, {
    samples: 0
  })
  const uniforms = useMemo(
    () => ({
      uBehind: { value: target.texture },
      uDeflection: { value: deflection },
      uSize: { value: new Vector2() },
      uCentre: { value: new Vector2() },
      uHorizon: { value: 1 },
      uBend: { value: 0 },
      uFlow: { value: FLOW.radius }
    }),
    [deflection, target]
  )
  const material = useRef<ShaderMaterial>(null)
  const lens = useRef<Mesh>(null)
  const wide = useRef<PerspectiveCamera>(null)

  useEffect(() => () => deflection.dispose(), [deflection])

  useFrame(({ gl, scene, camera }) => {
    const shader = material.current?.uniforms
    const { x, y, horizon, lift } = hole.current
    if (!shader || !horizon || !(camera instanceof PerspectiveCamera)) return
    // why: with nothing on the layer behind (the hero holds only the black
    // hole for now), the lens would bend an empty picture: its off-screen
    // render and full-screen pass took ~46 ms a frame at 1440×900 on an
    // integrated GPU. Anything put behind turns them back on.
    const shown = drawsOn(scene, behind)
    if (lens.current) lens.current.visible = shown
    if (!shown) return
    // invariant: the same eye as the camera, its view OVERSCAN times as
    // wide and tall, so the hero sits in the middle of the layer drawn.
    wide.current ??= new PerspectiveCamera()
    const eye = wide.current
    eye.copy(camera)
    eye.fov =
      2 *
      MathUtils.radToDeg(
        Math.atan(OVERSCAN * Math.tan(MathUtils.degToRad(camera.fov) / 2))
      )
    eye.updateProjectionMatrix()
    eye.layers.set(behind)
    gl.setRenderTarget(target)
    gl.clear()
    gl.render(scene, eye)
    gl.setRenderTarget(null)
    shader.uSize?.value.set(size.width, size.height)
    shader.uCentre?.value.set(x, y)
    const set = (name: string, value: unknown) => {
      const uniform = shader[name]
      if (uniform) uniform.value = value
    }
    set('uHorizon', horizon)
    set('uBend', bendAt(lift))
  })

  return (
    // invariant: drawn before the horizon, disk and logo (renderOrder 0),
    // which all lie in front of what is behind.
    <mesh ref={lens} frustumCulled={false} renderOrder={-1}>
      <planeGeometry />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        premultipliedAlpha
        // why: what lies behind keeps the brand's colours; ACES would wash
        // primary and mist out, as the black hole, drawn untoned, never is.
        toneMapped={false}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
