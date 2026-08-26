import Link from 'next/link'

/**
 * Deliberately not importing from fk.tsx: this is a server component, and every
 * export of a `'use client'` module reaches the server as a client reference
 * rather than as its value — so the shared button strings can't be read here.
 * The classes below are the same tokens `primaryBtn` and `quietBtn` are built from.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col justify-center px-6 py-16">
      <div className="relative border-t border-line pt-9">
        <span aria-hidden className="absolute -top-px left-0 h-px w-10 bg-blood" />

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          Error 404
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-14">
          <p className="font-mono text-[5.5rem] font-medium leading-[0.78] tracking-[-0.04em] tabular-nums text-blood sm:text-[7rem]">
            404
          </p>

          <div className="min-w-0 sm:pt-3">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-bone">
              Page not found
            </h1>
            <p className="mt-3.5 max-w-md text-sm leading-relaxed text-mute">
              This address doesn&rsquo;t match any page on ForiKhoon. It may have moved, or the
              link may be incomplete.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-line-soft pt-6">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-blood px-5 py-2.5 text-sm font-medium text-white shadow-[0_14px_34px_-16px_rgba(220,38,38,0.75)] transition-colors duration-150 hover:bg-blood-dark"
              >
                Back to home
              </Link>

              {/* Two real routes rather than a single dead end. Both are public. */}
              <Link
                href="/requests"
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute transition-colors duration-150 hover:text-bone"
              >
                Active requests
              </Link>
              <Link
                href="/leaderboard"
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute transition-colors duration-150 hover:text-bone"
              >
                Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
