// Tests: Inngest route handler (INFRA-04)
import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const clientSrc = readFileSync(join(process.cwd(), "src/lib/inngest/client.ts"), "utf-8");
const routeSrc = readFileSync(join(process.cwd(), "src/app/api/inngest/route.ts"), "utf-8");

describe("INFRA-04: Inngest handler", () => {
  test("inngest client is created with id 'medicrew'", () => {
    expect(clientSrc).toContain('"medicrew"');
  });

  test("/api/inngest route exports GET, POST, PUT", () => {
    expect(routeSrc).toContain("export const { GET, POST, PUT }");
  });
});
