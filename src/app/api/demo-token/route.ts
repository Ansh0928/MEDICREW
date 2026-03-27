import { NextRequest, NextResponse } from "next/server";

// Clerk user IDs for the shared demo accounts
const DEMO_USER_IDS: Record<"patient" | "doctor", string> = {
  patient: "user_3BWy2YDbESIkylb67hOPsXLiZFe",
  doctor: "user_3BWy2aPdfCM4aKgb5OWxowbKH1c",
};

export async function POST(request: NextRequest) {
  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = body.role;
  if (role !== "patient" && role !== "doctor") {
    return NextResponse.json({ error: "role must be patient or doctor" }, { status: 400 });
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

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
    return NextResponse.json({ error: "Failed to generate demo token" }, { status: 502 });
  }

  const { token } = await res.json();
  return NextResponse.json({ token });
}
