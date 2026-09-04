'use client'

/**
 * Shared presentation primitives for the ForiKhoon design system.
 *
 * These are the patterns the landing page established, lifted out so the fifteen
 * routes behind it don't each grow their own slightly-different copy. Everything
 * here is presentation only — no fetching, no state that outlives a render.
 *
 * Class-string exports (`inputClass`, `primaryBtn`, …) exist alongside the
 * components because Tailwind resolves conflicting utilities by CSS source order,
 * not by the order they appear in a className. So "take the base and override one
 * utility" is not reliable; a small set of complete, named variants is.
 */

import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/* ---------------------------------------------------------------- motion --- */

/**
 * Scroll reveal. Short travel, no spring, no parallax — the point is that the
 * page settles, not that it performs.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ----------------------------------------------------------------- atoms --- */

/** Live indicator: a dot with one expanding ring. `fk-ring` respects reduced motion. */
export function LiveDot({ className = 'bg-blood' }: { className?: string }) {
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span className={`fk-ring absolute inline-flex h-full w-full rounded-full ${className}`} />
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${className}`} />
    </span>
  )
}

/**
 * Background texture. Always its own aria-hidden absolutely-positioned layer —
 * putting these background-images on a content element means every child inherits
 * the stacking context and the grain lands on top of the type.
 */
export function Texture({
  grid = true,
  noise = true,
  ember = false,
}: {
  grid?: boolean
  noise?: boolean
  ember?: boolean
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {ember && <div className="fk-ember absolute inset-0" />}
      {grid && <div className="fk-rule-grid absolute inset-0" />}
      {noise && <div className="fk-noise absolute inset-0" />}
    </div>
  )
}

/** Mono section eyebrow with a hairline running out to the margin. */
export function SectionLabel({
  children,
  index,
  aside,
  heading = false,
  className = '',
}: {
  children: ReactNode
  /** Editorial section number ("01"). Kept out of `children` so `getByText` on the
      label still matches only the label. */
  index?: string
  aside?: ReactNode
  /** Render as an <h2>. Use whenever the label really is the section's heading. */
  heading?: boolean
  className?: string
}) {
  const text = 'whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-faint'
  return (
    <div className={`mb-6 flex items-center gap-4 ${className}`}>
      {index && (
        <span aria-hidden className="font-mono text-[11px] tracking-[0.16em] text-blood">
          {index}
        </span>
      )}
      {heading ? <h2 className={text}>{children}</h2> : <p className={text}>{children}</p>}
      <span className="h-px flex-1 bg-line-soft" />
      {aside}
    </div>
  )
}

/**
 * Segmented meter. Ten discrete ticks rather than a filled bar: a smooth bar at
 * these sizes reads as a progress indicator — something in flight — and a
 * commitment score is a standing measurement. Ticks read as an instrument.
 */
export function SegmentMeter({
  value,
  max = 100,
  segments = 10,
  tone = 'bg-blood',
}: {
  value: number
  max?: number
  segments?: number
  tone?: string
}) {
  const lit = Math.round((Math.min(Math.max(value, 0), max) / max) * segments)
  return (
    <div aria-hidden className="flex gap-1">
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 flex-1 rounded-[1px] transition-colors duration-500 ${
            i < lit ? tone : 'bg-raised'
          }`}
        />
      ))}
    </div>
  )
}

/**
 * Page header. The `w-10` red rule sits on the bottom border rather than beside
 * the title, so the accent reads as part of the page's structure.
 */
export function PageHead({
  eyebrow,
  title,
  lede,
  actions,
  children,
}: {
  eyebrow: ReactNode
  title: ReactNode
  lede?: ReactNode
  actions?: ReactNode
  /** Anything that belongs under the lede — a warning link, a chip row. */
  children?: ReactNode
}) {
  return (
    <div className="relative mb-9 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-7">
      <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-bone">{title}</h1>
        {lede && <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-mute">{lede}</p>}
        {children && <div className="mt-3">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

/**
 * Status / urgency chip. Mono and uppercase because these are enum values out of
 * the database, and typography is a cheaper way to say that than a colour alone.
 */
export function Chip({
  children,
  tone = 'text-mute bg-raised border-line',
  icon: Icon,
  className = '',
}: {
  children: ReactNode
  tone?: string
  icon?: LucideIcon
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${tone} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />}
      {children}
    </span>
  )
}

/**
 * Stat card.
 *
 * The label is a *direct child* of the root on purpose. donorDashboard.test.tsx
 * reaches its card via `getByText(label).parentElement`, and that is a reasonable
 * thing for a test to do — so the mono index is positioned absolutely instead of
 * being a flex sibling that would deepen the nesting.
 */
export function Stat({
  index,
  label,
  value,
  tone = 'text-bone',
  hint,
  children,
}: {
  index?: string
  label: string
  value?: ReactNode
  tone?: string
  hint?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="relative bg-ink px-5 py-6">
      {index && (
        <span
          aria-hidden
          className="absolute right-4 top-5 font-mono text-[10px] tracking-[0.16em] text-line"
        >
          {index}
        </span>
      )}
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">{label}</p>
      {value !== undefined && (
        <p className={`mt-3 text-3xl font-semibold tracking-[-0.03em] tabular-nums ${tone}`}>
          {value}
        </p>
      )}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-mute">{hint}</p>}
      {children}
    </div>
  )
}

/**
 * Hairline lattice: one continuous grid whose gaps are the rules. Detached
 * rounded boxes with their own borders read as a component library; this reads as
 * a table that happens to be laid out in two dimensions.
 */
export function Lattice({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`grid gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft ${className}`}
    >
      {children}
    </div>
  )
}

/** Panel: the standard card surface. */
export function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface ${className}`}>{children}</div>
  )
}

/** Empty state. Squared icon tile — a circle here reads as a stock avatar slot. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon
  title: string
  hint?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-14 text-center">
      <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-raised">
        <Icon className="h-5 w-5 text-faint" strokeWidth={1.75} aria-hidden />
      </div>
      <p className="text-sm font-medium text-bone">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-mute">{hint}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  )
}

/**
 * Labelled form field.
 *
 * `htmlFor` is required rather than optional: every input in this app was
 * previously announced unlabelled, and making the association impossible to
 * forget is the whole reason this wrapper exists. The caller supplies the control
 * so selects, textareas and input-plus-button rows all work.
 */
export function Field({
  label,
  htmlFor,
  hint,
  aside,
  children,
}: {
  label: string
  htmlFor: string
  hint?: ReactNode
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint"
        >
          {label}
        </label>
        {aside}
      </div>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-faint">{hint}</p>}
    </div>
  )
}

/* --------------------------------------------------------- class strings --- */

export const inputClass =
  'w-full rounded-md border border-line bg-raised px-3.5 py-2.5 text-sm text-bone placeholder:text-faint outline-none transition-colors duration-150 focus:border-blood focus:ring-1 focus:ring-blood/25'

/** Native select arrow is unstyleable, so the palette is set on the option list too. */
export const selectClass = `${inputClass} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' fill='none' stroke='%236E6A66' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E")] bg-[length:12px] bg-[position:right_0.85rem_center] bg-no-repeat pr-9 [&>option]:bg-surface [&>option]:text-bone`

/**
 * Filter select. A separate variant rather than `selectClass` plus overrides:
 * these sit in a row and must size to their content, and `w-full` cannot be
 * reliably undone by a later class (Tailwind resolves by source order).
 */
export const filterSelectClass = `cursor-pointer appearance-none rounded-md border border-line bg-raised py-2 pl-3.5 pr-9 font-mono text-[11px] uppercase tracking-[0.12em] text-mute outline-none transition-colors duration-150 hover:text-bone focus:border-blood focus:ring-1 focus:ring-blood/25 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' fill='none' stroke='%236E6A66' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E")] bg-[length:12px] bg-[position:right_0.8rem_center] bg-no-repeat [&>option]:bg-surface [&>option]:text-bone [&>option]:normal-case`

export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-md bg-blood px-5 py-2.5 text-sm font-medium text-white shadow-[0_14px_34px_-16px_rgba(220,38,38,0.75)] transition-colors duration-150 hover:bg-blood-dark disabled:cursor-not-allowed disabled:opacity-50'

export const primaryBtnLg =
  'inline-flex items-center justify-center gap-2 rounded-md bg-blood px-7 py-3.5 font-medium text-white shadow-[0_16px_40px_-16px_rgba(220,38,38,0.7)] transition-colors duration-150 hover:bg-blood-dark disabled:cursor-not-allowed disabled:opacity-50'

export const ghostBtn =
  'inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface px-5 py-2.5 text-sm font-medium text-bone transition-colors duration-150 hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50'

export const quietBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-transparent px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute transition-colors duration-150 hover:border-mute/40 hover:text-bone disabled:cursor-not-allowed disabled:opacity-50'

export const dangerBtn =
  'inline-flex items-center justify-center gap-2 rounded-md border border-blood/25 bg-blood/10 px-4 py-2 text-sm font-medium text-blood transition-colors duration-150 hover:bg-blood/20 disabled:cursor-not-allowed disabled:opacity-50'

export const affirmBtn =
  'inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-bone transition-colors duration-150 hover:bg-raised disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Neutral sibling of `dangerBtn` / `affirmBtn`, for the third action in a row.
 * Matched padding and type size on purpose: these sit side by side, and a
 * differently-sized neutral button reads as a different kind of control.
 */
export const neutralBtn =
  'inline-flex items-center justify-center gap-2 rounded-md border border-line bg-raised px-4 py-2 text-sm font-medium text-mute transition-colors duration-150 hover:text-bone disabled:cursor-not-allowed disabled:opacity-50'

/** Inline error / notice band. */
export const noticeClass =
  'flex items-start gap-2.5 rounded-md border border-blood/25 bg-blood/10 px-3.5 py-3 text-sm text-blood-lite'

/* ------------------------------------------------------------------ tone --- */

/**
 * Enum → class. Clean obsidian and crimson palette: blood for danger/action,
 * warn for middle tier, bone/raised for standard status. No green or purple tones.
 */
export const urgencyTone: Record<string, string> = {
  CRITICAL: 'text-blood bg-blood/10 border-blood/25',
  URGENT: 'text-warn bg-warn/10 border-warn/25',
  NORMAL: 'text-bone bg-raised border-line',
}

export const statusTone: Record<string, string> = {
  // BloodRequest.status
  PENDING: 'text-warn bg-warn/10 border-warn/25',
  MATCHED: 'text-bone bg-raised border-line',
  FULFILLED: 'text-bone bg-surface border-line-soft',
  EXPIRED: 'text-faint bg-faint/10 border-faint/20',
  // Match.status adds these three; PENDING and NO_SHOW are shared.
  ACCEPTED: 'text-bone bg-raised border-line',
  DECLINED: 'text-faint bg-faint/10 border-faint/20',
  COMPLETED: 'text-bone bg-surface border-line-soft',
  NO_SHOW: 'text-blood-lite bg-blood-deep/40 border-blood/25',
}

/** Shortage risk tiers, as returned by the Flask engine via /api/map/shortage. */
export const riskTone: Record<string, string> = {
  CRITICAL: 'text-blood bg-blood/10 border-blood/25',
  HIGH: 'text-warn bg-warn/10 border-warn/25',
  MODERATE: 'text-bone bg-raised border-line',
  LOW: 'text-bone bg-surface border-line-soft',
}

/**
 * Initial-avatar tints. Four warm values, no cool hues: the original set ran red
 * → orange → green → blue → purple, which reads as a random assortment against a
 * red brand rather than a considered palette. Same set as WeeklyHeroes.
 */
export const avatarTints = [
  'bg-blood/10 text-blood border-blood/25',
  'bg-warn/10 text-warn border-warn/25',
  'bg-blood-deep/40 text-blood-lite border-blood/20',
  'bg-raised text-bone border-line',
]

export function tintFor(name: string) {
  return avatarTints[(name.charCodeAt(0) || 0) % avatarTints.length]
}

export function initialsFor(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
