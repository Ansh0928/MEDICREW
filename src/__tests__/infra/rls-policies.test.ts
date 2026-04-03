// Tests: RLS policies in migration SQL (INFRA-02)
import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const migrationPath = join(
  process.cwd(),
  "prisma/migrations/0001_supabase_init/migration.sql",
);
const sql = readFileSync(migrationPath, "utf-8");

describe("INFRA-02: Row Level Security", () => {
  test("migration SQL enables RLS on Patient table", () => {
    expect(sql).toMatch(/ALTER TABLE.*"Patient".*ENABLE ROW LEVEL SECURITY/i);
  });

  test("migration SQL enables RLS on Consultation table", () => {
    expect(sql).toMatch(
      /ALTER TABLE.*"Consultation".*ENABLE ROW LEVEL SECURITY/i,
    );
  });

  test("migration SQL enables RLS on Doctor table", () => {
    expect(sql).toMatch(/ALTER TABLE.*"Doctor".*ENABLE ROW LEVEL SECURITY/i);
  });

  test("migration SQL enables RLS on Notification table", () => {
    expect(sql).toMatch(
      /ALTER TABLE.*"Notification".*ENABLE ROW LEVEL SECURITY/i,
    );
  });

  test("migration SQL enables RLS on PatientConsent table", () => {
    expect(sql).toMatch(
      /ALTER TABLE.*"PatientConsent".*ENABLE ROW LEVEL SECURITY/i,
    );
  });

  test("migration SQL creates patient_self_read policy", () => {
    expect(sql).toContain("patient_self_read");
  });
});
