# Medical RAG Layer — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Author:** Claude (brainstorming session)

---

## Goal

Add a retrieval-augmented generation (RAG) layer to MediCrew's 7-agent swarm to improve hypothesis accuracy, triage routing, and recommendation quality using open/free medical datasets.

---

## Architecture

One embedding call happens before the swarm fan-out. The resulting vector is used to run parallel specialty-filtered pgvector queries (one per active specialist) — fast because DB queries are cheap compared to LLM calls. Results are injected into each specialist's system prompt before the fan-out begins.

```
Patient submits symptoms
  ↓
embedText(symptoms) → Nomic API → 768-dim vector  [1 API call]
  ↓
Promise.all: pgvector query per active specialty   [parallel, fast]
  filtered by specialty tag, top-5 chunks per role
  ↓
runTriage() — unchanged
  ↓
specialist fan-out — each specialist receives their domain chunks
  prepended to system prompt (AU-precedence disclaimer applied)
  ↓
debate → synthesis — unchanged
```

**Design note:** The embedding step is the only sequential bottleneck (~100ms). The per-specialty DB queries run in parallel and are sub-millisecond each against an indexed table — total RAG overhead is ~150-200ms, imperceptible within the swarm's existing latency.

---

## Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Vector DB | Neon pgvector (existing) | Already in stack, free, no new service |
| DB client | `@neondatabase/serverless` | Required for raw vector queries — Prisma does not support pgvector operators |
| Embeddings (build) | Nomic AI `nomic-embed-text-v1.5` | Free tier, 768-dim, best medical quality among free options |
| Embeddings (query) | Same Nomic API | Single provider, consistent vector space |
| LLM | Groq (existing) | Unchanged |
| Corpus script | `bun` local script → prod Neon | One-time setup, no serverless timeout issues |

---

## Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE medical_chunks (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  content     text    NOT NULL,
  embedding   vector(768),
  specialty   text,   -- 'gp' | 'cardiology' | 'mental_health' | 'dermatology'
                      -- | 'orthopedic' | 'gastro' | 'physiotherapy' | 'general'
  source      text    -- 'medqa' | 'pubmedqa'
);

-- IMPORTANT: Create index AFTER all rows are inserted.
-- lists = 50 is appropriate for ~13k rows (rule of thumb: sqrt(rows)).
-- Re-run with higher lists value if corpus grows significantly.
CREATE INDEX ON medical_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);
```

---

## Datasets

Healthdirect.gov.au is NOT CC-licensed — it uses a bespoke Crown Copyright notice. It is excluded from this spec pending a formal data agreement.

| Dataset | Source | Chunks | Specialty tagging | License |
|---------|--------|--------|-------------------|---------|
| MedQA-USMLE | HuggingFace: GBaker/MedQA-USMLE-4-options | ~12k Q&A pairs | Keyword-based | Apache 2.0 |
| PubMedQA | HuggingFace: qiaojin/PubMedQA | ~1k expert-annotated | Keyword-based | MIT |

**US-content disclaimer (AHPRA):** MedQA-USMLE is US-centric. All retrieved chunks are injected with a mandatory prefix:
> `[Reference material — US clinical guidelines. Apply Australian clinical standards where they differ.]`

This prefix is applied in `retrieve.ts` before returning chunks. It is not shown to the patient.

Specialty keyword mapping:
- `cardiology`: cardiac, heart, chest pain, arrhythmia, hypertension, ECG
- `mental_health`: depression, anxiety, psychiatric, mood, PTSD, self-harm (**not** suicidal — see Safety note below)
- `dermatology`: skin, rash, lesion, eczema, psoriasis, melanoma
- `orthopedic`: bone, joint, fracture, spine, musculoskeletal, knee, hip
- `gastro`: abdominal, bowel, liver, GI, gastric, colon, nausea
- `physiotherapy`: movement, rehabilitation, physiotherapy, exercise, mobility
- `gp`: default if no specialty keyword matched

**Safety note — suicidality keyword excluded:** The keyword `suicidal` is intentionally excluded from the `mental_health` tagging list. Any chunk containing suicidal ideation content is tagged `general` and only injected when explicitly relevant. The existing deterministic AHPRA emergency detection gate in `swarm.ts` remains the authoritative handler for suicidality — retrieved content must not circumvent it.

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/rag/embed.ts` | Calls Nomic API with `res.ok` guard, returns `number[]` |
| `src/lib/rag/retrieve.ts` | Parallel pgvector queries via `@neondatabase/serverless`, returns `Record<DoctorRole, string[]>` with AU disclaimer prefix |
| `scripts/embed-corpus.ts` | One-time corpus download, chunk, embed, insert — run locally against prod Neon |

## Modified Files

| File | Change |
|------|--------|
| `src/agents/swarm.ts` | One call to `retrieveMedicalContext()` before specialist fan-out; result passed into specialist system prompts |
| `prisma/migrations/` | Add `medical_chunks` table (schema only; index created post-insert by corpus script) |

---

## Environment Variables

| Var | Where | Notes |
|-----|-------|-------|
| `NOMIC_API_KEY` | Vercel + `.env.local` | Already added to Vercel production |
| `DATABASE_URL` | Already present | Neon connection string |

---

## Data Pipeline

Run once locally against production Neon after all rows are inserted:

```bash
DATABASE_URL=<prod-neon-url> NOMIC_API_KEY=<key> bun run scripts/embed-corpus.ts
```

Steps:
1. Download MedQA-USMLE + PubMedQA from HuggingFace
2. For each Q&A pair: tag specialty via keyword matching
3. Filter out chunks containing suicidal ideation → tag `general` instead
4. POST to Nomic embed API → 768-dim vector per chunk
5. Batch INSERT into `medical_chunks`
6. After all inserts complete: `CREATE INDEX ... USING ivfflat` (must be last)
7. Log progress — estimated ~20min for ~13k chunks

---

## Runtime Flow

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
  return embeddings[0];
}

// src/lib/rag/retrieve.ts
import { neon } from "@neondatabase/serverless";

const AU_DISCLAIMER =
  "[Reference material — US clinical guidelines. Apply Australian clinical standards where they differ.]\n\n";

export async function retrieveMedicalContext(
  symptoms: string,
  specialties: DoctorRole[]
): Promise<Record<DoctorRole, string[]>> {
  const vector = await embedText(symptoms);
  const sql = neon(process.env.DATABASE_URL!);

  const results = await Promise.all(
    specialties.map(async (role) => {
      const rows = await sql`
        SELECT content FROM medical_chunks
        WHERE specialty = ${role} OR specialty = 'general'
        ORDER BY embedding <=> ${JSON.stringify(vector)}::vector
        LIMIT 5
      `;
      const chunks = rows.map((r) => AU_DISCLAIMER + r.content);
      return [role, chunks] as [DoctorRole, string[]];
    })
  );
  return Object.fromEntries(results);
}
```

---

## Error Handling

- If `embedText` throws (Nomic 4xx/5xx): caught in `swarm.ts`, log error, proceed with empty RAG context — swarm runs normally without RAG. No user-facing impact.
- If pgvector query fails: same fallback pattern.
- RAG is strictly additive — its failure never blocks or degrades the consult flow.

```typescript
// swarm.ts injection pattern
let ragContext: Record<DoctorRole, string[]> = {};
try {
  ragContext = await retrieveMedicalContext(symptoms, relevantDoctors);
} catch (err) {
  console.error("[RAG] retrieval failed, proceeding without context:", err);
}
```

---

## AHPRA Compliance

- **US content disclaimer**: All retrieved chunks prefixed with AU-precedence notice (see above)
- **Suicidality gate**: `suicidal` keyword excluded from tagging; deterministic emergency detection remains the authority
- **No retrieved content shown to patient**: Chunks are injected into specialist system prompts only, never surfaced in UI
- **Source datasets are research/educational**: MedQA (Apache 2.0) and PubMedQA (MIT) are explicitly non-clinical-advice datasets — appropriate for grounding LLM reasoning, not for direct patient output

---

## Testing

- Unit: `embed.ts` — mock Nomic API (happy path + non-ok response), assert 768-dim array and error throw
- Unit: `retrieve.ts` — mock Neon client, assert specialty filtering + AU disclaimer prefix applied
- Unit: `retrieve.ts` — assert graceful empty return when `embedText` throws
- Integration: POST to `/api/swarm/start`, assert specialist prompts contain AU_DISCLAIMER prefix
- Script: run `embed-corpus.ts` against a Neon dev branch, assert row count ≥ 13k and index exists

---

## Out of Scope

- Healthdirect.gov.au content — excluded pending Crown Copyright data agreement
- Re-embedding on dataset updates (manual re-run of corpus script)
- Fine-tuning models on the corpus
- Licensed datasets (SNOMED CT, MIMIC-IV) — deferred
