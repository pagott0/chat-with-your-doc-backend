/*
  Warnings:

  - Added the required column `text` to the `UploadedDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UploadedDocument" ADD COLUMN     "text" TEXT NOT NULL;
