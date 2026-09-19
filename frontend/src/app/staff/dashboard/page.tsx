'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  Activity,
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  Droplet,
  History,
  Key,
  Copy,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users
} from 'lucide-react'
import { Texture, LiveDot } from '@/components/fk'

dayjs.extend(relativeTime)

interface RegisteredDonor {
  registrationId: string
  registeredAt: string
  donorId: string
  userId: string
  name: string
  email: string
  phone: string
  city: string
  area: string
  bloodGroup: string
  commitmentScore: number
  isAvailable: boolean
  lastDonated: string | null
}

interface StaffProfile {
  id: string
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    city: string
    role: string
    createdAt: string
  }
  createdByHospital: {
    id: string
    name: string
    licenseNo: string
    address: string
  } | null
  createdByAdmin: {
    id: string
    name: string
    email: string
  } | null
  provenanceType: 'HOSPITAL' | 'ADMIN'
  totalDonorsRegistered: number
  createdAt: string
}

const BLOOD_GROUPS = [
  { value: 'A_POS', label: 'A+' },
  { value: 'A_NEG', label: 'A−' },
  { value: 'B_POS', label: 'B+' },
  { value: 'B_NEG', label: 'B−' },
  { value: 'AB_POS', label: 'AB+' },
  { value: 'AB_NEG', label: 'AB−' },
  { value: 'O_POS', label: 'O+' },
  { value: 'O_NEG', label: 'O−' },
]

export default function StaffDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null)
  const [donors, setDonors] = useState<RegisteredDonor[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bloodGroup, setBloodGroup] = useState('O_POS')
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [email, setEmail] = useState('')
  const [customPassword, setCustomPassword] = useState('')
  const [copiedCreds, setCopiedCreds] = useState(false)
  const [shareContactInfo, setShareContactInfo] = useState(true)

  // Feedback State
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lastRegistered, setLastRegistered] = useState<any | null>(null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      router.push('/login')
      return
    }
    if (user.role !== 'STAFF') {
      if (user.role === 'ADMIN') router.push('/admin/dashboard')
      else if (user.role === 'HOSPITAL') router.push('/hospital/dashboard')
      else if (user.role === 'DONOR') router.push('/donor/dashboard')
      else router.push('/')
      return
    }
    fetchData()
  }, [hydrated, user])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [profileRes, donorsRes] = await Promise.all([
        api.get('/api/staff/profile').catch(err => {
          console.error('Failed to fetch staff profile:', err)
          return { data: { staff: null } }
        }),
        api.get('/api/staff/donors').catch(err => {
          console.error('Failed to fetch staff registered donors:', err)
          return { data: { donors: [] } }
        }),
      ])

      if (profileRes.data.staff) {
        setStaffProfile(profileRes.data.staff)
        if (!city && profileRes.data.staff.user?.city) {
          setCity(profileRes.data.staff.user.city)
        }
      }
      setDonors(donorsRes.data.donors || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage(null)
    setLastRegistered(null)
    setCopiedCreds(false)

    if (!name.trim() || !phone.trim() || !city.trim() || !bloodGroup) {
      setError('Please fill in all required fields (Name, Phone, City, Blood Group).')
      return
    }

    try {
      setSubmitting(true)
      const res = await api.post('/api/staff/donors', {
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        bloodGroup,
        area: area.trim() || undefined,
        email: email.trim() || undefined,
        password: customPassword.trim() || undefined,
        shareContactInfo,
      })

      setSuccessMessage('Walk-in donor successfully registered into the emergency blood network!')
      setLastRegistered(res.data.donor)

      // Reset form
      setName('')
      setPhone('')
      setArea('')
      setEmail('')
      setCustomPassword('')

      // Refresh list
      const donorsRes = await api.get('/api/staff/donors')
      setDonors(donorsRes.data.donors || [])

      if (staffProfile) {
        setStaffProfile({
          ...staffProfile,
          totalDonorsRegistered: (staffProfile.totalDonorsRegistered || 0) + 1
        })
      }
    } catch (err: any) {
      console.error('Registration failed:', err)
      setError(err?.response?.data?.message || 'Failed to register walk-in donor. Please check your inputs.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-2 w-48 animate-pulse rounded-full bg-raised" />
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            Loading staff portal...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink py-8 sm:py-12">
      <Texture ember={true} grid={true} noise={true} />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Top Masthead & Telemetry */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem] lg:gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-full border border-blood/30 bg-blood/10 px-3.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blood w-fit">
              <LiveDot />
              <span>Blood Bank Staff Portal</span>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-bone sm:text-4xl md:text-5xl">
                Walk-in Donor Registration
              </h1>
              <p className="mt-1.5 text-sm text-mute">
                Register walk-in donors physically present at your blood bank or clinic.
              </p>
            </div>

            {/* Provenance Badge */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {staffProfile?.provenanceType === 'HOSPITAL' && staffProfile.createdByHospital ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-bone">
                  <Building2 className="h-4 w-4 text-blood shrink-0" />
                  <span>
                    Hospital: <strong className="text-bone font-semibold">{staffProfile.createdByHospital.name}</strong>
                    {staffProfile.createdByHospital.licenseNo && (
                      <span className="font-mono text-faint text-[11px]"> (Lic #{staffProfile.createdByHospital.licenseNo})</span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-bone">
                  <ShieldCheck className="h-4 w-4 text-blood shrink-0" />
                  <span>
                    Admin Promoted Staff
                    {staffProfile?.createdByAdmin && (
                      <span className="text-mute"> by {staffProfile.createdByAdmin.name || staffProfile.createdByAdmin.email}</span>
                    )}
                  </span>
                </div>
              )}

              <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-raised px-3 py-1.5 font-mono text-[11px] text-faint">
                <Clock className="h-3.5 w-3.5 text-faint" />
                <span>Station: {staffProfile?.user?.city || 'Pakistan'}</span>
              </span>
            </div>
          </div>

          {/* Quick Metrics Card */}
          <div className="rounded-3xl border border-line bg-surface/90 p-5 backdrop-blur-xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                Staff Statistics
              </span>
              <span className="rounded-md border border-line bg-raised px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-blood font-semibold">
                Active Staff
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-2xl border border-blood/30 bg-blood/10 p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-blood">Donors Registered</p>
                <p className="mt-1 font-mono text-2xl font-bold text-blood">{donors.length}</p>
                <p className="mt-0.5 font-mono text-[9px] text-faint">By you at this desk</p>
              </div>

              <div className="rounded-2xl border border-line bg-raised/40 p-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-faint">Initial Reliability</p>
                <p className="mt-1 font-mono text-2xl font-bold text-bone">+10 pts</p>
                <p className="mt-0.5 font-mono text-[9px] text-faint">Walk-in donor bonus</p>
              </div>
            </div>

            <div className="rounded-xl border border-line-soft bg-raised/30 p-2.5 text-[11px] text-mute flex items-center gap-2">
              <Award className="h-4 w-4 text-blood shrink-0" />
              <span>Walk-in donors are instantly matched with urgent hospital requisitions.</span>
            </div>
          </div>
        </div>

        {/* Section 1: Walk-in Donor Form */}
        <div className="mb-10 rounded-3xl border border-line bg-surface/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blood/30 bg-blood/10 text-blood">
                <UserPlus className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-bone">
                  Register Walk-in Donor
                </h2>
                <p className="text-xs text-mute">Enter donor's information. Physical address will be geocoded automatically.</p>
              </div>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              Physical Presence Verified
            </span>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-blood/40 bg-blood/10 p-3.5 text-xs text-bone">
              <AlertCircle className="h-4 w-4 shrink-0 text-blood mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
              {lastRegistered && (
                <div className="space-y-3 pt-1">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 p-3 text-[11px] text-bone font-mono grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>Name: <span className="text-emerald-300">{lastRegistered.name}</span></div>
                    <div>Blood Group: <span className="text-blood font-bold">{lastRegistered.bloodGroup}</span></div>
                    <div>Phone: <span className="text-emerald-300">{lastRegistered.phone}</span></div>
                    <div>City / Area: <span className="text-bone">{lastRegistered.area}, {lastRegistered.city}</span></div>
                    <div>Account Email: <span className="text-faint">{lastRegistered.email}</span></div>
                    <div>Initial Score: <span className="text-emerald-400 font-bold">{lastRegistered.commitmentScore} pts</span></div>
                  </div>

                  {lastRegistered.tempPassword && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2.5 text-bone font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5" /> Donor Login Credentials
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const creds = `ForiKhoon Donor Credentials:\nLogin: ${lastRegistered.phone || lastRegistered.email}\nPassword: ${lastRegistered.tempPassword}`
                            navigator.clipboard.writeText(creds)
                            setCopiedCreds(true)
                            setTimeout(() => setCopiedCreds(false), 2500)
                          }}
                          className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-2.5 py-1 rounded transition-colors cursor-pointer"
                        >
                          {copiedCreds ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Credentials</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-ink/70 rounded-lg p-2.5 border border-line space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-mute text-[11px]">Login Identifier (Phone or Email):</span>
                          <strong className="text-emerald-300 select-all font-bold">{lastRegistered.phone || lastRegistered.email}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-mute text-[11px]">Account Password:</span>
                          <strong className="text-amber-300 select-all font-bold tracking-wider bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">{lastRegistered.tempPassword}</strong>
                        </div>
                      </div>
                      <p className="text-[10px] text-mute leading-relaxed">
                        Hand over these credentials to the donor. They can log in immediately at <code>/login</code> using either their Phone Number or Email with this password.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Donor Name */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-mute">
                  Donor Full Name <span className="text-blood">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ali Ahmed"
                  required
                  className="w-full rounded-xl border border-line bg-raised/60 py-2.5 px-3.5 text-sm text-bone placeholder-faint focus:border-blood focus:bg-surface focus:outline-none focus:ring-1 focus:ring-blood/50"
                />
              </div>

              {/* Donor Phone */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-mute">
                  Phone Number <span className="text-blood">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-faint">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03001234567"
                    required
                    className="w-full rounded-xl border border-line bg-raised/60 py-2.5 pl-9 pr-3.5 text-sm text-bone placeholder-faint focus:border-blood focus:bg-surface focus:outline-none focus:ring-1 focus:ring-blood/50"
                  />
                </div>
              </div>

              {/* Blood Group */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-mute">
                  Blood Group <span className="text-blood">*</span>
                </label>
                <div className="relative">
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    required
                    className="w-full rounded-xl border border-line bg-raised py-2.5 px-3.5 text-sm text-bone focus:border-blood focus:bg-surface focus:outline-none focus:ring-1 focus:ring-blood/50 cursor-pointer"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg.value} value={bg.value} className="bg-surface text-bone">
                        {bg.label} ({bg.value})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-mute">
                  City <span className="text-blood">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-faint">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Islamabad"
                    required
                    className="w-full rounded-xl border border-line bg-raised/60 py-2.5 pl-9 pr-3.5 text-sm text-bone placeholder-faint focus:border-blood focus:bg-surface focus:outline-none focus:ring-1 focus:ring-blood/50"
                  />
                </div>
              </div>

              {/* Area / Address */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-mute">
                  Area / Neighborhood / Street
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. G-9/1, Blue Area, Saddar"
                  className="w-full rounded-xl border border-line bg-raised/60 py-2.5 px-3.5 text-sm text-bone placeholder-faint focus:border-blood focus:bg-surface focus:outline-none focus:ring-1 focus:ring-blood/50"
                />
              </div>

              {/* Email (Optional) */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-mute">
                  Email Address <span className="text-faint text-[10px] lowercase">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="donor@example.com"
                  className="w-full rounded-xl border border-line bg-raised/60 py-2.5 px-3.5 text-sm text-bone placeholder-faint focus:border-blood focus:bg-surface focus:outline-none focus:ring-1 focus:ring-blood/50"
                />
              </div>

              {/* Account Password (Optional) */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-mute">
                  Initial Password <span className="text-faint text-[10px] lowercase">(optional, leave blank to auto-generate)</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-faint">
                    <Key className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="password"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Enter custom password or leave blank for a generated code (e.g. FK-A8F1)"
                    className="w-full rounded-xl border border-line bg-raised/60 py-2.5 pl-9 pr-3.5 text-sm text-bone placeholder-faint focus:border-blood focus:bg-surface focus:outline-none focus:ring-1 focus:ring-blood/50"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox: Share contact info */}
            <div className="rounded-xl border border-line bg-raised/30 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareContactInfo}
                  onChange={(e) => setShareContactInfo(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-line bg-raised text-blood focus:ring-blood/50"
                />
                <div className="text-xs">
                  <span className="font-semibold text-bone">
                    Share contact details with hospitals upon match acceptance
                  </span>
                  <p className="text-mute mt-0.5">
                    Permits verified hospitals to view the donor's name and phone number once the donor accepts their emergency request.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blood py-3 px-6 text-sm font-semibold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>{submitting ? 'Registering Walk-in Donor...' : 'Register Walk-in Donor'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Section 2: Donors Registered by this Staff Member */}
        <div className="rounded-3xl border border-line bg-surface/80 p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-raised text-bone">
                <History className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-bone">
                  Your Registered Walk-in Donors ({donors.length})
                </h2>
                <p className="text-xs text-mute">
                  Isolated history of walk-in donors registered by your staff account.
                </p>
              </div>
            </div>

            <button
              onClick={fetchData}
              title="Refresh donor list"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-1.5 font-mono text-xs text-mute hover:text-bone transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          </div>

          {donors.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface/60 p-12 text-center backdrop-blur-md">
              <Users className="mx-auto h-8 w-8 text-faint" />
              <p className="mt-3 text-sm font-semibold text-bone">No walk-in donors registered yet</p>
              <p className="mt-1 text-xs text-mute">
                Use the form above to register physical walk-in donors.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="grid grid-cols-[1fr_4rem_6rem] border-b border-line px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-faint sm:grid-cols-[1.2fr_4.5rem_6.5rem_6.5rem_7rem]">
                <span>Donor</span>
                <span className="text-center">Group</span>
                <span className="hidden sm:block">Phone</span>
                <span className="hidden sm:block">Location</span>
                <span className="text-right">Registered</span>
              </div>

              <div className="divide-y divide-line">
                {donors.map((d) => (
                  <div
                    key={d.registrationId}
                    className="grid grid-cols-[1fr_4rem_6rem] items-center px-4 py-3.5 sm:grid-cols-[1.2fr_4.5rem_6.5rem_6.5rem_7rem]"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-semibold text-bone text-sm">{d.name}</p>
                      <p className="truncate font-mono text-[11px] text-faint">{d.email}</p>
                    </div>

                    <div className="text-center">
                      <span className="inline-flex items-center justify-center rounded-lg border border-blood/30 bg-blood/10 px-2.5 py-1 font-mono text-xs font-bold text-blood">
                        {d.bloodGroup.replace('_POS', '+').replace('_NEG', '−')}
                      </span>
                    </div>

                    <div className="hidden font-mono text-xs text-bone sm:block">
                      {d.phone || '—'}
                    </div>

                    <div className="hidden text-xs text-mute sm:block truncate pr-2">
                      {d.area || d.city}
                    </div>

                    <div className="text-right font-mono text-[11px] text-faint">
                      {dayjs(d.registeredAt).fromNow()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
