-- CreateIndex
CREATE INDEX "Booking_timeSlotId_status_idx" ON "Booking"("timeSlotId", "status");

-- CreateIndex
CREATE INDEX "Booking_userId_status_idx" ON "Booking"("userId", "status");

-- CreateIndex
CREATE INDEX "MatchGame_start_clubId_idx" ON "MatchGame"("start", "clubId");

-- CreateIndex
CREATE INDEX "MatchGame_start_courtNumber_idx" ON "MatchGame"("start", "courtNumber");

-- CreateIndex
CREATE INDEX "TimeSlot_start_clubId_idx" ON "TimeSlot"("start", "clubId");

-- CreateIndex
CREATE INDEX "TimeSlot_start_courtId_idx" ON "TimeSlot"("start", "courtId");

-- CreateIndex
CREATE INDEX "TimeSlot_instructorId_start_idx" ON "TimeSlot"("instructorId", "start");
