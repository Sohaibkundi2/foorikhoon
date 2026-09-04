'use client'

import { useEffect, useState } from 'react'
import { Award, CircleCheck, Droplet, Star, Syringe, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { primaryBtn } from '@/components/fk'

interface Badge {
  name: string
  icon: LucideIcon
  description: string
  /** Icon tile: border + fill + glyph, from the four-family tone set. */
  tone: string
  /** Heading colour, matching the tile's glyph. */
  text: string
}

const BADGE_DATA: Record<string, Badge> = {
  'First Step': {
    name: 'First Step',
    icon: CircleCheck,
    description: 'You joined ForiKhoon as a donor. Welcome to the family.',
    tone: 'border-line bg-raised text-bone',
    text: 'text-bone',
  },
  'First Blood': {
    name: 'First Blood',
    icon: Droplet,
    description: 'You accepted your first donation request. Someone needed you — and you showed up.',
    tone: 'border-blood/25 bg-blood/10 text-blood',
    text: 'text-blood',
  },
  'Reliable': {
    name: 'Reliable',
    icon: Star,
    description: 'Your commitment score crossed 50. Hospitals trust you.',
    tone: 'border-warn/25 bg-warn/10 text-warn',
    text: 'text-warn',
  },
  'Dedicated': {
    name: 'Dedicated',
    icon: Trophy,
    description: 'Commitment score above 80. You are one of our most dependable donors.',
    tone: 'border-warn/25 bg-warn/10 text-warn',
    text: 'text-warn',
  },
  'Lifesaver': {
    name: 'Lifesaver',
    icon: Syringe,
    description: 'You have accepted 5 or more donation requests. You have saved lives.',
    tone: 'border-blood/25 bg-blood/10 text-blood',
    text: 'text-blood',
  },
  'Hero': {
    name: 'Hero',
    icon: Award,
    description: 'Over 10 accepted requests. You are a hero of ForiKhoon.',
    tone: 'border-blood/25 bg-blood-deep/50 text-blood-lite',
    text: 'text-blood-lite',
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

  const Icon = newBadge.icon

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/70 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Popup */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fk-badge-name"
        className={`fixed left-1/2 top-1/2 z-50 -translate-x-1/2 transition-all duration-300 ${
          visible
            ? '-translate-y-1/2 opacity-100'
            : '-translate-y-[60%] opacity-0'
        }`}
      >
        <div className="relative w-80">
          {/* Offset frame instead of a coloured glow — the badge's own tone is
              already carrying the colour, and a second halo behind it was the
              only thing on this screen that read as a template. */}
          <div
            aria-hidden
            className="absolute -bottom-2.5 -right-2.5 left-2.5 top-2.5 rounded-xl border border-line-soft"
          />

          <div className="relative rounded-xl border border-line bg-surface p-7">

            {/* Badge earned label */}
            <div className="mb-6 flex items-center gap-3">
              <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                Badge earned
              </p>
              <span aria-hidden className="h-px flex-1 bg-line-soft" />
            </div>

            {/* Icon. Squared and left-aligned: a centred circular glyph with a
                ring around it is the single most recognisable award-modal move. */}
            <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-lg border ${newBadge.tone}`}>
              <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            </div>

            {/* Name */}
            <h2
              id="fk-badge-name"
              className={`font-serif text-3xl italic leading-none ${newBadge.text}`}
            >
              {newBadge.name}
            </h2>

            {/* Description */}
            <p className="mt-4 mb-7 text-sm leading-relaxed text-mute">
              {newBadge.description}
            </p>

            {/* Close button */}
            <button onClick={handleClose} className={`w-full ${primaryBtn}`}>
              Awesome!
            </button>

          </div>
        </div>
      </div>
    </>
  )
}

// Also export badge display component for profile page
export function BadgeShelf({ badges }: { badges: string[] }) {
  if (!badges.length) return null

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft sm:grid-cols-3">
      {badges.map((name) => {
        const badge = BADGE_DATA[name]
        if (!badge) return null
        const Icon = badge.icon
        return (
          <div
            key={name}
            className="group flex items-center gap-3 bg-ink px-4 py-4 transition-colors duration-150 hover:bg-raised/50"
            title={badge.description}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${badge.tone}`}>
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </div>
            <p className={`truncate font-mono text-[11px] uppercase tracking-[0.12em] ${badge.text}`}>
              {badge.name}
            </p>
          </div>
        )
      })}
    </div>
  )
}
