# Medical RAG Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a retrieval-augmented generation layer that injects relevant medical knowledge into each specialist's context before the swarm fan-out, improving hypothesis accuracy, triage routing, and recommendation quality.

**Architecture:** Triage runs first (it determines which specialists are relevant), then one Nomic embed call converts symptoms to a vector, then parallel specialty-filtered pgvector queries retrieve top-5 chunks per active specialist. Chunks are injected into each specialist's resident prompts before the lead swarm fan-out. RAG failure is a silent fallback — never blocks the consult.

**Injection order clarification:** The spec diagram shows embed before triage; the correct order (and what is implemented here) is triage first — this is intentional because triage returns `relevantDoctors`, which is required to scope the pgvector queries by specialty. Without triage first, we would query all 7 specialties regardless of relevance.

**Tech Stack:** Next.js 14, TypeScript, `@neondatabase/serverless`, Nomic AI (`nomic-embed-text-v1.5`), Neon pgvector, Vitest, Bun

**Spec:** `docs/superpowers/specs/2026-03-26-medical-rag-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/rag/embed.ts` | Create | Nomic API call → 768-dim vector |
| `src/lib/rag/retrieve.ts` | Create | pgvector similarity search → chunks per specialty |
| `src/agents/swarm.ts` | Modify (line ~408) | Inject RAG context before lead swarm fan-out |
| `src/__tests__/lib/rag/embed.test.ts` | Create | Unit tests for embed.ts |
| `src/__tests__/lib/rag/retrieve.test.ts` | Create | Unit tests for retrieve.ts |
| `scripts/embed-corpus.ts` | Create | One-time corpus build script |
| `prisma/migrations/YYYYMMDD_medical_chunks/migration.sql` | Create | Add medical_chunks table |

---

## Task 1: Database Migration

**Files:**
- Create: `prisma/migrations/20260326000000_medical_chunks/migration.sql`

- [ ] **Step 1: Create the migration SQL file**

```sql
-- prisma/migrations/20260326000000_medical_chunks/migration.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS medical_chunks (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  content     text    NOT NULL,
  embedding   vector(768),
  specialty   text,
  source      text
);

-- NOTE: Do NOT create the ivfflat index here.
-- Run scripts/embed-corpus.ts first, then create the index manually:
-- CREATE INDEX ON medical_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
-- (lists = 50 is appropriate for ~13k rows: sqrt(13000) ≈ 114, use 50 for safety at start)
```

- [ ] **Step 2: Apply migration to production Neon**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew
bunx prisma migrate deploy
```

Expected: `1 migration applied`

- [ ] **Step 3: Verify table exists**

```bash
bunx prisma studio
```

Check that `medical_chunks` table appears with columns: `id`, `content`, `embedding`, `specialty`, `source`.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(rag): add medical_chunks pgvector migration"
```

---

## Task 2: Embed Helper

**Files:**
- Create: `src/lib/rag/embed.ts`
- Create: `src/__tests__/lib/rag/embed.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/lib/rag/embed.test.ts
import { describe, test, expect, vi, beforeEach } from "vitest";
import { embedText } from "@/lib/rag/embed";

describe("embedText", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.NOMIC_API_KEY = "test-key";
  });

  test("returns 768-dim float array on success", async () => {
    const fakeVector = Array(768).fill(0.1);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embeddings: [fakeVector] }),
    } as Response);

    const result = await embedText("chest pain");
    expect(result).toHaveLength(768);
    expect(result[0]).toBe(0.1);
  });

  test("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as Response);

    await expect(embedText("chest pain")).rejects.toThrow("Nomic embed failed: 401");
  });

  test("calls Nomic API with correct model and auth header", async () => {
    const fakeVector = Array(768).fill(0);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embeddings: [fakeVector] }),
    } as Response);

    await embedText("headache");

    expect(fetch).toHaveBeenCalledWith(
      "https://api-atlas.nomic.ai/v1/embedding/text",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
        body: expect.stringContaining("nomic-embed-text-v1.5"),
      })
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew
bun run test src/__tests__/lib/rag/embed.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/rag/embed'`

- [ ] **Step 3: Implement embed.ts**

```typescript
// src/lib/rag/embed.ts
export async function embedText(text: string): Promise<number[]> {
  const res = await fetch("https://api-atlas.nomic.ai/v1/embedding/text", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NOMIC_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ texts: [text], model: "nomic-embed-text-v1.5" }),
  });

  if (!res.ok) {
    throw new Error(`Nomic embed failed: ${res.status} ${res.statusText}`);
  }

  const { embeddings } = await res.json();
  return embeddings[0] as number[];
}
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
bun run test src/__tests__/lib/rag/embed.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/rag/embed.ts src/__tests__/lib/rag/embed.test.ts
git commit -m "feat(rag): add Nomic embed helper with res.ok guard"
```

---

## Task 3: Retrieve Helper

**Files:**
- Create: `src/lib/rag/retrieve.ts`
- Create: `src/__tests__/lib/rag/retrieve.test.ts`

**Important:** Uses `@neondatabase/serverless` for raw pgvector queries — Prisma does not support the `<=>` vector distance operator. Check if `@neondatabase/serverless` is already installed:

```bash
cat /Users/tasmanstar/Desktop/projects/medicrew/package.json | grep neondatabase
```

If not listed, install it:
```bash
bun add @neondatabase/serverless
```

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/lib/rag/retrieve.test.ts
import { describe, test, expect, vi, beforeEach } from "vitest";
import { retrieveMedicalContext } from "@/lib/rag/retrieve";

// Mock embed module
vi.mock("@/lib/rag/embed", () => ({
  embedText: vi.fn().mockResolvedValue(Array(768).fill(0.1)),
}));

// Mock @neondatabase/serverless
vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() =>
    vi.fn().mockResolvedValue([
      { content: "cardiac assessment chunk" },
      { content: "heart failure context" },
    ])
  ),
}));

describe("retrieveMedicalContext", () => {
  test("returns chunks per specialty with AU disclaimer prefix", async () => {
    const result = await retrieveMedicalContext("chest pain", ["cardiology"]);
    expect(result.cardiology).toHaveLength(2);
    expect(result.cardiology[0]).toContain("[Reference material");
    expect(result.cardiology[0]).toContain("Australian clinical standards");
    expect(result.cardiology[0]).toContain("cardiac assessment chunk");
  });

  test("returns empty object when embedText throws", async () => {
    const { embedText } = await import("@/lib/rag/embed");
    vi.mocked(embedText).mockRejectedValueOnce(new Error("Nomic down"));

    const result = await retrieveMedicalContext("chest pain", ["cardiology"]);
    expect(result).toEqual({});
  });

  test("queries each specialty in parallel", async () => {
    const result = await retrieveMedicalContext("fever and rash", ["gp", "dermatology"]);
    expect(Object.keys(result)).toContain("gp");
    expect(Object.keys(result)).toContain("dermatology");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bun run test src/__tests__/lib/rag/retrieve.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/rag/retrieve'`

- [ ] **Step 3: Implement retrieve.ts**

```typescript
// src/lib/rag/retrieve.ts
import { neon } from "@neondatabase/serverless";
import { embedText } from "./embed";
import { DoctorRole } from "@/agents/swarm-types";

const AU_DISCLAIMER =
  "[Reference material — US clinical guidelines. Apply Australian clinical standards where they differ.]\n\n";

export async function retrieveMedicalContext(
  symptoms: string,
  specialties: DoctorRole[]
): Promise<Partial<Record<DoctorRole, string[]>>> {
  let vector: number[];
  try {
    vector = await embedText(symptoms);
  } catch (err) {
    console.error("[RAG] embed failed, skipping retrieval:", err);
    return {};
  }

  const sql = neon(process.env.DATABASE_URL!);

  const results = await Promise.all(
    specialties.map(async (role) => {
      const rows = await sql`
        SELECT content FROM medical_chunks
        WHERE specialty = ${role} OR specialty = 'general'
        ORDER BY embedding <=> ${JSON.stringify(vector)}::vector
        LIMIT 5
      `;
      const chunks = rows.map((r) => AU_DISCLAIMER + (r.content as string));
      return [role, chunks] as [DoctorRole, string[]];
    })
  );

  return Object.fromEntries(results);
}
```

- [ ] **Step 4: Run tests — confirm all pass**

```bash
bun run test src/__tests__/lib/rag/retrieve.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Run full test suite — confirm no regressions**

```bash
bun run test
```

Expected: all existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/rag/retrieve.ts src/__tests__/lib/rag/retrieve.test.ts
git commit -m "feat(rag): add pgvector retrieve helper with AU disclaimer and fallback"
```

---

## Task 4: Wire RAG into swarm.ts

**Files:**
- Modify: `src/agents/swarm.ts`

The injection point is in `streamSwarm` at approximately line 408, between the triage flush and the `Promise.all(runLeadSwarm)` call. RAG context is passed into `runLeadSwarm`, then into `buildResidentPrompt`.

- [ ] **Step 1: Update `buildResidentPrompt` to accept RAG context**

Find `buildResidentPrompt` (around line 41) and update its signature:

```typescript
export function buildResidentPrompt(
  residentRole: ResidentRole,
  specialtyRole: DoctorRole,
  symptoms: string,
  patientInfo: SwarmState["patientInfo"],
  ragChunks: string[] = []   // <-- add this parameter
): string {
  const base = residentDefinitions[residentRole].systemPrompt;
  const context = `\n\n## Specialty Context\nYou are embedded in the ${specialtyRole} specialty team.\nPatient: ${patientInfo.age}y ${patientInfo.gender}${patientInfo.knownConditions ? `, conditions: ${patientInfo.knownConditions}` : ""}\nSymptoms: ${symptoms}`;
  const ragSection = ragChunks.length > 0
    ? `\n\n## Relevant Medical Reference\n${ragChunks.join("\n\n---\n\n")}`
    : "";
  return base + context + ragSection;
}
```

- [ ] **Step 2: Update `runResident` AND `runLeadSwarm` to thread ragChunks through**

These two changes must be made together — `runLeadSwarm` calls `runResident`, so both signatures must be updated in one pass to avoid a TypeScript error.

Find `runResident` (around line 109) and update its signature + `buildResidentPrompt` call:

```typescript
async function runResident(
  residentRole: ResidentRole,
  specialtyRole: DoctorRole,
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
  ragChunks: string[] = []   // <-- add this
): Promise<void> {
  const llm = createFastModel();
  const systemPrompt = buildResidentPrompt(
    residentRole, specialtyRole, state.symptoms, state.patientInfo, ragChunks  // <-- pass through
  );
  // ... rest of function unchanged (do not touch the LLM invoke or parse logic)
```

Then find `runLeadSwarm` (around line 247) and update its signature + the `RESIDENT_ROLES.map` call inside it:

```typescript
async function runLeadSwarm(
  specialtyRole: DoctorRole,
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
  ragChunks: string[] = []   // <-- add this
): Promise<void> {
  // ... existing setup (state.leadSwarms init, emit doctor_activated) unchanged ...

  // L3: residents run in parallel — CRITICAL: forward ragChunks to each resident
  await Promise.all(
    RESIDENT_ROLES.map((residentRole) =>
      runResident(residentRole, specialtyRole, state, emit, ragChunks)  // <-- pass through
    )
  );

  // L4 and L5 calls are unchanged — do not modify runResidentDebate or runLeadRectification
```

- [ ] **Step 4: Add RAG retrieval in `streamSwarm`**

Add import at top of file:
```typescript
import { retrieveMedicalContext } from "@/lib/rag/retrieve";
```

Find the `streamSwarm` function body (around line 403) and add the RAG call between triage and the lead swarm fan-out:

```typescript
  // L1
  await runTriage(state, emit);
  yield* flush();
  if (state.currentPhase === "complete") return;

  // L2-L5: RAG retrieval before fan-out
  const relevantDoctors = state.triage!.relevantDoctors;
  let ragContext: Partial<Record<DoctorRole, string[]>> = {};
  try {
    ragContext = await retrieveMedicalContext(state.symptoms, relevantDoctors);
  } catch (err) {
    console.error("[RAG] retrieval failed, proceeding without context:", err);
  }

  await Promise.all(
    relevantDoctors.map((role) =>
      runLeadSwarm(role, state, emit, ragContext[role] ?? [])  // <-- pass chunks
    )
  );
  yield* flush();
```

- [ ] **Step 5: Run full test suite**

```bash
bun run test
```

Expected: all tests pass. TypeScript should compile cleanly.

- [ ] **Step 6: Check TypeScript**

```bash
bunx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add src/agents/swarm.ts
git commit -m "feat(rag): wire RAG context into swarm resident prompts"
```

---

## Task 5: Corpus Build Script

**Files:**
- Create: `scripts/embed-corpus.ts`

This script runs **once locally** against production Neon. It is NOT deployed to Vercel.

- [ ] **Step 1: Install dataset download dependency if needed**

```bash
cat /Users/tasmanstar/Desktop/projects/medicrew/package.json | grep -E "node-fetch|axios"
```

No extra HTTP client needed — Bun has native fetch.

- [ ] **Step 2: Create the script**

```typescript
// scripts/embed-corpus.ts
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const NOMIC_API_KEY = process.env.NOMIC_API_KEY!;
const BATCH_SIZE = 50;

const AU_NOTE =
  "[Reference material — US clinical guidelines. Apply Australian clinical standards where they differ.]";

// ── Keyword → specialty mapping ──────────────────────────────────────────────

const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  cardiology: ["cardiac", "heart", "chest pain", "arrhythmia", "hypertension", "ecg", "coronary", "myocardial"],
  mental_health: ["depression", "anxiety", "psychiatric", "mood", "ptsd", "bipolar", "schizophrenia", "self-harm"],
  dermatology: ["skin", "rash", "lesion", "eczema", "psoriasis", "melanoma", "dermatitis", "acne"],
  orthopedic: ["bone", "joint", "fracture", "spine", "musculoskeletal", "knee", "hip", "osteoporosis"],
  gastro: ["abdominal", "bowel", "liver", "gastric", "colon", "nausea", "diarrhea", "ibs", "crohn"],
  physiotherapy: ["movement", "rehabilitation", "physiotherapy", "exercise", "mobility", "muscle", "tendon"],
};

// Words that should never be in injected content — reclassified as 'general'
const SAFETY_EXCLUSIONS = ["suicid", "kill myself", "end my life", "self-harm method"];

function tagSpecialty(text: string): string {
  const lower = text.toLowerCase();
  if (SAFETY_EXCLUSIONS.some((w) => lower.includes(w))) return "general";
  for (const [specialty, keywords] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return specialty;
  }
  return "gp";
}

// ── Nomic embedding ──────────────────────────────────────────────────────────

async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api-atlas.nomic.ai/v1/embedding/text", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOMIC_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ texts, model: "nomic-embed-text-v1.5" }),
  });
  if (!res.ok) throw new Error(`Nomic batch embed failed: ${res.status}`);
  const { embeddings } = await res.json();
  return embeddings as number[][];
}

// ── Insert batch into Neon (idempotent) ─────────────────────────────────────
// ON CONFLICT DO NOTHING makes the script safe to re-run after a mid-run failure.
// Duplicate rows are skipped rather than inserted.

async function insertBatch(
  chunks: Array<{ content: string; specialty: string; source: string; embedding: number[] }>
): Promise<void> {
  for (const chunk of chunks) {
    await sql`
      INSERT INTO medical_chunks (content, embedding, specialty, source)
      VALUES (
        ${chunk.content},
        ${JSON.stringify(chunk.embedding)}::vector,
        ${chunk.specialty},
        ${chunk.source}
      )
      ON CONFLICT DO NOTHING
    `;
  }
}

// ── Dataset: MedQA-USMLE ─────────────────────────────────────────────────────

async function loadMedQA(): Promise<Array<{ content: string; source: string }>> {
  console.log("Downloading MedQA-USMLE from HuggingFace...");
  const url =
    "https://huggingface.co/datasets/GBaker/MedQA-USMLE-4-options/resolve/main/data/train.jsonl";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MedQA download failed: ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n").slice(0, 5000); // cap at 5k for first run
  return lines.map((line) => {
    const item = JSON.parse(line);
    const content = `Q: ${item.question}\nA: ${item.answer_idx ? item.options?.[item.answer_idx] ?? "" : ""}`;
    return { content, source: "medqa" };
  });
}

// ── Dataset: PubMedQA ────────────────────────────────────────────────────────

async function loadPubMedQA(): Promise<Array<{ content: string; source: string }>> {
  console.log("Downloading PubMedQA from HuggingFace...");
  const url =
    "https://huggingface.co/datasets/qiaojin/PubMedQA/resolve/main/data/pqa_labeled/train.jsonl";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMedQA download failed: ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n");
  return lines.map((line) => {
    const item = JSON.parse(line);
    const content = `Q: ${item.question}\nContext: ${(item.context?.contexts ?? []).join(" ").slice(0, 300)}`;
    return { content, source: "pubmedqa" };
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting corpus embedding...");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  if (!NOMIC_API_KEY) throw new Error("NOMIC_API_KEY not set");

  const datasets = [
    ...(await loadMedQA()),
    ...(await loadPubMedQA()),
  ];

  console.log(`Total chunks to embed: ${datasets.length}`);

  let processed = 0;
  for (let i = 0; i < datasets.length; i += BATCH_SIZE) {
    const batch = datasets.slice(i, i + BATCH_SIZE);
    const texts = batch.map((d) => d.content);
    const embeddings = await embedBatch(texts);

    const rows = batch.map((d, idx) => ({
      content: d.content,
      specialty: tagSpecialty(d.content),
      source: d.source,
      embedding: embeddings[idx],
    }));

    await insertBatch(rows);
    processed += batch.length;
    console.log(`Progress: ${processed}/${datasets.length}`);
  }

  console.log("All chunks inserted. Now create the index:");
  console.log(
    "  bunx prisma db execute --stdin <<< \"CREATE INDEX ON medical_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);\""
  );
}

main().catch((err) => {
  console.error("Corpus build failed:", err);
  process.exit(1);
});
```

- [ ] **Step 3: Run the script against production Neon**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew
DATABASE_URL="<your-prod-neon-url>" NOMIC_API_KEY="<your-nomic-key>" bun run scripts/embed-corpus.ts
```

Expected: progress logs, completes with index creation instruction.

- [ ] **Step 4: Create the ivfflat index after all inserts**

```bash
bunx prisma db execute --stdin <<< "CREATE INDEX ON medical_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);"
```

- [ ] **Step 5: Verify row count**

```bash
bunx prisma db execute --stdin <<< "SELECT COUNT(*) FROM medical_chunks;"
```

Expected: ≥ 5000 rows

- [ ] **Step 6: Commit the script**

```bash
git add scripts/embed-corpus.ts
git commit -m "feat(rag): add one-time corpus embedding script (MedQA + PubMedQA)"
```

---

## Task 6: Verify End-to-End

- [ ] **Step 1: Run full test suite**

```bash
bun run test
```

Expected: all tests pass

- [ ] **Step 2: TypeScript check**

```bash
bunx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Local smoke test**

```bash
bun run dev
```

Navigate to http://localhost:3000/consult, submit "I have chest pain and shortness of breath", verify:
- Triage fires
- Orbs animate (lead swarms activating)
- Synthesis card renders with recommendation
- No console errors mentioning `[RAG]`

- [ ] **Step 4: Verify RAG is injecting (dev mode)**

Add a temporary `console.log` in `retrieve.ts`:
```typescript
console.log(`[RAG] ${role}: ${chunks.length} chunks retrieved`);
```

Rerun the consult and check terminal for `[RAG] cardiology: 5 chunks retrieved` (or similar).
Remove the log after confirming.

- [ ] **Step 5: Integration test — verify AU_DISCLAIMER reaches specialist prompts**

```typescript
// src/__tests__/lib/rag/integration.test.ts
import { describe, test, expect, vi } from "vitest";
import { buildResidentPrompt } from "@/agents/swarm";

describe("RAG integration: AU disclaimer in resident prompts", () => {
  test("AU_DISCLAIMER prefix appears in prompt when ragChunks provided", () => {
    const chunk = "[Reference material — US clinical guidelines. Apply Australian clinical standards where they differ.]\n\ncardiac assessment content";
    const prompt = buildResidentPrompt(
      "investigative",
      "cardiology",
      "chest pain",
      { age: 45, gender: "male" },
      [chunk]
    );
    expect(prompt).toContain("Australian clinical standards");
    expect(prompt).toContain("Relevant Medical Reference");
    expect(prompt).toContain("cardiac assessment content");
  });

  test("no RAG section when ragChunks is empty", () => {
    const prompt = buildResidentPrompt(
      "investigative",
      "cardiology",
      "chest pain",
      { age: 45, gender: "male" },
      []
    );
    expect(prompt).not.toContain("Relevant Medical Reference");
  });
});
```

Run: `bun run test src/__tests__/lib/rag/integration.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(rag): medical RAG layer complete — MedQA+PubMedQA, Nomic embed, Neon pgvector"
```

---

## Pickup Notes for New Sessions

- `NOMIC_API_KEY` is already set in Vercel production (added 2026-03-26)
- `DATABASE_URL` is already set (Neon)
- Spec: `docs/superpowers/specs/2026-03-26-medical-rag-design.md`
- The corpus script must be run ONCE locally — it is not a deployed job
- Index must be created AFTER all rows are inserted (see Task 5 Step 4)
- Healthdirect.gov.au content is excluded (Crown Copyright — not CC-licensed)
- `suicidal` is intentionally excluded from mental_health tagging (AHPRA safety gate)
- MiroFish 7-layer swarm in `src/agents/swarm.ts` is fully implemented (L1→L7)
- RAG injection point: `streamSwarm` function, between triage flush and `Promise.all(runLeadSwarm)`
- Corpus script runtime: ~20 minutes for ~5k MedQA + ~1k PubMedQA chunks at batch size 50 — do not interrupt mid-run, use `ON CONFLICT DO NOTHING` makes restart safe if it fails
- If corpus script fails mid-run: just re-run it — idempotent inserts skip duplicates
