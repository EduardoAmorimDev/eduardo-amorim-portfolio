import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // why: browsers ask for /favicon.ico on their own, past the themed icons
  // in app/layout.tsx; answering with the light one ends the 404.
  rewrites: async () => [
    { source: '/favicon.ico', destination: '/favicon_light.ico' }
  ],
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css'
      }
    }
  }
}

export default nextConfig
