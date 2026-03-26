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
