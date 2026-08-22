import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import { randomUUID } from 'crypto'

/**
 * Cloudinary wrapper for donation proof photos.
 *
 * Access model
 * ------------
 * These images show a blood bag with the donor's name and blood group printed on it,
 * which is health data about an identifiable person. Cloudinary's default upload type
 * ("upload") produces a permanently public delivery URL — `secure_url` only means the
 * URL is HTTPS, it does NOT mean the asset is access-controlled. Anyone who ever
 * obtains that link keeps access forever, completely bypassing our JWT auth.
 *
 * So we upload with `type: 'authenticated'`, which makes the asset undeliverable
 * unless the URL carries a signature generated with our API secret. We persist only
 * the `public_id`; the signed URL is minted per-request by `getSignedPhotoUrl` after
 * the caller's ownership has been verified.
 *
 * Honest limitation: on Cloudinary's standard plans a signature for an authenticated
 * asset does not carry an expiry — it is unguessable and server-gated, but not
 * time-limited. True TTL needs Cloudinary's token-based auth add-on, or proxying the
 * bytes through our own API. See README "Known Limitations".
 */

let configured = false

function ensureConfigured() {
  if (configured) return

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  // Fail loudly but lazily: a missing Cloudinary config shouldn't stop the whole API
  // from booting, it should only break the one feature that needs it.
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ' +
      'and CLOUDINARY_API_SECRET in backend/.env'
    )
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })

  configured = true
}

const DONATION_FOLDER = 'foorikhoon/donations'

/**
 * Uploads an in-memory image buffer and returns its Cloudinary public_id.
 *
 * Note on `upload_stream`: cloudinary.uploader.upload() expects a file path, remote
 * URL or base64 data URI — it cannot take a Buffer. Multer's memoryStorage gives us a
 * Buffer, so we open an upload stream and push the buffer through it. Converting the
 * buffer to a base64 data URI would also work but inflates it by ~33% in memory.
 */
export async function uploadDonationPhoto(
  file: { buffer: Buffer; mimetype: string }
): Promise<string> {
  ensureConfigured()

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: DONATION_FOLDER,
        // Random id so the path can't be enumerated from a donor/match id.
        public_id: randomUUID(),
        resource_type: 'image',
        type: 'authenticated',
        // Re-encode server-side. This strips EXIF (which can carry GPS coordinates
        // from the phone that took the photo) and caps the stored resolution, since
        // a legible blood-bag label doesn't need 12 megapixels.
        transformation: [
          { width: 1600, height: 1600, crop: 'limit' },
          { quality: 'auto:good' },
        ],
        // Belt-and-braces: reject anything that isn't actually a decodable image,
        // regardless of the Content-Type the client claimed.
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
      (error, result) => {
        if (error) return reject(error)
        if (!result?.public_id) return reject(new Error('Cloudinary returned no public_id'))
        resolve(result.public_id)
      }
    )

    Readable.from(file.buffer).pipe(uploadStream)
  })
}

/**
 * Mints a signed delivery URL for an authenticated asset.
 *
 * Call this ONLY after confirming the requester is the donor on the match or the
 * hospital that owns the request — this function does no authorisation itself.
 */
export function getSignedPhotoUrl(publicId: string): string {
  ensureConfigured()

  return cloudinary.url(publicId, {
    type: 'authenticated',
    sign_url: true,
    secure: true,
  })
}

/**
 * Used to roll back an upload when the database write that should have recorded it
 * fails — otherwise a failed fulfilment would leave an orphaned image in Cloudinary
 * that nothing references and nobody will ever clean up.
 */
export async function deleteDonationPhoto(publicId: string): Promise<void> {
  ensureConfigured()

  try {
    await cloudinary.uploader.destroy(publicId, { type: 'authenticated', resource_type: 'image' })
  } catch (err) {
    // Swallow: this runs inside a failure path already, and the caller's original
    // error is the one worth surfacing. Log so the orphan is at least traceable.
    console.error('Failed to clean up orphaned Cloudinary asset', publicId, err)
  }
}
