import { prisma } from "@/lib/prisma";
import type { AnalyticsEventName } from "@/lib/analytics/events";

export type AnalyticsRow = {
  ts: Date;
  event: string;
  properties: Record<string, unknown>;
  variant: string | null;
};

let ensureTablePromise: Promise<void> | null = null;

async function ensureAnalyticsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      event TEXT NOT NULL,
      properties JSONB NOT NULL DEFAULT '{}'::jsonb,
      variant TEXT
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AnalyticsEvent_ts_idx"
      ON "AnalyticsEvent"(ts);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AnalyticsEvent_event_idx"
      ON "AnalyticsEvent"(event);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AnalyticsEvent_variant_idx"
      ON "AnalyticsEvent"(variant);
  `);
}

async function ensureReady() {
  if (!ensureTablePromise) {
    ensureTablePromise = ensureAnalyticsTable();
  }
  await ensureTablePromise;
}

export async function persistAnalyticsEvent(
  event: AnalyticsEventName,
  properties: Record<string, unknown>,
) {
  await ensureReady();

  const variant =
    typeof properties.variant === "string" ? properties.variant : null;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "AnalyticsEvent" (event, properties, variant) VALUES ($1, $2::jsonb, $3)`,
    event,
    JSON.stringify(properties ?? {}),
    variant,
  );
}

export async function fetchAnalyticsEventsSince(
  since: Date,
): Promise<AnalyticsRow[]> {
  await ensureReady();

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      ts: Date;
      event: string;
      properties: unknown;
      variant: string | null;
    }>
  >(
    `SELECT ts, event, properties, variant
     FROM "AnalyticsEvent"
     WHERE ts >= $1
     ORDER BY ts DESC`,
    since,
  );

  return rows.map((row) => ({
    ts: row.ts,
    event: row.event,
    properties:
      row.properties && typeof row.properties === "object"
        ? (row.properties as Record<string, unknown>)
        : {},
    variant: row.variant,
  }));
}
