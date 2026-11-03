'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, MathUtils, Vector2, type ShaderMaterial } from 'three'
import { readColorToken } from '@/lib/color-tokens'
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
 * The hero's black hole: one full-screen shader that ray traces the light
 * around it (gargantua-shader.ts), turned slightly by the pointer and pushed
 * in as the page scrolls through the hero.
 */
export const Gargantua = () => {
  const material = useRef<ShaderMaterial>(null)
  const pointer = useRef(new Vector2())
  const still = useRef(false)
  const size = useThree(state => state.size)
  const gl = useThree(state => state.gl)

  const uniforms = useMemo(() => {
    const primary = new Color(readColorToken('primary'))
    const mist = new Color(readColorToken('mist'))
    return {
      uResolution: { value: new Vector2() },
      uTime: { value: 0 },
      uLook: { value: new Vector2() },
      uPush: { value: 0 },
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
    sync()
    window.addEventListener('pointermove', move, { passive: true })
    const stop = onReducedMotionChange(sync)
    return () => {
      window.removeEventListener('pointermove', move)
      stop()
    }
  }, [])

  useFrame(({ clock }, delta) => {
    const shader = material.current
    if (!shader) return
    const u = shader.uniforms
    gl.getDrawingBufferSize(u.uResolution.value)
    u.uCentre.value.copy(size.width > size.height ? CENTRE.wide : CENTRE.tall)
    u.uWiden.value = widen(size.width / size.height)
    if (still.current) {
      u.uTime.value = STILL_TIME
      u.uIntro.value = 1
      u.uLook.value.set(0, 0)
      u.uPush.value = 0
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
    // why: 0 with the hero's top at the window's top, 1 once it has gone.
    const { top, height } = gl.domElement.getBoundingClientRect()
    u.uPush.value = MathUtils.clamp(-top / Math.max(height, 1), 0, 1)
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
