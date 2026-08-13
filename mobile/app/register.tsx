// app/register.tsx
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Pressable
} from 'react-native'
import { useState } from 'react'
import { Link, router } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import api from '../src/lib/api'
import * as Location from 'expo-location'

type Role = 'DONOR' | 'HOSPITAL' | null

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']
const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−',
}

export default function Register() {
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

  const { setAuth } = useAuthStore()

  const handleSubmit = async () => {
    setError('')

    if (!email || !password || !name || !city) {
      setError('Please fill in all required fields')
      return
    }
    if (role === 'HOSPITAL' && (!hospitalName || !address || !licenseNo)) {
      setError('Please fill in all hospital details')
      return
    }
    if (role === 'HOSPITAL' && (!hospitalName || !address || !licenseNo)) {
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
        await api.post('/api/hospital/profile', { name: hospitalName, address, licenseNo })
        router.push('/hospital/dashboard')
      }
    } catch (err: any) {
        console.error('Registration error:', err?.message, err?.response?.data)
        setError(err?.response?.data?.message || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

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
  // ── Step 1: Role picker ──────────────────────────────────────────────────
  if (!role) {
    return (
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>CREATE ACCOUNT</Text>
            <Text style={styles.title}>Register</Text>
            <Text style={styles.subtitle}>
              Already have an account?{' '}
              <Link href="/login" style={styles.link}>Sign in</Link>
            </Text>
          </View>

          <Text style={styles.rolePrompt}>I want to...</Text>

          <TouchableOpacity style={styles.roleCard} onPress={() => setRole('DONOR')} activeOpacity={0.8}>
            <Text style={styles.roleTitle}>Donate blood</Text>
            <Text style={styles.roleDesc}>Register as a donor and help save lives</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.roleCard} onPress={() => setRole('HOSPITAL')} activeOpacity={0.8}>
            <Text style={styles.roleTitle}>Request blood for my hospital</Text>
            <Text style={styles.roleDesc}>Register your hospital and post blood requests</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  // ── Step 2: Registration form ────────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CREATE ACCOUNT</Text>
          <Text style={styles.title}>Register</Text>
          <Text style={styles.subtitle}>
            Already have an account?{' '}
            <Link href="/login" style={styles.link}>Sign in</Link>
          </Text>
        </View>

        {/* Role badge + change */}
        <View style={styles.roleBadgeRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {role === 'DONOR' ? 'Registering as Donor' : 'Registering as Hospital'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { setRole(null); setError('') }}>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Common fields */}
        <Field label="Full name">
          <TextInput
            style={styles.input} placeholderTextColor="#6B7280"
            placeholder="Ali Khan" value={name} onChangeText={setName}
            autoCapitalize="words"
          />
        </Field>

        <Field label="Email address">
          <TextInput
            style={styles.input} placeholderTextColor="#6B7280"
            placeholder="you@example.com" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          />
        </Field>

        <Field label="Password">
          <TextInput
            style={styles.input} placeholderTextColor="#6B7280"
            placeholder="••••••••" value={password} onChangeText={setPassword}
            secureTextEntry
          />
        </Field>

        {/* City + Phone row */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="City">
              <TextInput
                style={styles.input} placeholderTextColor="#6B7280"
                placeholder="DI Khan" value={city} onChangeText={setCity}
              />
            </Field>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field label="Phone (optional)">
              <TextInput
                style={styles.input} placeholderTextColor="#6B7280"
                placeholder="03001234567" value={phone} onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </Field>
          </View>
        </View>

        {/* Donor: blood group */}
        {role === 'DONOR' && (
          <View style={styles.field}>
            <Text style={styles.label}>Blood group <Text style={styles.optional}>(optional)</Text></Text>
            <View style={styles.bloodGrid}>
              {bloodGroups.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bloodBtn, bloodGroup === bg && styles.bloodBtnActive]}
                  onPress={() => setBloodGroup(bg)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.bloodBtnText, bloodGroup === bg && styles.bloodBtnTextActive]}>
                    {bloodGroupLabels[bg]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.unknownBtn, bloodGroup === '' && styles.unknownBtnActive]}
              onPress={() => setBloodGroup('')}
              activeOpacity={0.8}
            >
              <Text style={[styles.unknownText, bloodGroup === '' && styles.unknownTextActive]}>
                I don't know my blood group
              </Text>
            </TouchableOpacity>

            <View style={styles.field}>
              <Text style={styles.label}>Your location</Text>

              {locationMethod === 'gps' && coords ? (
                <View style={styles.locationConfirmedBox}>
                  <Text style={styles.locationConfirmedText}>✓ Your location has been saved for matching</Text>
                  <TouchableOpacity onPress={() => { setLocationMethod(null); setCoords(null) }}>
                    <Text style={styles.locationSwitchText}>Use a different method</Text>
                  </TouchableOpacity>
                </View>
              ) : locationMethod === 'manual' ? (
                <View>
                  <TextInput
                    style={styles.input} placeholderTextColor="#6B7280"
                    placeholder="Hayatabad, Peshawar" value={area} onChangeText={setArea}
                  />
                  <Text style={styles.helperText}>Used to match you with nearby requests — not your exact address.</Text>
                  <TouchableOpacity onPress={() => setLocationMethod(null)}>
                    <Text style={styles.locationSwitchText}>Use my location instead</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.locationPromptBox}>
                  <Text style={styles.locationPromptTitle}>Share your location</Text>
                  <Text style={styles.locationPromptDesc}>
                    For faster, more accurate matching in an emergency, we recommend sharing your location.
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
        )}

        {/* Hospital fields */}
        {role === 'HOSPITAL' && (
          <>
            <Field label="Hospital name">
              <TextInput
                style={styles.input} placeholderTextColor="#6B7280"
                placeholder="DHQ Hospital DI Khan" value={hospitalName}
                onChangeText={setHospitalName}
              />
            </Field>
            <Field label="Address">
              <TextInput
                style={styles.input} placeholderTextColor="#6B7280"
                placeholder="Hospital Road, DI Khan" value={address}
                onChangeText={setAddress}
              />
            </Field>
            <Field label="License number">
              <TextInput
                style={styles.input} placeholderTextColor="#6B7280"
                placeholder="DHQ-DIK-2024" value={licenseNo}
                onChangeText={setLicenseNo}
              />
            </Field>
          </>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating account...' : 'Create account'}
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  )
}

// ── Small helper component ──────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },

  // Header
  header: { marginBottom: 32 },
  eyebrow: { color: '#DC2626', fontSize: 11, fontWeight: '600', letterSpacing: 2, marginBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#9CA3AF', fontSize: 14, lineHeight: 20 },
  link: { color: '#FFFFFF', textDecorationLine: 'underline' },

  // Role picker
  rolePrompt: { color: '#9CA3AF', fontSize: 14, marginBottom: 16 },
  roleCard: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
  },
  roleTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  roleDesc: { color: '#6B7280', fontSize: 12 },

  // Role badge
  roleBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  roleBadge: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleBadgeText: { color: '#DC2626', fontSize: 12 },
  changeText: { color: '#6B7280', fontSize: 12 },

  // Error
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  errorText: { color: '#F87171', fontSize: 14, lineHeight: 20 },

  // Fields
  field: { marginBottom: 16 },
  label: { color: '#9CA3AF', fontSize: 14, marginBottom: 6 },
  optional: { color: '#6B7280' },
  input: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  row: { flexDirection: 'row' },

  helperText: { color: '#6B7280', fontSize: 11, marginTop: 4 },

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
  backgroundColor: '#141414',
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

  // Blood group grid
  bloodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  bloodBtn: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
    alignItems: 'center',
  },
  bloodBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  bloodBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  bloodBtnTextActive: { color: '#FFFFFF' },

  unknownBtn: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  unknownBtnActive: {
    borderColor: 'rgba(220,38,38,0.4)',
    backgroundColor: 'rgba(220,38,38,0.05)',
  },
  unknownText: { color: '#6B7280', fontSize: 12 },
  unknownTextActive: { color: '#DC2626' },

  // Submit button
  button: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
})