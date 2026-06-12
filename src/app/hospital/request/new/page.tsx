"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import Link from 'next/link'

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const urgencyOptions = [
  { value: 'NORMAL', label: 'Normal', desc: 'Needed within a few days' },
  { value: 'URGENT', label: 'Urgent', desc: 'Needed within 24 hours' },
  { value: 'CRITICAL', label: 'Critical', desc: 'Needed immediately' },
]

const urgencyColors: Record<string, string> = {
  NORMAL: 'border-green-500/40 bg-green-500/5 text-green-400',
  URGENT: 'border-orange-500/40 bg-orange-500/5 text-orange-400',
  CRITICAL: 'border-red-500/40 bg-red-500/5 text-red-400',
}

export default function NewRequestPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [bloodGroup, setBloodGroup] = useState('')
  const [units, setUnits] = useState(1)
  const [urgency, setUrgency] = useState('NORMAL')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ matchedDonors: number } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!bloodGroup) {
      setError('Please select a blood group')
      return
    }

    try {
      setLoading(true)
      const res = await api.post('/api/requests', { bloodGroup, units, urgency, notes })
      setSuccess({ matchedDonors: res.data.matchedDonors })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to post request. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-green-400 text-2xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Request Posted</h2>
          <p className="text-[#9CA3AF] text-sm mb-2">
            Your blood request has been posted successfully.
          </p>
          {success.matchedDonors > 0 ? (
            <p className="text-green-400 text-sm font-medium mb-8">
              {success.matchedDonors} donor{success.matchedDonors !== 1 ? 's' : ''} matched and notified.
            </p>
          ) : (
            <p className="text-yellow-400 text-sm mb-8">
              No matching donors found right now. We will notify you when one becomes available.
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setSuccess(null); setBloodGroup(''); setNotes(''); setUnits(1); setUrgency('NORMAL') }}
              className="text-sm border border-[#2A2A2A] hover:border-[#3A3A3A] text-[#9CA3AF] hover:text-white px-5 py-2.5 rounded-md transition-all duration-150"
            >
              Post another
            </button>
            <Link
              href="/hospital/dashboard"
              className="text-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white px-5 py-2.5 rounded-md transition-colors duration-150"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-8">
        <Link href="/hospital/dashboard" className="text-xs text-[#6B7280] hover:text-white transition-colors mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <p className="text-[#DC2626] text-xs font-medium tracking-widest uppercase mb-3">New Request</p>
        <h1 className="text-3xl font-bold text-white">Post Blood Request</h1>
        <p className="text-[#9CA3AF] text-sm mt-2">
          Matching donors in your city will be notified immediately.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Blood group */}
        <div>
          <label className="block text-sm text-[#9CA3AF] mb-3">Blood group required</label>
          <div className="grid grid-cols-4 gap-2">
            {bloodGroups.map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => setBloodGroup(bg)}
                className={`py-3 rounded-md text-sm font-bold border transition-all duration-150 ${
                  bloodGroup === bg
                    ? 'bg-[#DC2626] border-[#DC2626] text-white'
                    : 'bg-[#141414] border-[#2A2A2A] text-[#9CA3AF] hover:border-[#DC2626]/40 hover:text-white'
                }`}
              >
                {bloodGroupLabels[bg]}
              </button>
            ))}
          </div>
        </div>

        {/* Units */}
        <div>
          <label className="block text-sm text-[#9CA3AF] mb-3">Units needed</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setUnits(Math.max(1, units - 1))}
              className="w-10 h-10 bg-[#141414] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white rounded-md text-lg font-bold transition-all duration-150"
            >
              −
            </button>
            <span className="text-3xl font-bold text-white w-8 text-center">{units}</span>
            <button
              type="button"
              onClick={() => setUnits(Math.min(20, units + 1))}
              className="w-10 h-10 bg-[#141414] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white rounded-md text-lg font-bold transition-all duration-150"
            >
              +
            </button>
            <span className="text-[#6B7280] text-sm ml-2">unit{units !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-sm text-[#9CA3AF] mb-3">Urgency level</label>
          <div className="space-y-2">
            {urgencyOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-md border transition-all duration-150 ${
                  urgency === opt.value
                    ? urgencyColors[opt.value]
                    : 'bg-[#141414] border-[#2A2A2A] hover:border-[#3A3A3A]'
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-[#6B7280] mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm text-[#9CA3AF] mb-1.5">
            Additional notes <span className="text-[#6B7280]">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Patient is scheduled for surgery tomorrow morning"
            rows={3}
            className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#DC2626]/50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-md transition-colors duration-150 text-sm shadow-lg shadow-red-900/20"
        >
          {loading ? 'Posting request...' : 'Post Blood Request'}
        </button>

      </form>

    </div>
  )
}
