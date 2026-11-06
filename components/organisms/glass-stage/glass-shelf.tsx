'use client'
import type { ReactNode } from 'react'
import { useFinePointer } from '@/lib/use-fine-pointer'
import { useLiteMode } from '@/lib/use-lite-mode'
import { FlatIconsContext } from './shelf-context'

/**
 * Holds the solution cards and tells their icons how to draw: as glass on
 * the page's GlassStage with a fine pointer, flat on touch and in lite
 * (task portfolio-lp-mobile-smooth, 3 and 7).
 */
export const GlassShelf = ({ children }: { children: ReactNode }) => {
  const fine = useFinePointer()
  const lite = useLiteMode()
  return (
    <FlatIconsContext.Provider value={fine === false || lite}>
      {children}
    </FlatIconsContext.Provider>
  )
}
