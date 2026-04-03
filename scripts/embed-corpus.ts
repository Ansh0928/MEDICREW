// scripts/embed-corpus.ts
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const NOMIC_API_KEY = process.env.NOMIC_API_KEY!;
const BATCH_SIZE = 50;

const AU_NOTE =
  "[Reference material — US clinical guidelines. Apply Australian clinical standards where they differ.]";

// ── Keyword → specialty mapping ──────────────────────────────────────────────

const SPECIALTY_KEYWORDS: Record<string, string[]> = {
  cardiology: [
    "cardiac",
    "heart",
    "chest pain",
    "arrhythmia",
    "hypertension",
    "ecg",
    "coronary",
    "myocardial",
  ],
  mental_health: [
    "depression",
    "anxiety",
    "psychiatric",
    "mood",
    "ptsd",
    "bipolar",
    "schizophrenia",
    "self-harm",
  ],
  dermatology: [
    "skin",
    "rash",
    "lesion",
    "eczema",
    "psoriasis",
    "melanoma",
    "dermatitis",
    "acne",
  ],
  orthopedic: [
    "bone",
    "joint",
    "fracture",
    "spine",
    "musculoskeletal",
    "knee",
    "hip",
    "osteoporosis",
  ],
  gastro: [
    "abdominal",
    "bowel",
    "liver",
    "gastric",
    "colon",
    "nausea",
    "diarrhea",
    "ibs",
    "crohn",
  ],
  physiotherapy: [
    "movement",
    "rehabilitation",
    "physiotherapy",
    "exercise",
    "mobility",
    "muscle",
    "tendon",
  ],
};

// Words that should never be in injected content — reclassified as 'general'
const SAFETY_EXCLUSIONS = [
  "suicid",
  "kill myself",
  "end my life",
  "self-harm method",
];

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

async function insertBatch(
  chunks: Array<{
    content: string;
    specialty: string;
    source: string;
    embedding: number[];
  }>,
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

async function loadMedQA(): Promise<
  Array<{ content: string; source: string }>
> {
  console.log("Downloading MedQA-USMLE from HuggingFace...");
  const url =
    "https://huggingface.co/datasets/GBaker/MedQA-USMLE-4-options/resolve/main/data/train.jsonl";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MedQA download failed: ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n").slice(0, 5000); // cap at 5k for first run
  return lines.map((line) => {
    const item = JSON.parse(line);
    const content = `Q: ${item.question}\nA: ${item.answer_idx ? (item.options?.[item.answer_idx] ?? "") : ""}`;
    return { content, source: "medqa" };
  });
}

// ── Dataset: PubMedQA ────────────────────────────────────────────────────────

async function loadPubMedQA(): Promise<
  Array<{ content: string; source: string }>
> {
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

  const datasets = [...(await loadMedQA()), ...(await loadPubMedQA())];

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
    '  bunx prisma db execute --stdin <<< "CREATE INDEX ON medical_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);"',
  );
}

main().catch((err) => {
  console.error("Corpus build failed:", err);
  process.exit(1);
});
