# MediCrew — Improvement Plan
Generated: 2026-03-28 via /qa dogfood + Heidi Health research

---

## QA Findings (Fixed in this session)

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 001 | Marketing pages (pricing/trust/resources/cookies/terms/privacy/partners) missing Header/Footer | Medium | ✅ Fixed |
| 002 | Header anchor links (#how-it-works) broken on non-home pages | Medium | ✅ Fixed |
| 003 | Care Plan empty state missing CTA button | Medium | ✅ Fixed |
| 004 | HuddleRoom spinner never stops on swarm error | High | ✅ Fixed |

## QA Findings (Needs next session)

| # | Issue | Severity | Priority |
|---|-------|----------|----------|
| 005 | **CRITICAL: GROQ_API_KEY missing** — AI consultation hangs, no results shown | Critical | P0 |
| 006 | **No role-based access control** — demo patient can access /doctor portal | Critical | P0 |
| 007 | Patient portal shows "Loading..." blank on mobile | High | P1 |
| 008 | Consult page blank before swarm starts (no onboarding state, just empty area) | High | P1 |
| 009 | HuddleRoom care team section empty while swarm runs (agents not appearing) | High | P1 |
| 010 | Pricing page very bare — placeholder content, needs real tiers | Medium | P2 |
| 011 | Resources page cards are not clickable — dead links | Medium | P2 |
| 012 | Demo login button disabled until Clerk loads (slow visual) | Low | P3 |

---

## Phase 1: Critical Fixes (P0 — Do first)

### 1.1 GROQ API Key
Add to `.env.local`:
```
GROQ_API_KEY=your_key_here
```
Also add to Vercel dashboard. Test that AI consultation works end-to-end.

### 1.2 Role-Based Access Control
Current: middleware only checks Clerk auth (any authenticated user accesses any portal).
Fix: Add `role` metadata to Clerk users. Middleware checks role for `/doctor/*` vs `/patient/*`.

```ts
// In middleware.ts — after auth check:
const role = auth().sessionClaims?.metadata?.role;
if (pathname.startsWith('/doctor') && role !== 'doctor') redirect('/patient');
if (pathname.startsWith('/patient') && role !== 'patient') redirect('/doctor');
```

Requires seeding demo accounts with correct Clerk metadata roles.

---

## Phase 2: Patient Portal UX (Heidi Health-inspired)

### 2.1 Consultation History — Rich Cards
Current: "No consultations yet" empty state
Target (Heidi-style): Past consultation cards with:
- Symptom summary
- Date
- Key findings snippet
- "View full summary" expand
- Download as PDF button

### 2.2 Consultation Summary Page (`/patient/consultation/[id]`)
After a successful swarm: redirect to a full summary page with:
- Chief complaint
- Each specialist's key point (accordion)
- Recommended next steps (ordered list)
- "Book a GP" CTA (links to HotDoc/HealthEngine)
- Emergency escalation notice if any red flags

### 2.3 Symptom Journal
Current: API exists (`/api/patient/journal`) but no UI
Build: Simple daily check-in widget on patient portal
- "How are you feeling today?" (1–10 scale)
- Free text note
- Auto-populate from last consultation context
- Trend chart (sparkline over 30 days)

### 2.4 Care Plan — Populate from Synthesis
Current: Empty state
Target: After consultation, care plan auto-populates with:
- Active monitoring items
- Follow-up timeline
- Medication reminders (if mentioned)
- "Next check-in" countdown

### 2.5 Notification System — Make it Real
Current: "No notifications yet" empty state
Target: Real-time notifications for:
- 48h post-consultation check-in reminder (Inngest already fires this)
- Doctor message received
- Care plan updated
- Unread consultation summary ready

### 2.6 Mobile Patient Portal Fix
Root cause: `Loading...` screen on mobile — likely Clerk auth state hydration issue.
Fix: Add SSR-safe loading state with skeleton screens.

---

## Phase 3: AI Swarm UX Improvements

### 3.1 Live Streaming Agent Cards
Current: Agent nodes appear but care team area is largely blank during swarm
Target: Each agent card shows:
- Name + specialty
- Status: thinking → responding → done
- Last message preview (truncated)
- Typing indicator while processing

### 3.2 Synthesis Card — Richer Output
Current: Basic card with synthesis text
Improvements inspired by Nabla/Heidi:
- Structured sections: Summary / Red flags / Next steps / Follow-up
- Urgency badge (low/medium/high/emergency)
- Copy to clipboard
- "Share with GP" button (generates shareable PDF link)

### 3.3 Follow-Up UX
Current: Text input at bottom, routing decides simple/complex
Target:
- Suggested follow-up questions (chips) based on synthesis
- Clear distinction between "Ask a follow-up" and "Start new consultation"
- Visual indication when complex routing is used (shows which specialists are involved)

### 3.4 Swarm Debug Panel — Doctor-Facing
Current: "Awaiting swarm data..."
Target: Show real-time:
- Layer progress (1→7 with active/done states)
- Each layer's key output
- Timing per layer
- Emergency flags triggered

---

## Phase 4: Doctor Portal

### 4.1 Patient List — Real Data
Current: "No patient sessions found" (sidebar empty)
Fix: Wire to DB query for `Patient` records with recent `Consultation` records.
Show: patient name, symptom summary, date, urgency level.

### 4.2 Patient Profile Tab
Currently loads but basic. Needs:
- Full consultation history timeline
- Known conditions + medications from onboarding
- Risk flags from swarm outputs

### 4.3 Notes Tab — Functional
Current: Appears to exist but not wired
Target: Doctor can write structured notes on a patient case. Saves to DB.

### 4.4 Book Appointment CTA
Top bar shows "Book Appointment" button. Wire to:
- Docly/HotDoc integration (MVP: mailto: or Calendly link)
- Or: generate a referral letter PDF from synthesis + doctor notes

---

## Phase 5: Landing Page + Marketing

### 5.1 Pricing Page — Real Tiers
Current: Two placeholder cards
Target (Heidi/Freed-style):
- Free tier: 3 consultations/month, basic summaries
- Pro: unlimited, PDF exports, symptom journal, priority processing — $29/mo
- Partner/Clinic: custom pricing, multi-patient, analytics dashboard

### 5.2 Resources — Clickable Cards
Current: 4 dead-link cards
Target: Each cluster links to a dedicated article page with:
- Symptom checklist
- When to call 000 vs see GP
- "Start a consultation about this" CTA

### 5.3 How It Works — Interactive Demo
Current: Static screenshots
Target: Animated walkthrough (Lottie or CSS) showing the 7-layer swarm processing
Inspired by: Heidi's demo-first homepage

### 5.4 Social Proof Section
Add: "Used by X patients" counter, testimonials (even if synthetic for beta), GP partnerships logos

---

## Phase 6: Heidi Health Feature Gaps

Based on research, Heidi Health has these features MediCrew lacks:

| Feature | Heidi | MediCrew | Gap Priority |
|---------|-------|----------|-------------|
| AI medical scribe (voice → notes) | ✅ | ❌ | P3 (doctor-side) |
| GP letter generation | ✅ | ❌ | P2 |
| Referral letter templates | ✅ | ❌ | P2 |
| Real-time consultation transcript | ✅ | partial | P1 |
| Patient intake forms | ✅ | partial (onboarding) | P1 |
| Integration with practice software | ✅ | ❌ | P4 (future) |
| Consultation summary PDF | ✅ | ❌ | P1 |
| Symptom tracking over time | ✅ | partial (journal API) | P2 |

### Nabla/Freed AI gaps:
| Feature | Gap Priority |
|---------|-------------|
| Voice input for symptoms | P2 |
| Multilingual support | P4 |
| FHIR/HL7 export | P4 |

---

## Health Score Summary

| Category | Score | Issues |
|----------|-------|--------|
| Console errors | 70 | Three.js WebGL (headless-only), Clerk dev keys |
| Functional | 35 | AI consultation broken (no GROQ key), RBAC missing |
| UX | 60 | Empty states OK, blank areas during swarm, mobile issue |
| Visual | 80 | Marketing pages now have nav, design is solid |
| Content | 50 | Pricing/resources placeholder |
| Accessibility | 70 | ARIA labels present, needs keyboard testing |
| Performance | 75 | Fast loads, swarm latency depends on Groq |

**Overall: 63/100** → Target after Phase 1+2: 85/100

---

## Execution Order for Next Session

```
Session A (30 min):
  1. Add GROQ_API_KEY to .env.local + test full swarm end-to-end
  2. Fix RBAC in middleware (patient/doctor role check)
  3. Fix mobile patient portal loading state

Session B (60 min):
  4. Consultation summary page /patient/consultation/[id]
  5. Symptom journal UI (daily check-in widget)
  6. Populate care plan from synthesis output

Session C (45 min):
  7. Doctor portal patient list from DB
  8. GP letter / referral PDF generation
  9. Consultation history rich cards

Session D (30 min):
  10. Pricing page real tiers
  11. Resources clickable article pages
  12. Social proof section on landing
```
