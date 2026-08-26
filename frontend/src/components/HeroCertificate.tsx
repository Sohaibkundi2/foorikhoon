'use client'

import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { neutralBtn, primaryBtn } from '@/components/fk'

interface CertificateProps {
  donorName: string
  bloodGroup: string
  city?: string
  hospitalName: string
  donationDate: string | Date
  badge?: string | null
  totalDonations?: number
  commitmentScore?: number
  /** Signed Cloudinary URL of the hospital's blood-bag proof photo, if one exists. */
  photoUrl?: string | null
}

const bloodGroupLabels: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A−', B_POS: 'B+', B_NEG: 'B−',
  AB_POS: 'AB+', AB_NEG: 'AB−', O_POS: 'O+', O_NEG: 'O−'
}

/**
 * Monospace stack written out in full rather than referencing the app's
 * `--font-mono` variable. html2canvas reads computed styles off the cloned
 * node, and a webfont that hasn't finished loading at capture time rasterises
 * as a fallback with different metrics — which on a card this tight moves
 * figures visibly off their baseline. System monos are always resident.
 */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

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

/** Hairline used to divide the card's blocks. Kept as one object so they match. */
const RULE: React.CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.16)',
  flexShrink: 0
}

export default function HeroCertificate({
  donorName,
  bloodGroup,
  city,
  hospitalName,
  donationDate,
  badge,
  totalDonations,
  commitmentScore,
  photoUrl
}: CertificateProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  // Off by default. This card is built to be shared publicly, and the blood bag carries
  // the donor's name and blood group — so including it is an explicit opt-in, matching
  // how donor contact sharing works elsewhere in the app.
  const [includePhoto, setIncludePhoto] = useState(false)

  // html2canvas rasterises the DOM onto a canvas. A cross-origin <img> makes that canvas
  // "tainted", and reading it back via toBlob() then throws a SecurityError — which would
  // break the download button entirely, not just the photo. Fetching the image and
  // inlining it as a data URL sidesteps the whole same-origin problem, because a data URL
  // is treated as same-origin. If the fetch fails we simply never offer the photo.
  useEffect(() => {
    if (!photoUrl) {
      setPhotoDataUrl(null)
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch(photoUrl, { mode: 'cors' })
        if (!res.ok) throw new Error(`Photo fetch failed: ${res.status}`)
        const blob = await res.blob()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        if (!cancelled) setPhotoDataUrl(dataUrl)
      } catch (err) {
        console.error('Could not inline proof photo for certificate:', err)
        if (!cancelled) setPhotoDataUrl(null)
      }
    })()

    return () => { cancelled = true }
  }, [photoUrl])

  const showPhoto = includePhoto && !!photoDataUrl

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
    // gap kept tight: the card below is a fixed 500px (it must not shrink, or the
    // exported PNG changes), so this wrapper's spacing is the only vertical budget
    // available to keep the opt-in row and the action buttons on screen without scrolling.
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/*
        Set as a certificate rather than a social-media sticker. What changed and why:
        the five-stop gradient, the two blurred radial glows and the centred stack of
        rounded pills are the exact vocabulary of a generated graphic — and on a card
        that a donor is meant to be proud to show, that reads as a template. This is
        one flat ground with a single diagonal hairline weave, everything ranged left
        against a common margin, and the blood group set as a figure instead of being
        parked inside a glowing circle.

        Emoji are gone with them. The wordmark mark, the badge and the verification
        line are geometry and type, which also means html2canvas has nothing to
        rasterise but boxes and text.
      */}
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          width: 300,
          height: 500,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
          background: 'linear-gradient(178deg, #240404 0%, #4a0808 52%, #7d0f0f 100%)',
          border: '1px solid rgba(255,255,255,0.14)',
          color: '#ffffff',
          fontFamily: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}
      >
        {/* Diagonal weave, kept from the original: it is the one background effect
            here that behaves like paper rather than like lighting. */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 9px)'
        }} />

        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 22px 18px' }}>

          {/* top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#ffffff',
                display: 'block', flexShrink: 0
              }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2.4, textTransform: 'uppercase', lineHeight: 1 }}>ForiKhoon</span>
            </div>
            <div style={{
              fontSize: 8, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', lineHeight: 1,
              fontFamily: MONO,
              padding: '5px 8px', borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.28)',
              display: 'flex', alignItems: 'center'
            }}>
              Verified Donor
            </div>
          </div>

          <div style={{ ...RULE, marginTop: 16 }} />

          {/* headline block, ranged left */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase', lineHeight: 1,
              fontFamily: MONO, margin: '0 0 10px', color: '#ffc9c9'
            }}>
              {firstName} just
            </p>
            <p style={{
              fontSize: 42, fontWeight: 800, lineHeight: 0.96, margin: 0,
              letterSpacing: -1.6
            }}>
              Saved<br />a life
            </p>

            {/* blood group as a figure beside a hairline, not inside a badge */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 22 }}>
              <span style={{
                fontSize: 46, fontWeight: 700, lineHeight: 0.82, letterSpacing: -1.5,
                fontFamily: MONO, display: 'block'
              }}>
                {bloodGroupLabels[bloodGroup] ?? bloodGroup}
              </span>
              <span style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.22)', display: 'block', flexShrink: 0 }} />
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
                lineHeight: 1.5, fontFamily: MONO, opacity: 0.75, paddingBottom: 2
              }}>
                Blood<br />group
              </span>
            </div>

            {badge && (
              <div style={{
                display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', marginTop: 18,
                background: '#f0a92c', borderRadius: 4, padding: '6px 10px'
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, color: '#3b1a02', textTransform: 'uppercase',
                  letterSpacing: 1.2, lineHeight: 1, fontFamily: MONO
                }}>
                  {badge}
                </span>
              </div>
            )}

            {/* quote */}
            <p style={{
              fontSize: 11, fontWeight: 400, fontStyle: 'italic', lineHeight: 1.45,
              margin: '20px 0 0', opacity: 0.8, color: '#ffe4e4'
            }}>
              “{quote}”
            </p>
          </div>

          {/* verified strip — only rendered when the donor opts in, and only once the
              image has been inlined as a data URL so html2canvas can capture it */}
          {showPhoto && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12,
              padding: '8px 9px', borderRadius: 6,
              background: 'rgba(0,0,0,0.24)', border: '1px solid rgba(255,255,255,0.15)'
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoDataUrl!}
                alt=""
                style={{
                  width: 34, height: 34, borderRadius: 4, objectFit: 'cover',
                  border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0, display: 'block'
                }}
              />
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: 8.5, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
                  margin: 0, lineHeight: 1, color: '#86efac', fontFamily: MONO,
                  display: 'flex', alignItems: 'center', gap: 5
                }}>
                  {/* Was a ✓ glyph. A 5px square in the same green carries the same
                      meaning, and unlike a glyph it cannot land on a fallback font
                      inside the exported PNG. */}
                  <span style={{
                    width: 5, height: 5, borderRadius: 1, background: '#86efac',
                    display: 'block', flexShrink: 0
                  }} />
                  Collection Verified
                </p>
                <p style={{ fontSize: 8.5, margin: '5px 0 0', lineHeight: 1, opacity: 0.75 }}>
                  Photo confirmed by {hospitalName}
                </p>
              </div>
            </div>
          )}

          {/* stat row — two figures divided by a hairline instead of two boxes */}
          <div style={{ ...RULE }} />
          <div style={{ display: 'flex', alignItems: 'stretch', padding: '12px 0' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1, fontFamily: MONO }}>
                {typeof totalDonations === 'number' ? totalDonations : '—'}
              </p>
              <p style={{ fontSize: 8, letterSpacing: 1.3, textTransform: 'uppercase', opacity: 0.7, margin: '6px 0 0', fontWeight: 700, lineHeight: 1, fontFamily: MONO }}>Donations</p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.16)', flexShrink: 0 }} />
            <div style={{ flex: 1, paddingLeft: 16 }}>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1, fontFamily: MONO }}>
                {typeof commitmentScore === 'number' ? commitmentScore : '—'}
              </p>
              <p style={{ fontSize: 8, letterSpacing: 1.3, textTransform: 'uppercase', opacity: 0.7, margin: '6px 0 0', fontWeight: 700, lineHeight: 1, fontFamily: MONO }}>Commitment</p>
            </div>
          </div>
          <div style={{ ...RULE }} />

          {/* footer */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, paddingTop: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 600, margin: 0, opacity: 0.92, lineHeight: 1.3 }}>
                {hospitalName}{city ? ` · ${city}` : ''}
              </p>
              <p style={{ fontSize: 8.5, opacity: 0.6, margin: '5px 0 0', lineHeight: 1, fontFamily: MONO }}>{formattedDate}</p>
            </div>
            <p style={{
              fontSize: 8.5, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', lineHeight: 1,
              margin: 0, opacity: 0.8, fontFamily: MONO, whiteSpace: 'nowrap'
            }}>
              forikhoon.com
            </p>
          </div>
        </div>
      </div>

      {/* ACTIONS — Tailwind classes fine here, this part is never captured */}
      {photoDataUrl && (
        <label className="flex max-w-[300px] cursor-pointer select-none items-start gap-2.5">
          <input
            type="checkbox"
            checked={includePhoto}
            onChange={(e) => setIncludePhoto(e.target.checked)}
            className="mt-0.5 accent-blood"
          />
          <span className="text-xs leading-relaxed text-mute">
            Include the blood-bag photo on this card
            <span className="mt-1 block text-faint">
              The bag shows your name and blood group. Leave this off if you plan to share
              the card publicly.
            </span>
          </span>
        </label>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button onClick={handleWhatsAppShare} className={primaryBtn}>
          Share on WhatsApp
        </button>

        <button onClick={handleCopyImage} disabled={copying} className={neutralBtn}>
          {copying ? 'Copying…' : copied ? 'Copied!' : 'Copy Image'}
        </button>

        <button onClick={handleDownload} disabled={downloading} className={neutralBtn}>
          {downloading ? 'Saving…' : 'Download'}
        </button>
      </div>
    </div>
  )
}
