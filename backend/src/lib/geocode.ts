interface GeocodeResult {
  latitude: number
  longitude: number
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=pk`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ForiKhoon/1.0 (FYP project - contact: <your-email>)'
    }
  })

  if (!response.ok) {
    return null
  }

  const results = await response.json()

  if (!results || results.length === 0) {
    return null
  }

  return {
    latitude: parseFloat(results[0].lat),
    longitude: parseFloat(results[0].lon)
  }
}