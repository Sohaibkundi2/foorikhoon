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
    return <div className="h-[450px] bg-[#141414] border border-[#222] rounded-xl animate-pulse" />
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

  return (
    <div className="rounded-xl overflow-hidden border border-[#222]" style={{ height: '450px' }}>
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
                  background: '#1A1A1A',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  minWidth: '160px',
                  color: 'white',
                  fontFamily: 'inherit'
                }}>
                  <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: 'white' }}>
                    {city.city}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#9CA3AF' }}>Active requests</span>
                      <span style={{ color: getColor(city.activeRequests), fontWeight: 600 }}>
                        {city.activeRequests}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#9CA3AF' }}>Available donors</span>
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

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#DC2626] inline-block" />
          <span className="text-[#9CA3AF] text-xs">High demand (5+)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#EA580C] inline-block" />
          <span className="text-[#9CA3AF] text-xs">Moderate (2-4)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#16A34A] inline-block" />
          <span className="text-[#9CA3AF] text-xs">Low (0-1)</span>
        </div>
      </div>
    </div>
  )
}