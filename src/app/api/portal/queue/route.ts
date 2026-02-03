import { NextResponse } from "next/server";
import { getQueue } from "@/lib/doctors-patients-store";

export async function GET() {
  try {
    const queue = getQueue();
    return NextResponse.json(queue);
  } catch (error) {
    console.error("Queue fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch queue" },
      { status: 500 }
    );
  }
}
