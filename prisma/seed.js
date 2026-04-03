const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding local database...");

  // Create Demo Doctor
  await prisma.doctor.upsert({
    where: { email: "doctor@demo.com" },
    update: {},
    create: {
      id: "demo-doc-123",
      name: "Dr. Demo (Local)",
      email: "doctor@demo.com",
      specialty: "General Practice",
      clerkUserId: "demo-user-id",
    },
  });

  // Create Demo Patient
  await prisma.patient.upsert({
    where: { email: "patient@demo.com" },
    update: {},
    create: {
      id: "demo-pat-456",
      name: "John Smith (Local)",
      email: "patient@demo.com",
      age: 35,
      gender: "male",
      clerkUserId: "demo-user-id",
      onboardingComplete: true,
    },
  });

  // Create Patient Consent for Demo Patient
  await prisma.patientConsent.upsert({
    where: { id: "demo-consent-123" },
    update: {},
    create: {
      id: "demo-consent-123",
      patientId: "demo-pat-456",
      dataCategories: JSON.stringify(["identity", "health", "contact"]),
    },
  });

  console.log("Seed complete: Demo Doctor, Patient, and Consent created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
