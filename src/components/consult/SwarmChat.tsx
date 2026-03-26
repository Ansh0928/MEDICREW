"use client";
import { useState, useCallback } from "react";
import { DoctorOrbRow } from "./DoctorOrbRow";
import { LiveFeedLine } from "./LiveFeedLine";
import { ClarificationBubble } from "./ClarificationBubble";
import { SynthesisCard } from "./SynthesisCard";
import { SwarmEvent, SwarmSynthesis, DoctorRole } from "@/agents/swarm-types";
import { agentRegistry } from "@/agents/definitions";

type OrbStatus = "waiting" | "active" | "done";
interface OrbState { role: DoctorRole; status: OrbStatus }

export function SwarmChat() {
  const [step, setStep] = useState<"info" | "chat">("info");
  const [patientInfo, setPatientInfo] = useState({ age: "", gender: "", knownConditions: "" });
  const [symptoms, setSymptoms] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveFeed, setLiveFeed] = useState("");
  const [orbs, setOrbs] = useState<OrbState[]>([]);
  const [clarifications, setClarifications] = useState<Array<{ clarificationId: string; doctorRole: DoctorRole; question: string }>>([]);
  const [synthesis, setSynthesis] = useState<SwarmSynthesis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateOrb = useCallback((role: DoctorRole, status: OrbStatus) => {
    setOrbs((prev) => {
      const existing = prev.find((o) => o.role === role);
      if (!existing) return [...prev, { role, status }];
      return prev.map((o) => o.role === role ? { ...o, status } : o);
    });
  }, []);

  const handleAnswer = async (clarificationId: string, answer: string) => {
    setClarifications((prev) => prev.filter((c) => c.clarificationId !== clarificationId));
    await fetch("/api/swarm/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clarificationId, answer }),
    });
  };

  const handleEvent = (event: SwarmEvent) => {
    switch (event.type) {
      case "triage_complete":
        setLiveFeed(`Triage complete: ${event.data.urgency} urgency`);
        break;
      case "doctor_activated":
        updateOrb(event.doctorRole, "active");
        setLiveFeed(`${agentRegistry[event.doctorRole]?.name ?? event.doctorRole} is reviewing your symptoms...`);
        break;
      case "doctor_complete":
        updateOrb(event.doctorRole, "done");
        break;
      case "doctor_token":
        // Token streaming is used for live feed updates via doctor_activated
        break;
      case "question_ready":
        setClarifications((prev) => [...prev, { clarificationId: event.clarificationId, doctorRole: event.doctorRole, question: event.question }]);
        setLiveFeed("Your care team has a question for you...");
        break;
      case "phase_changed":
        if (event.phase === "debate") setLiveFeed("Your care team is discussing your case...");
        if (event.phase === "synthesis") setLiveFeed("Preparing your recommendations...");
        if (event.phase === "awaiting_patient") setLiveFeed("Waiting for your answers to continue...");
        break;
      case "synthesis_complete":
        setSynthesis(event.data);
        setIsLoading(false);
        break;
      case "done":
        setIsLoading(false);
        setLiveFeed("");
        break;
      case "error":
        setError(event.message);
        break;
    }
  };

  const startConsultation = async () => {
    if (!symptoms.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setSynthesis(null);
    setOrbs([]);
    setClarifications([]);
    setLiveFeed("");

    try {
      const res = await fetch("/api/swarm/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms, patientInfo }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Request failed" }));
        const msg = res.status === 429
          ? `Too many requests. Please wait ${errBody.retryAfter ?? 60} seconds.`
          : errBody.error ?? "Failed to start consultation.";
        setError(msg);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      // Create decoder ONCE before the while loop (streaming mode)
      const decoder = new TextDecoder("utf-8");
      let remainder = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Stream-mode decode preserves multi-byte UTF-8 state across chunks
        const chunk = decoder.decode(value, { stream: true });
        const text = remainder + chunk;
        const lines = text.split("\n");

        // Last element may be incomplete — save for next iteration
        remainder = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: SwarmEvent = JSON.parse(line.slice(6));
            handleEvent(event);
          } catch { /* skip malformed */ }
        }
      }
      // Flush any remaining decoder state
      decoder.decode();
    } catch (err) {
      setError("Connection issue. Please try again.");
    } finally {
      setIsLoading(false);
      setLiveFeed("");
    }
  };

  const handleReset = () => {
    setStep("info");
    setSymptoms("");
    setOrbs([]);
    setClarifications([]);
    setSynthesis(null);
    setError(null);
    setLiveFeed("");
    setPatientInfo({ age: "", gender: "", knownConditions: "" });
  };

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
            value={patientInfo.age}
            onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
          />
          <div className="flex gap-2">
            {["Male", "Female", "Other"].map((g) => (
              <button key={g} onClick={() => setPatientInfo({ ...patientInfo, gender: g })}
                className={`flex-1 py-2 rounded-lg border-2 text-sm transition-colors ${patientInfo.gender === g ? "border-primary bg-primary/10" : "border-border"}`}>
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
          onClick={() => setStep("chat")}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-2xl mx-auto">
      {/* Care team panel */}
      {(orbs.length > 0 || isLoading) && (
        <div className="border rounded-xl p-4 mb-4 space-y-3">
          <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">Your care team</p>
          <DoctorOrbRow orbs={orbs} />
          <LiveFeedLine text={liveFeed} />
        </div>
      )}

      {/* Clarification questions */}
      {clarifications.map((c) => (
        <div key={c.clarificationId} className="mb-4">
          <ClarificationBubble {...c} onAnswer={handleAnswer} />
        </div>
      ))}

      {/* Synthesis result */}
      {synthesis && <div className="mb-4"><SynthesisCard synthesis={synthesis} onStartNew={handleReset} /></div>}

      {/* Error */}
      {error && <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-sm text-amber-700 dark:text-amber-300">{error}</div>}

      {/* Input */}
      {!synthesis && (
        <div className="mt-auto">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Describe your symptoms..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startConsultation()}
              disabled={isLoading}
              className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background disabled:opacity-50"
              autoFocus
            />
            <button
              onClick={startConsultation}
              disabled={!symptoms.trim() || isLoading}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "→"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">Not stored · AI guidance only, not medical advice</p>
        </div>
      )}
    </div>
  );
}
