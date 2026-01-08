-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "groupSize" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "wasConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "paidWithPoints" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CREDITS',
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,
    "amountBlocked" INTEGER NOT NULL DEFAULT 0,
    "isRecycled" BOOLEAN NOT NULL DEFAULT false,
    "isInstructorSubsidy" BOOLEAN NOT NULL DEFAULT false,
    "hiddenFromHistory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("amountBlocked", "createdAt", "groupSize", "id", "isInstructorSubsidy", "isRecycled", "paidWithPoints", "paymentMethod", "pointsUsed", "status", "timeSlotId", "updatedAt", "userId", "wasConfirmed") SELECT "amountBlocked", "createdAt", "groupSize", "id", "isInstructorSubsidy", "isRecycled", "paidWithPoints", "paymentMethod", "pointsUsed", "status", "timeSlotId", "updatedAt", "userId", "wasConfirmed" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_timeSlotId_status_idx" ON "Booking"("timeSlotId", "status");
CREATE INDEX "Booking_userId_status_idx" ON "Booking"("userId", "status");
CREATE TABLE "new_MatchGameBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "matchGameId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "wasConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "paidWithPoints" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CREDITS',
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,
    "amountBlocked" INTEGER NOT NULL DEFAULT 0,
    "groupSize" INTEGER NOT NULL DEFAULT 1,
    "isRecycled" BOOLEAN NOT NULL DEFAULT false,
    "hiddenFromHistory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchGameBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchGameBooking_matchGameId_fkey" FOREIGN KEY ("matchGameId") REFERENCES "MatchGame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MatchGameBooking" ("amountBlocked", "createdAt", "groupSize", "id", "isRecycled", "matchGameId", "paidWithPoints", "paymentMethod", "pointsUsed", "status", "updatedAt", "userId", "wasConfirmed") SELECT "amountBlocked", "createdAt", "groupSize", "id", "isRecycled", "matchGameId", "paidWithPoints", "paymentMethod", "pointsUsed", "status", "updatedAt", "userId", "wasConfirmed" FROM "MatchGameBooking";
DROP TABLE "MatchGameBooking";
ALTER TABLE "new_MatchGameBooking" RENAME TO "MatchGameBooking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
