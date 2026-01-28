"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentCard } from "./AgentCard";
import { AgentThinking } from "./AgentThinking";
import { Recommendation } from "./Recommendation";
import { TeamPanel } from "./TeamPanel";
import { VoiceInput } from "./VoiceInput";
import { ConsultationState, AgentMessage, AgentRole } from "@/agents/types";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertCircle, Volume2, VolumeX } from "lucide-react";
import { speak, stopSpeaking, isSpeechSynthesisSupported } from "@/lib/voice";

export function ConsultationFlow() {
  const [symptoms, setSymptoms] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [activeAgents, setActiveAgents] = useState<AgentRole[]>([]);
  const [result, setResult] = useState<ConsultationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenIndex = useRef(-1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStep]);

  // Speak new messages when voice is enabled
  useEffect(() => {
    if (!voiceEnabled || messages.length === 0) return;
    
    const newMessages = messages.slice(lastSpokenIndex.current + 1);
    if (newMessages.length > 0) {
      const latestMessage = newMessages[newMessages.length - 1];
      // Only speak if it's a complete message (not during loading)
      if (!isLoading || latestMessage.role === "orchestrator") {
        setIsSpeaking(true);
        speak(latestMessage.content, {
          onEnd: () => setIsSpeaking(false),
        });
        lastSpokenIndex.current = messages.length - 1;
      }
    }
  }, [messages, voiceEnabled, isLoading]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const handleVoiceTranscript = (text: string) => {
    setSymptoms((prev) => prev + (prev ? " " : "") + text);
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      stopSpeaking();
      setIsSpeaking(false);
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const startConsultation = async () => {
    if (!symptoms.trim()) return;

    setIsLoading(true);
    setError(null);
    setMessages([]);
    setActiveAgents([]);
    setResult(null);
    setCurrentStep("triage");

    try {
      const response = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms, stream: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to start consultation");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            setCurrentStep(event.step);

            if (event.data.messages) {
              setMessages((prev) => [...prev, ...event.data.messages]);
              const newRoles = event.data.messages.map((m: AgentMessage) => m.role);
              setActiveAgents((prev) => [...new Set([...prev, ...newRoles])]);
            }

            if (event.data.recommendation) {
              setResult((prev) => ({
                ...prev,
                ...event.data,
              }) as ConsultationState);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };

  const handleStartNew = () => {
    setSymptoms("");
    setMessages([]);
    setActiveAgents([]);
    setResult(null);
    setCurrentStep("");
    setError(null);
  };

  const hasStarted = messages.length > 0 || isLoading;

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Main consultation area */}
      <div className="flex-1 flex flex-col">
        {/* Input section - shown when not started */}
        <AnimatePresence mode="wait">
          {!hasStarted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex items-center justify-center"
            >
              <Card className="w-full max-w-2xl p-8">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-4">👨‍⚕️👩‍⚕️🩺</div>
                  <h2 className="text-2xl font-bold mb-2">
                    Describe Your Symptoms
                  </h2>
                  <p className="text-muted-foreground">
                    Our AI care team will assess your symptoms and guide you to
                    the right care. Type or use voice input.
                  </p>
                </div>

                {/* Voice toggle */}
                {isSpeechSynthesisSupported() && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Button
                      variant={voiceEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={toggleVoice}
                      className="gap-2"
                    >
                      {voiceEnabled ? (
                        <>
                          <Volume2 className="w-4 h-4" />
                          Voice Responses On
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-4 h-4" />
                          Voice Responses Off
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div className="relative mb-4">
                  <Textarea
                    placeholder="Tell us what you're experiencing. For example: 'I've had a persistent headache for 3 days, mostly on my right side, and feel nauseous in the mornings...'"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="min-h-[150px] text-base pr-14"
                  />
                  <div className="absolute bottom-3 right-3">
                    <VoiceInput 
                      onTranscript={handleVoiceTranscript}
                      onInterimTranscript={(text) => setSymptoms((prev) => prev + text)}
                    />
                  </div>
                </div>

                <Button
                  onClick={startConsultation}
                  disabled={!symptoms.trim()}
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Consultation
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  🔒 Your information is processed securely and never stored.
                  {voiceEnabled && " 🔊 Voice responses enabled."}
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Consultation in progress */}
        {hasStarted && (
          <div className="flex-1 flex flex-col">
            {/* Symptom display */}
            <Card className="p-4 mb-4 bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  👤
                </div>
                <div>
                  <p className="text-sm font-medium text-primary mb-1">
                    Your Symptoms
                  </p>
                  <p className="text-sm text-muted-foreground">{symptoms}</p>
                </div>
              </div>
            </Card>

            {/* Messages */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <AgentCard
                    key={`${message.role}-${index}`}
                    message={message}
                    isLatest={index === messages.length - 1 && !isLoading}
                  />
                ))}

                {isLoading && currentStep && (
                  <AgentThinking
                    currentStep={currentStep}
                    activeAgents={activeAgents}
                  />
                )}

                {result?.recommendation && (
                  <Recommendation
                    recommendation={result.recommendation}
                    onStartNew={handleStartNew}
                  />
                )}

                {error && (
                  <Card className="p-4 bg-destructive/10 border-destructive/20">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStartNew}
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </Card>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Side panel - team */}
      {hasStarted && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-64 flex-shrink-0"
        >
          <TeamPanel
            activeAgents={activeAgents}
            currentAgent={currentStep as AgentRole}
          />
        </motion.div>
      )}
    </div>
  );
}
