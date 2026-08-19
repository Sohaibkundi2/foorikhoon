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

const QUOTES = [
  'One donation. One life. No small acts.',
  'You didn\'t just donate blood — you gave someone tomorrow.',
  'Heroes don\'t always wear capes. Some just roll up a sleeve.',
  'Small act. Big impact.',
  'Somewhere, a family is grateful they\'ll never meet you.',
]

function pickQuote(seed: string) {
  const index = seed.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % QUOTES.length
  return QUOTES[index]
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
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const formattedDate = new Date(donationDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  const firstName = donorName.split(' ')[0]
  const quote = pickQuote(donorName + hospitalName)

  const fileNameFor = () =>
    `forikhoon-hero-${donorName.replace(/\s+/g, '-').toLowerCase()}.png`

  const generateBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null
    // NOTE: html2canvas can't parse modern CSS color functions (oklch/oklab)
    // that Tailwind v4's palette compiles to — everything inside this ref
    // uses plain inline hex/rgba/gradient styles instead of Tailwind color classes.
    // Also: every text node below has an explicit lineHeight. Without it,
    // html2canvas uses the browser's computed "normal" line-height when
    // rasterizing, which is taller than what's visually rendered live —
    // inside a flex-centered pill/box this pushes the text down and off-center
    // in the exported image even though it looks correctly centered on screen.
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

  const handleCopyImage = async () => {
    setCopying(true)
    try {
      const blob = await generateBlob()
      if (!blob) return

      if (navigator.clipboard && 'write' in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        await handleDownload()
      }
    } catch (err) {
      console.error('Copy image failed:', err)
      await handleDownload()
    } finally {
      setCopying(false)
    }
  }

  const handleWhatsAppShare = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `I just donated blood through ForiKhoon and helped save a life. Join the network: https://forikhoon.com`
      )}`,
      '_blank'
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          width: 300,
          height: 500,
          borderRadius: 26,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(220,38,38,0.35), 0 8px 24px rgba(0,0,0,0.5)',
          background: 'linear-gradient(160deg, #1a0303 0%, #3d0808 28%, #7f0d0d 55%, #dc2626 82%, #ff4d4d 100%)',
          color: '#ffffff',
          fontFamily: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}
      >
        <div style={{
          position: 'absolute', top: -50, right: -50, width: 190, height: 190,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,80,80,0.55) 0%, transparent 70%)',
          filter: 'blur(10px)'
        }} />
        <div style={{
          position: 'absolute', bottom: -70, left: -70, width: 220, height: 220,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,0,0,0.6) 0%, transparent 70%)',
          filter: 'blur(20px)'
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 40px)'
        }} />

        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 20px 16px' }}>

          {/* top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, lineHeight: 1 }}>🩸</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', lineHeight: 1 }}>ForiKhoon</span>
            </div>
            <div style={{
              fontSize: 8.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', lineHeight: 1,
              background: 'rgba(255,255,255,0.15)', padding: '6px 9px 5px', borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center'
            }}>
              Verified Donor
            </div>
          </div>

          {/* headline block */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <p style={{
              fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1,
              margin: '0 0 4px', color: '#ffd9d9', opacity: 0.9
            }}>
              {firstName} just
            </p>
            <p style={{
              fontSize: 38, fontWeight: 900, lineHeight: 1.05, margin: '0 0 12px',
              letterSpacing: -1
            }}>
              SAVED A<br />LIFE
            </p>

            {/* blood group */}
            <div style={{
              width: 78, height: 78, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              border: '3px solid rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 6px rgba(255,255,255,0.06)'
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                {bloodGroupLabels[bloodGroup] ?? bloodGroup}
              </span>
            </div>

            {badge && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
                background: 'linear-gradient(90deg, #facc15, #f59e0b)',
                borderRadius: 999, padding: '7px 13px 6px'
              }}>
                <span style={{ fontSize: 12, lineHeight: 1 }}>{badgeIcons[badge] ?? '🏅'}</span>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: '#451a03', textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1 }}>
                  {badge}
                </span>
              </div>
            )}

            {/* quote */}
            <p style={{
              fontSize: 11, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.4,
              margin: '14px 6px 0', opacity: 0.85, color: '#ffe4e4'
            }}>
              “{quote}”
            </p>
          </div>

          {/* stat row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{
              flex: 1, textAlign: 'center', padding: '10px 4px 9px', borderRadius: 13,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)'
            }}>
              <p style={{ fontSize: 18, fontWeight: 900, margin: 0, lineHeight: 1 }}>{typeof totalDonations === 'number' ? totalDonations : '—'}</p>
              <p style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8, margin: '4px 0 0', fontWeight: 700, lineHeight: 1 }}>Donations</p>
            </div>
            <div style={{
              flex: 1, textAlign: 'center', padding: '10px 4px 9px', borderRadius: 13,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)'
            }}>
              <p style={{ fontSize: 18, fontWeight: 900, margin: 0, lineHeight: 1 }}>{typeof commitmentScore === 'number' ? commitmentScore : '—'}</p>
              <p style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8, margin: '4px 0 0', fontWeight: 700, lineHeight: 1 }}>Commitment</p>
            </div>
          </div>

          {/* footer */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 600, margin: 0, opacity: 0.9, lineHeight: 1.3 }}>
              {hospitalName}{city ? ` · ${city}` : ''}
            </p>
            <p style={{ fontSize: 8.5, opacity: 0.6, margin: '4px 0 0', lineHeight: 1 }}>{formattedDate}</p>
            <p style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', lineHeight: 1,
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
          onClick={handleWhatsAppShare}
          className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold shadow-lg transition-all duration-150"
        >
          Share on WhatsApp
        </button>

        <button
          onClick={handleCopyImage}
          disabled={copying}
          className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] text-[#9CA3AF] hover:text-white font-medium transition-all duration-150 disabled:opacity-50"
        >
          {copying ? 'Copying…' : copied ? 'Copied!' : 'Copy Image'}
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