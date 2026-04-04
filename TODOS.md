# TODOS.md — MediCrew Deferred Work

Items deferred from Sessions E–F CEO review. Each has a priority (P1–P4) and a rationale.
Items marked ✅ are complete. Items without ✅ are not yet started.

---

## P1 — Critical / Pre-Launch

- ✅ **Doctor access scoping by clinic/org** — Clinic model + FK on Doctor/Patient. Auto-assign removed from all 4 doctor routes. Seed tooling + 15 regression tests. _(Shipped 2026-04-04)_
- ✅ **Audit existing Patient.clinicId assignments** — Queried prod DB 2026-04-04: 0 patients with clinicId. Auto-assign hack never fired in production. Clean slate. _(Verified 2026-04-04)_
- [ ] **LLM error handling in /api/test-consult** — Before /try goes live, add: try/catch around Groq call returning `{ error: "Service temporarily unavailable", status: 503 }`, 15s hard timeout, 1x retry on Groq 429, module-init validation of `GROQ_API_KEY`, fail-open behavior if Upstash rate limiter is unreachable. Currently all Groq failures return raw 500. _(Trust Validation Sprint P1 blocker — CEO review 2026-04-04)_
- [ ] **AGENT_COMPLIANCE_RULE injection in /try prompts** — Both Version A and Version B system prompts must include `AGENT_COMPLIANCE_RULE` from `src/lib/compliance.ts`. Currently missing from all prompt specs. AHPRA non-compliance risk before any patient-facing URL. _(CEO review 2026-04-04)_
- [ ] **TGA SaMD assessment** — External process required before public launch. MediCrew may qualify as a Software as a Medical Device (SaMD) under TGA regulation. Engage a regulatory consultant. Not a code task.
- [ ] **AHPRA-safe agent naming audit** — Verify all 7 lead agents and 4 residents follow "Alex AI — GP" format (em dash, contains "AI") in every prompt and UI surface. _(Compliance)_

## P2 — High Value / Next Sprint

- [ ] **A/B test analytics dashboard** — Query showing Version A vs. Version B helpful rate in real-time: `SELECT variant, COUNT(*) total, SUM(CASE WHEN helpful THEN 1 ELSE 0 END) helpful_count, ROUND(100.0 * SUM(CASE WHEN helpful THEN 1 ELSE 0 END) / COUNT(*), 1) helpful_pct FROM "AbFeedback" GROUP BY variant;`. Run directly against Neon DB via Prisma Studio or psql. Required to monitor the A/B test toward n≥150/variant. _(Trust Validation Sprint — CEO review 2026-04-04; updated for Neon/Prisma 2026-04-04)_
- [ ] **Outcome follow-up for /try no-auth users** — After a /try consultation, ask "How did that turn out?" 48h later. Creates the only supervised health AI dataset in AU (MediCrew prediction vs GP reality). Requires: ephemeral session token or email collection, Privacy Act consent flow, new Inngest trigger (existing CheckIn is tied to Patient FK — needs redesign for no-auth context). Defer until after A/B test validates demand. _(Trust Validation Sprint deferred — CEO review 2026-04-04)_
- [ ] **LLM fallback chain** — If Groq is unavailable or returns an error, fall back to Ollama (local) then graceful degradation message. `createModel()` in `src/lib/ai/config.ts` is the injection point. Note: Ollama fallback does NOT work on Vercel serverless — ensure graceful user-facing error is the real fallback path in production. _(Reliability)_
- [ ] **Consultation PDF download** — Add a "Download PDF" button to the patient consultation summary page. Use `@react-pdf/renderer` or `jsPDF`. SynthesisCard already has the content. _(Patient portal UX)_
- [ ] **Demo consultation IDs in development** — HuddleRoom in doctor portal uses hardcoded symptoms. Need a dev-mode selector to pick from existing DB consultations to test the full flow. _(Developer experience)_
- [ ] **Doctor list pagination (frontend)** — `/api/doctor/patients` now returns max 50. The patient list UI has no pagination controls. Add skip/take pagination or infinite scroll. _(Scale)_
- [ ] **`/api/swarm/followup` sessionId** — Currently the client sends `"current"` as sessionId. Need to capture a real `session_id` SSE event from `/api/swarm/start` and pass it to follow-up. _(Correctness)_

## P3 — Polish / Non-Blocking

- [ ] **Full HotDoc/Healthengine API integration** — Replace the /try GP handoff deep-link with a proper referral API that sends pre-triaged patient context to a booking system. Revenue model: referral fee per booking or clinic SaaS subscription. Requires HotDoc partnership agreement + API access (not public). _(Deferred until demand validated — CEO review 2026-04-04)_

- [ ] **Voice input for symptoms** — Microphone icon in consultation intake. Use Web Speech API or Whisper via backend. Requires WebRTC permission flow. _(Requires user research before building)_
- [ ] **How It Works interactive demo / Lottie animation** — Marketing page shows static steps. A Lottie or CSS animation would increase conversion. _(Marketing polish)_
- [ ] **Patient journal chart view** — Severity entries are shown as a list. A sparkline/trend chart would surface patterns. _(Patient portal UX)_
- [ ] **Notification bell badge count** — The bell icon shows no unread count. Query `Notification.read = false` count on load. _(Patient portal UX)_
- [ ] **Check-in response UI** — `CheckIn` model has `response: "better" | "same" | "worse"` but there's no patient-facing UI to respond. Wire the 48h Inngest notification to a response button. _(Patient engagement)_

- [ ] **/try sunset decision** — After A/B test concludes (n≥150/variant), decide what /try becomes: public marketing demo, gated behind auth, or removed. Currently a permanent public unauthenticated endpoint with no auth and 5 req/IP/hour rate limit. Needs a decision before it becomes a support or liability burden. _(Eng review 2026-04-04)_

## P4 — Future / Post-MVP

- [ ] **RLS policy cleanup in initial Prisma migration** — `prisma/migrations/0001_supabase_init/migration.sql` contains `CREATE POLICY` statements using Supabase's `auth.uid()` function, which doesn't exist on Neon. Dead code since Supabase migration. Requires a new migration to drop the policies and update the init file comment. Not blocking — harmless on Neon. _(Eng review 2026-04-04)_
- [ ] **FHIR/HL7 export** — Export consultation as FHIR R4 Bundle for practice software integration. _(Requires clinic partner to validate format)_
- [ ] **Practice software integration** — Best Health, Medical Director, Genie webhook or plugin. _(Requires partner agreements)_
- [ ] **Multilingual support** — i18n framework (next-intl). Priority languages: Mandarin, Vietnamese, Arabic. _(Requires translation budget)_
- [ ] **AHPRA audit trail export** — Doctor portal export of all AI-generated outputs with timestamps for audit purposes. _(Compliance, post-launch)_

---

_Last updated: 2026-04-04 — Eng review: Supabase removed (Neon/Prisma throughout), analytics dashboard updated for Neon, /try sunset (P3) and RLS cleanup (P4) added, eval now in-sprint_
