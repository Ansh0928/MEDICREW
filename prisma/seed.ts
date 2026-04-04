/**
 * MediCrew dev seed — idempotent, safe to re-run.
 *
 * Seeds a demo Clinic, Doctor, and Patient so local dev works out of the box.
 * The Clinic id "clinic-demo" must match DEMO_DOCTOR.clinicId in src/lib/auth.ts.
 *
 * Usage:
 *   bun prisma/seed.ts                              # seed demo data
 *   bun prisma/seed.ts assign patient@real.com clinic-xyz  # assign a real patient to a clinic
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [, , cmd, email, clinicId] = process.argv;

  // Subcommand: assign a real patient to a clinic (for pilot onboarding)
  if (cmd === "assign") {
    if (!email || !clinicId) {
      console.error("Usage: bun prisma/seed.ts assign <email> <clinicId>");
      process.exit(1);
    }
    const patient = await prisma.patient.update({
      where: { email },
      data: { clinicId },
    });
    console.log(
      `Assigned ${patient.email} (${patient.id}) to clinic ${clinicId}`,
    );
    return;
  }

  // Default: seed demo data
  const clinic = await prisma.clinic.upsert({
    where: { id: "clinic-demo" },
    update: {},
    create: { id: "clinic-demo", name: "Demo Clinic" },
  });
  console.log(`Clinic: ${clinic.name} (${clinic.id})`);

  const doctor = await prisma.doctor.upsert({
    where: { email: "doctor@demo.com" },
    update: { clinicId: "clinic-demo" },
    create: {
      email: "doctor@demo.com",
      name: "Dr. Demo",
      specialty: "General Practice",
      clinicId: "clinic-demo",
    },
  });
  console.log(`Doctor: ${doctor.name} (${doctor.id})`);

  // Use a clearly non-real email to avoid colliding with real patient signups
  const patient = await prisma.patient.upsert({
    where: { email: "demo-patient@medicrew.dev" },
    update: { clinicId: "clinic-demo" },
    create: {
      email: "demo-patient@medicrew.dev",
      name: "Demo Patient",
      clinicId: "clinic-demo",
    },
  });
  console.log(`Patient: ${patient.name} (${patient.id})`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
