'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import BadgePopup, { BadgeShelf } from '@/components/BadgePopup'
import HeroCertificate from '@/components/HeroCertificate'
import api from '@/lib/api'
import Link from 'next/link'
import { Award, Check, CircleAlert, X } from 'lucide-react'
import {
  Chip,
  LiveDot,
  SectionLabel,
  SegmentMeter,
  Texture,
  affirmBtn,
  dangerBtn,
  ghostBtn,
  quietBtn,
  statusTone,
  urgencyTone
} from '@/components/fk'


interface DonorProfile {
  id: string
  bloodGroup: string | null
  isAvailable: boolean
  commitmentScore: number
  lastDonated: string | null
  area: string | null
  latitude: number | null
  longitude: number | null
  user: {
    name: string
    email: string
    city: string
    phone: string | null
  }
}

interface Match {
  id: string
  status: string
  createdAt: string
  photoUrl?: string | null
  photoUploadedAt?: string | null
  request: {
    bloodGroup: string
    units: number
    urgency: string
    hospital: {
      name: string
      address: string
    }
  }
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

export default function DonorDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [donor, setDonor] = useState<DonorProfile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [badges, setBadges] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [certificate, setCertificate] = useState<any>(null)
  const [certificateOpen, setCertificateOpen] = useState(false)
  // Blood-bag proof photo opened full size.
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

    useEffect(() => {
      setHydrated(true)
    }, [])

useEffect(() => {
  if (!user) { router.push('/login'); return }
  if (user.role === 'ADMIN') { router.push('/admin/dashboard'); return }
  if (user.role === 'HOSPITAL') { router.push('/hospital/dashboard'); return }
  if (user.role !== 'DONOR') { router.push('/'); return }
  fetchData()
}, [hydrated, user])

  const fetchData = async () => {
    try {
      const [profileRes, matchesRes] = await Promise.all([
        api.get('/api/donor/profile'),
        api.get('/api/donor/matches')
      ])
      setDonor(profileRes.data.donor)
      setMatches(matchesRes.data.matches)
      setBadges(profileRes.data.badges)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async () => {
    if (!donor) return
    try {
      setToggling(true)
      await api.put('/api/donor/availability', { isAvailable: !donor.isAvailable })
      setDonor({ ...donor, isAvailable: !donor.isAvailable })
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(false)
    }
  }

  const respondToMatch = async (matchId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      await api.put(`/api/donor/matches/${matchId}`, { status })
      setMatches(matches.map(m => m.id === matchId ? { ...m, status } : m))
    } catch (err) {
      console.error(err)
    }
  }

  const daysUntilEligible = () => {
    if (!donor?.lastDonated) return null
    const last = new Date(donor.lastDonated)
    const eligible = new Date(last.getTime() + 90 * 24 * 60 * 60 * 1000)
    const today = new Date()
    const days = Math.ceil((eligible.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  const viewCertificate = async (matchId: string) => {
    try {
      const res = await api.get(`/api/donor/certificate/${matchId}`)
      setCertificate(res.data.certificate)
      setCertificateOpen(true)
    } catch (err) {
      console.error(err)
    }
  }

  const pendingMatches = matches.filter(m => m.status === 'PENDING')
  const pastMatches = matches.filter(m => m.status !== 'PENDING')
  const daysLeft = daysUntilEligible()

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-2 w-40 animate-pulse rounded-full bg-raised" />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      <Texture ember />

      <div className="relative mx-auto max-w-5xl px-6 pb-16 pt-12">

        {/* ── Masthead ──────────────────────────────────────────────────────
            Asymmetric on purpose: the greeting and the donor's own record are
            two different kinds of thing, so they get two different columns
            rather than being flattened into one row of equal boxes. */}
        <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-14">

          <div className="min-w-0 self-end">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              <LiveDot className={donor?.isAvailable ? 'bg-life' : 'bg-faint'} />
              Donor dashboard
            </p>

            <h1 className="mt-5 text-[2.75rem] font-semibold leading-[0.95] tracking-[-0.04em] text-bone">
              Welcome,{' '}
              <span className="font-serif text-[3.25rem] font-normal italic tracking-[-0.02em] text-blood">
                {donor?.user.name?.split(' ')[0] || 'Donor'}
              </span>
            </h1>

            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-mute">
              {donor?.user.city}
              {donor?.area && <span className="text-faint"> · {donor.area}</span>}
            </p>

            {!donor?.area && (
              <Link
                href="/donor/profile"
                className="mt-3 inline-flex items-center gap-2 text-xs text-warn transition-colors hover:text-bone"
              >
                <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                Add your area to get matched with nearby requests
              </Link>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <Link href="/donor/matches" className={ghostBtn}>All my matches</Link>
              <Link href="/donor/profile" className={quietBtn}>Edit profile</Link>
            </div>
          </div>

          {/* ── Donor record ────────────────────────────────────────────────
              Modelled on the tag stapled to a blood bag: a stack of
              label/value rows divided by hairlines. That is the artifact this
              screen is actually about, and it carries the three facts that
              decide everything for a donor — group, availability, eligibility. */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute -bottom-2.5 -right-2.5 left-2.5 top-2.5 rounded-lg border border-line-soft"
            />

            <div className="relative overflow-hidden rounded-lg border border-line bg-surface">

              <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                  Donor record
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-line">
                  {donor?.id ? donor.id.slice(0, 8) : '—'}
                </p>
              </div>

              {/* Blood group. The single most consequential field, so it gets
                  display size rather than another 12px row. */}
              <div className="flex items-end justify-between gap-4 border-b border-line-soft px-5 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                  Blood<br />Group
                </p>
                <p className="font-mono text-[3.5rem] font-medium leading-[0.85] tracking-[-0.02em] text-blood">
                  {donor?.bloodGroup ? bloodGroupLabels[donor.bloodGroup] : '—'}
                </p>
              </div>

              {/* Availability */}
              <div className="flex items-center justify-between gap-4 border-b border-line-soft px-5 py-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                    Availability
                  </p>
                  <p className={`mt-1.5 text-sm font-medium ${donor?.isAvailable ? 'text-life' : 'text-mute'}`}>
                    {donor?.isAvailable ? 'Available' : 'Unavailable'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={donor?.isAvailable ?? false}
                  aria-label="Availability"
                  onClick={toggleAvailability}
                  disabled={toggling}
                  className={`relative h-5 w-10 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${
                    donor?.isAvailable ? 'bg-life' : 'bg-raised'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-bone transition-transform duration-200 ${
                      donor?.isAvailable ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Eligibility */}
              <div className="border-b border-line-soft px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                  Eligibility
                </p>
                {daysLeft === null ? (
                  <p className="mt-1.5 text-sm font-medium text-life">Ready to donate</p>
                ) : daysLeft === 0 ? (
                  <p className="mt-1.5 text-sm font-medium text-life">Ready to donate</p>
                ) : (
                  <p className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-[-0.03em] tabular-nums text-bone">
                      {daysLeft}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                      days until eligible
                    </span>
                  </p>
                )}
              </div>

              {/* Commitment */}
              <div className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                    Commitment
                  </p>
                  <p className="font-mono text-sm tabular-nums text-bone">
                    {donor?.commitmentScore ?? 0}
                    <span className="text-line">/100</span>
                  </p>
                </div>
                <div className="mt-3">
                  <SegmentMeter value={donor?.commitmentScore ?? 0} />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Badge popup is a modal; it renders nothing inline. */}
        <BadgePopup badges={badges} donorId={donor?.id || ''} />

        {/* ── Pending requests ─────────────────────────────────────────────
            The one part of this page that asks the donor for something, so it
            comes first and is set as a decision, not a table row. */}
        <div className="mt-16">
          <SectionLabel
            heading
            index="01"
            aside={
              pendingMatches.length > 0 && (
                <span className="rounded-full border border-blood/25 bg-blood/10 px-2 py-0.5 font-mono text-[10px] tabular-nums text-blood">
                  {pendingMatches.length}
                </span>
              )
            }
          >
            Pending Requests
          </SectionLabel>

          {pendingMatches.length === 0 ? (
            <div className="border-t border-line py-10">
              <p className="text-sm text-mute">No pending requests right now.</p>
              <p className="mt-1.5 text-xs text-faint">
                Make sure your availability is turned on.
              </p>
            </div>
          ) : (
            <ul className="border-t border-line">
              {pendingMatches.map((match) => (
                <li
                  key={match.id}
                  className="relative border-b border-line-soft transition-colors duration-150 hover:bg-surface/60"
                >
                  {match.request.urgency === 'CRITICAL' && (
                    <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-blood" />
                  )}

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-4 py-6 pl-5 pr-1">

                    {/* Blood group gutter — a specimen label, mono and plain,
                        no tinted tile. */}
                    <div className="w-16 shrink-0">
                      <p className="font-mono text-2xl font-medium leading-none tracking-[-0.01em] text-blood">
                        {bloodGroupLabels[match.request.bloodGroup] || match.request.bloodGroup}
                      </p>
                      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-faint">
                        {match.request.units} unit{match.request.units > 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="truncate text-base font-medium tracking-[-0.01em] text-bone">
                          {match.request?.hospital.name}
                        </span>
                        <Chip tone={urgencyTone[match.request.urgency]}>
                          {match.request.urgency}
                        </Chip>
                      </div>
                      <p className="mt-1.5 truncate text-xs text-mute">
                        {match.request.hospital.address}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => respondToMatch(match.id, 'ACCEPTED')} className={affirmBtn}>
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                        Accept
                      </button>
                      <button onClick={() => respondToMatch(match.id, 'DECLINED')} className={ghostBtn}>
                        Decline
                      </button>
                    </div>

                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Badges ───────────────────────────────────────────────────────── */}
        {badges.length > 0 && (
          <div className="mt-14">
            <SectionLabel
              heading
              index="02"
              aside={
                <span className="font-mono text-[11px] tabular-nums text-faint">
                  {badges.length} earned
                </span>
              }
            >
              Your Badges
            </SectionLabel>
            <BadgeShelf badges={badges} />
          </div>
        )}

        {/* ── History ───────────────────────────────────────────────────────
            A ledger, not cards: same columns every row, figures right-aligned
            and tabular, so a donor can scan their own record down the page. */}
        {pastMatches.length > 0 && (
          <div className="mt-14">
            <SectionLabel heading index={badges.length > 0 ? '03' : '02'}>
              Match History
            </SectionLabel>

            <ul className="border-t border-line">
              {pastMatches.map((match) => (
                <li
                  key={match.id}
                  className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line-soft py-4 pl-5 pr-1"
                >
                  <div className="w-16 shrink-0">
                    <p className="font-mono text-sm font-medium leading-none text-blood">
                      {bloodGroupLabels[match.request.bloodGroup]}
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-faint">
                      {match.request.units} unit{match.request.units > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {match.status === 'COMPLETED' && match.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(match.photoUrl!)}
                        title="View proof of donation"
                        className="group shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={match.photoUrl}
                          alt="Blood bag proof of donation"
                          className="h-10 w-10 rounded-md border border-line object-cover transition-colors duration-150 group-hover:border-blood/40"
                        />
                      </button>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-bone">
                        {match.request.hospital.name}
                      </p>
                      {match.status === 'COMPLETED' && match.photoUrl && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-life/80">
                          <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
                          Collection verified by photo
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {match.status === 'COMPLETED' && (
                      <button onClick={() => viewCertificate(match.id)} className={dangerBtn}>
                        <Award className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        View Certificate
                      </button>
                    )}
                    <Chip tone={statusTone[match.status]}>{match.status}</Chip>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>

      {certificateOpen && certificate && (
        // The OVERLAY scrolls, not the panel. A flex child centred with `items-center`
        // that grows taller than the viewport overflows in both directions at once, and
        // the part above the top edge cannot be scrolled to — so once the photo opt-in
        // row was added to the card, the Copy/Download buttons went off-screen with no
        // way to reach them. `min-h-full` on the inner wrapper lets it grow past the
        // viewport instead of being clipped by the centring, which keeps the card
        // centred on tall screens and fully reachable on short ones.
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative rounded-xl border border-line bg-surface p-4 sm:p-5">
              <button
                onClick={() => setCertificateOpen(false)}
                aria-label="Close certificate"
                className="absolute right-3 top-3 z-10 text-mute transition-colors hover:text-bone"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
              <HeroCertificate
                donorName={certificate.donorName}
                bloodGroup={certificate.bloodGroup}
                city={certificate.city}
                hospitalName={certificate.hospitalName}
                donationDate={certificate.donationDate}
                badge={certificate.badge}
                totalDonations={certificate.totalDonations}
                commitmentScore={certificate.commitmentScore}
                photoUrl={certificate.photoUrl}
              />
            </div>
          </div>
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Blood bag proof of donation"
              className="max-h-[75vh] max-w-full rounded-xl border border-line"
            />
            <p className="max-w-sm text-center text-xs text-faint">
              Photo uploaded by the hospital when your donation was collected. Only you and
              that hospital can view it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-5 top-5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-mute transition-colors hover:text-bone"
          >
            Close
          </button>
        </div>
      )}

    </div>
  )
}
