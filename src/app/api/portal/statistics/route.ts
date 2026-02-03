import { NextResponse } from "next/server";
import { getStatistics } from "@/lib/doctors-patients-store";

export async function GET() {
  try {
    const stats = getStatistics();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Statistics fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
