import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Clerk user IDs for the shared demo accounts
const DEMO_USER_IDS: Record<"patient" | "doctor", string> = {
  patient: "user_3BWy2YDbESIkylb67hOPsXLiZFe",
  doctor: "user_3BWy2aPdfCM4aKgb5OWxowbKH1c",
};

function getDemoLoginStatus() {
  const enabled = process.env.DEMO_LOGIN_ENABLED !== "false";
  const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);
  const patientConfigured = Boolean(DEMO_USER_IDS.patient);
  const doctorConfigured = Boolean(DEMO_USER_IDS.doctor);
  const usersConfigured = patientConfigured && doctorConfigured;
  const ready = enabled && clerkConfigured && usersConfigured;

  let reason = "ready";
  if (!enabled) reason = "disabled_by_env";
  else if (!clerkConfigured) reason = "missing_clerk_secret_key";
  else if (!usersConfigured) reason = "missing_demo_user_ids";

  return {
    enabled,
    ready,
    reason,
    usersConfigured,
  };
}

export async function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get("role");
  const validRole = role === "patient" || role === "doctor";
  const status = getDemoLoginStatus();

  return NextResponse.json(
    {
      ...status,
      role: validRole ? role : null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    },
    { status: 200 },
  );
}

export async function POST(request: NextRequest) {
  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = body.role;
  if (role !== "patient" && role !== "doctor") {
    return NextResponse.json(
      { error: "role must be patient or doctor" },
      { status: 400 },
    );
  }

  const status = getDemoLoginStatus();
  if (!status.ready) {
    return NextResponse.json(
      { error: "Demo login unavailable", reason: status.reason },
      { status: 503 },
    );
  }
  const secretKey = process.env.CLERK_SECRET_KEY!;

  const userId = DEMO_USER_IDS[role];

  // Generate a short-lived sign-in token via Clerk Backend API
  const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 60 }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[demo-token] Clerk error:", err);
    return NextResponse.json(
      { error: "Failed to generate demo token" },
      { status: 502 },
    );
  }

  const { token } = await res.json();

  // Ensure the demo user has the correct role in publicMetadata
  // so middleware RBAC can enforce portal routing
  await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public_metadata: { role } }),
  }).catch(() => {
    // Non-fatal — RBAC just won't enforce if metadata update fails
    console.warn("[demo-token] Failed to set role metadata on demo user");
  });

  return NextResponse.json({ token });
}
