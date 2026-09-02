'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Droplet,
  Heart,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'

interface BloodRule {
  giveTo: string[]
  receiveFrom: string[]
  scarcityNotes: string
  populationSharePk: string
}

const MATRIX_DATA: Record<string, BloodRule> = {
  'O−': {
    giveTo: ['O−', 'O+', 'A−', 'A+', 'B−', 'B+', 'AB−', 'AB+'],
    receiveFrom: ['O−'],
    scarcityNotes: 'High-scarcity universal donor. Reserved for O− recipients first.',
    populationSharePk: '~2%'
  },
  'O+': {
    giveTo: ['O+', 'A+', 'B+', 'AB+'],
    receiveFrom: ['O+', 'O−'],
    scarcityNotes: 'Most requested blood type across emergency wards in Pakistan.',
    populationSharePk: '~32%'
  },
  'A−': {
    giveTo: ['A−', 'A+', 'AB−', 'AB+'],
    receiveFrom: ['A−', 'O−'],
    scarcityNotes: 'Rare Rh-negative group with critical emergency need.',
    populationSharePk: '~3%'
  },
  'A+': {
    giveTo: ['A+', 'AB+'],
    receiveFrom: ['A+', 'A−', 'O+', 'O−'],
    scarcityNotes: 'High demand for surgery and planned transfusions.',
    populationSharePk: '~24%'
  },
  'B−': {
    giveTo: ['B−', 'B+', 'AB−', 'AB+'],
    receiveFrom: ['B−', 'O−'],
    scarcityNotes: 'Rare Rh-negative group with limited regional donors.',
    populationSharePk: '~4%'
  },
  'B+': {
    giveTo: ['B+', 'AB+'],
    receiveFrom: ['B+', 'B−', 'O+', 'O−'],
    scarcityNotes: 'One of Pakistan’s most common and frequently used blood types.',
    populationSharePk: '~31%'
  },
  'AB−': {
    giveTo: ['AB−', 'AB+'],
    receiveFrom: ['AB−', 'A−', 'B−', 'O−'],
    scarcityNotes: 'The rarest blood type in Pakistan (1% of population).',
    populationSharePk: '~1%'
  },
  'AB+': {
    giveTo: ['AB+'],
    receiveFrom: ['Universal Recipient (All Groups)'],
    scarcityNotes: 'Universal plasma donor and universal red-cell recipient.',
    populationSharePk: '~3%'
  },
}

const BLOOD_GROUPS = ['O−', 'O+', 'A−', 'A+', 'B−', 'B+', 'AB−', 'AB+']

export default function BloodMatrixInteractive() {
  const [selectedGroup, setSelectedGroup] = useState<string>('O−')
  const details = MATRIX_DATA[selectedGroup]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-surface/90 to-surface/40 p-5 sm:p-7 md:p-9 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)]">
      {/* Section Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-line-soft pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
              Compatibility Matrix
            </span>
            <span className="rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mute">
              Select Your Type
            </span>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-bone">
            Check your compatibility & <span className="font-serif italic font-normal text-blood">impact</span>
          </h2>
        </div>

        {/* 1 unit = 3 lives */}
        <div className="flex items-center gap-2.5 rounded-xl border border-blood/25 bg-blood/[0.08] px-3.5 py-2.5 self-start md:self-auto">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blood/20 text-blood">
            <Heart className="h-4 w-4 fill-blood" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-bone">1 Unit = Up to 3 Lives Saved</span>
          </div>
        </div>
      </div>

      {/* Selector Grid */}
      <div className="mt-6">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {BLOOD_GROUPS.map((bg) => {
            const isSelected = selectedGroup === bg
            const isRare = bg === 'O−' || bg === 'AB−'

            return (
              <button
                key={bg}
                onClick={() => setSelectedGroup(bg)}
                className={`relative flex flex-col items-center justify-center rounded-xl border py-3.5 text-center transition-all duration-200 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'border-blood bg-blood/15 text-blood shadow-[0_0_15px_-4px_rgba(220,38,38,0.5)] scale-[1.02]'
                    : 'border-line bg-surface text-bone hover:border-line-soft hover:bg-raised'
                }`}
              >
                {isRare && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-warn" />
                )}
                <span className="text-xl font-bold tracking-tight">{bg}</span>
                <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-faint">
                  {MATRIX_DATA[bg].populationSharePk}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Type Details */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedGroup}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mt-6 grid gap-5 lg:grid-cols-12 lg:items-center"
        >
          {/* Compatibility Breakdown */}
          <div className="lg:col-span-7 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Can Give To */}
              <div className="rounded-xl border border-line bg-surface/70 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-line-soft">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-bone font-medium">
                    You Can Give To
                  </span>
                  <span className="font-mono text-xs text-mute">
                    {details.giveTo.length} Groups
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {details.giveTo.map(g => (
                    <span
                      key={g}
                      className="rounded-md border border-line bg-raised px-2 py-0.5 font-mono text-xs font-semibold text-bone"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Can Receive From */}
              <div className="rounded-xl border border-line bg-surface/70 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-line-soft">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-blood-lite">
                    You Can Receive From
                  </span>
                  <span className="font-mono text-xs text-mute">
                    {details.receiveFrom.length} Groups
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {details.receiveFrom.map(g => (
                    <span
                      key={g}
                      className="rounded-md border border-blood/30 bg-blood/10 px-2 py-0.5 font-mono text-xs font-semibold text-blood-lite"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="rounded-xl border border-line-soft bg-raised/60 p-3 flex items-start gap-2.5 text-xs">
              <Droplet className="h-4 w-4 text-blood shrink-0 mt-0.5" />
              <p className="text-mute">{details.scarcityNotes}</p>
            </div>
          </div>

          {/* Quick Register / Action Card */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-blood/30 bg-gradient-to-br from-blood-deep/20 via-surface to-raised p-5 text-center shadow-xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-blood/40 bg-blood/20 text-blood font-mono text-xl font-bold">
                {selectedGroup}
              </div>

              <h4 className="mt-2.5 text-base font-semibold text-bone">
                Register as {selectedGroup} Donor
              </h4>
              <p className="mt-1 text-xs text-mute">
                Receive SMS only when a nearby hospital needs your blood group.
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Link
                  href="/register"
                  className="flex-1 rounded-lg bg-blood py-2.5 text-center text-xs font-semibold text-white shadow transition-colors hover:bg-blood-dark"
                >
                  Join as {selectedGroup} Donor
                </Link>
                <Link
                  href="/requests"
                  className="rounded-lg border border-line bg-surface px-3 py-2.5 text-center text-xs font-medium text-mute hover:text-bone hover:bg-raised transition-colors"
                >
                  View Requests
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
