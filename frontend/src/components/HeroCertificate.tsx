'use client'

import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'

interface CertificateProps {
  donorName: string
  bloodGroup: string
  city?: string
  hospitalName: string
  donationDate: string | Date
  badge?: string | null
  totalDonations?: number
  commitmentScore?: number
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

const badgeIcons: Record<string, string> = {
  'First Blood': '🩸',
  'Lifesaver': '🦸',
  'Hero': '👑',
  'Reliable': '⭐',
  'Dedicated': '💎',
}

export default function HeroCertificate({
  donorName,
  bloodGroup,
  city,
  hospitalName,
  donationDate,
  badge,
  totalDonations,
  commitmentScore
}: CertificateProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)

  const formattedDate = new Date(donationDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  const firstName = donorName.split(' ')[0]

  const fileNameFor = () =>
    `forikhoon-hero-${donorName.replace(/\s+/g, '-').toLowerCase()}.png`

  const generateBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null
    // NOTE: html2canvas can't parse modern CSS color functions (oklch/oklab)
    // that Tailwind v4's palette compiles to — everything inside this ref
    // uses plain inline hex/rgba/gradient styles instead of Tailwind color classes.
    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      backgroundColor: null,
      useCORS: true
    })
    return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'))
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await generateBlob()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = fileNameFor()
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Certificate download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleNativeShare = async () => {
    setSharing(true)
    try {
      const blob = await generateBlob()
      if (!blob) return
      const file = new File([blob], fileNameFor(), { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'I just donated blood with ForiKhoon 🩸',
          text: `I just donated blood through ForiKhoon and helped save a life. Join the network: https://forikhoon.com`
        })
      } else {
        await handleDownload()
        window.open(
          `https://wa.me/?text=${encodeURIComponent(
            `I just donated blood through ForiKhoon and helped save a life 🩸 Join the network: https://forikhoon.com`
          )}`,
          '_blank'
        )
      }
    } catch (err) {
      // user cancelling the native share sheet also lands here (AbortError) — not a real failure
      console.error('Share failed:', err)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* THE CARD — fixed 9:16 story ratio, no overflow, no scroll. Plain inline
          styles only (no Tailwind classes) so html2canvas can capture it. */}
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          width: 320,
          height: 568, // exact 9:16
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(220,38,38,0.35), 0 10px 30px rgba(0,0,0,0.5)',
          background: 'linear-gradient(160deg, #1a0303 0%, #3d0808 28%, #7f0d0d 55%, #dc2626 82%, #ff4d4d 100%)',
          color: '#ffffff',
          fontFamily: 'inherit',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* glow blobs */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 220, height: 220,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,80,80,0.55) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80, width: 260, height: 260,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,0,0,0.6) 0%, transparent 70%)',
          filter: 'blur(20px)'
        }} />
        {/* diagonal streaks for texture */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 40px)'
        }} />

        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', padding: '22px 22px 18px' }}>

          {/* top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15 }}>🩸</span>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>ForiKhoon</span>
            </div>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.25)'
            }}>
              Verified Donor
            </div>
          </div>

          {/* headline block */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginTop: -10 }}>
            <p style={{
              fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
              margin: '0 0 2px', color: '#ffd9d9', opacity: 0.9
            }}>
              {firstName} just
            </p>
            <p style={{
              fontSize: 44, fontWeight: 900, lineHeight: 0.95, margin: '0 0 6px',
              textShadow: '0 4px 24px rgba(0,0,0,0.4)', letterSpacing: -1
            }}>
              SAVED A<br />LIFE 🦸
            </p>

            {/* giant blood group */}
            <div style={{
              marginTop: 14,
              width: 92, height: 92, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              border: '3px solid rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 6px rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.35)'
            }}>
              <span style={{ fontSize: 34, fontWeight: 900 }}>
                {bloodGroupLabels[bloodGroup] ?? bloodGroup}
              </span>
            </div>

            {badge && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
                background: 'linear-gradient(90deg, #facc15, #f59e0b)',
                borderRadius: 999, padding: '6px 14px',
                boxShadow: '0 4px 16px rgba(245,158,11,0.5)'
              }}>
                <span style={{ fontSize: 13 }}>{badgeIcons[badge] ?? '🏅'}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#451a03', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {badge}
                </span>
              </div>
            )}
          </div>

          {/* stat row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{
              flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 14,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)'
            }}>
              <p style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{typeof totalDonations === 'number' ? totalDonations : '—'}</p>
              <p style={{ fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8, margin: '2px 0 0', fontWeight: 700 }}>Donations</p>
            </div>
            <div style={{
              flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 14,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)'
            }}>
              <p style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>{typeof commitmentScore === 'number' ? commitmentScore : '—'}</p>
              <p style={{ fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8, margin: '2px 0 0', fontWeight: 700 }}>Commitment</p>
            </div>
          </div>

          {/* footer */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 10.5, fontWeight: 600, margin: 0, opacity: 0.9 }}>
              📍 {hospitalName}{city ? ` · ${city}` : ''}
            </p>
            <p style={{ fontSize: 9, opacity: 0.6, margin: '3px 0 0' }}>{formattedDate}</p>
            <p style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase',
              margin: '10px 0 0', opacity: 0.85
            }}>
              forikhoon.com
            </p>
          </div>
        </div>
      </div>

      {/* ACTIONS — Tailwind classes fine here, this part is never captured */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleNativeShare}
          disabled={sharing}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold shadow-lg hover:shadow-red-900/40 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-50"
        >
          {sharing ? 'Preparing…' : 'Share'}
        </button>

        <button
          onClick={() =>
            window.open(
              `https://wa.me/?text=${encodeURIComponent(
                `I just donated blood through ForiKhoon and helped save a life 🩸 Join the network: https://forikhoon.com`
              )}`,
              '_blank'
            )
          }
          className="px-4 py-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-medium transition-all duration-150"
        >
          WhatsApp
        </button>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] text-[#9CA3AF] hover:text-white font-medium transition-all duration-150 disabled:opacity-50"
        >
          {downloading ? 'Saving…' : 'Download'}
        </button>
      </div>
    </div>
  )
}