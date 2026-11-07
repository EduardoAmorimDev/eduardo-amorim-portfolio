import { useSyncExternalStore } from 'react'
import { prefersFinePointer } from './media-preferences'

// invariant: read once per visit, so the glass never moves between canvases
// mid-visit (task portfolio-lp-mobile, Unresolved 5).
let first: boolean | undefined
/** Whether the device points with a mouse or trackpad, as first read. */
export const isFinePointer = () => (first ??= prefersFinePointer())
const snapshot = isFinePointer
const unchanging = () => () => {}

/**
 * Whether the device points with a mouse or trackpad: null on the server,
 * then the answer the browser gave when the page first asked.
 */
export const useFinePointer = () =>
  useSyncExternalStore<boolean | null>(unchanging, snapshot, () => null)
