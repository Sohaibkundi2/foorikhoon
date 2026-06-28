'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface Inventory {
  id: string
  bloodGroup: string
  units: number
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const ALL_GROUPS = Object.keys(bloodGroupLabels)
const LOW_STOCK_THRESHOLD = 5

export default function HospitalInventoryPage() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [inventory, setInventory] = useState<Inventory[]>([])
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'HOSPITAL') { router.push('/'); return }
    fetchInventory()
  }, [user])

  const fetchInventory = async () => {
    try {
      const res = await api.get('/api/hospital/inventory')
      const data: Inventory[] = res.data.inventory
            console.log('fetched:', data)

      // Build a map of bloodGroup -> units, defaulting to 0 for any
      // group the hospital hasn't set up yet
      const values: Record<string, number> = {}
      ALL_GROUPS.forEach(bg => { values[bg] = 0 })
      data.forEach(item => { values[item.bloodGroup] = item.units })

      setInventory(data)
      setEditValues(values)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (bloodGroup: string, value: string) => {
    const num = Math.max(0, parseInt(value) || 0)
    setEditValues(prev => ({ ...prev, [bloodGroup]: num }))
  }

const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(
        ALL_GROUPS.map(bg =>
          api.put('/api/hospital/inventory', {
            bloodGroup: bg,
            units: editValues[bg],
          })
        )
      )
      await fetchInventory()
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }
  const handleCancel = () => {
    // Reset edit values back to the last fetched state
    const values: Record<string, number> = {}
    ALL_GROUPS.forEach(bg => { values[bg] = 0 })
    inventory.forEach(item => { values[item.bloodGroup] = item.units })
    setEditValues(values)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-[#6B7280] text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-[#6B7280] text-xs uppercase tracking-widest mb-2">Hospital</p>
          <h1 className="text-3xl font-bold text-white">Blood Inventory</h1>
          <p className="text-[#9CA3AF] text-sm mt-2">
            Keep your stock levels up to date so donors can be matched accurately.
          </p>
        </div>
        <div className="flex gap-3">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="text-sm border border-[#2A2A2A] hover:border-[#3A3A3A] text-[#9CA3AF] hover:text-white px-4 py-2 rounded-md transition-all duration-150 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md transition-colors duration-150 shadow-lg shadow-red-900/20 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md transition-colors duration-150 shadow-lg shadow-red-900/20"
            >
              Edit Inventory
            </button>
          )}
        </div>
      </div>

      {/* Inventory grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ALL_GROUPS.map((bg) => {
          const units = editValues[bg]
          const isLow = units < LOW_STOCK_THRESHOLD

          return (
            <div
              key={bg}
              className={`bg-[#141414] border rounded-xl p-5 text-center transition-colors ${
                isLow ? 'border-[#DC2626]/40' : 'border-[#222]'
              }`}
            >
              <p className="text-[#DC2626] font-bold text-lg mb-3">
                {bloodGroupLabels[bg]}
              </p>

              {editing ? (
                <input
                  type="number"
                  min={0}
                  value={units}
                  onChange={(e) => handleChange(bg, e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-md text-center text-white text-lg font-bold py-2 focus:outline-none focus:border-[#DC2626]"
                />
              ) : (
                <p className="text-white text-2xl font-bold">{units}</p>
              )}

              <p className="text-[#6B7280] text-xs mt-2">units</p>

              {isLow && (
                <p className="text-[#DC2626] text-xs mt-1 font-medium">Low stock</p>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}