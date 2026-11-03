/** Where the visitor roughly is, to pin it on the globe. */
export type VisitorPlace = {
  latitude: number
  longitude: number
  city?: string
  /** Guessed from the time zone: a region, never a city to name. */
  approximate?: boolean
}

const PLACE_ROUTE = '/api/onde-estou'

// why: the fallback when the host gives no geolocation (outside Vercel, on
// localhost): the browser's time zone names a city, close enough for a pin
// on a globe; no IP, no request. Coordinates of each zone's namesake city.
const ZONES: Record<string, VisitorPlace> = {
  'America/Sao_Paulo': {
    latitude: -23.55,
    longitude: -46.63,
    city: 'São Paulo'
  },
  'America/Bahia': { latitude: -12.97, longitude: -38.5, city: 'Salvador' },
  'America/Fortaleza': {
    latitude: -3.73,
    longitude: -38.52,
    city: 'Fortaleza'
  },
  'America/Recife': { latitude: -8.05, longitude: -34.88, city: 'Recife' },
  'America/Belem': { latitude: -1.46, longitude: -48.5, city: 'Belém' },
  'America/Manaus': { latitude: -3.12, longitude: -60.02, city: 'Manaus' },
  'America/Cuiaba': { latitude: -15.6, longitude: -56.1, city: 'Cuiabá' },
  'America/Campo_Grande': {
    latitude: -20.44,
    longitude: -54.65,
    city: 'Campo Grande'
  },
  'America/Porto_Velho': {
    latitude: -8.76,
    longitude: -63.9,
    city: 'Porto Velho'
  },
  'America/Rio_Branco': {
    latitude: -9.97,
    longitude: -67.81,
    city: 'Rio Branco'
  },
  'America/Argentina/Buenos_Aires': {
    latitude: -34.6,
    longitude: -58.38,
    city: 'Buenos Aires'
  },
  'America/Santiago': { latitude: -33.45, longitude: -70.67, city: 'Santiago' },
  'America/Montevideo': {
    latitude: -34.9,
    longitude: -56.16,
    city: 'Montevidéu'
  },
  'America/Asuncion': { latitude: -25.26, longitude: -57.58, city: 'Assunção' },
  'America/Lima': { latitude: -12.05, longitude: -77.04, city: 'Lima' },
  'America/Bogota': { latitude: 4.71, longitude: -74.07, city: 'Bogotá' },
  'America/Caracas': { latitude: 10.48, longitude: -66.9, city: 'Caracas' },
  'America/Mexico_City': {
    latitude: 19.43,
    longitude: -99.13,
    city: 'Cidade do México'
  },
  'America/New_York': { latitude: 40.71, longitude: -74.01, city: 'Nova York' },
  'America/Chicago': { latitude: 41.88, longitude: -87.63, city: 'Chicago' },
  'America/Denver': { latitude: 39.74, longitude: -104.99, city: 'Denver' },
  'America/Los_Angeles': {
    latitude: 34.05,
    longitude: -118.24,
    city: 'Los Angeles'
  },
  'America/Toronto': { latitude: 43.65, longitude: -79.38, city: 'Toronto' },
  'America/Vancouver': {
    latitude: 49.28,
    longitude: -123.12,
    city: 'Vancouver'
  },
  'Europe/Lisbon': { latitude: 38.72, longitude: -9.14, city: 'Lisboa' },
  'Europe/London': { latitude: 51.51, longitude: -0.13, city: 'Londres' },
  'Europe/Dublin': { latitude: 53.35, longitude: -6.26, city: 'Dublin' },
  'Europe/Madrid': { latitude: 40.42, longitude: -3.7, city: 'Madri' },
  'Europe/Paris': { latitude: 48.86, longitude: 2.35, city: 'Paris' },
  'Europe/Berlin': { latitude: 52.52, longitude: 13.4, city: 'Berlim' },
  'Europe/Amsterdam': { latitude: 52.37, longitude: 4.9, city: 'Amsterdã' },
  'Europe/Rome': { latitude: 41.9, longitude: 12.5, city: 'Roma' },
  'Europe/Zurich': { latitude: 47.37, longitude: 8.54, city: 'Zurique' },
  'Europe/Stockholm': { latitude: 59.33, longitude: 18.07, city: 'Estocolmo' },
  'Europe/Warsaw': { latitude: 52.23, longitude: 21.01, city: 'Varsóvia' },
  'Europe/Istanbul': { latitude: 41.01, longitude: 28.98, city: 'Istambul' },
  'Europe/Moscow': { latitude: 55.76, longitude: 37.62, city: 'Moscou' },
  'Africa/Lagos': { latitude: 6.52, longitude: 3.38, city: 'Lagos' },
  'Africa/Cairo': { latitude: 30.04, longitude: 31.24, city: 'Cairo' },
  'Africa/Johannesburg': {
    latitude: -26.2,
    longitude: 28.05,
    city: 'Joanesburgo'
  },
  'Africa/Luanda': { latitude: -8.84, longitude: 13.23, city: 'Luanda' },
  'Africa/Maputo': { latitude: -25.97, longitude: 32.57, city: 'Maputo' },
  'Asia/Dubai': { latitude: 25.2, longitude: 55.27, city: 'Dubai' },
  'Asia/Kolkata': { latitude: 22.57, longitude: 88.36, city: 'Calcutá' },
  'Asia/Singapore': { latitude: 1.35, longitude: 103.82, city: 'Singapura' },
  'Asia/Shanghai': { latitude: 31.23, longitude: 121.47, city: 'Xangai' },
  'Asia/Hong_Kong': { latitude: 22.32, longitude: 114.17, city: 'Hong Kong' },
  'Asia/Tokyo': { latitude: 35.68, longitude: 139.69, city: 'Tóquio' },
  'Asia/Seoul': { latitude: 37.57, longitude: 126.98, city: 'Seul' },
  'Australia/Sydney': { latitude: -33.87, longitude: 151.21, city: 'Sydney' },
  'Australia/Melbourne': {
    latitude: -37.81,
    longitude: 144.96,
    city: 'Melbourne'
  },
  'Pacific/Auckland': { latitude: -36.85, longitude: 174.76, city: 'Auckland' }
}

const isCoordinate = (value: unknown, limit: number): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Math.abs(value) <= limit

/** Validates the route's answer; anything else is treated as no answer. */
const asPlace = (data: unknown): VisitorPlace | null => {
  if (typeof data !== 'object' || data === null) return null
  const { latitude, longitude, city } = data as Record<string, unknown>
  if (!isCoordinate(latitude, 90) || !isCoordinate(longitude, 180)) return null
  return {
    latitude,
    longitude,
    city: typeof city === 'string' ? city : undefined
  }
}

// why: one zone spans many cities (America/Sao_Paulo covers most of
// Brazil, Rio Grande do Sul included), so its city is only where the pin
// goes, never a place to tell the visitor they are in.
const fromTimeZone = (): VisitorPlace | null => {
  const zone = ZONES[Intl.DateTimeFormat().resolvedOptions().timeZone]
  return zone
    ? { latitude: zone.latitude, longitude: zone.longitude, approximate: true }
    : null
}

/**
 * The visitor's place: the host's IP geolocation when it has one, else the
 * browser's time zone, else null (no pin). Never throws.
 */
export const findVisitorPlace = async (
  signal?: AbortSignal
): Promise<VisitorPlace | null> => {
  try {
    const response = await fetch(PLACE_ROUTE, { cache: 'no-store', signal })
    if (response.ok && response.status !== 204) {
      const place = asPlace(await response.json())
      if (place) return place
    }
  } catch {
    // invariant: an aborted lookup ends silently; any other failure (no
    // network, bad JSON) falls through to the time zone below.
    if (signal?.aborted) return null
  }
  return fromTimeZone()
}
