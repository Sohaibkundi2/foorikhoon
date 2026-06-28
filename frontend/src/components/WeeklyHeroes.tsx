'use client'

import { useEffect, useState, useRef } from 'react'
import api from '@/lib/api'

interface Hero {
  name: string
  city: string
  bloodGroup: string | null
  commitmentScore: number
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-red-900/40 text-red-400 border-red-800/40',
    'bg-orange-900/40 text-orange-400 border-orange-800/40',
    'bg-green-900/40 text-green-400 border-green-800/40',
    'bg-blue-900/40 text-blue-400 border-blue-800/40',
    'bg-purple-900/40 text-purple-400 border-purple-800/40',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export default function WeeklyHeroes() {
  const [heroes, setHeroes] = useState<Hero[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    api.get('/api/map/weekly-heroes')
      .then(res => setHeroes(res.data.heroes))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (heroes.length <= 1) return

    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % heroes.length)
    }, 3000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [heroes])

  if (loading) {
    return (
      <div className="h-40 bg-[#141414] border border-[#222] rounded-xl animate-pulse" />
    )
  }

  if (heroes.length === 0) {
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-[#6B7280] text-xs uppercase tracking-widest">This week's heroes</p>
        <span className="text-xs text-[#6B7280]">{heroes.length} donor{heroes.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Slider */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {heroes.map((hero, i) => (
            <div key={i} className="w-full flex-shrink-0">
              <div className="bg-[#141414] border border-[#222] rounded-xl p-6 flex items-center gap-5">

                {/* Avatar */}
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-lg font-bold shrink-0 ${getAvatarColor(hero.name)}`}>
                  {getInitials(hero.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-base truncate">{hero.name}</p>
                  <p className="text-[#9CA3AF] text-sm mt-0.5">{hero.city}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {hero.bloodGroup && (
                      <span className="text-xs text-[#DC2626] bg-[#DC2626]/10 border border-[#DC2626]/20 px-2 py-0.5 rounded-full font-semibold">
                        {bloodGroupLabels[hero.bloodGroup] || hero.bloodGroup}
                      </span>
                    )}
                    <span className="text-xs text-[#6B7280]">
                      Score: <span className="text-white">{hero.commitmentScore}</span>
                    </span>
                  </div>
                </div>

                {/* Hero badge */}
                <div className="shrink-0 text-right">
                  <span className="text-2xl">🩸</span>
                  <p className="text-[#DC2626] text-xs font-semibold mt-1">Donated</p>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {heroes.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {heroes.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-4 h-1.5 bg-[#DC2626]'
                  : 'w-1.5 h-1.5 bg-[#333] hover:bg-[#555]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}