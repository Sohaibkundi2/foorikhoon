'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight, ShieldCheck, Droplet, Building2, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Texture } from '@/components/fk'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      else router.push('/')

    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4 py-12 bg-ink">
      <Texture ember={true} grid={true} noise={true} />

      <div className="relative w-full max-w-md">
        {/* Decorative ambient backdrop */}
        <div className="overflow-hidden rounded-3xl border border-line bg-surface/90 shadow-2xl backdrop-blur-xl">
          {/* Card Masthead */}
          <div className="border-b border-line bg-raised/40 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-blood">
                Secure Access
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                Encrypted Session
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-bone sm:text-3xl">
              Sign In to ForiKhoon
            </h1>
            <p className="mt-1.5 text-xs text-mute leading-relaxed sm:text-sm">
              Access your on-call donor dashboard or hospital emergency dispatch console.
            </p>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-blood/40 bg-blood/10 p-3.5 text-xs text-bone">
                <AlertCircle className="h-4 w-4 shrink-0 text-blood mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block font-mono text-[11px] uppercase tracking-wider text-mute"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-faint">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    required
                    className="w-full rounded-xl border border-line bg-raised/60 py-2.5 pl-10 pr-4 text-sm text-bone placeholder-faint transition-all focus:border-blood focus:bg-surface focus:outline-none focus:ring-1 focus:ring-blood/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block font-mono text-[11px] uppercase tracking-wider text-mute"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-mute hover:text-bone hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-faint">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-line bg-raised/60 py-2.5 pl-10 pr-10 text-sm text-bone placeholder-faint transition-all focus:border-blood focus:bg-surface focus:outline-none focus:ring-1 focus:ring-blood/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-faint hover:text-bone transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blood py-3 px-5 text-sm font-semibold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-98 disabled:opacity-60 cursor-pointer"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>

            {/* Registration CTA */}
            <div className="border-t border-line pt-5 text-center">
              <p className="text-xs text-mute">
                Don't have an account yet?{' '}
                <Link
                  href="/register"
                  className="font-semibold text-bone hover:text-white underline decoration-line hover:decoration-blood transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footnote Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-wider text-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-blood" />
          <span>Pakistan 24/7 Transfusion Security Protocol</span>
        </div>
      </div>
    </div>
  )
}
