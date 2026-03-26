"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState, useCallback } from "react";
import { AgentOverlay, RoutingNotice } from "@/components/consult/AgentOverlay";
import { CareSummary } from "@/components/consult/CareSummary";
import { CARE_TEAM } from "@/lib/care-team-config";

interface CurrentAgent {
  agentName?: string;
  agentRole?: string;
  specialty?: string;
}

interface CareRecommendation {
  urgency: string;
  summary: string;
  nextSteps: string[];
  questionsForDoctor: string[];
  specialistType?: string;
  timeframe: string;
  disclaimer: string;
}

interface ConsultMessage {
  agentName: string;
  agentRole: string;
  content: string;
  step: string;
}

export default function ConsultPage() {
  const [symptoms, setSymptoms] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<CurrentAgent>({});
  const [routingSpecialists, setRoutingSpecialists] = useState<string[]>([]);
  const [streamingText, setStreamingText] = useState(""); // Progressive token buffer
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<CareRecommendation | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!symptoms.trim() || isLoading) return;

    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setMessages([]);
    setStreamingText("");
    setCurrentAgent({});
    setRoutingSpecialists([]);
    setRecommendation(null);

    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: Phase 2 — replace with Supabase Auth session header
          "x-patient-id": "demo-patient",
        },
        body: JSON.stringify({ symptoms, stream: true }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Request failed" }));
        const msg =
          res.status === 429
            ? `Too many requests. Please wait ${(errBody as { retryAfter?: number }).retryAfter ?? 60} seconds.`
            : (errBody as { error?: string }).error ?? "Failed to start consultation.";
        setError(msg);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder("utf-8");
      let remainder = "";
      // Track the current streaming agent for finalising messages on node_output
      let activeAgent: CurrentAgent = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const text = remainder + chunk;
        const lines = text.split("\n");

        // Last element may be incomplete — save for next iteration
        remainder = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") {
            setIsStreaming(false);
            setCurrentAgent({});
            setStreamingText("");
            break;
          }

          try {
            const parsed = JSON.parse(raw);

            if (parsed.error) {
              setError(parsed.message ?? "Something went wrong. Please try again.");
              continue;
            }

            if (parsed.eventType === "token_delta") {
              // Append delta text to the current streaming buffer for progressive rendering
              setStreamingText((prev) => prev + (parsed.delta || ""));
              const agent: CurrentAgent = {
                agentName: parsed.agentName,
                agentRole: parsed.agentRole,
                specialty: parsed.specialty,
              };
              setCurrentAgent(agent);
              activeAgent = agent;
            } else if (parsed.eventType === "node_output") {
              // Full node output received — finalise the current streaming message
              if (activeAgent.agentName && parsed.data?.messages?.length > 0) {
                const nodeMessage = parsed.data.messages[parsed.data.messages.length - 1];
                setMessages((prev) => [
                  ...prev,
                  {
                    agentName: activeAgent.agentName ?? nodeMessage.agentName,
                    agentRole: activeAgent.agentRole ?? nodeMessage.role,
                    content: nodeMessage.content,
                    step: parsed.step,
                  },
                ]);
              }
              // Extract recommendation from the recommend node output
              if (parsed.step === "recommend" && parsed.data?.recommendation) {
                setRecommendation(parsed.data.recommendation as CareRecommendation);
              }
              // Clear streaming buffer after node completes
              setStreamingText("");
              activeAgent = {};
            } else if (parsed.eventType === "routing") {
              // Show which specialists are being consulted after triage
              const specialistNames = (parsed.data?.relevantSpecialties ?? [])
                .filter((role: string) => !["triage", "orchestrator"].includes(role))
                .map((role: string) => {
                  const agent = CARE_TEAM.find((a) => a.role === role);
                  return agent?.name || role;
                });
              setRoutingSpecialists(specialistNames);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
      decoder.decode(); // flush
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [symptoms, isLoading]);

  const handleReset = () => {
    setSymptoms("");
    setMessages([]);
    setStreamingText("");
    setCurrentAgent({});
    setRoutingSpecialists([]);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
    setRecommendation(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <span className="font-bold text-xl">MediCrew</span>
          </div>
        </header>

        {/* Main consultation area */}
        <div className="flex flex-col max-w-2xl mx-auto space-y-4">
          {/* Agent identity overlay — shows who is speaking during streaming */}
          <AgentOverlay
            agentName={currentAgent.agentName}
            agentRole={currentAgent.agentRole}
            specialty={currentAgent.specialty}
            isStreaming={isStreaming}
          />

          {/* Routing notice — shows after triage which specialists are reviewing */}
          <RoutingNotice specialists={routingSpecialists} />

          {/* Completed messages */}
          {messages.map((msg, i) => {
            const teamMember = CARE_TEAM.find((a) => a.role === msg.agentRole);
            return (
              <div key={i} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{teamMember?.emoji ?? ""}</span>
                  <span className="font-medium text-sm">{msg.agentName}</span>
                  {teamMember?.specialty && (
                    <span className="text-xs text-muted-foreground">· {teamMember.specialty}</span>
                  )}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
              </div>
            );
          })}

          {/* In-progress streaming text — renders token-by-token */}
          {streamingText && (
            <div className="p-4 rounded-lg border bg-card/50 animate-in fade-in">
              <p className="text-sm text-foreground whitespace-pre-wrap">{streamingText}</p>
              <span className="inline-block w-1 h-4 bg-foreground/50 animate-pulse ml-0.5" />
            </div>
          )}

          {/* Care Summary — shown after streaming completes and recommendation is available */}
          {recommendation && !isStreaming && (
            <CareSummary recommendation={recommendation} />
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-sm text-amber-700 dark:text-amber-300">
              {error}
            </div>
          )}

          {/* Input area */}
          {messages.length === 0 && !isLoading ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Describe your symptoms..."
                aria-label="Describe your symptoms"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                disabled={isLoading}
                className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background disabled:opacity-50"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={!symptoms.trim() || isLoading}
                aria-label={isLoading ? "Sending consultation" : "Send symptoms"}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "→"
                )}
              </button>
            </div>
          ) : messages.length > 0 ? (
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Start new consultation
            </button>
          ) : null}

          <p className="text-xs text-muted-foreground text-center">
            Not stored · AI guidance only, not medical advice
          </p>
        </div>
      </div>
    </main>
  );
}
