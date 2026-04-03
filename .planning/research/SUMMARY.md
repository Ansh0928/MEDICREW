# Research Summary: Medicrew AI Patient Care Platform

**Synthesized:** 2026-03-26
**Source files:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Overall confidence:** HIGH (compliance), HIGH (stack), HIGH (architecture), MEDIUM (feature prioritization)

---

## Recommended Stack

| Layer               | Technology                                                 | Rationale                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database            | Supabase PostgreSQL (prod) / SQLite (dev)                  | Only option that bundles PostgreSQL + Realtime + Auth + Storage as one managed service; Sydney (ap-southeast-2) region required for AU health data sovereignty |
| ORM                 | Prisma v6.x (already installed)                            | Keep as-is; migration is a provider swap only — no ORM change                                                                                                  |
| Real-time           | Supabase Realtime (Postgres Changes)                       | Powers care team status indicators without a separate WebSocket server                                                                                         |
| LLM Streaming       | Vercel AI SDK v6 + `@ai-sdk/langchain` adapter             | Already installed; `toUIMessageStream()` bridges LangGraph streams to `useChat` hook                                                                           |
| Agent Memory        | `@langchain/langgraph-checkpoint-postgres` (PostgresSaver) | Thread-per-consultation checkpointing; official LangChain package                                                                                              |
| Cross-thread Memory | Custom `patient_memory` table via Prisma                   | LangGraph InMemoryStore + DB sync; fallback if community checkpointer goes stale                                                                               |
| Background Jobs     | Inngest v4                                                 | Durable step-level retries for multi-step LLM workflows; zero extra infra on Vercel                                                                            |
| Email               | Resend + React Email                                       | DKIM/SPF built-in; critical for healthcare email deliverability                                                                                                |
| Auth                | Supabase Auth via `@supabase/ssr`                          | Only auth system that integrates cleanly with Supabase Realtime user-scoped channels                                                                           |
| SSE Streaming       | Next.js Route Handler                                      | Correct primitive for unidirectional LLM token streams on Vercel serverless                                                                                    |

**Key package additions:**

```bash
bun add @supabase/supabase-js @supabase/ssr inngest resend @react-email/components @ai-sdk/langchain @skroyc/langgraph-supabase-checkpointer
```

**Remove after migration:** `better-sqlite3`, `@prisma/adapter-better-sqlite3`

---

## Table Stakes Features

Must ship before any real users see the product. Missing these makes the product broken or legally non-compliant.

| Feature                                                      | Status | Notes                                                                           |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------- |
| Symptom intake / consultation flow                           | Exists | Already built                                                                   |
| Consultation history (patient-visible)                       | Exists | Already built                                                                   |
| Secure auth with session management                          | Exists | Migrate to Supabase Auth                                                        |
| Mobile-responsive UI                                         | Exists | Test and verify                                                                 |
| Emergency escalation to 000                                  | Build  | Hard-coded deterministic rules — NOT LLM inference                              |
| AHPRA scope-of-practice disclaimers                          | Build  | Must appear on every agent output; hard-coded into prompt templates             |
| Privacy Act / data collection notice                         | Build  | Onboarding screen before any symptom intake                                     |
| AI disclosure (explicit, persistent)                         | Build  | Non-dismissible disclosure on every agent interaction                           |
| Data export + deletion flow                                  | Build  | Required under APP 12 (access) and APP 11 (destruction) — OAIC enforcement risk |
| Patient onboarding: medical history, conditions, medications | Build  | Feeds agent context; required for personalization from session 1                |

**Differentiators that define the product (build after table stakes):**

1. Named care team dashboard with avatars and status indicators — highest "feels monitored" ROI
2. Proactive 48h post-consultation check-in — single biggest differentiator vs. a chatbot
3. Persistent agent memory across consultations — continuity of care feeling
4. Symptom journal (patient self-entry) — high retention, low complexity
5. Worsening pattern escalation — high value but requires consultation history first

**Defer to v2:** My Health Record integration, Medicare billing, wearable integration, web push (PWA), medical literature RAG citations

---

## Critical Compliance Requirements (AU)

These are legal obligations, not product features. Non-compliance triggers regulatory shutdown before product finds market fit.

### TGA — Software as Medical Device (CRITICAL)

- **Risk:** Medicrew's agents do symptom triage, specialist routing, and care recommendations — functions that fall within TGA's SaMD definition under the Therapeutic Goods Act 1989.
- **Required action (Phase 1, pre-launch):** Commission a TGA SaMD classification assessment from a regulatory affairs specialist.
- **Mitigation:** Scope all agent outputs as "health information" not diagnosis. Remove diagnostic language from prompts, UI copy, and marketing. Do not use words: "diagnose," "treat," "monitor [disease]."
- **Safe framing:** "Based on similar symptoms, you may want to speak with a doctor about X" — not "you have condition Y."
- **Consequence of non-compliance:** Forced market withdrawal, civil penalties, 6–18 month ARTG registration backlog.

### AHPRA — Advertising and Practitioner Representation (CRITICAL)

- **Risk:** Presenting named AI agents (Dr. Alex, Dr. Sarah) with professional titles and "is reviewing your case" status to patients without clear AI disclosure violates AHPRA's Health Practitioner Regulation National Law.
- **Required action (Phase 1):**
  - Remove "Dr." title from all AI agent names in user-facing surfaces — use "Alex (AI Health Specialist)" or similar
  - Add mandatory, non-dismissible AI disclosure on every agent interaction: "Alex is an AI assistant. For urgent medical needs, call 000 or see a GP."
  - Onboarding must obtain explicit informed consent that the care team is AI-powered
  - All marketing copy requires legal review against AHPRA Advertising Guidelines before publication
- **Consequence:** AHPRA investigation, advertising compliance orders, ACL breach for misleading representations.

### Privacy Act 1988 / Australian Privacy Principles (HIGH)

- **The $3M exemption does NOT apply** to health service providers — Medicrew is subject to the Privacy Act regardless of revenue.
- **Required before storing any patient data:**
  - Supabase project region confirmed as `ap-southeast-2` (Sydney) — not US-east
  - Data Processing Agreements (DPAs) with all overseas LLM providers (OpenAI, Groq) covering patient health data
  - Patient consent for overseas data processing (LLM API calls leave Australia)
  - Health Privacy Policy covering APPs 1–13
  - Privacy Impact Assessment (PIA) before launch
  - Notifiable Data Breach (NDB) incident response plan
- **Patient rights to build:** Data export (APP 12), data deletion (APP 11) — must be functional in patient portal from day one.

### Spam Act 2003 (MEDIUM)

- Proactive check-in messages (email, push) require explicit opt-in consent separate from general terms.
- Every outbound message must include a functional unsubscribe mechanism (5 business day requirement).
- Do not send check-ins to patients who have not completed at least one consultation.

### My Health Record Act (MEDIUM — defer)

- Cannot query MHR without ADHA software conformance testing and participation agreement.
- Do not build any MHR integration until ADHA registration is complete. Defer to v2.

---

## Architecture Build Order

Each step enables the next. Do not skip ahead.

| Phase                                          | Steps                                                                                                                                                                                                                                  | What It Delivers                                                                          | Pitfalls to Avoid                                                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1: Foundation**                        | 1. Migrate DB to Supabase PostgreSQL (Sydney region); add `CareTeamStatus`, `CheckIn`, `PatientMemory` tables. 2. Enable RLS on all health-data tables with test suite. 3. Integrate `PostgresSaver` into existing consultation graph. | Persistent, realtime-capable storage; memory-enabled consultations                        | RLS misconfiguration; Supabase region not set to ap-southeast-2; checkpoint bloat strategy undesigned                              |
| **Phase 1: Compliance layer**                  | 4. AHPRA disclaimers in all agent prompt templates. 5. Emergency escalation deterministic rules (keyword + regex, not LLM). 6. Privacy consent flow in onboarding. 7. Data export + deletion endpoints.                                | Legal minimum to show any user the product                                                | Using LLM for emergency detection; missing AI disclosure on any patient-facing surface                                             |
| **Phase 2: Core "Feels Monitored" Experience** | 8. Patient onboarding flow + PatientMemory initial write. 9. CareTeamStatus writes + Supabase Realtime subscription in dashboard. 10. SSE streaming for reactive consultation with agent identity surfaced.                            | The product's core emotional value — named AI care team, live status, streaming responses | Polling instead of Realtime; sharing one thread_id across consultations; injecting full history into every LLM call                |
| **Phase 3: Proactive Care Loop**               | 11. Inngest setup + CheckIn graph + cron trigger (48h post-consultation). 12. Resend email notifications. 13. Escalation graph + 6h cron scan.                                                                                         | The differentiator: system-initiated care vs. chatbot                                     | Proactive messages without Spam Act opt-in; LLM-only escalation without rules layer; no adversarial testing of emergency detection |
| **Phase 4: Retention + Depth**                 | 14. Symptom journal (patient self-entry). 15. Symptom trend chart. 16. Active care plan on dashboard.                                                                                                                                  | Retention loop; patient agency; visual evidence of monitoring                             | Scope creep beyond what compliance has been established for                                                                        |

**Architecture data flow (two modes):**

Reactive (patient initiates): `POST /api/consultation/start` → writes CareTeamStatus → `graph.stream()` with PostgresSaver thread → SSE to client → on complete: write Consultation + Notification + CareTeamStatus → Supabase Realtime pushes update to dashboard.

Proactive (system initiates): `Vercel Cron → /api/checkin/trigger` (CRON_SECRET protected) → query due patients → load PatientMemory → invoke CheckIn graph → write Notification → Resend email + Supabase Realtime push.

**Anti-patterns to actively avoid:**

- Polling care team status from the client (use Supabase Realtime instead)
- Running check-in logic synchronously inside a consultation request
- Reusing one `thread_id` across multiple consultations
- Putting emergency escalation inside a graph node (make it imperative post-graph code)
- Loading raw consultation history into every LLM call (use PatientMemory summary)

---

## Watch Out For

Top pitfalls ranked by severity and probability.

**1. TGA SaMD Classification Without Assessment**
Shipping a symptom triage + care recommendation system without TGA classification review is the single highest-risk action. Do the assessment in Phase 1 before any public launch. Consult a regulatory affairs specialist — not legal generalists. Cost of getting this wrong: forced market withdrawal.

**2. AHPRA "Real Doctors" UX Violation**
Using "Dr." titles for AI agents and care team status messages without mandatory AI disclosure is an active advertising breach AHPRA scans for automatically. Fix: rename agents (no "Dr." prefix), add non-dismissible disclosure on every view. Trust research confirms disclosure increases trust — it is not a conversion killer.

**3. LLM Emergency Detection False Negatives**
Using LLM reasoning to detect chest pain, suicidal ideation, or stroke symptoms will miss cases. Build a deterministic keyword/regex rules layer that runs before the LLM pipeline and fires an unconditional "call 000" response. Test with 50+ adversarially phrased prompts before any real user sees the system.

**4. Privacy Act Obligations at Infrastructure Level**
Supabase must be on `ap-southeast-2` (Sydney) before storing patient data. All LLM provider DPAs must be in place and patient consent obtained for overseas processing. RLS policies must be written, tested, and audited after every schema migration. Missing any of these is a notifiable data breach waiting to happen.

**5. LangGraph Checkpoint Bloat**
Default LangGraph checkpointing writes state at every superstep — at production scale this causes PostgreSQL write amplification and query degradation within weeks. Configure exit-mode checkpointing (checkpoint only on run completion), store large RAG payloads in Supabase Storage (not in state), and implement a 90-day checkpoint pruning job before any production load.

---

## Open Questions

Unresolved decisions the roadmap must gate on or flag for validation.

| Question                                                                                                                                | Stakes                                                                                     | When to Resolve                                         |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| TGA SaMD classification outcome — does Medicrew fall under Class I, IIa, or Excluded?                                                   | Determines whether public launch is legal as-is or requires ARTG registration              | Phase 1 gate — block launch until answered              |
| Remove "Dr." from agent names entirely, or add "(AI)" suffix?                                                                           | AHPRA compliance + product trust balance                                                   | Phase 1, before any user-facing build of agent personas |
| Which LLM provider(s) will be used? Do their DPAs cover AU health data? (OpenAI, Groq, Anthropic)                                       | Privacy Act APP 8 compliance; data sovereignty                                             | Before any patient data is processed by LLM             |
| Supabase region — is the existing project on ap-southeast-2?                                                                            | Health data sovereignty — cannot store patient data in US region                           | Phase 1, before migration                               |
| Is the `@skroyc/langgraph-supabase-checkpointer` community package sufficient, or should a custom `BaseCheckpointSaver` be implemented? | Build vs. buy risk; community package has no LangChain SLA                                 | Phase 1, before memory architecture is locked           |
| Will NSW patients be in scope? (NSW HRIP Act adds a separate layer on top of Privacy Act)                                               | Legal scope of privacy compliance                                                          | Before launch; requires legal review if NSW is targeted |
| What is the scope gate for the "continuous monitoring loop"?                                                                            | Prevents scope creep from expanding feature set before compliance is established           | Roadmap planning — apply MoSCoW before any sprint       |
| Doctor / clinical governance: is any real practitioner involved in reviewing escalation outputs?                                        | "Human-in-the-loop" for high-urgency outputs is an AHPRA principle; also reduces liability | Phase 3 (escalation system) design decision             |

---

## Confidence Assessment

| Area                                     | Confidence | Basis                                                                                               |
| ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| Stack                                    | HIGH       | Official Supabase, Prisma, Vercel AI SDK, Inngest, and LangGraph docs verified                      |
| Compliance (TGA, AHPRA, Privacy Act)     | HIGH       | Official AU regulatory sources; OAIC May 2025 guide; TGA 2025 compliance update                     |
| Architecture patterns                    | HIGH       | Verified against official LangGraph.js docs, Supabase Realtime docs, production template            |
| Feature prioritization                   | MEDIUM     | Product judgment + peer-reviewed trust research; no direct AU health AI product benchmarks          |
| Escalation graph design                  | MEDIUM     | Pattern derived by analogy from LangGraph fraud detection; no direct healthcare LangGraph reference |
| Vercel Cron reliability                  | MEDIUM     | Vercel docs verified; idempotency requirement noted but untested against this codebase              |
| `@skroyc` checkpointer community package | MEDIUM     | npm verified, 710/710 test pass rate, but community-maintained — monitor for abandonment            |

**Gaps:**

- No verified data on typical TGA SaMD classification timeline for an AU health AI startup (6–18 months is estimate)
- No benchmark on Groq/OpenAI DPA adequacy for Australian health data — requires direct review of provider agreements
- NSW HRIP Act compliance scope not researched in depth — flag if NSW patients are in scope

---

## Sources (Aggregated)

**Regulatory (HIGH confidence):**

- AHPRA AI in Healthcare Guidance: https://www.ahpra.gov.au/Resources/Artificial-Intelligence-in-healthcare.aspx
- OAIC Guide to Health Privacy (May 2025): https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/guide-to-health-privacy
- TGA AI and SaMD Regulation: https://www.tga.gov.au/products/medical-devices/software-and-artificial-intelligence
- Modernising My Health Record (Sharing by Default) Act 2025 FAQ: https://www.health.gov.au/resources/publications/frequently-asked-questions-modernising-my-health-record-sharing-by-default-act-2025

**Stack (HIGH confidence):**

- Supabase Realtime with Next.js: https://supabase.com/docs/guides/realtime/realtime-with-nextjs
- Prisma + Supabase integration: https://supabase.com/docs/guides/database/prisma
- Vercel AI SDK — LangChain adapter: https://ai-sdk.dev/providers/adapters/langchain
- Inngest on Vercel: https://vercel.com/marketplace/inngest
- @langchain/langgraph-checkpoint-postgres: https://www.npmjs.com/package/@langchain/langgraph-checkpoint-postgres

**Research (HIGH confidence):**

- PMC: Chatbot Persona and Patient Trust: https://pmc.ncbi.nlm.nih.gov/articles/PMC9932873/
- MIT Medical Hallucination in Foundation Models (2025): https://medical-hallucination2025.github.io/
- LangGraph JS GitHub Issue #1138 (checkpoint bloat): https://github.com/langchain-ai/langgraphjs/issues/1138
