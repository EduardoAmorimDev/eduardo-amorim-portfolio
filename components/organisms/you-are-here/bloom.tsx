'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector2 } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

type BloomProps = {
  /** How much light the bright parts spill. */
  strength: number
  /** How far the spill spreads, 0..1. */
  radius: number
  /** Brightness (0..1) from which a pixel starts to glow. */
  threshold: number
}

// why: half the canvas is plenty for light that is blurred anyway, and
// quarters the bloom's cost.
const BLOOM_SCALE = 0.5

/**
 * Renders its `<Canvas>` through three's bloom: the scene's bright parts
 * give off light that spills softly onto their surroundings, as light does
 * through a lens. Place it inside the `<Canvas>`; it takes over rendering.
 */
export const Bloom = ({ strength, radius, threshold }: BloomProps) => {
  const gl = useThree(state => state.gl)
  const scene = useThree(state => state.scene)
  const camera = useThree(state => state.camera)
  const size = useThree(state => state.size)
  // why: the composer's targets are sized in device px, so a new pixel
  // ratio (a window moved to another screen) rebuilds them; stale, they
  // would blur the scene.
  const dpr = useThree(state => state.viewport.dpr)
  // why: the composer is rebuilt by the effect and read by the loop; a ref
  // is React's place for such a mutable value.
  const composer = useRef<EffectComposer>(null)

  useEffect(() => {
    const effects = new EffectComposer(gl)
    effects.addPass(new RenderPass(scene, camera))
    effects.addPass(
      new UnrealBloomPass(
        new Vector2(size.width * BLOOM_SCALE, size.height * BLOOM_SCALE),
        strength,
        radius,
        threshold
      )
    )
    // invariant: last, it turns the linear result into the screen's sRGB.
    effects.addPass(new OutputPass())
    effects.setPixelRatio(dpr)
    effects.setSize(size.width, size.height)
    composer.current = effects
    return () => {
      effects.dispose()
      composer.current = null
    }
  }, [gl, scene, camera, size, dpr, strength, radius, threshold])

  // invariant: priority 1 makes r3f hand rendering over to this loop.
  useFrame((_, delta) => {
    if (composer.current) composer.current.render(delta)
    else gl.render(scene, camera)
  }, 1)

  return null
}
