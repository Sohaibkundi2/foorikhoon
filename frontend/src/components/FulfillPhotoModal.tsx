'use client'

import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'

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
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={() => { if (!uploading) onClose() }}
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-[#141414] border border-[#222] rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <h2 className="text-white text-lg font-bold">Confirm Donation</h2>
          <p className="text-[#9CA3AF] text-xs mt-1.5 leading-relaxed">
            Upload a photo of the blood bag for the{' '}
            <span className="text-[#DC2626] font-semibold">{bloodGroupLabel}</span> request
            {donorName ? <> donated by <span className="text-white">{donorName}</span></> : null}.
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
            className={`w-full rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 ${
              dragActive
                ? 'border-[#DC2626] bg-[#DC2626]/5'
                : 'border-[#2A2A2A] hover:border-[#3A3A3A] bg-[#0F0F0F]'
            }`}
          >
            <p className="text-3xl mb-2">🩸</p>
            <p className="text-white text-sm font-medium">Drop the photo here</p>
            <p className="text-[#6B7280] text-xs mt-1">or click to browse · JPG, PNG, WebP · max 5MB</p>
          </button>
        ) : (
          <div className="relative rounded-xl overflow-hidden border border-[#2A2A2A] bg-[#0F0F0F]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Blood bag preview" className="w-full max-h-64 object-contain" />
            {!uploading && (
              <button
                type="button"
                onClick={() => { setFile(null); setError(null) }}
                className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white text-xs px-2.5 py-1 rounded-md border border-white/15"
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
          <p className="text-red-400 text-xs mt-3 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {uploading && (
          <div className="mt-4">
            <div className="h-1 w-full bg-[#222] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#DC2626] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[#6B7280] text-xs mt-2">
              {progress < 100 ? `Uploading… ${progress}%` : 'Saving donation…'}
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 bg-green-400/10 hover:bg-green-400/20 text-green-400 border border-green-400/20 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? 'Please wait…' : 'Upload and Confirm Donation'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] text-[#9CA3AF] text-sm px-4 py-2.5 rounded-lg transition-colors duration-150 disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
