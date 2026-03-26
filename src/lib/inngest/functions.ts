import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { sendCheckInEmail } from "@/lib/email/resend";

export const scheduleCheckIn = inngest.createFunction(
  {
    id: "schedule-check-in",
    name: "Schedule Patient Check-In",
    triggers: [{ event: "consultation/completed" }],
  },
  async ({ event, step }) => {
    const { patientId, consultationId, patientName } = event.data;

    // Wait 48 hours before sending check-in
    await step.sleep("wait-48h", "48h");

    // Check if patient has opted out
    const patient = await step.run("check-opt-out", async () => {
      return prisma.patient.findUnique({
        where: { id: patientId },
        select: { checkInsOptOut: true, name: true, deletedAt: true, email: true },
      });
    });

    if (!patient || patient.deletedAt || patient.checkInsOptOut) {
      return { skipped: true, reason: "opted-out-or-deleted" };
    }

    // Resolve the check-in message text (used in both notification and email)
    const checkInMessage = await step.run("resolve-check-in-message", async () => {
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        select: { createdAt: true },
      });

      const consultDate = consultation
        ? new Date(consultation.createdAt).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "your recent visit";

      return `Hi ${patientName}, this is Alex AI \u2014 GP. How are you feeling since your consultation on ${consultDate}?`;
    });

    // Create in-app notification as check-in message
    const notification = await step.run("create-check-in-notification", async () => {
      return prisma.notification.create({
        data: {
          patientId,
          title: "Check-in from your care team",
          message: checkInMessage,
          type: "check-in",
        },
      });
    });

    // Create CheckIn record
    await step.run("create-check-in-record", async () => {
      return prisma.checkIn.create({
        data: {
          patientId,
          consultationId,
          status: "pending",
          notificationId: notification.id,
          scheduledFor: new Date(),
        },
      });
    });

    // Send check-in follow-up email via Resend
    await step.run("send-check-in-email", async () => {
      if (patient.email) {
        await sendCheckInEmail(patient.email, patientName, checkInMessage);
      }
    });

    return { success: true, notificationId: notification.id };
  }
);
