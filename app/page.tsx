import type { ReactNode } from 'react'
import { HeroCopy } from '@/components/molecules/hero-copy'
import { About } from '@/components/organisms/about'
import { Cases } from '@/components/organisms/cases'
import { Contact } from '@/components/organisms/contact'
import { Faq } from '@/components/organisms/faq'
import { Hero } from '@/components/organisms/hero'
import { Notebook } from '@/components/organisms/notebook'
import { ParallaxField } from '@/components/organisms/parallax-field'
import { SectionsBackdrop } from '@/components/organisms/sections-backdrop'
import { SocialProof } from '@/components/organisms/social-proof'
import { Solutions } from '@/components/organisms/solutions'
import { Testimonials } from '@/components/organisms/testimonials'
import { Workflow } from '@/components/organisms/workflow'

// why: isolate keeps the backdrop and parallax layers' z-index inside each
// block, behind and over its sections but never the hero or the notebook.
const Decorated = ({ children }: { children: ReactNode }) => (
  <div className="relative isolate">
    <SectionsBackdrop />
    <ParallaxField />
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
        <Decorated>
          <SocialProof />
          <About />
          <Solutions />
        </Decorated>
        <Notebook id="notebook" />
        <Decorated>
          <Cases />
          <Workflow />
          <Testimonials />
          <Faq />
          <Contact />
        </Decorated>
      </main>
      <footer></footer>
    </>
  )
}
