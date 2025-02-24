-- CreateEnum
CREATE TYPE "CRDTOperation" AS ENUM ('INSERT', 'DELETE', 'UPDATE_PROPERTIES');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "operation" "CRDTOperation";

-- AlterTable
ALTER TABLE "Sheet" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER[],
    "siteId" TEXT NOT NULL,
    "clock" INTEGER NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "properties" JSONB,
    "sheetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Character_sheetId_idx" ON "Character"("sheetId");

-- CreateIndex
CREATE INDEX "Character_siteId_clock_idx" ON "Character"("siteId", "clock");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
