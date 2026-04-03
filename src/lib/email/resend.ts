import { Resend } from "resend";

const fromEmail = process.env.RESEND_FROM_EMAIL || "care@medicrew.com";

function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendCheckInEmail(
  patientEmail: string,
  patientName: string,
  checkInMessage: string,
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set -- skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: `Medicrew Care Team <${fromEmail}>`,
      to: patientEmail,
      subject: "Check-in from your Medicrew care team",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Care Team Check-In</h2>
          <p>Hi ${patientName},</p>
          <p>${checkInMessage}</p>
          <p>Please log in to your Medicrew portal to respond and let us know how you are feeling.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated notification from your Medicrew care team.
            This is health information only, not a medical diagnosis.
            If this is an emergency, call 000 immediately.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Resend email error:", error);
    return { success: false, error: String(error) };
  }
}

export async function sendEscalationEmail(
  patientEmail: string,
  patientName: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set -- skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: `Medicrew Care Team <${fromEmail}>`,
      to: patientEmail,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Medicrew Care Alert</h2>
          <p>Hi ${patientName},</p>
          <p>${body}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated notification from your Medicrew care team.
            This is health information only, not a medical diagnosis.
            If this is an emergency, call 000 immediately.
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Resend email error:", error);
    return { success: false, error: String(error) };
  }
}
