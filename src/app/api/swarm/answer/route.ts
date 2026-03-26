// src/app/api/swarm/answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function POST(request: NextRequest) {
  const redis = Redis.fromEnv();
  const { clarificationId, answer } = await request.json();
  if (!clarificationId || !answer) {
    return NextResponse.json({ error: "clarificationId and answer required" }, { status: 400 });
  }
  // TTL: 5 minutes — enough time for the patient to respond
  await redis.set(`swarm:answer:${clarificationId}`, String(answer).slice(0, 500), { ex: 300 });
  return NextResponse.json({ ok: true });
}
