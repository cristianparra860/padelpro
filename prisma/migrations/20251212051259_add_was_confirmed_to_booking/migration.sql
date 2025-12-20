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
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,
    "amountBlocked" INTEGER NOT NULL DEFAULT 0,
    "isRecycled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("amountBlocked", "createdAt", "groupSize", "id", "isRecycled", "paidWithPoints", "pointsUsed", "status", "timeSlotId", "updatedAt", "userId") SELECT "amountBlocked", "createdAt", "groupSize", "id", "isRecycled", "paidWithPoints", "pointsUsed", "status", "timeSlotId", "updatedAt", "userId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
