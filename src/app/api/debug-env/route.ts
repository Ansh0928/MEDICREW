import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "(missing)";
  const directUrl = process.env.DIRECT_URL ?? "(missing)";
  let prismaResult: string;
  try {
    const count = await prisma.patient.count();
    prismaResult = `ok: ${count} patients`;
  } catch (e: unknown) {
    prismaResult = `error: ${e instanceof Error ? e.message : String(e)}`;
  }
  return NextResponse.json({
    DATABASE_URL_prefix: dbUrl.substring(0, 40),
    DATABASE_URL_suffix: JSON.stringify(dbUrl.slice(-8)),
    DIRECT_URL_prefix: directUrl.substring(0, 40),
    DIRECT_URL_suffix: JSON.stringify(directUrl.slice(-8)),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    prisma: prismaResult,
  });
}
