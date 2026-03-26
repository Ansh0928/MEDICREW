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
