// app/hospital/inventory.tsx
import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

interface Inventory {
  id: string
  bloodGroup: string
  units: number
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

const ALL_GROUPS = Object.keys(bloodGroupLabels)
const LOW_STOCK_THRESHOLD = 5

export default function HospitalInventoryScreen() {
  const { user } = useAuthStore()

  const [inventory, setInventory] = useState<Inventory[]>([])
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'HOSPITAL') { router.replace('/'); return }
    fetchInventory()
  }, [user])

  const fetchInventory = async () => {
    try {
      const res = await api.get('/api/hospital/inventory')
      const data: Inventory[] = res.data.inventory

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
    const num = Math.max(0, parseInt(value, 10) || 0)
    setEditValues(prev => ({ ...prev, [bloodGroup]: num }))
  }

  const adjust = (bloodGroup: string, delta: number) => {
    setEditValues(prev => ({ ...prev, [bloodGroup]: Math.max(0, prev[bloodGroup] + delta) }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(
        ALL_GROUPS.map(bg =>
          api.put('/api/hospital/inventory', { bloodGroup: bg, units: editValues[bg] })
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
    const values: Record<string, number> = {}
    ALL_GROUPS.forEach(bg => { values[bg] = 0 })
    inventory.forEach(item => { values[item.bloodGroup] = item.units })
    setEditValues(values)
    setEditing(false)
  }

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>HOSPITAL</Text>
        <Text style={styles.title}>Blood Inventory</Text>
        <Text style={styles.subtitle}>
          Keep your stock levels up to date so donors can be matched accurately.
        </Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {ALL_GROUPS.map((bg) => {
          const units = editValues[bg]
          const isLow = units < LOW_STOCK_THRESHOLD

          return (
            <View key={bg} style={[styles.tile, isLow && styles.tileLow]}>
              <Text style={styles.tileGroup}>{bloodGroupLabels[bg]}</Text>

              {editing ? (
                <View style={styles.editRow}>
                  <TouchableOpacity
                    onPress={() => adjust(bg, -1)}
                    style={styles.stepperBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepperBtnText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={String(units)}
                    onChangeText={(v) => handleChange(bg, v)}
                    keyboardType="number-pad"
                    style={styles.input}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    onPress={() => adjust(bg, 1)}
                    style={styles.stepperBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.tileValue}>{units}</Text>
              )}

              <Text style={styles.tileUnitLabel}>units</Text>
              {isLow && <Text style={styles.lowLabel}>Low stock</Text>}
            </View>
          )
        })}
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        {editing ? (
          <>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={saving}
              style={styles.outlineBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.outlineBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.solidBtn, saving && styles.solidBtnDisabled]}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.solidBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={[styles.solidBtn, { flex: 1 }]}
            activeOpacity={0.85}
          >
            <Text style={styles.solidBtnText}>Edit Inventory</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F0F0F' },
  content: { padding: 20, paddingBottom: 100 },
  centerScreen: { flex: 1, backgroundColor: '#0F0F0F', alignItems: 'center', justifyContent: 'center' },

  header: { marginBottom: 20 },
  eyebrow: { color: '#6B7280', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, fontWeight: '600' },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 6, lineHeight: 19 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  tile: {
    width: '47.5%',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  tileLow: { borderColor: 'rgba(220,38,38,0.4)' },
  tileGroup: { color: '#DC2626', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  tileValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  tileUnitLabel: { color: '#6B7280', fontSize: 11, marginTop: 6 },
  lowLabel: { color: '#F87171', fontSize: 11, fontWeight: '600', marginTop: 3 },

  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperBtn: {
    width: 30, height: 30, borderRadius: 6,
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  input: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 6,
  },

  actionsRow: { flexDirection: 'row', gap: 10 },
  outlineBtn: {
    flex: 1, borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  outlineBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  solidBtn: { flex: 1, backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  solidBtnDisabled: { backgroundColor: 'rgba(220,38,38,0.5)' },
  solidBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
})