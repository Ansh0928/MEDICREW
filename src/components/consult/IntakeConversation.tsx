"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { BodyMap, BodyRegion } from "./BodyMap";
import { IntakeAnswer, IntakeQuestion, buildSymptomsFromAnswers, buildHistorySummaryFromAnswers } from "@/lib/intake-types";

interface IntakeConversationProps {
  onComplete: (answers: IntakeAnswer[], symptoms: string, historySummary: string) => void;
}

export function IntakeConversation({ onComplete }: IntakeConversationProps) {
  const [answers, setAnswers] = useState<IntakeAnswer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<IntakeQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchNextQuestion = useCallback(async (answersToSend: IntakeAnswer[]) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setCurrentAnswer("");

    try {
      const res = await fetch("/api/consult/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersToSend }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`intake API error ${res.status}`);
      const question: IntakeQuestion = await res.json();
      setCurrentQuestion(question);
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // ignore cancelled requests
      setError("Connection issue — please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch first question on mount
  useEffect(() => { fetchNextQuestion([]); }, [fetchNextQuestion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleNext = useCallback((overrideAnswer?: string) => {
    const answer = (overrideAnswer ?? currentAnswer).trim();
    if (!currentQuestion || (!answer && currentQuestion.type !== "confirm")) return;

    const newAnswer: IntakeAnswer = {
      questionId: currentQuestion.questionId,
      question: currentQuestion.question,
      answer,
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    if (currentQuestion.done) {
      const symptoms = buildSymptomsFromAnswers(updatedAnswers);
      const historySummary = buildHistorySummaryFromAnswers(updatedAnswers);
      onComplete(updatedAnswers, symptoms, historySummary);
      return;
    }

    fetchNextQuestion(updatedAnswers);
  }, [currentQuestion, currentAnswer, answers, fetchNextQuestion, onComplete]);

  const handleBack = useCallback(() => {
    if (answers.length === 0) return;
    const previous = [...answers];
    previous.pop();
    setAnswers(previous);
    fetchNextQuestion(previous);
  }, [answers, fetchNextQuestion]);

  if (isLoading && !currentQuestion) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-3 py-4">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => fetchNextQuestion(answers)}
          className="text-sm underline text-muted-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="space-y-5">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: Math.max(answers.length + 1, 1) }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i < answers.length ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <p className="text-sm font-medium text-center">{currentQuestion.question}</p>

      {/* Input by type */}
      {currentQuestion.type === "body-map" && (
        <BodyMap
          selected={(currentAnswer as BodyRegion) || null}
          onSelect={(region) => setCurrentAnswer(region)}
        />
      )}

      {currentQuestion.type === "slider" && (
        <SliderInput
          question={currentQuestion}
          value={currentAnswer}
          onChange={setCurrentAnswer}
        />
      )}

      {(currentQuestion.type === "chips" || currentQuestion.type === "emotional") && (
        <div className="flex flex-wrap gap-2 justify-center">
          {(currentQuestion.options ?? []).map((opt) => (
            <button
              key={opt}
              onClick={() => {
                setCurrentAnswer(opt);
                handleNext(opt);
              }}
              disabled={isLoading}
              className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                currentAnswer === opt
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {currentQuestion.type === "text" && (
        <textarea
          placeholder="Describe in your own words..."
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background resize-none"
          aria-label={currentQuestion.question}
          autoFocus
        />
      )}

      {currentQuestion.type === "confirm" && (
        <textarea
          placeholder="Optional — leave blank to skip"
          value={currentAnswer}
          onChange={(e) => {
            if (e.target.value.length <= 2000) setCurrentAnswer(e.target.value);
          }}
          maxLength={2000}
          rows={3}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background resize-none"
          aria-label={currentQuestion.question}
          autoFocus
        />
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        {answers.length > 0 && (
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            ← Back
          </button>
        )}
        <button
          onClick={() => handleNext()}
          disabled={
            isLoading ||
            (currentQuestion.type !== "confirm" && !currentAnswer.trim()) ||
            (currentQuestion.type === "body-map" && !currentAnswer)
          }
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading
            </span>
          ) : currentQuestion.done ? (
            "Submit →"
          ) : (
            "Next →"
          )}
        </button>
      </div>
    </div>
  );
}

// Extracted to avoid inline IIFE side-effect pattern in render
function SliderInput({
  question,
  value,
  onChange,
}: {
  question: IntakeQuestion;
  value: string;
  onChange: (v: string) => void;
}) {
  const min = question.min ?? 1;
  const max = question.max ?? 10;
  const defaultVal = String(Math.round((min + max) / 2));
  const displayVal = value || defaultVal;

  // Set default on first render via useEffect
  useEffect(() => {
    if (!value) {
      onChange(defaultVal);
    }
  }, [value, defaultVal, onChange]);

  return (
    <div className="space-y-2">
      <input
        type="range"
        min={min}
        max={max}
        value={displayVal}
        onChange={(e) => onChange(e.target.value)}
        className="w-full accent-primary"
        aria-label={question.question}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min} — mild</span>
        <span className="font-medium text-foreground text-sm">{displayVal}</span>
        <span>{max} — severe</span>
      </div>
    </div>
  );
}
