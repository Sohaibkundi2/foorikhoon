'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '@/lib/api'

interface CityStats {
  city: string
  activeDonors: number
  activeRequests: number
}

const cityCoords: Record<string, [number, number]> = {
  'DI Khan':   [31.8314, 70.9019],
  'Tank':      [32.2189, 70.3779],
  'Peshawar':  [34.0151, 71.5249],
  'Islamabad': [33.6844, 73.0479],
}

export default function Map() {
  const [cities, setCities] = useState<CityStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/map/stats')
      .then(res => setCities(res.data.cities))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="h-[450px] animate-pulse rounded-xl border border-line bg-surface" />
  }

  const getColor = (requests: number) => {
    if (requests >= 5) return '#DC2626'   // red - high demand
    if (requests >= 2) return '#EA580C'   // orange - moderate
    return '#16A34A'                       // green - low
  }

  const getRadius = (donors: number, requests: number) => {
    const base = 20
    const requestWeight = requests * 8
    const donorWeight = donors * 2
    return Math.min(base + requestWeight + donorWeight, 80)
  }

  // Legend rows are driven off the same thresholds as getColor, so the swatches
  // cannot drift from what the map actually draws.
  const legend = [
    { color: getColor(5), label: 'High demand', range: '5+' },
    { color: getColor(2), label: 'Moderate', range: '2–4' },
    { color: getColor(0), label: 'Low', range: '0–1' },
  ]

  return (
    <div>
      {/* The fixed height and the clipping stay on this element alone. The legend
          used to sit inside it, below a 100%-height map, so `overflow-hidden`
          cut it off and it never rendered on the page at all. */}
      <div className="overflow-hidden rounded-xl border border-line" style={{ height: '450px' }}>
        <MapContainer
          center={[32.5, 71.5]}
          zoom={7}
          style={{ height: '100%', width: '100%', background: '#0A0A0A' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {cities.map((city) => {
            const coords = cityCoords[city.city]
            if (!coords) return null

            return (
              <CircleMarker
                key={city.city}
                center={coords}
                radius={getRadius(city.activeDonors, city.activeRequests)}
                pathOptions={{
                  color: getColor(city.activeRequests),
                  fillColor: getColor(city.activeRequests),
                  fillOpacity: 0.25,
                  weight: 2,
                }}
              >
                <Popup className="dark-popup">
                  <div style={{
                    background: '#111010',
                    border: '1px solid #221E1E',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    minWidth: '170px',
                    color: '#F4F1EC',
                    fontFamily: 'inherit'
                  }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '10px', color: '#F4F1EC' }}>
                      {city.city}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px' }}>
                        <span style={{ color: '#A2A09B' }}>Active requests</span>
                        <span style={{ color: getColor(city.activeRequests), fontWeight: 600 }}>
                          {city.activeRequests}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px' }}>
                        <span style={{ color: '#A2A09B' }}>Available donors</span>
                        <span style={{ color: '#16A34A', fontWeight: 600 }}>
                          {city.activeDonors}
                        </span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-3">
        {legend.map((row) => (
          <div key={row.label} className="flex items-center gap-2.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: row.color, boxShadow: `0 0 0 3px ${row.color}22` }}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
              {row.label}
              <span className="ml-2 text-faint tabular-nums">{row.range}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
