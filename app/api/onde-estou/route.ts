// why: the visitor's approximate place, from the geolocation Vercel's edge
// already derives from the request's IP (x-vercel-ip-* headers); it goes
// back to that same visitor only, to pin the globe, and is never stored or
// logged. Outside Vercel the headers are absent and the answer is 204.

const parseCoordinate = (value: string | null, limit: number) => {
  if (value === null) return null
  const number = Number(value)
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null
}

const decode = (value: string | null) => {
  if (!value) return undefined
  try {
    return decodeURIComponent(value)
  } catch {
    return undefined
  }
}

// hazard: the answer differs per visitor; any shared cache would hand one
// visitor's city to the next, so nothing may store it.
const PRIVATE = { 'Cache-Control': 'private, no-store' }

export async function GET(request: Request) {
  const latitude = parseCoordinate(
    request.headers.get('x-vercel-ip-latitude'),
    90
  )
  const longitude = parseCoordinate(
    request.headers.get('x-vercel-ip-longitude'),
    180
  )
  if (latitude === null || longitude === null) {
    return new Response(null, { status: 204, headers: PRIVATE })
  }
  return Response.json(
    {
      latitude,
      longitude,
      city: decode(request.headers.get('x-vercel-ip-city')),
      country: request.headers.get('x-vercel-ip-country') ?? undefined
    },
    { headers: PRIVATE }
  )
}
