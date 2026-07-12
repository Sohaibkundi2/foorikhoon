// app/hospital/request/new.tsx
import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { router, Link } from 'expo-router'
import api from '../../../src/lib/api'

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

const urgencyOptions = [
  { value: 'NORMAL', label: 'Normal', desc: 'Needed within a few days', color: '#4ADE80' },
  { value: 'URGENT', label: 'Urgent', desc: 'Needed within 24 hours', color: '#FB923C' },
  { value: 'CRITICAL', label: 'Critical', desc: 'Needed immediately', color: '#F87171' },
]

export default function NewRequestScreen() {
  const [bloodGroup, setBloodGroup] = useState('')
  const [units, setUnits] = useState(1)
  const [urgency, setUrgency] = useState('NORMAL')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ matchedDonors: number } | null>(null)

  const handleSubmit = async () => {
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

  const resetForm = () => {
    setSuccess(null)
    setBloodGroup('')
    setNotes('')
    setUnits(1)
    setUrgency('NORMAL')
  }

  // ── Success state ──────────────────────────────────────────────────────
  if (success) {
    const matched = success.matchedDonors > 0
    return (
      <View style={styles.successScreen}>
        <View style={styles.successIconWrap}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Request Posted</Text>
        <Text style={styles.successSub}>Your blood request has been posted successfully.</Text>

        {matched ? (
          <Text style={styles.matchedText}>
            {success.matchedDonors} donor{success.matchedDonors !== 1 ? 's' : ''} matched and notified.
          </Text>
        ) : (
          <Text style={styles.noMatchText}>
            No matching donors found right now. We'll notify you when one becomes available.
          </Text>
        )}

        <View style={styles.successActions}>
          <TouchableOpacity style={styles.outlineBtn} onPress={resetForm} activeOpacity={0.8}>
            <Text style={styles.outlineBtnText}>Post another</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.solidBtn}
            onPress={() => router.replace('/hospital/dashboard')}
            activeOpacity={0.85}
          >
            <Text style={styles.solidBtnText}>Go to dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0A0A0A' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Link href="/hospital/dashboard" asChild>
          <TouchableOpacity style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back to dashboard</Text>
          </TouchableOpacity>
        </Link>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>NEW REQUEST</Text>
          <Text style={styles.title}>Post Blood Request</Text>
          <Text style={styles.subtitle}>Matching donors in your city will be notified immediately.</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Blood group */}
        <View style={styles.card}>
          <Text style={styles.label}>Blood group required</Text>
          <View style={styles.bloodGrid}>
            {bloodGroups.map((bg) => {
              const active = bloodGroup === bg
              return (
                <TouchableOpacity
                  key={bg}
                  onPress={() => setBloodGroup(bg)}
                  style={[styles.bloodButton, active && styles.bloodButtonActive]}
                >
                  <Text style={[styles.bloodButtonText, active && styles.bloodButtonTextActive]}>
                    {bloodGroupLabels[bg]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Units */}
        <View style={styles.card}>
          <Text style={styles.label}>Units needed</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              onPress={() => setUnits(Math.max(1, units - 1))}
              style={styles.stepperBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{units}</Text>
            <TouchableOpacity
              onPress={() => setUnits(Math.min(20, units + 1))}
              style={styles.stepperBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.stepperUnit}>unit{units !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Urgency */}
        <View style={styles.card}>
          <Text style={styles.label}>Urgency level</Text>
          <View style={{ gap: 8 }}>
            {urgencyOptions.map((opt) => {
              const active = urgency === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setUrgency(opt.value)}
                  style={[
                    styles.urgencyOption,
                    active && {
                      backgroundColor: `${opt.color}14`,
                      borderColor: `${opt.color}66`,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.urgencyLabel, active && { color: opt.color }]}>{opt.label}</Text>
                  <Text style={styles.urgencyDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.label}>
            Additional notes <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Patient is scheduled for surgery tomorrow morning"
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={3}
            style={styles.textarea}
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Post Blood Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 48 },

  backLink: { marginBottom: 16 },
  backLinkText: { color: '#6B7280', fontSize: 12 },

  header: { marginBottom: 24 },
  eyebrow: { color: '#DC2626', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, fontWeight: '600' },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 6 },

  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: '#F87171', fontSize: 13 },

  card: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: { color: '#9CA3AF', fontSize: 13, marginBottom: 12 },
  optional: { color: '#6B7280' },

  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bloodButton: {
    width: '22.5%',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
  },
  bloodButtonActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  bloodButtonText: { color: '#9CA3AF', fontSize: 14, fontWeight: '700' },
  bloodButtonTextActive: { color: '#FFFFFF' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: '#0F0F0F', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  stepperValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '700', width: 36, textAlign: 'center' },
  stepperUnit: { color: '#6B7280', fontSize: 13, marginLeft: 4 },

  urgencyOption: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  urgencyLabel: { color: '#E5E7EB', fontSize: 14, fontWeight: '600' },
  urgencyDesc: { color: '#6B7280', fontSize: 12, marginTop: 2 },

  textarea: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  submitBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { backgroundColor: 'rgba(220,38,38,0.5)' },
  submitBtnText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' },

  // Success state
  successScreen: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(74,222,128,0.1)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successIcon: { color: '#4ADE80', fontSize: 24, fontWeight: '700' },
  successTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  successSub: { color: '#9CA3AF', fontSize: 13.5, textAlign: 'center', marginBottom: 6 },
  matchedText: { color: '#4ADE80', fontSize: 13.5, fontWeight: '600', textAlign: 'center', marginBottom: 28 },
  noMatchText: { color: '#FACC15', fontSize: 13.5, textAlign: 'center', marginBottom: 28 },
  successActions: { flexDirection: 'row', gap: 10 },
  outlineBtn: { borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  outlineBtnText: { color: '#9CA3AF', fontSize: 13.5, fontWeight: '600' },
  solidBtn: { backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  solidBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },
})