/*
  Warnings:

  - Added the required column `fileName` to the `UploadedDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `UploadedDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileType` to the `UploadedDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UploadedDocument" ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "fileType" TEXT NOT NULL;
