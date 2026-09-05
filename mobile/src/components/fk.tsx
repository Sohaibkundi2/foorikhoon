/**
 * ForiKhoon mobile design kit
 * ---------------------------------------------------------------------------
 * The mobile twin of `frontend/src/components/fk.tsx`. Same vocabulary —
 * hairlines, mono micro-labels, tight radii, one italic display face, an
 * off-centre ember wash — expressed as React Native components instead of
 * Tailwind class strings.
 *
 * Why a kit rather than per-screen StyleSheets: the app has seventeen screens
 * and three roles, and the previous pass had each screen re-declaring its own
 * `#141414` card and its own `#9CA3AF` label. Nine slightly different greys is
 * how an app stops looking designed. Everything visual that appears twice
 * lives here.
 *
 * Deliberately NOT ported from the web:
 *   - the film-grain layer. It is a tiled SVG turbulence data-URI, and there is
 *     no cheap RN equivalent that survives an Android release build.
 *   - `prefers-reduced-motion`. RN exposes this through
 *     `AccessibilityInfo.isReduceMotionEnabled()`, which is async; the motion
 *     here is slow and small enough that gating it is not worth a hook in
 *     every animated component. Revisit if anything faster gets added.
 */

import React, { useEffect } from 'react'
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput, ActivityIndicator,
  type ViewStyle, type TextStyle, type StyleProp, type ScrollViewProps,
  type TextInputProps,
} from 'react-native'
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence,
  withSpring, Easing,
} from 'react-native-reanimated'
import Svg, { Defs, RadialGradient, Stop, Rect, Line } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { ChevronRight, type LucideIcon } from 'lucide-react-native'
import {
  color, wash, font, radius, label as labelType, TAB_BAR_HEIGHT, type Tone,
} from '../theme'

/* ===========================================================================
   Layout
   ========================================================================= */

/**
 * Bottom padding a scrolling screen needs so its last row clears the tab bar.
 * The bar is an overlay rather than a layout sibling (see TabBar.tsx), so
 * nothing reserves this space automatically.
 */
export function useTabBarInset(extra = 24) {
  const insets = useSafeAreaInsets()
  return TAB_BAR_HEIGHT + insets.bottom + extra
}

interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode
  /** Off-centre red wash behind the first fold. On by default. */
  ember?: boolean
  /** Faint engineering grid. Use on data-heavy screens, not on forms. */
  grid?: boolean
  /** Set false for screens that manage their own scrolling (e.g. FlatList). */
  scroll?: boolean
  /** Extra bottom padding on top of the tab-bar clearance. */
  tail?: number
}

export function Screen({
  children, ember = true, grid = false, scroll = true, tail = 24,
  contentContainerStyle, ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets()
  const bottom = useTabBarInset(tail)

  const body = (
    <>
      <Texture ember={ember} grid={grid} />
      {children}
    </>
  )

  if (!scroll) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        {body}
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[{ paddingTop: insets.top + 8, paddingBottom: bottom }, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {body}
    </ScrollView>
  )
}

/**
 * The two background layers. Both are absolutely positioned and
 * `pointerEvents: none`, so they never sit between a finger and a control.
 *
 * The ember is two radial stops anchored top-left and top-right-of-centre —
 * asymmetric on purpose. A centred symmetrical glow behind a headline is the
 * single most recognisable generated-UI move, and avoiding it is most of what
 * makes this look drawn by a person.
 */
export function Texture({ ember = true, grid = false }: { ember?: boolean; grid?: boolean }) {
  return (
    <View style={styles.texture} pointerEvents="none">
      {grid && (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          {/* Explicit lines rather than <Pattern>: pattern fills are the least
              reliable part of react-native-svg on older Android builds. */}
          {Array.from({ length: 9 }).map((_, i) => (
            <Line
              key={`v${i}`} x1={i * 80} y1={0} x2={i * 80} y2={2000}
              stroke={color.bone} strokeOpacity={0.032} strokeWidth={1}
            />
          ))}
          {Array.from({ length: 25 }).map((_, i) => (
            <Line
              key={`h${i}`} x1={0} y1={i * 80} x2={800} y2={i * 80}
              stroke={color.bone} strokeOpacity={0.032} strokeWidth={1}
            />
          ))}
        </Svg>
      )}

      {ember && (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="fkEmberA" cx="6%" cy="-6%" rx="62%" ry="34%">
              <Stop offset="0" stopColor={color.blood} stopOpacity={0.17} />
              <Stop offset="1" stopColor={color.blood} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="fkEmberB" cx="86%" cy="7%" rx="44%" ry="22%">
              <Stop offset="0" stopColor="#7F1D1D" stopOpacity={0.2} />
              <Stop offset="1" stopColor="#7F1D1D" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#fkEmberA)" />
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#fkEmberB)" />
        </Svg>
      )}
    </View>
  )
}

/* ===========================================================================
   Type
   ========================================================================= */

/** Mono, uppercase, wide-tracked micro-label. */
export function Label({ children, style, loud = false }: {
  children: React.ReactNode
  style?: StyleProp<TextStyle>
  loud?: boolean
}) {
  return (
    <Text style={[labelType, loud && { fontFamily: font.mono.medium, color: color.mute }, style]}>
      {children}
    </Text>
  )
}

/**
 * Numbered section rule. The hairline is a flex child so it eats whatever width
 * the label leaves — that variable-length rule is what makes a stack of these
 * read as a document rather than as a list of cards.
 */
export function SectionLabel({ index, children, aside, style }: {
  index?: string
  children: React.ReactNode
  aside?: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.sectionLabel, style]}>
      {index != null && <Text style={styles.sectionIndex}>{index}</Text>}
      <Text style={styles.sectionText}>{children}</Text>
      <View style={styles.sectionRule} />
      {aside}
    </View>
  )
}

/**
 * Screen header. Ranged left, never centred. `accent` is set in the italic
 * display face and is the only place on a screen that face appears.
 */
export function PageHead({ eyebrow, title, accent, sub, aside, style }: {
  eyebrow?: string
  title: string
  accent?: string
  sub?: string
  aside?: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.pageHead, style]}>
      <View style={styles.pageHeadTop}>
        {/* Short red tick sitting on the rule — the mark that appears at the
            top of every screen on both clients. */}
        <View style={styles.pageHeadTick} />
      </View>

      <View style={styles.pageHeadRow}>
        <View style={styles.pageHeadCol}>
          {eyebrow && <Label style={{ marginBottom: 14 }}>{eyebrow}</Label>}
          <Text style={styles.pageTitle}>
            {title}
            {accent ? <Text style={styles.pageTitleAccent}>{` ${accent}`}</Text> : null}
          </Text>
          {sub && <Text style={styles.pageSub}>{sub}</Text>}
        </View>
        {aside}
      </View>
    </View>
  )
}

/** Full-bleed hairline. `tick` draws the short red mark at its left end. */
export function Rule({ tick = false, style }: { tick?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.rule, style]}>
      {tick && <View style={styles.ruleTick} />}
    </View>
  )
}

/* ===========================================================================
   Surfaces
   ========================================================================= */

export function Panel({ children, style, tone, tight = false }: {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  /** Tints the panel's edge and ground — for panels that carry a status. */
  tone?: Tone
  tight?: boolean
}) {
  return (
    <View
      style={[
        styles.panel,
        tight && { padding: 14 },
        tone && { borderColor: tone.border, backgroundColor: tone.bg },
        style,
      ]}
    >
      {children}
    </View>
  )
}

/**
 * A panel that is also a row you can tap. The chevron is the only affordance —
 * no shadow lift, no scale-on-hover vocabulary borrowed from the web.
 */
export function RowLink({ children, onPress, style, tone }: {
  children: React.ReactNode
  onPress: () => void
  style?: StyleProp<ViewStyle>
  tone?: Tone
}) {
  const press = useSharedValue(0)
  const anim = useAnimatedStyle(() => ({
    backgroundColor: press.value ? color.raised : (tone?.bg ?? color.surface),
  }))

  return (
    <AnimatedPressable
      onPressIn={() => { press.value = 1 }}
      onPressOut={() => { press.value = 0 }}
      onPress={onPress}
      style={[styles.panel, styles.rowLink, tone && { borderColor: tone.border }, anim, style]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      <ChevronRight size={16} color={color.faint} strokeWidth={1.75} />
    </AnimatedPressable>
  )
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/* ===========================================================================
   Signals
   ========================================================================= */

export function Chip({ tone, children, icon: Icon, style }: {
  tone: Tone
  children?: React.ReactNode
  icon?: LucideIcon
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg, borderColor: tone.border }, style]}>
      {Icon && <Icon size={11} color={tone.fg} strokeWidth={2} />}
      <Text style={[styles.chipText, { color: tone.fg }]}>{children ?? tone.label}</Text>
    </View>
  )
}

/**
 * Live indicator: a dot with one expanding ring. Tops out at 2.4× and eases
 * out, so it reads as a monitor rather than as a notification badge.
 */
export function LiveDot({ size = 6, tint = color.blood }: { size?: number; tint?: string }) {
  const ring = useSharedValue(0)

  useEffect(() => {
    ring.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    )
  }, [])

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring.value * 1.4 }],
    opacity: ring.value < 0.7 ? 0.5 * (1 - ring.value / 0.7) : 0,
  }))

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: tint },
          ringStyle,
        ]}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint }} />
    </View>
  )
}

/**
 * A figure and its name. Figures are mono and tabular so a column of them
 * shares a decimal position; that alignment is most of why a stat row looks
 * deliberate.
 */
export function Stat({ value, label, tint, loading = false, style }: {
  value: string | number
  label: string
  tint?: string
  loading?: boolean
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.stat, style]}>
      {loading
        ? <Skeleton width={54} height={26} style={{ marginBottom: 7 }} />
        : <Text style={[styles.statValue, tint ? { color: tint } : null]}>{value}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

/**
 * Segmented bar. Discrete blocks rather than a continuous fill, because every
 * quantity in this app is a count of whole things — units in a fridge, donors
 * in radius — and a smooth gradient bar implies a precision the number
 * doesn't have.
 */
export function SegmentMeter({ value, max, segments = 10, tint = color.blood, style }: {
  value: number
  max: number
  segments?: number
  tint?: string
  style?: StyleProp<ViewStyle>
}) {
  const filled = max <= 0 ? 0 : Math.min(segments, Math.round((value / max) * segments))
  return (
    <View style={[styles.meter, style]}>
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.meterSeg,
            i < filled ? { backgroundColor: tint } : { backgroundColor: color.line },
          ]}
        />
      ))}
    </View>
  )
}

export function Skeleton({ width, height = 12, style }: {
  width?: number | `${number}%`
  height?: number
  style?: StyleProp<ViewStyle>
}) {
  const shimmer = useSharedValue(0.5)

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
  }, [])

  const anim = useAnimatedStyle(() => ({ opacity: shimmer.value }))

  return (
    <Animated.View
      style={[{ width: width ?? '100%', height, borderRadius: radius.sm, backgroundColor: color.line }, anim, style]}
    />
  )
}

/**
 * Contextual loading state:
 * Displays an animated pulse scanner, live telemetry status message in mono,
 * and structural skeleton previews matching the screen layout.
 */
export function ContextualLoading({
  eyebrow,
  message = 'Loading live telemetry…',
  subtext = 'Connecting to regional blood network',
  variant = 'default',
  style,
}: {
  eyebrow?: string
  message?: string
  subtext?: string
  variant?: 'default' | 'table' | 'cards' | 'metrics' | 'form'
  style?: StyleProp<ViewStyle>
}) {
  const pulse = useSharedValue(0.4)
  const laserX = useSharedValue(-80)

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    )

    laserX.value = withRepeat(
      withTiming(260, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    )
  }, [])

  const pulseAnim = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }))

  const laserAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: laserX.value }],
  }))

  return (
    <View style={[{ paddingHorizontal: 20 }, style]}>
      <Rule tick />
      <View style={{ marginTop: 22, marginBottom: 26 }}>
        {eyebrow && <Label loud style={{ marginBottom: 12 }}>{eyebrow}</Label>}

        <View style={styles.contextualBox}>
          <View style={styles.contextualHeadRow}>
            <Animated.View style={[styles.contextualDot, pulseAnim]} />
            <Text style={styles.contextualMsg}>{message}</Text>
          </View>
          {subtext ? <Text style={styles.contextualSub}>{subtext}</Text> : null}

          <View style={styles.contextualTrack}>
            <Animated.View style={[styles.contextualLaser, laserAnim]} />
          </View>
        </View>
      </View>

      {variant === 'table' && (
        <View style={{ gap: 1 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <View key={i} style={styles.contextualTableRow}>
              <Skeleton width={38} height={16} />
              <Skeleton width="45%" height={8} />
              <Skeleton width={32} height={16} />
            </View>
          ))}
        </View>
      )}

      {variant === 'cards' && (
        <View style={{ gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.contextualCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Skeleton width="34%" height={12} />
                <Skeleton width={56} height={18} />
              </View>
              <Skeleton width="78%" height={16} style={{ marginBottom: 10 }} />
              <Skeleton width="50%" height={11} />
            </View>
          ))}
        </View>
      )}

      {variant === 'metrics' && (
        <View style={{ gap: 14 }}>
          <View style={styles.contextualCard}>
            <Skeleton width="28%" height={10} style={{ marginBottom: 10 }} />
            <Skeleton width="48%" height={28} style={{ marginBottom: 14 }} />
            <Skeleton width="75%" height={12} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.contextualCard, { flex: 1 }]}>
              <Skeleton width="48%" height={10} style={{ marginBottom: 8 }} />
              <Skeleton width="65%" height={22} />
            </View>
            <View style={[styles.contextualCard, { flex: 1 }]}>
              <Skeleton width="48%" height={10} style={{ marginBottom: 8 }} />
              <Skeleton width="65%" height={22} />
            </View>
          </View>
        </View>
      )}

      {variant === 'form' && (
        <View style={{ gap: 20 }}>
          <View>
            <Skeleton width="28%" height={10} style={{ marginBottom: 8 }} />
            <Skeleton height={46} />
          </View>
          <View>
            <Skeleton width="36%" height={10} style={{ marginBottom: 8 }} />
            <Skeleton height={46} />
          </View>
          <View>
            <Skeleton width="24%" height={10} style={{ marginBottom: 8 }} />
            <Skeleton height={46} />
          </View>
        </View>
      )}

      {variant === 'default' && (
        <View style={{ gap: 14 }}>
          <Skeleton width="65%" height={24} style={{ marginBottom: 6 }} />
          <Skeleton width="90%" height={13} style={{ marginBottom: 20 }} />
          <Skeleton height={80} style={{ marginBottom: 10 }} />
          <Skeleton height={80} />
        </View>
      )}
    </View>
  )
}

/** Inline notice. Never a floating toast — it sits in the flow it refers to. */
export function Notice({ tone, children, icon: Icon, style }: {
  tone: Tone
  children: React.ReactNode
  icon?: LucideIcon
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.notice, { backgroundColor: tone.bg, borderColor: tone.border }, style]}>
      {Icon && <Icon size={14} color={tone.fg} strokeWidth={2} style={{ marginTop: 1 }} />}
      <Text style={[styles.noticeText, { color: tone.fg }]}>{children}</Text>
    </View>
  )
}

export function EmptyState({ icon: Icon, title, body, action, style }: {
  icon: LucideIcon
  title: string
  body?: string
  action?: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyIcon}>
        <Icon size={18} color={color.faint} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body && <Text style={styles.emptyBody}>{body}</Text>}
      {action ? <View style={{ marginTop: 18 }}>{action}</View> : null}
    </View>
  )
}

/* ===========================================================================
   Controls
   ========================================================================= */

type ButtonTone = 'primary' | 'ghost' | 'quiet' | 'danger' | 'affirm'

const buttonTone: Record<ButtonTone, { bg: string; border: string; fg: string }> = {
  primary: { bg: color.blood, border: color.blood, fg: '#FFFFFF' },
  ghost: { bg: 'transparent', border: color.line, fg: color.bone },
  quiet: { bg: color.surface, border: color.line, fg: color.mute },
  danger: { bg: wash.blood, border: wash.bloodEdge, fg: color.bloodLite },
  affirm: { bg: color.life, border: color.life, fg: '#F0FDF4' },
}

/**
 * Press feedback is a 0.97 scale plus a selection haptic — no opacity fade.
 * `activeOpacity` on a dark ground makes a button look like it broke rather
 * than like it responded.
 */
export function Button({
  children, onPress, tone = 'primary', icon: Icon, size = 'md',
  disabled = false, busy = false, style, haptic = true, full = false,
}: {
  children: React.ReactNode
  onPress?: () => void
  tone?: ButtonTone
  icon?: LucideIcon
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  busy?: boolean
  style?: StyleProp<ViewStyle>
  haptic?: boolean
  full?: boolean
}) {
  const scale = useSharedValue(1)
  const t = buttonTone[tone]
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const inert = disabled || busy

  const pad = size === 'lg' ? 16 : size === 'sm' ? 9 : 13
  const fs = size === 'lg' ? 15 : size === 'sm' ? 12.5 : 14

  return (
    <AnimatedPressable
      disabled={inert}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: 90 }) }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 320 }) }}
      onPress={() => {
        if (haptic) Haptics.selectionAsync()
        onPress?.()
      }}
      style={[
        styles.button,
        {
          backgroundColor: t.bg,
          borderColor: t.border,
          paddingVertical: pad,
          paddingHorizontal: size === 'sm' ? 13 : 18,
          opacity: inert ? 0.45 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        anim,
        style,
      ]}
    >
      {busy
        ? <ActivityIndicator size="small" color={t.fg} />
        : Icon ? <Icon size={fs + 1} color={t.fg} strokeWidth={2} /> : null}
      <Text style={[styles.buttonText, { color: t.fg, fontSize: fs }]}>{children}</Text>
    </AnimatedPressable>
  )
}

/** Text-only action. Mono and wide-tracked so it reads as a directive. */
export function TextAction({ children, onPress, tint = color.mute, style }: {
  children: React.ReactNode
  onPress?: () => void
  tint?: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={style}>
      <Text style={[styles.textAction, { color: tint }]}>{children}</Text>
    </Pressable>
  )
}

export function Field({ label, hint, error, children, style }: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      <Label loud style={{ marginBottom: 8 }}>{label}</Label>
      {children}
      {error
        ? <Text style={[styles.fieldHint, { color: color.bloodLite }]}>{error}</Text>
        : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  )
}

export function Input({ style, ...rest }: TextInputProps) {
  const [focused, setFocused] = React.useState(false)
  return (
    <TextInput
      placeholderTextColor={color.faint}
      selectionColor={color.blood}
      onFocus={(e) => { setFocused(true); rest.onFocus?.(e) }}
      onBlur={(e) => { setFocused(false); rest.onBlur?.(e) }}
      {...rest}
      style={[styles.input, focused && { borderColor: wash.bloodEdge, backgroundColor: color.raised }, style]}
    />
  )
}

/**
 * Horizontal choice row — the pattern that replaces every native <select> on
 * this app's forms. Options are chips, not a picker: with eight blood groups or
 * four radius tiers, showing all of them is faster than opening a wheel, and
 * the current value is visible without a tap.
 */
export function Choice<T extends string | number>({ options, value, onChange, style }: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.choice, style]}>
      {options.map((opt) => {
        const on = opt.value === value
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => { Haptics.selectionAsync(); onChange(opt.value) }}
            style={[styles.choiceItem, on && styles.choiceItemOn]}
          >
            <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{opt.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/* ===========================================================================
   Styles
   ========================================================================= */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ink },
  texture: { ...StyleSheet.absoluteFillObject, height: 520 },

  // Type
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionIndex: {
    fontFamily: font.mono.regular, fontSize: 10, color: color.blood, letterSpacing: 0.5,
  },
  sectionText: {
    fontFamily: font.mono.medium, fontSize: 10, color: color.mute,
    letterSpacing: 1.7, textTransform: 'uppercase',
  },
  sectionRule: { flex: 1, height: 1, backgroundColor: color.line },

  pageHead: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22 },
  pageHeadTop: { height: 1, backgroundColor: color.line, marginBottom: 18 },
  pageHeadTick: { position: 'absolute', top: 0, left: 0, width: 34, height: 1, backgroundColor: color.blood },
  pageHeadRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  pageHeadCol: { flex: 1, minWidth: 0 },
  pageTitle: {
    fontFamily: font.sans.semibold, fontSize: 27, lineHeight: 32,
    letterSpacing: -0.7, color: color.bone,
  },
  pageTitleAccent: {
    fontFamily: font.serif.italic, fontSize: 30, lineHeight: 32, color: color.bloodLite,
    letterSpacing: -0.2,
  },
  pageSub: {
    fontFamily: font.sans.regular, fontSize: 13.5, lineHeight: 20,
    color: color.mute, marginTop: 10, maxWidth: 460,
  },

  rule: { height: 1, backgroundColor: color.line },
  ruleTick: { position: 'absolute', left: 0, top: 0, width: 34, height: 1, backgroundColor: color.blood },

  // Surfaces
  panel: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.lg,
    padding: 18,
  },
  rowLink: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  // Signals
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: radius.pill,
    paddingHorizontal: 9, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontFamily: font.mono.medium, fontSize: 9.5,
    letterSpacing: 1.1, textTransform: 'uppercase',
  },

  stat: { minWidth: 0 },
  statValue: {
    fontFamily: font.mono.medium, fontSize: 25, lineHeight: 28,
    letterSpacing: -1, color: color.bone, fontVariant: ['tabular-nums'],
    marginBottom: 6,
  },
  statLabel: {
    fontFamily: font.mono.regular, fontSize: 9.5, color: color.faint,
    letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 13,
  },

  meter: { flexDirection: 'row', gap: 3 },
  meterSeg: { flex: 1, height: 4, borderRadius: 1 },

  notice: {
    flexDirection: 'row', gap: 9, alignItems: 'flex-start',
    borderWidth: 1, borderRadius: radius.md, padding: 13,
  },
  noticeText: { flex: 1, fontFamily: font.sans.regular, fontSize: 12.5, lineHeight: 18 },

  empty: {
    borderWidth: 1, borderColor: color.lineSoft, borderRadius: radius.lg,
    borderStyle: 'dashed', paddingVertical: 34, paddingHorizontal: 22,
  },
  emptyIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: font.sans.medium, fontSize: 15, color: color.bone, letterSpacing: -0.2 },
  emptyBody: {
    fontFamily: font.sans.regular, fontSize: 13, lineHeight: 19,
    color: color.mute, marginTop: 7, maxWidth: 320,
  },

  // Controls
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderRadius: radius.md,
  },
  buttonText: { fontFamily: font.sans.medium, letterSpacing: -0.1 },
  textAction: {
    fontFamily: font.mono.medium, fontSize: 10,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },

  fieldHint: { fontFamily: font.sans.regular, fontSize: 11.5, color: color.faint, marginTop: 7, lineHeight: 16 },
  input: {
    backgroundColor: color.surface,
    borderWidth: 1, borderColor: color.line, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 13,
    fontFamily: font.sans.regular, fontSize: 14.5, color: color.bone,
  },

  choice: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choiceItem: {
    borderWidth: 1, borderColor: color.line, backgroundColor: color.surface,
    borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 9,
  },
  choiceItemOn: { borderColor: wash.bloodEdge, backgroundColor: wash.blood },
  choiceText: { fontFamily: font.mono.regular, fontSize: 12.5, color: color.mute },
  choiceTextOn: { fontFamily: font.mono.medium, color: color.bloodLite },

  // Contextual loading
  contextualBox: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    padding: 16,
    overflow: 'hidden',
  },
  contextualHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contextualDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: color.blood,
  },
  contextualMsg: {
    fontFamily: font.mono.medium,
    fontSize: 11.5,
    color: color.bone,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  contextualSub: {
    fontFamily: font.sans.regular,
    fontSize: 12,
    color: color.mute,
    marginTop: 6,
    lineHeight: 17,
  },
  contextualTrack: {
    marginTop: 14,
    height: 2,
    backgroundColor: color.lineSoft,
    borderRadius: 1,
    overflow: 'hidden',
  },
  contextualLaser: {
    width: 80,
    height: 2,
    backgroundColor: color.bloodLite,
    borderRadius: 1,
  },
  contextualTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: color.lineSoft,
    paddingVertical: 16,
  },
  contextualCard: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    padding: 16,
  },
})

export { styles as fkStyles }
