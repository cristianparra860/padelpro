-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "levelRange" TEXT,
    "hasRecycledSlots" BOOLEAN NOT NULL DEFAULT false,
    "availableRecycledSlots" INTEGER,
    "recycledSlotsOnlyPoints" BOOLEAN NOT NULL DEFAULT true,
    "creditsSlots" TEXT,
    "creditsCost" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeSlot_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeSlot_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TimeSlot_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TimeSlot" ("category", "clubId", "courtId", "courtNumber", "courtRentalPrice", "createdAt", "creditsCost", "creditsSlots", "end", "genderCategory", "hasRecycledSlots", "id", "instructorId", "instructorPrice", "level", "levelRange", "maxPlayers", "start", "totalPrice", "updatedAt") SELECT "category", "clubId", "courtId", "courtNumber", "courtRentalPrice", "createdAt", "creditsCost", "creditsSlots", "end", "genderCategory", "hasRecycledSlots", "id", "instructorId", "instructorPrice", "level", "levelRange", "maxPlayers", "start", "totalPrice", "updatedAt" FROM "TimeSlot";
DROP TABLE "TimeSlot";
ALTER TABLE "new_TimeSlot" RENAME TO "TimeSlot";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
