/*
  Warnings:

  - You are about to drop the `MonthlyGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MonthlyGroupMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MonthlyGroupSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "MonthlyGroupMember_groupId_userId_key";

-- DropIndex
DROP INDEX "MonthlyGroupSession_groupId_sessionNumber_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MonthlyGroup";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MonthlyGroupMember";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MonthlyGroupSession";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CourtPriceSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourtPriceSlot_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "groupSize" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "paidWithPoints" BOOLEAN NOT NULL DEFAULT false,
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,
    "amountBlocked" INTEGER NOT NULL DEFAULT 0,
    "isRecycled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("createdAt", "groupSize", "id", "status", "timeSlotId", "updatedAt", "userId") SELECT "createdAt", "groupSize", "id", "status", "timeSlotId", "updatedAt", "userId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_userId_timeSlotId_groupSize_key" ON "Booking"("userId", "timeSlotId", "groupSize");
CREATE TABLE "new_Club" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "description" TEXT,
    "courtRentalPrice" REAL NOT NULL DEFAULT 10.0,
    "adminId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Club_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Club" ("address", "adminId", "createdAt", "description", "email", "id", "name", "phone", "updatedAt", "website") SELECT "address", "adminId", "createdAt", "description", "email", "id", "name", "phone", "updatedAt", "website" FROM "Club";
DROP TABLE "Club";
ALTER TABLE "new_Club" RENAME TO "Club";
CREATE TABLE "new_TimeSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "courtId" TEXT,
    "courtNumber" INTEGER,
    "instructorId" TEXT,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 4,
    "instructorPrice" REAL NOT NULL DEFAULT 0,
    "courtRentalPrice" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "genderCategory" TEXT,
    "hasRecycledSlots" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeSlot_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeSlot_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TimeSlot_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TimeSlot" ("category", "clubId", "courtId", "courtNumber", "createdAt", "end", "genderCategory", "id", "instructorId", "level", "maxPlayers", "start", "totalPrice", "updatedAt") SELECT "category", "clubId", "courtId", "courtNumber", "createdAt", "end", "genderCategory", "id", "instructorId", "level", "maxPlayers", "start", "totalPrice", "updatedAt" FROM "TimeSlot";
DROP TABLE "TimeSlot";
ALTER TABLE "new_TimeSlot" RENAME TO "TimeSlot";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profilePictureUrl" TEXT,
    "phone" TEXT,
    "level" TEXT NOT NULL DEFAULT 'principiante',
    "position" TEXT,
    "gender" TEXT,
    "clubId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "preference" TEXT NOT NULL DEFAULT 'NORMAL',
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "bio" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "blockedCredits" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "genderCategory" TEXT,
    "preferredGameType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("bio", "clubId", "createdAt", "credits", "email", "genderCategory", "id", "level", "name", "phone", "position", "preference", "preferredGameType", "profilePictureUrl", "role", "updatedAt", "visibility") SELECT "bio", "clubId", "createdAt", "credits", "email", "genderCategory", "id", "level", "name", "phone", "position", "preference", "preferredGameType", "profilePictureUrl", "role", "updatedAt", "visibility" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
