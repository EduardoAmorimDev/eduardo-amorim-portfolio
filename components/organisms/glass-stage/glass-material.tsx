'use client'
import { MeshTransmissionMaterial, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { createContext, useContext, useEffect, useMemo } from 'react'
import {
  CanvasTexture,
  Mesh,
  SRGBColorSpace,
  type BufferGeometry,
  type Matrix4,
  type Scene,
  type Texture
} from 'three'
import { readColorToken } from '@/lib/color-tokens'
import { modelUrl, type GlassModel } from './glass-motion'

// why: diagonal bands, repeated so every icon spans several of them; the
// refraction bends them inside the glass, which is what reads as glass.
const BACKDROP = { size: 512, repeats: 4 }

/**
 * What the glass refracts in place of a scene behind it: the brand's violet
 * with mist streaks and steel shadows (as in a7cf52c^, glass-elements.tsx).
 */
export const createBackdrop = () => {
  const canvas = document.createElement('canvas')
  canvas.width = BACKDROP.size
  canvas.height = BACKDROP.size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is not available for the glass.')
  const primary = readColorToken('primary')
  const bands = [
    readColorToken('steel'),
    primary,
    readColorToken('mist'),
    primary,
    primary
  ]
  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  )
  const stops = bands.length * BACKDROP.repeats
  for (let i = 0; i <= stops; i++) {
    gradient.addColorStop(i / stops, bands[i % bands.length])
  }
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

type GlassShared = { backdrop: Texture; rootScene: Scene }

/** The backdrop and the stage's own scene, whose environment every view uses. */
export const GlassContext = createContext<GlassShared | null>(null)

const useGlass = () => {
  const shared = useContext(GlassContext)
  if (!shared) throw new Error('Glass models must render inside <GlassStage>.')
  return shared
}

/**
 * Lends the stage's studio reflections to a view's own scene; a view renders
 * a scene of its own, which has no environment otherwise.
 */
export const SharedEnvironment = () => {
  const { rootScene } = useGlass()
  useFrame(({ scene }) => {
    if (scene.environment !== rootScene.environment)
      scene.environment = rootScene.environment
  })
  return null
}

type Part = { key: string; geometry: BufferGeometry; matrix: Matrix4 }

type GlassMeshProps = {
  name: GlassModel
  /** Called once the model has loaded and is drawn. */
  onReady?: () => void
}

/** One glass model, every mesh of it in the brand's glass. */
export const GlassMesh = ({ name, onReady }: GlassMeshProps) => {
  const { backdrop } = useGlass()
  const { scene } = useGLTF(modelUrl(name), false)

  // why: each mesh is re-rendered with its transform baked into one matrix,
  // so the model's own material and nested groups are never mutated.
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true)
    const found: Part[] = []
    scene.traverse(object => {
      if (object instanceof Mesh) {
        const { uuid, geometry, matrixWorld } = object
        found.push({ key: uuid, geometry, matrix: matrixWorld.clone() })
      }
    })
    return found
  }, [scene])

  useEffect(() => {
    onReady?.()
  }, [onReady])

  return (
    <>
      {parts.map(part => (
        <mesh
          key={part.key}
          geometry={part.geometry}
          matrix={part.matrix}
          matrixAutoUpdate={false}
        >
          {/* invariant: the glass of a7cf52c^ (task reach-and-seams, 14); a
              given `buffer` makes drei skip its per-frame scene render. */}
          <MeshTransmissionMaterial
            buffer={backdrop}
            transparent
            opacity={0.7}
            samples={4}
            thickness={0.35}
            roughness={0.04}
            ior={1.45}
            chromaticAberration={0.3}
            // hazard: blur and distortion jitter every pixel with noise,
            // which showed as grain on the glass; both stay off.
            anisotropicBlur={0}
            distortion={0}
            clearcoat={1}
            clearcoatRoughness={0.05}
            iridescence={1}
            iridescenceIOR={1.3}
            iridescenceThicknessRange={[200, 420]}
            envMapIntensity={2}
          />
        </mesh>
      ))}
    </>
  )
}
