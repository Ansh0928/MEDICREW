# Medicrew

## What This Is

Medicrew is an AI-powered patient care platform where a swarm of named specialist AI doctors monitors and guides patients through their health journey. Patients interact with a persistent care team — Dr. Alex (GP), Dr. Sarah (Cardiology), Dr. Maya (Mental Health), and others — who proactively check in, track symptoms, and make patients feel genuinely monitored by real doctors. Built for the Australian healthcare market.

## Core Value

Patients feel continuously monitored and cared for by a real medical team — not talking to a chatbot.

## Requirements

### Validated

- ✓ Multi-specialist AI agent swarm (triage, GP, cardiology, mental health, dermatology, orthopedic, gastro, physiotherapy) — existing
- ✓ Patient consultation flow: symptom intake → triage → specialist routing → care recommendation — existing
- ✓ Patient portal with auth, consultation history, notification inbox — existing
- ✓ Doctor portal with login — existing
- ✓ LangGraph orchestrator with named agents (Alex AI — GP, Sarah AI — Cardiology, etc.) — Phase 1
- ✓ Prisma data model (Patient, Consultation, Doctor, Notification, PatientConsent) + PostgreSQL — Phase 1
- ✓ Landing page with hero, how-it-works, meet-the-team sections — existing
- ✓ Supabase PostgreSQL migration (ap-southeast-2) + RLS on all tables — Phase 1 (COMP-06, INFRA-01, INFRA-02)
- ✓ LangGraph PostgresSaver checkpointing + Inngest background job infrastructure — Phase 1 (INFRA-03, INFRA-04)
- ✓ AHPRA compliance: "Alex AI — GP" naming, AHPRA_DISCLAIMER, emergency rules engine (000 referral) — Phase 1 (COMP-01–03)
- ✓ Privacy Act consent gate, data export (APP 12), soft-delete account deletion — Phase 1 (COMP-04, COMP-05)

### Active (Phase 3 Complete — Validated in Phase 3: Proactive Care Loop)

- ✓ Patient onboarding: collect medical history, known conditions, medications, emergency contacts — Phase 2 (ONBD-01, ONBD-02, ONBD-03)
- ✓ Named care team visible on patient dashboard (Alex AI — GP, Sarah AI — Cardiology, etc. with emoji + specialties) — Phase 2 (DASH-01, DASH-02)
- ✓ Care team status indicators: "Dr. Alex checked your symptoms today" via CareTeamStatus + Supabase Realtime — Phase 2 (DASH-01, DASH-04)
- ✓ Consultation history display on patient dashboard — Phase 2 (DASH-03)
- ✓ Streaming consultation UI: real-time agent responses with AgentOverlay (who is speaking) — Phase 2 (CONS-01, CONS-02, CONS-03)
- ✓ AHPRA-compliant CareSummary: structured recommendation, disclaimer on every summary — Phase 2 (CONS-04)
- ✓ Patient health profile: conditions, medications, allergies, emergency contact, GP details — Phase 2 (PROF-01, PROF-02)
- ✓ Symptom journal: severity 1-5, notes, 30-entry history — Phase 2 (PROF-03)
- ✓ Inngest 48h check-in job: durable sleep, opt-out toggle, in-app notification from primary agent — Phase 3 (CHKN-01, CHKN-02, CHKN-03, CHKN-04)
- ✓ Escalation rules engine: Better/Same/Worse + free text, emergency override, urgency tiers, CareTeamStatus update — Phase 3 (ESCL-01, ESCL-02, ESCL-03)
- ✓ Notification inbox UI: categorized check-in cards, unread badge, Better/Same/Worse interactive response — Phase 3 (NOTF-01, NOTF-02)
- ✓ Resend email: escalation alerts + check-in follow-ups with AHPRA disclaimer — Phase 3 (NOTF-03)
- ✓ Doctor monitoring queue: urgency-sorted Prisma-backed queue, MonitoringQueue component on doctor portal — Phase 3 (ESCL-03)

### Remaining (Phase 4: Retention + Polish)

- [ ] AI Evidence integration: agent answers backed by medical literature citations (PubMed/guidelines)
- [ ] Real agent memory: agents remember prior consultations and personalize responses
- [ ] Retention features: appointment reminders, progress tracking, health trends

### Out of Scope

- EMR/EHR push-to-chart (FHIR R4) — complex integration, v2
- Real-time video/audio consultations (Coviu/Telehealth) — separate product, v2
- Medicare billing integration — regulatory complexity, post-launch
- Mobile native app (iOS/Android) — web-first, mobile later
- Multi-tenancy / clinic licensing — v2 SaaS feature
- ICD-10 medical coding — v2
- Prescription writing — AHPRA scope boundary, legally requires real GP

## Context

- **Existing stack**: Next.js 14 + TypeScript + Tailwind + shadcn/ui + LangGraph + LangChain + Groq/Ollama/OpenAI + Prisma (SQLite)
- **Agents use LangChain LLM abstraction** — supports Groq, Ollama, Google GenAI, OpenAI; createModel() factory
- **Blueprint reference**: User-built Heidi Health feature map (AI Scribe, Evidence Chat, Tasks, Patient Comms) as inspiration
- **Target market**: Australian patients, especially rural access + specialist wait times
- **Compliance**: AHPRA scope of practice, Privacy Act 1988, My Health Record Act (read-only for now), 000 emergency referral
- **User goal**: "AI agents acting like doctors in a swarm so patients feel monitored by a real doctor"
- **Loop requirement**: Continuous health check → auto-fix → improvement suggestions

## Constraints

- **Tech stack**: Extend existing Next.js 14 + LangGraph + LangChain — do not swap frameworks
- **Package manager**: bun only (no npm/yarn/pnpm)
- **Database**: Migrate from SQLite → Supabase PostgreSQL for production; keep SQLite for dev
- **Compliance**: All agent outputs must include AHPRA-compliant scope-of-practice disclaimers
- **Safety**: Emergency signals (chest pain, suicide, stroke) must always escalate to 000 — hard rule, not optional

## Key Decisions

| Decision                         | Rationale                                                           | Outcome   |
| -------------------------------- | ------------------------------------------------------------------- | --------- |
| LangGraph over PydanticAI        | Already integrated with 8 agents — reuse, don't rewrite             | — Pending |
| Supabase for prod DB             | PostgreSQL compliance, real-time subscriptions for care team status | — Pending |
| Patient-first UX pivot           | Heidi = doctor tool; Medicrew = patient experience platform         | — Pending |
| Named doctors with personalities | Patients trust named, consistent doctors more than anonymous AI     | — Pending |

---

_Last updated: 2026-03-26 — Phase 3 complete (Proactive Care Loop — 10/10 requirements verified)_
