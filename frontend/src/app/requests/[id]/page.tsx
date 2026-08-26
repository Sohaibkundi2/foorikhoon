'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ArrowLeft, ArrowRight, Check, Link2, SearchX, ShieldCheck } from 'lucide-react'
import {
  Chip,
  PageHead,
  Stat,
  Texture,
  primaryBtnLg,
  quietBtn,
  statusTone,
  urgencyTone
} from '@/components/fk'

dayjs.extend(relativeTime)

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

export default function RequestDetailPage() {
  const { id } = useParams()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get(`/api/requests/${id}`)
      .then(res => setRequest(res.data.request))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-12">
        <div className="h-3 w-32 animate-pulse rounded bg-surface" />
        <div className="h-7 w-56 animate-pulse rounded bg-surface" />
        <div className="h-52 animate-pulse rounded-xl bg-surface" />
        <div className="h-20 animate-pulse rounded-xl bg-surface" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6">
        <Texture />
        <div className="relative max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-raised">
            <SearchX className="h-5 w-5 text-faint" strokeWidth={1.75} aria-hidden />
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-bone">Request not found</h2>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            This request may have expired or been fulfilled.
          </p>
          <Link href="/requests" className={`mt-7 ${primaryBtnLg}`}>
            View all requests
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      <Texture ember />

      <div className="relative mx-auto max-w-2xl px-6 py-12">

        {/* Back */}
        <Link
          href="/requests"
          className="mb-7 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors hover:text-bone"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.25} aria-hidden />
          Back to requests
        </Link>

        <PageHead
          eyebrow="Blood request"
          title={request.hospital?.name}
          lede={<>{request.hospital?.user?.city} · {request.hospital?.address}</>}
          actions={
            <button onClick={handleShare} className={quietBtn}>
              {copied ? (
                <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              ) : (
                <Link2 className="h-3 w-3" strokeWidth={2.25} aria-hidden />
              )}
              {copied ? 'Copied' : 'Share'}
            </button>
          }
        />

        {/* What is needed */}
        <div className="mb-4 overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-5 px-6 py-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-blood/25 bg-blood/10">
              <span className="font-mono text-2xl font-medium tracking-[0.02em] text-blood">
                {bloodGroupLabels[request.bloodGroup] || request.bloodGroup}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip tone={urgencyTone[request.urgency]}>{request.urgency}</Chip>
              <Chip tone={statusTone[request.status]}>{request.status}</Chip>
              {request.hospital?.verified && (
                <Chip tone="text-life bg-life/10 border-life/25" icon={ShieldCheck}>
                  Verified hospital
                </Chip>
              )}
            </div>
          </div>

          {/* Two figures, divided by the same hairline that closes the panel
              header — inline rather than via <Lattice> because this grid has to
              lose its own border and radius to sit inside the card. */}
          <div className="grid grid-cols-2 gap-px border-t border-line-soft bg-line-soft">
            <Stat label="Units needed" value={request.units} />
            <Stat label="Donors notified" value={request.matches?.length || 0} />
          </div>
        </div>

        {/* Notes — the hospital's own words, and the one line on this page that
            gets the serif. Everything else here is a figure or an enum. */}
        {request.notes && (
          <div className="relative mb-4 border-t border-line pt-6">
            <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-blood" />
            <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              Notes from the hospital
            </p>
            <p className="font-serif text-xl italic leading-snug text-bone">
              {request.notes}
            </p>
          </div>
        )}

        {/* Timing */}
        <div className="mb-8 flex flex-wrap justify-between gap-6 border-t border-line-soft pt-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Posted</p>
            <p className="mt-1.5 text-sm text-bone">{dayjs(request.createdAt).fromNow()}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Expires</p>
            <p className="mt-1.5 text-sm text-bone">
              {request.expiresAt ? dayjs(request.expiresAt).fromNow() : 'No expiry set'}
            </p>
          </div>
        </div>

        {/* CTA */}
        {request.status === 'PENDING' && (
          <Link href="/register" className={`w-full ${primaryBtnLg}`}>
            I can help — Register as donor
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        )}

        {request.status !== 'PENDING' && (
          <div className="text-center">
            <p className="text-sm text-mute">
              This request has been {request.status.toLowerCase()}.
            </p>
            <Link
              href="/requests"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-bone underline decoration-line underline-offset-4 transition-colors hover:decoration-blood"
            >
              View other requests
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
