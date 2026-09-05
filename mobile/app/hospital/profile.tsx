// app/hospital/profile.tsx
import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import {
  View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import {
  ArrowLeft, Check, CircleCheck, Hourglass, LogOut, MapPin, ShieldCheck,
  TriangleAlert,
} from 'lucide-react-native'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'

import {
  Screen, PageHead, Panel, Field, Input, Button, Notice, Rule, Label,
  SectionLabel, Chip, Skeleton, TextAction, ContextualLoading,
} from '../../src/components/fk'
import {
  color, wash, font, statusTone, toneFor, Tone,
} from '../../src/theme'

/* Verification is a state, so it takes the same chip vocabulary every other
   state in the app takes rather than a coloured paragraph of its own. */
const verifiedTone: Tone = {
  fg: color.lifeLite, bg: wash.life, border: wash.lifeEdge, label: 'Verified',
}
const pendingTone: Tone = {
  fg: color.warnLite, bg: wash.warn, border: wash.warnEdge, label: 'Pending review',
}

export default function HospitalProfileScreen() {
  const { user, logout } = useAuthStore()

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

  /* The bottom bar replaced the drawer that used to hold sign-out, and a
     hospital has no other screen to leave the session from. Same two steps the
     drawer used: clear the store, go home. */
  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  if (loading) {
    return (
      <Screen ember>
        <ContextualLoading
          eyebrow="Hospital · Facility Profile"
          message="Loading hospital credentials & registry status…"
          subtext="Verifying institutional license and geo-coordinates"
          variant="form"
        />
      </Screen>
    )
  }

  const errorTone = toneFor(statusTone, 'NO_SHOW')
  const okTone = toneFor(statusTone, 'FULFILLED')
  const credTone = verified ? verifiedTone : pendingTone

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: color.ink }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen keyboardShouldPersistTaps="handled" tail={40}>
        <View style={[styles.gutter, { paddingTop: 6 }]}>
          <Pressable
            onPress={() => router.push('/hospital/dashboard')}
            style={styles.backLink}
            hitSlop={8}
          >
            {/* Was a ← text arrow. */}
            <ArrowLeft size={13} color={color.mute} strokeWidth={2} />
            <Text style={styles.backLinkText}>Dashboard</Text>
          </Pressable>
        </View>

        <PageHead
          eyebrow="Hospital · Profile"
          title="Your listing,"
          accent="as donors see it."
          sub="Name and city are what appears beside every request you post. The location decides which donors are searched first."
        />

        {/* ── Credentials ────────────────────────────────────────────────────
            The two facts you cannot edit, collected in one ruled band instead
            of a coloured banner plus a greyed-out input pretending to be a
            field. Both are records, so both are set in mono. */}
        <View style={styles.credBand}>
          <View style={[styles.credTick, { backgroundColor: credTone.fg }]} />
          <View style={styles.gutter}>
            <View style={styles.credRow}>
              <Label>Licence number</Label>
              <View style={styles.credFill} />
              <Text style={styles.credValue}>{licenseNo || '—'}</Text>
            </View>
            <View style={styles.credRow}>
              <Label>Verification</Label>
              <View style={styles.credFill} />
              <Chip tone={credTone} icon={verified ? ShieldCheck : Hourglass} />
            </View>
            <Text style={styles.credNote}>
              {verified
                ? 'A ForiKhoon admin has checked this licence. Neither field can be changed from the app.'
                : 'An admin reviews new licences before a hospital is marked verified. You can post requests in the meantime.'}
            </Text>
          </View>
        </View>

        <View style={styles.gutter}>
          {error ? (
            <Notice tone={errorTone} icon={TriangleAlert} style={{ marginBottom: 22 }}>
              {error}
            </Notice>
          ) : null}

          {success ? (
            <Notice tone={okTone} icon={CircleCheck} style={{ marginBottom: 22 }}>
              Profile updated successfully.
            </Notice>
          ) : null}

          {/* ── Identity ──────────────────────────────────────────────────── */}
          <SectionLabel index="01" aside={<Label>Required</Label>}>Identity</SectionLabel>

          <Field
            label="Hospital name"
            hint="Shown to every donor who receives one of your requests."
          >
            <Input value={name} onChangeText={setName} autoCapitalize="words" />
          </Field>

          {/* ── Location ──────────────────────────────────────────────────── */}
          <SectionLabel index="02" style={{ marginTop: 14 }}>Location</SectionLabel>

          {locationMethod === 'gps' && coords ? (
            <Panel tone={okTone}>
              <View style={styles.confirmRow}>
                {/* Was a ✓ text glyph. */}
                <Check size={14} color={color.lifeLite} strokeWidth={2.5} />
                <Text style={styles.confirmText}>Location captured for this hospital</Text>
              </View>
              <Text style={styles.confirmSub}>
                Saving replaces your written address with these coordinates. Donor searches start
                at ten kilometres from this point and widen from there.
              </Text>
              <TextAction onPress={() => { setLocationMethod(null); setCoords(null) }}>
                Use a different method
              </TextAction>
            </Panel>
          ) : locationMethod === 'manual' ? (
            <View>
              <Field label="Address" hint="Street and area, as a patient would be told it.">
                <Input
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Circular Road, DI Khan"
                />
              </Field>
              <TextAction onPress={() => setLocationMethod(null)}>
                Use current location instead
              </TextAction>
            </View>
          ) : (
            <Panel>
              <View style={styles.promptHead}>
                <MapPin size={15} color={color.bloodLite} strokeWidth={2} />
                <Text style={styles.promptTitle}>Update hospital location</Text>
              </View>
              <Text style={styles.promptDesc}>
                Exact coordinates make the donor search accurate. If you would rather not share
                them, type the address instead — both are saved to the same profile.
              </Text>
              {address ? (
                <Text style={styles.promptCurrent} numberOfLines={2}>
                  Currently saved: {address}
                </Text>
              ) : null}
              <Button tone="primary" full onPress={requestLocation} style={{ marginTop: 16 }}>
                Use current location
              </Button>
              <TextAction onPress={() => setLocationMethod('manual')} style={{ marginTop: 14 }}>
                Enter address instead
              </TextAction>

              {locationError ? (
                <Notice tone={errorTone} icon={TriangleAlert} style={{ marginTop: 16 }}>
                  {locationError === 'permission_denied'
                    ? "We couldn't access your location. You can try again or enter your address manually."
                    : 'Something went wrong. Please enter your address instead.'}
                </Notice>
              ) : null}
            </Panel>
          )}

          {/* ── Contact ───────────────────────────────────────────────────── */}
          <SectionLabel index="03" style={{ marginTop: 32 }}>Contact</SectionLabel>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="City">
                <Input value={city} onChangeText={setCity} />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Phone" hint="Optional.">
                <Input
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="03001234567"
                  keyboardType="phone-pad"
                />
              </Field>
            </View>
          </View>

          {/* ── Save ──────────────────────────────────────────────────────── */}
          <Button
            tone="primary"
            size="lg"
            full
            icon={Check}
            busy={saving}
            disabled={saving}
            onPress={handleSave}
            style={{ marginTop: 20 }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <TextAction
            onPress={() => router.push('/hospital/dashboard')}
            style={{ marginTop: 18, alignSelf: 'center' }}
          >
            Cancel
          </TextAction>

          {/* ── Session ───────────────────────────────────────────────────── */}
          <Rule style={{ marginTop: 34 }} />
          <Pressable onPress={handleLogout} style={styles.logoutRow} hitSlop={6}>
            <LogOut size={13} color={color.bloodLite} strokeWidth={2} />
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },
  row: { flexDirection: 'row' },

  backLink: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  backLinkText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.mute,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },

  // Credentials band
  credBand: {
    borderTopWidth: 1, borderTopColor: color.line,
    borderBottomWidth: 1, borderBottomColor: color.line,
    paddingBottom: 18, marginBottom: 30,
  },
  credTick: { height: 2, marginBottom: 16 },
  credRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  credFill: { flex: 1, height: 1, backgroundColor: color.lineSoft },
  credValue: {
    fontFamily: font.mono.medium, fontSize: 13, color: color.bone, letterSpacing: 0.4,
  },
  credNote: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17.5,
    color: color.faint, marginTop: 10,
  },

  // Location
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  confirmText: {
    flex: 1, fontFamily: font.sans.medium, fontSize: 13.5,
    color: color.lifeLite, letterSpacing: -0.2,
  },
  confirmSub: {
    fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 18.5,
    color: color.mute, marginTop: 9, marginBottom: 14,
  },
  promptHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  promptTitle: {
    fontFamily: font.sans.medium, fontSize: 14.5, color: color.bone, letterSpacing: -0.2,
  },
  promptDesc: {
    fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 19,
    color: color.mute, marginTop: 9,
  },
  promptCurrent: {
    fontFamily: font.mono.regular, fontSize: 11, lineHeight: 16,
    color: color.faint, marginTop: 12,
    borderLeftWidth: 2, borderLeftColor: color.line,
    paddingLeft: 10, paddingVertical: 2,
  },

  // Session
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 },
  logoutText: {
    fontFamily: font.mono.medium, fontSize: 10, color: color.bloodLite,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },
})
