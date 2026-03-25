# Stack Research: Medicrew AI Patient Care Platform

**Project:** Medicrew — brownfield extension of Next.js 14 + LangGraph + Prisma (SQLite)
**Researched:** 2026-03-26
**Research Mode:** Ecosystem / Stack dimension

---

## Recommended Stack

### Database — Production Persistence

- **Supabase (PostgreSQL)** v2.100.0 (`@supabase/supabase-js`) — The only viable choice for this project because it ships PostgreSQL + Realtime + Auth + Storage as a single managed platform. The Prisma ↔ Supabase integration path is documented and production-proven. Supabase's Realtime Postgres Changes feature is directly required for the "care team status" feature (INSERT/UPDATE on notifications table triggers live patient dashboard updates). No other option bundles both the database and the real-time layer into one service without a separate WebSocket server. (Confidence: HIGH — official Supabase docs + Prisma partner page verified)

- **@supabase/ssr** v0.9.0 — Required for server-side auth cookies in Next.js App Router. The older `@supabase/auth-helpers-nextjs` package is deprecated; `@supabase/ssr` is the current official replacement. (Confidence: HIGH — official Supabase docs)

- **Prisma** v6.x (already installed at ^6.19.2) — Keep as ORM. The SQLite → PostgreSQL migration is a provider swap in `schema.prisma` plus connection string update. Prisma handles connection pooling via PgBouncer URL (Supabase provides this). No ORM change needed. (Confidence: HIGH — Prisma official docs + Supabase partner page)

**Why not Neon:** Neon suffered a 5.5-hour us-east-1 outage in May 2025. More critically, it does not bundle a real-time layer — you would need a separate service for agent status updates. For a healthcare platform where "Dr. Sarah is reviewing your case" must update live, Neon adds unnecessary complexity and risk.

**Why not PlanetScale:** Built on Vitess/MySQL, not PostgreSQL. Prisma schema and query syntax would require non-trivial changes. Real-time subscriptions not included.

---

### Real-Time — Agent Status and Care Team Indicators

- **Supabase Realtime (Postgres Changes)** — Subscribe to `INSERT`/`UPDATE` on the `Notification` and `Consultation` tables to drive live patient dashboard state (`"Dr. Sarah is reviewing your case"`). Architecture: Supabase Realtime server polls Postgres WAL → delivers change events over WebSocket to the browser client. No separate WebSocket server required. (Confidence: HIGH — Supabase official docs)

  **Critical production caveat:** Supabase Realtime WebSocket connections drop approximately every 30 minutes and can appear to hang before breaking. Production implementation MUST add: exponential backoff reconnect logic, unique channel names per user session, and cleanup on component unmount. Use the `onSubscribe` callback to confirm subscription status before trusting the channel. (Confidence: HIGH — multiple production reports)

  **Scale caveat:** Postgres Changes triggers one RLS access check per subscriber per change event. For 100 concurrent patients receiving a care team update, that is 100 reads per write. Mitigate by using a `public` (no-RLS) notifications table and enforcing access at the application layer instead. At early scale (sub-1,000 patients) this is not a blocker.

- **Server-Sent Events (SSE) via Next.js Route Handler** — Use for the LangGraph streaming consultation UI (one-way server-to-client token stream). SSE works on Vercel serverless without managing WebSocket infrastructure. The existing `streamConsultation()` async generator in `orchestrator.ts` maps directly to an SSE response. (Confidence: HIGH — Next.js + Vercel official docs)

  **Do not use WebSockets directly in Next.js on Vercel** — serverless functions terminate after response, making persistent WebSocket connections impossible without a separate WebSocket server (e.g., Ably, Pusher). SSE is the correct primitive for unidirectional streaming on Vercel.

---

### Streaming LLM Responses — Patient Consultation UI

- **Vercel AI SDK** v6.x (`ai` ^6.0.57, already installed) — The existing `package.json` already has `"ai": "^6.0.57"`. This is AI SDK v6 (released late 2024 / current as of 2025). Use `@ai-sdk/langchain` v2.0.144 as the adapter layer. (Confidence: HIGH — official ai-sdk.dev docs)

- **`@ai-sdk/langchain`** v2.0.144 — Provides `toUIMessageStream()` to convert LangGraph `graph.stream()` events directly into the AI SDK UI message format. This is the bridge that turns the existing `streamConsultation()` async generator into a `useChat`-compatible stream. Key APIs:
  - `toBaseMessages()` — converts UI messages to LangChain `HumanMessage`/`SystemMessage` format
  - `toUIMessageStream()` — transforms LangGraph event streams into AI SDK ReadableStream
  (Confidence: HIGH — ai-sdk.dev/providers/adapters/langchain)

- **`useChat` hook from `ai/react`** — Client-side hook for the consultation streaming UI. Handles token buffering, message history, loading states. Requires a `/api/chat` route handler that returns a `StreamingTextResponse`. The hook exposes `messages`, `input`, `handleSubmit` — maps directly to a streaming consultation component with named agent attribution. (Confidence: HIGH — official AI SDK docs)

  **Streaming pattern for named agents:** The existing `AgentMessage` type (with `agentName` field) must be surfaced through the stream. Use `streamMode: "messages"` on `graph.stream()` to emit each agent's message as it completes, then pipe through `toUIMessageStream()`. The client renders each message chunk with the agent's name and avatar.

---

### Async Background Jobs — Proactive Check-ins

- **Inngest** v4.1.0 — Event-driven, durable workflow engine for Next.js. Required for: proactive check-in scheduling ("3 days post-consultation, send Dr. Alex follow-up"), escalation detection jobs, and async notification delivery. Key reasons over alternatives:
  - Zero infrastructure — no Redis, no separate worker process. Inngest runs as a Next.js Route Handler (`/api/inngest`).
  - Durable retries — if an LLM call fails mid-check-in, Inngest retries from the failed step, not from the start. This is critical for a healthcare workflow where partial completions (half a check-in message sent) must not silently fail.
  - `inngest.createScheduledFunction` handles cron-based proactive outreach
  - Native Vercel integration (available in Vercel Marketplace)
  - Handles over 100 million daily executions (production-proven at scale)
  (Confidence: HIGH — inngest.com docs + Vercel Marketplace listing)

**Why not QStash (Upstash):** QStash is an HTTP-based message queue — it POSTs to your API routes, which is simpler but provides no step-level durability. A multi-step check-in workflow (fetch patient history → run LLM → save message → send email) would restart from scratch on failure. Inngest's step functions give per-step retry granularity, which matters for LLM-heavy workflows.

**Why not BullMQ:** Requires a managed Redis instance. Adds infrastructure cost and operational overhead. BullMQ's Next.js integration requires a long-running server process — incompatible with Vercel serverless deployment.

---

### Email / Push Notifications

- **Resend** v6.9.4 — Developer-first transactional email for Next.js. The ecosystem standard in 2025 for Next.js + Supabase apps. Use with **React Email** (`react-email` / `@react-email/components`) to build typed email templates (e.g., "Dr. Alex has a new message for you"). DKIM/SPF built in, critical for healthcare email deliverability. Integrates directly with Inngest — trigger Resend sends from within Inngest step functions for durability. (Confidence: HIGH — Resend official docs + Inngest/Resend community examples)

- **Web Push (future):** For mobile push notifications, the browser Push API + `web-push` library is the standard. Defer until after Inngest + Resend email flow is proven. PWA manifest + service worker required — scope this as a v2 feature aligned with the project's "mobile later" constraint.

---

### Agent Memory — Cross-Consultation Persistence

- **`@skroyc/langgraph-supabase-checkpointer`** (community, unversioned stable) — A LangGraph checkpoint saver backed by Supabase. Passes the full LangGraphJS checkpoint validation test suite (710/710 tests). Enables agents to remember prior consultations per patient via LangGraph's thread-based memory model. Isolates data by `user_id` with Supabase RLS enabled by default. (Confidence: MEDIUM — npm package verified, community-maintained not LangChain-official)

  **Alternative (recommended if `@skroyc` package goes stale):** Implement a custom `BaseCheckpointSaver` writing to Supabase PostgreSQL directly via Prisma. The LangGraph checkpointer interface is straightforward (3 methods: `get`, `put`, `list`). This is the fallback if the community package stops being maintained.

---

### Auth

- **Supabase Auth (via `@supabase/ssr`)** — The project has existing auth (patient portal + doctor portal login). Migrate from whatever the current auth mechanism is to Supabase Auth. Supabase Auth handles sessions, JWT, and row-level security that flows through to Realtime subscriptions. This is the only auth system that integrates cleanly with Supabase Realtime's per-user channel authorization. (Confidence: HIGH — Supabase official docs)

---

## What NOT to Use

| Library / Approach | Why Not |
|--------------------|---------|
| **WebSockets (direct, Next.js)** | Vercel serverless functions terminate on response — no persistent connection. Would require Ably/Pusher/dedicated WS server. SSE is sufficient for all one-way streams in this app. |
| **Neon** | No built-in real-time layer; 5.5-hour outage in May 2025 on us-east-1; would require separate service for agent status updates, adding cost and failure surface. |
| **PlanetScale** | MySQL-based (Vitess), not PostgreSQL. Prisma schema incompatible without rewrite. No real-time subscriptions. |
| **BullMQ** | Requires persistent Redis. Incompatible with Vercel serverless. Adds infrastructure management burden. |
| **QStash** | HTTP-based only — no step-level durability for multi-step LLM workflows. Full restart on failure means partial check-ins silently lost. |
| **`@supabase/auth-helpers-nextjs`** | Deprecated as of 2024. Replaced by `@supabase/ssr`. Do not install. |
| **`next-auth` / `Auth.js`** | Would conflict with Supabase Auth and Supabase Realtime's user-scoped channel authorization. Unnecessary complexity given Supabase Auth handles the full flow. |
| **`langchain` v0.x memory classes** | Deprecated. LangGraph's checkpointer API replaced the older `BufferMemory` / `ConversationSummaryMemory` pattern. Do not use `ConversationChain` or `ChatHistory` from base LangChain for agent memory. |
| **Raw `pg` / `postgres.js` client** | Prisma already handles type-safe DB access. Adding a raw client creates inconsistent query patterns and bypasses migration management. |

---

## Migration Path: SQLite to Supabase PostgreSQL

### Step 1 — Environment Separation
Keep SQLite for local development. Add environment-conditional provider:

```
# .env.local
DATABASE_URL="file:./dev.db"

# .env.production
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-2.supabase.co:5432/postgres"
```

### Step 2 — schema.prisma Update

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // required for migrations bypassing PgBouncer
}
```

Note: `directUrl` is required because PgBouncer (Supabase's pooler) does not support Prisma's migration DDL statements. Migrations must run against the direct connection; queries run against the pooler URL.

### Step 3 — Migration
```bash
bunx prisma migrate deploy  # applies existing migrations to Supabase PostgreSQL
```

If the existing SQLite migrations have SQLite-specific types (e.g., `DateTime` stored as TEXT), generate a fresh baseline migration for PostgreSQL rather than porting SQLite migrations.

### Step 4 — Add Supabase Client
```bash
bun add @supabase/supabase-js @supabase/ssr
```

Create `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (Next.js Server Components / Route Handlers) following the `@supabase/ssr` pattern.

### Step 5 — Enable Realtime
In the Supabase dashboard: Table Editor → `notifications` table → Enable Realtime. Add a publication:
```sql
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table consultations;
```

### Step 6 — Validate Prisma Connection Pooling
On Vercel, each serverless function invocation opens a new DB connection. With PgBouncer URL, Prisma uses transaction-mode pooling. Confirm `?pgbouncer=true&connection_limit=1` is in the pooler URL to prevent connection exhaustion.

---

## Full Package Delta

Packages to **add** (not already in `package.json`):

```bash
bun add @supabase/supabase-js @supabase/ssr inngest resend @react-email/components @ai-sdk/langchain @skroyc/langgraph-supabase-checkpointer
```

Packages already present (confirm versions are sufficient):
- `ai` ^6.0.57 — already installed, sufficient
- `@langchain/langgraph` ^1.1.2 — already installed, sufficient
- `prisma` ^6.19.2 — already installed, sufficient
- `zod` ^4.3.6 — already installed, sufficient

Packages to **remove** after migration:
- `better-sqlite3` — remove after production migration confirmed
- `@prisma/adapter-better-sqlite3` — remove after migration

---

## Sources

- [Supabase Realtime with Next.js — official docs](https://supabase.com/docs/guides/realtime/realtime-with-nextjs)
- [Supabase Postgres Changes — official docs](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Prisma + Supabase integration guide](https://supabase.com/docs/guides/database/prisma)
- [Vercel AI SDK — LangChain adapter](https://ai-sdk.dev/providers/adapters/langchain)
- [AI SDK v6 announcement](https://vercel.com/blog/ai-sdk-6)
- [Inngest background jobs for Next.js](https://www.inngest.com/blog/run-nextjs-functions-in-the-background)
- [Inngest on Vercel Marketplace](https://vercel.com/marketplace/inngest)
- [Resend for Next.js](https://resend.com/nextjs)
- [LangGraph Supabase checkpointer — npm](https://www.npmjs.com/package/@skroyc/langgraph-supabase-checkpointer)
- [Supabase vs Neon vs PlanetScale comparison — Sabo](https://getsabo.com/blog/supabase-vs-neon)
- [SSE vs WebSockets in 2025 — DEV Community](https://dev.to/haraf/server-sent-events-sse-vs-websockets-vs-long-polling-whats-best-in-2025-5ep8)
- [LangGraph checkpointing best practices 2025 — Sparkco](https://sparkco.ai/blog/mastering-langgraph-checkpointing-best-practices-for-2025)
