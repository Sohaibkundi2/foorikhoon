'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import Link from 'next/link'
import { ArrowLeft, Check, CircleAlert, MapPin } from 'lucide-react'
import {
  Field,
  SectionLabel,
  Texture,
  inputClass,
  noticeClass,
  primaryBtn,
  quietBtn
} from '@/components/fk'

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

/**
 * Settings switch.
 *
 * `role="switch"` + `aria-checked` + a real accessible name, because both toggles
 * on this page used to be nameless `<button>`s whose only state signal was a
 * background colour — a screen reader announced two unlabelled buttons and
 * conveyed neither what they controlled nor whether they were on. The knob also
 * changes width, not just position, so the state does not rest on hue alone.
 */
function Switch({
  checked,
  onChange,
  label,
  describedBy,
}: {
  checked: boolean
  onChange: () => void
  label: string
  describedBy?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ${
        checked ? 'border-life/40 bg-life' : 'border-line bg-raised'
      }`}
    >
      <span
        aria-hidden
        className={`absolute left-1 top-1 h-4 rounded-full bg-bone transition-all duration-200 ${
          checked ? 'w-4 translate-x-5' : 'w-3 translate-x-0'
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
        name, phone, city, bloodGroup,
        lastDonated: lastDonated || null,
        shareContactInfo,
        ...(locationMethod === 'gps' && coords
          ? { latitude: coords.latitude, longitude: coords.longitude }
          : { area }),
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const toggleShareContactInfo = async () => {
    try {
      await api.put('/api/donor/profile', { shareContactInfo: !shareContactInfo })
      setShareContactInfo(!shareContactInfo)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-2 w-40 animate-pulse rounded-full bg-raised" />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      <Texture />

      <div className="relative mx-auto max-w-3xl px-6 pb-32 pt-12">

        {/* Masthead */}
        <Link
          href="/donor/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors hover:text-bone"
        >
          <ArrowLeft className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
          Back to dashboard
        </Link>

        <div className="relative mt-7 border-b border-line pb-7">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Donor</p>
          <h1 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.04em] text-bone">
            Edit <span className="font-serif italic text-blood">Profile</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
            Update your personal and donation information.
          </p>
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

        {/* Set as a spec sheet: numbered sections divided by rules, no nested card
            boxes. Boxing each group makes them all look equally weighted and puts
            three borders between the eye and the field it is trying to fill in. */}
        <form onSubmit={handleSave}>

          {/* ── 01 Personal ─────────────────────────────────────────────── */}
          <section className="pt-11">
            <SectionLabel heading index="01">Personal Information</SectionLabel>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Full name" htmlFor="profile-name">
                <input
                  id="profile-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Phone" htmlFor="profile-phone">
                <input
                  id="profile-phone"
                  type="text"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  className={inputClass}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="City" htmlFor="profile-city">
                  <input
                    id="profile-city"
                    type="text"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* ── 02 Match location ───────────────────────────────────────── */}
          <section className="pt-11">
            <SectionLabel heading index="02">Match Location</SectionLabel>

            {locationMethod === 'gps' && coords ? (
              <div className="flex items-start gap-2.5 rounded-md border border-life/25 bg-life/10 px-3.5 py-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-life" strokeWidth={2.5} aria-hidden />
                <div>
                  <p className="text-sm text-life-lite">
                    We&apos;ll use this to match you with nearby requests
                  </p>
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
                <Field
                  label="Area / neighborhood"
                  htmlFor="profile-area"
                  aside={
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-line">
                      Update to refresh
                    </span>
                  }
                  hint="Leave blank to keep your current saved location."
                >
                  <input
                    id="profile-area"
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Hayatabad, Peshawar"
                    className={inputClass}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => setLocationMethod(null)}
                  className="mt-3 text-xs text-mute underline decoration-line underline-offset-4 transition-colors hover:text-bone"
                >
                  Use my location instead
                </button>
              </div>
            ) : (
              /* Rule-topped block, left-aligned, rather than a bordered inset with
                 centred text: it reads as part of the sheet instead of a dialog
                 that has been dropped into the middle of it. */
              <div className="relative border-t border-line pt-6">
                <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-blood" />
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blood" strokeWidth={2} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-bone">Update your location</p>
                    <p className="mt-1.5 max-w-md text-xs leading-relaxed text-mute">
                      Share your current location for more accurate matching, or enter your area
                      manually.
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={requestLocation}
                        disabled={locatingInProgress}
                        className={primaryBtn}
                      >
                        {locatingInProgress ? 'Getting location...' : 'Use My Location'}
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
                          : 'Something went wrong getting your location. Please enter your address instead.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── 03 Donation ─────────────────────────────────────────────── */}
          <section className="pt-11">
            <SectionLabel heading index="03">Donation Information</SectionLabel>

            <div className="mb-6">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p
                  id="profile-bloodgroup-label"
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint"
                >
                  Blood group
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-line">
                  Optional
                </span>
              </div>

              {/* One continuous grid whose gaps are the rules, so the eight groups
                  read as a single control rather than eight detached buttons. */}
              <div
                role="group"
                aria-labelledby="profile-bloodgroup-label"
                className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft"
              >
                {bloodGroups.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    aria-pressed={bloodGroup === bg}
                    onClick={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                    className={`py-3.5 font-mono text-sm font-medium tracking-[-0.01em] transition-colors duration-150 ${
                      bloodGroup === bg
                        ? 'bg-blood text-white'
                        : 'bg-ink text-mute hover:bg-raised hover:text-bone'
                    }`}
                  >
                    {bloodGroupLabels[bg]}
                  </button>
                ))}
              </div>
            </div>

            <Field
              label="Last donated"
              htmlFor="profile-last-donated"
              aside={
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-line">
                  Optional
                </span>
              }
            >
              <input
                id="profile-last-donated"
                type="date"
                value={lastDonated}
                onChange={(e) => setLastDonated(e.target.value)}
                className={`${inputClass} [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:invert`}
              />
            </Field>
          </section>

          {/* ── 04 Preferences ──────────────────────────────────────────── */}
          <section className="pt-11">
            <SectionLabel heading index="04">Preferences</SectionLabel>

            <div className="divide-y divide-line-soft border-y border-line-soft">
              <div className="flex items-start justify-between gap-6 py-5">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-bone">Availability</h3>
                  <p id="profile-availability-hint" className="mt-1.5 text-xs leading-relaxed text-mute">
                    Allow hospitals to match you with requests.
                  </p>
                </div>
                <Switch
                  checked={isAvailable}
                  onChange={() => setIsAvailable(!isAvailable)}
                  label="Availability"
                  describedBy="profile-availability-hint"
                />
              </div>

              <div className="flex items-start justify-between gap-6 py-5">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-bone">Share Contact Info</h3>
                  <p id="profile-share-hint" className="mt-1.5 max-w-lg text-xs leading-relaxed text-mute">
                    If enabled, the hospital can see your name and phone number when you accept
                    their request, to help coordinate the donation.
                  </p>
                  {/* This one writes on click. Saying so is the only way a donor can
                      tell it apart from the switch directly above it. */}
                  <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-line">
                    Saves immediately
                  </p>
                </div>
                <Switch
                  checked={shareContactInfo}
                  onChange={toggleShareContactInfo}
                  label="Share Contact Info"
                  describedBy="profile-share-hint"
                />
              </div>
            </div>
          </section>

          {/* Save bar, pinned to the viewport: the sheet is long enough that a
              button at its end is off-screen for most of the time spent editing.
              Solid, not translucent — the grid texture showing through a blurred
              action bar is exactly the effect this design is avoiding. */}
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
              <Link href="/donor/dashboard" className={quietBtn}>Cancel</Link>
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
