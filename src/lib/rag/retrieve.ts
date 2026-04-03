import { neon } from "@neondatabase/serverless";
import { embedText } from "./embed";
import { DoctorRole } from "@/agents/swarm-types";

const AU_DISCLAIMER =
  "[Reference material — US clinical guidelines. Apply Australian clinical standards where they differ.]\n\n";

export async function retrieveMedicalContext(
  _symptoms: string,
  _specialties: DoctorRole[],
): Promise<Partial<Record<DoctorRole, string[]>>> {
  // RAG retrieval relies on Neon PG vector search, disabled for local SQLite dev.
  return {};
}
