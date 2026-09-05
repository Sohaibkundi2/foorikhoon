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
  Navigation,
  Compass,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Texture } from '@/components/fk'

type Role = 'DONOR' | 'HOSPITAL' | null

export default function RegisterPage() {
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      setError('Please fill in all hospital details including location or address')
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
      setError(err?.response?.data?.message || 'Registration failed. Please verify your details.')
    } finally {
      setLoading(false)
    }
  }

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
            ? "We couldn't access your location. You can try again or enter your address manually."
            : 'Something went wrong getting your location. Please enter your address manually.'
        )
        setLocatingInProgress(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="relative min-h-[95vh] flex items-center justify-center overflow-hidden px-4 py-12 bg-ink">
      <Texture ember={true} grid={true} noise={true} />

      <div className="relative w-full max-w-xl">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface/90 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="border-b border-line bg-raised/40 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-blood">
                Registration Portal
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                Pakistan Emergency Grid
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-bone sm:text-3xl">
              Create an Account
            </h1>
            <p className="mt-1.5 text-xs text-mute leading-relaxed sm:text-sm">
              Already registered?{' '}
              <Link
                href="/login"
                className="font-semibold text-bone hover:text-white underline decoration-line hover:decoration-blood transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {/* Step 1: Select Role */}
            {!role && (
              <div className="space-y-4">
                <p className="font-mono text-[11px] uppercase tracking-wider text-faint">
                  Select Your Account Type
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => setRole('DONOR')}
                    className="group flex flex-col justify-between rounded-2xl border border-line bg-raised/50 p-5 text-left transition-all hover:border-blood/50 hover:bg-surface active:scale-98 cursor-pointer"
                  >
                    <div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blood/30 bg-blood/10 text-blood">
                        <Droplet className="h-5 w-5 fill-blood" />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-bone">On-Call Donor</h3>
                      <p className="mt-1 text-xs text-mute leading-relaxed">
                        Join our emergency response pool. Receive targeted alerts when a nearby hospital needs your blood group.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-blood group-hover:translate-x-0.5 transition-transform">
                      <span>Register as Donor</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </button>

                  <button
                    onClick={() => setRole('HOSPITAL')}
                    className="group flex flex-col justify-between rounded-2xl border border-line bg-raised/50 p-5 text-left transition-all hover:border-blood/50 hover:bg-surface active:scale-98 cursor-pointer"
                  >
                    <div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-bone">
                        <Building2 className="h-5 w-5 text-blood" />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-bone">Hospital / Facility</h3>
                      <p className="mt-1 text-xs text-mute leading-relaxed">
                        Accredited medical center. Broadcast emergency requests, access ranked donors, and verify collections.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-blood group-hover:translate-x-0.5 transition-transform">
                      <span>Hospital Access</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Fill Registration Form */}
            {role && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <span className="rounded-lg border border-blood/30 bg-blood/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-blood">
                    {role === 'DONOR' ? 'Donor Registration' : 'Hospital Registration'}
                  </span>

                  <button
                    onClick={() => { setRole(null); setError('') }}
                    className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-bone transition-colors"
                  >
                    Change Role
                  </button>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-blood/40 bg-blood/10 p-3.5 text-xs text-bone">
                    <AlertCircle className="h-4 w-4 shrink-0 text-blood mt-0.5" />
                    <span className="leading-snug">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Common Basic Fields */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                        {role === 'DONOR' ? 'Your Full Name' : 'Administrator / Coordinator Name'}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dr. Tariq Khan"
                        required
                        className="w-full rounded-xl border border-line bg-raised/60 py-2 px-3 text-sm text-bone focus:border-blood focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        required
                        className="w-full rounded-xl border border-line bg-raised/60 py-2 px-3 text-sm text-bone focus:border-blood focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full rounded-xl border border-line bg-raised/60 py-2 pl-3 pr-10 text-sm text-bone focus:border-blood focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-faint hover:text-bone transition-colors cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Peshawar, DI Khan, Lahore"
                        required
                        className="w-full rounded-xl border border-line bg-raised/60 py-2 px-3 text-sm text-bone focus:border-blood focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                      Phone Number (Hidden until request accepted)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03001234567"
                      className="w-full rounded-xl border border-line bg-raised/60 py-2 px-3 text-sm text-bone focus:border-blood focus:outline-none"
                    />
                  </div>

                  {/* Donor-Specific Fields */}
                  {role === 'DONOR' && (
                    <div className="space-y-4 pt-2 border-t border-line">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                            Blood Group <span className="text-faint">(Optional)</span>
                          </label>
                          {bloodGroup && (
                            <button
                              type="button"
                              onClick={() => setBloodGroup('')}
                              className="font-mono text-[10px] text-blood hover:underline"
                            >
                              Clear selection
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {bloodGroups.map((bg) => {
                            const active = bloodGroup === bg
                            return (
                              <button
                                key={bg}
                                type="button"
                                onClick={() => setBloodGroup(bg)}
                                className={`rounded-xl py-2 px-3 font-mono text-sm font-bold transition-all ${
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
                        <button
                          type="button"
                          onClick={() => setBloodGroup('')}
                          className={`mt-2.5 w-full py-2 rounded-xl text-xs font-mono border transition-all ${
                            bloodGroup === ''
                              ? 'border-blood/40 bg-blood/10 text-blood font-semibold'
                              : 'border-line bg-surface text-faint hover:text-bone'
                          }`}
                        >
                          I don&apos;t know my blood group
                        </button>
                      </div>

                      {/* Donor Location Method */}
                      <div className="rounded-2xl border border-line bg-raised/40 p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold text-bone">Share Your Location</p>
                            <p className="text-[11px] text-mute mt-0.5">
                              For faster, more accurate matching in an emergency, we recommend sharing your location.
                            </p>
                          </div>
                          <Compass className="h-4 w-4 text-blood shrink-0" />
                        </div>

                        {locationMethod === 'gps' && coords ? (
                          <div className="rounded-xl border border-bone/20 bg-surface p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold text-bone">
                              <Check className="h-4 w-4 text-blood" />
                              <span>Location captured for your profile</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setLocationMethod(null); setCoords(null) }}
                              className="font-mono text-[10px] uppercase tracking-wider text-mute hover:text-bone"
                            >
                              Use a different method
                            </button>
                          </div>
                        ) : locationMethod === 'manual' ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={area}
                              onChange={(e) => setArea(e.target.value)}
                              placeholder="e.g. University Town, Peshawar"
                              className="w-full rounded-xl border border-line bg-surface py-2 px-3 text-sm text-bone focus:border-blood focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setLocationMethod(null)}
                              className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-bone"
                            >
                              Use current location instead
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={requestLocation}
                              disabled={locatingInProgress}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-blood/40 bg-blood/10 py-2.5 px-3 text-xs font-semibold text-blood hover:bg-blood/20 transition-colors cursor-pointer"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              <span>{locatingInProgress ? 'Getting location...' : 'Use My Location'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setLocationMethod('manual')}
                              className="flex items-center justify-center rounded-xl border border-line bg-surface py-2.5 px-3 text-xs font-medium text-mute hover:text-bone transition-colors"
                            >
                              Enter Area Instead
                            </button>
                          </div>
                        )}

                        {locationError && (
                          <p className="text-xs text-blood">{locationError}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hospital-Specific Fields */}
                  {role === 'HOSPITAL' && (
                    <div className="space-y-4 pt-2 border-t border-line">
                      <div className="space-y-1">
                        <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                          Hospital Name
                        </label>
                        <input
                          type="text"
                          value={hospitalName}
                          onChange={(e) => setHospitalName(e.target.value)}
                          placeholder="e.g. DHQ Hospital DI Khan"
                          required
                          className="w-full rounded-xl border border-line bg-raised/60 py-2 px-3 text-sm text-bone focus:border-blood focus:outline-none"
                        />
                      </div>

                      {/* Hospital Location Section */}
                      <div className="rounded-2xl border border-line bg-raised/40 p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-bold text-bone">Hospital Location</p>
                            <p className="text-[11px] text-mute mt-0.5">
                              Sharing your exact location helps donors and patients find you accurately.
                            </p>
                          </div>
                          <Building2 className="h-4 w-4 text-blood shrink-0" />
                        </div>

                        {locationMethod === 'gps' && coords ? (
                          <div className="rounded-xl border border-bone/20 bg-surface p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-semibold text-bone">
                              <Check className="h-4 w-4 text-blood" />
                              <span>Location captured for your hospital</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setLocationMethod(null); setCoords(null) }}
                              className="font-mono text-[10px] uppercase tracking-wider text-mute hover:text-bone"
                            >
                              Use a different method
                            </button>
                          </div>
                        ) : locationMethod === 'manual' ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="e.g. Hospital Road, DI Khan"
                              className="w-full rounded-xl border border-line bg-surface py-2 px-3 text-sm text-bone focus:border-blood focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setLocationMethod(null)}
                              className="font-mono text-[10px] uppercase tracking-wider text-faint hover:text-bone"
                            >
                              Use current location instead
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={requestLocation}
                              disabled={locatingInProgress}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-blood/40 bg-blood/10 py-2.5 px-3 text-xs font-semibold text-blood hover:bg-blood/20 transition-colors cursor-pointer"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              <span>{locatingInProgress ? 'Getting location...' : 'Use Current Location'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setLocationMethod('manual')}
                              className="flex items-center justify-center rounded-xl border border-line bg-surface py-2.5 px-3 text-xs font-medium text-mute hover:text-bone transition-colors"
                            >
                              Enter Address Instead
                            </button>
                          </div>
                        )}

                        {locationError && (
                          <p className="text-xs text-blood">{locationError}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block font-mono text-[10px] uppercase tracking-wider text-mute">
                          License Number
                        </label>
                        <input
                          type="text"
                          value={licenseNo}
                          onChange={(e) => setLicenseNo(e.target.value)}
                          placeholder="e.g. DHQ-DIK-2024"
                          required
                          className="w-full rounded-xl border border-line bg-raised/60 py-2 px-3 text-sm text-bone focus:border-blood focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blood py-3 px-5 text-sm font-semibold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-98 disabled:opacity-60 cursor-pointer"
                    >
                      <span>{loading ? 'Creating account...' : 'Create Account'}</span>
                      {!loading && <ArrowRight className="h-4 w-4" />}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
