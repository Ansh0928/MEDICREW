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

### Active

- [ ] Patient onboarding: collect medical history, known conditions, medications, emergency contacts
- [ ] Named care team visible on patient dashboard (Dr. Alex, Dr. Sarah, etc. with avatars + specialties)
- [ ] Proactive check-in system: agents send async "How are you feeling?" follow-up messages after consultations
- [ ] Care team status indicators: "Dr. Sarah is reviewing your case", "Dr. Alex checked your symptoms today"
- [ ] Monitoring dashboard: symptoms trend over time, active care plan, red flag alerts
- [ ] Streaming consultation UI: real-time agent responses with agent identity visible (who is speaking)
- [ ] Escalation system: agents detect worsening patterns and escalate urgency with patient notification
- [ ] Patient health profile: vitals history, medication tracker, symptom journal
- [ ] AI Evidence integration: agent answers backed by medical literature citations (PubMed/guidelines)
- [ ] Australian compliance layer: AHPRA scope-of-practice disclaimers, emergency referral (000), Privacy Act 1988
- [ ] PostgreSQL/Supabase migration: replace SQLite for production-ready persistence
- [ ] Real agent memory: agents remember prior consultations and personalize responses
- [ ] Push/email notifications: patient notified when care team has an update

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

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LangGraph over PydanticAI | Already integrated with 8 agents — reuse, don't rewrite | — Pending |
| Supabase for prod DB | PostgreSQL compliance, real-time subscriptions for care team status | — Pending |
| Patient-first UX pivot | Heidi = doctor tool; Medicrew = patient experience platform | — Pending |
| Named doctors with personalities | Patients trust named, consistent doctors more than anonymous AI | — Pending |

---
*Last updated: 2026-03-26 — Phase 1 complete (Foundation + Compliance)*
