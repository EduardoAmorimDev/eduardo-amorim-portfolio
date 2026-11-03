import type { Metadata } from 'next'
import { Cases } from '@/components/organisms/cases'
import { SectionsBackdrop } from '@/components/organisms/sections-backdrop'

// why: a picture shown inside the device screens, never a page of its own.
export const metadata: Metadata = {
  robots: { index: false, follow: false }
}

/**
 * The projects section alone, as the notebook's devices show it: framed at
 * each device's width, it lays itself out exactly as the real section does
 * at that width, which is what lets the laptop hand over to the real page.
 */
export default function ProjectsEmbed() {
  return (
    // invariant: same wrapper as the page's block around the cases
    // (relative isolate + SectionsBackdrop), so both draw the same glows.
    <main className="relative isolate min-h-svh">
      <SectionsBackdrop />
      <Cases />
    </main>
  )
}
