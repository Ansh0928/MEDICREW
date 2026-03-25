# Feature Landscape: AI Patient Care Platform

**Domain:** AI-powered patient monitoring and proactive care — Australian market
**Researched:** 2026-03-26
**Confidence:** HIGH (compliance), MEDIUM (feature prioritization), MEDIUM (persona trust research)

---

## Table Stakes

Features users expect from any credible AI health platform. Missing these and the product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Symptom intake / consultation flow | Core interaction model — without it there is no product | Low | Already exists in Medicrew |
| Consultation history (patient-visible) | Patients need a record of what was said and recommended | Low | Already exists |
| Push / email notifications | Patients expect to be notified when something happens to their case | Low | In active requirements |
| Emergency escalation to 000 | Non-negotiable safety floor — chest pain, stroke, suicidal ideation must always escalate | Low (logic), High (correctness) | Hard-coded rule, never skipped |
| AHPRA scope-of-practice disclaimers on every agent output | Required by AHPRA guidance — AI cannot diagnose, prescribe, or replace a practitioner | Low | Must appear on every recommendation |
| Privacy Act / data collection notice | Required before or at time of first data collection | Low | Must appear at onboarding |
| Secure auth with session management | Patients will not use a health app without it | Medium | Already exists |
| Mobile-responsive web UI | Majority of Australian patient web usage is mobile | Low | Next.js + Tailwind — just test it |
| Clear data deletion / export path | Required under Australian Privacy Principles (APP 12 — access, APP 11 — destruction) | Medium | OAIC enforcement risk if missing |

---

## Differentiators

Features that make Medicrew feel unlike every other AI health chatbot — specifically the "real doctor team" experience. These create the emotional core of the product.

### Tier 1: Core "Feels Like Real Doctors" Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Named care team visible on dashboard (Dr. Alex GP, Dr. Sarah Cardiology, etc.) | Patients trust named, consistent doctors more than anonymous AI — PMC research confirms avatar + name + personalized dialogue drives trust beyond title alone | Medium | Research finding: name + title alone is not enough; must include avatar and personalized dialogue to work |
| Persistent agent memory across consultations | Dr. Alex "remembers" your last check-in, your medications, your anxiety about a diagnosis — creates continuity of care feeling | High | Requires vector store or Supabase long-term memory per patient per agent |
| Care team status indicators | "Dr. Sarah is reviewing your case" — ambient presence signal; makes monitoring feel active not passive | Low | Purely UI state — easy win |
| Proactive async check-ins post-consultation | Agent sends "How are you feeling 48 hours after we spoke?" — mirrors what good GPs do | Medium | Scheduled job + agent invocation; no user trigger required |
| Agent identity visible during streaming responses | "Dr. Maya (Mental Health) says..." — maintains the persona illusion through the entire interaction | Low | Already partially in LangGraph; surface in UI |
| Patient onboarding: medical history, conditions, meds, emergency contacts | Agents need context to feel personal; collecting it up-front enables personalization from session 1 | Medium | Standard intake form + Prisma storage |
| Worsening pattern escalation with named agent notification | "Dr. Alex has flagged your symptoms as concerning — please call 000 or attend ED" — urgency from a named doctor is more compelling than a generic alert | High | Requires temporal pattern detection across consultations |

### Tier 2: Care Continuity Features

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Symptoms trend chart over time | Visual evidence the system is watching — patients see their own patterns | Medium | Chart.js / Recharts + querying consultation history |
| Active care plan visible on dashboard | "Your current plan from Dr. Alex" — frames AI output as an ongoing prescription, not a one-off answer | Medium | Care plan data model; could be agent-generated summary |
| Medication tracker | Patients with chronic conditions track adherence; creates a daily engagement hook | Medium | Simple CRUD + reminder logic |
| Medical literature citations in agent responses | "Based on RACGP guidelines..." — builds clinical credibility; Heidi's Evidence product is proof of demand | High | PubMed API / clinical guideline embeddings |
| Symptom journal (patient self-entry between consultations) | High retention driver — patients who log between sessions return more; data feeds agent context | Low | Simple form + history view; big engagement ROI |
| Real-time consultation streaming with visible agent identity | Removes "loading…" dead air; makes interaction feel live and attentive | Medium | Next.js streaming + LangGraph stream output |

### Tier 3: Trust Reinforcement (Australian-Specific)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Meet the Team" page with full agent bios and specialties | Sets expectations before first consultation; reduces uncanny valley effect of AI personas | Low | Already partially exists on landing page |
| Explicit AI disclosure on first use | Australian patients are skeptical; transparency ("This is an AI system, not a registered practitioner") before engagement builds trust rather than eroding it when discovered | Low | One-time modal + persistent footer note |
| Rural / remote access framing | 30% of Australians live outside metro areas; specialist wait times are 6–18 months; frame Medicrew as a bridge, not a replacement | Low | Copy and UX framing, not engineering |

---

## Anti-Features

Things to deliberately not build in this milestone. Either out-of-scope (already declared), regulatory hazards, or trust destroyers.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Prescription writing or medication recommendations | Requires a registered GP under TGA/AHPRA — AI cannot prescribe; criminal liability risk | Agent output should always say "discuss medication changes with your prescribing doctor" |
| Definitive diagnosis ("You have X") | AHPRA guidance: AI cannot diagnose; TGA SaMD Class II/III trigger risk | Frame all outputs as "possible" or "consistent with" + disclaimer; always recommend professional assessment |
| Storing raw consultation audio | TGA SaMD risk if audio is processed clinically; also massive privacy surface under Privacy Act APP 11 | Text transcription only, or don't capture audio at all for this milestone |
| Impersonating a real registered practitioner | Using real AHPRA registration numbers or implying agents are registered is fraudulent | Make AI nature visible on every interaction; use "Dr. Alex (AI)" not just "Dr. Alex" in formal contexts |
| My Health Record write access | Requires ADHA registration, compliance testing, and clinical governance framework — months of work | Read-only display only, post-launch v2 |
| Wearable / IoT device integration | Out-of-scope for web-first; creates TGA SaMD classification risk if used for clinical decisions | Log manually entered vitals only; no device APIs |
| Autonomous care decisions without human-in-loop flag | Violates AHPRA's core principle: "practitioners must apply human judgment to any AI output" | Every high-stakes recommendation must surface a "consult a doctor" prompt |
| Generic "AI assistant" branding | Undermines the "real doctor team" value proposition entirely | Always lead with named doctors and their specialties |

---

## Australian-Specific Compliance Requirements

These are not optional features — they are legal and regulatory obligations.

### AHPRA Obligations (HIGH confidence — official guidance published 2024)

| Requirement | What It Means for Medicrew | Implementation |
|-------------|---------------------------|----------------|
| AI disclosure to patients | Patients must know they are interacting with AI, not a registered practitioner | Persistent UI disclosure; onboarding consent modal |
| Scope-of-practice disclaimers | Every recommendation must clarify the AI cannot diagnose, prescribe, or replace clinical care | Footer on every agent output; hard-coded into agent prompt templates |
| Human judgment override | High-stakes outputs (red flags, escalations) must explicitly route to a real practitioner | 000 escalation + GP referral language on any red-flag trigger |
| No misrepresentation of qualifications | Agents cannot claim AHPRA registration | "Dr. Alex (AI)" framing; bio pages must say "AI specialist" not "registered doctor" |

### Privacy Act 1988 / Australian Privacy Principles (HIGH confidence — OAIC Guide updated May 2025)

| Requirement | What It Means for Medicrew | Implementation |
|-------------|---------------------------|----------------|
| Collection notice | Must be given before or at time of collecting health information | Onboarding screen before any symptom intake |
| Health information = sensitive information | Stricter rules apply — higher bar for consent, use, and disclosure | Explicit opt-in consent for each category (symptoms, medications, mental health) |
| Data sovereignty | Health data must not be processed outside Australia without explicit consent | LLM API calls go to OpenAI/Groq — must disclose in privacy policy that data may leave Australia; or use Ollama for sensitive fields |
| Access and correction rights (APP 12) | Patients can request all data held about them | Export endpoint required before launch |
| Destruction rights (APP 11) | Must destroy data on request | Account deletion must cascade to all health records |
| Mandatory Data Breach Notification | Breaches must be notified to OAIC and affected individuals | Supabase RLS + audit log + breach response SOP |

### My Health Record Act 2025 (MEDIUM confidence — Sharing by Default Act passed 2025)

| Requirement | What It Means for Medicrew | Implementation |
|-------------|---------------------------|----------------|
| Read access requires ADHA registration | Cannot query MHR without software conformance testing | Defer to v2; do not attempt read access without ADHA registration |
| Share by Default Act 2025 | New law increases sharing obligations for registered participants | Monitor ADHA developer portal; not blocking for current milestone |
| Penalties apply | Unauthorized access or failure to meet sharing rules has financial penalties | Do not build any MHR integration without ADHA sign-off |

### TGA Software as Medical Device (MEDIUM confidence — new guidance Feb 2026)

| Risk | Classification Trigger | Medicrew Risk Level |
|------|----------------------|---------------------|
| Symptom checker that outputs differential diagnoses | Potentially Class IIa SaMD | MEDIUM — frame as "information only", not diagnostic |
| Mental health chatbot with clinical decision support | TGA reviewing exclusions for digital mental health apps (2025) | HIGH — do not make clinical decisions; always refer to crisis line |
| Wearable data processing for clinical decisions | Class II/III SaMD | Avoid entirely this milestone |
| General wellness / patient education content | Excluded from TGA regulation | LOW — safe zone; frame content as education not diagnosis |

**Mitigation strategy:** Keep all agent outputs in the "general health information" category. Phrases like "you may have X" or "this could indicate Y" should always be followed by "this is not a diagnosis — please see a GP." This keeps Medicrew outside the SaMD definition under current TGA guidance.

---

## Feature Dependencies

```
Patient Onboarding (medical history) → Agent Memory → Personalized check-ins
Consultation History → Symptom Trend Chart → Worsening Pattern Detection → Escalation
Proactive Check-ins → Notification System (push/email)
Named Care Team (dashboard) → Care Team Status Indicators → Agent Identity in Streaming
AHPRA Disclaimers → Every agent output (non-optional dependency)
Emergency escalation (000) → Every red-flag trigger (non-optional dependency)
```

---

## MVP Recommendation for This Milestone

**Build these first** (highest "feels monitored" ROI, lowest compliance risk):

1. Patient onboarding: medical history, conditions, medications — feeds agent context immediately
2. Named care team dashboard with avatars, specialties, status indicators — core "real doctor" visual
3. AHPRA compliance layer in agent prompts — must ship before anything else goes live
4. Proactive post-consultation check-in (48h follow-up) — single biggest differentiator vs a chatbot
5. Symptom journal (self-entry) — high retention, low complexity, feeds agent memory

**Defer until agent memory is solid:**
- Worsening pattern detection / escalation system — requires temporal analysis across consultations; build after memory works
- Medical literature citations — PubMed integration is high complexity; implement after core loop is stable

**Defer to v2:**
- My Health Record integration — ADHA registration required
- Medicare billing
- Wearable integration

---

## Sources

- [AHPRA AI in Healthcare Guidance](https://www.ahpra.gov.au/Resources/Artificial-Intelligence-in-healthcare.aspx) — HIGH confidence
- [OAIC Guide to Health Privacy, May 2025](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/health-service-providers/guide-to-health-privacy) — HIGH confidence
- [TGA AI and Medical Device Software Guidance](https://www.tga.gov.au/products/medical-devices/software-and-artificial-intelligence/manufacturing/artificial-intelligence-ai-and-medical-device-software) — HIGH confidence
- [Modernising My Health Record (Sharing by Default) Act 2025 FAQ](https://www.health.gov.au/resources/publications/frequently-asked-questions-modernising-my-health-record-sharing-by-default-act-2025) — HIGH confidence
- [Heidi Health — AI Scribe, Evidence, Comms features](https://www.heidihealth.com/en-au) — MEDIUM confidence (product page, not technical docs)
- [Lyra Health Clinical-Grade AI Launch](https://www.lyrahealth.com/announcement/lyra-health-introduces-first-clinical-grade-ai-for-mental-health/) — MEDIUM confidence
- [PMC Research: Chatbot Persona and Patient Trust](https://pmc.ncbi.nlm.nih.gov/articles/PMC9932873/) — HIGH confidence (peer-reviewed)
- [Patients Say Yes to AI if Doctors Stay in Charge — CHCF](https://www.chcf.org/resource/patients-say-yes-artificial-intelligence-doctors-stay-charge/) — MEDIUM confidence
- [Cadence AI Proactive Care Engine](https://www.cadence.care/post/cadence-launches-ai-powered-proactive-care-engine-bringing-advanced-primary-care-management-to-medicare-patients-nationwide) — MEDIUM confidence
- [TGA SaMD Regulation Update 2026](https://www.lexology.com/library/detail.aspx?g=7511fc5f-84aa-4d0f-8f3b-8ce8345e2d7a) — MEDIUM confidence
