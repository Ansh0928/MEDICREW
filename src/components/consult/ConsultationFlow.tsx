"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentCard } from "./AgentCard";
import { AgentThinking } from "./AgentThinking";
import { Recommendation } from "./Recommendation";
import { TeamPanel } from "./TeamPanel";
import { VoiceInput } from "./VoiceInput";
import { ConsultationState, AgentMessage, AgentRole } from "@/agents/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  AlertCircle,
  ChevronDown,
  Check,
  Sparkles,
  User,
  Stethoscope,
  Heart,
  Brain,
  Bone,
  Eye,
} from "lucide-react";
import { speak, stopSpeaking } from "@/lib/voice";

// Doctor/Specialist options
const DOCTOR_OPTIONS = [
  { id: "auto", name: "Auto", emoji: "✨", description: "Let AI choose the right specialists" },
  { id: "gp", name: "General Practitioner", emoji: "👨‍⚕️", description: "For general health concerns" },
  { id: "cardiology", name: "Cardiologist", emoji: "❤️", description: "Heart and cardiovascular issues" },
  { id: "mental_health", name: "Mental Health", emoji: "🧠", description: "Anxiety, depression, stress" },
  { id: "dermatology", name: "Dermatologist", emoji: "🩹", description: "Skin, hair, nail conditions" },
  { id: "orthopedic", name: "Orthopedic", emoji: "🦴", description: "Bones, joints, muscles" },
  { id: "gastro", name: "Gastroenterologist", emoji: "🫃", description: "Digestive system issues" },
  { id: "physiotherapy", name: "Physiotherapist", emoji: "🏃‍♂️", description: "Rehabilitation, injuries, movement" },
];

// Chat message type for the conversation
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  agentMessage?: AgentMessage;
}

export function ConsultationFlow() {
  // Onboarding state
  const [step, setStep] = useState<"doctor" | "info" | "chat">("doctor");
  const [selectedDoctor, setSelectedDoctor] = useState(DOCTOR_OPTIONS[0]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [patientInfo, setPatientInfo] = useState({
    age: "",
    gender: "",
    knownConditions: "",
  });

  // Chat state
  const [inputMessage, setInputMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [currentAgentStep, setCurrentAgentStep] = useState<string>("");
  const [activeAgents, setActiveAgents] = useState<AgentRole[]>([]);
  const [result, setResult] = useState<ConsultationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSpokenIndex = useRef(-1);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, agentMessages, currentAgentStep]);

  // Speak new agent messages when voice is enabled
  useEffect(() => {
    if (!voiceEnabled || agentMessages.length === 0) return;

    const newMessages = agentMessages.slice(lastSpokenIndex.current + 1);
    if (newMessages.length > 0) {
      const latestMessage = newMessages[newMessages.length - 1];
      if (!isLoading || latestMessage.role === "orchestrator") {
        speak(latestMessage.content, {});
        lastSpokenIndex.current = agentMessages.length - 1;
      }
    }
  }, [agentMessages, voiceEnabled, isLoading]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const handleVoiceTranscript = (text: string) => {
    setInputMessage((prev) => prev + (prev ? " " : "") + text);
  };

  const handleStartChat = () => {
    if (!patientInfo.age || !patientInfo.gender) return;

    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `Hello! I'm your ${selectedDoctor.id === "auto" ? "AI medical team" : selectedDoctor.name}. I see you're a ${patientInfo.age} year old ${patientInfo.gender}${patientInfo.knownConditions ? ` with ${patientInfo.knownConditions}` : ""}.\n\nHow can I help you today? Please describe your symptoms or concerns.`,
      timestamp: new Date(),
    };

    setChatMessages([welcomeMessage]);
    setStep("chat");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError(null);
    // Don't clear previous agent messages - keep conversation history
    // setAgentMessages([]);  // Removed to preserve history
    // setActiveAgents([]);   // Removed to preserve history
    // setResult(null);       // Removed to preserve history
    setCurrentAgentStep("triage");

    // Build conversation history for context (limit to last 3 exchanges to avoid timeout)
    const recentUserMessages = chatMessages.filter(m => m.role === "user").slice(-3);
    const recentAgentSummary = agentMessages.slice(-2).map(m =>
      `${m.agentName}: ${m.content.substring(0, 300)}`
    );
    const conversationHistory = [
      ...recentUserMessages.map(m => `Patient: ${m.content}`),
      ...recentAgentSummary
    ].join("\n\n");

    // Build the full context including conversation history
    const isFollowUp = chatMessages.length > 1 || agentMessages.length > 0;
    const fullSymptoms = isFollowUp
      ? `Patient: ${patientInfo.age} year old ${patientInfo.gender}${patientInfo.knownConditions ? `, known conditions: ${patientInfo.knownConditions}` : ""}\n\n--- PREVIOUS CONVERSATION ---\n${conversationHistory}\n\n--- FOLLOW-UP QUESTION ---\n${userMessage.content}`
      : `Patient: ${patientInfo.age} year old ${patientInfo.gender}${patientInfo.knownConditions ? `, known conditions: ${patientInfo.knownConditions}` : ""}\n\nSymptoms/Concern: ${userMessage.content}`;

    try {
      const response = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: fullSymptoms,
          stream: true,
          preferredSpecialist: selectedDoctor.id !== "auto" ? selectedDoctor.id : undefined,
        }),
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

            // Handle error events from the API
            if (event.error) {
              setError(event.message || "Something went wrong. Please try again.");
              setIsLoading(false);
              setCurrentAgentStep("");
              return;
            }

            setCurrentAgentStep(event.step);

            if (event.data?.messages) {
              setAgentMessages((prev) => [...prev, ...event.data.messages]);
              const newRoles = event.data.messages.map((m: AgentMessage) => m.role);
              setActiveAgents((prev) => [...new Set([...prev, ...newRoles])]);
            }

            if (event.data?.recommendation) {
              const newResult = {
                ...result,
                ...event.data,
              } as ConsultationState;
              setResult(newResult);

              // Save consultation to database if patient is logged in
              saveConsultation(userMessage.content, newResult);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      // Handle network errors gracefully
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Connection lost. Please check your internet and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setCurrentAgentStep("");
    }
  };

  // Save consultation to database
  const saveConsultation = async (symptoms: string, consultationResult: ConsultationState) => {
    try {
      const patientEmail = localStorage.getItem("patientEmail");
      if (!patientEmail) return; // No patient logged in, skip saving

      // First get the patient ID
      const patientsRes = await fetch("/api/patients");
      const patients = await patientsRes.json();
      const patient = patients.find((p: { email: string }) => p.email === patientEmail);

      if (!patient) return;

      // Save the consultation
      await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          symptoms,
          urgencyLevel: consultationResult.urgencyLevel,
          redFlags: consultationResult.redFlags,
          recommendation: consultationResult.recommendation,
        }),
      });
    } catch (error) {
      console.error("Failed to save consultation:", error);
      // Don't show error to user - this is a background operation
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStartNew = () => {
    setChatMessages([]);
    setAgentMessages([]);
    setActiveAgents([]);
    setResult(null);
    setCurrentAgentStep("");
    setError(null);
    setStep("doctor");
    setPatientInfo({ age: "", gender: "", knownConditions: "" });
  };

  const hasStartedChat = step === "chat";

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* Step 1: Doctor Selection */}
          {step === "doctor" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex items-center justify-center"
            >
              <Card className="w-full max-w-xl p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Stethoscope className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    Choose Your Consultation Type
                  </h2>
                  <p className="text-muted-foreground">
                    Select a specialist or let AI route you automatically
                  </p>
                </div>

                {/* Doctor selector dropdown */}
                <div className="relative mb-6">
                  <button
                    onClick={() => setShowDoctorDropdown(!showDoctorDropdown)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 hover:border-primary transition-colors bg-background"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{selectedDoctor.emoji}</span>
                      <div className="text-left">
                        <p className="font-medium">{selectedDoctor.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedDoctor.description}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showDoctorDropdown ? "rotate-180" : ""}`} />
                  </button>

                  {showDoctorDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                      {DOCTOR_OPTIONS.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            setSelectedDoctor(doc);
                            setShowDoctorDropdown(false);
                          }}
                          className={`w-full flex items-center gap-3 p-4 hover:bg-muted transition-colors text-left ${selectedDoctor.id === doc.id ? "bg-primary/5" : ""
                            }`}
                        >
                          <span className="text-2xl">{doc.emoji}</span>
                          <div className="flex-1">
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {doc.description}
                            </p>
                          </div>
                          {selectedDoctor.id === doc.id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => setStep("info")}
                  className="w-full"
                  size="lg"
                >
                  Continue
                </Button>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Patient Info */}
          {step === "info" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex items-center justify-center"
            >
              <Card className="w-full max-w-xl p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    Tell Us About Yourself
                  </h2>
                  <p className="text-muted-foreground">
                    This helps us provide better recommendations
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Age */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Age *
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter your age"
                      value={patientInfo.age}
                      onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
                      min={0}
                      max={120}
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Gender *
                    </label>
                    <div className="flex gap-2">
                      {["Male", "Female", "Other"].map((g) => (
                        <button
                          key={g}
                          onClick={() => setPatientInfo({ ...patientInfo, gender: g })}
                          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${patientInfo.gender === g
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50"
                            }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Known conditions */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Any known medical conditions? (optional)
                    </label>
                    <Input
                      placeholder="e.g., Diabetes, Hypertension, Asthma"
                      value={patientInfo.knownConditions}
                      onChange={(e) => setPatientInfo({ ...patientInfo, knownConditions: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setStep("doctor")}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleStartChat}
                    disabled={!patientInfo.age || !patientInfo.gender}
                    className="flex-1"
                  >
                    Start Chat
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  🔒 Your information is processed securely and never stored
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: Chat Interface */}
        {step === "chat" && (
          <div className="flex-1 flex flex-col bg-background rounded-xl border overflow-hidden">
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedDoctor.emoji}</span>
                <div>
                  <p className="font-medium text-sm">{selectedDoctor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {patientInfo.age}y {patientInfo.gender}
                    {patientInfo.knownConditions && ` • ${patientInfo.knownConditions}`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleStartNew}>
                New Chat
              </Button>
            </div>

            {/* Messages area - using overflow-y-auto for reliable scrolling */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {/* Chat messages */}
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                      }`}>
                      {msg.role === "user" ? "👤" : selectedDoctor.emoji}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                      }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {/* Agent messages (team discussion) */}
                {agentMessages.map((message, index) => (
                  <AgentCard
                    key={`${message.role}-${index}`}
                    message={message}
                    isLatest={index === agentMessages.length - 1 && !isLoading}
                  />
                ))}

                {/* Loading indicator */}
                {isLoading && currentAgentStep && (
                  <AgentThinking
                    currentStep={currentAgentStep}
                    activeAgents={activeAgents}
                  />
                )}

                {/* Recommendation */}
                {result?.recommendation && (
                  <Recommendation
                    recommendation={result.recommendation}
                    onStartNew={handleStartNew}
                  />
                )}

                {/* Error */}
                {error && (
                  <Card className="p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">⚠️</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                          {error.includes("busy") ? "High Demand" : "Oops!"}
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                          {error}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setError(null);
                              // Retry the last message if there was one
                              if (chatMessages.length > 0) {
                                const lastUserMessage = chatMessages.filter(m => m.role === "user").pop();
                                if (lastUserMessage) {
                                  setInputMessage(lastUserMessage.content);
                                }
                              }
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            🔄 Try Again
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setError(null)}
                            className="text-amber-700 dark:text-amber-300"
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input area */}
            <div className="p-4 border-t bg-muted/30">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={inputRef}
                      placeholder="Describe your symptoms..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="min-h-[52px] max-h-[200px] resize-none pr-12 rounded-xl"
                      rows={1}
                    />
                    <div className="absolute bottom-2 right-2">
                      <VoiceInput
                        onTranscript={handleVoiceTranscript}
                        onInterimTranscript={(text) => setInputMessage((prev) => prev + text)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="icon"
                    className="h-[52px] w-[52px] rounded-xl"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Press Enter to send • Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side panel - team (only show during chat) */}
      {hasStartedChat && agentMessages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-64 flex-shrink-0 hidden lg:block"
        >
          <TeamPanel
            activeAgents={activeAgents}
            currentAgent={currentAgentStep as AgentRole}
          />
        </motion.div>
      )}
    </div>
  );
}
