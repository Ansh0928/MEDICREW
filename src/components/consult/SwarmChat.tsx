// src/components/consult/SwarmChat.tsx
"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DoctorRole, SwarmEvent, SwarmSynthesis } from "@/agents/swarm-types";
import { agentRegistry } from "@/agents/definitions";
import { IntakeConversation } from "./IntakeConversation";
import { TriageTransparencyPanel, OrbState } from "./TriageTransparencyPanel";
import { SynthesisCard } from "./SynthesisCard";
import { IntakeAnswer } from "@/lib/intake-types";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

type Step = "info" | "intake" | "chat";

export function SwarmChat() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [patientInfo, setPatientInfo] = useState({ age: "", gender: "", knownConditions: "" });
  // Set by IntakeConversation onComplete
  const [builtSymptoms, setBuiltSymptoms] = useState("");
  const [historySummary, setHistorySummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveFeed, setLiveFeed] = useState("");
  const [orbs, setOrbs] = useState<OrbState[]>([]);
  const [synthesis, setSynthesis] = useState<SwarmSynthesis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateOrb = useCallback((role: DoctorRole, status: OrbState["status"]) => {
    setOrbs((prev) => {
      const existing = prev.find((o) => o.role === role);
      if (!existing) return [...prev, { role, status }];
      return prev.map((o) => o.role === role ? { ...o, status } : o);
    });
  }, []);

  const handleEvent = (event: SwarmEvent) => {
    switch (event.type) {
      case "triage_complete":
        setLiveFeed(`Triage complete: ${event.data.urgency} urgency`);
        break;
      case "doctor_activated":
        updateOrb(event.role, "active");
        setLiveFeed(`${agentRegistry[event.role]?.name ?? event.role} is reviewing your symptoms...`);
        break;
      case "doctor_complete":
        updateOrb(event.role, "done");
        break;
      case "phase_changed":
        if (event.phase === "debate") setLiveFeed("Your care team is discussing your case...");
        if (event.phase === "synthesis") setLiveFeed("Preparing your recommendations...");
        break;
      case "synthesis_complete":
        setSynthesis(event.data);
        trackEvent(ANALYTICS_EVENTS.consultationCompleted, { surface: "swarm_chat", urgency: event.data.urgency });
        setIsLoading(false);
        break;
      case "done":
        setIsLoading(false);
        setLiveFeed("");
        break;
      case "error":
        setError(event.message);
        trackEvent(ANALYTICS_EVENTS.consultationErrored, { surface: "swarm_chat", message: event.message });
        break;
    }
  };

  const startConsultation = async (symptoms: string, summaryOverride?: string) => {
    if (!symptoms.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setSynthesis(null);
    setOrbs([]);
    setLiveFeed("");

    try {
      trackEvent(ANALYTICS_EVENTS.consultationStarted, { surface: "swarm_chat", source: "consult_page" });

      const payload = {
        symptoms,
        patientInfo: {
          age: patientInfo.age,
          gender: patientInfo.gender,
          knownConditions: patientInfo.knownConditions || undefined,
          historySummary: summaryOverride ?? historySummary || undefined,
        },
        stream: true,
        swarm: true,
      };

      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Request failed" }));
        if (res.status === 403 && errBody.redirectTo) {
          router.push(errBody.redirectTo);
          return;
        }
        const msg =
          res.status === 429
            ? `Too many requests. Please wait ${errBody.retryAfter ?? 60} seconds.`
            : errBody.error ?? "Failed to start consultation.";
        setError(msg);
        trackEvent(ANALYTICS_EVENTS.consultationErrored, { surface: "swarm_chat", status: res.status, error: msg });
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.error) { setError(data.error); return; }
        setIsLoading(false);
        return;
      }

      // SSE stream
      const reader = res.body?.getReader();
      if (!reader) { setError("Stream unavailable"); return; }
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          try {
            handleEvent(JSON.parse(payload) as SwarmEvent);
          } catch { /* skip malformed */ }
        }
      }
      decoder.decode();
    } catch {
      setError("Connection issue. Please try again.");
      trackEvent(ANALYTICS_EVENTS.consultationErrored, { surface: "swarm_chat", error: "connection_issue" });
    } finally {
      setIsLoading(false);
      setLiveFeed("");
    }
  };

  const handleReset = () => {
    setStep("info");
    setOrbs([]);
    setSynthesis(null);
    setError(null);
    setLiveFeed("");
    setBuiltSymptoms("");
    setHistorySummary("");
    setPatientInfo({ age: "", gender: "", knownConditions: "" });
  };

  // ── Step: info ──────────────────────────────────────────────────────────────
  if (step === "info") {
    return (
      <div className="w-full max-w-lg mx-auto p-8 space-y-5 border rounded-xl">
        <div className="text-center">
          <div className="text-4xl mb-2">🏥</div>
          <h2 className="text-xl font-bold">Tell us about yourself</h2>
          <p className="text-sm text-muted-foreground mt-1">Helps your AI care team give better guidance</p>
        </div>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="Age"
            aria-label="Age"
            value={patientInfo.age}
            onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
          />
          <div role="group" aria-label="Biological sex" className="flex gap-2">
            {["Male", "Female", "Other"].map((g) => (
              <button
                key={g}
                onClick={() => setPatientInfo({ ...patientInfo, gender: g })}
                className={`flex-1 py-2 rounded-lg border-2 text-sm transition-colors ${
                  patientInfo.gender === g ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Known conditions (optional)"
            value={patientInfo.knownConditions}
            onChange={(e) => setPatientInfo({ ...patientInfo, knownConditions: e.target.value })}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>
        <button
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          disabled={!patientInfo.age || !patientInfo.gender}
          onClick={() => setStep("intake")}
        >
          Continue →
        </button>
      </div>
    );
  }

  // ── Step: intake ─────────────────────────────────────────────────────────────
  if (step === "intake") {
    return (
      <div className="w-full max-w-lg mx-auto p-8 space-y-5 border rounded-xl">
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold">What brings you in today?</h2>
          <p className="text-xs text-muted-foreground mt-1">Answer a few questions so your care team is ready</p>
        </div>
        <IntakeConversation
          onComplete={(answers: IntakeAnswer[], symptoms: string, summary: string) => {
            setBuiltSymptoms(symptoms);
            setHistorySummary(summary);
            setStep("chat");
            startConsultation(symptoms, summary);
          }}
        />
      </div>
    );
  }

  // ── Step: chat (consultation in progress / complete) ──────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-2xl mx-auto">
      <TriageTransparencyPanel
        orbs={orbs}
        liveFeed={liveFeed}
        isVisible={orbs.length > 0 || isLoading}
      />

      {synthesis && (
        <div className="mb-4">
          <SynthesisCard synthesis={synthesis} onStartNew={handleReset} />
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-sm text-amber-700 dark:text-amber-300">
          {error}
        </div>
      )}

      {!synthesis && !isLoading && (
        <div className="mt-auto text-center space-y-3 py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Connecting your care team...</p>
        </div>
      )}

      {isLoading && orbs.length === 0 && (
        <div className="mt-auto text-center space-y-3 py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Starting consultation...</p>
        </div>
      )}
    </div>
  );
}
