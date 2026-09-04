'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import Link from 'next/link'
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Building2,
  Compass,
  Phone,
  ShieldCheck,
  FileBadge,
  Save
} from 'lucide-react'
import { Texture } from '@/components/fk'

export default function HospitalProfilePage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [licenseNo, setLicenseNo] = useState('')
  const [verified, setVerified] = useState(false)
  const [locationMethod, setLocationMethod] = useState<'gps' | 'manual' | null>(null)
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationError, setLocationError] = useState('')
  const [locatingInProgress, setLocatingInProgress] = useState(false)

  const requestLocation = () => {
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('Geolocation services are unavailable in your browser.')
      return
    }

    setLocatingInProgress(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationMethod('gps')
        setLocatingInProgress(false)
      },
      (err) => {
        console.error('Geolocation error:', err)
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. You can manually enter your hospital address below.'
            : 'Unable to acquire precise GPS signal. Please enter your address manually.'
        )
        setLocatingInProgress(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'HOSPITAL') {
      router.push('/')
      return
    }
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/hospital/profile')
      const { hospitalProfile } = res.data
      setName(hospitalProfile.name || '')
      setAddress(hospitalProfile.address || '')
      setLicenseNo(hospitalProfile.licenseNo || '')
      setVerified(hospitalProfile.verified || false)
      setPhone(hospitalProfile.user?.phone || '')
      setCity(hospitalProfile.user?.city || '')
    } catch (err) {
      console.error('Failed to fetch hospital profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!name.trim() || !city.trim() || (!address.trim() && !(locationMethod === 'gps' && coords))) {
      setError('Please provide hospital name, city, and a valid location or address.')
      return
    }

    try {
      setSaving(true)
      await api.put('/api/hospital/profile', {
        name,
        phone,
        city,
        ...(locationMethod === 'gps' && coords
          ? { latitude: coords.latitude, longitude: coords.longitude }
          : { address }),
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3500)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save hospital credentials.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Loading hospital credentials & registry status...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden pb-36">
      <Texture />

      <div className="relative mx-auto max-w-4xl px-4 pt-10 sm:px-6 sm:pt-14">
        {/* Navigation Breadcrumb */}
        <Link
          href="/hospital/dashboard"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-faint transition-colors hover:text-bone"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
          Back to Command Center
        </Link>

        {/* Masthead */}
        <div className="relative mt-7 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-14 bg-blood" />
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-blood" />
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-blood">
                Registry Credentials
              </p>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
              Hospital Profile & Verification
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-mute">
              Official institutional parameters used to authenticate clinical blood requisitions
              and compute donor proximity dispatches.
            </p>
          </div>
        </div>

        {/* Registration & License Status Banner */}
        <div className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-bone">
                <FileBadge className="h-6 w-6 text-blood" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs uppercase tracking-wider text-faint">
                    Institutional License
                  </span>
                  {verified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-bone">
                      <BadgeCheck className="h-3.5 w-3.5 text-bone" />
                      Verified Institution
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-warn">
                      <Clock className="h-3.5 w-3.5 text-warn" />
                      Verification Pending Review
                    </span>
                  )}
                </div>
                <p className="mt-1.5 font-mono text-xl font-bold tracking-tight text-bone">
                  {licenseNo || 'UNLICENSED / TEST RECORD'}
                </p>
                <p className="mt-1 text-xs text-mute">
                  {verified
                    ? 'PMDC / Healthcare Commission record confirmed by ForiKhoon National Network.'
                    : 'Your hospital registration is currently under review by system administrators.'}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-line-soft bg-raised/50 p-3 text-right">
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                Account Authority
              </span>
              <p className="mt-1 font-mono text-xs font-medium text-bone">
                {user?.email || 'N/A'}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-faint">Role: CLINICAL_HOSPITAL</p>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-blood/30 bg-blood/10 p-4 text-xs text-blood-lite">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blood" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-xs text-bone shadow-lg">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-bone" />
            <span>Hospital profile credentials and coordinates successfully updated.</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSave} className="mt-8 space-y-8">
          {/* Section 01: Hospital Identity */}
          <div className="rounded-xl border border-line bg-surface p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <Building2 className="h-4 w-4 text-blood" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-bone">
                01. Facility Identity
              </h2>
            </div>

            <div className="mt-6 grid gap-6">
              <div>
                <label
                  htmlFor="hospital-name"
                  className="block font-mono text-[11px] uppercase tracking-wider text-faint"
                >
                  Hospital / Clinical Facility Name <span className="text-blood">*</span>
                </label>
                <input
                  id="hospital-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shaukat Khanum Memorial Hospital"
                  className="mt-2 w-full rounded-md border border-line bg-raised px-4 py-3 text-sm text-bone placeholder:text-faint outline-none transition focus:border-blood focus:ring-1 focus:ring-blood/25"
                />
              </div>

              <div>
                <label
                  htmlFor="hospital-license-display"
                  className="block font-mono text-[11px] uppercase tracking-wider text-faint"
                >
                  Medical Registration / PMDC License No. (Locked)
                </label>
                <input
                  id="hospital-license-display"
                  type="text"
                  disabled
                  value={licenseNo || 'Contact admin to update registration license'}
                  className="mt-2 w-full cursor-not-allowed rounded-md border border-line-soft bg-raised/50 px-4 py-3 font-mono text-xs text-faint outline-none"
                />
                <p className="mt-1.5 text-[11px] text-faint">
                  License numbers are cryptographic identifiers and require manual admin re-audit
                  to change.
                </p>
              </div>
            </div>
          </div>

          {/* Section 02: Geolocation & Distance Engine */}
          <div className="rounded-xl border border-line bg-surface p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <Compass className="h-4 w-4 text-blood" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-bone">
                02. Geolocation & Dispatch Proximity
              </h2>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-mute">
              ForiKhoon utilizes high-precision coordinates to match donor proximity distances (25%
              score weight). Ensure your facility's physical emergency gate location is accurate.
            </p>

            <div className="mt-6">
              {locationMethod === 'gps' && coords ? (
                <div className="rounded-lg border border-line bg-raised p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded border border-line bg-surface text-bone">
                        <MapPin className="h-4 w-4 text-blood" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-bone">
                          Active Coordinates Captured
                        </p>
                        <p className="mt-1 font-mono text-xs text-mute">
                          LAT: {coords.latitude.toFixed(6)} | LNG: {coords.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationMethod(null)
                        setCoords(null)
                      }}
                      className="font-mono text-xs text-faint underline transition hover:text-bone"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ) : locationMethod === 'manual' ? (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="hospital-address"
                      className="block font-mono text-[11px] uppercase tracking-wider text-faint"
                    >
                      Street Address & Landmark <span className="text-blood">*</span>
                    </label>
                    <textarea
                      id="hospital-address"
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 7A Block R-3, Johar Town, Lahore"
                      className="mt-2 w-full rounded-md border border-line bg-raised px-4 py-3 text-sm text-bone placeholder:text-faint outline-none transition focus:border-blood focus:ring-1 focus:ring-blood/25"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationMethod(null)}
                    className="font-mono text-xs text-faint underline transition hover:text-bone"
                  >
                    Switch to GPS auto-detection
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-line-soft bg-raised/40 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-bone">
                        Acquire Emergency Coordinates
                      </p>
                      <p className="mt-1 text-xs text-mute">
                        Auto-detect latitude and longitude via device hardware GPS.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={requestLocation}
                        disabled={locatingInProgress}
                        className="inline-flex items-center gap-2 rounded-md bg-blood px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-blood-dark disabled:opacity-50"
                      >
                        <Compass className="h-3.5 w-3.5" />
                        {locatingInProgress ? 'Acquiring GPS...' : 'Detect GPS Coordinates'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationMethod('manual')}
                        className="rounded-md border border-line bg-surface px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-mute transition hover:bg-raised hover:text-bone"
                      >
                        Manual Address
                      </button>
                    </div>
                  </div>

                  {locationError && (
                    <div className="mt-4 flex items-start gap-2.5 rounded border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{locationError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 03: Contact & City Operations */}
          <div className="rounded-xl border border-line bg-surface p-6">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <Phone className="h-4 w-4 text-blood" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-bone">
                03. Dispatch Line & City Center
              </h2>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="hospital-city"
                  className="block font-mono text-[11px] uppercase tracking-wider text-faint"
                >
                  Operating City <span className="text-blood">*</span>
                </label>
                <input
                  id="hospital-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Lahore, Karachi, Islamabad"
                  className="mt-2 w-full rounded-md border border-line bg-raised px-4 py-3 text-sm text-bone placeholder:text-faint outline-none transition focus:border-blood focus:ring-1 focus:ring-blood/25"
                />
              </div>

              <div>
                <label
                  htmlFor="hospital-phone"
                  className="block font-mono text-[11px] uppercase tracking-wider text-faint"
                >
                  Blood Bank Direct Hotline
                </label>
                <input
                  id="hospital-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 042-35905000 or 03001234567"
                  className="mt-2 w-full rounded-md border border-line bg-raised px-4 py-3 text-sm text-bone placeholder:text-faint outline-none transition focus:border-blood focus:ring-1 focus:ring-blood/25"
                />
              </div>
            </div>
          </div>

          {/* Sticky Action Bar */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <Link
                href="/hospital/dashboard"
                className="font-mono text-xs uppercase tracking-wider text-faint transition hover:text-bone"
              >
                Discard Changes
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-blood px-6 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-white shadow-[0_0_24px_rgba(220,38,38,0.4)] transition hover:bg-blood-dark disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Updating Credentials...' : 'Save Profile Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
