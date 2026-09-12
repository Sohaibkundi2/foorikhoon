'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Minus,
  Plus,
  Radio,
  Clock,
  AlertTriangle,
  Droplet,
  Send,
  Building2,
  Users,
  ShieldAlert,
  FileBadge
} from 'lucide-react'
import { Texture } from '@/components/fk'

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const urgencyOptions = [
  { value: 'NORMAL', label: 'Normal', desc: 'Standard scheduled need' },
  { value: 'URGENT', label: 'Urgent', desc: 'Needed within 12–24 hours' },
  { value: 'CRITICAL', label: 'Critical', desc: 'Immediate emergency transfusion (ICU / Emergency)' },
]

export default function NewRequestPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [hospital, setHospital] = useState<{ verified: boolean; licenseNo: string; name: string } | null>(null)
  const [checkingVerification, setCheckingVerification] = useState(true)
  const [bloodGroup, setBloodGroup] = useState('')
  const [units, setUnits] = useState(1)
  const [urgency, setUrgency] = useState('NORMAL')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ matchedDonors: number } | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    const checkStatus = async () => {
      try {
        const res = await api.get('/api/hospital/profile')
        setHospital(res.data.hospitalProfile)
      } catch (err) {
        console.error('Failed to fetch hospital profile:', err)
      } finally {
        setCheckingVerification(false)
      }
    }
    checkStatus()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!bloodGroup) {
      setError('Please select a blood group for this blood request')
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/api/requests', { bloodGroup, units, urgency, notes })
      setSuccess({ matchedDonors: res.data.matchedDonors ?? 0 })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to post blood request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingVerification) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Checking hospital verification status...
          </p>
        </div>
      </div>
    )
  }

  if (hospital && !hospital.verified) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-ink flex items-center justify-center p-6">
        <Texture ember={true} grid={true} noise={true} />

        <div className="relative mx-auto max-w-lg w-full rounded-3xl border border-amber-500/40 bg-surface/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Clock className="h-7 w-7 animate-pulse" />
          </div>

          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Verification In Progress
            </span>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-bone sm:text-3xl">
              Hospital Verification Required
            </h1>
            <p className="mt-2 text-xs text-mute sm:text-sm leading-relaxed">
              Your hospital (<strong className="text-bone">{hospital.name}</strong>) is waiting for healthcare verification.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-raised/50 p-4 text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-faint uppercase">Hospital License:</span>
              <span className="font-mono font-bold text-bone">{hospital.licenseNo || 'UNDER REVIEW'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-faint uppercase">Posting Requests:</span>
              <span className="font-mono text-amber-400 uppercase font-semibold">Locked</span>
            </div>
            <p className="pt-2 text-[11px] text-mute border-t border-line leading-normal">
              To protect donors and prevent fake requests, only verified hospitals can post blood requests. Administrators review each license before approving.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/hospital/profile"
              className="flex-1 flex items-center justify-center rounded-xl border border-line bg-surface py-3 px-4 text-xs font-semibold text-bone hover:bg-raised transition-colors"
            >
              View Hospital Profile
            </Link>
            <Link
              href="/hospital/dashboard"
              className="flex-1 flex items-center justify-center rounded-xl bg-blood py-3 px-4 text-xs font-semibold text-white shadow hover:bg-blood-dark transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-ink flex items-center justify-center p-6">
        <Texture ember={true} grid={true} noise={true} />

        <div className="relative mx-auto max-w-lg w-full rounded-3xl border border-line bg-surface/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blood/30 bg-blood/10 text-blood">
            <Radio className="h-7 w-7 animate-pulse" />
          </div>

          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blood">
              Request Sent Successfully
            </span>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-bone sm:text-3xl">
              Emergency Request Posted
            </h1>
            <p className="mt-1.5 text-xs text-mute sm:text-sm">
              Your blood request has been sent to available donors nearby.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-raised/50 p-5">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4 text-blood" />
              <p className="font-mono text-xs uppercase tracking-wider text-faint">Nearby Donors Found</p>
            </div>
            <p className="mt-2 font-mono text-4xl font-extrabold text-bone">
              {success.matchedDonors}
            </p>
            <p className="mt-1 text-xs text-mute">
              {success.matchedDonors > 0
                ? 'donor(s) found nearby and notified.'
                : 'donors found nearby yet. We will alert more donors soon if needed.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/hospital/requests"
              className="flex-1 flex items-center justify-center rounded-xl bg-blood py-3 px-4 text-xs font-semibold text-white shadow hover:bg-blood-dark transition-colors"
            >
              View All Requests
            </Link>
            <button
              onClick={() => {
                setSuccess(null)
                setBloodGroup('')
                setNotes('')
                setUnits(1)
                setUrgency('NORMAL')
              }}
              className="flex-1 rounded-xl border border-line bg-surface py-3 px-4 text-xs font-semibold text-bone hover:bg-raised transition-colors cursor-pointer"
            >
              Post Another Request
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink py-8 sm:py-12">
      <Texture ember={true} grid={true} noise={true} />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/hospital/dashboard"
          className="group mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-mute hover:text-bone transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Hospital Dashboard</span>
        </Link>

        {/* Masthead */}
        <div className="border-b border-line pb-6 mb-8">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-blood">
            New Blood Request
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-bone sm:text-4xl">
            Post Emergency Blood Request
          </h1>
          <p className="mt-1 text-sm text-mute leading-relaxed">
            Nearby donors within 10 km will be alerted immediately, alerting more donors if needed.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-blood/40 bg-blood/10 p-3.5 text-xs text-bone">
            <CircleAlert className="h-4 w-4 shrink-0 text-blood mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Blood Group Required */}
          <div className="rounded-3xl border border-line bg-surface/90 p-5 sm:p-7 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-xs font-bold text-blood">01 • Blood Group Needed</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Select One</span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {bloodGroups.map((bg) => {
                const active = bloodGroup === bg
                return (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setBloodGroup(bg)}
                    className={`rounded-2xl py-3 px-3 font-mono text-base font-extrabold transition-all cursor-pointer ${
                      active
                        ? 'border border-blood bg-blood text-white shadow-[0_0_15px_-3px_rgba(220,38,38,0.5)] scale-102'
                        : 'border border-line bg-raised/60 text-bone hover:border-line-soft hover:bg-raised'
                    }`}
                  >
                    {bloodGroupLabels[bg]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 2: Volume & Urgency */}
          <div className="rounded-3xl border border-line bg-surface/90 p-5 sm:p-7 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-xs font-bold text-blood">02 • Bags Needed & Urgency</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">How Urgent?</span>
            </div>

            {/* Units Stepper */}
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mute mb-2">
                Blood Bags Needed
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center rounded-2xl border border-line bg-raised/60 p-1">
                  <button
                    type="button"
                    onClick={() => setUnits(Math.max(1, units - 1))}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface text-bone hover:border hover:border-line transition-colors cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <span className="font-mono text-xl font-bold text-bone w-16 text-center">
                    {units}
                  </span>

                  <button
                    type="button"
                    onClick={() => setUnits(Math.min(20, units + 1))}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-surface text-bone hover:border hover:border-line transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <span className="font-mono text-xs text-mute">
                  Standard 450ml blood bags
                </span>
              </div>
            </div>

            {/* Urgency Tiers */}
            <div className="space-y-2 pt-2 border-t border-line">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mute mb-2">
                Urgency Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {urgencyOptions.map((opt) => {
                  const active = urgency === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUrgency(opt.value)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'border-blood bg-blood/15 text-bone shadow-[0_0_15px_-4px_rgba(220,38,38,0.4)]'
                          : 'border-line bg-raised/40 text-mute hover:border-line-soft'
                      }`}
                    >
                      <p className={`font-mono text-xs font-bold uppercase tracking-wider ${
                        active ? 'text-blood' : 'text-bone'
                      }`}>
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-mute mt-1 leading-snug">
                        {opt.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Clinical Notes */}
          <div className="rounded-3xl border border-line bg-surface/90 p-5 sm:p-7 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-xs font-bold text-blood">03 • Notes (Optional)</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Visible to Donors</span>
            </div>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Patient in Emergency ICU, Room 4B. Please contact coordinator upon arrival."
              className="w-full rounded-2xl border border-line bg-raised/60 p-3 text-sm text-bone placeholder-faint focus:border-blood focus:outline-none"
            />
          </div>

          {/* Broadcast Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-blood py-3.5 px-6 text-sm font-bold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>{loading ? 'Sending Request...' : 'Send Blood Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
