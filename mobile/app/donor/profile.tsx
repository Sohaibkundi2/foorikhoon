import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { router } from 'expo-router'
import {
  ArrowLeft, ArrowUpRight, CalendarDays, Check, CircleCheck, LogOut, MapPin,
  TriangleAlert,
} from 'lucide-react-native'
import { useAuthStore } from '../../src/store/authStore'
import api from '../../src/lib/api'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useNetwork } from '../../src/hooks/useNetwork'
import { saveCache, loadCache } from '../../src/lib/cache'
import OfflineBanner from '../../src/components/OfflineBanner'

import {
  Screen, PageHead, Panel, Field, Input, Button, Notice, Rule, Label, SectionLabel,
  Skeleton, TextAction, LiveDot, ContextualLoading,
} from '../../src/components/fk'
import {
  color, wash, font, radius, statusTone, toneFor, bloodLabel, BLOOD_GROUPS,
} from '../../src/theme'

export default function DonorProfileScreen() {
  const { user, logout } = useAuthStore()

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

  /* Restores the sign-out that lived in the drawer before the bottom bar
     replaced it. Same two steps the drawer used: clear the store, go home. */
  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  if (loading) {
    return (
      <Screen ember>
        <ContextualLoading
          eyebrow="Donor · Profile"
          message="Retrieving donor credentials & location…"
          subtext="Loading availability status, blood group and emergency contact settings"
          variant="form"
        />
      </Screen>
    )
  }

  const errorTone = toneFor(statusTone, 'NO_SHOW')
  const okTone = toneFor(statusTone, 'FULFILLED')

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: color.ink }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen keyboardShouldPersistTaps="handled" tail={40}>
        {!isOnline && (
          <View style={[styles.gutter, { paddingTop: 10 }]}>
            <OfflineBanner lastUpdated={cacheTime} />
          </View>
        )}

        <View style={[styles.gutter, { paddingTop: 6 }]}>
          <Pressable
            onPress={() => router.push('/donor/dashboard')}
            style={styles.backLink}
            hitSlop={8}
          >
            {/* Was a ← text arrow. */}
            <ArrowLeft size={13} color={color.mute} strokeWidth={2} />
            <Text style={styles.backLinkText}>Dashboard</Text>
          </Pressable>
        </View>

        <PageHead
          eyebrow="Donor · Profile"
          title="Your details,"
          accent="kept current."
          sub="Group, city and location are what a hospital's search reads. Everything else is how they reach you once you accept."
        />

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
          <SectionLabel index="01">Identity</SectionLabel>

          <Field label="Full name">
            <Input value={name} onChangeText={setName} autoCapitalize="words" />
          </Field>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Phone">
                <Input
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="03001234567"
                  keyboardType="phone-pad"
                />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="City">
                <Input value={city} onChangeText={setCity} />
              </Field>
            </View>
          </View>

          {/* ── Location ──────────────────────────────────────────────────── */}
          <SectionLabel index="02" style={{ marginTop: 14 }}>Location</SectionLabel>

          {locationMethod === 'gps' && coords ? (
            <Panel tone={okTone}>
              <View style={styles.confirmRow}>
                {/* Was a ✓ text glyph. */}
                <Check size={14} color={color.lifeLite} strokeWidth={2.5} />
                <Text style={styles.confirmText}>
                  We&apos;ll use this to match you with nearby requests
                </Text>
              </View>
              <Text style={styles.confirmSub}>
                Coordinates are fuzzed before they are stored — hospitals see a radius, never your
                doorstep.
              </Text>
              <TextAction onPress={() => { setLocationMethod(null); setCoords(null) }}>
                Use a different method
              </TextAction>
            </Panel>
          ) : locationMethod === 'manual' ? (
            <View>
              <Field
                label="Area / neighbourhood"
                hint="Leave blank to keep your current saved location."
              >
                <Input
                  value={area}
                  onChangeText={setArea}
                  placeholder="Hayatabad, Peshawar"
                />
              </Field>
              <TextAction onPress={() => setLocationMethod(null)}>
                Use my location instead
              </TextAction>
            </View>
          ) : (
            <Panel>
              <View style={styles.promptHead}>
                <MapPin size={15} color={color.bloodLite} strokeWidth={2} />
                <Text style={styles.promptTitle}>Update your location</Text>
              </View>
              <Text style={styles.promptDesc}>
                Share your current location for more accurate matching, or enter your area
                manually.
              </Text>
              <Button tone="primary" full onPress={requestLocation} style={{ marginTop: 16 }}>
                Use my location
              </Button>
              <TextAction onPress={() => setLocationMethod('manual')} style={{ marginTop: 14 }}>
                Enter address instead
              </TextAction>

              {locationError ? (
                <Notice tone={errorTone} icon={TriangleAlert} style={{ marginTop: 16 }}>
                  {locationError === 'permission_denied'
                    ? "We couldn't access your location. You can try again or enter your address manually."
                    : 'Something went wrong getting your location. Please enter your address instead.'}
                </Notice>
              ) : null}
            </Panel>
          )}

          {/* ── Donation ──────────────────────────────────────────────────── */}
          <SectionLabel index="03" style={{ marginTop: 32 }}>Donation</SectionLabel>

          <View style={styles.labelRow}>
            <Label loud>Blood group</Label>
            <Label>Optional</Label>
          </View>

          <View style={styles.lattice}>
            {BLOOD_GROUPS.map((bg) => {
              const active = bloodGroup === bg
              return (
                <Pressable
                  key={bg}
                  onPress={() => setBloodGroup(active ? '' : bg)}
                  style={[styles.latticeCell, active && styles.latticeCellOn]}
                >
                  <Text style={[styles.latticeText, active && styles.latticeTextOn]}>
                    {bloodLabel(bg)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Text style={styles.latticeNote}>Tap the selected group again to clear it.</Text>

          <View style={[styles.labelRow, { marginTop: 24 }]}>
            <Label loud>Last donated</Label>
            <Label>Optional</Label>
          </View>
          <Pressable style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
            <CalendarDays size={14} color={color.faint} strokeWidth={2} />
            <Text style={[styles.dateText, !lastDonated && { color: color.faint }]}>
              {lastDonated ? lastDonated.toLocaleDateString() : 'Select a date'}
            </Text>
          </Pressable>
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

          {/* ── Visibility ────────────────────────────────────────────────── */}
          <SectionLabel index="04" style={{ marginTop: 32 }}>Visibility</SectionLabel>

          {/* Read-only here on purpose. The switch that actually writes
              /api/donor/availability lives on the dashboard; this row reports
              the fetched value and sends you there rather than showing a second
              control that looks authoritative and isn't. */}
          <View style={styles.toggleRow}>
            {isAvailable
              ? <LiveDot size={7} tint={color.life} />
              : <View style={styles.dotOff} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.toggleTitle}>
                {isAvailable ? 'Available for matching' : 'Not available for matching'}
              </Text>
              <Text style={styles.toggleSub}>
                Set on the dashboard, where it takes effect immediately.
              </Text>
            </View>
            <Pressable onPress={() => router.push('/donor/dashboard')} hitSlop={8}>
              <ArrowUpRight size={15} color={color.mute} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.toggleTitle}>Share contact info</Text>
              <Text style={styles.toggleSub}>
                If enabled, the hospital can see your name and phone number when you accept their
                request, to help coordinate the donation.
              </Text>
            </View>
            <Switch
              value={shareContactInfo}
              onValueChange={toggleShareContactInfo}
              trackColor={{ false: color.line, true: color.life }}
              thumbColor={color.bone}
              ios_backgroundColor={color.line}
            />
          </View>

          {/* ── Save ──────────────────────────────────────────────────────── */}
          <Button
            tone="primary"
            size="lg"
            full
            icon={Check}
            busy={saving}
            onPress={handleSave}
            style={{ marginTop: 26 }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <TextAction
            onPress={() => router.push('/donor/dashboard')}
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

  labelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 9,
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
  promptTitle: { fontFamily: font.sans.medium, fontSize: 14.5, color: color.bone, letterSpacing: -0.2 },
  promptDesc: {
    fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 19,
    color: color.mute, marginTop: 9,
  },

  // Blood group lattice
  lattice: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  latticeCell: {
    width: '22.6%', aspectRatio: 1.35,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  latticeCellOn: { borderColor: color.blood, backgroundColor: wash.bloodDeep },
  latticeText: { fontFamily: font.mono.regular, fontSize: 14.5, color: color.mute, letterSpacing: -0.3 },
  latticeTextOn: { fontFamily: font.mono.medium, color: color.bone },
  latticeNote: {
    fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint, marginTop: 11,
  },

  // Date
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: color.surface,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  dateText: { fontFamily: font.sans.regular, fontSize: 14.5, color: color.bone },

  // Toggles
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderTopWidth: 1, borderTopColor: color.lineSoft,
    paddingVertical: 16,
  },
  dotOff: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.faint },
  toggleTitle: { fontFamily: font.sans.medium, fontSize: 13.5, color: color.bone, letterSpacing: -0.2 },
  toggleSub: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 16.5,
    color: color.faint, marginTop: 4,
  },

  // Session
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 16,
  },
  logoutText: {
    fontFamily: font.mono.medium, fontSize: 10, color: color.bloodLite,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },
})
