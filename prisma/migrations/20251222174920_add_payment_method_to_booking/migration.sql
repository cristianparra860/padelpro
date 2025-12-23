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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("amountBlocked", "createdAt", "groupSize", "id", "isRecycled", "paidWithPoints", "pointsUsed", "status", "timeSlotId", "updatedAt", "userId", "wasConfirmed") SELECT "amountBlocked", "createdAt", "groupSize", "id", "isRecycled", "paidWithPoints", "pointsUsed", "status", "timeSlotId", "updatedAt", "userId", "wasConfirmed" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE TABLE "new_Instructor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialties" TEXT,
    "experience" TEXT,
    "profilePictureUrl" TEXT,
    "hourlyRate" REAL,
    "clubId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "defaultRatePerHour" REAL,
    "rateTiers" TEXT,
    "levelRanges" TEXT,
    "unavailableHours" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Instructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Instructor_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Instructor" ("clubId", "createdAt", "experience", "hourlyRate", "id", "isActive", "levelRanges", "name", "profilePictureUrl", "specialties", "updatedAt", "userId") SELECT "clubId", "createdAt", "experience", "hourlyRate", "id", "isActive", "levelRanges", "name", "profilePictureUrl", "specialties", "updatedAt", "userId" FROM "Instructor";
DROP TABLE "Instructor";
ALTER TABLE "new_Instructor" RENAME TO "Instructor";
CREATE UNIQUE INDEX "Instructor_userId_key" ON "Instructor"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
