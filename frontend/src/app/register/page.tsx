'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
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

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="mb-8">
          <p className="text-[#DC2626] text-xs font-medium tracking-widest uppercase mb-3">Create account</p>
          <h1 className="text-3xl font-bold text-white">Register</h1>
          <p className="text-[#9CA3AF] text-sm mt-2">
            Already have an account?{' '}
            <Link href="/login" className="text-white hover:text-[#DC2626] transition-colors underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>

        {!role && (
          <div className="space-y-3">
            <p className="text-[#9CA3AF] text-sm mb-5">I want to...</p>
            <button
              onClick={() => setRole('DONOR')}
              className="w-full bg-[#141414] hover:bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#DC2626]/40 text-left px-5 py-4 rounded-md transition-all duration-150 group"
            >
              <p className="text-white font-medium text-sm group-hover:text-[#DC2626] transition-colors">Donate blood</p>
              <p className="text-[#6B7280] text-xs mt-0.5">Register as a donor and help save lives</p>
            </button>
            <button
              onClick={() => setRole('HOSPITAL')}
              className="w-full bg-[#141414] hover:bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#DC2626]/40 text-left px-5 py-4 rounded-md transition-all duration-150 group"
            >
              <p className="text-white font-medium text-sm group-hover:text-[#DC2626] transition-colors">Request blood for my hospital</p>
              <p className="text-[#6B7280] text-xs mt-0.5">Register your hospital and post blood requests</p>
            </button>
          </div>
        )}

        {role && (
          <>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs bg-[#DC2626]/10 border border-[#DC2626]/20 text-[#DC2626] px-3 py-1 rounded-full">
                {role === 'DONOR' ? 'Registering as Donor' : 'Registering as Hospital'}
              </span>
              <button
                onClick={() => { setRole(null); setError('') }}
                className="text-xs text-[#6B7280] hover:text-white transition-colors"
              >
                Change
              </button>
            </div>

            {error && (
              <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-sm text-[#9CA3AF] mb-1.5">Full name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali Khan"
                  className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-[#9CA3AF] mb-1.5">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-[#9CA3AF] mb-1.5">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#9CA3AF] mb-1.5">City</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="DI Khan"
                    className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-[#9CA3AF] mb-1.5">Phone <span className="text-[#6B7280]">(optional)</span></label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567"
                    className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors" />
                </div>
              </div>

              {role === 'DONOR' && (
                <div>
                  <div>
                    {locationMethod === 'gps' && coords ? (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-md px-4 py-3">
                        <p className="text-green-400 text-sm">✓ We'll use this to match you with nearby requests</p>
                        <button
                          type="button"
                          onClick={() => { setLocationMethod(null); setCoords(null) }}
                          className="text-xs text-[#6B7280] hover:text-white underline mt-1"
                        >
                          Use a different method
                        </button>
                      </div>
                    ) : locationMethod === 'manual' ? (
                      <div>
                        <label className="block text-sm text-[#9CA3AF] mb-1.5">Area / neighborhood</label>
                        <input
                          type="text" value={area} onChange={(e) => setArea(e.target.value)}
                          placeholder="Hayatabad, Peshawar"
                          className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors"
                        />
                        <p className="text-xs text-[#6B7280] mt-1">Used to match you with nearby requests — not your exact address.</p>
                        <button
                          type="button"
                          onClick={() => setLocationMethod(null)}
                          className="text-xs text-[#6B7280] hover:text-white underline mt-2"
                        >
                          Use my location instead
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#141414] border border-[#2A2A2A] rounded-md p-4 text-center">
                        <p className="text-white text-sm mb-1">Share your location</p>
                        <p className="text-[#6B7280] text-xs mb-3">
                          For faster, more accurate matching in an emergency, we recommend sharing your location.
                        </p>
                        <button
                          type="button"
                          onClick={requestLocation}
                          disabled={locatingInProgress}
                          className="w-full bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#DC2626]/50 text-white text-sm font-medium py-2.5 rounded-md transition-colors mb-2"
                        >
                          {locatingInProgress ? 'Getting location...' : 'Use My Location'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationMethod('manual')}
                          className="text-xs text-[#6B7280] hover:text-white underline"
                        >
                          Enter address instead
                        </button>

                        {locationError && (
                          <p className="text-red-400 text-xs mt-2">
                            {locationError === 'permission_denied'
                              ? "We couldn't access your location. You can try again or enter your address manually."
                              : 'Something went wrong getting your location. Please enter your address instead.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <label className="block text-sm text-[#9CA3AF] mb-2 mt-4">
                    Blood group <span className="text-[#6B7280]">(optional)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {bloodGroups.map((bg) => (
                      <button key={bg} type="button" onClick={() => setBloodGroup(bg)}
                        className={`py-2.5 rounded-md text-sm font-semibold border transition-all duration-150 ${
                          bloodGroup === bg
                            ? 'bg-[#DC2626] border-[#DC2626] text-white'
                            : 'bg-[#141414] border-[#2A2A2A] text-[#9CA3AF] hover:border-[#DC2626]/40 hover:text-white'
                        }`}>
                        {bloodGroupLabels[bg]}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setBloodGroup('')}
                      className={`col-span-4 py-2 rounded-md text-xs border transition-all duration-150 ${
                        bloodGroup === ''
                          ? 'border-[#DC2626]/40 text-[#DC2626] bg-[#DC2626]/5'
                          : 'border-[#2A2A2A] text-[#6B7280] hover:text-white'
                      }`}
                    >
                      I don't know my blood group
                    </button>
                  </div>
                </div>
              )}

              {role === 'HOSPITAL' && (
              <>
                <div>
                  <label className="block text-sm text-[#9CA3AF] mb-1.5">Hospital name</label>
                  <input type="text" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="DHQ Hospital DI Khan"
                    className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors" />
                </div>

                {locationMethod === 'gps' && coords ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-md px-4 py-3">
                    <p className="text-green-400 text-sm">✓ Location captured for your hospital</p>
                    <button
                      type="button"
                      onClick={() => { setLocationMethod(null); setCoords(null) }}
                      className="text-xs text-[#6B7280] hover:text-white underline mt-1"
                    >
                      Use a different method
                    </button>
                  </div>
                ) : locationMethod === 'manual' ? (
                  <div>
                    <label className="block text-sm text-[#9CA3AF] mb-1.5">Address</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Hospital Road, DI Khan"
                      className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors" />
                    <button
                      type="button"
                      onClick={() => setLocationMethod(null)}
                      className="text-xs text-[#6B7280] hover:text-white underline mt-2"
                    >
                      Use current location instead
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#141414] border border-[#2A2A2A] rounded-md p-4 text-center">
                    <p className="text-white text-sm mb-1">Hospital location</p>
                    <p className="text-[#6B7280] text-xs mb-3">
                      Sharing your exact location helps donors and patients find you accurately.
                    </p>
                    <button
                      type="button"
                      onClick={requestLocation}
                      disabled={locatingInProgress}
                      className="w-full bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#DC2626]/50 text-white text-sm font-medium py-2.5 rounded-md transition-colors mb-2"
                    >
                      {locatingInProgress ? 'Getting location...' : 'Use Current Location'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMethod('manual')}
                      className="text-xs text-[#6B7280] hover:text-white underline"
                    >
                      Enter address instead
                    </button>

                    {locationError && (
                      <p className="text-red-400 text-xs mt-2">
                        {locationError === 'permission_denied'
                          ? "We couldn't access your location. You can try again or enter your address manually."
                          : 'Something went wrong. Please enter your address instead.'}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[#9CA3AF] mb-1.5">License number</label>
                  <input type="text" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} placeholder="DHQ-DIK-2024"
                    className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors" />
                </div>
              </>
            )}

              <div className="pt-1">
                <button type="submit" disabled={loading}
                  className="w-full bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#DC2626]/50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-md transition-colors duration-150 text-sm shadow-lg shadow-red-900/20">
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </div>

            </form>
          </>
        )}

      </div>
    </div>
  )
}