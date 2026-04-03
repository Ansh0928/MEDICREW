"use client";

import type {
  AnalyticsEventPayload,
  AnalyticsEventName,
} from "@/lib/analytics/events";
import { LANDING_VARIANT_COOKIE } from "@/lib/marketing/landing-variants";

function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${name}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.split("=").slice(1).join("="));
}

export async function trackEvent(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
): Promise<void> {
  const variant = getCookieValue(LANDING_VARIANT_COOKIE);
  const mergedProperties = {
    ...(properties ?? {}),
    ...(variant ? { variant } : {}),
  };
  const payload: AnalyticsEventPayload = {
    event,
    properties: mergedProperties,
  };

  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const body = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/analytics", body);
      return;
    }

    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Analytics must never block user flow.
  }
}
