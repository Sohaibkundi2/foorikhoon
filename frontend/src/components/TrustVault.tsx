'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ShieldCheck,
  Camera,
  Lock,
  FileCheck2,
  Building2,
  CheckCircle2,
  ScanLine
} from 'lucide-react'

export default function TrustVault() {
  const [activeTab, setActiveTab] = useState<'photo' | 'hospital' | 'privacy'>('photo')

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-surface/90 to-surface/40 p-5 sm:p-7 md:p-9 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)]">
      {/* Background ambient lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blood/10 blur-3xl"
      />

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-line-soft pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-blood">
              Trust & Verification
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-bone">
              <CheckCircle2 className="h-3 w-3 text-blood" />
              100% Audited
            </span>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-bone">
            Every match is <span className="font-serif italic font-normal text-blood">verified.</span>
          </h2>
          <p className="mt-1 max-w-xl text-xs sm:text-sm text-mute leading-relaxed">
            Multi-layer verification guarantees real emergencies, protected donor privacy, and authentic medical proof.
          </p>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex rounded-xl border border-line bg-raised/80 p-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('photo')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'photo'
                ? 'bg-blood text-white shadow'
                : 'text-mute hover:text-bone'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            Photo Proof
          </button>
          <button
            onClick={() => setActiveTab('hospital')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'hospital'
                ? 'bg-blood text-white shadow'
                : 'text-mute hover:text-bone'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Hospital Seal
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-blood text-white shadow'
                : 'text-mute hover:text-bone'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            Privacy
          </button>
        </div>
      </div>

      {/* Dynamic Tab Body */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          {activeTab === 'photo' && (
            <motion.div
              key="photo"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid gap-6 lg:grid-cols-12 lg:items-center"
            >
              <div className="lg:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-raised px-2.5 py-1 font-mono text-[11px] text-bone">
                  <ScanLine className="h-3.5 w-3.5 text-blood" />
                  Photo-Verified Transfusion Bag
                </div>
                <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-bone">
                  Physical proof required for every completed donation.
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-mute">
                  Hospitals upload a photograph of the sealed collection bag with the donor ID tag. This unlocks your official shareable Hero Certificate and updates your commitment score.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-line bg-surface/60 p-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-blood">
                      01 / Bag Photo
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      Staff uploads sealed blood bag photo with unique tag.
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface/60 p-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-bone">
                      02 / Hero Card
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      Donor receives verified shareable certificate.
                    </p>
                  </div>
                </div>
              </div>

              {/* Illustrated Verification Card */}
              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-sm rounded-xl border border-line bg-surface p-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-line-soft pb-2.5">
                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-bone">
                      <ShieldCheck className="h-3.5 w-3.5 text-blood" /> Verified Collection
                    </span>
                    <span className="font-mono text-[10px] text-faint">#FK-9482</span>
                  </div>

                  <div className="mt-3 flex flex-col items-center justify-center rounded-lg border border-dashed border-blood/40 bg-blood-deep/15 py-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blood/20 text-blood">
                      <FileCheck2 className="h-5 w-5" />
                    </div>
                    <p className="mt-2 font-mono text-xs font-semibold text-bone">
                      Transfusion Tagged: O−
                    </p>
                    <p className="mt-0.5 text-[11px] text-mute">
                      DHQ Teaching Hospital • Blood Bank
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-mute font-mono">
                    <span>Status: Verified</span>
                    <span className="text-blood font-semibold">+15 Pts</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'hospital' && (
            <motion.div
              key="hospital"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid gap-6 lg:grid-cols-12 lg:items-center"
            >
              <div className="lg:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-raised px-2.5 py-1 font-mono text-[11px] text-bone">
                  <Building2 className="h-3.5 w-3.5 text-blood" />
                  Accredited Hospital Network
                </div>
                <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-bone">
                  Only authentic hospitals can post requests.
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-mute">
                  Every hospital is verified with government medical licenses and GPS location before posting emergency calls.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-line bg-surface/60 p-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-bone">
                      Geo-Fenced
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      Requests anchored to verified hospital premises.
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface/60 p-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-bone">
                      Anti-Spam
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      Strict rate limits prevent false panics.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-sm rounded-xl border border-line bg-surface p-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-line-soft pb-2.5">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-blood">
                      Facility Verification
                    </span>
                    <span className="rounded bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-bone">
                      Verified
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised text-bone">
                        <Building2 className="h-4 w-4 text-blood" />
                      </div>
                      <div>
                        <p className="font-medium text-bone">Services Hospital</p>
                        <p className="text-[11px] text-mute">Jail Road, Lahore</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-line-soft bg-ink/60 p-2.5 font-mono text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-faint">License:</span>
                        <span className="text-bone">PHC-REG-2024</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-faint">Blood Bank:</span>
                        <span className="text-bone font-medium">Active 24/7</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid gap-6 lg:grid-cols-12 lg:items-center"
            >
              <div className="lg:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-raised px-2.5 py-1 font-mono text-[11px] text-bone">
                  <Lock className="h-3.5 w-3.5 text-blood" />
                  Donor Privacy Shield
                </div>
                <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-bone">
                  Your phone number stays private until you accept.
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-mute">
                  No public donor lists, no unsolicited calls. Your phone number is shared only when you voluntarily accept an emergency match.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-line bg-surface/60 p-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-bone">
                      Fuzzed GPS
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      Coordinates fuzzed server-side for privacy.
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface/60 p-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-bone">
                      90-Day Rest
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      Automated recovery blackout after donation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-sm rounded-xl border border-line bg-surface p-4 shadow-xl font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-ink/60 p-2.5">
                    <span className="text-mute">Public Search</span>
                    <span className="font-semibold text-blood">BLOCKED</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-ink/60 p-2.5">
                    <span className="text-mute">Consent Sharing</span>
                    <span className="font-semibold text-bone">ENFORCED</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-ink/60 p-2.5">
                    <span className="text-mute">Recovery Window</span>
                    <span className="font-semibold text-bone">90 DAYS</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
