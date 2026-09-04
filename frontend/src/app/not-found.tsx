import Link from 'next/link'
import { ArrowLeft, Compass, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-ink px-4 py-16">
      {/* Background CAD grid line decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.08)_0%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"
      />

      <div className="relative mx-auto max-w-lg text-center rounded-3xl border border-line bg-surface/80 p-8 backdrop-blur-xl shadow-2xl sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blood/30 bg-blood/10 text-blood">
          <Compass className="h-7 w-7" />
        </div>

        <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-widest text-blood">
          Transmission Interrupted • 404
        </p>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-bone sm:text-4xl">
          Page Not Located
        </h1>

        <p className="mt-3 text-xs leading-relaxed text-mute sm:text-sm">
          The requested coordinate does not exist on the ForiKhoon network grid. It may have been relocated or updated.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blood px-5 py-3 text-xs font-semibold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-98"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dispatch</span>
          </Link>

          <Link
            href="/requests"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-raised px-5 py-3 text-xs font-semibold text-bone hover:border-line-soft transition-colors active:scale-98"
          >
            <Search className="h-4 w-4 text-blood" />
            <span>Active Requests</span>
          </Link>
        </div>

        <p className="mt-8 font-mono text-[9px] uppercase tracking-wider text-faint">
          ForiKhoon Emergency Transfusion Grid • Pakistan 24/7
        </p>
      </div>
    </div>
  )
}
