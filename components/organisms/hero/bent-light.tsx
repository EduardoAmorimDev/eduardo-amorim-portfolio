'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  CanvasTexture,
  DataTexture,
  FloatType,
  NearestFilter,
  RedFormat,
  Vector2,
  type ShaderMaterial
} from 'three'
import { bendAt, deflectionTable } from './deflection'
import type { HoleBody } from './grid-motion'

// why: values of the deflection over s = 1/θ, 0 to 1; linear between them,
// the bend at the mirrored images (θ ≥ 1.1) is off by under 10⁻⁴ rad.
const TABLE_SIZE = 512

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
// and where β leaves the picture, nothing is shown.
const fragmentShader = /* glsl */ `
  uniform sampler2D uBehind;
  uniform sampler2D uDeflection;
  uniform vec2 uSize;
  uniform vec2 uCentre;
  uniform float uHorizon;
  uniform float uBend;
  uniform float uOpacity;
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
    if (any(lessThan(from, vec2(0.0))) || any(greaterThan(from, vec2(1.0))))
      discard;
    vec4 behind = texture2D(uBehind, vec2(from.x, 1.0 - from.y));
    gl_FragColor = behind * uOpacity;
  }
`

/** Shows the canvas `hidden` held and hides `canvas`, on change only. */
const swapHidden = (
  hidden: RefObject<HTMLCanvasElement | null>,
  canvas: HTMLCanvasElement | null
) => {
  if (hidden.current === canvas) return
  if (hidden.current) hidden.current.style.visibility = ''
  if (canvas) canvas.style.visibility = 'hidden'
  hidden.current = canvas
}

type BentLightProps = {
  /** Where the hero's field puts the black hole, in hero px. */
  hole: RefObject<HoleBody>
  /** The canvas of whatever lies behind the black hole. */
  behind: RefObject<HTMLCanvasElement | null>
}

/**
 * What lies behind the black hole, seen through it: a full-screen pass that
 * draws the `behind` canvas bent by a Schwarzschild lens centred on the
 * horizon, at the canvas' own opacity. While it draws, the canvas itself is
 * hidden, so what lies behind never shows twice; it shows again whenever
 * the black hole is gone.
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
  const uniforms = useMemo(() => {
    const nothingYet: CanvasTexture | null = null
    return {
      uBehind: { value: nothingYet },
      uDeflection: { value: deflection },
      uSize: { value: new Vector2() },
      uCentre: { value: new Vector2() },
      uHorizon: { value: 1 },
      uBend: { value: 0 },
      uOpacity: { value: 0 }
    }
  }, [deflection])
  const material = useRef<ShaderMaterial>(null)
  const picture = useRef<{
    texture: CanvasTexture
    width: number
    height: number
  }>(null)
  const hidden = useRef<HTMLCanvasElement>(null)
  const size = useThree(state => state.size)

  // why: the texture is made in the frame loop; this lets the unmount free
  // whichever one is current then.
  const release = useRef(() => {})

  useEffect(
    () => () => {
      swapHidden(hidden, null)
      release.current()
      deflection.dispose()
    },
    [deflection]
  )

  useFrame(() => {
    const canvas = behind.current
    const shader = material.current?.uniforms
    const { x, y, horizon, lift } = hole.current
    if (!canvas || !shader || !horizon) {
      swapHidden(hidden, null)
      return
    }
    let shown = picture.current
    // hazard: a texture keeps the size it was first sent at; a resized
    // canvas needs a new one.
    if (
      !shown ||
      shown.width !== canvas.width ||
      shown.height !== canvas.height
    ) {
      shown?.texture.dispose()
      shown = {
        texture: new CanvasTexture(canvas),
        width: canvas.width,
        height: canvas.height
      }
      shown.texture.premultiplyAlpha = true
      picture.current = shown
      const { texture } = shown
      release.current = () => texture.dispose()
    }
    // why: the canvas is redrawn by its owner at any time; sent every frame,
    // what is bent is at most one frame old (task black-hole-lensing, 12).
    shown.texture.needsUpdate = true
    const set = (name: string, value: unknown) => {
      const uniform = shader[name]
      if (uniform) uniform.value = value
    }
    set('uBehind', shown.texture)
    shader.uSize?.value.set(size.width, size.height)
    shader.uCentre?.value.set(x, y)
    set('uHorizon', horizon)
    set('uBend', bendAt(lift))
    set('uOpacity', Number(getComputedStyle(canvas).opacity))
    swapHidden(hidden, canvas)
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
        toneMapped={false}
      />
    </mesh>
  )
}
