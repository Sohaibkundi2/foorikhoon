import { useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { router, Link, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft, ArrowRight, CircleCheck, Eye, EyeOff, KeyRound, Lock, ShieldAlert,
  TriangleAlert,
} from 'lucide-react-native'
import api from '../src/lib/api'
import { Screen, PageHead, Field, Input, Button, Notice, Rule, Label, Panel } from '../src/components/fk'
import { color, font, statusTone, toneFor } from '../src/theme'

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>()
  const [token, setToken] = useState(params.token || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async () => {
    const trimmedToken = token.trim()
    if (!trimmedToken) {
      setError('Please enter your reset code or token')
      return
    }

    if (!password) {
      setError('Please enter a new password')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError('')
    try {
      setLoading(true)
      await api.post('/api/auth/reset-password', {
        token: trimmedToken,
        newPassword: password,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to reset password. The link or code may have expired or already been used.'
      )
    } finally {
      setLoading(false)
    }
  }

  const okTone = toneFor(statusTone, 'FULFILLED')
  const errorTone = toneFor(statusTone, 'NO_SHOW')
  const warnTone = toneFor(statusTone, 'PENDING')

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
        eyebrow="ForiKhoon · Account security"
        title="Set new"
        accent="password."
        sub="Enter the reset code sent to your email, choose a new password, and confirm."
      />

      <View style={styles.gutter}>
        {error ? (
          <Notice tone={errorTone} icon={TriangleAlert} style={{ marginBottom: 20 }}>
            {error}
          </Notice>
        ) : null}

        {success ? (
          <View style={styles.successBlock}>
            <Notice tone={okTone} icon={CircleCheck} style={{ marginBottom: 18 }}>
              Password reset successfully. You can now sign in with your new password.
            </Notice>

            <Panel style={{ marginBottom: 20 }}>
              <Text style={styles.panelTitle}>Account Security Note</Text>
              <Text style={styles.panelText}>
                Your password has been updated. For your security, all active sessions on other
                devices have been signed out.
              </Text>
            </Panel>

            <Button
              tone="primary"
              size="lg"
              full
              icon={ArrowRight}
              onPress={() => router.replace('/login')}
            >
              Sign in with new password
            </Button>
          </View>
        ) : (
          <>
            <Panel tone={warnTone} style={{ marginBottom: 20 }}>
              <View style={styles.warnRow}>
                <ShieldAlert size={14} color={color.warnLite} strokeWidth={2} />
                <Text style={styles.warnTitle}>Notice: Device sign-out</Text>
              </View>
              <Text style={styles.warnText}>
                Resetting your password will automatically sign out all existing sessions on other devices.
              </Text>
            </Panel>

            <Field
              label="Reset code / token"
              hint="Paste the code or token from your reset email."
            >
              <Input
                placeholder="e.g. 64-character token"
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>

            <Field label="New password (min. 8 characters)">
              <View style={styles.passwordWrap}>
                <Input
                  placeholder="Enter new password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  style={styles.passwordInput}
                />
                <Button
                  tone="quiet"
                  size="sm"
                  icon={showPassword ? EyeOff : Eye}
                  onPress={() => setShowPassword((v) => !v)}
                  haptic={false}
                  style={styles.revealBtn}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              </View>
            </Field>

            <Field label="Confirm new password">
              <View style={styles.passwordWrap}>
                <Input
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  style={styles.passwordInput}
                />
                <Button
                  tone="quiet"
                  size="sm"
                  icon={showConfirmPassword ? EyeOff : Eye}
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  haptic={false}
                  style={styles.revealBtn}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Button>
              </View>
            </Field>

            <Button
              tone="primary"
              size="lg"
              full
              icon={KeyRound}
              busy={loading}
              onPress={handleReset}
              style={{ marginTop: 10 }}
            >
              {loading ? 'Saving password…' : 'Save new password'}
            </Button>

            <View style={{ alignItems: 'center', marginTop: 18 }}>
              <Link href="/forgot-password" style={styles.needCodeLink}>
                Need a new reset link? Request one
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

  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  warnTitle: {
    fontFamily: font.sans.medium,
    fontSize: 13,
    color: color.warnLite,
    letterSpacing: -0.2,
  },
  warnText: {
    fontFamily: font.sans.regular,
    fontSize: 12,
    lineHeight: 17,
    color: color.mute,
  },

  passwordWrap: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 92 },
  revealBtn: { position: 'absolute', right: 7, paddingVertical: 7 },

  needCodeLink: {
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
