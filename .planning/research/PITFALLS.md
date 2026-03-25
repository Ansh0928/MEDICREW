# Domain Pitfalls: AI Patient Care Platform (Australian Market)

**Domain:** AI-powered multi-agent healthcare platform
**Researched:** 2026-03-26
**Confidence:** HIGH for compliance (verified with official AU sources); MEDIUM for LangGraph specifics (official docs + community); HIGH for UX trust risks (peer-reviewed research)

---

## Critical Pitfalls

Mistakes that cause regulatory shutdown, legal liability, or full rewrites.

---

### Pitfall 1: TGA Medical Device Classification Trap

**What goes wrong:**
Software intended to "monitor," "diagnose," or "recommend treatment" for a disease meets the TGA's definition of a Software as Medical Device (SaMD) under the Therapeutic Goods Act 1989. Medicrew's agents explicitly do symptom triage, specialist routing, care recommendations, and escalation — all functions that fall squarely within TGA's regulated scope. Shipping without ARTG registration exposes the product to forced market withdrawal and civil penalties.

**Why it happens:**
Founders assume the "it's just information, not diagnosis" defence holds. TGA explicitly rejected this: regulation is based on *intended purpose* as defined by the manufacturer, not the technology used. The AHPRA AI guidelines and TGA's 2025 compliance update both confirm AI tools that suggest diagnoses or treatments are regulated devices. TGA also began actively targeting AI health software in its 2025 compliance sweep.

**Consequences:**
- Forced withdrawal from Australian market
- Significant civil penalties under Therapeutic Goods Act 1989
- Retrospective ARTG registration is slow (6–18 months typical)
- Personal liability exposure for directors

**Prevention:**
- Conduct TGA SaMD classification assessment in Phase 1 (before public launch)
- Consult a TGA regulatory affairs specialist to determine classification risk level
- If classification risk is too high, scope agents explicitly as "health information tools" not diagnostic tools — rewrite agent system prompts to use language like "based on similar symptoms, you may want to speak with a doctor about X" rather than "you have condition Y"
- Document intended purpose carefully; do not use words like "diagnose," "treat," or "monitor [disease]" in marketing, UI, or system prompt outputs visible to users
- Consider the TGA's Excluded SaMD provisions: software used for administrative purposes or general wellness with no diagnostic function may qualify for exclusion

**Warning signs:**
- Agent outputs contain sentences like "Based on your symptoms, this is likely [condition]"
- Landing page or UI uses words like "monitored by doctors" in a diagnostic framing
- TGA classification questionnaire returns Class IIa or higher

**Phase mapping:** Phase 1 (pre-launch) — non-negotiable gate before public users

---

### Pitfall 2: AHPRA Advertising Violation — "Feels Like Real Doctors" UX

**What goes wrong:**
The core product value is explicitly "patients feel monitored by real doctors." This framing is a live AHPRA advertising compliance breach. AHPRA's Health Practitioner Regulation National Law prohibits advertising that is false, misleading, or deceptive. Presenting named AI agents (Dr. Alex, Dr. Sarah, Dr. Maya) with professional titles, avatars, and "is reviewing your case" status messages to patients who have not been clearly informed they are interacting with AI constitutes a potential deceptive representation of a regulated health service.

**Why it happens:**
The UX goal ("patients trust named, consistent doctors more than anonymous AI") is correct from a product standpoint, but collides with the legal requirement that patients must be informed when interacting with AI. AHPRA has confirmed it uses automated bots to scan websites for compliance violations. Research also shows patients feel deceived when they discover AI was used without disclosure — trust collapses entirely, not partially.

**Consequences:**
- AHPRA investigation and advertising compliance orders
- Reputational damage if media characterises product as "AI pretending to be real doctors"
- User trust collapse: research (Springer Nature, 2025) confirms trust is *higher* when AI is clearly disclosed versus covertly used
- Risk of ACL breach (Australian Consumer Law) for misleading representations

**Prevention:**
- Rebrand internal language from "feels like real doctors" to "your dedicated AI care team" — patients can still emotionally connect without being misled
- Every named agent interaction must include a persistent, non-dismissible disclosure: "Dr. Alex is an AI assistant. For urgent medical needs, call 000 or see a GP."
- Onboarding must explicitly obtain informed consent that the care team is AI-powered
- Remove the word "Dr." from agent names unless AHPRA-registered practitioners are involved — use first names only (Alex, Sarah, Maya) or titles like "AI Health Specialist"
- Consult AHPRA Advertising Guidelines before writing any marketing copy
- Apply same disclosure standards to notifications: "Your care team has an update" should read "Your AI care team has an update"

**Warning signs:**
- Any UI copy that implies human oversight without specifying it is AI
- "Dr." title used for AI agents anywhere in user-facing surfaces
- Onboarding flow lacks explicit AI disclosure before first consultation

**Phase mapping:** Phase 1 (MVP launch) — implement before any real users see the product

---

### Pitfall 3: LLM Hallucination as Medical Misinformation

**What goes wrong:**
LLMs generate plausible-sounding but factually incorrect medical information. In the Medicrew context, an agent citing a non-existent drug interaction, inventing a dosage, or fabricating a guideline reference could directly harm a patient. MIT research (2025) found leading LLMs repeat planted clinical errors in up to 83% of cases. Chain-of-thought prompting reduces but does not eliminate hallucination. The escalation system — detecting worsening symptom patterns — is especially high-risk: a false negative (failing to escalate when warranted) can have life-threatening consequences.

**Why it happens:**
RAG (Retrieval-Augmented Generation) with PubMed citations is listed as a feature requirement, but RAG does not prevent hallucination if the retrieval step fails, is incomplete, or if the LLM confabulates between retrieved documents. Agents drawing on patient history + live LLM inference create compounding failure modes.

**Consequences:**
- Patient harm from acting on incorrect medical advice
- Negligence liability (Australian courts apply ex-post negligence regimes for AI-caused harm)
- Regulatory sanctions from TGA if the product is classified as SaMD
- Catastrophic reputational damage

**Prevention:**
- Implement a mandatory "uncertainty disclosure" protocol: every agent output must include explicit confidence framing ("based on common patterns, not medical diagnosis")
- Never allow agents to state a specific diagnosis as fact — only symptom patterns and suggested follow-up actions
- PubMed/guideline citations must be fetched and verified via RAG on every response, not generated from model memory
- Emergency signal detection (chest pain, suicidal ideation, stroke symptoms) must use deterministic pattern-matching rules, NOT LLM inference — this is a hard rule
- Log all agent outputs with the retrieved source documents for audit trail
- Implement a "human-in-the-loop" escalation review path for any alert flagged as high-urgency before notification is sent to patient
- Test escalation logic with adversarial inputs before launch

**Warning signs:**
- Agent outputs include specific drug names, dosages, or medical codes without citation
- Escalation system relies solely on LLM reasoning rather than rules engine
- No source traceability between agent output and retrieved document

**Phase mapping:** Phase 2 (agent features) — must be designed in from the start, not retrofitted

---

### Pitfall 4: Privacy Act 1988 Health Data Obligations Underestimated

**What goes wrong:**
Health information is "sensitive information" under the Privacy Act 1988, subject to stricter obligations than ordinary personal data. Any entity that provides a health service — including AI-powered health platforms — is subject to the Privacy Act regardless of annual turnover (the $3M threshold exemption does NOT apply to health service providers). The OAIC's May 2025 health privacy guide confirms AI outputs containing personal health information are subject to APP obligations.

The My Health Record Act 2012 (amended by the Modernising My Health Record (Sharing by Default) Act 2025) adds a separate compliance layer for any integration with the My Health Record system.

**Why it happens:**
Startups treat privacy as a checkbox. For health data, it is an ongoing operational obligation with criminal penalties for serious or repeated breaches under the Privacy Act reforms.

**Consequences:**
- Notifiable Data Breach obligations: must notify OAIC and affected individuals within 30 days of awareness of eligible breach
- Regulatory investigation by OAIC
- Civil penalties under Privacy Act (2022+ reforms introduced significant penalty increases)
- My Health Record breaches must also be notified to Australian Digital Health Agency separately

**Prevention:**
- Appoint a Privacy Officer before collecting any patient health data
- Draft a Health Privacy Policy compliant with APPs 1–13, specifically covering: what data is collected, why, how long retained, overseas processing disclosures
- Any LLM API call that sends patient data to OpenAI/Groq/Google (overseas) requires either patient consent or a contractual commitment from the overseas processor to meet APP standards — check all provider Data Processing Agreements
- Supabase (Supabase Inc. is US-incorporated) — ensure Australian data residency (Supabase offers AWS ap-southeast-2 Sydney region; this must be enforced in project settings)
- Implement data minimisation: agents should not receive full patient history if only partial context is needed for the query
- Conduct Privacy Impact Assessment (PIA) before launch
- Build NDB incident response plan: detection → containment → OAIC notification → patient notification pipeline

**Warning signs:**
- LLM API calls contain patient names, DOB, or health conditions in plain text
- Supabase project region not confirmed as Sydney (ap-southeast-2)
- No documented DPA with OpenAI/Groq/Google covering patient data

**Phase mapping:** Phase 1 (infrastructure setup) — Supabase region, RLS, and DPAs must be in place before storing any patient data

---

### Pitfall 5: LangGraph Checkpoint Bloat at Production Scale

**What goes wrong:**
LangGraph's default checkpointing model writes a snapshot of the full graph state at every superstep. In Medicrew's multi-agent architecture, each consultation passes through triage → GP → specialist, generating hundreds of database rows per consultation. RAG context payloads can exceed 100KB per state snapshot, triggering PostgreSQL TOAST table overflow, WAL spike, and severe write amplification. GitHub issue #1138 on langchain-ai/langgraphjs documents this as an unresolved production issue: "no TTL is configured, old checkpoints accumulate unbounded."

**Why it happens:**
LangGraph's checkpointing defaults are designed for correctness and replay safety, not storage efficiency. At development scale (SQLite, few users) this is invisible. At production scale (Supabase PostgreSQL, concurrent users), checkpoint accumulation becomes a performance and cost problem within weeks.

**Consequences:**
- PostgreSQL query degradation as checkpoint table grows
- Supabase storage and egress costs scale unexpectedly
- Debugging production issues becomes extremely difficult (state explosion)
- Patient consultation history queries slow down as checkpoint history accumulates

**Prevention:**
- Use "exit" durability mode (checkpoint only at run completion, not intermediate supersteps) to reduce write amplification by ~80%
- Store heavy RAG payloads (retrieved documents, medical literature) in external storage (S3 or Supabase Storage), keeping only lightweight reference keys in LangGraph state
- Implement checkpoint TTL: write a background job to prune checkpoints older than 90 days (retain consultation summaries separately in the `Consultation` table)
- Monitor PostgreSQL table sizes weekly from first patient onboarding
- Index checkpoint tables on `thread_id` and `created_at` from day one

**Warning signs:**
- `langgraph_writes` or `langgraph_checkpoint_blobs` tables growing faster than consultation volume suggests
- Agent response latency increasing week-over-week without traffic increase
- Supabase storage costs trending up unexpectedly

**Phase mapping:** Phase 3 (Supabase migration) — checkpoint strategy must be designed into the migration, not added after

---

## Moderate Pitfalls

---

### Pitfall 6: Supabase RLS Misconfiguration Exposes Health Records Cross-Patient

**What goes wrong:**
Supabase RLS is enabled but policies are incomplete, allowing patients to query other patients' consultation records. Service role key used server-side bypasses RLS entirely — if this key leaks into client code (common in Next.js SSR/client boundary confusion), all health data is exposed to any authenticated user.

**Prevention:**
- Enable RLS on all health-data tables from day one of migration, not as a follow-up task
- Write RLS policy tests using `set_config('request.jwt.claims', ...)` before any patient data enters the database
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in any client-side bundle or Next.js component that runs in the browser
- Use `anon` key only in client; use `service_role` only in trusted server-side contexts (API routes, server actions)
- Audit: run `SELECT * FROM pg_policies` after every schema migration to verify policies still apply to new tables

**Phase mapping:** Phase 3 (Supabase migration) — RLS policy suite must be in place and tested before any patient data migrates from SQLite

---

### Pitfall 7: Emergency Escalation False Negatives (999/000 Failure)

**What goes wrong:**
The escalation system is listed as an LLM-driven feature. LLMs are probabilistic — they can and do miss emergency signals (chest pain minimised as anxiety, suicidal ideation missed in ambiguous phrasing). In Australia, failure to escalate a medical emergency is a patient safety failure that creates direct liability.

**Prevention:**
- Emergency detection must use a deterministic rule layer (keyword matching, regex, sentence classification model trained on medical emergencies) that runs *before* the LLM response pipeline — not inside it
- Rules must cover: chest pain + shortness of breath, suicidal ideation, stroke symptoms (FAST), severe allergic reaction (anaphylaxis)
- Emergency rule triggers must bypass all agent routing and fire a hardcoded response: "This sounds like a medical emergency. Call 000 immediately. Do not wait for a callback."
- Log every emergency trigger with patient ID and timestamp for audit trail
- Test emergency detection with 50+ adversarial prompts before launch (indirect phrasing, minimised distress)

**Phase mapping:** Phase 2 (escalation system) — must be verified with adversarial test suite before public launch

---

### Pitfall 8: Agent "Memory" Becomes a Privacy Liability

**What goes wrong:**
The "real agent memory" feature (agents remember prior consultations) requires storing patient health history in LangGraph state or a separate memory store. Without clear retention limits and patient consent for memory use, this creates a growing pool of sensitive health data with uncertain legal basis.

**Prevention:**
- Patient must consent at onboarding to "care team memory" with a plain-English explanation of what is stored
- Define retention limits: agent memory purged after X days of inactivity or on patient request (APP 13 — right to correction/deletion)
- Memory retrieval must be scoped: agents only retrieve the requesting patient's own history (RLS + thread_id scoping)
- Build a "Delete my data" flow in the patient portal from day one — this is required under Privacy Act, not optional

**Phase mapping:** Phase 2 (agent memory feature)

---

### Pitfall 9: Proactive Check-Ins Classified as Unsolicited Health Communications

**What goes wrong:**
The proactive check-in system ("How are you feeling?") sends outbound messages to patients. Under Australian Spam Act 2003, commercial electronic messages require prior consent and a functional unsubscribe mechanism. Under Privacy Act APPs, proactive health communications require consent for the specific communication purpose. Automated health messages to patients who have not explicitly opted in may also raise AHPRA advertising compliance questions.

**Prevention:**
- Onboarding consent flow must include explicit opt-in for proactive check-in messages, separate from general terms
- All notification emails/SMS must include a clear unsubscribe mechanism that works within 5 business days (Spam Act requirement)
- Do not send check-ins until patient has completed at least one consultation (establishes existing relationship)

**Phase mapping:** Phase 2 (proactive check-in system)

---

## Minor Pitfalls

---

### Pitfall 10: Groq/OpenAI API Latency Masking Agent Coordination Delays

**What goes wrong:**
Multi-agent consultation flow (triage → GP → specialist) makes 3–5 sequential LLM calls. Groq is fast (~200ms) but under load, or when falling back to OpenAI, total consultation latency can reach 15–30 seconds. Patients interpret latency as unreliability, not backend processing.

**Prevention:**
- Implement streaming from the first agent in the pipeline while downstream agents pre-compute
- Show "Dr. Alex is reviewing your case..." UI state during processing, not a spinner
- Set a 10-second agent timeout with graceful fallback response rather than hanging

**Phase mapping:** Phase 2 (streaming consultation UI)

---

### Pitfall 11: SQLite-to-Supabase Migration Data Loss

**What goes wrong:**
Existing consultation history, doctor records, and notification data in SQLite is silently lost or corrupted during migration because Prisma SQLite schema and Prisma PostgreSQL schema have diverged (e.g., boolean handling, JSON field types, integer vs bigint IDs).

**Prevention:**
- Run migration in shadow mode first: migrate schema without data, then ETL data separately
- Write validation queries: row counts and key field samples must match between SQLite and Supabase after migration
- Keep SQLite as read-only backup for 30 days post-migration

**Phase mapping:** Phase 3 (DB migration)

---

### Pitfall 12: Scope Creep from "Loop Requirement" Feature Expansion

**What goes wrong:**
The stated loop requirement ("continuous health check → auto-fix → improvement suggestions") is broad enough to justify infinite feature additions. Combined with the existing active features list (13 items), there is a high risk of shipping nothing fully compliant rather than shipping something valuable and safe.

**Prevention:**
- Apply MoSCoW to the active features list: must-have for launch vs. can-defer
- The compliance layer (AHPRA disclaimers, 000 escalation, Privacy Act consent) is always Must Have — nothing ships without it
- The "loop requirement" should be scoped to: symptom check-in → agent review → notification to patient. Anything beyond that is Phase 3+
- Hold a scope gate before each phase: does this feature add compliance risk? If yes, it requires explicit regulatory review before build

**Phase mapping:** All phases — establish scope gates in planning before sprint begins

---

## Australian-Specific Risk Register

| Risk | Regulation | Severity | Mitigation Summary |
|------|------------|----------|--------------------|
| SaMD classification without ARTG registration | TGA / Therapeutic Goods Act 1989 | CRITICAL | TGA classification assessment in Phase 1; scope agent outputs as health information not diagnosis |
| AI agent impersonating registered practitioner | AHPRA / Health Practitioner Regulation National Law | CRITICAL | Remove "Dr." titles from AI agents; mandatory AI disclosure in every interaction |
| Health data sent to overseas LLM providers without consent or DPA | Privacy Act 1988 APP 8 | HIGH | Audit all LLM API providers; document DPAs; get patient consent for overseas processing |
| Notifiable data breach not reported within 30 days | Privacy Act 1988 NDB Scheme | HIGH | Build NDB incident response plan before launch |
| My Health Record integration without participation agreement | My Health Records Act 2012 | MEDIUM | Do not integrate My Health Record until formal participation agreement is in place |
| Proactive check-ins without opt-in consent | Spam Act 2003 | MEDIUM | Explicit check-in consent at onboarding; unsubscribe mechanism in all messages |
| Misleading advertising about AI capabilities | AHPRA Advertising Guidelines / ACL | HIGH | Legal review of all marketing copy before publication |
| Failing to escalate medical emergency | Common law duty of care | CRITICAL | Deterministic emergency detection rules, not LLM-only |
| NSW patients subject to HRIP Act in addition to Privacy Act | Health Records and Information Privacy Act 2002 (NSW) | MEDIUM | Privacy legal review for NSW-specific obligations if NSW patients are in scope |

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Patient onboarding (medical history collection) | Privacy Act — collecting sensitive info without clear purpose and consent | Privacy policy + consent flow reviewed by privacy lawyer before launch |
| Named care team UI (Dr. Alex avatars) | AHPRA advertising — misleading practitioner representation | Remove "Dr." title; add mandatory AI disclosure on every view |
| Proactive check-in system | Spam Act consent + AHPRA advertising | Explicit opt-in; existing-patient-only rule |
| Escalation system | LLM false negative on emergency | Deterministic rules layer; adversarial testing |
| Supabase migration | RLS misconfiguration; SQLite data loss | RLS test suite; shadow migration with row-count validation |
| LangGraph checkpointing | PostgreSQL write amplification at scale | Exit-mode checkpointing; heavy payload externalisation to storage |
| Agent memory (personalised history) | Privacy Act — purpose limitation; patient right to deletion | Consent at onboarding; Delete My Data flow in patient portal |
| PubMed/guideline citations | LLM hallucination of citations | RAG-only citations; never generate citations from model memory |
| Push/email notifications | Spam Act 2003 | Unsubscribe mechanism in every message; consent documented |

---

## Sources

- [AHPRA: Meeting your professional obligations when using AI in healthcare](https://www.ahpra.gov.au/Resources/Artificial-Intelligence-in-healthcare.aspx)
- [AHPRA Advertising Guidelines](https://www.ahpra.gov.au/Resources/Advertising-hub.aspx)
- [TGA: AI and medical device software regulation](https://www.tga.gov.au/products/medical-devices/software-and-artificial-intelligence-ai/manufacturing/artificial-intelligence-ai-and-medical-device-software-regulation)
- [TGA: Understanding regulation of software-based medical devices](https://www.tga.gov.au/resources/guidance/understanding-regulation-software-based-medical-devices)
- [TGA 2025 Compliance Update — AI and SaMD targeting](https://www.pureglobal.com/news/australia-tga-targets-ai-and-software-based-tools-in-2025-compliance-update)
- [OAIC: Guide to Health Privacy (May 2025)](https://www.oaic.gov.au/__data/assets/pdf_file/0020/251183/Guide-to-Health-Privacy-Collated-May-2025.pdf)
- [OAIC: Guidance on privacy and commercially available AI products](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products)
- [OAIC: Notifiable Data Breaches scheme](https://www.oaic.gov.au/privacy/notifiable-data-breaches/about-the-notifiable-data-breaches-scheme)
- [Mondaq Australia: When Machines Malpractice — AI liability in Australian healthcare](https://www.mondaq.com/australia/new-technology/1689196/when-machines-malpractice-liability-for-ai-and-robotic-healthcare-in-australia)
- [Modernising My Health Record (Sharing by Default) Act 2025 FAQ](https://www.health.gov.au/sites/default/files/2025-02/frequently-asked-questions-modernising-my-health-record-sharing-by-default-act-2025_0.docx)
- [MIT Media Lab: Medical Hallucination in Foundation Models (2025)](https://medical-hallucination2025.github.io/)
- [Nature: Trust and AI in doctor-patient relationship (2025)](https://www.nature.com/articles/s44401-025-00016-5)
- [AZGuards: LangGraph checkpoint bloat and write amplification](https://azguards.com/distributed-systems/the-checkpoint-bloat-mitigating-write-amplification-in-langgraph-postgres-savers/)
- [LangGraph JS GitHub Issue #1138: Unbounded checkpoint growth](https://github.com/langchain-ai/langgraphjs/issues/1138)
- [Supabase: Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [MinterEllison: AHPRA AI guidelines for health practitioners](https://www.minterellison.com/articles/ahpra-introduces-ai-guidelines-for-health-practitioners)
- [KWM: TGA guidance on AI-based software medical devices](https://pulse.kwm.com/ip-whiteboard/new-tga-guidance-on-the-regulation-of-ai-based-software-medical-devices/)
