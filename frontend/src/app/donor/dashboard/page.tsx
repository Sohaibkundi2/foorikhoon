'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import BadgePopup, { BadgeShelf } from '@/components/BadgePopup'
import HeroCertificate from '@/components/HeroCertificate'
import api from '@/lib/api'
import Link from 'next/link'
import {
  Award,
  Check,
  CircleAlert,
  X,
  Droplet,
  ShieldCheck,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  Activity
} from 'lucide-react'
import {
  Chip,
  LiveDot,
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
      setMatches(matchesRes.data.matches || [])
      setBadges(profileRes.data.badges || [])
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
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Syncing donor record & nearby emergency matches...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink py-8 sm:py-12">
      <Texture ember={true} grid={true} noise={true} />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* Top Masthead & Live Status */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem] lg:gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-full border border-blood/30 bg-blood/10 px-3.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blood w-fit">
              <LiveDot />
              <span>On-Call Emergency Network</span>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-bone sm:text-4xl md:text-5xl">
                Welcome, {donor?.user.name?.split(' ')[0] || 'Donor'}
              </h1>
              <p className="mt-2 text-sm text-mute leading-relaxed">
                Your on-call profile is synchronized with emergency centers in{' '}
                <span className="text-bone font-semibold">{donor?.user.city}</span>
                {donor?.area && <span> ({donor.area})</span>}.
              </p>
            </div>

            {!donor?.area && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-2.5">
                <CircleAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200">
                  <span>Add your specific area or GPS coordinates to receive high-priority 10km radius broadcasts. </span>
                  <Link href="/donor/profile" className="font-semibold underline hover:text-white">
                    Update Profile &rarr;
                  </Link>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/donor/matches"
                className="rounded-xl border border-line bg-raised px-4 py-2 text-xs font-semibold text-bone hover:border-blood transition-colors"
              >
                All My Matches ({matches.length})
              </Link>
              <Link
                href="/donor/profile"
                className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-mute hover:text-bone transition-colors"
              >
                Settings & Radius
              </Link>
            </div>
          </div>

          {/* Quick Tag Card */}
          <div className="rounded-3xl border border-line bg-surface/90 p-5 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                Donor Record #{donor?.id ? donor.id.slice(0, 8) : '—'}
              </span>
              <span className="rounded-md border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-bone font-semibold">
                Verified
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Blood Group</p>
                <p className="mt-1 font-mono text-3xl font-extrabold text-blood">
                  {donor?.bloodGroup ? bloodGroupLabels[donor.bloodGroup] : '—'}
                </p>
              </div>

              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Availability</p>
                <div className="mt-1.5 flex items-center justify-end gap-2">
                  <span className="font-mono text-xs font-semibold text-bone">
                    {donor?.isAvailable ? 'Active' : 'Paused'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={donor?.isAvailable ?? false}
                    aria-label="Toggle availability"
                    onClick={toggleAvailability}
                    disabled={toggling}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50 border border-red-400 ${
                      donor?.isAvailable ? 'bg-blood shadow-[0_0_12px_-2px_rgba(220,38,38,0.7)]' : 'bg-raised'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
                        donor?.isAvailable ? 'translate-x-1' : 'translate-x-[-15px]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">Eligibility</p>
                <p className="mt-0.5 text-xs font-bold text-bone">
                  {daysLeft === null || daysLeft === 0 ? 'Eligible to Donate' : `${daysLeft}d recovery remaining`}
                </p>
              </div>

              <div className="text-right">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">Reliability Score</p>
                <p className="mt-0.5 font-mono text-xs font-bold text-bone">
                  {donor?.commitmentScore ?? 0} <span className="text-mute font-normal">/ 100</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Badge Popup Modal */}
        <BadgePopup badges={badges} donorId={donor?.id || ''} />

        {/* Section 1: Pending Emergency Broadcasts */}
        <div className="mb-10">
          <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blood">01</span>
              <h2 className="text-lg font-bold tracking-tight text-bone">
                Incoming Emergency Dispatches
              </h2>
              {pendingMatches.length > 0 && (
                <span className="rounded-full bg-blood px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow">
                  {pendingMatches.length} New
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              15-Min Auto-Escalation
            </span>
          </div>

          {pendingMatches.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface/60 p-6 text-center backdrop-blur-md">
              <p className="text-sm font-semibold text-bone">No pending emergency matches</p>
              <p className="mt-1 text-xs text-mute">
                Keep your availability active. When a verified hospital posts an emergency matching your blood group, you will receive an alert.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMatches.map((match) => (
                <div
                  key={match.id}
                  className="rounded-2xl border border-blood/40 bg-surface/90 p-4 sm:p-5 shadow-[0_0_20px_-8px_rgba(220,38,38,0.25)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blood/30 bg-blood/10">
                      <span className="font-mono text-lg font-bold text-blood">
                        {bloodGroupLabels[match.request.bloodGroup] || match.request.bloodGroup}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-bone">{match.request.hospital.name}</p>
                        <span className="rounded-md border border-blood bg-blood/20 px-2 py-0.5 font-mono text-[9px] uppercase font-bold text-blood">
                          {match.request.urgency}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-mute">{match.request.hospital.address}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
                        {match.request.units} Unit{match.request.units > 1 ? 's' : ''} Needed • Phone revealed upon acceptance
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => respondToMatch(match.id, 'ACCEPTED')}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-blood py-2 px-4 text-xs font-semibold text-white shadow hover:bg-blood-dark transition-all active:scale-95 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Accept Match</span>
                    </button>
                    <button
                      onClick={() => respondToMatch(match.id, 'DECLINED')}
                      className="flex-1 sm:flex-none rounded-xl border border-line bg-raised py-2 px-3 text-xs font-medium text-mute hover:text-bone transition-colors active:scale-95 cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Badges */}
        {badges.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blood">02</span>
                <h2 className="text-lg font-bold tracking-tight text-bone">
                  Transfusion Achievements & Badges
                </h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                {badges.length} Earned
              </span>
            </div>
            <BadgeShelf badges={badges} />
          </div>
        )}

        {/* Section 3: Donation History */}
        {pastMatches.length > 0 && (
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blood">03</span>
                <h2 className="text-lg font-bold tracking-tight text-bone">
                  Transfusion History & Proofs
                </h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                {pastMatches.length} Records
              </span>
            </div>

            <div className="rounded-2xl border border-line bg-surface/80 divide-y divide-line overflow-hidden">
              {pastMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 hover:bg-raised/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-raised font-mono text-xs font-bold text-blood">
                      {bloodGroupLabels[match.request.bloodGroup] || match.request.bloodGroup}
                    </div>

                    {match.status === 'COMPLETED' && match.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(match.photoUrl!)}
                        title="View photo proof of collection"
                        className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-line cursor-pointer hover:border-blood"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={match.photoUrl}
                          alt="Blood bag proof"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-bone">{match.request.hospital.name}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-mute">
                        {match.request.units} Unit{match.request.units > 1 ? 's' : ''} • Status: {match.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {match.status === 'COMPLETED' && (
                      <button
                        onClick={() => viewCertificate(match.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-blood/30 bg-blood/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-blood hover:bg-blood/20 transition-colors cursor-pointer"
                      >
                        <Award className="h-3.5 w-3.5" />
                        <span>Hero Certificate</span>
                      </button>
                    )}
                    <span className="rounded-md border border-line bg-raised px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-mute font-semibold">
                      {match.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hero Certificate Modal */}
      {certificateOpen && certificate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <div className="relative rounded-3xl border border-line bg-surface p-5 sm:p-6 max-w-xl w-full shadow-2xl">
              <button
                onClick={() => setCertificateOpen(false)}
                aria-label="Close certificate"
                className="absolute right-4 top-4 z-10 rounded-full border border-line bg-raised p-1.5 text-mute hover:text-bone transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
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

      {/* Proof Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Blood bag proof of donation"
              className="max-h-[75vh] max-w-full rounded-2xl border border-line shadow-2xl"
            />
            <p className="max-w-sm text-center text-xs text-mute">
              Tamper-proof photo uploaded by the hospital upon physical donation collection.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-5 top-5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-bone hover:border-blood transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
