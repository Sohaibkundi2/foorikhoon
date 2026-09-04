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
  MapPin,
  ShieldCheck,
  Navigation,
  Lock,
  User,
  Phone,
  Droplet,
  Save,
  Compass
} from 'lucide-react'
import { Texture } from '@/components/fk'

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 cursor-pointer ${
        checked ? 'bg-blood shadow-[0_0_12px_-2px_rgba(220,38,38,0.7)]' : 'bg-raised border border-line'
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function DonorProfilePage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [lastDonated, setLastDonated] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [area, setArea] = useState('')
  const [shareContactInfo, setShareContactInfo] = useState(false)
  const [locationMethod, setLocationMethod] = useState<'gps' | 'manual' | null>(null)
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationError, setLocationError] = useState('')
  const [locatingInProgress, setLocatingInProgress] = useState(false)

  const requestLocation = () => {
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
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
            ? 'Location permission was denied. You can manually enter your area below.'
            : 'Unable to acquire GPS coordinates. Please enter your area manually.'
        )
        setLocatingInProgress(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'DONOR') { router.push('/'); return }
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/donor/profile')
      const { donor } = res.data
      setName(donor.user.name || '')
      setPhone(donor.user.phone || '')
      setCity(donor.user.city || '')
      setBloodGroup(donor.bloodGroup || '')
      setLastDonated(donor.lastDonated ? donor.lastDonated.split('T')[0] : '')
      setIsAvailable(donor.isAvailable)
      setArea(donor.area || '')
      setShareContactInfo(donor.shareContactInfo ?? false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    try {
      setSaving(true)
      await api.put('/api/donor/profile', {
        name,
        phone,
        city,
        bloodGroup,
        lastDonated: lastDonated || null,
        shareContactInfo,
        ...(locationMethod === 'gps' && coords
          ? { latitude: coords.latitude, longitude: coords.longitude }
          : { area }),
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save changes. Please try again.')
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
            Retrieving donor credentials & location...
          </p>
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
          href="/donor/dashboard"
          className="group mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-mute hover:text-bone transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Donor Dashboard</span>
        </Link>

        {/* Masthead */}
        <div className="border-b border-line pb-6 mb-8">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-blood">
            On-Call Preferences
          </span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-bone sm:text-4xl">
            Donor Settings & Coordinates
          </h1>
          <p className="mt-1 text-sm text-mute leading-relaxed">
            Update your blood group, emergency dispatch radius, and contact privacy preferences.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-blood/40 bg-blood/10 p-3.5 text-xs text-bone">
            <CircleAlert className="h-4 w-4 shrink-0 text-blood mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-bone/30 bg-surface p-3.5 text-xs text-bone shadow-md">
            <Check className="h-4 w-4 shrink-0 text-blood mt-0.5" />
            <span className="font-medium">Profile and dispatch preferences updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Section 1: Personal Details */}
          <div className="rounded-3xl border border-line bg-surface/90 p-5 sm:p-7 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-xs font-bold text-blood">01 • Personal Identity</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Verified Credentials</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-line bg-raised/60 py-2.5 px-3.5 text-sm text-bone focus:border-blood focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full rounded-xl border border-line bg-raised/60 py-2.5 px-3.5 text-sm text-bone focus:border-blood focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-raised/60 py-2.5 px-3.5 text-sm text-bone focus:border-blood focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Blood Group & Recovery Window */}
          <div className="rounded-3xl border border-line bg-surface/90 p-5 sm:p-7 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-xs font-bold text-blood">02 • Medical & Blood Specimen</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">WHO Standards</span>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mute mb-2.5">
                Select Blood Group
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {bloodGroups.map((bg) => {
                  const active = bloodGroup === bg
                  return (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
                      className={`rounded-xl py-2.5 px-3 font-mono text-sm font-bold transition-all cursor-pointer ${
                        active
                          ? 'border border-blood bg-blood text-white shadow-[0_0_15px_-3px_rgba(220,38,38,0.5)]'
                          : 'border border-line bg-raised text-bone hover:border-line-soft'
                      }`}
                    >
                      {bloodGroupLabels[bg]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-line">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                Last Donated Date (Optional — enforces 90-day recovery protection)
              </label>
              <input
                type="date"
                value={lastDonated}
                onChange={(e) => setLastDonated(e.target.value)}
                className="w-full rounded-xl border border-line bg-raised/60 py-2.5 px-3.5 text-sm text-bone focus:border-blood focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Dispatch Coordinates & Privacy */}
          <div className="rounded-3xl border border-line bg-surface/90 p-5 sm:p-7 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-xs font-bold text-blood">03 • Dispatch Coordinates & Privacy</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">10km Geo-Scan</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-bone">Emergency Match Location</p>
                  <p className="text-[11px] text-mute mt-0.5">
                    Used by the algorithm to calculate hospital proximity (25% of match score).
                  </p>
                </div>
                <Compass className="h-4 w-4 text-blood shrink-0" />
              </div>

              {locationMethod === 'gps' && coords ? (
                <div className="rounded-xl border border-bone/20 bg-raised p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-bone">
                    <Check className="h-4 w-4 text-blood" />
                    <span>GPS Acquired ({coords.latitude.toFixed(3)}, {coords.longitude.toFixed(3)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setLocationMethod(null); setCoords(null) }}
                    className="font-mono text-[10px] uppercase tracking-wider text-mute hover:text-bone"
                  >
                    Reset
                  </button>
                </div>
              ) : locationMethod === 'manual' ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. University Town, Peshawar"
                    className="w-full rounded-xl border border-line bg-raised/60 py-2.5 px-3.5 text-sm text-bone focus:border-blood focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setLocationMethod(null)}
                    className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-bone"
                  >
                    Use GPS Coordinates Instead
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={locatingInProgress}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-blood/40 bg-blood/10 py-2.5 px-3 text-xs font-semibold text-blood hover:bg-blood/20 transition-colors cursor-pointer"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>{locatingInProgress ? 'Detecting GPS...' : 'Auto-Detect Current GPS'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMethod('manual')}
                    className="flex items-center justify-center rounded-xl border border-line bg-raised py-2.5 px-3.5 text-xs font-medium text-mute hover:text-bone transition-colors"
                  >
                    {area ? `Area: ${area} (Edit)` : 'Enter Area Manually'}
                  </button>
                </div>
              )}

              {locationError && (
                <p className="text-xs text-blood">{locationError}</p>
              )}
            </div>

            {/* Contact Privacy Toggle */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-line">
              <div>
                <p className="text-xs font-bold text-bone">Automatic Phone Disclosure</p>
                <p className="text-[11px] text-mute mt-0.5">
                  When enabled, verified hospitals can see your direct contact upon accepting a match.
                </p>
              </div>

              <Switch
                checked={shareContactInfo}
                onChange={() => setShareContactInfo(!shareContactInfo)}
                label="Direct Phone Disclosure"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-blood py-3 px-6 text-sm font-semibold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
