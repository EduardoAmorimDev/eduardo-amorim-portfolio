import type { RootState } from '@react-three/fiber'
import { useCallback, useState } from 'react'

// why: a browser that drops a WebGL context (GPU under pressure, too many
// contexts) may never hand it back; past this wait the canvas is rebuilt.
export const RESTORE_WAIT_MS = 1000

/**
 * `key` and `onCreated` for a `<Canvas>` that rebuilds it with a fresh
 * context once a lost one is restored or RESTORE_WAIT_MS has passed; three
 * left the old scene blank after a restore, and the devices vanished.
 */
export const useCanvasRecovery = () => {
  const [generation, setGeneration] = useState(0)
  const onCreated = useCallback(({ gl }: RootState) => {
    const canvas = gl.domElement
    let wait = 0
    const rebuild = () => {
      window.clearTimeout(wait)
      setGeneration(current => current + 1)
    }
    canvas.addEventListener('webglcontextlost', () => {
      window.clearTimeout(wait)
      wait = window.setTimeout(rebuild, RESTORE_WAIT_MS)
    })
    canvas.addEventListener('webglcontextrestored', rebuild)
  }, [])
  return { key: generation, onCreated }
}
