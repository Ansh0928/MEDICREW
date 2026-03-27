export const ANALYTICS_EVENTS = {
  landingViewed: "landing_viewed",
  landingCtaClick: "landing_cta_click",
  landingSecondaryClick: "landing_secondary_click",
  authIntentClick: "auth_intent_click",
  onboardingStepCompleted: "onboarding_step_completed",
  consultationStarted: "consultation_started",
  consultationCompleted: "consultation_completed",
  consultationErrored: "consultation_errored",
  summaryShared: "summary_shared",
  returnVisit: "return_visit",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventPayload = {
  event: AnalyticsEventName;
  properties?: Record<string, unknown>;
};
