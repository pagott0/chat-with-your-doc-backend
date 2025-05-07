/*
  Warnings:

  - You are about to drop the column `text` on the `UploadedDocument` table. All the data in the column will be lost.
  - Added the required column `extractedText` to the `UploadedDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UploadedDocument" DROP COLUMN "text",
ADD COLUMN     "extractedText" TEXT NOT NULL;
