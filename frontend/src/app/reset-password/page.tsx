'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Fingerprint,
  RefreshCw,
} from 'lucide-react'
import api from '@/lib/api'
import { Texture } from '@/components/fk'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Password strength checks
  const hasMinLength = password.length >= 8
  const hasNumber = /[0-9]/.test(password)
  const hasUpperOrSpecial = /[A-Z!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword

  const strengthScore = [hasMinLength, hasNumber, hasUpperOrSpecial].filter(Boolean).length
  const isFormValid = hasMinLength && passwordsMatch && acknowledged

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Password reset token is missing from the URL.')
      return
    }

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!passwordsMatch) {
      setError('Password confirmation does not match.')
      return
    }

    if (!acknowledged) {
      setError('Please acknowledge the security session revocation statement.')
      return
    }

    try {
      setLoading(true)
      await api.post('/api/auth/reset-password', {
        token,
        newPassword: password,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to reset password. The link may have expired or already been used.'
      )
    } finally {
      setLoading(false)
    }
  }

  // --- CASE 1: Missing Token Gate ---
  if (!token) {
    return (
      <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4 py-12 bg-ink">
        <Texture ember={true} grid={true} noise={true} />

        <div className="relative w-full max-w-md">
          <div className="overflow-hidden rounded-3xl border border-amber-500/40 bg-surface/95 shadow-[0_0_50px_-10px_rgba(217,119,6,0.2)] backdrop-blur-xl">
            <div className="border-b border-amber-500/20 bg-amber-950/30 p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Security Checkpoint
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  Access Blocked
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-bone">
                    Missing Security Token
                  </h1>
                  <p className="text-xs text-mute mt-0.5">
                    Cryptographic token missing from verification link.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-mute leading-relaxed">
                <p>
                  For account safety and privacy compliance, sensitive password changes cannot be accessed directly without an authentic, one-time verification token.
                </p>
                <p className="mt-2 text-[11px] text-faint font-mono">
                  If you received an email, ensure you opened the entire URL or request a new 15-minute token below.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Link
                  href="/forgot-password"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 px-5 text-sm font-semibold text-black shadow-[0_0_20px_-3px_rgba(245,158,11,0.5)] transition-all hover:bg-amber-400 cursor-pointer"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Request New Reset Link</span>
                </Link>

                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-line bg-raised/60 py-2.5 px-4 text-xs font-semibold text-bone hover:border-faint hover:bg-raised transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- CASE 2: Success Confirmation ---
  if (success) {
    return (
      <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4 py-12 bg-ink">
        <Texture ember={false} grid={true} noise={true} />

        <div className="relative w-full max-w-md">
          <div className="overflow-hidden rounded-3xl border border-emerald-500/40 bg-surface/95 shadow-[0_0_50px_-10px_rgba(16,185,129,0.25)] backdrop-blur-xl">
            <div className="border-b border-emerald-500/20 bg-emerald-950/30 p-6 sm:p-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-2xl font-extrabold text-bone">
                Credentials Updated
              </h1>
              <p className="mt-1.5 text-xs text-mute">
                Your password has been securely overwritten.
              </p>
            </div>

            <div className="p-6 sm:p-7 space-y-6">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs text-mute space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px] font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>CRYPTOGRAPHIC COMMIT COMPLETED</span>
                </div>
                <p className="text-[11px] text-faint leading-relaxed">
                  Your new password is now active. All previous sessions have been terminated. You can now authenticate with your updated credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-5 text-sm font-semibold text-white shadow-[0_0_25px_-3px_rgba(16,185,129,0.5)] transition-all hover:bg-emerald-500 cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- CASE 3: Sensitive Reset Password Form ---
  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4 py-12 bg-ink">
      <Texture ember={true} grid={true} noise={true} />

      <div className="relative w-full max-w-lg">
        {/* Glowing border highlight to emphasize security sensitivity */}
        <div className="overflow-hidden rounded-3xl border border-amber-500/30 bg-surface/95 shadow-[0_0_40px_-10px_rgba(217,119,6,0.15)] backdrop-blur-xl">
          
          {/* Masthead with distinct amber/gold security telemetry */}
          <div className="border-b border-line bg-gradient-to-r from-amber-950/30 via-raised/50 to-surface/80 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Sensitive Security Enclave
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                One-Time Token Override
              </span>
            </div>

            <div className="mt-3 flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-inner">
                <Fingerprint className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-bone sm:text-2xl">
                  Reset Sensitive Password
                </h1>
                <p className="mt-1 text-xs text-mute leading-relaxed">
                  Override account authentication credentials with full session termination.
                </p>
              </div>
            </div>

            {/* Token verification badge */}
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-surface/80 border border-line-soft px-3 py-2 font-mono text-[11px] text-faint">
              <KeyRound className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                Token verification active:{' '}
                <span className="text-bone font-medium">••••{token.slice(-8)}</span>
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            {/* Sensitive Security Notice */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/15 p-4 text-xs text-mute space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
                <span>Security Notice: Session Invalidation</span>
              </div>
              <p className="text-[11px] text-faint leading-relaxed">
                Resetting your password will immediately revoke all active mobile and web login sessions to safeguard patient records and blood dispatch requests.
              </p>
            </div>

            {error && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-xl border border-blood/40 bg-blood/10 p-3.5 text-xs text-bone">
                  <AlertCircle className="h-4 w-4 shrink-0 text-blood mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>

                {(error.includes('expired') || error.includes('already been used') || error.includes('Invalid')) && (
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 hover:underline font-medium transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Request a fresh reset link</span>
                  </Link>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block font-mono text-[11px] uppercase tracking-wider text-mute"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-faint">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full rounded-xl border border-line bg-raised/60 py-2.5 pl-10 pr-10 text-sm text-bone placeholder-faint transition-all focus:border-amber-400 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-faint hover:text-bone transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-faint">Strength Rating:</span>
                      <span
                        className={
                          strengthScore === 3
                            ? 'text-emerald-400 font-semibold'
                            : strengthScore === 2
                            ? 'text-amber-400 font-semibold'
                            : 'text-blood font-semibold'
                        }
                      >
                        {strengthScore === 3
                          ? 'Resilient / High Security'
                          : strengthScore === 2
                          ? 'Acceptable'
                          : 'Vulnerable (Too Simple)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-colors ${
                          strengthScore >= 1
                            ? strengthScore === 1
                              ? 'bg-blood'
                              : 'bg-amber-400'
                            : 'bg-line'
                        }`}
                      />
                      <div
                        className={`h-1.5 rounded-full transition-colors ${
                          strengthScore >= 2
                            ? strengthScore === 3
                              ? 'bg-emerald-400'
                              : 'bg-amber-400'
                            : 'bg-line'
                        }`}
                      />
                      <div
                        className={`h-1.5 rounded-full transition-colors ${
                          strengthScore === 3 ? 'bg-emerald-400' : 'bg-line'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-faint pt-1">
                      <span className={hasMinLength ? 'text-emerald-400' : 'text-faint'}>
                        {hasMinLength ? '✓' : '•'} Minimum 8 characters
                      </span>
                      <span className={hasNumber ? 'text-emerald-400' : 'text-faint'}>
                        {hasNumber ? '✓' : '•'} Contains a number
                      </span>
                      <span className={hasUpperOrSpecial ? 'text-emerald-400' : 'text-faint'}>
                        {hasUpperOrSpecial ? '✓' : '•'} Special or uppercase
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="confirm-password"
                    className="block font-mono text-[11px] uppercase tracking-wider text-mute"
                  >
                    Confirm New Password
                  </label>
                  {confirmPassword.length > 0 && (
                    <span
                      className={`text-[10px] font-mono ${
                        passwordsMatch ? 'text-emerald-400' : 'text-blood'
                      }`}
                    >
                      {passwordsMatch ? '✓ Match verified' : '✕ Does not match'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-faint">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    className="w-full rounded-xl border border-line bg-raised/60 py-2.5 pl-10 pr-10 text-sm text-bone placeholder-faint transition-all focus:border-amber-400 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-faint hover:text-bone transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Security Acknowledgment Checkbox */}
              <div className="rounded-xl border border-line bg-raised/40 p-3.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line bg-surface text-amber-500 focus:ring-amber-400/30"
                  />
                  <span className="text-xs text-mute leading-snug">
                    I confirm that I am the authorized owner of this account and understand that resetting credentials revokes all active sessions.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 px-5 text-sm font-bold text-black shadow-[0_0_25px_-3px_rgba(245,158,11,0.4)] transition-all hover:bg-amber-400 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>{loading ? 'Committing New Credentials...' : 'Overwrite & Secure Password'}</span>
                </button>
              </div>
            </form>

            <div className="border-t border-line pt-4 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-mute hover:text-bone transition-colors group"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>Cancel and return to Sign In</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Footnote Security Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-wider text-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          <span>FIPS / OWASP Salted Hash Credential Storage Protocol</span>
        </div>
      </div>
    </div>
  )
}

function ResetPasswordFallback() {
  return (
    <div className="relative min-h-[90vh] flex items-center justify-center bg-ink text-mute text-xs font-mono">
      Initializing secure cryptographic checkpoint...
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
