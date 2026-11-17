import { captureTarget } from './capture'
import { BENCHMARKS_URL, startCheck } from './performance-tier'
import { isFinePointer } from './use-fine-pointer'

/**
 * Decides this visit's tier (lib/performance-tier.ts) from this browser:
 * detect-gpu reads the GPU through a context of our own, freed once read.
 */
export const checkThisDevice = () =>
  startCheck(() => {
    // why: the still renderer (scripts/render-stills.mjs) shoots the live
    // scenes in a software GPU that would never pass.
    if (captureTarget()) return 'full'
    const gl = document.createElement('canvas').getContext('webgl')
    return {
      measure: async () => {
        const { getGPUTier } = await import('detect-gpu')
        return getGPUTier({
          benchmarksURL: BENCHMARKS_URL,
          glContext: gl ?? undefined
        })
      },
      release: () => gl?.getExtension('WEBGL_lose_context')?.loseContext(),
      device: {
        finePointer: isFinePointer(),
        cores: navigator.hardwareConcurrency
      }
    }
  })
