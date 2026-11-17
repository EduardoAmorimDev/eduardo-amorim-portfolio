'use client'
import type { ReactNode } from 'react'
import { useFinePointer } from '@/lib/use-fine-pointer'
import { useTier } from '@/lib/use-lite-mode'
import { FlatIconsContext } from './shelf-context'

/**
 * Holds the solution cards and tells their icons how to draw: as glass on
 * the page's GlassStage with a fine pointer in the full tier, flat
 * everywhere else, and until the tier is known (task
 * portfolio-lp-device-gate, 12, 13).
 */
export const GlassShelf = ({ children }: { children: ReactNode }) => {
  const fine = useFinePointer()
  const tier = useTier()
  return (
    <FlatIconsContext.Provider value={fine !== true || tier !== 'full'}>
      {children}
    </FlatIconsContext.Provider>
  )
}
