import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

let checkpointer: PostgresSaver | null = null;

export async function getCheckpointer(): Promise<PostgresSaver> {
  if (!checkpointer) {
    const connString = process.env.DIRECT_URL;
    if (!connString) {
      throw new Error("DIRECT_URL environment variable is required for PostgresSaver");
    }
    checkpointer = PostgresSaver.fromConnString(connString, {
      schema: "langgraph",
    });
    await checkpointer.setup(); // Idempotent — creates tables if not exist
  }
  return checkpointer;
}
