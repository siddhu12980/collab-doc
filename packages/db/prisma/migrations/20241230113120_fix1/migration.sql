-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_sheetId_fkey";

-- DropForeignKey
ALTER TABLE "Sheet" DROP CONSTRAINT "Sheet_userId_fkey";

-- AddForeignKey
ALTER TABLE "Sheet" ADD CONSTRAINT "Sheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
