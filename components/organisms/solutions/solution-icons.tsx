import type { ReactNode } from 'react'
import type { SolutionModel } from '@/components/organisms/glass-stage'

/**
 * Each glass model drawn flat, in strokes on a 24-unit grid: the icon where
 * the device cannot afford the glass, and its stand-in until the model
 * has loaded (task portfolio-lp-mobile-smooth, 3-6).
 */
export const SOLUTION_ICONS: Record<SolutionModel, ReactNode> = {
  atom: (
    <>
      <circle cx="12" cy="12" r="1.5" />
      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" />
      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)" />
      <ellipse
        cx="12"
        cy="12"
        rx="9.5"
        ry="3.8"
        transform="rotate(120 12 12)"
      />
    </>
  ),
  brick: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M3 12h18M12 6v6M7.5 12v6M16.5 12v6" />
    </>
  ),
  cursor: <path d="M6 3v16l4.5-4.2 3 6.2 2.6-1.2-3-6.2 6-.4z" />,
  flag: <path d="M6 21V3M6 4h12l-3 4 3 4H6" />,
  note: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4M9 11h7M9 14.5h7M9 18h4" />
    </>
  ),
  wave: (
    <path d="M2 9c1.7-3 3.3-3 5 0s3.3 3 5 0 3.3-3 5 0 3.3 3 5 0M2 15c1.7-3 3.3-3 5 0s3.3 3 5 0 3.3-3 5 0 3.3 3 5 0" />
  )
}
