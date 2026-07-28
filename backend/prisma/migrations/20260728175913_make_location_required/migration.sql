/*
  Warnings:

  - Made the column `latitude` on table `Donor` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `Donor` required. This step will fail if there are existing NULL values in that column.
  - Made the column `area` on table `Donor` required. This step will fail if there are existing NULL values in that column.
  - Made the column `latitude` on table `Hospital` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `Hospital` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Donor_latitude_longitude_idx";

-- AlterTable
ALTER TABLE "Donor" ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL,
ALTER COLUMN "area" SET NOT NULL;

-- AlterTable
ALTER TABLE "Hospital" ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL;
