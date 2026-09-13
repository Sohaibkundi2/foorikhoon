import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { router } from 'expo-router'
import {
  ArrowLeft, Check, CircleCheck, Eye, EyeOff, Lock, TriangleAlert,
} from 'lucide-react-native'
import { useAuthStore } from '../src/store/authStore'
import api from '../src/lib/api'
import { Screen, PageHead, Field, Input, Button, Notice, Rule, Label, Panel } from '../src/components/fk'
import { color, font, statusTone, toneFor } from '../src/theme'

export default function ChangePasswordScreen() {
  const { user } = useAuthStore()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user])

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setError('Please enter your current password')
      return
    }

    if (!newPassword) {
      setError('Please enter a new password')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setError('')
    setSuccess(false)

    try {
      setLoading(true)
      await api.put('/api/auth/change-password', {
        currentPassword,
        newPassword,
      })
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to change password. Please check your current password and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else if (user?.role === 'HOSPITAL') {
      router.replace('/hospital/profile')
    } else {
      router.replace('/donor/profile')
    }
  }

  const okTone = toneFor(statusTone, 'FULFILLED')
  const errorTone = toneFor(statusTone, 'NO_SHOW')

  return (
    <Screen keyboardShouldPersistTaps="handled" tail={40}>
      <View style={[styles.gutter, { paddingTop: 6 }]}>
        <Pressable onPress={handleBack} style={styles.backLink} hitSlop={8}>
          <ArrowLeft size={13} color={color.mute} strokeWidth={2} />
          <Text style={styles.backLinkText}>Profile</Text>
        </Pressable>
      </View>

      <PageHead
        eyebrow="Security · Password"
        title="Change"
        accent="password."
        sub="Enter your current password followed by your new password."
      />

      <View style={styles.gutter}>
        {error ? (
          <Notice tone={errorTone} icon={TriangleAlert} style={{ marginBottom: 20 }}>
            {error}
          </Notice>
        ) : null}

        {success ? (
          <Notice tone={okTone} icon={CircleCheck} style={{ marginBottom: 20 }}>
            Password updated successfully.
          </Notice>
        ) : null}

        <Field label="Current password">
          <View style={styles.passwordWrap}>
            <Input
              placeholder="Your current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              autoComplete="password"
              style={styles.passwordInput}
            />
            <Button
              tone="quiet"
              size="sm"
              icon={showCurrent ? EyeOff : Eye}
              onPress={() => setShowCurrent((v) => !v)}
              haptic={false}
              style={styles.revealBtn}
            >
              {showCurrent ? 'Hide' : 'Show'}
            </Button>
          </View>
        </Field>

        <Field label="New password (min. 8 characters)">
          <View style={styles.passwordWrap}>
            <Input
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoComplete="password-new"
              style={styles.passwordInput}
            />
            <Button
              tone="quiet"
              size="sm"
              icon={showNew ? EyeOff : Eye}
              onPress={() => setShowNew((v) => !v)}
              haptic={false}
              style={styles.revealBtn}
            >
              {showNew ? 'Hide' : 'Show'}
            </Button>
          </View>
        </Field>

        <Field label="Confirm new password">
          <View style={styles.passwordWrap}>
            <Input
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoComplete="password-new"
              style={styles.passwordInput}
            />
            <Button
              tone="quiet"
              size="sm"
              icon={showConfirm ? EyeOff : Eye}
              onPress={() => setShowConfirm((v) => !v)}
              haptic={false}
              style={styles.revealBtn}
            >
              {showConfirm ? 'Hide' : 'Show'}
            </Button>
          </View>
        </Field>

        <Button
          tone="primary"
          size="lg"
          full
          icon={Lock}
          busy={loading}
          onPress={handleChangePassword}
          style={{ marginTop: 10 }}
        >
          {loading ? 'Updating password…' : 'Change password'}
        </Button>

        <Rule style={{ marginTop: 34 }} />
        <Pressable onPress={handleBack} style={styles.cancelRow} hitSlop={6}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
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

  passwordWrap: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 92 },
  revealBtn: { position: 'absolute', right: 7, paddingVertical: 7 },

  cancelRow: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelText: {
    fontFamily: font.mono.regular,
    fontSize: 12,
    color: color.mute,
    letterSpacing: 0.5,
  },
})
