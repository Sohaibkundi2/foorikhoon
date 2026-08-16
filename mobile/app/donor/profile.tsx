import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useNetwork } from '../../src/hooks/useNetwork'
import { saveCache, loadCache } from '../../src/lib/cache'
import OfflineBanner from '../../src/components/OfflineBanner'

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

export default function DonorProfileScreen() {
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [lastDonated, setLastDonated] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isAvailable, setIsAvailable] = useState(true)
  const [area, setArea] = useState('')
  const [shareContactInfo, setShareContactInfo] = useState(false)
  const [locationMethod, setLocationMethod] = useState<'gps' | 'manual' | null>(null)
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationError, setLocationError] = useState('')

  const { isOnline } = useNetwork()
  const [cacheTime, setCacheTime] = useState<number | null>(null)

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
    if (!user) {
      router.replace('/login')
      return
    }
    if (user.role !== 'DONOR') {
      router.replace('/')
      return
    }
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    if (!isOnline) {
      const cachedProfile = await loadCache('donor_profile')

      if (cachedProfile) {
        const donor = cachedProfile.data

        setName(donor.user.name || '')
        setPhone(donor.user.phone || '')
        setCity(donor.user.city || '')
        setBloodGroup(donor.bloodGroup || '')
        setArea(donor.area || '')
        setLastDonated(
          donor.lastDonated ? new Date(donor.lastDonated) : null
        )
        setIsAvailable(donor.isAvailable)
        setShareContactInfo(donor.shareContactInfo ?? false)

        setCacheTime(cachedProfile.time)
      }

      setLoading(false)
      return
    }

    try {
      const res = await api.get('/api/donor/profile')
      const { donor } = res.data

      setName(donor.user.name || '')
      setPhone(donor.user.phone || '')
      setCity(donor.user.city || '')
      setBloodGroup(donor.bloodGroup || '')
      setArea(donor.area || '')
      setLastDonated(
        donor.lastDonated ? new Date(donor.lastDonated) : null
      )
      setIsAvailable(donor.isAvailable)
      setShareContactInfo(donor.shareContactInfo ?? false)

      // Save latest profile
      await saveCache('donor_profile', donor)
      setCacheTime(Date.now())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setError('')
    setSuccess(false)
    try {
      setSaving(true)
      await api.put('/api/donor/profile', {
        name,
        phone,
        city,
        bloodGroup,
        lastDonated: lastDonated ? lastDonated.toISOString().split('T')[0] : null,
        shareContactInfo,
        ...(locationMethod === 'gps' && coords
          ? { latitude: coords.latitude, longitude: coords.longitude }
          : { area }),
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

      {!isOnline && <OfflineBanner lastUpdated={cacheTime} />}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity onPress={() => router.push('/donor/dashboard')} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back to dashboard</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>DONOR</Text>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your personal and donation information.</Text>
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

        {/* Personal info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          <Text style={styles.label}>Full name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="03001234567"
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor="#6B7280"
          />

          <Text style={styles.label}>City</Text>
          <TextInput
            value={city}
            onChangeText={setCity}
            style={styles.input}
            placeholderTextColor="#6B7280"
          />

          <View style={{ marginBottom: 14 }}>
            {locationMethod === 'gps' && coords ? (
              <View style={styles.locationConfirmedBox}>
                <Text style={styles.locationConfirmedText}>✓ We'll use this to match you with nearby requests</Text>
                <TouchableOpacity onPress={() => { setLocationMethod(null); setCoords(null) }}>
                  <Text style={styles.locationSwitchText}>Use a different method</Text>
                </TouchableOpacity>
              </View>
            ) : locationMethod === 'manual' ? (
              <View>
                <Text style={styles.label}>Area / neighborhood</Text>
                <TextInput
                  value={area}
                  onChangeText={setArea}
                  placeholder="Hayatabad, Peshawar"
                  style={styles.input}
                  placeholderTextColor="#6B7280"
                />
                <Text style={styles.helperTextArea}>Leave blank to keep your current saved location.</Text>
                <TouchableOpacity onPress={() => setLocationMethod(null)}>
                  <Text style={styles.locationSwitchText}>Use my location instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.locationPromptBox}>
                <Text style={styles.locationPromptTitle}>Update your location</Text>
                <Text style={styles.locationPromptDesc}>
                  Share your current location for more accurate matching, or enter your area manually.
                </Text>
                <TouchableOpacity style={styles.locationButton} onPress={requestLocation} activeOpacity={0.85}>
                  <Text style={styles.locationButtonText}>Use My Location</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLocationMethod('manual')}>
                  <Text style={styles.locationManualText}>Enter address instead</Text>
                </TouchableOpacity>

                {locationError ? (
                  <Text style={styles.locationErrorText}>
                    {locationError === 'permission_denied'
                      ? "We couldn't access your location. You can try again or enter your address manually."
                      : 'Something went wrong getting your location. Please enter your address instead.'}
                  </Text>
                ) : null}
              </View>
            )}
          </View> 
        </View>

        {/* Donation info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Donation Information</Text>

          <Text style={styles.label}>
            Blood group <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.bloodGrid}>
            {bloodGroups.map((bg) => {
              const active = bloodGroup === bg
              return (
                <TouchableOpacity
                  key={bg}
                  onPress={() => setBloodGroup(active ? '' : bg)}
                  style={[styles.bloodButton, active && styles.bloodButtonActive]}
                >
                  <Text style={[styles.bloodButtonText, active && styles.bloodButtonTextActive]}>
                    {bloodGroupLabels[bg]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>
            Last donated <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: lastDonated ? '#FFFFFF' : '#6B7280', fontSize: 14 }}>
              {lastDonated ? lastDonated.toLocaleDateString() : 'Select a date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={lastDonated || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                setShowDatePicker(Platform.OS === 'ios')
                if (event.type === 'set' && date) setLastDonated(date)
                if (Platform.OS === 'android') setShowDatePicker(false)
                }}
            />
          )}
        </View>

        {/* Availability */}
        <View style={styles.card}>
          <View style={styles.availabilityRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.cardTitle}>Availability</Text>
              <Text style={styles.availabilitySubtext}>
                Allow hospitals to match you with requests.
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: '#333', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.card}>
        <View style={styles.availabilityRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.cardTitle}>Share Contact Info</Text>
            <Text style={styles.availabilitySubtext}>
              If enabled, the hospital can see your name and phone number when you accept their request, to help coordinate the donation.
            </Text>
          </View>
          <Switch
            value={shareContactInfo}
            onValueChange={toggleShareContactInfo}
            trackColor={{ false: '#333', true: '#22C55E' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

        {/* Save */}
        <View style={styles.footerRow}>
          <TouchableOpacity onPress={() => router.push('/donor/dashboard')}>
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

  successBanner: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: { color: '#4ADE80', fontSize: 13 },

  card: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 12 },

  label: { color: '#9CA3AF', fontSize: 13, marginBottom: 6 },
  optional: { color: '#6B7280' },
  input: {
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 14,
    justifyContent: 'center',
  },

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

  helperTextArea: { color: '#6B7280', fontSize: 11, marginTop: -8, marginBottom: 14 },

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

  availabilityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  availabilitySubtext: { color: '#6B7280', fontSize: 13, marginTop: 4 },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cancelText: { color: '#6B7280', fontSize: 14 },
  saveButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: 'rgba(220,38,38,0.5)' },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
})