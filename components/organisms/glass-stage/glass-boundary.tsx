'use client'
import { Component, type ReactNode } from 'react'

type GlassBoundaryProps = { children: ReactNode }
type GlassBoundaryState = { failed: boolean }

/**
 * Draws nothing in place of a glass model that failed to load, so the page
 * keeps what it showed before: the card's glyph, the native cursor (task
 * reach-and-seams, 16 and 25).
 */
export class GlassBoundary extends Component<
  GlassBoundaryProps,
  GlassBoundaryState
> {
  state: GlassBoundaryState = { failed: false }

  static getDerivedStateFromError(): GlassBoundaryState {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
