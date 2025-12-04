-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
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
    "blockedPoints" INTEGER NOT NULL DEFAULT 0,
    "genderCategory" TEXT,
    "preferredGameType" TEXT,
    "prefTimeSlot" TEXT DEFAULT 'all',
    "prefViewType" TEXT DEFAULT 'all',
    "prefPlayerCounts" TEXT DEFAULT '1,2,3,4',
    "prefInstructorIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("bio", "blockedCredits", "clubId", "createdAt", "credits", "email", "gender", "genderCategory", "id", "level", "name", "password", "phone", "points", "position", "prefInstructorIds", "prefPlayerCounts", "prefTimeSlot", "prefViewType", "preference", "preferredGameType", "profilePictureUrl", "role", "updatedAt", "visibility") SELECT "bio", "blockedCredits", "clubId", "createdAt", "credits", "email", "gender", "genderCategory", "id", "level", "name", "password", "phone", "points", "position", "prefInstructorIds", "prefPlayerCounts", "prefTimeSlot", "prefViewType", "preference", "preferredGameType", "profilePictureUrl", "role", "updatedAt", "visibility" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
