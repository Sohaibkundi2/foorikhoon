// app/register.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useState } from 'react'
import { Link, router, useLocalSearchParams } from 'expo-router'
import {
  ArrowRight, Check, ChevronRight, Droplet, Hospital, MapPin, TriangleAlert,
  Eye, EyeOff,
} from 'lucide-react-native'
import { useAuthStore } from '../src/store/authStore'
import api from '../src/lib/api'
import * as Location from 'expo-location'

import {
  Screen, PageHead, Panel, Field, Input, Button, Notice, Rule, Label, SectionLabel, Chip,
} from '../src/components/fk'
import {
  color, wash, font, radius, statusTone, toneFor, bloodLabel, BLOOD_GROUPS,
} from '../src/theme'

type Role = 'DONOR' | 'HOSPITAL' | null

export default function Register() {
  /**
   * The landing page's two hero CTAs link to `/register?role=donor` and
   * `?role=hospital`. The screen used to ignore the param and always open the
   * picker, so both buttons landed on the same generic step — the param is read
   * here so the href means what it says. Anything other than those two values
   * (or no param at all) still opens the picker.
   */
  const params = useLocalSearchParams<{ role?: string }>()
  const preset: Role =
    params.role === 'donor' ? 'DONOR'
    : params.role === 'hospital' ? 'HOSPITAL'
    : null

  const [role, setRole] = useState<Role>(preset)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
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
    /* This check appeared twice, identically, in the previous version. One copy
       kept — the second could never change the outcome. */
    if (role === 'HOSPITAL' && (!hospitalName || !licenseNo || (!address && !(locationMethod === 'gps' && coords)))) {
      setError('Please fill in hospital name, licence number, and address or GPS location')
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
        await api.post('/api/hospital/profile', {
          name: hospitalName,
          licenseNo,
          address: address.trim() || 'Shared location',
          ...(locationMethod === 'gps' && coords
            ? { latitude: coords.latitude, longitude: coords.longitude }
            : {}),
        })
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

  const errorTone = toneFor(statusTone, 'NO_SHOW')

  // ── Step 1: Role picker ──────────────────────────────────────────────────
  if (!role) {
    return (
      <Screen keyboardShouldPersistTaps="handled" tail={40}>
        <PageHead
          eyebrow="ForiKhoon · New account"
          title="Two questions,"
          accent="then you're in."
          sub="The first one decides which side of a match you're on. Everything after it is a short form."
        />

        <View style={styles.gutter}>
          <StepRail step={1} />

          <SectionLabel index="01" style={{ marginTop: 26 }}>Choose a side</SectionLabel>

          <RoleCard
            index="A"
            icon={Droplet}
            title="I want to donate blood"
            desc="You give your group, city and availability. When a hospital near you needs your type, you are notified — nothing else asks for your time."
            onPress={() => setRole('DONOR')}
          />

          <RoleCard
            index="B"
            icon={Hospital}
            title="I need blood for my hospital"
            desc="Post a request with the group and units you need. Compatible donors in radius are approached automatically, widening until one accepts."
            onPress={() => setRole('HOSPITAL')}
          />

          <Rule style={{ marginTop: 30 }} />
          <View style={styles.footerRow}>
            <Label>Already registered</Label>
            <Link href="/login" style={styles.footerLink}>Sign in</Link>
          </View>
        </View>
      </Screen>
    )
  }

  const isDonor = role === 'DONOR'

  // ── Step 2: Registration form ────────────────────────────────────────────
  return (
    <Screen keyboardShouldPersistTaps="handled" tail={40}>
      <PageHead
        eyebrow="ForiKhoon · New account"
        title={isDonor ? 'Your details,' : 'Hospital details,'}
        accent="and you're set."
        sub={isDonor
          ? 'Group and location are what the matcher reads. Everything else is how the hospital reaches you.'
          : 'The licence number is checked before your hospital can post requests.'}
      />

      <View style={styles.gutter}>
        <StepRail step={2} />

        <View style={styles.roleRow}>
          <Chip
            tone={{ fg: color.bloodLite, bg: wash.blood, border: wash.bloodEdge, label: '' }}
            icon={isDonor ? Droplet : Hospital}
          >
            {isDonor ? 'Donor' : 'Hospital'}
          </Chip>
          <Pressable onPress={() => { setRole(null); setError('') }} hitSlop={8}>
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        </View>

        {error ? (
          <Notice tone={errorTone} icon={TriangleAlert} style={{ marginBottom: 24 }}>
            {error}
          </Notice>
        ) : null}

        <SectionLabel index="02">Account</SectionLabel>

        <Field label="Full name">
          <Input
            placeholder="Ali Khan" value={name} onChangeText={setName}
            autoCapitalize="words"
          />
        </Field>

        <Field label="Email address">
          <Input
            placeholder="you@example.com" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          />
        </Field>

        <Field label="Password">
          <View style={styles.passwordWrap}>
            <Input
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!reveal}
              autoCapitalize="none"
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

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="City">
              <Input placeholder="DI Khan" value={city} onChangeText={setCity} />
            </Field>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field label="Phone · optional">
              <Input
                placeholder="03001234567" value={phone} onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </Field>
          </View>
        </View>

        {/* ---- Donor: group + location ---- */}
        {isDonor && (
          <>
            <SectionLabel index="03" style={{ marginTop: 14 }}>Blood group · Optional</SectionLabel>

            <View style={styles.lattice}>
              {BLOOD_GROUPS.map((bg) => {
                const on = bloodGroup === bg
                return (
                  <Pressable
                    key={bg}
                    onPress={() => setBloodGroup(bg)}
                    style={[styles.latticeCell, on && styles.latticeCellOn]}
                  >
                    <Text style={[styles.latticeText, on && styles.latticeTextOn]}>
                      {bloodLabel(bg)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Pressable
              onPress={() => setBloodGroup('')}
              style={[styles.unknownRow, bloodGroup === '' && styles.unknownRowOn]}
            >
              <View style={[styles.unknownMark, bloodGroup === '' && styles.unknownMarkOn]}>
                {bloodGroup === '' && <Check size={10} color={color.bloodLite} strokeWidth={3} />}
              </View>
              <Text style={[styles.unknownText, bloodGroup === '' && styles.unknownTextOn]}>
                I don&apos;t know my blood group (optional)
              </Text>
            </Pressable>

            <Text style={styles.groupNote}>
              You can select your blood type now or add it later from your profile. Without a blood group, you will not appear in emergency matching until verified.
            </Text>

            <SectionLabel index="04" style={{ marginTop: 30 }}>Location</SectionLabel>

            {locationMethod === 'gps' && coords ? (
              <Panel tone={toneFor(statusTone, 'FULFILLED')}>
                <View style={styles.confirmRow}>
                  {/* Was a ✓ text glyph. */}
                  <Check size={14} color={color.lifeLite} strokeWidth={2.5} />
                  <Text style={styles.confirmText}>Coordinates saved for matching</Text>
                </View>
                <Text style={styles.confirmSub}>
                  Requests are matched by distance from this point, in widening tiers of 10, 25,
                  50 and 100 km.
                </Text>
                <Pressable onPress={() => { setLocationMethod(null); setCoords(null) }} hitSlop={8}>
                  <Text style={styles.switchText}>Use a different method</Text>
                </Pressable>
              </Panel>
            ) : locationMethod === 'manual' ? (
              <View>
                <Input
                  placeholder="Hayatabad, Peshawar" value={area} onChangeText={setArea}
                />
                <Text style={styles.helperText}>
                  Used to match you with nearby requests — not your exact address.
                </Text>
                <Pressable onPress={() => setLocationMethod(null)} hitSlop={8}>
                  <Text style={styles.switchText}>Use my location instead</Text>
                </Pressable>
              </View>
            ) : (
              /* Ranged left, not a centred prompt card. A permission ask reads
                 as more trustworthy when it states what the data is for before
                 the button, in the same voice as the rest of the form. */
              <Panel>
                <View style={styles.promptHead}>
                  <MapPin size={15} color={color.bloodLite} strokeWidth={2} />
                  <Text style={styles.promptTitle}>Share your location</Text>
                </View>
                <Text style={styles.promptDesc}>
                  In an emergency the matcher searches outward from a point. Coordinates make that
                  search accurate; a typed area name puts you at the centre of the area instead.
                </Text>
                <Button tone="primary" full onPress={requestLocation} style={{ marginTop: 16 }}>
                  Use my location
                </Button>
                <Pressable onPress={() => setLocationMethod('manual')} hitSlop={8} style={{ marginTop: 14 }}>
                  <Text style={styles.switchText}>Enter my area instead</Text>
                </Pressable>

                {locationError ? (
                  <Notice tone={errorTone} icon={TriangleAlert} style={{ marginTop: 16 }}>
                    {locationError === 'permission_denied'
                      ? "We couldn't access your location. You can try again or enter your area manually."
                      : 'Something went wrong getting your location. Please enter your area instead.'}
                  </Notice>
                ) : null}
              </Panel>
            )}
          </>
        )}

        {/* ---- Hospital ---- */}
        {role === 'HOSPITAL' && (
          <>
            <SectionLabel index="03" style={{ marginTop: 14 }}>Facility</SectionLabel>

            <Field label="Hospital name">
              <Input
                placeholder="DHQ Hospital DI Khan" value={hospitalName}
                onChangeText={setHospitalName}
              />
            </Field>

            <Field
              label="Licence number"
              hint="Verified by an administrator. Until then your hospital shows as unverified on requests."
            >
              <Input
                placeholder="DHQ-DIK-2024" value={licenseNo}
                onChangeText={setLicenseNo}
              />
            </Field>

            <SectionLabel index="04" style={{ marginTop: 24 }}>Location</SectionLabel>

            {locationMethod === 'gps' && coords ? (
              <Panel tone={toneFor(statusTone, 'FULFILLED')}>
                <View style={styles.confirmRow}>
                  <Check size={14} color={color.lifeLite} strokeWidth={2.5} />
                  <Text style={styles.confirmText}>GPS Coordinates saved for matching</Text>
                </View>
                <Text style={styles.confirmSub}>
                  Emergency requisitions match donors outward by distance from these coordinates.
                </Text>

                <View style={{ marginTop: 14 }}>
                  <Field label="Street address or emergency gate · optional" hint="Helps dispatched donors find the exact clinical entrance.">
                    <Input
                      placeholder="e.g. Emergency Ward, Hospital Road"
                      value={address}
                      onChangeText={setAddress}
                    />
                  </Field>
                </View>

                <Pressable onPress={() => { setLocationMethod('manual'); setCoords(null) }} hitSlop={8} style={{ marginTop: 6 }}>
                  <Text style={styles.switchText}>Enter address manually instead</Text>
                </Pressable>
              </Panel>
            ) : locationMethod === 'manual' ? (
              <View>
                <Field label="Hospital street address">
                  <Input
                    placeholder="Hospital Road, DI Khan"
                    value={address}
                    onChangeText={setAddress}
                  />
                </Field>
                <Text style={styles.helperText}>
                  Used to geocode your facility and determine donor dispatch proximity.
                </Text>
                <Pressable onPress={() => setLocationMethod(null)} hitSlop={8} style={{ marginTop: 10 }}>
                  <Text style={styles.switchText}>Use GPS location instead</Text>
                </Pressable>
              </View>
            ) : (
              <Panel>
                <View style={styles.promptHead}>
                  <MapPin size={15} color={color.bloodLite} strokeWidth={2} />
                  <Text style={styles.promptTitle}>Capture hospital location</Text>
                </View>
                <Text style={styles.promptDesc}>
                  Emergency matching searches outward from your facility. Accurate GPS coordinates ensure nearest eligible donors are contacted first.
                </Text>
                <Button tone="primary" full onPress={requestLocation} style={{ marginTop: 16 }}>
                  Use GPS location
                </Button>
                <Pressable onPress={() => setLocationMethod('manual')} hitSlop={8} style={{ marginTop: 14 }}>
                  <Text style={styles.switchText}>Enter address manually instead</Text>
                </Pressable>

                {locationError ? (
                  <Notice tone={errorTone} icon={TriangleAlert} style={{ marginTop: 16 }}>
                    {locationError === 'permission_denied'
                      ? "Couldn't access GPS location. You can enter the hospital address manually."
                      : 'Unable to retrieve location coordinates. Please enter the hospital address instead.'}
                  </Notice>
                ) : null}
              </Panel>
            )}
          </>
        )}

        <Button
          tone="primary"
          size="lg"
          full
          icon={ArrowRight}
          busy={loading}
          onPress={handleSubmit}
          style={{ marginTop: 22 }}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </Button>

        <Rule style={{ marginTop: 32 }} />
        <View style={styles.footerRow}>
          <Label>Already registered</Label>
          <Link href="/login" style={styles.footerLink}>Sign in</Link>
        </View>
      </View>
    </Screen>
  )
}

/* ---------------------------------------------------------------------------
   Local pieces
--------------------------------------------------------------------------- */

/** Two segments, filled to the current step. The form is genuinely two steps
 *  long, so saying so up front is worth the four lines. */
function StepRail({ step }: { step: 1 | 2 }) {
  return (
    <View style={styles.stepRail}>
      <View style={[styles.stepSeg, styles.stepSegOn]} />
      <View style={[styles.stepSeg, step >= 2 && styles.stepSegOn]} />
      <Text style={styles.stepText}>Step {step} of 2</Text>
    </View>
  )
}

function RoleCard({ index, icon: Icon, title, desc, onPress }: {
  index: string
  icon: typeof Droplet
  title: string
  desc: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={styles.roleCard}>
      <View style={styles.roleCardHead}>
        <Text style={styles.roleIndex}>{index}</Text>
        <View style={styles.roleIcon}>
          <Icon size={16} color={color.bloodLite} strokeWidth={2} />
        </View>
        <Text style={styles.roleTitle}>{title}</Text>
        <ChevronRight size={16} color={color.faint} strokeWidth={1.75} />
      </View>
      <Text style={styles.roleDesc}>{desc}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },
  row: { flexDirection: 'row' },

  // Step rail
  stepRail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepSeg: { width: 26, height: 2, borderRadius: 1, backgroundColor: color.line },
  stepSegOn: { backgroundColor: color.blood },
  stepText: {
    fontFamily: font.mono.regular, fontSize: 9.5, color: color.faint,
    letterSpacing: 1.2, textTransform: 'uppercase', marginLeft: 4,
  },

  // Role picker
  roleCard: {
    borderTopWidth: 1, borderTopColor: color.line,
    paddingTop: 18, paddingBottom: 22,
  },
  roleCardHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  roleIndex: { fontFamily: font.mono.regular, fontSize: 10, color: color.blood, width: 12 },
  roleIcon: {
    width: 30, height: 30, borderRadius: radius.sm,
    backgroundColor: wash.blood, borderWidth: 1, borderColor: wash.bloodEdge,
    alignItems: 'center', justifyContent: 'center',
  },
  roleTitle: { flex: 1, fontFamily: font.sans.medium, fontSize: 15, color: color.bone, letterSpacing: -0.3 },
  roleDesc: {
    fontFamily: font.sans.regular, fontSize: 13, lineHeight: 19.5,
    color: color.mute, marginTop: 12, paddingLeft: 23,
  },

  // Role badge row
  roleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 26, marginBottom: 26,
  },
  changeText: {
    fontFamily: font.mono.medium, fontSize: 10, letterSpacing: 1.4,
    textTransform: 'uppercase', color: color.mute,
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

  unknownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 10, paddingVertical: 12, paddingHorizontal: 13,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.md,
  },
  unknownRowOn: { borderColor: wash.bloodEdge, backgroundColor: wash.blood },
  unknownMark: {
    width: 15, height: 15, borderRadius: 3,
    borderWidth: 1, borderColor: color.line,
    alignItems: 'center', justifyContent: 'center',
  },
  unknownMarkOn: { borderColor: wash.bloodEdge, backgroundColor: 'rgba(220,38,38,0.18)' },
  unknownText: { fontFamily: font.sans.regular, fontSize: 13, color: color.mute },
  unknownTextOn: { fontFamily: font.sans.medium, color: color.bloodLite },
  groupNote: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17,
    color: color.faint, marginTop: 12,
  },

  // Location
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  confirmText: { fontFamily: font.sans.medium, fontSize: 13.5, color: color.lifeLite, letterSpacing: -0.2 },
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
  helperText: {
    fontFamily: font.sans.regular, fontSize: 11.5, lineHeight: 17,
    color: color.faint, marginTop: 9, marginBottom: 12,
  },
  switchText: {
    fontFamily: font.mono.medium, fontSize: 9.5, letterSpacing: 1.3,
    textTransform: 'uppercase', color: color.mute,
  },

  // Password input reveal
  passwordWrap: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 92 },
  revealBtn: { position: 'absolute', right: 7, paddingVertical: 7 },

  // Footer
  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16,
  },
  footerLink: {
    fontFamily: font.mono.medium, fontSize: 10, letterSpacing: 1.5,
    textTransform: 'uppercase', color: color.bloodLite,
  },
})
