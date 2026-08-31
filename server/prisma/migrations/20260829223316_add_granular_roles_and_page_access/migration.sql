-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'owner', 'editor');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sectionAccess" JSONB NOT NULL DEFAULT '{}',
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'admin';

-- CreateTable
CREATE TABLE "UserPageAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPageAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPageAccess_userId_pageId_key" ON "UserPageAccess"("userId", "pageId");

-- AddForeignKey
ALTER TABLE "UserPageAccess" ADD CONSTRAINT "UserPageAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPageAccess" ADD CONSTRAINT "UserPageAccess_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
