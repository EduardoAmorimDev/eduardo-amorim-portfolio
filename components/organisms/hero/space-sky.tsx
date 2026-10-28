'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  WebGLRenderTarget,
  type NormalOrGLBufferAttributes,
  type Texture
} from 'three'
import { readColorToken } from '@/lib/color-tokens'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { OVERSCAN } from './bent-light'
import { BEHIND_LAYER } from './black-hole'
import {
  BRIGHT_STARS,
  SPACE,
  createFeatured,
  createStars,
  seeded,
  type Star
} from './space'

// invariant: a hero px maps to the clip space of the lens' layer behind,
// which spans OVERSCAN heroes wide and tall, centred on the hero.
const toClip = /* glsl */ `
  // why: 1 at the top of the hero, 0.7 by its middle, 0.5 at 75%, 0.2 at
  // 90% and about 0 by 8 px above its foot, linear between (task
  // black-hole-alive, 7, as revised).
  float starFade(float y, float height) {
    float s = y / height;
    float foot = max((height - 8.0) / height, 0.91);
    if (s < 0.5) return mix(1.0, 0.7, max(s, 0.0) / 0.5);
    if (s < 0.75) return mix(0.7, 0.5, (s - 0.5) / 0.25);
    if (s < 0.9) return mix(0.5, 0.2, (s - 0.75) / 0.15);
    if (s < foot) return mix(0.2, 0.02, (s - 0.9) / (foot - 0.9));
    return 0.0;
  }

  vec4 heroToClip(vec2 px) {
    vec2 share = px / uHero;
    return vec4(
      (share.x - 0.5) * 2.0 / ${OVERSCAN.toFixed(1)},
      (0.5 - share.y) * 2.0 / ${OVERSCAN.toFixed(1)},
      0.0,
      1.0
    );
  }
`

const starVertex = /* glsl */ `
  uniform vec2 uHero;
  uniform float uTime;
  uniform float uLow;
  attribute float size;
  attribute float brightness;
  attribute float period;
  attribute float phase;
  attribute vec3 tint;
  varying vec3 vColor;
  varying float vGlow;
  varying float vSize;
  varying float vSpikes;
  ${toClip}
  void main() {
    gl_Position = heroToClip(position.xy);
    // why: one texel per CSS px in the layer behind; the sprite holds the
    // core, a halo 3 sizes out and spikes 4 sizes out, plus a px of edge.
    gl_PointSize = size * 8.0 + 1.0;
    float wave = period > 0.0
      ? 0.5 + 0.5 * cos(6.283185307 * (uTime / period + phase))
      : 1.0;
    float fade = starFade(position.y, uHero.y);
    vGlow = fade * brightness * (period > 0.0 ? mix(uLow, 1.0, wave) : 1.0);
    vColor = tint;
    vSize = size;
    // why: the brightest quarter (0.5·(0.3 + 0.7·0.75^2.2)) carries spikes,
    // and every extra bright star.
    vSpikes = brightness > 0.336 ? 1.0 : 0.0;
  }
`

const starFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vGlow;
  varying float vSize;
  varying float vSpikes;
  // Incandescent (task black-hole-wide, 3): a hot core, a halo of 35% of
  // it fading to nothing 3 sizes out, and on the brightest a thin cross.
  void main() {
    vec2 px = (gl_PointCoord - 0.5) * (vSize * 8.0 + 1.0);
    float d = length(px);
    float core = 1.0 - smoothstep(0.5 * vSize - 0.2, 0.5 * vSize + 0.6, d);
    float halo = 0.35 * pow(max(1.0 - d / (3.0 * vSize), 0.0), 2.0);
    float reach = 4.0 * vSize;
    float cross = exp(-px.y * px.y * 4.0) * max(1.0 - abs(px.x) / reach, 0.0)
      + exp(-px.x * px.x * 4.0) * max(1.0 - abs(px.y) / reach, 0.0);
    float a = vGlow * clamp(core + halo + vSpikes * 0.6 * cross, 0.0, 1.0);
    gl_FragColor = vec4(vColor * a, a);
  }
`

// why: painted once into a texture (task space, Landing): the three bright
// stars of the reference, each a mist core, a halo leaning to primary and a
// cross of spikes with a fainter diagonal one; premultiplied alpha.
const skyFragment = /* glsl */ `
  uniform vec2 uHero;
  uniform vec3 uMist;
  uniform vec3 uPrimary;
  // x, y (hero px), core, halo / spikes (diameters, px)
  uniform vec4 uStarA[${BRIGHT_STARS.length}];
  uniform float uStarB[${BRIGHT_STARS.length}];
  varying vec2 vUv;

  vec4 over(vec4 top, vec4 under) {
    return top + under * (1.0 - top.a);
  }
  ${toClip}

  vec4 brightStar(vec2 p, vec4 a, float spikes) {
    vec2 d = p - a.xy;
    float r = length(d);
    float core = exp(-pow(r / (0.5 * a.z), 2.0));
    // hazard: the sky is linear and shown in sRGB, which lifts faint light;
    // a gaussian tail read there as a flat disc with an edge, so the halo
    // falls as (1 - r/R)^4, which reaches 0 at its radius with no step.
    float halo = 0.3 * pow(max(1.0 - r / (0.5 * a.w), 0.0), 4.0);
    float reach = 0.5 * spikes;
    float thin = max(0.6, 0.12 * a.z);
    float cross = exp(-pow(d.y / thin, 2.0)) * max(1.0 - abs(d.x) / reach, 0.0)
      + exp(-pow(d.x / thin, 2.0)) * max(1.0 - abs(d.y) / reach, 0.0);
    vec2 e = vec2(d.x + d.y, d.x - d.y) * 0.7071;
    float diagonal = exp(-pow(e.y / thin, 2.0)) * max(1.0 - abs(e.x) / (0.55 * reach), 0.0)
      + exp(-pow(e.x / thin, 2.0)) * max(1.0 - abs(e.y) / (0.55 * reach), 0.0);
    float rays = pow(cross, 1.5) * 0.8 + pow(diagonal, 2.0) * 0.3;
    float fade = starFade(a.y, uHero.y);
    float light = fade * clamp(core + halo + rays, 0.0, 1.0);
    vec3 color = mix(uPrimary, uMist, clamp(core + rays * 0.8 + 0.35, 0.0, 1.0));
    return vec4(color * light, light);
  }

  void main() {
    vec2 p = (vec2(vUv.x, 1.0 - vUv.y) * ${OVERSCAN.toFixed(1)} - ${((OVERSCAN - 1) / 2).toFixed(1)}) * uHero;
    vec4 sky = vec4(0.0);
    for (int i = 0; i < ${BRIGHT_STARS.length}; i++)
      sky = over(brightStar(p, uStarA[i], uStarB[i]), sky);
    gl_FragColor = sky;
  }
`

const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`

const showFragment = /* glsl */ `
  uniform sampler2D uSky;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(uSky, vUv);
  }
`

type Palette = Record<'mist' | 'snow' | 'primary' | 'steel', Color>

/** The stars' geometry: positions in hero px and their look, per vertex. */
const starGeometry = (stars: Star[], palette: Palette) => {
  const geometry = new BufferGeometry()
  const position = new Float32Array(stars.length * 3)
  const size = new Float32Array(stars.length)
  const brightness = new Float32Array(stars.length)
  const period = new Float32Array(stars.length)
  const phase = new Float32Array(stars.length)
  const tint = new Float32Array(stars.length * 3)
  stars.forEach((star, index) => {
    position.set([star.x, star.y, 0], index * 3)
    size[index] = star.size
    brightness[index] = star.brightness
    period[index] = star.period
    phase[index] = star.phase
    const white = index % 2 ? palette.mist : palette.snow
    const color =
      star.tint === 1
        ? white.clone().lerp(palette.primary, 0.65)
        : star.tint === 2
          ? white.clone().lerp(palette.steel, 0.65)
          : white
    tint.set([color.r, color.g, color.b], index * 3)
  })
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('size', new BufferAttribute(size, 1))
  geometry.setAttribute('brightness', new BufferAttribute(brightness, 1))
  geometry.setAttribute('period', new BufferAttribute(period, 1))
  geometry.setAttribute('phase', new BufferAttribute(phase, 1))
  geometry.setAttribute('tint', new BufferAttribute(tint, 3))
  return geometry
}

const starMaterial = (hero: Vector2) =>
  new ShaderMaterial({
    vertexShader: starVertex,
    fragmentShader: starFragment,
    uniforms: {
      uHero: { value: hero },
      uTime: { value: 0 },
      uLow: { value: SPACE.twinkleLow }
    },
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false
  })

/**
 * Paints the still sky (the bright stars and the steady small ones) of a
 * hero `width` × `height` px into a texture OVERSCAN times as wide and tall.
 */
const paintSky = (
  render: (
    scene: Scene,
    camera: OrthographicCamera,
    target: WebGLRenderTarget
  ) => void,
  width: number,
  height: number,
  stars: Star[],
  palette: Palette
) => {
  const target = new WebGLRenderTarget(
    Math.round(width * OVERSCAN),
    Math.round(height * OVERSCAN),
    // why: stored sRGB-encoded, so the faint glows keep fine steps in 8
    // bits; half floats did too, at twice the bytes read every frame.
    { depthBuffer: false, colorSpace: SRGBColorSpace }
  )
  const hero = new Vector2(width, height)
  const skyMaterial = new ShaderMaterial({
    vertexShader: quadVertex,
    fragmentShader: skyFragment,
    uniforms: {
      uHero: { value: hero },
      uMist: { value: palette.mist },
      uPrimary: { value: palette.primary },
      uStarA: {
        value: BRIGHT_STARS.map(
          star =>
            new Vector4(
              star.at[0] * width,
              star.at[1] * height,
              star.core * SPACE.scale,
              star.halo * SPACE.scale
            )
        )
      },
      uStarB: { value: BRIGHT_STARS.map(star => star.spikes * SPACE.scale) }
    },
    depthTest: false,
    depthWrite: false
  })
  const scene = new Scene()
  const quad = new Mesh(new PlaneGeometry(1, 1), skyMaterial)
  quad.frustumCulled = false
  scene.add(quad)
  const steady = starGeometry(
    stars.filter(star => !star.period),
    palette
  )
  const steadyMaterial = starMaterial(hero)
  const points = new Points(steady, steadyMaterial)
  points.frustumCulled = false
  points.renderOrder = 1
  scene.add(points)
  render(scene, new OrthographicCamera(), target)
  quad.geometry.dispose()
  skyMaterial.dispose()
  steady.dispose()
  steadyMaterial.dispose()
  return target
}

/**
 * The sky behind the black hole (task space, 2–4): three bright stars and
 * small ones spread over the whole layer its lens draws from, painted once
 * per hero size, and the twinkling stars on top, drawn every frame. Only
 * seen through the lens; under reduced motion the stars hold still.
 */
export const SpaceSky = () => {
  const gl = useThree(state => state.gl)
  // hazard: R3F measures its canvas with scroll: true, so the size object
  // changes on every scroll; keyed on it, the sky was redrawn with new stars
  // as the page scrolled (task black-hole-alive, 5). Only width and height.
  const width = useThree(state => state.size.width)
  const height = useThree(state => state.size.height)
  const palette = useMemo<Palette>(
    () => ({
      mist: new Color(readColorToken('mist')),
      snow: new Color(readColorToken('snow')),
      primary: new Color(readColorToken('primary')),
      steel: new Color(readColorToken('steel'))
    }),
    []
  )
  const hero = useMemo(() => new Vector2(), [])
  const still = useRef(true)
  // why: one sky per visit; a new hero size repaints the same stars.
  const seed = useRef(0)
  const show = useRef<Mesh>(null)
  const twinkling =
    useRef<Points<BufferGeometry<NormalOrGLBufferAttributes>>>(null)
  const twinkle = useRef<ShaderMaterial>(null)
  const showUniforms = useMemo(
    () => ({ uSky: { value: null as Texture | null } }),
    []
  )
  const twinkleUniforms = useMemo(
    () => ({
      uHero: { value: hero },
      uTime: { value: 0 },
      uLow: { value: SPACE.twinkleLow }
    }),
    [hero]
  )

  useEffect(() => {
    still.current = prefersReducedMotion()
    return onReducedMotionChange(() => {
      still.current = prefersReducedMotion()
    })
  }, [])

  useEffect(() => {
    if (!width || !height) return
    if (!seed.current) seed.current = Math.random() || 0.5
    hero.set(width, height)
    // why: stars over the whole layer the lens draws from, so a ray it bends
    // past the hero's edge still finds sky there.
    const spread = (OVERSCAN - 1) / 2
    const stars = createStars(seeded(seed.current), {
      left: -spread * width,
      top: -spread * height,
      right: (1 + spread) * width,
      bottom: (1 + spread) * height
    })
    const painted = paintSky(
      (scene, camera, target) => {
        const previous = gl.getRenderTarget()
        const clear = gl.getClearColor(new Color())
        const clearAlpha = gl.getClearAlpha()
        gl.setRenderTarget(target)
        gl.setClearColor(0x000000, 0)
        gl.clear()
        gl.render(scene, camera)
        gl.setClearColor(clear, clearAlpha)
        gl.setRenderTarget(previous)
      },
      width,
      height,
      stars,
      palette
    )
    // why: handed to the meshes through their refs, not React state, so a
    // new hero size repaints without a render of its own.
    const twinkles = starGeometry(
      [
        ...stars.filter(star => star.period > 0),
        ...createFeatured(seeded(seed.current / 2 + 0.25), width, height)
      ],
      palette
    )
    const sky = show.current
    const material = sky?.material
    if (material instanceof ShaderMaterial) {
      const uniform = material.uniforms.uSky
      if (uniform) uniform.value = painted.texture
    }
    if (sky) sky.visible = true
    const points = twinkling.current
    if (points) points.geometry = twinkles
    return () => {
      painted.dispose()
      twinkles.dispose()
    }
  }, [gl, width, height, hero, palette])

  useFrame((_, delta) => {
    const time = twinkle.current?.uniforms.uTime
    if (time && !still.current) time.value += delta
  })

  return (
    <>
      <mesh
        ref={mesh => {
          show.current = mesh
          mesh?.layers.set(BEHIND_LAYER)
        }}
        visible={false}
        frustumCulled={false}
        renderOrder={-2}
      >
        <planeGeometry />
        <shaderMaterial
          vertexShader={quadVertex}
          fragmentShader={showFragment}
          uniforms={showUniforms}
          transparent
          premultipliedAlpha
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <points
        ref={points => {
          twinkling.current = points
          points?.layers.set(BEHIND_LAYER)
        }}
        frustumCulled={false}
        renderOrder={-1}
      >
        <shaderMaterial
          ref={twinkle}
          vertexShader={starVertex}
          fragmentShader={starFragment}
          uniforms={twinkleUniforms}
          transparent
          premultipliedAlpha
          depthTest={false}
          depthWrite={false}
        />
      </points>
    </>
  )
}
