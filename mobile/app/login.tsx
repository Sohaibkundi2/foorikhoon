import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useState } from 'react'
import { router, Link } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'
import api from '../src/lib/api'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const { setAuth } = useAuthStore()

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setError('')
    try {
      setLoading(true)
      const response = await api.post('/api/auth/login', { email, password })
      const { user, token } = response.data
      await setAuth(user, token)
      if (user.role === 'DONOR') router.replace('/donor/dashboard')
      else if (user.role === 'HOSPITAL') router.replace('/hospital/dashboard')
      else if (user.role === 'ADMIN') router.replace('/admin/dashboard')
    } catch (err: any) {
  console.log('ERROR:', err?.message)
  console.log('CODE:', err?.code)
  console.log('RESPONSE:', err?.response?.data)
  setError(err?.response?.data?.message || err?.message || 'Login failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Don't have an account?{' '}
            <Link href="/register" style={styles.link}>Register</Link>
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={[styles.input, emailFocused && styles.inputFocused]}
            placeholder="you@example.com"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, passwordFocused && styles.inputFocused]}
            placeholder="••••••••"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: '#0A0A0A', justifyContent: 'center' },
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 48, justifyContent: 'center', maxWidth: 400, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 32 },
  eyebrow: { color: '#DC2626', fontSize: 11, fontWeight: '600', letterSpacing: 2, marginBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#9CA3AF', fontSize: 14 },
  link: { color: '#FFFFFF', textDecorationLine: 'underline' },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, marginBottom: 20 },
  errorText: { color: '#F87171', fontSize: 14 },
  field: { marginBottom: 16 },
  label: { color: '#9CA3AF', fontSize: 14, marginBottom: 6 },
  input: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: '#FFFFFF', fontSize: 14 },
  inputFocused: { borderColor: '#DC2626' },
  button: { backgroundColor: '#DC2626', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
})