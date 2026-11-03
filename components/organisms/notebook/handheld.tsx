'use client'
import { Html } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import { ExtrudeGeometry, MeshStandardMaterial, Shape } from 'three'
import { readColorToken } from '@/lib/color-tokens'

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
  // invariant: with `transform`, drei maps 1 CSS px to distanceFactor / 400
  // units, so the page is exactly as wide as the display.
  const unitsPerPx = spec.screenWidth / spec.page.width
  const distanceFactor = unitsPerPx * 400

  return (
    <group>
      <mesh geometry={geometry} material={materials} />
      <group
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
            <div
              className="bg-ink"
              style={{ width: page.width, height: page.height }}
            >
              {/* why: same as the laptop's page: a picture, not a site to
                use, so the wheel keeps driving the portfolio. */}
              {screenUrl && (
                <iframe
                  src={screenUrl}
                  title={spec.title}
                  width={page.width}
                  height={page.height}
                  tabIndex={-1}
                  aria-hidden
                  sandbox="allow-scripts allow-same-origin"
                  scrolling="no"
                  className="pointer-events-none border-0"
                  style={{ borderRadius: spec.pageRadius }}
                />
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  )
}
