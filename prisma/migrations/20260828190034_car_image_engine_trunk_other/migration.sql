-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ImageKind" ADD VALUE 'ENGINE';
ALTER TYPE "ImageKind" ADD VALUE 'TRUNK';
ALTER TYPE "ImageKind" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "car_images" ADD COLUMN     "label" TEXT;
