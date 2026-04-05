/**
 * Seeds demo patient and doctor Patient records in the DB.
 * Run with: bun scripts/seed-demo-accounts.ts
 *
 * Clerk user IDs:
 *   demo-patient@medicrew.dev  → user_3Bv5gwsEmjP3seD7ZFiY5fuCeu1
 *   demo-doctor@medicrew.dev   → user_3Bv5hxmupvYOBziCQUIPSNyc9bp
 */

import { prisma } from "../src/lib/prisma";

const DEMO_USERS = [
  {
    clerkUserId: "user_3Bv5gwsEmjP3seD7ZFiY5fuCeu1",
    name: "Demo Patient",
    email: "demo-patient@medicrew.dev",
    gender: "prefer_not_to_say",
    age: 30,
  },
  {
    clerkUserId: "user_3Bv5hxmupvYOBziCQUIPSNyc9bp",
    name: "Demo Doctor",
    email: "demo-doctor@medicrew.dev",
    gender: "prefer_not_to_say",
    age: 40,
  },
];

async function main() {
  for (const demo of DEMO_USERS) {
    // Try to find by email first (covers stale clerkUserId case)
    const existing = await prisma.patient.findUnique({
      where: { email: demo.email },
    });

    let patient;
    if (existing) {
      // Update existing record — fix clerkUserId and mark onboarding complete
      patient = await prisma.patient.update({
        where: { email: demo.email },
        data: {
          clerkUserId: demo.clerkUserId,
          name: demo.name,
          gender: demo.gender,
          age: demo.age,
          onboardingComplete: true,
        },
      });
      console.log(
        `✓ Patient updated: ${patient.email} (${patient.id}) clerkUserId → ${demo.clerkUserId}`,
      );
    } else {
      patient = await prisma.patient.create({
        data: {
          clerkUserId: demo.clerkUserId,
          name: demo.name,
          email: demo.email,
          gender: demo.gender,
          age: demo.age,
          onboardingComplete: true,
        },
      });
      console.log(`✓ Patient created: ${patient.email} (${patient.id})`);
    }

    // Ensure consent record exists
    const existingConsent = await prisma.patientConsent.findFirst({
      where: { patientId: patient.id, consentVersion: "1.0" },
    });

    if (!existingConsent) {
      await prisma.patientConsent.create({
        data: {
          patientId: patient.id,
          consentVersion: "1.0",
          dataCategories: {
            healthData: true,
            aiProcessing: true,
            anonymousResearch: false,
          },
        },
      });
      console.log(`  ✓ Consent created for ${patient.email}`);
    } else {
      console.log(`  ✓ Consent already exists for ${patient.email}`);
    }
  }

  await prisma.$disconnect();
  console.log("\nDemo accounts seeded successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
