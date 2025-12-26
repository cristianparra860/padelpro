-- CreateTable
CREATE TABLE "MatchGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "courtId" TEXT,
    "courtNumber" INTEGER,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "maxPlayers" INTEGER NOT NULL DEFAULT 4,
    "courtRentalPrice" REAL NOT NULL DEFAULT 0,
    "pricePerPlayer" REAL NOT NULL DEFAULT 0,
    "level" TEXT,
    "genderCategory" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "hasRecycledSlots" BOOLEAN NOT NULL DEFAULT false,
    "availableRecycledSlots" INTEGER,
    "recycledSlotsOnlyPoints" BOOLEAN NOT NULL DEFAULT true,
    "creditsSlots" TEXT,
    "creditsCost" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchGame_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchGame_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchGameBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "matchGameId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "wasConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "paidWithPoints" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CREDITS',
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,
    "amountBlocked" INTEGER NOT NULL DEFAULT 0,
    "isRecycled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchGameBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchGameBooking_matchGameId_fkey" FOREIGN KEY ("matchGameId") REFERENCES "MatchGame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "wasConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "paidWithPoints" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CREDITS',
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,
    "amountBlocked" INTEGER NOT NULL DEFAULT 0,
    "isRecycled" BOOLEAN NOT NULL DEFAULT false,
    "isInstructorSubsidy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("amountBlocked", "createdAt", "groupSize", "id", "isRecycled", "paidWithPoints", "paymentMethod", "pointsUsed", "status", "timeSlotId", "updatedAt", "userId", "wasConfirmed") SELECT "amountBlocked", "createdAt", "groupSize", "id", "isRecycled", "paidWithPoints", "paymentMethod", "pointsUsed", "status", "timeSlotId", "updatedAt", "userId", "wasConfirmed" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
