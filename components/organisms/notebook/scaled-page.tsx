import type { ReactNode, Ref } from 'react'

type ScaledPageProps = {
  /** The page's own size in CSS px, the size its layout keeps. */
  width: number
  height: number
  /** How much smaller the page is drawn (`renderScale`), 0..1. */
  scale: number
  /** Corner radius in the page's own CSS px. */
  radius?: number
  className?: string
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
}

/**
 * A device's page laid out at its own size and drawn `scale` times as
 * large, inside a box that cuts it to that drawn size. A transform, never
 * CSS `zoom`: WebKit leaves a zoomed iframe's document unzoomed, so it laid
 * out in the shrunken box and spilled off the glass (task
 * portfolio-lp-mobile, 8-9).
 */
export const ScaledPage = ({
  width,
  height,
  scale,
  radius = 0,
  className = '',
  children,
  ref
}: ScaledPageProps) => (
  <div
    ref={ref}
    data-scaled-page
    style={{
      width: width * scale,
      height: height * scale,
      borderRadius: radius * scale,
      overflow: 'hidden'
    }}
  >
    <div
      className={`relative ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        transform: `scale(${scale})`,
        transformOrigin: '0 0'
      }}
    >
      {children}
    </div>
  </div>
)
