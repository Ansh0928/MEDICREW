export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  _ctx: { params: Promise<{ id: string }> },
) {
  return NextResponse.json(
    { error: "Deprecated endpoint. Use /api/patient/* routes." },
    { status: 410 },
  );
}
