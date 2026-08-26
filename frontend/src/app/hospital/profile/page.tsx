'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Check, CircleAlert, Clock, MapPin } from 'lucide-react'
import {
  Field,
  SectionLabel,
  Texture,
  inputClass,
  noticeClass,
  primaryBtn,
  quietBtn
} from '@/components/fk'

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
      setLocationError('unavailable')
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
        setLocationError(err.code === err.PERMISSION_DENIED ? 'permission_denied' : 'unavailable')
        setLocatingInProgress(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'HOSPITAL') { router.push('/'); return }
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
      setPhone(hospitalProfile.user.phone || '')
      setCity(hospitalProfile.user.city || '')
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

    if (!name || !city || (!address && !(locationMethod === 'gps' && coords))) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      await api.put('/api/hospital/profile', {
        name, phone, city,
        ...(locationMethod === 'gps' && coords
          ? { latitude: coords.latitude, longitude: coords.longitude }
          : { address }),
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-2 w-40 animate-pulse rounded-full bg-raised" />
      </div>
    )
  }

  const requiredAside = (
    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-blood/70">
      Required
    </span>
  )

  return (
    <div className="relative overflow-hidden">
      <Texture />

      <div className="relative mx-auto max-w-4xl px-6 pb-32 pt-12">

        <Link
          href="/hospital/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors hover:text-bone"
        >
          <ArrowLeft className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
          Back to dashboard
        </Link>

        {/* Masthead. The registration plate on the right is this page's organising
            idea: a hospital's license number and verification state are the two
            things about it that are not editable, so they are set apart from the
            form rather than sitting inside it as a disabled input. */}
        <div className="mt-7 grid gap-10 border-b border-line pb-8 lg:grid-cols-[1fr_16rem] lg:gap-14">
          <div className="relative min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood">Hospital</p>
            <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-bone">
              Edit Profile
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
              Update your hospital information.
            </p>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute -bottom-2.5 -right-2.5 left-3 top-3 rounded-lg border border-line-soft"
            />
            <div className="relative rounded-lg border border-line bg-surface">
              <div className="flex items-center gap-3 border-b border-line-soft px-5 py-3.5">
                <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                  Registration
                </p>
                <span aria-hidden className="h-px flex-1 bg-line-soft" />
              </div>

              <div className="px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                  License number
                </p>
                <p className="mt-2 break-all font-mono text-lg tabular-nums text-bone">
                  {licenseNo || '—'}
                </p>
                <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-line">
                  Cannot be changed
                </p>
              </div>

              <div
                className={`flex items-start gap-2.5 border-t px-5 py-4 ${
                  verified
                    ? 'border-life/20 bg-life/[0.06]'
                    : 'border-warn/20 bg-warn/[0.06]'
                }`}
              >
                {verified ? (
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-life" strokeWidth={2} aria-hidden />
                ) : (
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warn" strokeWidth={2} aria-hidden />
                )}
                <p className={`text-xs leading-relaxed ${verified ? 'text-life-lite' : 'text-warn'}`}>
                  {verified
                    ? 'Your hospital is verified by ForiKhoon admin.'
                    : 'Your hospital is pending verification. An admin will review your details soon.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className={`mt-7 ${noticeClass}`}>
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-7 flex items-start gap-2.5 rounded-md border border-life/25 bg-life/10 px-3.5 py-3 text-sm text-life-lite">
            <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
            <span>Profile updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="max-w-2xl">

          {/* ── 01 Hospital ─────────────────────────────────────────────── */}
          <section className="pt-11">
            <SectionLabel heading index="01">Hospital Information</SectionLabel>

            <Field label="Hospital name" htmlFor="hospital-name" aside={requiredAside}>
              <input
                id="hospital-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </Field>
          </section>

          {/* ── 02 Location ─────────────────────────────────────────────── */}
          <section className="pt-11">
            <SectionLabel heading index="02">Location</SectionLabel>

            {locationMethod === 'gps' && coords ? (
              <div className="flex items-start gap-2.5 rounded-md border border-life/25 bg-life/10 px-3.5 py-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-life" strokeWidth={2.5} aria-hidden />
                <div>
                  <p className="text-sm text-life-lite">Location captured for your hospital</p>
                  <button
                    type="button"
                    onClick={() => { setLocationMethod(null); setCoords(null) }}
                    className="mt-1.5 text-xs text-mute underline decoration-line underline-offset-4 transition-colors hover:text-bone"
                  >
                    Use a different method
                  </button>
                </div>
              </div>
            ) : locationMethod === 'manual' ? (
              <div>
                <Field label="Address" htmlFor="hospital-address" aside={requiredAside}>
                  <input
                    id="hospital-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => setLocationMethod(null)}
                  className="mt-3 text-xs text-mute underline decoration-line underline-offset-4 transition-colors hover:text-bone"
                >
                  Use current location instead
                </button>
              </div>
            ) : (
              <div className="relative border-t border-line pt-6">
                <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-blood" />
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blood" strokeWidth={2} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-bone">Update hospital location</p>
                    <p className="mt-1.5 max-w-md text-xs leading-relaxed text-mute">
                      Sharing your exact location helps donors and patients find you accurately.
                      It is also what donor matching measures distance from.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={requestLocation}
                        disabled={locatingInProgress}
                        className={primaryBtn}
                      >
                        {locatingInProgress ? 'Getting location...' : 'Use Current Location'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationMethod('manual')}
                        className="text-xs text-mute underline decoration-line underline-offset-4 transition-colors hover:text-bone"
                      >
                        Enter address instead
                      </button>
                    </div>

                    {locationError && (
                      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-warn">
                        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        {locationError === 'permission_denied'
                          ? "We couldn't access your location. You can try again or enter your address manually."
                          : 'Something went wrong. Please enter your address instead.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── 03 Contact ──────────────────────────────────────────────── */}
          <section className="pt-11">
            <SectionLabel heading index="03">Contact Information</SectionLabel>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="City" htmlFor="hospital-city" aside={requiredAside}>
                <input
                  id="hospital-city"
                  type="text"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Phone"
                htmlFor="hospital-phone"
                aside={
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-line">
                    Optional
                  </span>
                }
              >
                <input
                  id="hospital-phone"
                  type="text"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          {/* Save bar, pinned for the same reason as the donor sheet: the form is
              taller than the viewport once the location block is expanded. */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
              <Link href="/hospital/dashboard" className={quietBtn}>Cancel</Link>
              <button type="submit" disabled={saving} className={primaryBtn}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}
