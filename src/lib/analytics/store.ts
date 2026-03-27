import type { AnalyticsEventName } from "@/lib/analytics/events";

export type StoredAnalyticsEvent = {
  ts: string;
  event: AnalyticsEventName;
  properties: Record<string, unknown>;
};

const MAX_EVENTS = 10_000;

declare global {
  // eslint-disable-next-line no-var
  var __medicrewAnalyticsEvents: StoredAnalyticsEvent[] | undefined;
}

function getStore(): StoredAnalyticsEvent[] {
  if (!globalThis.__medicrewAnalyticsEvents) {
    globalThis.__medicrewAnalyticsEvents = [];
  }
  return globalThis.__medicrewAnalyticsEvents;
}

export function appendAnalyticsEvent(event: StoredAnalyticsEvent) {
  const store = getStore();
  store.push(event);
  if (store.length > MAX_EVENTS) {
    store.splice(0, store.length - MAX_EVENTS);
  }
}

export function listAnalyticsEvents(since: Date): StoredAnalyticsEvent[] {
  const sinceMs = since.getTime();
  return getStore().filter((item) => new Date(item.ts).getTime() >= sinceMs);
}
