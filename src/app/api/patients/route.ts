export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Deprecated endpoint. Use /api/patient/* routes." },
    { status: 410 },
  );
}

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: "Deprecated endpoint. Use /api/patient/* routes." },
    { status: 410 },
  );
}
