'use client'
import { Box, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Mesh } from 'three'
import { readColorToken } from '@/lib/color-tokens'

// why: a child of <Canvas> renders only in the browser, after mount, which is
// when the theme's CSS variables can be read.
const Scene = () => {
  const ref = useRef<Mesh>(null)
  const color = useMemo(() => readColorToken('ink'), [])
  return (
    <>
      <Box
        ref={ref}
        position={[0, 0, 0]}
        scale={2}
        castShadow
        material-color={color}
      />
      <OrbitControls enableZoom={false} />
    </>
  )
}

export const CustomCanvas = () => (
  <Canvas id="canvas" className="absolute top-0 left-0 z-0 h-full w-full">
    <Scene />
  </Canvas>
)
