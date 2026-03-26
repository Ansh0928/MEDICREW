// Tests: DELETE /api/patient (soft delete)
import { describe, test } from "vitest";

describe("COMP-05b: Account deletion", () => {
  test.todo("soft delete sets deletedAt timestamp");
  test.todo("soft delete anonymises email to deleted-{id}@medicrew.au");
  test.todo("delete requires authentication");
});
