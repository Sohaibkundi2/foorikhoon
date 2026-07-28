interface GeocodeResult {
  latitude: number
  longitude: number
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || !address.trim()) {
    return null
  }

  const trimmed = address.trim()

  // Basic sanity check: too short, or just a repeated character
  if (trimmed.length < 3 || /^(.)\1+$/.test(trimmed)) {
    console.error('Address failed basic sanity check:', trimmed)
    return null
  }

  const url = `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(trimmed)}&format=json&limit=1&countrycodes=pk`

  let response: Response
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': 'ForiKhoon/1.0 (contact: your-email)' }
    })
  } catch (err) {
    console.error('Nominatim network error:', err)
    return null
  }

  if (!response.ok) {
    console.error('Nominatim request failed:', response.status)
    return null
  }

  let results: any[]
  try {
    results = await response.json()
  } catch (err) {
    console.error('Nominatim returned invalid JSON:', err)
    return null
  }

  if (!Array.isArray(results) || results.length === 0) {
    return null
  }

  const MIN_IMPORTANCE = 0.1
  if (results[0].importance !== undefined && results[0].importance < MIN_IMPORTANCE) {
    console.error('Nominatim match too low-confidence, rejecting:', results[0].importance, trimmed)
    return null
  }

  const lat = parseFloat(results[0].lat)
  const lon = parseFloat(results[0].lon)

  const PAKISTAN_BOUNDS = { minLat: 23.5, maxLat: 37.5, minLon: 60.5, maxLon: 77.5 }

  if (
    isNaN(lat) || isNaN(lon) ||
    (lat === 0 && lon === 0) ||
    lat < PAKISTAN_BOUNDS.minLat || lat > PAKISTAN_BOUNDS.maxLat ||
    lon < PAKISTAN_BOUNDS.minLon || lon > PAKISTAN_BOUNDS.maxLon
  ) {
    console.error('Nominatim returned an out-of-bounds or invalid coordinate:', lat, lon)
    return null
  }

  return { latitude: lat, longitude: lon }
}