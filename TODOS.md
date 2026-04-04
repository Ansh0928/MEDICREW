# TODOS.md — MediCrew Deferred Work

Items deferred from Sessions E–F CEO review. Each has a priority (P1–P4) and a rationale.
Items marked ✅ are complete. Items without ✅ are not yet started.

---

## P1 — Critical / Pre-Launch

- ✅ **Doctor access scoping by clinic/org** — Clinic model + FK on Doctor/Patient. Auto-assign removed from all 4 doctor routes. Seed tooling + 15 regression tests. _(Shipped 2026-04-04)_
- [ ] **Audit existing Patient.clinicId assignments** — Before any clinic pilot, audit production DB: `SELECT id, email, "clinicId" FROM "Patient" WHERE "clinicId" IS NOT NULL` in Supabase. Verify each assignment was intentional (not from the auto-assign hack). Reset incorrect rows to null. Privacy Act data integrity risk. _(Eng review 2026-04-04: added after auto-assign removal)_
- [ ] **TGA SaMD assessment** — External process required before public launch. MediCrew may qualify as a Software as a Medical Device (SaMD) under TGA regulation. Engage a regulatory consultant. Not a code task.
- [ ] **AHPRA-safe agent naming audit** — Verify all 7 lead agents and 4 residents follow "Alex AI — GP" format (em dash, contains "AI") in every prompt and UI surface. _(Compliance)_

## P2 — High Value / Next Sprint

- [ ] **LLM fallback chain** — If Groq is unavailable or returns an error, fall back to Ollama (local) then graceful degradation message. `createModel()` in `src/lib/ai/config.ts` is the injection point. _(Reliability)_
- [ ] **Consultation PDF download** — Add a "Download PDF" button to the patient consultation summary page. Use `@react-pdf/renderer` or `jsPDF`. SynthesisCard already has the content. _(Patient portal UX)_
- [ ] **Demo consultation IDs in development** — HuddleRoom in doctor portal uses hardcoded symptoms. Need a dev-mode selector to pick from existing DB consultations to test the full flow. _(Developer experience)_
- [ ] **Doctor list pagination (frontend)** — `/api/doctor/patients` now returns max 50. The patient list UI has no pagination controls. Add skip/take pagination or infinite scroll. _(Scale)_
- [ ] **`/api/swarm/followup` sessionId** — Currently the client sends `"current"` as sessionId. Need to capture a real `session_id` SSE event from `/api/swarm/start` and pass it to follow-up. _(Correctness)_

## P3 — Polish / Non-Blocking

- [ ] **Voice input for symptoms** — Microphone icon in consultation intake. Use Web Speech API or Whisper via backend. Requires WebRTC permission flow. _(Requires user research before building)_
- [ ] **How It Works interactive demo / Lottie animation** — Marketing page shows static steps. A Lottie or CSS animation would increase conversion. _(Marketing polish)_
- [ ] **Patient journal chart view** — Severity entries are shown as a list. A sparkline/trend chart would surface patterns. _(Patient portal UX)_
- [ ] **Notification bell badge count** — The bell icon shows no unread count. Query `Notification.read = false` count on load. _(Patient portal UX)_
- [ ] **Check-in response UI** — `CheckIn` model has `response: "better" | "same" | "worse"` but there's no patient-facing UI to respond. Wire the 48h Inngest notification to a response button. _(Patient engagement)_

## P4 — Future / Post-MVP

- [ ] **FHIR/HL7 export** — Export consultation as FHIR R4 Bundle for practice software integration. _(Requires clinic partner to validate format)_
- [ ] **Practice software integration** — Best Health, Medical Director, Genie webhook or plugin. _(Requires partner agreements)_
- [ ] **Multilingual support** — i18n framework (next-intl). Priority languages: Mandarin, Vietnamese, Arabic. _(Requires translation budget)_
- [ ] **AHPRA audit trail export** — Doctor portal export of all AI-generated outputs with timestamps for audit purposes. _(Compliance, post-launch)_

---

_Last updated: 2026-04-04 — clinic access scoping shipped; data audit TODO added_
