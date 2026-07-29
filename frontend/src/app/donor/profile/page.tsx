'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import Link from 'next/link'

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
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
        name, phone, city, bloodGroup, area,
        lastDonated: lastDonated || null,
        shareContactInfo
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
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-[#6B7280] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <Link href="/donor/dashboard" className="text-xs text-[#6B7280] hover:text-white transition-colors mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <p className="text-[#DC2626] text-xs font-medium tracking-widest uppercase mb-3">Donor</p>
        <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">Update your personal and donation information.</p>
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

        {/* Personal info */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">Personal Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] focus:border-[#DC2626] rounded-md px-4 py-2.5 text-white text-sm outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-1.5">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03001234567"
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] focus:border-[#DC2626] rounded-md px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-[#6B7280]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[#9CA3AF] mb-1.5">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] focus:border-[#DC2626] rounded-md px-4 py-2.5 text-white text-sm outline-none transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[#9CA3AF] mb-1.5">
                Area / neighborhood <span className="text-[#6B7280]">(update to refresh your match location)</span>
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Hayatabad, Peshawar"
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] focus:border-[#DC2626] rounded-md px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-[#6B7280]"
              />
              <p className="text-xs text-[#6B7280] mt-1">Leave blank to keep your current saved location.</p>
            </div>
          </div>
        </div>

        {/* Donation info */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">Donation Information</h2>

          <div className="mb-4">
            <label className="block text-sm text-[#9CA3AF] mb-3">
              Blood group <span className="text-[#6B7280]">(optional)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {bloodGroups.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                  className={`py-2.5 rounded-md text-sm font-bold border transition-all duration-150 ${bloodGroup === bg
                      ? 'bg-[#DC2626] border-[#DC2626] text-white'
                      : 'bg-[#0F0F0F] border-[#2A2A2A] text-[#9CA3AF] hover:border-[#DC2626]/40 hover:text-white'
                    }`}
                >
                  {bloodGroupLabels[bg]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">
              Last donated <span className="text-[#6B7280]">(optional)</span>
            </label>
            <input
              type="date"
              value={lastDonated}
              onChange={(e) => setLastDonated(e.target.value)}
              className="w-full bg-[#0F0F0F] border border-[#2A2A2A] focus:border-[#DC2626] rounded-md px-4 py-2.5 text-white text-sm outline-none transition-colors"
            />
          </div>
        </div>

        {/* Availability */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">Availability</h2>
              <p className="text-[#6B7280] text-sm mt-1">Allow hospitals to match you with requests.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isAvailable ? 'bg-green-500' : 'bg-[#333]'
                }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isAvailable ? 'translate-x-1' : '-translate-x-4'
                }`} />
            </button>
          </div>
        </div>

        {/* Share contact info */}
        <div className="bg-[#141414] border border-[#222] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">Share Contact Info</h2>
              <p className="text-[#6B7280] text-sm mt-1">
                If enabled, the hospital can see your name and phone number when you accept their request, to help coordinate the donation.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleShareContactInfo}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${shareContactInfo ? 'bg-green-500' : 'bg-[#333]'
                }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${shareContactInfo ? 'translate-x-1' : '-translate-x-4'
                }`} />
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between">
          <Link
            href="/donor/dashboard"
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
