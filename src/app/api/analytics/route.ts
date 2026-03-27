import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { appendAnalyticsEvent, listAnalyticsEvents } from "@/lib/analytics/store";
import { LANDING_VARIANTS } from "@/lib/marketing/landing-variants";
import { fetchAnalyticsEventsSince, persistAnalyticsEvent } from "@/lib/analytics/db";

type AnalyticsBody = {
  event?: string;
  properties?: Record<string, unknown>;
};

const allowedEvents = new Set<string>(Object.values(ANALYTICS_EVENTS));

function toNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export async function POST(request: NextRequest) {
  let body: AnalyticsBody;
  try {
    body = (await request.json()) as AnalyticsBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.event || !allowedEvents.has(body.event)) {
    return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";

  // Initial implementation logs server-side for KPI baselining.
  // Can later be replaced with a warehouse sink without changing client contracts.
  console.info("[analytics]", {
    ts: new Date().toISOString(),
    event: body.event,
    properties: body.properties ?? {},
    ip,
    userAgent,
  });

  appendAnalyticsEvent({
    ts: new Date().toISOString(),
    event: body.event as import("@/lib/analytics/events").AnalyticsEventName,
    properties: body.properties ?? {},
  });

  try {
    await persistAnalyticsEvent(
      body.event as import("@/lib/analytics/events").AnalyticsEventName,
      body.properties ?? {}
    );
  } catch (error) {
    // DB write failures should not block product flows.
    console.warn("[analytics] failed to persist event to DB, using in-memory fallback only", error);
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}

export async function GET(request: NextRequest) {
  const days = toNumber(request.nextUrl.searchParams.get("days"), 7);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  let events = listAnalyticsEvents(since);
  let source: "memory" | "database" | "mixed" = "memory";
  try {
    const dbEvents = await fetchAnalyticsEventsSince(since);
    if (dbEvents.length > 0) {
      events = dbEvents.map((event) => ({
        ts: event.ts.toISOString(),
        event: event.event as import("@/lib/analytics/events").AnalyticsEventName,
        properties: event.properties,
      }));
      source = "database";
    } else if (events.length > 0) {
      source = "mixed";
    } else {
      source = "database";
    }
  } catch (error) {
    console.warn("[analytics] failed to read DB events, using in-memory summary", error);
    source = "memory";
  }

  const rows = ["all", ...LANDING_VARIANTS, "unknown"].map((variant) => {
    const scoped = variant === "all"
      ? events
      : events.filter((event) => {
          const value = event.properties.variant;
          const eventVariant = typeof value === "string" ? value : "unknown";
          return eventVariant === variant;
        });

    const count = (name: string) => scoped.filter((event) => event.event === name).length;
    const views = count(ANALYTICS_EVENTS.landingViewed);
    const ctaClicks = count(ANALYTICS_EVENTS.landingCtaClick);
    const consultStarts = count(ANALYTICS_EVENTS.consultationStarted);
    const consultCompletions = count(ANALYTICS_EVENTS.consultationCompleted);

    return {
      variant,
      sampleSize: scoped.length,
      views,
      ctaClicks,
      consultStarts,
      consultCompletions,
      returnVisits: count(ANALYTICS_EVENTS.returnVisit),
      summaryShares: count(ANALYTICS_EVENTS.summaryShared),
      ctaRate: views > 0 ? ctaClicks / views : 0,
      completionRate: consultStarts > 0 ? consultCompletions / consultStarts : 0,
    };
  });

  return NextResponse.json(
    {
      since: since.toISOString(),
      days,
      source,
      eventsCaptured: events.length,
      notes: [
        source === "database"
          ? "Summary is backed by AnalyticsEvent rows in Postgres."
          : "Summary currently includes in-memory events (runtime-local).",
        "If DB persistence is unavailable, endpoint falls back to in-memory events to avoid data loss in active sessions.",
      ],
      rows,
    },
    { status: 200 }
  );
}
