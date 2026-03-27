# MediCrew KPI Scorecard (AU-First)

## Primary KPI

- Retention-quality outcome rate = users with a completed consultation who return within 14 days and complete a follow-up action.

## Secondary KPIs

- Landing CTA click-through rate
- Auth start to auth success rate
- Onboarding step completion rate (step 1, 2, 3)
- Consultation start to consultation completion rate
- Summary share rate (GP/family share action)
- Week-2 return rate

## Baseline Event Model

Events are logged through `/api/analytics`:

- `landing_cta_click`
- `landing_secondary_click`
- `auth_intent_click`
- `onboarding_step_completed`
- `consultation_started`
- `consultation_completed`
- `consultation_errored`
- `summary_shared`
- `return_visit`

## Weekly Review Questions

1. Where is the largest conversion leak this week?
2. Are emergency/consent boundaries causing user confusion that copy can solve?
3. Did return-visit quality improve after landing or onboarding changes?
4. Which acquisition segment produced highest completion and follow-up quality?

## Weekly Readout API

- Use `GET /api/analytics?days=7` for per-variant conversion readouts.
- Response includes:
  - `source` (`database`, `memory`, or `mixed`)
  - variant rows with `ctaRate` and `completionRate`
- Database-backed events are stored in the `AnalyticsEvent` table and survive restarts/deploys.

## Baseline SQL Starter Queries

These are starter queries for data warehouse or BI extraction once analytics logs are piped to storage.

```sql
-- Consultation completion trend (daily)
SELECT date_trunc('day', created_at) AS day,
       COUNT(*) AS consultations,
       COUNT(*) FILTER (WHERE recommendation IS NOT NULL) AS completed
FROM "Consultation"
GROUP BY 1
ORDER BY 1 DESC;
```

```sql
-- 14-day return proxy from patient activity
WITH first_consult AS (
  SELECT patient_id, MIN(created_at) AS first_consult_at
  FROM "Consultation"
  GROUP BY 1
),
returns AS (
  SELECT f.patient_id
  FROM first_consult f
  JOIN "Consultation" c
    ON c.patient_id = f.patient_id
   AND c.created_at > f.first_consult_at
   AND c.created_at <= f.first_consult_at + INTERVAL '14 days'
  GROUP BY 1
)
SELECT
  (SELECT COUNT(*) FROM returns)::float
  / NULLIF((SELECT COUNT(*) FROM first_consult), 0) AS return_rate_14d;
```
