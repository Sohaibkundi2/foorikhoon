'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import Link from 'next/link'

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
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-[#6B7280] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <Link href="/hospital/dashboard" className="text-xs text-[#6B7280] hover:text-white transition-colors mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <p className="text-[#DC2626] text-xs font-medium tracking-widest uppercase mb-3">Hospital</p>
        <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">Update your hospital information.</p>
      </div>

      {/* Verification status */}
      <div className={`mb-6 px-4 py-3 rounded-md border text-sm ${
        verified
          ? 'bg-green-500/10 border-green-500/20 text-green-400'
          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
      }`}>
        {verified
          ? 'Your hospital is verified by ForiKhoon admin.'
          : 'Your hospital is pending verification. An admin will review your details soon.'}
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-md">
          Profile updated successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        {/* Hospital info */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">Hospital Information</h2>
          <div className="space-y-4">

            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">Hospital name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] focus:border-[#DC2626] rounded-md px-4 py-2.5 text-white text-sm outline-none transition-colors"
              />
            </div>

            <div>
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
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] focus:border-[#DC2626] rounded-md px-4 py-2.5 text-white text-sm outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setLocationMethod(null)}
                    className="text-xs text-[#6B7280] hover:text-white underline mt-2"
                  >
                    Use current location instead
                  </button>
                </div>
              ) : (
                <div className="bg-[#0F0F0F] border border-[#2A2A2A] rounded-md p-4 text-center">
                  <p className="text-white text-sm mb-1">Update hospital location</p>
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
            </div>

            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">
                License number <span className="text-[#6B7280]">(cannot be changed)</span>
              </label>
              <input
                type="text"
                value={licenseNo}
                disabled
                className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded-md px-4 py-2.5 text-[#6B7280] text-sm outline-none cursor-not-allowed"
              />
            </div>

          </div>
        </div>

        {/* Contact info */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">Contact Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] focus:border-[#DC2626] rounded-md px-4 py-2.5 text-white text-sm outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">
                Phone <span className="text-[#6B7280]">(optional)</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03001234567"
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] focus:border-[#DC2626] rounded-md px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-[#6B7280]"
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between">
          <Link
            href="/hospital/dashboard"
            className="text-sm text-[#6B7280] hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#DC2626]/50 disabled:cursor-not-allowed text-white font-medium px-7 py-2.5 rounded-md transition-colors duration-150 text-sm shadow-lg shadow-red-900/20"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>

    </div>
  )
}