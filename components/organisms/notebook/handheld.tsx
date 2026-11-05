'use client'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ExtrudeGeometry,
  MeshStandardMaterial,
  Shape,
  Vector3,
  type Group
} from 'three'
import { readColorToken } from '@/lib/color-tokens'
import { useFinePointer } from '@/lib/use-fine-pointer'
import { useStaticPage } from '@/lib/use-static-page'
import { ScaledPage } from './scaled-page'
import { isShown, renderScale, restRenderScale, ZOOM_SETTLE } from './stages'

/** A phone or tablet: a rounded slab with a live page on its front glass. */
export type HandheldSpec = {
  /** The page in CSS px, upright (portrait); the site lays out for it. */
  page: { width: number; height: number }
  /** Width of the visible display in scene units; height follows the page. */
  screenWidth: number
  /** Glass around the display, in scene units. */
  bezel: number
  depth: number
  /** Radius of the slab's outline corners, in scene units. */
  corner: number
  /** Radius of the page's corners, in the page's CSS px. */
  pageRadius: number
  title: string
}

export const PHONE: HandheldSpec = {
  // why: a common phone width; the site renders its mobile layout.
  page: { width: 390, height: 844 },
  screenWidth: 1.12,
  bezel: 0.05,
  depth: 0.1,
  corner: 0.17,
  pageRadius: 42,
  title: 'Preview of the projects section on a phone'
}

export const TABLET: HandheldSpec = {
  // why: a common tablet's portrait width; the site renders its tablet layout.
  page: { width: 820, height: 1180 },
  screenWidth: 1.85,
  bezel: 0.09,
  depth: 0.08,
  corner: 0.14,
  pageRadius: 24,
  title: 'Preview of the projects section on a tablet'
}

// why: rounds the slab's front and back edges; must stay under depth / 2.
const BEVEL = 0.025
// why: lifting the page a hair off the glass keeps the two from flickering.
const SCREEN_GAP = 0.001
// invariant: the canvas at z-index 1 over every page at 0; the devices never
// overlap on stage, so they need no order among themselves.
export const STILL_STACK: [number, number] = [2, 0]

const bodySize = ({ page, screenWidth, bezel }: HandheldSpec) => ({
  width: screenWidth + bezel * 2,
  height: (screenWidth * page.height) / page.width + bezel * 2
})

const roundedRect = (width: number, height: number, radius: number) => {
  const [x, y] = [-width / 2, -height / 2]
  const shape = new Shape()
  shape.moveTo(x, y + radius)
  shape.lineTo(x, y + height - radius)
  shape.quadraticCurveTo(x, y + height, x + radius, y + height)
  shape.lineTo(x + width - radius, y + height)
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius)
  shape.lineTo(x + width, y + radius)
  shape.quadraticCurveTo(x + width, y, x + width - radius, y)
  shape.lineTo(x + radius, y)
  shape.quadraticCurveTo(x, y, x, y + radius)
  return shape
}

// why: drei's RoundedBox ties the outline's corner radius to the depth, so a
// thin slab would get near-square corners; extruding a rounded outline keeps
// a phone's big corners on a thin body.
const createSlab = (spec: HandheldSpec) => {
  const { width, height } = bodySize(spec)
  const geometry = new ExtrudeGeometry(
    roundedRect(width - BEVEL * 2, height - BEVEL * 2, spec.corner - BEVEL),
    {
      depth: spec.depth - BEVEL * 2,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 4,
      curveSegments: 24
    }
  )
  geometry.center()
  return geometry
}

type HandheldProps = {
  spec: HandheldSpec
  /** Page shown live on the screen; without one it stays black. */
  screenUrl?: string
  /** Turns the page to read upright once the body has turned 90° in Z. */
  landscape?: boolean
}

export const Handheld = ({
  spec,
  screenUrl,
  landscape = false
}: HandheldProps) => {
  const geometry = useMemo(() => createSlab(spec), [spec])
  // hazard: drei's <Html> mounted in the canvas's first commit loses its
  // page to a late root unmount; mounting it a frame later keeps it.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  // invariant: ExtrudeGeometry's group 0 is the front and back caps (glass),
  // group 1 the sides and bevels (metal frame).
  const materials = useMemo(
    () => [
      new MeshStandardMaterial({
        color: readColorToken('ink'),
        roughness: 0.15,
        metalness: 0.3
      }),
      new MeshStandardMaterial({
        color: readColorToken('graphite'),
        roughness: 0.35,
        metalness: 0.8
      })
    ],
    []
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(
    () => () => materials.forEach(material => material.dispose()),
    [materials]
  )

  // why: the device turns, its page swaps width and height and the site
  // lays itself out again for the new width, like rotating a real tablet.
  const page = landscape
    ? { width: spec.page.height, height: spec.page.width }
    : spec.page
  const unitsPerPx = spec.screenWidth / spec.page.width
  const screen = useRef<Group>(null)
  const screenHeight = useThree(state => state.size.height)
  // why: the page is drawn at about its size on screen (renderScale); the
  // zoom keeps its layout width, so the site still lays out for the device.
  const [zoom, setZoom] = useState(1)
  const html = useStaticPage(screenUrl)
  const touch = useFinePointer() === false
  const content = useRef<HTMLDivElement>(null)
  const pending = useRef({ zoom: 1, since: 0 })
  const shown = useRef(true)
  useFrame(({ camera, clock }) => {
    const group = screen.current
    if (!group) return
    // why: off stage the page is display:none, so the browser stops drawing
    // it; it stays loaded, and shows at once when the device comes back.
    const onStage = isShown(group)
    if (content.current && onStage !== shown.current) {
      content.current.style.display = onStage ? '' : 'none'
      shown.current = onStage
    }
    const scale = group.getWorldScale(new Vector3()).x
    // why: set while still off stage, so the page enters at its one scale.
    if (touch) {
      const rest = restRenderScale(unitsPerPx * scale, screenHeight)
      if (rest !== zoom) setZoom(rest)
      return
    }
    if (!onStage) return
    const position = group.getWorldPosition(new Vector3())
    const next = renderScale(
      unitsPerPx * scale,
      camera.position.distanceTo(position),
      screenHeight
    )
    const now = clock.elapsedTime
    if (next !== pending.current.zoom)
      pending.current = { zoom: next, since: now }
    else if (next !== zoom && now - pending.current.since >= ZOOM_SETTLE)
      setZoom(next)
  })
  // invariant: with `transform`, drei maps 1 CSS px to distanceFactor / 400
  // units; dividing by the zoom keeps the zoomed page as wide as the display.
  const distanceFactor = (unitsPerPx * 400) / zoom

  return (
    <group>
      <mesh geometry={geometry} material={materials} />
      <group
        ref={screen}
        position={[0, 0, spec.depth / 2 + SCREEN_GAP]}
        rotation-z={landscape ? -Math.PI / 2 : 0}
      >
        {/* why: occlude="blending" lets the body hide the page while its
            back faces the viewer; will-change keeps the CSS-3D paint on the
            glass, as on the laptop. */}
        {settled && (
          <Html
            transform
            wrapperClass="will-change-transform"
            occlude="blending"
            distanceFactor={distanceFactor}
            // why: on touch one stacking order for the visit; drei otherwise
            // rewrites it every frame (task portfolio-lp-mobile-alcance, 4).
            zIndexRange={touch ? STILL_STACK : undefined}
            pointerEvents="none"
            // hazard: left to itself, drei measures the page once to size the
            // hole the page shows through, and on the tablet's turn it read
            // the portrait size, cropping the landscape page; a plane sized
            // from the spec cannot go stale.
            geometry={
              <planeGeometry
                args={[page.width * unitsPerPx, page.height * unitsPerPx]}
              />
            }
          >
            <ScaledPage
              ref={content}
              width={page.width}
              height={page.height}
              scale={zoom}
              className="bg-ink"
            >
              {/* why: same as the laptop's page: a picture, not a site to
                use, so the wheel keeps driving the portfolio. */}
              {screenUrl && html && (
                <iframe
                  // invariant: srcdoc wins over src, which only names the
                  // page this is a script-free copy of (use-static-page.ts).
                  srcDoc={html}
                  src={screenUrl}
                  title={spec.title}
                  width={page.width}
                  height={page.height}
                  tabIndex={-1}
                  aria-hidden
                  // why: a picture of the section, never a page that runs.
                  sandbox="allow-same-origin"
                  scrolling="no"
                  className="pointer-events-none border-0"
                  style={{ borderRadius: spec.pageRadius }}
                />
              )}
            </ScaledPage>
          </Html>
        )}
      </group>
    </group>
  )
}
