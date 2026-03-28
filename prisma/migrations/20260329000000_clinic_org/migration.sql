-- CreateTable: Clinic
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- AddColumn: Doctor.clinicId
ALTER TABLE "Doctor" ADD COLUMN "clinicId" TEXT;

-- AddColumn: Patient.clinicId
ALTER TABLE "Patient" ADD COLUMN "clinicId" TEXT;

-- AddForeignKey: Doctor → Clinic
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Patient → Clinic
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
