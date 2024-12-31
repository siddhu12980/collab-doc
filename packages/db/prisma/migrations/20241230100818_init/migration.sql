/*
  Warnings:

  - Added the required column `column` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `editType` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `line` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EditType" AS ENUM ('INSERT', 'DELETE');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "column" INTEGER NOT NULL,
ADD COLUMN     "editType" "EditType" NOT NULL,
ADD COLUMN     "line" INTEGER NOT NULL;
