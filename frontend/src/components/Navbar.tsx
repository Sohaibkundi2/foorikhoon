'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LogOut,
  Droplet,
  Building2,
  Search,
  Trophy,
  HelpCircle,
  ShieldCheck,
  Radio,
  Activity
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { primaryBtn, quietBtn, Texture, LiveDot } from '@/components/fk'
import Logo from '@/components/Logo'

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const [hovered, setHovered] = useState<string | null>(null)

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Lock body scroll while overlay is open
  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const donorLinks = [
    { href: '/donor/dashboard', label: 'Dashboard', hint: 'Your live activity & stats', icon: Activity },
    { href: '/donor/matches', label: 'My Matches', hint: 'Nearby hospital calls', icon: Droplet },
    { href: '/donor/profile', label: 'Profile & Radius', hint: 'Blood group & availability', icon: ShieldCheck },
  ]

  const hospitalLinks = [
    { href: '/hospital/dashboard', label: 'Dashboard', hint: 'Emergency overview', icon: Activity },
    { href: '/hospital/requests', label: 'Blood Requests', hint: 'Open & fulfilled calls', icon: Droplet },
    { href: '/hospital/inventory', label: 'Blood Inventory', hint: 'Units currently in stock', icon: ShieldCheck },
    { href: '/hospital/request/new', label: 'Post Emergency', hint: 'Broadcast urgent request', icon: Building2 },
    { href: '/hospital/analytics', label: 'Analytics', hint: 'Shortage predictions', icon: Trophy },
  ]

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Admin Console', hint: 'Platform controls', icon: Activity },
  ]

  const publicLinks = [
    { href: '/requests', label: 'Active Requests', hint: 'Live hospital emergency needs', icon: Search },
    { href: '/leaderboard', label: 'Leaderboard', hint: 'Top verified lifesavers in Pakistan', icon: Trophy },
    { href: '/#how-it-works', label: 'The Protocol', hint: 'Dispatch to photo-verified bag', icon: HelpCircle },
  ]

  const navLinks = user?.role === 'DONOR' ? donorLinks
    : user?.role === 'HOSPITAL' ? hospitalLinks
    : user?.role === 'ADMIN' ? adminLinks
    : publicLinks

  const slide = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.7 }

  const focusRing =
    'outline-none focus-visible:ring-1 focus-visible:ring-blood/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink'

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-line bg-ink/90 backdrop-blur-xl">
        <div className="relative mx-auto flex h-[65px] max-w-7xl items-center justify-between px-4 sm:px-6">
          <span aria-hidden className="absolute -bottom-px left-4 sm:left-6 h-px w-16 bg-blood" />

          {/* Logo Brand */}
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link href="/" className={`group rounded-sm ${focusRing}`} aria-label="ForiKhoon home">
              <Logo />
            </Link>
            <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-faint sm:block">
              Emergency Network
            </span>
          </div>

          {/* Desktop link rail */}
          <div
            className="relative hidden overflow-hidden rounded-md border border-line bg-surface lg:flex"
            onMouseLeave={() => setHovered(null)}
          >
            {navLinks.map((link, i) => {
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  onMouseEnter={() => setHovered(link.href)}
                  onFocus={() => setHovered(link.href)}
                  onBlur={() => setHovered(null)}
                  className={`relative px-4 py-2 text-[13px] transition-colors duration-200 ${focusRing} ${
                    i > 0 ? 'border-l border-line' : ''
                  } ${active ? 'font-medium text-ink' : 'text-mute hover:text-bone'}`}
                >
                  {active && (
                    <motion.span
                      aria-hidden
                      layoutId="fk-rail-active"
                      className="absolute inset-0 bg-bone"
                      transition={slide}
                    />
                  )}
                  {hovered === link.href && !active && (
                    <motion.span
                      aria-hidden
                      layoutId="fk-rail-hover"
                      className="absolute inset-0 bg-bone/[0.055]"
                      transition={slide}
                    />
                  )}
                  <span className="relative">{link.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Desktop Right Auth Actions */}
          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex min-w-0 flex-col items-end gap-0.5">
                  <span className="max-w-[190px] truncate text-xs font-medium text-bone">
                    {user.email}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blood">
                    {user.role}
                  </span>
                </div>
                <button onClick={handleLogout} className={`${quietBtn} ${focusRing}`}>
                  <LogOut className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`rounded-sm px-2 text-[13px] text-mute transition-colors duration-150 hover:text-bone ${focusRing}`}
                >
                  Sign in
                </Link>
                <Link href="/register" className={`${primaryBtn} ${focusRing}`}>
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Creative Mobile Trigger */}
          <div className="flex items-center gap-2 lg:hidden">
            {!user && (
              <Link
                href="/register"
                className="flex items-center gap-1 rounded-lg bg-blood/10 border border-blood/30 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-blood transition-colors active:scale-95"
              >
                <Droplet className="h-3 w-3 fill-blood" />
                <span>Join</span>
              </Link>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`relative flex h-9 items-center gap-1.5 rounded-lg border px-2.5 transition-all duration-200 active:scale-95 cursor-pointer ${
                menuOpen
                  ? 'border-blood bg-blood/15 text-white shadow-[0_0_12px_-3px_rgba(220,38,38,0.5)]'
                  : 'border-line bg-surface text-bone hover:border-line-soft'
              }`}
              aria-expanded={menuOpen}
              aria-controls="fk-mobile-menu"
              aria-label="Toggle navigation menu"
            >
              <div className="flex flex-col gap-1 w-3.5">
                <span
                  className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${
                    menuOpen ? 'rotate-45 translate-y-1 bg-blood' : ''
                  }`}
                />
                <span
                  className={`h-0.5 w-full rounded-full bg-current transition-all duration-200 ${
                    menuOpen ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`h-0.5 w-full rounded-full bg-current transition-all duration-300 ${
                    menuOpen ? '-rotate-45 -translate-y-1 bg-blood' : ''
                  }`}
                />
              </div>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-wider">
                {menuOpen ? 'Close' : 'Menu'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer (Strictly fits on single screen with zero overflow / zero scroll) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="fk-mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="fixed inset-x-0 top-[65px] z-40 h-[calc(100dvh-65px)] overflow-hidden bg-ink/95 backdrop-blur-2xl px-3.5 py-3 lg:hidden flex flex-col justify-between"
          >
            {/* Background Texture & Ambient Glow */}
            <Texture ember={true} grid={true} noise={true} />

            <div className="relative space-y-3">
              {/* Compact Header Bar */}
              <div className="flex items-center justify-between rounded-lg border border-line bg-surface/80 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <LiveDot />
                  <span className="font-mono text-[9px] uppercase tracking-wider text-blood font-semibold">
                    Live Dispatch Grid
                  </span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-faint">
                  Pakistan 24/7
                </span>
              </div>

              {/* Navigation Links (Compact Cards) */}
              <div className="space-y-1.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-faint px-1">
                  Navigation
                </p>

                {navLinks.map((link, idx) => {
                  const active = pathname === link.href
                  const Icon = link.icon

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`group flex items-center justify-between rounded-xl border p-2.5 transition-all active:scale-98 ${
                        active
                          ? 'border-blood bg-blood/10 text-bone shadow-[0_0_12px_-4px_rgba(220,38,38,0.4)]'
                          : 'border-line bg-surface/70 text-bone hover:border-line-soft hover:bg-raised'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                            active
                              ? 'border-blood/40 bg-blood/20 text-blood'
                              : 'border-line bg-raised text-mute group-hover:text-bone'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>

                        <div>
                          <p className="text-[13px] font-semibold tracking-tight text-bone leading-tight">
                            {link.label}
                          </p>
                          <p className="text-[10px] text-mute leading-none mt-0.5">{link.hint}</p>
                        </div>
                      </div>

                      <span className="font-mono text-[10px] text-faint group-hover:text-blood transition-colors pr-1">
                        0{idx + 1} &rarr;
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Bottom Actions & User Identity */}
            <div className="relative pt-3 border-t border-line-soft space-y-2">
              {user ? (
                <div className="rounded-xl border border-line bg-surface/90 p-2.5 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-bone">{user.email}</p>
                    <span className="inline-block mt-0.5 rounded bg-blood/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-blood font-semibold">
                      {user.role} Account
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-[11px] font-medium text-mute hover:text-bone hover:border-blood transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-blood py-2.5 text-center text-xs font-semibold text-white shadow transition-all hover:bg-blood-dark active:scale-98"
                  >
                    <Droplet className="h-3.5 w-3.5 fill-white" />
                    <span>Donor Signup</span>
                  </Link>

                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-2.5 text-center text-xs font-medium text-bone hover:bg-raised transition-colors active:scale-98"
                  >
                    <Building2 className="h-3.5 w-3.5 text-blood" />
                    <span>Hospital Portal</span>
                  </Link>
                </div>
              )}

              <p className="text-center font-mono text-[8px] uppercase tracking-[0.16em] text-faint">
                ForiKhoon • Pakistan 24/7
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}