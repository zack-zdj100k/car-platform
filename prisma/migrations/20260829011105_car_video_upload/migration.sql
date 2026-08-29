/*
  Warnings:

  - You are about to drop the column `tiktok_url` on the `cars` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cars" DROP COLUMN "tiktok_url",
ADD COLUMN     "video_url" TEXT;
