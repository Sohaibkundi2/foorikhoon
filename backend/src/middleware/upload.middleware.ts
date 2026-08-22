import { Request, Response, NextFunction } from 'express'
import multer from 'multer'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/** The part of multer's file object we actually consume. */
export interface UploadedPhoto {
  buffer: Buffer
  mimetype: string
  size: number
  originalname: string
}

/**
 * Express's Request with the field multer's `.single()` attaches.
 *
 * `@types/multer` augments the global Express namespace so plain `req.file` also
 * compiles, but relying on that means the contract between this middleware and the
 * controller is invisible at both ends — and it silently disappears if the types
 * package is ever dropped. Naming it makes the handoff explicit.
 */
export type RequestWithPhoto = Request & { file?: UploadedPhoto }

/**
 * Multer instance for donation proof photos.
 *
 * memoryStorage (rather than diskStorage) because the buffer goes straight to
 * Cloudinary and is never needed on our filesystem — writing it to disk first would
 * mean temp files to clean up and a writable-disk assumption that doesn't hold on
 * most container hosts. The 5MB cap is what makes holding it in memory safe.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      // Passing an Error here makes multer abort the request. We catch it below and
      // translate it into a 400 rather than letting it become an unhandled 500.
      cb(new Error('INVALID_FILE_TYPE'))
      return
    }
    cb(null, true)
  },
})

/**
 * Wraps multer's single-file middleware so its failures become clean JSON.
 *
 * Why this wrapper exists: multer reports problems by passing an error to `next()`,
 * which hands the request to Express's default error handler. This API has no global
 * error handler, so an oversized upload would come back as a generic 500 with an HTML
 * stack trace — unreadable for the client and leaky in production. Calling multer
 * manually lets us map each failure mode to a specific status and message.
 *
 * Note the mimetype check is a claim made by the client, so it's a fast-fail
 * convenience, not a security boundary. The real guarantee comes from Cloudinary
 * re-decoding the bytes server-side and rejecting anything that isn't a valid image.
 */
export const uploadDonationPhotoMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  upload.single('photo')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'Photo is too large. Maximum size is 5MB.',
        })
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          message: 'Upload exactly one photo, in a field named "photo".',
        })
      }
      return res.status(400).json({ message: 'Photo upload failed.' })
    }

    if (err instanceof Error && err.message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        message: 'Unsupported file type. Upload a JPG, PNG or WebP image.',
      })
    }

    if (err) {
      console.error('Unexpected upload error:', err)
      return res.status(500).json({ message: 'Photo upload failed.' })
    }

    next()
  })
}
