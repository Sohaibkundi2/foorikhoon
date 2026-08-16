// app/hospital/profile.tsx
import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { router, Link } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

export default function HospitalProfileScreen() {
  const { user } = useAuthStore()

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

  const requestLocation = async () => {
    setLocationError('')
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== 'granted') {
        setLocationError('permission_denied')
        return
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
      setLocationMethod('gps')
    } catch (err) {
      console.error('Location error:', err)
      setLocationError('unavailable')
    }
  }

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role !== 'HOSPITAL') { router.replace('/'); return }
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

  const handleSave = async () => {
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
      <View style={styles.centerScreen}>
        <ActivityIndicator color="#DC2626" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0F0F0F' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Link href="/hospital/dashboard" asChild>
          <TouchableOpacity style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back to dashboard</Text>
          </TouchableOpacity>
        </Link>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>HOSPITAL</Text>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your hospital information.</Text>
        </View>

        {/* Verification status */}
        <View style={[styles.verifyBanner, verified ? styles.verifyBannerOk : styles.verifyBannerPending]}>
          <Text style={[styles.verifyBannerText, { color: verified ? '#4ADE80' : '#FACC15' }]}>
            {verified
              ? 'Your hospital is verified by ForiKhoon admin.'
              : 'Your hospital is pending verification. An admin will review your details soon.'}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>Profile updated successfully.</Text>
          </View>
        ) : null}

        {/* Hospital info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hospital Information</Text>

          <Text style={styles.label}>Hospital name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholderTextColor="#6B7280"
          />

          <View style={{ marginBottom: 14 }}>
            {locationMethod === 'gps' && coords ? (
              <View style={styles.locationConfirmedBox}>
                <Text style={styles.locationConfirmedText}>✓ Location captured for your hospital</Text>
                <TouchableOpacity onPress={() => { setLocationMethod(null); setCoords(null) }}>
                  <Text style={styles.locationSwitchText}>Use a different method</Text>
                </TouchableOpacity>
              </View>
            ) : locationMethod === 'manual' ? (
              <View>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  style={styles.input}
                  placeholderTextColor="#6B7280"
                />
                <TouchableOpacity onPress={() => setLocationMethod(null)}>
                  <Text style={styles.locationSwitchText}>Use current location instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.locationPromptBox}>
                <Text style={styles.locationPromptTitle}>Update hospital location</Text>
                <Text style={styles.locationPromptDesc}>
                  Sharing your exact location helps donors and patients find you accurately.
                </Text>
                <TouchableOpacity style={styles.locationButton} onPress={requestLocation} activeOpacity={0.85}>
                  <Text style={styles.locationButtonText}>Use Current Location</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLocationMethod('manual')}>
                  <Text style={styles.locationManualText}>Enter address instead</Text>
                </TouchableOpacity>

                {locationError ? (
                  <Text style={styles.locationErrorText}>
                    {locationError === 'permission_denied'
                      ? "We couldn't access your location. You can try again or enter your address manually."
                      : 'Something went wrong. Please enter your address instead.'}
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          <Text style={styles.label}>
            License number <Text style={styles.optional}>(cannot be changed)</Text>
          </Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.inputDisabledText}>{licenseNo}</Text>
          </View>
        </View>

        {/* Contact info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>

          <Text style={styles.label}>City</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            style={styles.input}
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.label}>
            Phone <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="03001234567"
            keyboardType="phone-pad"
            style={[styles.input, { marginBottom: 0 }]}
            placeholderTextColor="#6B7280"
          />
        </View>

        {/* Save */}
        <View style={styles.footerRow}>
          <TouchableOpacity onPress={() => router.push('/hospital/dashboard')}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  centerScreen: { flex: 1, backgroundColor: '#0F0F0F', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20, paddingBottom: 48 },

  backLink: { marginBottom: 16 },
  backLinkText: { color: '#6B7280', fontSize: 12 },

  header: { marginBottom: 20 },
  eyebrow: { color: '#DC2626', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, fontWeight: '600' },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 6 },

  verifyBanner: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  verifyBannerOk: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' },
  verifyBannerPending: { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.2)' },
  verifyBannerText: { fontSize: 13 },

  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 8, padding: 12, marginBottom: 16,
  },
  errorBannerText: { color: '#F87171', fontSize: 13 },

  successBanner: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 8, padding: 12, marginBottom: 16,
  },
  successBannerText: { color: '#4ADE80', fontSize: 13 },

  card: {
    backgroundColor: '#141414', borderWidth: 1, borderColor: '#222',
    borderRadius: 12, padding: 16, marginBottom: 16,
  },
  cardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 12 },

  label: { color: '#9CA3AF', fontSize: 13, marginBottom: 6 },
  optional: { color: '#6B7280' },
  input: {
    backgroundColor: '#0F0F0F', borderWidth: 1, borderColor: '#2A2A2A',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    color: '#FFFFFF', fontSize: 14, marginBottom: 14, justifyContent: 'center',
  },
  inputDisabled: { backgroundColor: '#0A0A0A', borderColor: '#1A1A1A' },
  inputDisabledText: { color: '#6B7280', fontSize: 14 },

  locationConfirmedBox: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 8,
    padding: 12,
  },
  locationConfirmedText: { color: '#4ADE80', fontSize: 14, marginBottom: 4 },
  locationSwitchText: { color: '#6B7280', fontSize: 12, textDecorationLine: 'underline' },

  locationPromptBox: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  locationPromptTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  locationPromptDesc: { color: '#6B7280', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  locationButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  locationManualText: { color: '#6B7280', fontSize: 12, textDecorationLine: 'underline' },
  locationErrorText: { color: '#F87171', fontSize: 12, marginTop: 8, textAlign: 'center' },

  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cancelText: { color: '#6B7280', fontSize: 14 },
  saveButton: { backgroundColor: '#DC2626', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8, minWidth: 140, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: 'rgba(220,38,38,0.5)' },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
})