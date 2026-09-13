import { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { router, Link } from 'expo-router'
import { ArrowLeft, ArrowRight, CircleCheck, KeyRound, TriangleAlert } from 'lucide-react-native'
import api from '../src/lib/api'
import { Screen, PageHead, Field, Input, Button, Notice, Rule, Label, Panel } from '../src/components/fk'
import { color, font, statusTone, toneFor } from '../src/theme'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const handleForgot = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Please enter your email address')
      return
    }

    setError('')
    try {
      setLoading(true)
      await api.post('/api/auth/forgot-password', { email: trimmed })
      setSentEmail(trimmed)
      setSuccess(true)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to send reset link. Please check your connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const okTone = toneFor(statusTone, 'FULFILLED')
  const errorTone = toneFor(statusTone, 'NO_SHOW')

  return (
    <Screen keyboardShouldPersistTaps="handled" tail={40}>
      <View style={[styles.gutter, { paddingTop: 6 }]}>
        <Pressable
          onPress={() => router.push('/login')}
          style={styles.backLink}
          hitSlop={8}
        >
          <ArrowLeft size={13} color={color.mute} strokeWidth={2} />
          <Text style={styles.backLinkText}>Sign In</Text>
        </Pressable>
      </View>

      <PageHead
        eyebrow="ForiKhoon · Password recovery"
        title="Forgot"
        accent="password?"
        sub="Enter your registered email address. If an account exists, we'll send you a password reset link."
      />

      <View style={styles.gutter}>
        {error ? (
          <Notice tone={errorTone} icon={TriangleAlert} style={{ marginBottom: 22 }}>
            {error}
          </Notice>
        ) : null}

        {success ? (
          <View style={styles.successBlock}>
            <Notice tone={okTone} icon={CircleCheck} style={{ marginBottom: 18 }}>
              Reset link sent. If an account exists for {sentEmail}, you will receive an email shortly.
            </Notice>

            <Panel style={{ marginBottom: 20 }}>
              <Text style={styles.panelTitle}>What to do next</Text>
              <Text style={styles.panelText}>
                1. Check your inbox (and spam or junk folder) for an email from ForiKhoon.{'\n'}
                2. If using the mobile app, copy the reset code/token from your email and enter it below.{'\n'}
                3. The reset code is valid for 15 minutes.
              </Text>
            </Panel>

            <Button
              tone="primary"
              size="lg"
              full
              icon={KeyRound}
              onPress={() => router.push('/reset-password')}
              style={{ marginBottom: 12 }}
            >
              Enter reset code
            </Button>

            <Button
              tone="quiet"
              size="md"
              full
              onPress={() => {
                setSuccess(false)
                setEmail('')
              }}
            >
              Try a different email
            </Button>
          </View>
        ) : (
          <>
            <Field label="Registered email">
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

            <Button
              tone="primary"
              size="lg"
              full
              icon={ArrowRight}
              busy={loading}
              onPress={handleForgot}
              style={{ marginTop: 10 }}
            >
              {loading ? 'Sending link…' : 'Send reset link'}
            </Button>

            <View style={{ alignItems: 'center', marginTop: 18 }}>
              <Link href="/reset-password" style={styles.codeLink}>
                Already have a reset code? Enter code
              </Link>
            </View>

            <Rule style={{ marginTop: 34 }} />
            <View style={styles.footerRow}>
              <Label>Remember password?</Label>
              <Link href="/login" style={styles.footerLink}>
                Sign in
              </Link>
            </View>
          </>
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },

  backLink: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  backLinkText: {
    fontFamily: font.mono.medium,
    fontSize: 9.5,
    color: color.mute,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  successBlock: { marginTop: 4 },

  panelTitle: {
    fontFamily: font.sans.medium,
    fontSize: 14,
    color: color.bone,
    marginBottom: 8,
  },
  panelText: {
    fontFamily: font.sans.regular,
    fontSize: 12.5,
    lineHeight: 19,
    color: color.mute,
  },

  codeLink: {
    fontFamily: font.mono.regular,
    fontSize: 11,
    color: color.mute,
    letterSpacing: 0.3,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  footerLink: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: color.bloodLite,
  },
})
