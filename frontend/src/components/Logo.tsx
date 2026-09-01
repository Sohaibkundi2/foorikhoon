/**
 * ForiKhoon identity.
 *
 * The mark is the search radius, not a blood drop. A drop or a cross is what
 * every blood-donation app reaches for, and neither says anything about what
 * this platform actually does; the concentric rings are the geometry of the
 * matching engine itself — a request at the centre, and a radius that widens
 * 10km → 25km → 50km → 100km until a qualifying donor is found. The outer arc
 * is broken and scans slowly because the network is always listening.
 *
 * Red appears once, in the dot. The wordmark is `bone` throughout, so the
 * accent marks the request rather than the letterforms — which is also why the
 * mark can't be dropped without the logo losing its only colour.
 *
 * Presentation only, and no asset pipeline: inline SVG inherits `currentColor`
 * for the rings, so the mark can sit on any surface in the palette.
 */

export function LogoMark({
  size = 26,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {/* Outer tier. strokeDasharray sums to this circle's circumference
          (2π × 10.1 ≈ 63.46) so the pattern lays down exactly once: one long
          arc, a gap, then a single round tick — a bearing scale, not a dotted
          line. */}
      <circle
        cx="12"
        cy="12"
        r="10.1"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="28 9 2 24.46"
        strokeLinecap="round"
        opacity="0.3"
        className="fk-scan"
      />
      {/* Inner tier. */}
      <circle cx="12" cy="12" r="6.3" stroke="currentColor" strokeWidth="1.1" opacity="0.58" />
      {/* The request. */}
      <circle cx="12" cy="12" r="2.7" fill="var(--color-blood)" />
    </svg>
  )
}

/**
 * Mark plus wordmark. Kept free of `next/link` so the footer, loading states
 * and the auth pages can use the same lock-up without inheriting a destination.
 */
export default function Logo({
  size = 26,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <span className={`flex select-none items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="text-mute/90 transition-colors duration-300 group-hover:text-mute" />
      <span className="text-[19px] font-semibold leading-none tracking-[-0.03em] text-bone">
        ForiKhoon
      </span>
    </span>
  )
}
