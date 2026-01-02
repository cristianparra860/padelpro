-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchGameBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchGameBooking_matchGameId_fkey" FOREIGN KEY ("matchGameId") REFERENCES "MatchGame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MatchGameBooking" ("amountBlocked", "createdAt", "id", "isRecycled", "matchGameId", "paidWithPoints", "paymentMethod", "pointsUsed", "status", "updatedAt", "userId", "wasConfirmed") SELECT "amountBlocked", "createdAt", "id", "isRecycled", "matchGameId", "paidWithPoints", "paymentMethod", "pointsUsed", "status", "updatedAt", "userId", "wasConfirmed" FROM "MatchGameBooking";
DROP TABLE "MatchGameBooking";
ALTER TABLE "new_MatchGameBooking" RENAME TO "MatchGameBooking";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
