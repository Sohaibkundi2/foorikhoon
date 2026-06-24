'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A] border-b border-[#1F1F1F]">
      <div className="max-w-6xl mx-auto px-8 h-[65px] flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="text-xl font-bold tracking-tight select-none">
          <span className="text-[#DC2626]">Fori</span>
          <span className="text-white">Khoon</span>
        </Link>

        {/* Nav links based on role */}
        <div className="hidden md:flex items-center gap-8 text-sm text-[#9CA3AF]">
          {user?.role === 'DONOR' && (
            <>
              <Link href="/donor/dashboard" className="hover:text-white transition-colors duration-150">Dashboard</Link>
              <Link href="/donor/matches" className="hover:text-white transition-colors duration-150">My Matches</Link>
              <Link href="/donor/profile" className="hover:text-white transition-colors duration-150">Profile</Link>
            </>
          )}
          {user?.role === 'HOSPITAL' && (
            <>
              <Link href="/hospital/dashboard" className="hover:text-white transition-colors duration-150">Dashboard</Link>
              <Link href="/hospital/requests" className="hover:text-white transition-colors duration-150">Requests</Link>
              <Link href="/hospital/inventory" className="hover:text-white transition-colors duration-150">Inventory</Link>
            </>
          )}
            {!user && (
              <>
                <Link href="/requests" className="hover:text-white transition-colors duration-150">
                  Active Requests
                </Link>
                <Link href="/#how-it-works" className="hover:text-white transition-colors duration-150">
                  How it works
                </Link>
              </>
            )}
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
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
              <Link
                href="/login"
                className="text-sm text-[#9CA3AF] hover:text-white px-4 py-2 rounded-md transition-colors duration-150"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-[#DC2626] hover:bg-[#B91C1C] text-white px-5 py-2 rounded-md transition-colors duration-150 shadow-lg shadow-red-900/20"
              >
                Register
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  )
}