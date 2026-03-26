# MediCrew — Session Prompts

Copy the relevant block, paste it as your first message.

---

## SESSION 1 — CTO Audit + Swarm Auth (copy this whole block)

```
You are acting as a hands-on CTO auditing MediCrew before continuing feature work.

Project: MediCrew — AI triage platform. Next.js 14, TypeScript, Prisma, Clerk auth, Groq LLMs, Supabase ap-southeast-2.
Package manager: always bun. Never npm/yarn/pnpm.

STEP 1 — Read context files first:
1. TASKS.md — full task board
2. docs/agent-review.md — all known bugs
3. src/app/api/swarm/start/route.ts
4. src/agents/swarm.ts
5. src/agents/orchestrator.ts
6. src/app/api/consult/route.ts
7. src/components/consult/HuddleRoom.tsx
8. src/app/doctor/page.tsx

STEP 2 — Audit every DONE item in TASKS.md. Check the actual code. Flag anything wrong with file:line.
Specifically verify:
- detectEmergency() fires before any LLM in BOTH /api/swarm/start AND /api/consult
- Promise.all used in specialistNode() in orchestrator.ts (not a for loop)
- Non-streaming /api/consult fetches patient profile and passes it to runConsultation()
- CareTeamStatus uses msg.content.substring(0,200) not a generic template string
- HuddleRoom has onSwarmStateChange prop and emits leadSwarms + mdtMessages + currentPhase
- onSwarmStateChange is wired in src/app/doctor/page.tsx

STEP 3 — Run: bun run test. Confirm 225 pass.

STEP 4 — C2 auth decision. Ask the user:
"Swarm auth is still unimplemented. Two options:
  A (recommended): Remove the /api/swarm/start fetch from HuddleRoom. Route patients through /api/consult?stream=true instead — it already has auth, DB writes, and Inngest. Swarm becomes internal-only.
  B: Add getAuthenticatedPatient() + prisma.consultation.create() + Inngest fire directly to /api/swarm/start (same pattern as /api/consult).
Which do you want?"
Then implement whichever the user picks.

STEP 5 — After C2 is done: commit, mark SESSION 1 done in TASKS.md, update 00-context.md.

Compliance hard rules (never break these):
- detectEmergency() MUST run before any LLM call
- Agent names: "X AI — Specialty" format, no bare "Dr."
- Supabase region: ap-southeast-2
```

---

## SESSION 2 — Doctor Portal: Tabs + Progress Steps + Top Bar (copy this whole block)

```
You are building the remaining Heidi Health-inspired UI features on the MediCrew doctor portal.

Project: MediCrew — AI triage platform. Next.js 14, TypeScript, Tailwind, shadcn/ui, Clerk auth.
Package manager: always bun. Never npm/yarn/pnpm.

STEP 1 — Read context files first:
1. TASKS.md — find SESSION 2 tasks
2. src/app/doctor/page.tsx — current doctor page
3. src/components/consult/HuddleRoom.tsx — to understand SSE events + state
4. src/components/layout/Sidebar.tsx — to add doctor profile
5. docs/superpowers/specs/2026-03-26-mirofish-swarm-design.md sections 7 and 8 — the spec

STEP 2 — Run: bun run test. Confirm tests pass before touching anything.

STEP 3 — Build these 4 things in order:

TASK A: Progress steps bar
- New component: src/components/consult/ProgressSteps.tsx
- Steps: Triage | Specialists | Residents | Debate | Rectification | MDT | Results
- Accept `currentPhase: SwarmPhase` prop, highlight active step
- Mount it above the HuddleRoom circle in doctor/page.tsx
- Pass currentPhase from swarmState.currentPhase

TASK B: Workspace tabs
- Add tab bar to src/app/doctor/page.tsx: "Team Huddle" | "Patient Profile" | "Notes"
- Team Huddle tab = existing HuddleRoom (default)
- Patient Profile tab = fetch from /api/patient/profile, show age/conditions/meds/allergies in a clean card layout
- Notes tab = placeholder "Generate Note" button (Session 3 wires the real logic)

TASK C: Top bar enhancement
- In src/app/doctor/page.tsx, make the patient header bar show urgency badge dynamically
- Urgency comes from swarmState.triage?.urgency (already in SwarmState)
- Add "Book Appointment" button (href="/doctor/book") and "Share" button (copies URL to clipboard)

TASK D: Doctor profile in sidebar
- In src/components/layout/Sidebar.tsx, add doctor avatar + name at the bottom
- Use Clerk useUser() to get name + imageUrl
- Show as small avatar + truncated name beneath the nav items

After each task: bun run test, commit with descriptive message, mark done in TASKS.md.
After all tasks: update 00-context.md with what was done and next step.
```

---

## SESSION 3 — SOAP Notes Generation (copy this whole block)

```
You are building the SOAP clinical notes feature for MediCrew — the core Heidi Health-inspired feature.

Project: MediCrew — AI triage platform. Next.js 14, TypeScript, Prisma, Groq LLMs.
Package manager: always bun. Never npm/yarn/pnpm.

STEP 1 — Read context files first:
1. TASKS.md — find SESSION 3 tasks
2. prisma/schema.prisma — understand the Consultation model
3. src/app/api/portal/ — existing portal routes for pattern reference
4. src/lib/ai/config.ts — LLM helpers (createFastModel, createJsonModel)

STEP 2 — Run: bun run test. Confirm pass count before touching anything.

STEP 3 — Build in order:

TASK A: Add notes field to Consultation model
- In prisma/schema.prisma, add: notes Json?
- Run: bunx prisma migrate dev --name add-consultation-notes
- Run: bunx prisma generate

TASK B: Notes generation API — POST /api/portal/notes/generate
- File: src/app/api/portal/notes/generate/route.ts
- Auth: getAuthenticatedPatient() — only the patient's own consultation
- Input: { consultationId }
- Look up Consultation + messages from DB
- LLM prompt: generate SOAP note from synthesis data
  S: patient's reported symptoms (verbatim from consultation)
  O: objective findings (red flags, hypothesis confidence scores from swarm)
  A: assessment — ranked differentials
  P: plan — next steps from synthesis
- Append to every note: "⚠️ AI-generated clinical note. Review before use. Not a substitute for professional clinical judgement."
- Save to consultation.notes via prisma.consultation.update
- Return { notes: string }

TASK C: NotesPanel component
- File: src/components/doctor/NotesPanel.tsx
- Props: { consultationId: string; isComplete: boolean }
- If isComplete: show "Generate Note" button → POST /api/portal/notes/generate → display result
- Display SOAP note in pre-formatted card with section headers (S / O / A / P)
- "Copy" button (navigator.clipboard) + "Regenerate" button
- Loading state while generating

TASK D: Wire NotesPanel into the Notes tab
- In src/app/doctor/page.tsx, import NotesPanel
- Pass consultationId (from swarmState or a static ID for now) + isComplete (synthesis_complete received)

TASK E: Real sessions data
- In src/components/layout/SessionsColumn.tsx, replace MOCK_PATIENTS
- Fetch from existing /api/portal/symptom-checks or create GET /api/portal/patients
- Show real patient name + urgency from latest consultation

After each task: bun run test, commit, mark done in TASKS.md.
After all tasks: update 00-context.md.
```

---

## SESSION 4 — Bug Fixes + Launch Prep (copy this whole block)

```
You are doing final bug fixes and launch preparation for MediCrew.

Project: MediCrew — AI triage platform. Next.js 14, TypeScript, Prisma, Clerk, Vercel, Supabase ap-southeast-2.
Package manager: always bun. Never npm/yarn/pnpm.

STEP 1 — Read context files first:
1. TASKS.md — find SESSION 4 tasks
2. src/app/api/swarm/followup/route.ts — the broken follow-up route
3. src/agents/swarm.ts — contains buildResidentPrompt() and runResident()
4. docs/agent-review.md — H1 and H2 bug details

STEP 2 — Run: bun run test. Confirm pass count.

STEP 3 — Fix H1: complex follow-up routing (file: src/app/api/swarm/followup/route.ts)
Problem: when questionType === "complex", the route ignores relevantResidentRoles and always uses createFastModel() directly. Complex questions need the specialist swarm.
Fix: for complex questions, call buildResidentPrompt() + runResident() for each role in relevantResidentRoles (both functions exist in swarm.ts — read their signatures first), then synthesise across results.
After fix: bun run test, commit.

STEP 4 — Fix H2: SSE buffering (file: src/agents/swarm.ts — streamSwarm())
Problem: events are pushed to an array and flushed all at once after each phase's Promise.all resolves. Client sees 30–60s silence then a flood of events.
Fix: replace the array buffer + yield* flush() pattern with a concurrent async queue that yields events inline as each emit() call fires. Read the current implementation fully before redesigning.
After fix: bun run test, commit.

STEP 5 — Resolve L1: src/agents/doctorConsultation.ts
Run: grep -r "doctorConsultation" src/
If nothing imports it: delete it. If something imports it: read the importer and wire or replace.
bun run test after.

STEP 6 — Launch checklist (go through each item, report pass/fail):
[ ] bun run build — zero errors, zero warnings
[ ] bun run test — all pass
[ ] detectEmergency() before LLM in /api/consult — grep to confirm
[ ] detectEmergency() before LLM in /api/swarm/start — grep to confirm
[ ] No bare "Dr." in agent names — grep: grep -r '"Dr\.' src/agents/
[ ] AGENT_COMPLIANCE_RULE in all specialist prompts — grep: grep -r 'AGENT_COMPLIANCE_RULE' src/agents/definitions/
[ ] Supabase region ap-southeast-2 — check DATABASE_URL in .env.example
[ ] Clerk webhook registered (tell user to do this in Clerk dashboard: URL=/api/auth/webhook, event=user.created)
[ ] CLERK_WEBHOOK_SECRET in Vercel env vars (remind user)
[ ] TGA SaMD assessment (remind user: external regulatory requirement before real users)

STEP 7 — Final commit: "chore: launch checklist complete"
Update TASKS.md — mark SESSION 4 done.
Update 00-context.md — note launch readiness and any remaining blockers.
```
