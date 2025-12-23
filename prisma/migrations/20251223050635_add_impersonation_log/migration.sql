-- CreateTable
CREATE TABLE "ImpersonationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "superAdminId" TEXT NOT NULL,
    "superAdminEmail" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetUserEmail" TEXT NOT NULL,
    "targetUserRole" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "durationMinutes" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT
);

-- CreateIndex
CREATE INDEX "ImpersonationLog_superAdminId_idx" ON "ImpersonationLog"("superAdminId");

-- CreateIndex
CREATE INDEX "ImpersonationLog_targetUserId_idx" ON "ImpersonationLog"("targetUserId");

-- CreateIndex
CREATE INDEX "ImpersonationLog_startedAt_idx" ON "ImpersonationLog"("startedAt");
