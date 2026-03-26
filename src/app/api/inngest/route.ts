import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";

// No functions registered yet — Phase 3 will add check-in functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [],
});
