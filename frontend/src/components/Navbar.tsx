'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { primaryBtn, quietBtn, Texture } from '@/components/fk'
import Logo from '@/components/Logo'

// Shared easing curve for all overlay motion
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

// Staggers overlay rows in on open, reverses faster on close
const listMotion: Variants = {
  open: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
  closed: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
}

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
    { href: '/donor/dashboard', label: 'Dashboard', hint: 'Your activity' },
    { href: '/donor/matches', label: 'My Matches', hint: 'Requests near you' },
    { href: '/donor/profile', label: 'Profile', hint: 'Availability and details' },
  ]

  const hospitalLinks = [
    { href: '/hospital/dashboard', label: 'Dashboard', hint: 'Today at a glance' },
    { href: '/hospital/requests', label: 'Requests', hint: 'Open and fulfilled' },
    { href: '/hospital/inventory', label: 'Inventory', hint: 'Units in stock' },
    { href: '/hospital/request/new', label: 'New Request', hint: 'Post an urgent need' },
    { href: '/hospital/analytics', label: 'Analytics', hint: 'Demand and shortages' },
  ]

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', hint: 'Platform overview' },
  ]

  const publicLinks = [
    { href: '/requests', label: 'Active Requests', hint: 'Who needs blood right now' },
    { href: '/leaderboard', label: 'Leaderboard', hint: 'Top donors' },
    { href: '/#how-it-works', label: 'How it works', hint: 'From request to donor' },
  ]

  const navLinks = user?.role === 'DONOR' ? donorLinks
    : user?.role === 'HOSPITAL' ? hospitalLinks
    : user?.role === 'ADMIN' ? adminLinks
    : publicLinks

  const slide = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.7 }

  const rowMotion: Variants = {
    open: {
      opacity: 1,
      transition: reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT },
    },
    closed: { opacity: 0, transition: { duration: reduceMotion ? 0 : 0.18 } },
  }

  const lineMotion: Variants = {
    open: {
      y: '0%',
      transition: reduceMotion ? { duration: 0 } : { duration: 0.62, ease: EASE_OUT },
    },
    closed: {
      y: reduceMotion ? '0%' : '115%',
      transition: { duration: reduceMotion ? 0 : 0.22 },
    },
  }

  const indexMotion: Variants = {
    open: {
      y: '0%',
      opacity: 1,
      transition: reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT, delay: 0.05 },
    },
    closed: {
      y: reduceMotion ? '0%' : '110%',
      opacity: 0,
      transition: { duration: reduceMotion ? 0 : 0.18 },
    },
  }

  const focusRing =
    'outline-none focus-visible:ring-1 focus-visible:ring-blood/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink'

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-line bg-ink">
        <div className="relative mx-auto flex h-[65px] max-w-6xl items-center justify-between px-6">
          <span aria-hidden className="absolute -bottom-px left-6 h-px w-16 bg-blood" />

          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className={`group rounded-sm ${focusRing}`} aria-label="ForiKhoon home">
              <Logo />
            </Link>
            <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-faint sm:block">
              Emergency network
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
                  className={`rounded-sm px-1 text-[13px] text-mute transition-colors duration-150 hover:text-bone ${focusRing}`}
                >
                  Sign in
                </Link>
                <Link href="/register" className={`${primaryBtn} ${focusRing}`}>
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`group flex min-h-[40px] items-center gap-2.5 rounded-md border px-3.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-200 lg:hidden ${focusRing} ${
              menuOpen
                ? 'border-blood/45 text-bone'
                : 'border-line text-mute hover:border-mute/40 hover:text-bone'
            }`}
            aria-expanded={menuOpen}
            aria-controls="fk-mobile-menu"
          >
            <span aria-hidden className="relative block h-3 w-3.5">
              <span
                className={`absolute left-0 top-1/2 h-px w-3.5 -translate-y-1/2 transition-[transform,background-color] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  menuOpen ? 'rotate-45 bg-blood' : '-translate-y-[5px] bg-current'
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 h-px w-3.5 -translate-y-1/2 transition-[transform,background-color] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  menuOpen ? '-rotate-45 bg-blood' : 'translate-y-[4px] bg-current'
                }`}
              />
            </span>
            <span className="relative grid h-3 overflow-hidden">
              <span
                className={`col-start-1 row-start-1 leading-3 transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  menuOpen ? '-translate-y-full' : 'translate-y-0'
                }`}
              >
                Menu
              </span>
              <span
                aria-hidden
                className={`col-start-1 row-start-1 leading-3 transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  menuOpen ? 'translate-y-0' : 'translate-y-full'
                }`}
              >
                Close
              </span>
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile overlay — locked to one screen height, no scroll */}
      <div
        id="fk-mobile-menu"
        className={`fixed inset-x-0 top-[65px] z-40 h-[calc(100dvh-65px)] overflow-hidden bg-ink transition-[opacity,visibility] duration-300 ease-out lg:hidden ${
          menuOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <Texture grid={false} noise />

        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-blood/[0.09] blur-[90px]"
        />

        <motion.div
          className="relative flex h-full flex-col justify-between px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5"
          initial={false}
          animate={menuOpen ? 'open' : 'closed'}
          variants={listMotion}
        >
          <motion.div variants={rowMotion} className="flex shrink-0 items-center gap-4">
            <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              Emergency network · Pakistan
            </span>
            <span aria-hidden className="h-px flex-1 bg-line-soft" />
          </motion.div>

          <div className="flex flex-1 flex-col justify-center gap-0">
            {navLinks.map((link, i) => {
              const active = pathname === link.href
              const many = navLinks.length >= 4
              const mid = navLinks.length === 3
              return (
                <motion.div key={link.href} variants={rowMotion}>
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-baseline gap-3 border-b ${focusRing} ${
                        many ? 'py-2.5' : mid ? 'py-3' : 'py-4'
                      } ${active ? 'border-blood' : 'border-line-soft'}`}
                    >
                      <span className="block w-5 shrink-0 overflow-hidden pb-1 -mb-1">
                        <motion.span
                          variants={indexMotion}
                          className={`block font-mono text-[10px] tracking-[0.08em] ${
                            active ? 'text-blood' : 'text-faint'
                          }`}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </motion.span>
                      </span>
                      <span className="block flex-1 overflow-hidden pb-1 -mb-1">
                        <motion.span
                          variants={lineMotion}
                          className={`block leading-[1.05] tracking-[-0.04em] ${
                            many
                              ? 'text-[clamp(1.3rem,6.2vw,1.65rem)]'
                              : mid
                              ? 'text-[clamp(1.65rem,7.5vw,2.1rem)]'
                              : 'text-[clamp(2.1rem,9.5vw,2.75rem)]'
                          } ${active ? 'text-bone' : 'text-mute'}`}
                        >
                          {link.label}
                        </motion.span>
                      </span>
                    </Link>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>

          <motion.div variants={rowMotion} className="shrink-0">
            {user ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-line px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-bone">{user.email}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-blood">
                    {user.role}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={handleLogout}
                  aria-label="Logout"
                  className={`flex shrink-0 items-center gap-1.5 rounded-sm border border-line px-3 py-2 text-[11px] text-mute transition-colors duration-150 hover:border-mute/40 hover:text-bone ${focusRing}`}
                >
                  <LogOut className="h-3 w-3" strokeWidth={2} aria-hidden />
                  Logout
                </motion.button>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
                  <Link
                    href="/register"
                    className={`block rounded-md bg-blood px-4 py-3 text-center text-sm font-medium text-white shadow-[0_14px_34px_-16px_rgba(220,38,38,0.75)] transition-colors duration-150 hover:bg-blood-dark ${focusRing}`}
                  >
                    Register
                  </Link>
                </motion.div>
                <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
                  <Link
                    href="/login"
                    className={`block rounded-md border border-line px-4 py-3 text-center text-sm text-mute transition-colors duration-150 hover:border-mute/40 hover:text-bone ${focusRing}`}
                  >
                    Sign in
                  </Link>
                </motion.div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}