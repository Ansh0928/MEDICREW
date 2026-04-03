# Experiment Decision Log

Use this file to keep two experiments per week with explicit stop rules and decisions.

| Date       | Experiment                                               | Hypothesis                                                                  | Primary Metric                                  | Sample Threshold | Result  | Decision |
| ---------- | -------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- | ---------------- | ------- | -------- |
| 2026-03-27 | Hero copy: speed vs follow-up value                      | Follow-up-oriented promise improves consultation completion quality         | `consultation_completed / consultation_started` | 300 sessions     | Pending | Pending  |
| 2026-03-27 | CTA label: Start consultation vs Start free consultation | More explicit label improves CTA click-through without hurting auth success | `landing_cta_click / landing_page_sessions`     | 300 sessions     | Pending | Pending  |

## Pre-registration Checklist

- State metric and stop condition before launch.
- Avoid overlapping copy experiments on the same surface.
- Keep one variant as control for at least one full week.
- Document rollout and rollback steps.

## Readout Endpoint

- Use `/api/analytics?days=7` to inspect variant-level CTR and completion rates.
- Variant assignment is cookie-based (`mc_lpv`) with optional query override (`?lpv=speed|specialist|reassurance`).
