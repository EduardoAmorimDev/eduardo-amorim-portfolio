import { createContext } from 'react'

/**
 * Whether the icons inside a GlassShelf are drawn flat: on touch and in
 * lite, where the glass cost a canvas and half a megabyte of models (task
 * portfolio-lp-mobile-smooth, 3); false where GlassStage draws the glass.
 */
export const FlatIconsContext = createContext(false)
