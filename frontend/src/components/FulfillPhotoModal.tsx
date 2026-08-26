'use client'

import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { CircleAlert, ImagePlus } from 'lucide-react'
import { affirmBtn, neutralBtn } from '@/components/fk'

interface Props {
  requestId: string
  bloodGroupLabel: string
  donorName?: string | null
  onClose: () => void
  onSuccess: () => void
}

// Mirrors the server-side rules in upload.middleware.ts. Duplicated deliberately:
// checking here gives instant feedback and avoids pushing 5MB up the wire just to be
// rejected, but the server check is the one that actually enforces anything.
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export default function FulfillPhotoModal({
  requestId,
  bloodGroupLabel,
  donorName,
  onClose,
  onSuccess,
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Object URLs hold the file in memory until explicitly revoked, so tie each one's
  // lifetime to the preview that uses it rather than leaking one per file selection.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Escape to dismiss, but not mid-upload — closing then would leave the request in an
  // unknown state from the user's point of view while the upload continues in flight.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [uploading, onClose])

  const validateAndSet = (candidate: File | undefined) => {
    setError(null)
    if (!candidate) return

    if (!ALLOWED_TYPES.includes(candidate.type)) {
      setError('Unsupported file type. Choose a JPG, PNG or WebP image.')
      return
    }
    if (candidate.size > MAX_FILE_SIZE) {
      const mb = (candidate.size / 1024 / 1024).toFixed(1)
      setError(`That image is ${mb}MB. Maximum size is 5MB.`)
      return
    }
    setFile(candidate)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    validateAndSet(e.dataTransfer.files?.[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      const formData = new FormData()
      // Field name must be "photo" — it's what multer's .single('photo') listens for.
      formData.append('photo', file)

      // Note: no explicit Content-Type header. The browser has to generate it so it can
      // include the multipart boundary token; setting it by hand produces a header with
      // no boundary and the server fails to parse the body.
      await api.put(`/api/hospital/requests/${requestId}/fulfill`, formData, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })

      onSuccess()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Upload failed. Check your connection and try again.'
      setError(message)
      setUploading(false)
    }
  }

  return (
    // Same scroll-safe structure as the certificate modal: the overlay scrolls and the
    // inner wrapper is `min-h-full`, so if the panel ever outgrows a short window the
    // "Upload and Confirm Donation" button stays reachable instead of being centred
    // half-way off the top of the screen. Clicks on the wrapper still bubble to the
    // overlay, so click-outside-to-close keeps working.
    //
    // The overlay is a flat black wash rather than a blurred one: the same scrim as the
    // proof-photo lightbox on the requests page, and a blur behind a panel that is
    // itself asking for a photograph is working against the thing being looked at.
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85"
      onClick={() => { if (!uploading) onClose() }}
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fulfill-title"
        className="w-full max-w-md rounded-lg border border-line bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line-soft px-6 py-3.5">
          <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            Proof of donation
          </p>
          <span aria-hidden className="h-px flex-1 bg-line-soft" />
        </div>

        <div className="px-6 pb-6 pt-5">
          <div className="mb-5">
            <h2 id="fulfill-title" className="text-xl font-semibold tracking-[-0.02em] text-bone">
              Confirm Donation
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              Upload a photo of the blood bag for the{' '}
              <span className="font-mono font-medium text-blood">{bloodGroupLabel}</span> request
              {donorName ? <> donated by <span className="text-bone">{donorName}</span></> : null}.
              This is stored as proof of donation and shown to the donor.
            </p>
          </div>

        {!previewUrl ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`w-full rounded-md border border-dashed px-6 py-11 text-center transition-colors duration-150 ${
              dragActive
                ? 'border-blood bg-blood/[0.06]'
                : 'border-line bg-raised hover:border-mute/40'
            }`}
          >
            <ImagePlus
              className={`mx-auto mb-3 h-6 w-6 ${dragActive ? 'text-blood' : 'text-faint'}`}
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="text-sm font-medium text-bone">Drop the photo here</p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              or click to browse · JPG, PNG, WebP · max 5MB
            </p>
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-md border border-line bg-raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Blood bag preview" className="max-h-64 w-full object-contain" />
            {!uploading && (
              <button
                type="button"
                onClick={() => { setFile(null); setError(null) }}
                className="absolute right-2 top-2 rounded-md border border-white/15 bg-black/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-bone transition-colors hover:bg-black"
              >
                Change
              </button>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => validateAndSet(e.target.files?.[0])}
        />

        {error && (
          <p className="mt-3.5 flex items-start gap-2 rounded-md border border-blood/25 bg-blood/10 px-3.5 py-2.5 text-xs leading-relaxed text-blood-lite">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span>{error}</span>
          </p>
        )}

        {uploading && (
          <div className="mt-4">
            <div className="h-1 w-full overflow-hidden rounded-full bg-raised">
              <div
                className="h-full bg-blood transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-faint">
              {progress < 100 ? `Uploading… ${progress}%` : 'Saving donation…'}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-2.5 border-t border-line-soft pt-5">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`flex-1 ${affirmBtn}`}
          >
            {uploading ? 'Please wait…' : 'Upload and Confirm Donation'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className={neutralBtn}
          >
            Cancel
          </button>
        </div>
        </div>
        </div>
      </div>
    </div>
  )
}
