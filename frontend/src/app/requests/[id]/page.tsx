'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Link2,
  SearchX,
  ShieldCheck,
  Building2,
  MapPin,
  Clock,
  Droplet,
  Share2,
  HeartHandshake
} from 'lucide-react'
import { Texture, LiveDot } from '@/components/fk'

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
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWhatsAppShare = () => {
    if (!request || typeof window === 'undefined') return
    const bloodType = bloodGroupLabels[request.bloodGroup] || request.bloodGroup
    const text = encodeURIComponent(
      `🚨 EMERGENCY BLOOD NEEDED (${bloodType})\n` +
      `Hospital: ${request.hospital?.name || 'Verified Hospital'}\n` +
      `Units: ${request.units} Units\n` +
      `City: ${request.hospital?.user?.city || 'Pakistan'}\n` +
      `Respond here: ${window.location.href}`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank')
  }

  if (loading) {
    return (
      <div className="relative min-h-screen bg-ink flex items-center justify-center p-6">
        <Texture ember={true} />
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Retrieving emergency case details...
          </p>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-6 bg-ink">
        <Texture ember={true} />
        <div className="relative max-w-sm text-center rounded-2xl border border-line bg-surface/80 p-8 backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-raised">
            <SearchX className="h-6 w-6 text-faint" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-bone">Request Not Found</h2>
          <p className="mt-2 text-xs text-mute leading-relaxed">
            This emergency transmission may have been fulfilled or expired.
          </p>
          <Link
            href="/requests"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blood px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-blood-dark transition-colors"
          >
            <span>View Active Requests</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  const isCritical = request.urgency === 'CRITICAL'
  const bloodType = bloodGroupLabels[request.bloodGroup] || request.bloodGroup

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink py-8 sm:py-12">
      <Texture ember={true} grid={true} noise={true} />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        {/* Navigation Back */}
        <Link
          href="/requests"
          className="group mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-mute hover:text-bone transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>All Requests</span>
        </Link>

        {/* Main Emergency Detail Card */}
        <div className="overflow-hidden rounded-3xl border border-line bg-surface/90 shadow-2xl backdrop-blur-xl">
          {/* Header Banner */}
          <div className="border-b border-line bg-raised/50 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    isCritical
                      ? 'border border-blood bg-blood/20 text-blood shadow-[0_0_12px_-2px_rgba(220,38,38,0.5)]'
                      : request.urgency === 'URGENT'
                      ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border border-line bg-raised text-mute'
                  }`}
                >
                  {request.urgency} Emergency
                </span>

                <span className="rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-bone">
                  Status: {request.status}
                </span>
              </div>

              <span className="font-mono text-xs text-faint">
                {dayjs(request.createdAt).fromNow()}
              </span>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-bone sm:text-3xl">
                  {request.hospital?.name}
                </h1>
                <p className="flex items-center gap-1.5 text-xs text-mute sm:text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-blood" />
                  <span>{request.hospital?.user?.city ? `${request.hospital.user.city} • ` : ''}{request.hospital?.address}</span>
                </p>
              </div>

              {request.hospital?.verified && (
                <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface/80 px-3 py-1.5 self-start sm:self-auto">
                  <ShieldCheck className="h-4 w-4 text-blood" />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-bone">
                    Verified Medical Center
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Blood Specs Grid */}
          <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            <div className="flex items-center gap-4 p-5 sm:p-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blood/30 bg-blood/10 shadow-inner">
                <span className="font-mono text-2xl font-bold tracking-tight text-blood">
                  {bloodType}
                </span>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Blood Group</p>
                <p className="text-base font-bold text-bone mt-0.5">{bloodType} Universal Need</p>
              </div>
            </div>

            <div className="p-5 sm:p-6 flex flex-col justify-center">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Volume Needed</p>
              <p className="mt-0.5 font-mono text-2xl font-bold text-bone">
                {request.units} <span className="text-xs font-normal text-mute">Bags / Units</span>
              </p>
            </div>

            <div className="p-5 sm:p-6 flex flex-col justify-center">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">Geo-Matched Pool</p>
              <p className="mt-0.5 font-mono text-2xl font-bold text-bone">
                {request.matches?.length || 0} <span className="text-xs font-normal text-mute">Donors Alerted</span>
              </p>
            </div>
          </div>

          {/* Clinical Notes */}
          {request.notes && (
            <div className="border-t border-line p-5 sm:p-6 bg-surface/40">
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
                Clinical Notes / Patient Details
              </p>
              <p className="mt-2 text-sm text-bone/90 leading-relaxed italic border-l-2 border-blood pl-3">
                "{request.notes}"
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className="border-t border-line bg-raised/40 p-5 sm:p-7 space-y-4">
            {request.status === 'PENDING' ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/register"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blood py-3 px-5 text-center text-sm font-semibold text-white shadow-[0_0_20px_-4px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-98"
                >
                  <HeartHandshake className="h-4 w-4" />
                  <span>I Can Donate — Register Now</span>
                </Link>

                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-3 px-4 text-xs font-semibold text-bone hover:bg-raised transition-colors active:scale-98 cursor-pointer"
                >
                  <Share2 className="h-4 w-4 text-blood" />
                  <span>WhatsApp Alert</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-3 px-4 text-xs font-semibold text-bone hover:bg-raised transition-colors active:scale-98 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-blood" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-surface p-4 text-center">
                <p className="text-sm font-semibold text-bone">This request is marked as {request.status.toLowerCase()}.</p>
                <p className="text-xs text-mute mt-1">Thank you to all community donors who responded.</p>
                <Link
                  href="/requests"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blood hover:underline"
                >
                  <span>Browse active emergencies</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            <p className="text-center font-mono text-[9px] uppercase tracking-wider text-faint">
              Direct Contact Details Disclosed Exclusively Upon Donor Match Acceptance
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
