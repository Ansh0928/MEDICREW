// src/app/api/swarm/answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { answerStore } from "@/agents/swarm-types";

export async function POST(request: NextRequest) {
  const { clarificationId, answer } = await request.json();
  if (!clarificationId || !answer) {
    return NextResponse.json({ error: "clarificationId and answer required" }, { status: 400 });
  }
  answerStore.set(clarificationId, String(answer).slice(0, 500));
  return NextResponse.json({ ok: true });
}
