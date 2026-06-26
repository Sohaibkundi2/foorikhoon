'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A] border-b border-[#1F1F1F]">
        <div className="max-w-6xl mx-auto px-6 h-[65px] flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="text-xl font-bold tracking-tight select-none">
            <span className="text-[#DC2626]">Fori</span>
            <span className="text-white">Khoon</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-[#9CA3AF]">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:text-white transition-colors duration-150 ${
                  pathname === link.href ? 'text-white' : ''
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-white font-medium">{user.email}</span>
                  <span className="text-xs text-[#DC2626] capitalize">{user.role.toLowerCase()}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-[#9CA3AF] hover:text-white border border-[#2A2A2A] hover:border-[#444] px-4 py-2 rounded-md transition-all duration-150"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm text-[#9CA3AF] hover:text-white px-4 py-2 rounded-md transition-colors duration-150">
                  Sign in
                </Link>
                <Link href="/register" className="text-sm font-medium bg-[#DC2626] hover:bg-[#B91C1C] text-white px-5 py-2 rounded-md transition-colors duration-150 shadow-lg shadow-red-900/20">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
            aria-label="Toggle menu"
          >
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>

        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${menuOpen ? 'visible' : 'invisible'}`}>

        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMenuOpen(false)}
        />

        {/* Drawer */}
        <div className={`absolute top-[65px] left-0 right-0 bg-[#0A0A0A] border-b border-[#1F1F1F] transition-transform duration-300 ${menuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="px-6 py-6 space-y-1">

            {/* Nav links */}
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-3 rounded-md text-sm transition-colors duration-150 ${
                  pathname === link.href
                    ? 'bg-[#141414] text-white'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-[#141414]'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="border-t border-[#1F1F1F] my-3" />

            {/* Auth */}
            {user ? (
              <div>
                <div className="px-4 py-2 mb-2">
                  <p className="text-white text-sm font-medium">{user.email}</p>
                  <p className="text-[#DC2626] text-xs capitalize">{user.role.toLowerCase()}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 rounded-md text-sm text-[#9CA3AF] hover:text-white hover:bg-[#141414] transition-colors duration-150"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/login"
                  className="block text-center px-4 py-3 rounded-md text-sm text-[#9CA3AF] border border-[#2A2A2A] hover:text-white hover:border-[#3A3A3A] transition-all duration-150"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="block text-center px-4 py-3 rounded-md text-sm font-medium bg-[#DC2626] hover:bg-[#B91C1C] text-white transition-colors duration-150"
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