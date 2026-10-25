import { HeroCopy } from '@/components/molecules/hero-copy'
import { About } from '@/components/organisms/about'
import { Cases } from '@/components/organisms/cases'
import { Contact } from '@/components/organisms/contact'
import { Faq } from '@/components/organisms/faq'
import { LaptopHero } from '@/components/organisms/laptop-hero'
import { ParallaxField } from '@/components/organisms/parallax-field'
import { SectionsBackdrop } from '@/components/organisms/sections-backdrop'
import { SocialProof } from '@/components/organisms/social-proof'
import { Solutions } from '@/components/organisms/solutions'
import { Testimonials } from '@/components/organisms/testimonials'
import { Workflow } from '@/components/organisms/workflow'

export default function Home() {
  return (
    <>
      <header></header>
      <main>
        <LaptopHero id="hero">
          <HeroCopy />
        </LaptopHero>
        {/* why: isolate keeps the backdrop and parallax layers' z-index inside
            this block, behind and over the sections but never the hero. */}
        <div className="relative isolate">
          <SectionsBackdrop />
          <ParallaxField />
          <SocialProof />
          <About />
          <Solutions />
          <Cases />
          <Workflow />
          <Testimonials />
          <Faq />
          <Contact />
        </div>
      </main>
      <footer></footer>
    </>
  )
}
