import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Trash2, TriangleAlert } from 'lucide-react-native'
import { useAuthStore } from '../src/store/authStore'
import api from '../src/lib/api'
import { Screen, PageHead, Field, Input, Button, Notice, Rule, Panel } from '../src/components/fk'
import { color, font, statusTone, toneFor, wash } from '../src/theme'

export default function DeleteAccountScreen() {
  const { user, logout } = useAuthStore()
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user])

  const handleDelete = async () => {
    const trimmed = confirmation.trim().toLowerCase()
    if (trimmed !== 'delete') {
      setError("Please type 'delete' to confirm account deletion")
      return
    }

    setError('')
    try {
      setLoading(true)
      await api.delete('/api/auth/account', {
        data: { confirmation: 'delete' },
      })
      await logout()
      router.replace('/login')
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to delete account. Please check your connection and try again.'
      )
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

  const errorTone = toneFor(statusTone, 'NO_SHOW')
  const isDeleteConfirmed = confirmation.trim().toLowerCase() === 'delete'

  return (
    <Screen keyboardShouldPersistTaps="handled" tail={40}>
      <View style={[styles.gutter, { paddingTop: 6 }]}>
        <Pressable onPress={handleBack} style={styles.backLink} hitSlop={8}>
          <ArrowLeft size={13} color={color.mute} strokeWidth={2} />
          <Text style={styles.backLinkText}>Profile</Text>
        </Pressable>
      </View>

      <PageHead
        eyebrow="Account · Danger Zone"
        title="Delete"
        accent="account."
        sub="Permanently remove your account and all associated records from ForiKhoon."
      />

      <View style={styles.gutter}>
        {error ? (
          <Notice tone={errorTone} icon={TriangleAlert} style={{ marginBottom: 20 }}>
            {error}
          </Notice>
        ) : null}

        {/* Danger Zone Card */}
        <View style={styles.dangerCard}>
          <View style={styles.dangerHeader}>
            <View style={styles.dangerHeaderLeft}>
              <TriangleAlert size={16} color={color.bloodLite} strokeWidth={2} />
              <Text style={styles.dangerTitle}>Danger Zone</Text>
            </View>
            <Text style={styles.dangerBadge}>Permanent</Text>
          </View>

          <Text style={styles.dangerBody}>
            Permanently delete your {user?.role === 'HOSPITAL' ? 'hospital' : 'donor'} account.
            All your profile details, activity history, and associated records will be permanently wiped.
            This action cannot be undone.
          </Text>

          <Field
            label="Type 'delete' to confirm"
            hint="This step prevents accidental account deletion."
            style={{ marginTop: 8 }}
          >
            <Input
              placeholder="type delete to confirm"
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.confirmInput,
                isDeleteConfirmed && styles.confirmInputValid,
              ]}
            />
          </Field>

          <Button
            tone="danger"
            size="lg"
            full
            icon={Trash2}
            busy={loading}
            disabled={!isDeleteConfirmed || loading}
            onPress={handleDelete}
            style={{ marginTop: 10 }}
          >
            {loading ? 'Deleting account…' : 'Delete my account permanently'}
          </Button>
        </View>

        <Rule style={{ marginTop: 34 }} />
        <Pressable onPress={handleBack} style={styles.cancelRow} hitSlop={6}>
          <Text style={styles.cancelText}>Cancel and return to profile</Text>
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

  dangerCard: {
    backgroundColor: wash.blood,
    borderWidth: 1,
    borderColor: wash.bloodEdge,
    borderRadius: 12,
    padding: 18,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: wash.bloodEdge,
    paddingBottom: 12,
    marginBottom: 14,
  },
  dangerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dangerTitle: {
    fontFamily: font.sans.semibold,
    fontSize: 14.5,
    color: color.bloodLite,
    letterSpacing: -0.2,
  },
  dangerBadge: {
    fontFamily: font.mono.medium,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: color.bloodLite,
  },
  dangerBody: {
    fontFamily: font.sans.regular,
    fontSize: 12.5,
    lineHeight: 18.5,
    color: color.mute,
    marginBottom: 16,
  },

  confirmInput: {
    borderColor: wash.bloodEdge,
  },
  confirmInputValid: {
    borderColor: color.blood,
  },

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
