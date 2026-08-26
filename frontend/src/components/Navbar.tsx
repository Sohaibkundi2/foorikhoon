'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { primaryBtn, quietBtn } from '@/components/fk'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const donorLinks = [
    { href: '/donor/dashboard', label: 'Dashboard' },
    { href: '/donor/matches', label: 'My Matches' },
    { href: '/donor/profile', label: 'Profile' },
  ]

  const hospitalLinks = [
    { href: '/hospital/dashboard', label: 'Dashboard' },
    { href: '/hospital/requests', label: 'Requests' },
    { href: '/hospital/inventory', label: 'Inventory' },
    { href: '/hospital/request/new', label: 'New Request' },
    { href: '/hospital/analytics', label: 'Analytics' },
  ]

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard' },
  ]

  const publicLinks = [
    { href: '/requests', label: 'Active Requests' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/#how-it-works', label: 'How it works' },
  ]

  const navLinks = user?.role === 'DONOR' ? donorLinks
    : user?.role === 'HOSPITAL' ? hospitalLinks
    : user?.role === 'ADMIN' ? adminLinks
    : publicLinks

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-line bg-ink">
        <div className="mx-auto flex h-[65px] max-w-6xl items-center justify-between px-6">

          {/* Logo */}
          <Link
            href="/"
            className="select-none text-[19px] font-semibold tracking-[-0.02em]"
          >
            <span className="text-blood">Fori</span>
            <span className="text-bone">Khoon</span>
          </Link>

          {/* Desktop nav links. The active item carries a hairline under it as
              well as a lighter weight, so the current page is not signalled by
              colour alone. */}
          <div className="hidden items-center gap-8 text-[13px] text-mute md:flex">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={`relative transition-colors duration-150 hover:text-bone ${
                  pathname === link.href ? 'text-bone' : ''
                }`}
              >
                {link.label}
                {pathname === link.href && (
                  <span aria-hidden className="absolute -bottom-1.5 left-0 h-px w-full bg-blood" />
                )}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs font-medium text-bone">{user.email}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blood">
                    {user.role}
                  </span>
                </div>
                <button onClick={handleLogout} className={quietBtn}>
                  <LogOut className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-1 text-[13px] text-mute transition-colors duration-150 hover:text-bone"
                >
                  Sign in
                </Link>
                <Link href="/register" className={primaryBtn}>
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 flex-col items-center justify-center gap-1.5 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="fk-mobile-menu"
          >
            <span className={`block h-0.5 w-6 bg-bone transition-all duration-300 ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-6 bg-bone transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-6 bg-bone transition-all duration-300 ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>

        </div>
      </nav>

      {/* Mobile menu */}
      <div
        id="fk-mobile-menu"
        className={`fixed inset-0 z-40 transition-all duration-300 md:hidden ${menuOpen ? 'visible' : 'invisible'}`}
      >

        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Drawer */}
        <div className={`absolute left-0 right-0 top-[65px] border-b border-line bg-ink transition-transform duration-300 ${menuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="space-y-1 px-6 py-6">

            {/* Nav links */}
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={`relative block rounded-md px-4 py-3 text-sm transition-colors duration-150 ${
                  pathname === link.href
                    ? 'bg-raised text-bone'
                    : 'text-mute hover:bg-raised hover:text-bone'
                }`}
              >
                {pathname === link.href && (
                  <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-blood" />
                )}
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="my-3 border-t border-line-soft" />

            {/* Auth */}
            {user ? (
              <div>
                <div className="mb-2 px-4 py-2">
                  <p className="text-sm font-medium text-bone">{user.email}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-blood">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-4 py-3 text-left text-sm text-mute transition-colors duration-150 hover:bg-raised hover:text-bone"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/login"
                  className="block rounded-md border border-line px-4 py-3 text-center text-sm text-mute transition-colors duration-150 hover:border-mute/40 hover:text-bone"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="block rounded-md bg-blood px-4 py-3 text-center text-sm font-medium text-white transition-colors duration-150 hover:bg-blood-dark"
                >
                  Register
                </Link>
              </div>
            )}

          </div>
        </div>

      </div>
    </>
  )
}
