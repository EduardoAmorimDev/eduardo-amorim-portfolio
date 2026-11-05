'use client'
import { Canvas, createPortal, useFrame } from '@react-three/fiber'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { PerspectiveCamera, Scene } from 'three'
import '@/lib/three-console'
import { touchDpr } from '@/lib/adaptive-dpr'
import { useFinePointer } from '@/lib/use-fine-pointer'
import { useLiteMode } from '@/lib/use-lite-mode'
import { useNearViewport } from '@/lib/use-near-viewport'
import { IconScene } from './glass-icon'
import { GlassRoot } from './glass-stage'
import { ShelfContext, type ShelfApi, type ShelfSlot } from './shelf-context'
import { STILL_SIZE } from '@/lib/canvas-size'

// why: a quarter screen of lead, so the models are loaded and turning before
// the cards scroll into view (as GlassIcon and RenderGate do).
const LEAD = '25% 0px'
// why: a frame callback with a priority takes over drawing, so the shelf's
// own scene is never drawn over the icons.
const DRAW = 1
const DPR = touchDpr([1, 2], false)

type SlotViewProps = { element: HTMLElement; children: ReactNode }

/**
 * Draws its scene inside `element`'s box on the shelf's canvas. The box is
 * measured against the canvas in the same frame, and both scroll with the
 * page, so the icon never trails its card (task portfolio-lp-mobile, 4).
 */
const SlotDraw = ({ element, children }: SlotViewProps) => {
  useFrame(({ gl, scene, camera }) => {
    const canvas = gl.domElement.getBoundingClientRect()
    const slot = element.getBoundingClientRect()
    if (slot.bottom < 0 || slot.top > window.innerHeight) return
    if (camera instanceof PerspectiveCamera) {
      const aspect = slot.width / slot.height
      if (camera.aspect !== aspect) {
        camera.aspect = aspect
        camera.updateProjectionMatrix()
      }
    }
    const left = slot.left - canvas.left
    const bottom = canvas.bottom - slot.bottom
    const autoClear = gl.autoClear
    gl.autoClear = false
    gl.setViewport(left, bottom, slot.width, slot.height)
    gl.setScissor(left, bottom, slot.width, slot.height)
    gl.setScissorTest(true)
    gl.render(scene, camera)
    gl.setScissorTest(false)
    gl.autoClear = autoClear
  }, DRAW)
  return <>{children}</>
}

const SlotView = ({ element, children }: SlotViewProps) => {
  const [scene] = useState(() => new Scene())
  return createPortal(<SlotDraw element={element}>{children}</SlotDraw>, scene)
}

/**
 * Holds the solution cards and, on touch, the canvas their glass icons are
 * drawn in: laid over the cards and scrolled with them by the browser, where
 * a canvas fixed to the window lagged behind the native scroll (task
 * portfolio-lp-mobile, Decided). With a fine pointer it only holds them.
 */
export const GlassShelf = ({ children }: { children: ReactNode }) => {
  const fine = useFinePointer()
  const lite = useLiteMode()
  const box = useRef<HTMLDivElement>(null)
  const near = useNearViewport(box, LEAD)
  const [slots, setSlots] = useState<ReadonlyMap<string, ShelfSlot>>(
    () => new Map()
  )
  const register = useCallback((id: string, slot: ShelfSlot | null) => {
    setSlots(previous => {
      const next = new Map(previous)
      if (slot) next.set(id, slot)
      else next.delete(id)
      return next
    })
  }, [])
  const api = useMemo<ShelfApi>(() => ({ register }), [register])
  // why: lite draws the icons here on every device too, where the canvas
  // scrolls with the cards and needs no frame per scroll (task
  // portfolio-lp-60fps, 6).
  const touch = fine === false || lite

  return (
    <div ref={box} className="relative">
      <ShelfContext.Provider value={touch ? api : null}>
        {children}
      </ShelfContext.Provider>
      {touch && (
        <Canvas
          aria-hidden="true"
          data-testid="glass-shelf"
          resize={STILL_SIZE}
          data-live={near ? '' : undefined}
          frameloop="demand"
          dpr={lite ? 1 : DPR}
          gl={{ alpha: true }}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <GlassRoot>
            {near &&
              [...slots].map(([id, { element, model, onReady }]) => (
                <SlotView key={id} element={element}>
                  <IconScene model={model} onReady={onReady} follow={false} />
                </SlotView>
              ))}
          </GlassRoot>
        </Canvas>
      )}
    </div>
  )
}
