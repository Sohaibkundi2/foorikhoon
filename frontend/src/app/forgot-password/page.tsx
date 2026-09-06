'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react'
import api from '@/lib/api'
import { Texture } from '@/components/fk'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please provide your registered email address.')
      return
    }

    try {
      setLoading(true)
      await api.post('/api/auth/forgot-password', { email: trimmedEmail })
      setSentEmail(trimmedEmail)
      setSuccess(true)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to process password recovery request. Please try again later.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4 py-12 bg-ink">
      <Texture ember={true} grid={true} noise={true} />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface/90 shadow-2xl backdrop-blur-xl">
          {/* Card Masthead */}
          <div className="border-b border-line bg-raised/40 p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-blood">
                Credential Recovery
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                Encrypted Session
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blood/10 border border-blood/20 text-blood">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-bone sm:text-2xl">
                  Forgot Password
                </h1>
                <p className="text-xs text-mute leading-relaxed">
                  Initiate secure 15-minute credential recovery.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-6">
            {success ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-bone">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-emerald-300">
                        Recovery Request Received
                      </h3>
                      <p className="text-xs text-mute leading-relaxed">
                        If an account registered to{' '}
                        <strong className="text-bone font-mono font-medium">{sentEmail}</strong> exists
                        in our registry, a reset link has been dispatched to your inbox.
                      </p>
                      <div className="rounded-lg bg-surface/80 border border-line p-3 font-mono text-[11px] text-faint leading-normal">
                        ⏱️ Link valid for <span className="text-bone font-medium">15 minutes</span>. Check spam/junk folders if it doesn't appear shortly.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccess(false)
                      setEmail('')
                    }}
                    className="w-full rounded-xl border border-line bg-raised/60 py-2.5 px-4 text-xs font-semibold text-bone hover:border-faint hover:bg-raised transition-all cursor-pointer"
                  >
                    Send to a different email address
                  </button>

                  <Link
                    href="/login"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blood py-3 px-5 text-sm font-semibold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Return to Sign In</span>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-blood/40 bg-blood/10 p-3.5 text-xs text-bone">
                    <AlertCircle className="h-4 w-4 shrink-0 text-blood mt-0.5" />
                    <span className="leading-snug">{error}</span>
                  </div>
                )}

                <p className="text-xs text-mute leading-relaxed">
                  Enter your registered ForiKhoon account email. We will generate a one-time, cryptographically hashed recovery link valid for 15 minutes.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="forgot-email"
                      className="block font-mono text-[11px] uppercase tracking-wider text-mute"
                    >
                      Registered Email
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-faint">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="doctor@hospital.org or donor@domain.com"
                        required
                        className="w-full rounded-xl border border-line bg-raised/60 py-2.5 pl-10 pr-4 text-sm text-bone placeholder-faint transition-all focus:border-blood focus:bg-surface focus:outline-none focus:ring-1 focus:ring-blood/50"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blood py-3 px-5 text-sm font-semibold text-white shadow-[0_0_20px_-3px_rgba(220,38,38,0.5)] transition-all hover:bg-blood-dark active:scale-98 disabled:opacity-60 cursor-pointer"
                    >
                      <span>{loading ? 'Transmitting Request...' : 'Send Recovery Link'}</span>
                      {!loading && <ArrowRight className="h-4 w-4" />}
                    </button>
                  </div>
                </form>

                <div className="border-t border-line pt-5 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-mute hover:text-bone transition-colors group"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                    <span>Remember your password? Sign in</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footnote Security Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-wider text-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-blood" />
          <span>Zero Knowledge Account Enumeration Shield Active</span>
        </div>
      </div>
    </div>
  )
}
