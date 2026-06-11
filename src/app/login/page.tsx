'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { setAuth } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      const response = await api.post('/api/auth/login', { email, password })
      const { user, token } = response.data

      setAuth(user, token)

      if (user.role === 'DONOR') router.push('/donor/dashboard')
      else if (user.role === 'HOSPITAL') router.push('/hospital/dashboard')
      else if (user.role === 'ADMIN') router.push('/admin/dashboard')

    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[#DC2626] text-xs font-medium tracking-widest uppercase mb-3">
            Welcome back
          </p>
          <h1 className="text-3xl font-bold text-white">Sign in</h1>
          <p className="text-[#9CA3AF] text-sm mt-2">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-white hover:text-[#DC2626] transition-colors underline underline-offset-2">
              Register
            </Link>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors duration-150"
            />
          </div>

          <div>
            <label className="block text-sm text-[#9CA3AF] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#141414] border border-[#2A2A2A] focus:border-[#DC2626] text-white placeholder:text-[#6B7280] rounded-md px-4 py-2.5 text-sm outline-none transition-colors duration-150"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-[#DC2626]/50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-md transition-colors duration-150 text-sm shadow-lg shadow-red-900/20"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}