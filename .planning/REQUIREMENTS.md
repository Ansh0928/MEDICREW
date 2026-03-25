# Requirements: Medicrew

**Defined:** 2026-03-26
**Core Value:** Patients feel continuously monitored and cared for by a real medical team — not talking to a chatbot.

## v1 Requirements

### Compliance & Safety

- [ ] **COMP-01**: Every agent response includes an AHPRA-compliant scope-of-practice disclaimer ("health information, not diagnosis")
- [ ] **COMP-02**: AI agents are identified as AI in all contexts — agent names use "AI" suffix (e.g., "Dr. Alex AI" or "Alex AI — GP") never bare "Dr." title
- [ ] **COMP-03**: Emergency signals (chest pain, suicidal ideation, stroke FAST symptoms, severe allergic reaction) trigger deterministic keyword/rules detection before any LLM processing, with mandatory 000 referral
- [ ] **COMP-04**: Patient onboarding includes explicit consent for: data collection, AI-provided health guidance, LLM providers processing data overseas, optional proactive check-ins
- [ ] **COMP-05**: Patient can export their data (APP 12) and request account deletion with full cascade from patient portal
- [ ] **COMP-06**: Supabase project locked to Sydney region (ap-southeast-2) for Privacy Act APP 8 compliance

### Database & Infrastructure

- [ ] **INFRA-01**: SQLite replaced with Supabase PostgreSQL — all Prisma models migrated, connection uses `DATABASE_URL` (pooled) + `DIRECT_URL` (direct for migrations)
- [ ] **INFRA-02**: Supabase Row Level Security (RLS) enabled — patients can only read/write their own records
- [ ] **INFRA-03**: `@langchain/langgraph-checkpoint-postgres` installed and configured as consultation thread checkpointer
- [ ] **INFRA-04**: Inngest configured for durable background job execution (proactive check-ins, escalation scanning)

### Patient Onboarding

- [ ] **ONBD-01**: Patient can complete onboarding profile: name, date of birth, gender, known conditions, current medications, emergency contact, GP details
- [ ] **ONBD-02**: Onboarding includes consent step with clear Privacy Act disclosure (what data, why, who it goes to)
- [ ] **ONBD-03**: Patient care team is introduced during onboarding — named AI agents with avatars, specialties, and "I'm here to help with..." descriptions

### Care Team Dashboard

- [ ] **DASH-01**: Patient dashboard shows their named care team with live status indicators (e.g., "Alex AI — GP: Reviewed your symptoms today")
- [ ] **DASH-02**: Dashboard displays active care plan — current monitoring status, next check-in scheduled, open action items
- [ ] **DASH-03**: Dashboard shows consultation history with urgency levels, agent names who participated, and outcome summary
- [ ] **DASH-04**: Real-time care team status updates via Supabase Realtime — no polling, updates within 2 seconds of agent activity

### Consultation Experience

- [ ] **CONS-01**: Consultation UI shows which AI agent is currently speaking — agent name, avatar, specialty badge visible during streaming
- [ ] **CONS-02**: Agent responses stream in real-time via SSE — patient sees text appear progressively, not all-at-once
- [ ] **CONS-03**: After triage, patient can see which specialists are reviewing their case ("Dr. Sarah AI — Cardiology is reviewing")
- [ ] **CONS-04**: Consultation ends with a structured Care Summary: urgency, what agents found, next steps, timeframe, disclaimer

### Patient Health Profile

- [ ] **PROF-01**: Patient has a persistent health profile page — known conditions, medications, allergies, consultation history summary
- [ ] **PROF-02**: Agents access patient profile context at consultation start — personalized responses ("I see you have a history of asthma")
- [ ] **PROF-03**: Symptom journal: patient can log daily symptoms (1-5 severity + free text) between consultations

### Proactive Check-ins

- [ ] **CHKN-01**: After each consultation, an Inngest job schedules a 48-hour follow-up check-in from the primary agent
- [ ] **CHKN-02**: Check-in message sent as in-app notification: "Hi [Name], this is Alex AI — GP. How are you feeling since your consultation on [date]?"
- [ ] **CHKN-03**: Patient can respond to check-in (quick options: Better / Same / Worse + optional free text)
- [ ] **CHKN-04**: Patient can opt out of proactive check-ins from their profile settings

### Escalation & Monitoring

- [ ] **ESCL-01**: Deterministic escalation rules engine: if patient response contains emergency keywords, immediately send high-priority notification + 000 referral
- [ ] **ESCL-02**: Care status escalation: if patient reports "Worse" on check-in, urgency tier increases and specialist agent is notified in patient's care status
- [ ] **ESCL-03**: Doctor portal shows a monitoring queue — all active patients with their last check-in status, urgency level, and last agent activity

### Notifications

- [ ] **NOTF-01**: In-app notification system: care team updates, check-in requests, escalation alerts, new consultation summaries
- [ ] **NOTF-02**: Email notifications via Resend: check-in follow-ups, escalation alerts, weekly care summary (opt-in)
- [ ] **NOTF-03**: Unread notification badge on patient portal nav

## v2 Requirements

### Clinical Documentation (Heidi-style)

- **SCRIBE-01**: AI Scribe — real-time transcription of patient-described symptoms with SOAP note generation
- **SCRIBE-02**: Evidence chat — AI answers backed by PubMed citations and clinical guidelines
- **TEMPL-01**: Note templates per specialty (200+ specialty presets)

### Integrations

- **INT-01**: My Health Record integration (ADHA conformance) — read-only patient history import
- **INT-02**: FHIR R4 push-to-chart for Best Practice / Medical Director
- **INT-03**: AI phone agent via Twilio — handles scheduling calls, basic triage over phone

### Scale

- **SCALE-01**: Multi-language support (priority: Mandarin, Vietnamese, Arabic for AU demographics)
- **SCALE-02**: Clinic multi-tenancy — multiple GP practices on one platform
- **SCALE-03**: TGA ARTG registration (pending SaMD classification outcome)
- **SCALE-04**: Medicare billing integration

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real prescription writing | AHPRA scope boundary — requires registered GP, legally excluded |
| Video/audio consultations | Separate telehealth product (Coviu integration), complex regulatory path |
| Bare "Dr." titles without AI disclosure | AHPRA advertising breach — all personas must be clearly identified as AI |
| LLM-only emergency detection | Patient safety failure mode — must use deterministic rules layer |
| SQLite in production | Not scalable, no real-time, no RLS — Supabase only in prod |
| OpenAI/Groq for sensitive PII without DPA | Privacy Act APP 8 — requires documented DPA before use with real patient data |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMP-01–06 | Phase 1 | Pending |
| INFRA-01–04 | Phase 1 | Pending |
| ONBD-01–03 | Phase 2 | Pending |
| DASH-01–04 | Phase 2 | Pending |
| CONS-01–04 | Phase 2 | Pending |
| PROF-01–03 | Phase 2 | Pending |
| CHKN-01–04 | Phase 3 | Pending |
| ESCL-01–03 | Phase 3 | Pending |
| NOTF-01–03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after initialization*
