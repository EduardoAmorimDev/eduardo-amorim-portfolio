import { useEffect, useState } from 'react'

// why: one request per page for every frame that shows it (the carousel's
// three devices share one), kept for the visit.
const pages = new Map<string, Promise<string>>()

// why: a same-site frame runs its page's app on this page's main thread,
// which stalled the carousel, and a sandbox that forbids scripts leaves
// the frame logging one blocked-script error per tag; a copy of the page
// without its scripts is the picture it is meant to be, quietly.
const stripScripts = (html: string) => {
  const page = new DOMParser().parseFromString(html, 'text/html')
  page
    .querySelectorAll(
      'script, link[rel="modulepreload"], link[rel="preload"][as="script"]'
    )
    .forEach(node => node.remove())
  // why: a picture holds still; a glow drifting inside a page drawn in 3D
  // made the browser paint that page again on every frame, which showed as
  // jank and flicker on phones (task portfolio-lp-mobile-alcance, 1).
  const still = page.createElement('style')
  still.textContent =
    '*,*::before,*::after{animation:none!important;transition:none!important}'
  page.head.append(still)
  return `<!doctype html>${page.documentElement.outerHTML}`
}

const loadStaticPage = (url: string) => {
  const cached = pages.get(url)
  if (cached) return cached
  const page = fetch(url).then(async response => {
    if (!response.ok) throw new Error(`${url}: ${response.status}`)
    return stripScripts(await response.text())
  })
  pages.set(url, page)
  // invariant: a failed load is forgotten, so a later frame tries again.
  page.catch(() => pages.delete(url))
  return page
}

/**
 * The HTML of `url` without its scripts, for an iframe's `srcdoc`, or null
 * while loading, when `url` is undefined, or when it cannot be loaded.
 */
export const useStaticPage = (url: string | undefined) => {
  const [page, setPage] = useState<{ url: string; html: string } | null>(null)

  useEffect(() => {
    if (!url) return
    let current = true
    loadStaticPage(url)
      .then(html => {
        if (current) setPage({ url, html })
      })
      // why: without the page the device shows its black glass, which reads
      // as a screen still off; nothing else needs to know.
      .catch(() => undefined)
    return () => {
      current = false
    }
  }, [url])

  return page && page.url === url ? page.html : null
}
