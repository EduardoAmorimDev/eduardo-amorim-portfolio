'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, MathUtils, Vector2, type ShaderMaterial } from 'three'
import { readColorToken } from '@/lib/color-tokens'
import { markHeroReady } from '@/lib/hero-ready'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { GARGANTUA_FRAGMENT, GARGANTUA_VERTEX } from './gargantua-shader'

// why: where the black hole sits, in screen heights from the centre: to the
// right of the copy on wide screens, above it on tall ones (task 3).
const CENTRE = { wide: new Vector2(0.3, 0.02), tall: new Vector2(0, 0.2) }
// why: a tall screen sees the scene with a wider field (up to 1.9×), so the
// disk spans about the screen's width instead of three times it.
const widen = (aspect: number) => MathUtils.clamp(0.95 / aspect, 1, 1.9)
// why: higher follows the pointer more tightly; this drifts like a camera
// operator rather than snapping.
const LOOK_SMOOTHING = 2.5
// why: under reduced motion the scene is one still frame of the disk.
const STILL_TIME = 40
// why: on arrival the scene fades in from black as the camera glides in,
// before the copy rises (hero-copy.tsx, from 0.9 s).
const INTRO_SECONDS = 2.4
const easeOut = (t: number) => 1 - (1 - t) ** 3
/**
 * Share of the screen the canvas runs on below the hero: half of it is where
 * the image dissolves into the page's sky at rest (task reach-and-seams,
 * 1–2), the rest is where the black hole follows the visitor on the way out.
 */
export const BLEED = 1
// why: the spill the page shows at rest, in screens below the hero; the dive
// uncovers the rest of the canvas as it goes.
const SPILL = 0.5
// why: share of a screen scrolled by which the camera has dived all the way,
// eased in and out so the approach is slow (task swallow-and-copy, 1–2).
const DIVE_SCREENS = 1
// why: the closest the camera gets; at 12 the shadow is ~46% of a 16:10
// window's width, coming at the visitor without filling the screen.
const NEAR = 12
// invariant: the shadow's width in screen heights is about SHADOW_SPAN / the
// camera's distance (photon capture radius × focal × 2); this keeps it
// under SWALLOW_MAX of the window's width on any shape of window.
const SHADOW_SPAN = 8.84
const SWALLOW_MAX = 0.8
// why: scrolled screens over which the image fades to clear after the dive,
// so the black hole has dissolved into the sky once the hero has gone.
const VANISH = [0.6, 0.95] as const

/**
 * Whether the canvas shows nothing once the hero has scrolled `scrolled`
 * screens: faded out after the dive, or, holding still, its spill gone by.
 */
export const isGone = (scrolled: number, still: boolean) =>
  scrolled >= (still ? 1 + SPILL : VANISH[1])

/**
 * The hero's black hole: one full-screen shader that ray traces the light
 * around it (gargantua-shader.ts), turned slightly by the pointer and pushed
 * in as the page scrolls through the hero.
 */
export const Gargantua = () => {
  const material = useRef<ShaderMaterial>(null)
  const pointer = useRef(new Vector2())
  const still = useRef(false)
  // why: the canvas's top in the document, measured on load and resize; a
  // box read every frame forced a style pass per frame (task
  // portfolio-lp-60fps, Intent), where scrollY costs nothing.
  const documentTop = useRef(0)
  const size = useThree(state => state.size)
  const gl = useThree(state => state.gl)

  const uniforms = useMemo(() => {
    const primary = new Color(readColorToken('primary'))
    const mist = new Color(readColorToken('mist'))
    return {
      uResolution: { value: new Vector2() },
      uBleed: { value: 0 },
      uTime: { value: 0 },
      uLook: { value: new Vector2() },
      uPush: { value: 0 },
      uNear: { value: NEAR },
      uCut: { value: 0 },
      uVanish: { value: 0 },
      uCentre: { value: new Vector2() },
      uWiden: { value: 1 },
      uIntro: { value: 0 },
      // why: the brand's palette, hottest inner gas near white, cooling to
      // its violet at the rim; the sky band in its steel.
      uHot: { value: mist.clone().lerp(new Color('#ffffff'), 0.4) },
      uWarm: { value: primary.clone().lerp(mist, 0.6) },
      // why: the rim in the brand violet, deepened towards steel so the
      // outer gas glows dim rather than neon.
      uCool: {
        value: primary
          .clone()
          .lerp(new Color(readColorToken('steel')), 0.35)
          .multiplyScalar(0.7)
      },
      uSky: { value: new Color(readColorToken('steel')) }
    }
  }, [])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      pointer.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1)
      )
    }
    const sync = () => {
      still.current = prefersReducedMotion()
    }
    const measure = () => {
      documentTop.current = gl.domElement.getBoundingClientRect().top + scrollY
    }
    sync()
    measure()
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('resize', measure)
    const stop = onReducedMotionChange(sync)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('resize', measure)
      stop()
    }
  }, [gl])

  const drawn = useRef(false)

  useFrame(({ clock }, delta) => {
    const shader = material.current
    if (!shader) return
    // why: this callback runs before the frame is drawn; the next frame's
    // start is when the first one is on screen, which lifts the loading
    // veil (loading-veil.tsx).
    if (!drawn.current) requestAnimationFrame(markHeroReady)
    drawn.current = true
    const u = shader.uniforms
    // invariant: the shader frames the screen alone, so the black hole sits
    // where it did before the canvas grew to spill below it.
    const buffer = gl.getDrawingBufferSize(u.uResolution.value)
    const screen = buffer.y / (1 + BLEED)
    u.uBleed.value = buffer.y - screen
    buffer.y = screen
    const screenHeight = size.height / (1 + BLEED)
    const centre = size.width > screenHeight ? CENTRE.wide : CENTRE.tall
    const aspect = size.width / screenHeight
    u.uWiden.value = widen(aspect)
    u.uNear.value = Math.max(
      NEAR,
      SHADOW_SPAN / (SWALLOW_MAX * aspect * u.uWiden.value)
    )
    if (still.current) {
      u.uTime.value = STILL_TIME
      u.uIntro.value = 1
      u.uLook.value.set(0, 0)
      u.uPush.value = 0
      u.uCentre.value.copy(centre)
      u.uCut.value = (BLEED - SPILL) * screen
      u.uVanish.value = 0
      return
    }
    u.uTime.value = clock.elapsedTime + STILL_TIME
    u.uIntro.value = easeOut(Math.min(clock.elapsedTime / INTRO_SECONDS, 1))
    u.uLook.value.x = MathUtils.damp(
      u.uLook.value.x,
      pointer.current.x,
      LOOK_SMOOTHING,
      delta
    )
    u.uLook.value.y = MathUtils.damp(
      u.uLook.value.y,
      pointer.current.y,
      LOOK_SMOOTHING,
      delta
    )
    // why: screens scrolled past the hero's top: 0 at rest, 1 once it has gone.
    const top = documentTop.current - scrollY
    const scrolled = Math.max(-top / Math.max(screenHeight, 1), 0)
    const dive = MathUtils.smoothstep(scrolled, 0, DIVE_SCREENS)
    u.uPush.value = dive
    // why: the black hole drifts to the window's middle column and rides up
    // with the hero, leaving through the top of the window as it swells.
    u.uCentre.value.set(MathUtils.lerp(centre.x, 0, dive), centre.y)
    u.uCut.value = (BLEED - SPILL) * screen * (1 - dive)
    u.uVanish.value = MathUtils.smoothstep(scrolled, ...VANISH)
  })

  return (
    // invariant: the quad fills clip space itself, so it is never culled.
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={GARGANTUA_VERTEX}
        fragmentShader={GARGANTUA_FRAGMENT}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
