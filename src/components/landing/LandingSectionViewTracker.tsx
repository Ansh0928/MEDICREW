"use client";

import { useEffect } from "react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

interface LandingSectionViewTrackerProps {
  sectionId: string;
  surface: string;
}

export function LandingSectionViewTracker({
  sectionId,
  surface,
}: LandingSectionViewTrackerProps) {
  useEffect(() => {
    const target = document.getElementById(sectionId);
    if (!target) return;

    let tracked = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || tracked || !entry.isIntersecting) return;
        tracked = true;
        trackEvent(ANALYTICS_EVENTS.landingSectionViewed, {
          sectionId,
          surface,
        });
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [sectionId, surface]);

  return null;
}
