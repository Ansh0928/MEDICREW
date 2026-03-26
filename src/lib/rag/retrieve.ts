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
