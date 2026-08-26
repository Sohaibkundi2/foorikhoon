/**
 * ForiKhoon mobile design tokens
 * ---------------------------------------------------------------------------
 * These are the same values as the web's `@theme` block in
 * `frontend/src/app/globals.css`, transcribed rather than re-picked, so the two
 * clients are recognisably one product. If a value changes there, change it
 * here too — there is no shared source, and there can't be while one side is
 * Tailwind utilities and the other is StyleSheet objects.
 *
 * Two rules carried over from the web design, both load-bearing:
 *
 *   1. Four colour families only — blood (red), warn (amber), life (green) and
 *      the neutral bone/grey ramp. A fifth hue would mean colour had stopped
 *      carrying meaning and started being decoration.
 *   2. No purple, and no emoji. Icons come from lucide-react-native, which is
 *      the same icon set the web uses, so a glyph means the same thing on both.
 */

export const color = {
  /* Surfaces. Warm-tilted near-blacks, not blue-grey: under a red accent a
     cool grey reads as dirty. */
  ink: '#0A0A0A',
  surface: '#111010',
  raised: '#171514',

  /* Hairlines, two weights. `line` for edges you should see, `lineSoft` for
     structural rules you should only feel. */
  line: '#221E1E',
  lineSoft: '#191616',

  /* Text. Warm off-white, never #FFF — pure white beside red glares on OLED
     and is the tell of an unconsidered palette. */
  bone: '#F4F1EC',
  mute: '#A2A09B',
  faint: '#6E6A66',

  /* Brand red. */
  blood: '#DC2626',
  bloodDark: '#B91C1C',
  bloodDeep: '#450A0A',
  bloodLite: '#FCA5A5',

  /* Amber — the HIGH shortage tier and URGENT urgency. */
  warn: '#D97706',
  warnLite: '#FBBF24',

  /* Green — the states that are genuinely binary and genuinely good news:
     donor available, request fulfilled, hospital verified. */
  life: '#16A34A',
  lifeLite: '#86EFAC',
} as const

/**
 * Translucent washes. RN has no `bg-blood/10`, so every tint the web writes as
 * a slash-opacity utility has to be spelled out once, here, and reused — which
 * is also the only way they stay consistent across seventeen screens.
 */
export const wash = {
  blood: 'rgba(220, 38, 38, 0.10)',
  bloodEdge: 'rgba(220, 38, 38, 0.28)',
  bloodDeep: 'rgba(220, 38, 38, 0.16)',
  warn: 'rgba(217, 119, 6, 0.10)',
  warnEdge: 'rgba(217, 119, 6, 0.28)',
  life: 'rgba(22, 163, 74, 0.10)',
  lifeEdge: 'rgba(22, 163, 74, 0.28)',
  bone: 'rgba(244, 241, 236, 0.06)',
  boneEdge: 'rgba(244, 241, 236, 0.12)',
  scrim: 'rgba(6, 5, 5, 0.72)',
} as const

/**
 * Font families are keyed by the exact names `_layout.tsx` registers with
 * expo-font. React Native gets no synthetic weights on Android — asking for
 * `fontWeight: '600'` on a family that only shipped Regular silently renders
 * Regular — so every weight is its own family and `fontWeight` is never used
 * on branded text.
 */
export const font = {
  sans: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  /* Editorial display face. Used italic, at large sizes, for one phrase per
     screen at most — it is the accent, not the voice. */
  serif: {
    regular: 'InstrumentSerif_400Regular',
    italic: 'InstrumentSerif_400Regular_Italic',
  },
  /* Labels, figures, codes, timestamps. Anything the eye should read as data
     rather than as prose. */
  mono: {
    regular: 'IBMPlexMono_400Regular',
    medium: 'IBMPlexMono_500Medium',
    semibold: 'IBMPlexMono_600SemiBold',
  },
} as const

export const radius = {
  /* Deliberately tight. Everything-rounded-2xl is the house style of generated
     UI; 10–14 keeps cards feeling like printed panels. */
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const

/** Micro-label: mono, uppercase, wide-tracked. The web's `text-[10px]
 *  uppercase tracking-[0.2em] font-mono`, which appears on every screen. */
export const label = {
  fontFamily: font.mono.regular,
  fontSize: 10,
  letterSpacing: 1.7,
  textTransform: 'uppercase' as const,
  color: color.faint,
}

/** Same label, but carrying signal rather than structure. */
export const labelLoud = {
  ...label,
  fontFamily: font.mono.medium,
  color: color.mute,
}

/* ---------------------------------------------------------------------------
   Tone maps
   ---------------------------------------------------------------------------
   Keyed by the raw Prisma enum values so a screen can hand a value straight
   from the API in without translating first. `label` is the display string —
   the enum is never shown to a user.
--------------------------------------------------------------------------- */

export interface Tone {
  fg: string
  bg: string
  border: string
  label: string
}

export const urgencyTone: Record<string, Tone> = {
  CRITICAL: { fg: color.bloodLite, bg: wash.blood, border: wash.bloodEdge, label: 'Critical' },
  URGENT: { fg: color.warnLite, bg: wash.warn, border: wash.warnEdge, label: 'Urgent' },
  NORMAL: { fg: color.mute, bg: wash.bone, border: wash.boneEdge, label: 'Normal' },
}

/** Request status (PENDING | MATCHED | FULFILLED | EXPIRED | NO_SHOW) and
 *  match status (PENDING | ACCEPTED | DECLINED | COMPLETED | NO_SHOW) share a
 *  map: no value collides, and a screen showing both wants them consistent. */
export const statusTone: Record<string, Tone> = {
  PENDING: { fg: color.warnLite, bg: wash.warn, border: wash.warnEdge, label: 'Pending' },
  MATCHED: { fg: color.bloodLite, bg: wash.blood, border: wash.bloodEdge, label: 'Matched' },
  ACCEPTED: { fg: color.lifeLite, bg: wash.life, border: wash.lifeEdge, label: 'Accepted' },
  FULFILLED: { fg: color.lifeLite, bg: wash.life, border: wash.lifeEdge, label: 'Fulfilled' },
  COMPLETED: { fg: color.lifeLite, bg: wash.life, border: wash.lifeEdge, label: 'Completed' },
  DECLINED: { fg: color.mute, bg: wash.bone, border: wash.boneEdge, label: 'Declined' },
  EXPIRED: { fg: color.faint, bg: wash.bone, border: color.line, label: 'Expired' },
  NO_SHOW: { fg: color.bloodLite, bg: wash.blood, border: wash.bloodEdge, label: 'No show' },
}

export const riskTone: Record<string, Tone> = {
  CRITICAL: { fg: color.bloodLite, bg: wash.blood, border: wash.bloodEdge, label: 'Critical' },
  HIGH: { fg: color.warnLite, bg: wash.warn, border: wash.warnEdge, label: 'High' },
  MODERATE: { fg: color.mute, bg: wash.bone, border: wash.boneEdge, label: 'Moderate' },
  LOW: { fg: color.lifeLite, bg: wash.life, border: wash.lifeEdge, label: 'Low' },
}

export function toneFor(map: Record<string, Tone>, key: string | null | undefined): Tone {
  if (key && map[key]) return map[key]
  return { fg: color.mute, bg: wash.bone, border: wash.boneEdge, label: key ? String(key) : '—' }
}

/* ---------------------------------------------------------------------------
   Blood groups
--------------------------------------------------------------------------- */

/**
 * Prisma stores `A_POS`; a donor reads `A+`. The minus is U+2212 MINUS SIGN,
 * not a hyphen — at the sizes these are set, a hyphen sits too high and too
 * short against the letter and looks like a typo.
 */
export function bloodLabel(group: string | null | undefined): string {
  if (!group) return '—'
  return group.replace('_POS', '+').replace('_NEG', '−')
}

/** The eight enum values, in the order the web lattice uses. */
export const BLOOD_GROUPS = [
  'A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG',
] as const

/* ---------------------------------------------------------------------------
   Avatar tints
   ---------------------------------------------------------------------------
   Four warm values, no cool hues — a random cool tint would read as a fifth
   colour family with no meaning attached.
--------------------------------------------------------------------------- */

const avatarTints = [
  { bg: 'rgba(220, 38, 38, 0.12)', fg: color.bloodLite },
  { bg: 'rgba(217, 119, 6, 0.12)', fg: color.warnLite },
  { bg: 'rgba(244, 241, 236, 0.07)', fg: color.bone },
  { bg: 'rgba(69, 10, 10, 0.55)', fg: color.bloodLite },
]

export function tintFor(seed: string) {
  let sum = 0
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i)
  return avatarTints[sum % avatarTints.length]
}

export function initialsFor(name: string | null | undefined): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Height of the tab bar's own body, excluding the safe-area inset. Screens add
 * `insets.bottom` themselves via `useTabBarInset()` in fk.tsx — the raw number
 * lives here so the bar and the padding can never drift apart.
 */
export const TAB_BAR_HEIGHT = 58
