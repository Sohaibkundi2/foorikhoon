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

// Four warm tints only. The original set ran red → orange → green → blue → purple,
// which read as a random assortment against a red brand; these all sit inside it.
const avatarTints = [
  'bg-blood/10 text-blood border-blood/25',
  'bg-warn/10 text-warn border-warn/25',
  'bg-blood-deep/40 text-blood-lite border-blood/20',
  'bg-raised text-bone border-line',
]

function getAvatarColor(name: string) {
  const index = name.charCodeAt(0) % avatarTints.length
  return avatarTints[index]
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
      <div className="h-40 animate-pulse rounded-xl border border-line bg-surface" />
    )
  }

  if (heroes.length === 0) {
    return null
  }

  return (
    <div>
      {/* Same eyebrow rule as the sections on the landing page. */}
      <div className="mb-8 flex items-center gap-4">
        <p className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
          This week’s heroes
        </p>
        <span className="h-px flex-1 bg-line-soft" />
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-faint tabular-nums">
          {heroes.length} donor{heroes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Slider */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {heroes.map((hero, i) => (
            <div key={i} className="w-full flex-shrink-0">
              <div className="relative flex items-center gap-5 overflow-hidden rounded-xl border border-line bg-surface px-6 py-7">

                {/* Brand edge, so the card is anchored without needing a fill. */}
                <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-blood" />

                {/* Avatar. Squared off — a circle here reads as a stock avatar slot. */}
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border text-base font-semibold tracking-tight ${getAvatarColor(hero.name)}`}>
                  {getInitials(hero.name)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-medium tracking-tight text-bone">{hero.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="text-sm text-mute">{hero.city}</span>
                    {hero.bloodGroup && (
                      <>
                        <span aria-hidden className="h-3 w-px bg-line" />
                        <span className="font-mono text-xs font-medium tracking-wide text-blood">
                          {bloodGroupLabels[hero.bloodGroup] || hero.bloodGroup}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Commitment score */}
                <div className="shrink-0 border-l border-line-soft pl-5 text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                    Commitment
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-bone tabular-nums">
                    {hero.commitmentScore}
                  </p>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {heroes.length > 1 && (
        <div className="mt-3 flex justify-center gap-1">
          {heroes.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              aria-label={`Show donor ${i + 1} of ${heroes.length}`}
              aria-current={i === activeIndex}
              // The mark is a hairline; the padding is what makes it clickable.
              className="group px-1.5 py-3"
            >
              <span
                className={`block h-[2px] transition-all duration-300 ${
                  i === activeIndex
                    ? 'w-8 bg-blood'
                    : 'w-4 bg-line group-hover:bg-mute'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
