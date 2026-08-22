-- AlterTable
-- Proof-of-donation photo attached to a Match at fulfilment time.
-- photoPublicId stores the Cloudinary public_id (not a delivery URL) because the
-- asset is uploaded with access_mode = "authenticated"; the API mints a short-lived
-- signed URL on read instead of persisting a permanently-public link.
ALTER TABLE "Match" ADD COLUMN "photoPublicId" TEXT;
ALTER TABLE "Match" ADD COLUMN "photoUploadedAt" TIMESTAMP(3);
