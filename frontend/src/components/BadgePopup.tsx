'use client'

import { useEffect, useState } from 'react'

interface Badge {
  name: string
  icon: string
  description: string
  color: string
  glow: string
}

const BADGE_DATA: Record<string, Badge> = {
  'First Step': {
    name: 'First Step',
    icon: '✅',
    description: 'You joined ForiKhoon as a donor. Welcome to the family.',
    color: 'text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  'First Blood': {
    name: 'First Blood',
    icon: '🩸',
    description: 'You accepted your first donation request. Someone needed you — and you showed up.',
    color: 'text-red-400',
    glow: 'shadow-red-500/20',
  },
  'Reliable': {
    name: 'Reliable',
    icon: '⭐',
    description: 'Your commitment score crossed 50. Hospitals trust you.',
    color: 'text-yellow-400',
    glow: 'shadow-yellow-500/20',
  },
  'Dedicated': {
    name: 'Dedicated',
    icon: '🏆',
    description: 'Commitment score above 80. You are one of our most dependable donors.',
    color: 'text-orange-400',
    glow: 'shadow-orange-500/20',
  },
  'Lifesaver': {
    name: 'Lifesaver',
    icon: '💉',
    description: 'You have accepted 5 or more donation requests. You have saved lives.',
    color: 'text-green-400',
    glow: 'shadow-green-500/20',
  },
  'Hero': {
    name: 'Hero',
    icon: '🦸',
    description: 'Over 10 accepted requests. You are a hero of ForiKhoon.',
    color: 'text-purple-400',
    glow: 'shadow-purple-500/20',
  },
}

interface BadgePopupProps {
  badges: string[]
  donorId: string
}

export default function BadgePopup({ badges, donorId }: BadgePopupProps) {
  const [newBadge, setNewBadge] = useState<Badge | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!badges.length || !donorId) return

    const storageKey = `foorikhoon-badges-${donorId}`
    const seen = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[]

    // find first badge that hasn't been seen yet
    const earned = badges.find(b => !seen.includes(b))

    if (earned && BADGE_DATA[earned]) {
      setNewBadge(BADGE_DATA[earned])
      setVisible(true)
    }
  }, [badges, donorId])

  const handleClose = () => {
    if (!donorId || !newBadge) return

    const storageKey = `foorikhoon-badges-${donorId}`
    const seen = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[]
    localStorage.setItem(storageKey, JSON.stringify([...seen, newBadge.name]))

    setVisible(false)
    setTimeout(() => setNewBadge(null), 300)
  }

  if (!newBadge) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Popup */}
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          visible
            ? 'opacity-100 -translate-y-1/2'
            : 'opacity-0 -translate-y-[60%]'
        }`}
      >
        <div className={`bg-[#141414] border border-[#2A2A2A] rounded-2xl p-8 w-80 text-center shadow-2xl ${newBadge.glow}`}>

          {/* Badge earned label */}
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-6">
            Badge Earned
          </p>

          {/* Icon */}
          <div className={`text-6xl mb-4 filter drop-shadow-lg`}>
            {newBadge.icon}
          </div>

          {/* Glow ring */}
          <div className={`w-20 h-20 rounded-full border-2 ${newBadge.color.replace('text-', 'border-')}/30 mx-auto -mt-16 mb-4 flex items-center justify-center`}>
            <span className="text-4xl">{newBadge.icon}</span>
          </div>

          {/* Name */}
          <h2 className={`text-2xl font-bold mb-2 ${newBadge.color}`}>
            {newBadge.name}
          </h2>

          {/* Description */}
          <p className="text-[#9CA3AF] text-sm leading-relaxed mb-8">
            {newBadge.description}
          </p>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-medium py-2.5 rounded-md transition-colors duration-150 text-sm"
          >
            Awesome!
          </button>

        </div>
      </div>
    </>
  )
}

// Also export badge display component for profile page
export function BadgeShelf({ badges }: { badges: string[] }) {
  if (!badges.length) return null

  return (
    <div className="grid grid-cols-3 gap-3">
      {badges.map((name) => {
        const badge = BADGE_DATA[name]
        if (!badge) return null
        return (
          <div
            key={name}
            className="bg-[#141414] border border-[#222] hover:border-[#2A2A2A] rounded-xl p-4 text-center transition-all duration-150 group"
            title={badge.description}
          >
            <div className="text-2xl mb-2">{badge.icon}</div>
            <p className={`text-xs font-semibold ${badge.color}`}>{badge.name}</p>
          </div>
        )
      })}
    </div>
  )
}