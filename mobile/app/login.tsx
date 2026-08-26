import { View, Text, StyleSheet } from 'react-native'
import { useState } from 'react'
import { router, Link } from 'expo-router'
import { ArrowRight, Eye, EyeOff, TriangleAlert } from 'lucide-react-native'
import { useAuthStore } from '../src/store/authStore'
import api from '../src/lib/api'
import { Screen, PageHead, Field, Input, Button, Notice, Rule, Label } from '../src/components/fk'
import { color, font, statusTone, toneFor } from '../src/theme'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  /* Purely presentational: the eye toggle. Typing a password blind on a phone
     keyboard is the most common cause of a failed sign-in on this app. */
  const [reveal, setReveal] = useState(false)

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
    <Screen keyboardShouldPersistTaps="handled" tail={40}>
      {/* Ranged left and top-anchored rather than a card floating in the middle
          of the viewport. A centred 400px box is the web login form ported
          without thinking about the device it landed on. */}
      <PageHead
        eyebrow="ForiKhoon · Sign in"
        title="Welcome"
        accent="back."
        sub="Your matches, your commitment score and your donation history are on the other side of this form."
      />

      <View style={styles.gutter}>
        {error ? (
          <Notice tone={toneFor(statusTone, 'NO_SHOW')} icon={TriangleAlert} style={{ marginBottom: 22 }}>
            {error}
          </Notice>
        ) : null}

        <Field label="Email address">
          <Input
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />
        </Field>

        <Field label="Password">
          <View style={styles.passwordWrap}>
            <Input
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!reveal}
              autoCapitalize="none"
              autoComplete="password"
              style={styles.passwordInput}
            />
            <Button
              tone="quiet"
              size="sm"
              icon={reveal ? EyeOff : Eye}
              onPress={() => setReveal((v) => !v)}
              haptic={false}
              style={styles.revealBtn}
            >
              {reveal ? 'Hide' : 'Show'}
            </Button>
          </View>
        </Field>

        <Button
          tone="primary"
          size="lg"
          full
          icon={ArrowRight}
          busy={loading}
          onPress={handleLogin}
          style={{ marginTop: 10 }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <Rule style={{ marginTop: 34 }} />
        <View style={styles.footerRow}>
          <Label>No account yet</Label>
          <Link href="/register" style={styles.footerLink}>Register</Link>
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },

  /* The reveal control sits in the field, not beside it — a separate button
     below the input reads as a second action rather than as part of the input. */
  passwordWrap: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 92 },
  revealBtn: { position: 'absolute', right: 7, paddingVertical: 7 },

  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16,
  },
  footerLink: {
    fontFamily: font.mono.medium, fontSize: 10, letterSpacing: 1.5,
    textTransform: 'uppercase', color: color.bloodLite,
  },
})
