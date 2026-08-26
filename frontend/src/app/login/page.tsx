'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { Field, Texture, inputClass, noticeClass, primaryBtn } from '@/components/fk'

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
    <div className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-4 py-16">
      <Texture ember />

      {/* Offset ghost frame instead of a drop shadow: it gives the card weight
          without the blurred halo that reads as a template. */}
      <div className="relative w-full max-w-sm">
        <div
          aria-hidden
          className="absolute -bottom-3 -right-3 left-3 top-3 rounded-xl border border-line-soft"
        />

        <div className="relative rounded-xl border border-line bg-surface px-7 py-8">
          <div className="relative mb-8 border-b border-line pb-6">
            <span aria-hidden className="absolute -bottom-px left-0 h-px w-10 bg-blood" />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              Welcome back
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-bone">Sign in</h1>
            <p className="mt-2.5 text-sm text-mute">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="text-bone underline decoration-line underline-offset-4 transition-colors hover:decoration-blood"
              >
                Register
              </Link>
            </p>
          </div>

          {error && (
            <div className={`mb-5 ${noticeClass}`}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Email address" htmlFor="login-email">
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </Field>

            <Field label="Password" htmlFor="login-password">
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </Field>

            <div className="pt-1">
              <button type="submit" disabled={loading} className={`w-full ${primaryBtn}`}>
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
