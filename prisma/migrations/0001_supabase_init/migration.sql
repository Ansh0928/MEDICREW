-- CreateTable: Patient
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "knownConditions" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Consultation
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "urgencyLevel" TEXT,
    "redFlags" TEXT,
    "triageResponse" TEXT,
    "gpResponse" TEXT,
    "specialistResponse" TEXT,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Doctor
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PatientConsent
CREATE TABLE "PatientConsent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "dataCategories" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");

-- AddForeignKey: Consultation -> Patient
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Notification -> Patient
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Notification -> Doctor
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: PatientConsent -> Patient
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Enable Row Level Security on all tables (INFRA-02)
-- ============================================================

ALTER TABLE "Patient" enable row level security;
ALTER TABLE "Consultation" enable row level security;
ALTER TABLE "Doctor" enable row level security;
ALTER TABLE "Notification" enable row level security;
ALTER TABLE "PatientConsent" enable row level security;

-- ============================================================
-- RLS Policies (activate when Supabase Auth is wired in Phase 2)
-- ============================================================

-- Patient: read own record
CREATE POLICY "patient_self_read" ON "Patient"
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = id);

-- Patient: update own record
CREATE POLICY "patient_self_update" ON "Patient"
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()::text) = id);

-- Consultation: patient reads own consultations
CREATE POLICY "consultation_patient_read" ON "Consultation"
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = "patientId");

-- Notification: patient reads own notifications
CREATE POLICY "notification_patient_read" ON "Notification"
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = "patientId");

-- Notification: service role can insert notifications (agent writes)
CREATE POLICY "notification_service_insert" ON "Notification"
    FOR INSERT TO service_role
    WITH CHECK (true);

-- PatientConsent: patient reads own consent records
CREATE POLICY "consent_patient_read" ON "PatientConsent"
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()::text) = "patientId");

-- PatientConsent: patient inserts own consent
CREATE POLICY "consent_patient_insert" ON "PatientConsent"
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()::text) = "patientId");

-- ============================================================
-- pg_cron: 90-day LangGraph checkpoint cleanup (INFRA-03)
-- ============================================================

-- Enable pg_cron extension (available on Supabase Pro+)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Clean up LangGraph checkpoints older than 90 days
-- Weekly at 3am Sunday (AEST ~= UTC+10, so 3am AEST = 17:00 UTC Saturday)
SELECT cron.schedule(
    'cleanup-langgraph-checkpoints',
    '0 3 * * 0',
    $$DELETE FROM langgraph.checkpoints WHERE created_at < NOW() - INTERVAL '90 days'$$
);
