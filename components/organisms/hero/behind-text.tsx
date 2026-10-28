'use client'
import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { readColorToken } from '@/lib/color-tokens'
import { BEHIND_LAYER } from './black-hole'

// why: a wall of placeholder text behind the black hole, so its lens can be
// read everywhere (task black-hole-flow, 7–9): 18 px type on 28 px lines,
// mist at 40%, in blocks of 4 to 8 lines a blank line apart, at z = −4,
// behind the glass icons (z = −3).
const WALL = {
  depth: -4,
  /** The layer behind is drawn this many heroes wide (bent-light.tsx). */
  overscan: 2,
  size: 18,
  leading: 28,
  opacity: 0.4,
  column: 420,
  gutter: 60,
  blockLines: [5, 8, 4, 6, 7, 4, 6, 5]
} as const

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'

/**
 * Paints the wall on a canvas `width` × `height` CSS px: columns of text
 * blocks from edge to edge, the words running on from block to block.
 */
const paintWall = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return null
  const family = getComputedStyle(document.body).fontFamily
  context.font = `${WALL.size}px ${family}`
  context.fillStyle = readColorToken('mist')
  context.globalAlpha = WALL.opacity
  context.textBaseline = 'top'
  const words = LOREM.split(' ')
  let word = 0
  let block = 0
  for (let x = WALL.gutter / 2; x < width; x += WALL.column + WALL.gutter) {
    let y = WALL.leading / 2
    while (y < height) {
      const lines = WALL.blockLines[block++ % WALL.blockLines.length] ?? 5
      for (let line = 0; line < lines && y < height; line++) {
        let text = ''
        for (;;) {
          const next = words[word % words.length] ?? ''
          const tried = text ? `${text} ${next}` : next
          if (text && context.measureText(tried).width > WALL.column) break
          text = tried
          word++
        }
        context.fillText(text, x, y)
        y += WALL.leading
      }
      y += WALL.leading
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * The text wall behind the black hole, on its layer behind, so it is only
 * seen through its lens; still, like the icons. Painted once the page's
 * fonts have loaded, so it never shows in a fallback face.
 */
export const BehindText = () => {
  const size = useThree(state => state.size)
  const camera = useThree(state => state.camera)
  const viewport = useThree(state => state.viewport)
  const [texture, setTexture] = useState<CanvasTexture | null>(null)

  useEffect(() => {
    let alive = true
    let painted: CanvasTexture | null = null
    void document.fonts.ready.then(() => {
      if (!alive) return
      painted = paintWall(
        Math.round(size.width * WALL.overscan),
        Math.round(size.height * WALL.overscan)
      )
      setTexture(painted)
    })
    return () => {
      alive = false
      painted?.dispose()
    }
  }, [size.width, size.height])

  // invariant: the wall spans the overscanned view at its depth, so one
  // canvas px is one screen px there.
  const view = viewport.getCurrentViewport(camera, [0, 0, WALL.depth], size)
  if (!texture) return null
  return (
    <mesh
      ref={mesh => mesh?.layers.set(BEHIND_LAYER)}
      position={[0, 0, WALL.depth]}
      scale={[view.width * WALL.overscan, view.height * WALL.overscan, 1]}
    >
      <planeGeometry />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  )
}
