// Tests: Prisma PostgreSQL connection (INFRA-01)
import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const schema = readFileSync(
  join(process.cwd(), "prisma/schema.prisma"),
  "utf-8",
);

const isPostgres = process.env.DATABASE_URL?.includes("postgresql") ?? false;

describe("INFRA-01: Database connection", () => {
  test.skipIf(!isPostgres)("prisma schema provider is postgresql", () => {
    expect(schema).toMatch(/provider\s+=\s+"postgresql"/);
  });

  test.skipIf(!isPostgres)("prisma schema has directUrl configured", () => {
    expect(schema).toContain("directUrl");
  });

  test("PatientConsent model exists in schema", () => {
    expect(schema).toContain("model PatientConsent");
  });
});
