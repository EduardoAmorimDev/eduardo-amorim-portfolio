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
  type ShaderMaterial
} from 'three'
import { bendAt, deflectionTable } from './deflection'
import type { HoleBody } from './grid-motion'

// why: values of the deflection over s = 1/θ, 0 to 1; linear between them,
// the bend at the mirrored images (θ ≥ 1.1) is off by under 10⁻⁴ rad.
const TABLE_SIZE = 512
// why: the layer behind is drawn this many times the hero's width and
// height, centred on it, so a ray bent past an edge still finds what lies
// there (task black-hole-behind, 6–7); one texel per CSS px.
const OVERSCAN = 2

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
    vec2 offset = here - uCentre;
    float theta = length(offset) / uHorizon;
    if (theta <= 1.0) discard;
    float beta = theta - uBend * bentBy(theta);
    vec2 from = (uCentre + offset * (beta / theta)) / uSize;
    vec2 layer = 0.5 + (vec2(from.x, 1.0 - from.y) - 0.5) / ${OVERSCAN.toFixed(1)};
    if (any(lessThan(layer, vec2(0.0))) || any(greaterThan(layer, vec2(1.0))))
      discard;
    gl_FragColor = texture2D(uBehind, layer);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

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
  const target = useFBO(size.width * OVERSCAN, size.height * OVERSCAN, {
    samples: 4
  })
  const uniforms = useMemo(
    () => ({
      uBehind: { value: target.texture },
      uDeflection: { value: deflection },
      uSize: { value: new Vector2() },
      uCentre: { value: new Vector2() },
      uHorizon: { value: 1 },
      uBend: { value: 0 }
    }),
    [deflection, target]
  )
  const material = useRef<ShaderMaterial>(null)
  const wide = useRef<PerspectiveCamera>(null)

  useEffect(() => () => deflection.dispose(), [deflection])

  useFrame(({ gl, scene, camera }) => {
    const shader = material.current?.uniforms
    const { x, y, horizon, lift } = hole.current
    if (!shader || !horizon || !(camera instanceof PerspectiveCamera)) return
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
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        premultipliedAlpha
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
