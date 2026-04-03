/**
 * Seed script: create a pilot Clinic and assign all existing Doctors to it.
 * Optionally assigns all existing Patients (useful for dev/demo).
 *
 * Usage:
 *   DATABASE_URL=... DIRECT_URL=... bun run scripts/seed-clinic.ts
 *
 * Options (env vars):
 *   CLINIC_NAME=... (default: "MediCrew Pilot Clinic")
 *   ASSIGN_PATIENTS=true  — also assign all existing patients to the clinic
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clinicName = process.env.CLINIC_NAME ?? "MediCrew Pilot Clinic";
  const assignPatients = process.env.ASSIGN_PATIENTS === "true";

  // Upsert clinic by name so the script is idempotent
  const clinic = await prisma.clinic.upsert({
    where: { id: "pilot-clinic" },
    update: { name: clinicName },
    create: { id: "pilot-clinic", name: clinicName },
  });
  console.log(`Clinic ready: ${clinic.name} (${clinic.id})`);

  // Assign all doctors that have no clinic yet
  const doctorResult = await prisma.doctor.updateMany({
    where: { clinicId: null },
    data: { clinicId: clinic.id },
  });
  console.log(`Assigned ${doctorResult.count} doctor(s) to clinic`);

  if (assignPatients) {
    const patientResult = await prisma.patient.updateMany({
      where: { clinicId: null, deletedAt: null },
      data: { clinicId: clinic.id },
    });
    console.log(`Assigned ${patientResult.count} patient(s) to clinic`);
  } else {
    console.log(
      "Skipping patient assignment (set ASSIGN_PATIENTS=true to include)",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
