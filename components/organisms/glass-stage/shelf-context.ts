import { createContext } from 'react'
import type { GlassModel } from './glass-motion'

/** A box on the page a glass icon is drawn in, and the model it holds. */
export type ShelfSlot = {
  element: HTMLElement
  model: GlassModel
  onReady: () => void
}

/** Where a GlassIcon on touch hands its box to the GlassShelf around it. */
export type ShelfApi = {
  /** Adds, or with null removes, the slot under `id`. */
  register: (id: string, slot: ShelfSlot | null) => void
}

/** The GlassShelf around an icon, on touch; null where GlassStage draws it. */
export const ShelfContext = createContext<ShelfApi | null>(null)
