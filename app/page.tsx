import type { ReactNode } from 'react'
import { HeroCopy } from '@/components/molecules/hero-copy'
import { About } from '@/components/organisms/about'
import { Cases } from '@/components/organisms/cases'
import { Faq } from '@/components/organisms/faq'
import { GlassCursor, GlassStage } from '@/components/organisms/glass-stage'
import { Hero } from '@/components/organisms/hero'
import { Notebook } from '@/components/organisms/notebook'
import { ParallaxField } from '@/components/organisms/parallax-field'
import { SectionsBackdrop } from '@/components/organisms/sections-backdrop'
import { SocialProof } from '@/components/organisms/social-proof'
import { Solutions } from '@/components/organisms/solutions'
import { Testimonials } from '@/components/organisms/testimonials'
import { Workflow } from '@/components/organisms/workflow'
import { YouAreHere } from '@/components/organisms/you-are-here'
import type { SkyFade } from '@/lib/sky-fade'

// why: isolate keeps the backdrop and parallax layers' z-index inside each
// block, behind and over its sections but never the hero or the notebook.
// `under` runs the sky a screen past the block, beneath the notebook's stage,
// which stays clear while it enters, so both read as one sky.
const Decorated = ({
  children,
  className = '',
  fade,
  under = false
}: {
  children: ReactNode
  className?: string
  fade?: SkyFade
  under?: boolean
}) => (
  <div className={`relative isolate ${className}`}>
    <div
      data-block-sky
      className={`pointer-events-none absolute inset-x-0 top-0 ${under ? '-bottom-[100lvh]' : 'bottom-0'}`}
    >
      <SectionsBackdrop fade={fade} />
      <ParallaxField fade={fade} />
    </div>
    {children}
  </div>
)

export default function Home() {
  return (
    <>
      <header></header>
      <main>
        <Hero id="hero">
          <HeroCopy />
        </Hero>
        <Decorated fade="both" under>
          <SocialProof />
          <About />
          <Solutions />
        </Decorated>
        <Notebook id="notebook" />
        {/* why: pulled up a screen, under the notebook's last one, so the
            cases sit exactly where the laptop's page fills the window when
            the notebook lets go; lvh, the stage's own height. */}
        <Decorated className="-mt-[100lvh]">
          <Cases />
          <Workflow />
          <Testimonials />
          <Faq />
          <YouAreHere id="contato" />
        </Decorated>
      </main>
      <footer></footer>
      <GlassStage />
      <GlassCursor />
    </>
  )
}
