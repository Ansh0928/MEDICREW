# MediCrew — Task Board

> One session = one session block below. Start by reading this file.
> At session end: commit, mark tasks done, update 00-context.md.

---

## DONE ✅

- [x] 7-layer swarm architecture (L1–L7): triage → leads → residents → debate → rectification → MDT → synthesis
- [x] All 13 API routes: Clerk auth (`getAuthenticatedPatient()`)
- [x] Clerk webhook at `/api/auth/webhook` (creates Patient on user.created)
- [x] Sign-in page: Clerk `<SignIn>` component
- [x] HuddleRoom: agent circle animation, SVG debate lines, speech bubbles, live chat panel
- [x] AgentNode, HuddleConnections, HuddleChatPanel, RoutingChip, FollowUpBar, SynthesisCard
- [x] 3-column Heidi layout: AppShell, Sidebar, SessionsColumn
- [x] SwarmDebugPanel (doctor portal: hypothesis bars + MDT transcript)
- [x] SwarmState wired from HuddleRoom → SwarmDebugPanel via `onSwarmStateChange`
- [x] **C1 COMPLIANCE**: `detectEmergency()` fires before any LLM in both `/api/consult` + `/api/swarm/start`
- [x] **C3**: Deleted dead clarification scaffolding (`/api/swarm/answer`, `SwarmClarification`, `question_ready`)
- [x] **M1**: Non-streaming `/api/consult` injects patient context
- [x] **M2**: Specialist consultations run in parallel (`Promise.all`)
- [x] **M3**: CareTeamStatus uses real agent content

---

## SESSION 1 — CTO audit + C2 auth decision

**Goal:** Verify all DONE work is actually correct. Decide + implement swarm auth strategy.

- [x] **CTO AUDIT**: Read and verify every DONE item above — check the actual code, not just the checklist
  - [x] `detectEmergency()` fires before LLM — consult/route.ts:52, swarm/start/route.ts:33 PASS
  - [x] `Promise.all` in `specialistNode()` — orchestrator.ts:177 PASS
  - [x] Patient context passed to `runConsultation()` — consult/route.ts:170-178 PASS
  - [x] `onSwarmStateChange` wired — doctor/page.tsx:47, HuddleRoom emits leadSwarms + mdtMessages PASS
  - No failures found — all DONE items verified

- [x] **C2**: Implemented Option A (recommended)
  - HuddleRoom now calls `/api/consult` with `{ stream: true, swarm: true, patientInfo }` body
  - New `if (stream && swarm)` branch in consult/route.ts:72 — calls `streamSwarm()`, proxies SwarmEvent SSE, writes Consultation + fires Inngest after stream
  - `/api/swarm/start` is now internal-only (no patient-facing callers)

- [x] Confirm `bun run test` passes — 225/225 passing, 44 test files

---

## SESSION 2 — Doctor portal: workspace tabs + progress steps + top bar

**Goal:** Complete the Heidi-spec doctor workspace that is designed but not built.

- [ ] **Progress steps bar** in HuddleRoom (above the agent circle)
  - Steps: `Triage → Specialists → Residents → Debate → Rectification → MDT → Results`
  - Active step highlights as `phase_changed` SSE events fire
  - File: `src/components/consult/HuddleRoom.tsx` or new `ProgressSteps.tsx`

- [ ] **Workspace tabs**: `Team Huddle | Patient Profile | Notes`
  - `Team Huddle` tab = existing HuddleRoom (current default)
  - `Patient Profile` tab = read patient from `/api/patient/profile`, display age/conditions/meds/allergies
  - `Notes` tab = SOAP note generation (see Session 3)
  - File: update `src/app/doctor/page.tsx` to add tab bar above main workspace

- [ ] **Top bar** on doctor page
  - Patient name + date + urgency badge from swarm triage result
  - Action buttons: `Book Appointment` (link to booking), `Share` (copy link)
  - Update urgency badge reactively from `triage_complete` SSE event

- [ ] **Doctor profile** at bottom of Sidebar
  - Show logged-in doctor avatar + name (from Clerk `useUser()`)
  - File: `src/components/layout/Sidebar.tsx`

---

## SESSION 3 — SOAP notes generation (Heidi core feature)

**Goal:** After a consultation completes, generate a structured clinical note from the synthesis.

- [ ] **SOAP note API** — `POST /api/portal/notes/generate`
  - Input: `consultationId` (look up synthesis + messages from DB)
  - Use LLM to generate structured note:
    ```
    S: Subjective — patient's reported symptoms
    O: Objective — relevant findings from swarm (red flags, hypothesis confidence)
    A: Assessment — ranked differentials from synthesis
    P: Plan — next steps from synthesis
    ```
  - Store in `Consultation.notes` JSON field (add Prisma migration)
  - Compliance: note must include disclaimer ("AI-generated, review before use")

- [ ] **Notes tab UI** — `src/components/doctor/NotesPanel.tsx`
  - Shows "Generate Note" button after consultation completes
  - Displays SOAP note in formatted read-only view
  - "Copy to clipboard" button
  - "Regenerate" button

- [ ] **Sessions column: real data**
  - Replace `MOCK_PATIENTS` in `SessionsColumn.tsx` with fetch from `/api/portal/patients` (or existing route)
  - Show real patient name + urgency from latest consultation

---

## SESSION 4 — Follow-up fix + SSE streaming fix + launch prep

**Goal:** Fix the two remaining HIGH bugs, then launch checklist.

- [ ] **H1**: Fix complex follow-up routing
  - File: `src/app/api/swarm/followup/route.ts`
  - For `questionType === "complex"`: call `buildResidentPrompt()` + `runResident()` per `relevantResidentRoles` before synthesising
  - Both functions exist in `swarm.ts`

- [ ] **H2**: Fix SSE buffering (client sees 30–60s silence then all events at once)
  - File: `src/agents/swarm.ts` — `streamSwarm()`
  - Replace array buffer + `yield* flush()` with inline async queue
  - Non-trivial — allocate most of the session

- [ ] **L1**: Resolve `doctorConsultation.ts` — grep for imports, wire or delete

- [ ] **Launch checklist**:
  - Register Clerk webhook in dashboard (URL: `/api/auth/webhook`, event: `user.created`)
  - Add `CLERK_WEBHOOK_SECRET` to Vercel env vars
  - Confirm Supabase region `ap-southeast-2`
  - `bun run build` — zero warnings
  - TGA SaMD assessment reminder (external)

---

## Blockers (external — code cannot unblock these)

- Corpus embed: `DATABASE_URL=... NOMIC_API_KEY=... bun run scripts/embed-corpus.ts`
- Clerk dashboard: webhook registration
- TGA SaMD: external regulatory process
