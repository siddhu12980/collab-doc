/*
  Warnings:

  - Added the required column `lastUpdateID` to the `Sheet` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sheet" ADD COLUMN     "lastUpdateID" TEXT NOT NULL;
