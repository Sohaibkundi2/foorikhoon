"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft, Check, CircleAlert, Minus, Plus } from 'lucide-react'
import {
  Chip,
  Field,
  SectionLabel,
  Texture,
  ghostBtn,
  inputClass,
  noticeClass,
  primaryBtn,
  primaryBtnLg,
  urgencyTone
} from '@/components/fk'

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const urgencyOptions = [
  { value: 'NORMAL', label: 'Normal', desc: 'Needed within a few days' },
  { value: 'URGENT', label: 'Urgent', desc: 'Needed within 24 hours' },
  { value: 'CRITICAL', label: 'Critical', desc: 'Needed immediately' },
]

export default function NewRequestPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [bloodGroup, setBloodGroup] = useState('')
  const [units, setUnits] = useState(1)
  const [urgency, setUrgency] = useState('NORMAL')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ matchedDonors: number } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!bloodGroup) {
      setError('Please select a blood group')
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/api/requests', { bloodGroup, units, urgency, notes })
      setSuccess({ matchedDonors: res.data.matchedDonors })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to post request. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Success state. Set as the filed record rather than a centred confirmation
  // badge: what the hospital wants to read here is the outcome figure, and a
  // circle-and-tick centred on an empty screen is the most templated way to
  // avoid saying it.
  if (success) {
    return (
      <div className="relative overflow-hidden">
        <Texture />

        <div className="relative mx-auto max-w-lg px-6 pb-20 pt-20">
          <div className="relative border-b border-line pb-7">
            <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-life">
              <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
              Filed
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-bone">
              Request Posted
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-mute">
              Your blood request has been posted successfully.
            </p>
          </div>

          {/* The outcome as a figure, because that is the one thing on this
              screen the hospital has to act on knowing. */}
          <div className="mt-8 flex items-baseline gap-4">
            <span
              className={`font-mono text-[3.5rem] font-medium leading-[0.85] tabular-nums ${
                success.matchedDonors > 0 ? 'text-life' : 'text-warn'
              }`}
            >
              {success.matchedDonors}
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-mute">
              {success.matchedDonors > 0 ? (
                <>
                  donor{success.matchedDonors !== 1 ? 's' : ''} matched and notified.
                </>
              ) : (
                <>
                  matching donors found right now. We will notify you when one becomes available.
                </>
              )}
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-7">
            <Link href="/hospital/dashboard" className={primaryBtn}>Go to dashboard</Link>
            <button
              onClick={() => { setSuccess(null); setBloodGroup(''); setNotes(''); setUnits(1); setUrgency('NORMAL') }}
              className={ghostBtn}
            >
              Post another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      <Texture />

      <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-12">

        <Link
          href="/hospital/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors hover:text-bone"
        >
          <ArrowLeft className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
          Back to dashboard
        </Link>

        <div className="relative mt-7 border-b border-line pb-7">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood">New Request</p>
          <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-bone">
            Post Blood Request
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
            Compatible donors near your hospital are notified as soon as this is filed.
          </p>
        </div>

        {error && (
          <div className={`mt-7 ${noticeClass}`}>
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {/* Form on the left, the slip it will produce on the right. The preview
            is not decoration: this form has four inputs whose combined effect is
            a single record, and the slip is the only place that record is
            legible before it is filed. It mirrors form state and nothing else. */}
        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">

          <form onSubmit={handleSubmit} className="min-w-0">

            {/* ── 01 Blood group ─────────────────────────────────────────── */}
            <section>
              <SectionLabel heading index="01">Blood Group Required</SectionLabel>

              <div
                role="group"
                aria-label="Blood group required"
                className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft"
              >
                {bloodGroups.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    aria-pressed={bloodGroup === bg}
                    onClick={() => setBloodGroup(bg)}
                    className={`py-4 font-mono text-base font-medium tracking-[-0.01em] transition-colors duration-150 ${
                      bloodGroup === bg
                        ? 'bg-blood text-white'
                        : 'bg-ink text-mute hover:bg-raised hover:text-bone'
                    }`}
                  >
                    {bloodGroupLabels[bg]}
                  </button>
                ))}
              </div>
            </section>

            {/* ── 02 Units ───────────────────────────────────────────────── */}
            <section className="pt-11">
              <SectionLabel heading index="02">Units Needed</SectionLabel>

              <div className="flex items-center gap-5">
                <div className="flex items-center gap-px overflow-hidden rounded-md border border-line bg-line-soft">
                  <button
                    type="button"
                    aria-label="Decrease units"
                    onClick={() => setUnits(Math.max(1, units - 1))}
                    className="flex h-11 w-11 items-center justify-center bg-raised text-mute transition-colors duration-150 hover:bg-surface hover:text-bone"
                  >
                    <Minus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </button>
                  <span
                    aria-live="polite"
                    className="flex h-11 w-16 items-center justify-center bg-ink font-mono text-2xl font-medium tabular-nums text-bone"
                  >
                    {units}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase units"
                    onClick={() => setUnits(Math.min(20, units + 1))}
                    className="flex h-11 w-11 items-center justify-center bg-raised text-mute transition-colors duration-150 hover:bg-surface hover:text-bone"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                  unit{units !== 1 ? 's' : ''} · max 20
                </p>
              </div>
            </section>

            {/* ── 03 Urgency ─────────────────────────────────────────────── */}
            <section className="pt-11">
              <SectionLabel heading index="03">Urgency Level</SectionLabel>

              {/* A single divided stack rather than three bordered cards: these
                  are three points on one scale, and the tier that is selected
                  gets a left edge so the choice is not carried by fill alone. */}
              <div
                role="group"
                aria-label="Urgency level"
                className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line"
              >
                {urgencyOptions.map((opt) => {
                  const active = urgency === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setUrgency(opt.value)}
                      className={`relative flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150 ${
                        active ? 'bg-raised' : 'bg-surface hover:bg-raised/50'
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className={`absolute inset-y-0 left-0 w-[3px] ${
                            opt.value === 'CRITICAL'
                              ? 'bg-blood'
                              : opt.value === 'URGENT'
                                ? 'bg-warn'
                                : 'bg-life'
                          }`}
                        />
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${active ? 'text-bone' : 'text-mute'}`}>
                          {opt.label}
                        </p>
                        <p className="mt-0.5 text-xs text-faint">{opt.desc}</p>
                      </div>
                      {active && (
                        <Check className="h-4 w-4 shrink-0 text-bone" strokeWidth={2.25} aria-hidden />
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* ── 04 Notes ───────────────────────────────────────────────── */}
            <section className="pt-11">
              <SectionLabel heading index="04">Additional Notes</SectionLabel>

              <Field
                label="Notes"
                htmlFor="request-notes"
                aside={
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-line">
                    Optional
                  </span>
                }
                hint="Donors see this alongside your request."
              >
                <textarea
                  id="request-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Patient is scheduled for surgery tomorrow morning"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </section>

            <button type="submit" disabled={loading} className={`mt-11 w-full ${primaryBtnLg}`}>
              {loading ? 'Posting request...' : 'Post Blood Request'}
            </button>
          </form>

          {/* ── Slip ──────────────────────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative">
              <div
                aria-hidden
                className="absolute -bottom-2.5 -right-2.5 left-3 top-3 rounded-lg border border-line-soft"
              />
              <div className="relative rounded-lg border border-line bg-surface">
                <div className="flex items-center gap-3 border-b border-line-soft px-5 py-3.5">
                  <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                    Requisition
                  </p>
                  <span aria-hidden className="h-px flex-1 bg-line-soft" />
                </div>

                <dl className="divide-y divide-line-soft">
                  <div className="flex items-baseline justify-between gap-4 px-5 py-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                      Group
                    </dt>
                    <dd
                      className={`font-mono text-2xl font-medium leading-none ${
                        bloodGroup ? 'text-blood' : 'text-line'
                      }`}
                    >
                      {bloodGroup ? bloodGroupLabels[bloodGroup] : '—'}
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-4 px-5 py-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                      Units
                    </dt>
                    <dd className="font-mono text-2xl font-medium leading-none tabular-nums text-bone">
                      {units}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                      Urgency
                    </dt>
                    <dd>
                      <Chip tone={urgencyTone[urgency]}>{urgency}</Chip>
                    </dd>
                  </div>

                  <div className="px-5 py-4">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                      Notes
                    </dt>
                    <dd
                      className={`mt-2 text-sm leading-relaxed ${
                        notes ? 'text-mute' : 'text-line'
                      }`}
                    >
                      {notes || 'None'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Describes what the backend actually does — compatible group,
                `isAvailable: true`, the 90-day recovery window, expanding radius
                tiers, top three ranked donors matched. Not a paraphrase of "we
                notify nearby donors", which was both vaguer and wrong about
                city-based matching. */}
            <p className="mt-5 max-w-[18rem] text-xs leading-relaxed text-faint">
              Up to three donors are notified — compatible blood group, marked available, and
              past the 90-day recovery window. The search starts within 10 km and widens to
              100 km if nobody closer is eligible.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
