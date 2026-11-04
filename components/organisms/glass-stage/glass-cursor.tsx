'use client'
import { OrthographicCamera, View } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject
} from 'react'
import { MathUtils, type Group } from 'three'
import {
  onReducedMotionChange,
  prefersReducedMotion
} from '@/lib/media-preferences'
import { GlassBoundary } from './glass-boundary'
import { GlassMesh, SharedEnvironment } from './glass-material'
import { CONTROL_SELECTOR, CURSOR_SCALE, tiltFor } from './glass-motion'

// why: only a device with a mouse or trackpad has a pointer to replace
// (task reach-and-seams, 25); touch keeps the system's behaviour.
const FINE_POINTER = '(hover: hover) and (pointer: fine)'
// why: px of screen per unit, so the 1-unit-tall model is 32 px (task, 22).
const PX_PER_UNIT = 32
// invariant: the model's tip, from cursor.glb's bounds; placed on the
// view's centre, it is the pixel the click lands on, and the cursor leans
// and grows about it.
const TIP = { x: -0.315, y: 0.5 }
// why: per second; the lean and the growth ease in over about a tenth of a
// second, quick enough to read as the pointer's own.
const EASE = 12
const SETTLED = 1e-3
/** Class on <html> that hides the native pointer once the glass is drawn. */
const ACTIVE_CLASS = 'glass-cursor'

type Pointer = { x: number; y: number; control: boolean }

type CursorSceneProps = {
  pointerRef: RefObject<Pointer>
  kickRef: RefObject<() => void>
  onReady: () => void
}

const CursorScene = ({ pointerRef, kickRef, onReady }: CursorSceneProps) => {
  const body = useRef<Group>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const still = useRef(false)
  const invalidate = useThree(state => state.invalidate)

  useEffect(() => {
    const sync = () => {
      still.current = prefersReducedMotion()
    }
    sync()
    const stop = onReducedMotionChange(sync)
    kickRef.current = () => invalidate()
    return () => {
      stop()
      kickRef.current = () => {}
    }
  }, [invalidate, kickRef])

  useFrame((_, delta) => {
    const group = body.current
    const now = pointerRef.current
    if (!group) return
    const step = Math.max(delta, 1 / 240)
    const before = last.current ?? now
    const aim = tiltFor(
      (now.x - before.x) / step,
      (now.y - before.y) / step,
      still.current
    )
    last.current = { x: now.x, y: now.y }
    const size = now.control ? CURSOR_SCALE.control : CURSOR_SCALE.rest
    const ease = still.current ? Infinity : EASE
    group.rotation.x = MathUtils.damp(group.rotation.x, aim.x, ease, delta)
    group.rotation.y = MathUtils.damp(group.rotation.y, aim.y, ease, delta)
    group.scale.setScalar(MathUtils.damp(group.scale.x, size, ease, delta))
    const moving =
      Math.abs(group.rotation.x) > SETTLED ||
      Math.abs(group.rotation.y) > SETTLED ||
      Math.abs(group.scale.x - size) > SETTLED ||
      before.x !== now.x ||
      before.y !== now.y
    if (moving) invalidate()
  })

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={PX_PER_UNIT} />
      <SharedEnvironment />
      <GlassBoundary>
        <Suspense fallback={null}>
          <group ref={body}>
            <group position={[-TIP.x, -TIP.y, 0]}>
              <GlassMesh name="cursor" onReady={onReady} />
            </group>
          </group>
        </Suspense>
      </GlassBoundary>
    </>
  )
}

/**
 * The visitor's pointer, in glass: cursor.glb drawn by the GlassStage at the
 * pointer, leaning with its motion and growing over controls; the native
 * pointer is hidden only once the glass is drawn, and comes back over the
 * device screens, whose pages have their own (task reach-and-seams, 22–28).
 */
export const GlassCursor = () => {
  const box = useRef<HTMLDivElement>(null)
  const pointer = useRef<Pointer>({ x: 0, y: 0, control: false })
  const kick = useRef<() => void>(() => {})
  const [fine, setFine] = useState(false)
  const [ready, setReady] = useState(false)
  const [shown, setShown] = useState(false)
  const onReady = useCallback(() => setReady(true), [])

  useEffect(() => {
    const query = window.matchMedia(FINE_POINTER)
    const sync = () => setFine(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!fine || !ready) return
    const root = document.documentElement
    root.classList.add(ACTIVE_CLASS)
    return () => root.classList.remove(ACTIVE_CLASS)
  }, [fine, ready])

  useEffect(() => {
    if (!fine) return
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const element = box.current
      if (element)
        element.style.translate = `${event.clientX}px ${event.clientY}px`
      const target = event.target
      const control =
        target instanceof Element && !!target.closest(CONTROL_SELECTOR)
      element?.toggleAttribute('data-control', control)
      pointer.current = { x: event.clientX, y: event.clientY, control }
      setShown(!(target instanceof HTMLIFrameElement))
      kick.current()
    }
    // why: over a device screen the pointer is in another document, which
    // sends this one no more moves; the glass steps aside until it is back.
    const over = (event: PointerEvent) => {
      if (event.target instanceof HTMLIFrameElement) setShown(false)
    }
    const out = (event: PointerEvent) => {
      if (event.relatedTarget === null) setShown(false)
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over)
    window.addEventListener('pointerout', out)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      window.removeEventListener('pointerout', out)
    }
  }, [fine])

  useEffect(() => {
    kick.current()
  }, [shown, ready])

  if (!fine) return null

  return (
    // why: a 96 px box centred on the pointer, room for the 32 px arrow
    // below and right of its tip, grown and leaning.
    <div
      ref={box}
      aria-hidden="true"
      data-testid="glass-cursor"
      data-shown={shown && ready ? '' : undefined}
      className="pointer-events-none fixed top-0 left-0 z-60 -mt-12 -ml-12 size-24"
    >
      <View className="size-full" visible={shown && ready}>
        <CursorScene pointerRef={pointer} kickRef={kick} onReady={onReady} />
      </View>
    </div>
  )
}
