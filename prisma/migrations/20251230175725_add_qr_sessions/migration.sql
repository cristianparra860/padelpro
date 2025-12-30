-- CreateTable
CREATE TABLE "QRSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "authToken" TEXT,
    "clubId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "QRSession_token_key" ON "QRSession"("token");

-- CreateIndex
CREATE INDEX "QRSession_token_idx" ON "QRSession"("token");

-- CreateIndex
CREATE INDEX "QRSession_status_idx" ON "QRSession"("status");

-- CreateIndex
CREATE INDEX "QRSession_expiresAt_idx" ON "QRSession"("expiresAt");
