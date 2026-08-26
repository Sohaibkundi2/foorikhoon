// app/hospital/request/new.tsx
import { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { router, Link } from 'expo-router'
import {
  ArrowLeft, Check, Minus, Plus, Send, TriangleAlert,
} from 'lucide-react-native'
import api from '../../../src/lib/api'

import {
  Screen, PageHead, Label, SectionLabel, Rule, Button, Notice, TextAction,
} from '../../../src/components/fk'
import {
  color, wash, font, radius, urgencyTone, statusTone, toneFor, bloodLabel,
} from '../../../src/theme'

const bloodGroups = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']

/**
 * The three urgency levels, with the window each one claims. Colours come from
 * the shared urgency tone map rather than being picked here, so a CRITICAL
 * request looks the same on this form as it does on every list that shows it.
 */
const urgencyOptions = [
  { value: 'NORMAL', label: 'Normal', desc: 'Needed within a few days' },
  { value: 'URGENT', label: 'Urgent', desc: 'Needed within 24 hours' },
  { value: 'CRITICAL', label: 'Critical', desc: 'Needed immediately' },
]

const UNIT_MIN = 1
const UNIT_MAX = 20

export default function NewRequestScreen() {
  const [bloodGroup, setBloodGroup] = useState('')
  const [units, setUnits] = useState(1)
  const [urgency, setUrgency] = useState('NORMAL')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ matchedDonors: number } | null>(null)

  const handleSubmit = async () => {
    setError('')
    if (!bloodGroup) {
      setError('Please select a blood group')
      return
    }
    try {
      setLoading(true)
      const res = await api.post('/api/requests', { bloodGroup, units, urgency, notes })
      setSuccess({ matchedDonors: res.data.matchedDonors })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to post request. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSuccess(null)
    setBloodGroup('')
    setNotes('')
    setUnits(1)
    setUrgency('NORMAL')
  }

  const errorTone = toneFor(statusTone, 'NO_SHOW')
  const selectedUrgency = toneFor(urgencyTone, urgency)

  // ── Success state ──────────────────────────────────────────────────────
  if (success) {
    const matched = success.matchedDonors > 0
    return (
      /* Ranged left on a ruled page, not a centred badge over empty space. The
         receipt below is the point of the screen: it repeats back exactly what
         was posted, in the same type the lists use. */
      <Screen ember tail={40}>
        <View style={styles.gutter}>
          <Rule tick />

          <View style={styles.doneHead}>
            {/* Was a ✓ text glyph in a circle. */}
            <Check size={15} color={color.lifeLite} strokeWidth={2.5} />
            <Label loud style={{ color: color.lifeLite }}>Posted</Label>
          </View>

          <Text style={styles.doneTitle}>
            Your request is{' '}
            <Text style={styles.doneTitleAccent}>live.</Text>
          </Text>

          <Text style={styles.doneSub}>
            {matched
              ? `${success.matchedDonors} donor${success.matchedDonors !== 1 ? 's' : ''} matched and notified.`
              : "No matching donors right now. We'll notify you when one becomes available."}
          </Text>

          <View style={{ marginTop: 32 }}>
            <SectionLabel index="01">What you posted</SectionLabel>
            <ReceiptRow label="Blood group" value={bloodLabel(bloodGroup)} mono tint={color.bloodLite} />
            <ReceiptRow label="Units" value={String(units)} mono />
            <ReceiptRow
              label="Urgency"
              value={selectedUrgency.label}
              tint={selectedUrgency.fg}
            />
            <ReceiptRow
              label="Donors notified"
              value={String(success.matchedDonors)}
              mono
              tint={matched ? color.lifeLite : color.warnLite}
            />
          </View>

          <Button
            tone="primary"
            size="lg"
            full
            onPress={() => router.replace('/hospital/dashboard')}
            style={{ marginTop: 30 }}
          >
            Go to dashboard
          </Button>
          <TextAction onPress={resetForm} style={{ marginTop: 18, alignSelf: 'center' }}>
            Post another request
          </TextAction>
        </View>
      </Screen>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: color.ink }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen keyboardShouldPersistTaps="handled" tail={40} grid>
        <View style={[styles.gutter, { paddingTop: 6 }]}>
          <Link href="/hospital/dashboard" asChild>
            <Pressable style={styles.backLink} hitSlop={8}>
              {/* Was a ← text arrow. */}
              <ArrowLeft size={13} color={color.mute} strokeWidth={2} />
              <Text style={styles.backLinkText}>Dashboard</Text>
            </Pressable>
          </Link>
        </View>

        <PageHead
          eyebrow="Hospital · New request"
          title="Ask for what"
          accent="you need."
          sub="Donors whose group matches are searched outward from your location — ten kilometres first, then wider — and notified as soon as this is posted."
        />

        <View style={styles.gutter}>
          {error ? (
            <Notice tone={errorTone} icon={TriangleAlert} style={{ marginBottom: 24 }}>
              {error}
            </Notice>
          ) : null}

          {/* ── Blood group ─────────────────────────────────────────────── */}
          <SectionLabel index="01" aside={<Label>Required</Label>}>Blood group</SectionLabel>

          <View style={styles.lattice}>
            {bloodGroups.map((bg) => {
              const active = bloodGroup === bg
              return (
                <Pressable
                  key={bg}
                  onPress={() => setBloodGroup(bg)}
                  style={[styles.latticeCell, active && styles.latticeCellOn]}
                >
                  <Text style={[styles.latticeText, active && styles.latticeTextOn]}>
                    {bloodLabel(bg)}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* ── Units ───────────────────────────────────────────────────── */}
          <SectionLabel index="02" style={{ marginTop: 34 }}>Units needed</SectionLabel>

          {/* The figure leads and the two controls sit beside it, rather than
              the count being squeezed between two large square buttons. */}
          <View style={styles.stepper}>
            <Text style={styles.stepperValue}>{units}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepperUnit}>unit{units !== 1 ? 's' : ''} of whole blood</Text>
              <Text style={styles.stepperRange}>
                {UNIT_MIN}–{UNIT_MAX} per request
              </Text>
            </View>
            <Pressable
              onPress={() => setUnits(Math.max(1, units - 1))}
              style={[styles.stepBtn, units <= UNIT_MIN && styles.stepBtnOff]}
              hitSlop={4}
            >
              {/* Were − and + text glyphs. */}
              <Minus
                size={16}
                color={units <= UNIT_MIN ? color.faint : color.bone}
                strokeWidth={2}
              />
            </Pressable>
            <Pressable
              onPress={() => setUnits(Math.min(20, units + 1))}
              style={[styles.stepBtn, units >= UNIT_MAX && styles.stepBtnOff]}
              hitSlop={4}
            >
              <Plus
                size={16}
                color={units >= UNIT_MAX ? color.faint : color.bone}
                strokeWidth={2}
              />
            </Pressable>
          </View>

          {/* ── Urgency ─────────────────────────────────────────────────── */}
          <SectionLabel index="03" style={{ marginTop: 34 }}>Urgency</SectionLabel>

          <View>
            {urgencyOptions.map((opt) => {
              const active = urgency === opt.value
              const tone = toneFor(urgencyTone, opt.value)
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setUrgency(opt.value)}
                  style={styles.urgRow}
                >
                  {/* A 2px tick, filled only on the selected level — the same
                      mark the request lists use to carry urgency. */}
                  <View
                    style={[
                      styles.urgTick,
                      { backgroundColor: active ? tone.fg : color.line },
                    ]}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.urgLabel, active && { color: tone.fg }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.urgDesc}>{opt.desc}</Text>
                  </View>
                  {active && <Check size={14} color={tone.fg} strokeWidth={2.5} />}
                </Pressable>
              )
            })}
          </View>

          {/* ── Notes ───────────────────────────────────────────────────── */}
          <SectionLabel index="04" style={{ marginTop: 34 }} aside={<Label>Optional</Label>}>
            Notes
          </SectionLabel>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Patient is scheduled for surgery tomorrow morning"
            placeholderTextColor={color.faint}
            multiline
            numberOfLines={3}
            style={styles.textarea}
          />
          <Text style={styles.notesHint}>
            Anything here is shown to donors who receive the match.
          </Text>

          {/* ── Submit ──────────────────────────────────────────────────── */}
          <Button
            tone="primary"
            size="lg"
            full
            icon={Send}
            busy={loading}
            disabled={loading}
            onPress={handleSubmit}
            style={{ marginTop: 30 }}
          >
            {loading ? 'Posting…' : 'Post blood request'}
          </Button>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
}

/** One line of the success receipt: name left, value right, hairline above. */
function ReceiptRow({
  label, value, mono, tint,
}: { label: string; value: string; mono?: boolean; tint?: string }) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <View style={styles.receiptFill} />
      <Text
        style={[
          mono ? styles.receiptValueMono : styles.receiptValue,
          tint ? { color: tint } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: 20 },

  backLink: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4 },
  backLinkText: {
    fontFamily: font.mono.medium, fontSize: 9.5, color: color.mute,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },

  // Blood group lattice
  lattice: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  latticeCell: {
    width: '22.6%', aspectRatio: 1.35,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  latticeCellOn: { borderColor: color.blood, backgroundColor: wash.bloodDeep },
  latticeText: {
    fontFamily: font.mono.regular, fontSize: 14.5, color: color.mute, letterSpacing: -0.3,
  },
  latticeTextOn: { fontFamily: font.mono.medium, color: color.bone },

  // Units stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperValue: {
    fontFamily: font.mono.medium, fontSize: 40, lineHeight: 44, color: color.bone,
    letterSpacing: -2.5, fontVariant: ['tabular-nums'],
  },
  stepperUnit: { fontFamily: font.sans.regular, fontSize: 13, color: color.mute },
  stepperRange: {
    fontFamily: font.mono.regular, fontSize: 10, color: color.faint,
    letterSpacing: 0.8, marginTop: 4,
  },
  stepBtn: {
    width: 40, height: 40, borderRadius: radius.sm,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnOff: { borderColor: color.lineSoft },

  // Urgency
  urgRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 15,
  },
  urgTick: { width: 2, height: 30, borderRadius: 1 },
  urgLabel: {
    fontFamily: font.sans.medium, fontSize: 14, color: color.bone, letterSpacing: -0.2,
  },
  urgDesc: { fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint, marginTop: 4 },

  // Notes
  textarea: {
    backgroundColor: color.surface,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 13,
    fontFamily: font.sans.regular, fontSize: 14, color: color.bone,
    minHeight: 88, textAlignVertical: 'top',
  },
  notesHint: {
    fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint, marginTop: 9,
  },

  // Success
  doneHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26 },
  doneTitle: {
    fontFamily: font.sans.semibold, fontSize: 34, lineHeight: 38,
    color: color.bone, letterSpacing: -1.5, marginTop: 14,
  },
  doneTitleAccent: {
    fontFamily: font.serif.italic, fontSize: 36, color: color.bloodLite, letterSpacing: -0.5,
  },
  doneSub: {
    fontFamily: font.sans.regular, fontSize: 14, lineHeight: 21,
    color: color.mute, marginTop: 13,
  },
  receiptRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 10,
    borderTopWidth: 1, borderTopColor: color.lineSoft, paddingVertical: 14,
  },
  receiptLabel: { fontFamily: font.sans.regular, fontSize: 13, color: color.mute },
  receiptFill: { flex: 1, height: 1, backgroundColor: color.lineSoft, alignSelf: 'center' },
  receiptValue: { fontFamily: font.sans.medium, fontSize: 14, color: color.bone },
  receiptValueMono: {
    fontFamily: font.mono.medium, fontSize: 15, color: color.bone,
    letterSpacing: -0.4, fontVariant: ['tabular-nums'],
  },
})
