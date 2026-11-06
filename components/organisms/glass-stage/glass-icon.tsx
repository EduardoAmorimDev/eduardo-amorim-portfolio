'use client'
import { PerspectiveCamera, View } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import type { Group } from 'three'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { useLiteMode } from '@/lib/use-lite-mode'
import { useNearViewport } from '@/lib/use-near-viewport'
import { GlassBoundary } from './glass-boundary'
import { GlassMesh, SharedEnvironment } from './glass-material'
import { spinStep, type GlassModel } from './glass-motion'
import { FlatIconsContext } from './shelf-context'

// why: a quarter screen of lead, so the model is loaded and turning before
// the card scrolls into view (as RenderGate does for the scenes).
const LEAD = '25% 0px'
// why: the icon leans back a little, so its top face catches the light.
const LEAN = 0.3

type IconSceneProps = {
  model: GlassModel
  onReady: () => void
}

/** One turning glass model, framed for a 64×64 box, in a view's own scene. */
export const IconScene = ({ model, onReady }: IconSceneProps) => {
  const spin = useRef<Group>(null)
  const still = useRef(false)
  const invalidate = useThree(state => state.invalidate)
  // why: lite holds the glass still, as reduced motion does (task
  // portfolio-lp-60fps, 6).
  const lite = useLiteMode()

  useEffect(() => {
    const kick = () => invalidate()
    const sync = () => {
      still.current = prefersReducedMotion() || lite
      kick()
    }
    sync()
    // why: the view follows its box on the page, so a scroll or a resize
    // needs a frame even when the icon itself holds still.
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick)
    const stop = onReducedMotionChange(sync)
    return () => {
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
      stop()
    }
  }, [invalidate, lite])

  useFrame((_, delta) => {
    const body = spin.current
    if (!body) return
    body.rotation.y = spinStep(body.rotation.y, delta, still.current)
    if (!still.current) invalidate()
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 1.9]} fov={35} />
      <SharedEnvironment />
      <GlassBoundary>
        <Suspense fallback={null}>
          <group rotation-x={LEAN}>
            <group ref={spin}>
              <GlassMesh name={model} onReady={onReady} />
            </group>
          </group>
        </Suspense>
      </GlassBoundary>
    </>
  )
}

type GlassIconProps = {
  model: GlassModel
  /** Shown until the model is drawn, and for good if it fails to load. */
  children: ReactNode
}

/**
 * A 64×64 glass icon, drawn over this box by the page's GlassStage, with the
 * given flat icon in its place until the model has loaded; inside a flat
 * GlassShelf (touch, lite) the flat icon is all there is.
 */
export const GlassIcon = ({ model, children }: GlassIconProps) => {
  const slot = useRef<HTMLDivElement>(null)
  const near = useNearViewport(slot, LEAD)
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const flat = useContext(FlatIconsContext)

  return (
    <div
      ref={slot}
      data-glass-icon={model}
      data-ready={ready && !flat ? '' : undefined}
      className="relative size-16"
    >
      {(!ready || flat) && children}
      {near && !flat && (
        <View className="absolute inset-0">
          <IconScene model={model} onReady={onReady} />
        </View>
      )}
    </div>
  )
}
