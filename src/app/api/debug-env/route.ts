import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "(missing)";

  let userId: string | null = null;
  let authError: string | null = null;
  try {
    const a = await auth();
    userId = a.userId;
  } catch (e: unknown) {
    authError = e instanceof Error ? e.message : String(e);
  }

  let prismaResult: string;
  try {
    const count = await prisma.patient.count();
    prismaResult = `count ok: ${count}`;
  } catch (e: unknown) {
    prismaResult = `count error: ${e instanceof Error ? e.message : String(e)}`;
  }

  let findFirstResult: string;
  try {
    const p = await prisma.patient.findFirst({
      where: { clerkUserId: userId ?? "test" },
    });
    findFirstResult = p ? `found: ${p.id}` : "null (not found)";
  } catch (e: unknown) {
    findFirstResult = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({
    DATABASE_URL_suffix: JSON.stringify(dbUrl.slice(-10)),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    userId,
    authError,
    prismaCount: prismaResult,
    prismaFindFirst: findFirstResult,
  });
}
