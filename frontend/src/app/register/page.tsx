'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  Droplet,
  MapPin,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import {
  Field,
  Texture,
  inputClass,
  noticeClass,
  primaryBtn,
} from '@/components/fk'
type Role = 'DONOR' | 'HOSPITAL' | null

export default function RegisterPage() {
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [address, setAddress] = useState('')
  const [licenseNo, setLicenseNo] = useState('')
  const [area, setArea] = useState('')
  const [locationMethod, setLocationMethod] = useState<'gps' | 'manual' | null>(null)
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationError, setLocationError] = useState('')
  const [locatingInProgress, setLocatingInProgress] = useState(false)

  const { setAuth } = useAuthStore()
  const router = useRouter()

  const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
  const bloodGroupLabels: Record<string, string> = {
    A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
    AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password || !name || !city) {
      setError('Please fill in all required fields')
      return
    }

    if (role === 'HOSPITAL' && (!hospitalName || !licenseNo || (!address && !(locationMethod === 'gps' && coords)))) {
      setError('Please fill in all hospital details')
      return
    }

    if (role === 'DONOR' && !area && !(locationMethod === 'gps' && coords)) {
      setError('Please share your location or enter your area')
      return
    }

    try {
      setLoading(true)
      await api.post('/api/auth/register', { email, password, name, phone, city, role })
      const loginRes = await api.post('/api/auth/login', { email, password })
      const { user, token } = loginRes.data
      setAuth(user, token)

      if (role === 'DONOR') {
        await api.post('/api/donor/profile', {
          bloodGroup,
          ...(locationMethod === 'gps' && coords
            ? { latitude: coords.latitude, longitude: coords.longitude }
            : { area }),
        })
        router.push('/donor/dashboard')
      } else if (role === 'HOSPITAL') {
        await api.post('/api/hospital/profile', {
          name: hospitalName,
          licenseNo,
          ...(locationMethod === 'gps' && coords
            ? { latitude: coords.latitude, longitude: coords.longitude }
            : { address }),
        })
        router.push('/hospital/dashboard')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

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

  const optional = <span className="font-mono text-[10px] tracking-[0.14em] text-line">OPTIONAL</span>

  return (
    <div className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-4 py-14">
      <Texture ember />

      <div className="relative w-full max-w-md">
        <div className="relative mb-8 border-b border-line pb-6">
          <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Create account</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-bone">Register</h1>
          <p className="mt-2.5 text-sm text-mute">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-bone underline decoration-line underline-offset-4 transition-colors hover:decoration-blood"
            >
              Sign in
            </Link>
          </p>
        </div>

        {!role && (
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              I want to...
            </p>
            {/* One continuous lattice rather than two detached cards — the gap between
                them is the rule, so the pair reads as a single choice. */}
            <div className="grid gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft">
              {[
                {
                  role: 'DONOR' as const,
                  icon: Droplet,
                  title: 'Donate blood',
                  blurb: 'Register as a donor and help save lives',
                },
                {
                  role: 'HOSPITAL' as const,
                  icon: Building2,
                  title: 'Request blood for my hospital',
                  blurb: 'Register your hospital and post blood requests',
                },
              ].map(({ role: value, icon: Icon, title, blurb }) => (
                <button
                  key={value}
                  onClick={() => setRole(value)}
                  className="group relative flex w-full items-center gap-4 bg-ink px-5 py-5 text-left transition-colors duration-150 hover:bg-surface"
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-[3px] bg-blood opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-raised">
                    <Icon className="h-4 w-4 text-blood" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-bone">{title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-mute">{blurb}</span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-line transition-colors duration-150 group-hover:text-blood"
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {role && (
          <>
            <div className="mb-7 flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-blood/25 bg-blood/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-blood">
                {role === 'DONOR' ? 'Registering as Donor' : 'Registering as Hospital'}
              </span>
              <span className="h-px flex-1 bg-line-soft" />
              <button
                onClick={() => { setRole(null); setError('') }}
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint transition-colors duration-150 hover:text-bone"
              >
                Change
              </button>
            </div>

            {error && (
              <div className={`mb-5 ${noticeClass}`}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              <Field label="Full name" htmlFor="reg-name">
                <input id="reg-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali Khan"
                  className={inputClass} />
              </Field>

              <Field label="Email address" htmlFor="reg-email">
                <input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className={inputClass} />
              </Field>

              <Field label="Password" htmlFor="reg-password">
                <input id="reg-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className={inputClass} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="City" htmlFor="reg-city">
                  <input id="reg-city" type="text" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} placeholder="DI Khan"
                    className={inputClass} />
                </Field>
                <Field label="Phone" htmlFor="reg-phone" aside={optional}>
                  <input id="reg-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567"
                    className={inputClass} />
                </Field>
              </div>

              {role === 'DONOR' && (
                <div className="space-y-5">
                  <div>
                    {locationMethod === 'gps' && coords ? (
                      <div className="rounded-md border border-life/25 bg-life/10 px-4 py-3">
                        <p className="flex items-start gap-2 text-sm text-life">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                          We'll use this to match you with nearby requests
                        </p>
                        <button
                          type="button"
                          onClick={() => { setLocationMethod(null); setCoords(null) }}
                          className="mt-1.5 pl-5.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-bone"
                        >
                          Use a different method
                        </button>
                      </div>
                    ) : locationMethod === 'manual' ? (
                      <Field
                        label="Area / neighborhood"
                        htmlFor="reg-area"
                        hint="Used to match you with nearby requests — not your exact address."
                      >
                        <input
                          id="reg-area"
                          type="text" value={area} onChange={(e) => setArea(e.target.value)}
                          placeholder="Hayatabad, Peshawar"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setLocationMethod(null)}
                          className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-bone"
                        >
                          Use my location instead
                        </button>
                      </Field>
                    ) : (
                      <div className="relative border-t border-line pt-6">
                        <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-blood" />
                        <div className="mb-3 flex items-start gap-3">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blood" strokeWidth={1.9} aria-hidden />
                          <div>
                            <p className="text-sm font-medium text-bone">Share your location</p>
                            <p className="mt-1 text-xs leading-relaxed text-mute">
                              For faster, more accurate matching in an emergency, we recommend sharing your location.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={requestLocation}
                          disabled={locatingInProgress}
                          className={`w-full ${primaryBtn}`}
                        >
                          {locatingInProgress ? 'Getting location...' : 'Use My Location'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationMethod('manual')}
                          className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-bone"
                        >
                          Enter address instead
                        </button>

                        {locationError && (
                          <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-blood-lite">
                            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                            {locationError === 'permission_denied'
                              ? "We couldn't access your location. You can try again or enter your address manually."
                              : 'Something went wrong getting your location. Please enter your address instead.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    {/* Not a <Field>: the control is a grid of buttons, not one input, so the
                        group is labelled by id and each button reports its own pressed state
                        instead of relying on the fill colour alone. */}
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <p id="reg-bloodgroup-label" className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                        Blood group
                      </p>
                      {optional}
                    </div>
                    <div
                      role="group"
                      aria-labelledby="reg-bloodgroup-label"
                      className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft"
                    >
                      {bloodGroups.map((bg) => (
                        <button key={bg} type="button" onClick={() => setBloodGroup(bg)}
                          aria-pressed={bloodGroup === bg}
                          className={`py-3 text-sm font-semibold tabular-nums transition-colors duration-150 ${
                            bloodGroup === bg
                              ? 'bg-blood text-white'
                              : 'bg-ink text-mute hover:bg-raised hover:text-bone'
                          }`}>
                          {bloodGroupLabels[bg]}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setBloodGroup('')}
                        aria-pressed={bloodGroup === ''}
                        className={`col-span-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-150 ${
                          bloodGroup === ''
                            ? 'bg-blood-deep/40 text-blood-lite'
                            : 'bg-ink text-faint hover:bg-raised hover:text-bone'
                        }`}
                      >
                        I don't know my blood group
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {role === 'HOSPITAL' && (
              <>
                <Field label="Hospital name" htmlFor="reg-hospital-name">
                  <input id="reg-hospital-name" type="text" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="DHQ Hospital DI Khan"
                    className={inputClass} />
                </Field>

                {locationMethod === 'gps' && coords ? (
                  <div className="rounded-md border border-life/25 bg-life/10 px-4 py-3">
                    <p className="flex items-start gap-2 text-sm text-life">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                      Location captured for your hospital
                    </p>
                    <button
                      type="button"
                      onClick={() => { setLocationMethod(null); setCoords(null) }}
                      className="mt-1.5 pl-5.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-bone"
                    >
                      Use a different method
                    </button>
                  </div>
                ) : locationMethod === 'manual' ? (
                  <Field label="Address" htmlFor="reg-address">
                    <input id="reg-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Hospital Road, DI Khan"
                      className={inputClass} />
                    <button
                      type="button"
                      onClick={() => setLocationMethod(null)}
                      className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-bone"
                    >
                      Use current location instead
                    </button>
                  </Field>
                ) : (
                  <div className="relative border-t border-line pt-6">
                    <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-blood" />
                    <div className="mb-3 flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blood" strokeWidth={1.9} aria-hidden />
                      <div>
                        <p className="text-sm font-medium text-bone">Hospital location</p>
                        <p className="mt-1 text-xs leading-relaxed text-mute">
                          Sharing your exact location helps donors and patients find you accurately.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={requestLocation}
                      disabled={locatingInProgress}
                      className={`w-full ${primaryBtn}`}
                    >
                      {locatingInProgress ? 'Getting location...' : 'Use Current Location'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMethod('manual')}
                      className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-bone"
                    >
                      Enter address instead
                    </button>

                    {locationError && (
                      <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-blood-lite">
                        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                        {locationError === 'permission_denied'
                          ? "We couldn't access your location. You can try again or enter your address manually."
                          : 'Something went wrong. Please enter your address instead.'}
                      </p>
                    )}
                  </div>
                )}

                <Field label="License number" htmlFor="reg-license">
                  <input id="reg-license" type="text" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="DHQ-DIK-2024"
                    className={inputClass} />
                </Field>
              </>
            )}

              <div className="pt-1">
                <button type="submit" disabled={loading} className={`w-full ${primaryBtn}`}>
                  {loading ? 'Creating account...' : 'Create account'}
                  {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />}
                </button>
              </div>

            </form>
          </>
        )}

      </div>
    </div>
  )
}
