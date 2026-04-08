-- AddIndex
CREATE INDEX "Consultation_patientId_idx" ON "Consultation"("patientId");

-- AddIndex
CREATE INDEX "Notification_patientId_idx" ON "Notification"("patientId");

-- AddIndex
CREATE INDEX "CheckIn_patientId_idx" ON "CheckIn"("patientId");
