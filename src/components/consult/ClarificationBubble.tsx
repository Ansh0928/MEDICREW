"use client";
import { useState } from "react";
import { agentRegistry } from "@/agents/definitions";
import { DoctorRole } from "@/agents/swarm-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  clarificationId: string;
  doctorRole: DoctorRole;
  question: string;
  onAnswer: (clarificationId: string, answer: string) => void;
}

export function ClarificationBubble({
  clarificationId,
  doctorRole,
  question,
  onAnswer,
}: Props) {
  const [answer, setAnswer] = useState("");
  const agent = agentRegistry[doctorRole];

  const handleSend = () => {
    if (answer.trim()) {
      onAnswer(clarificationId, answer);
    }
  };

  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-full bg-blue-950 border-2 border-blue-400 flex items-center justify-center text-sm flex-shrink-0">
        {agent?.emoji ?? "👤"}
      </div>
      <div className="flex-1 space-y-2">
        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
          {question}
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Your answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && answer.trim() && handleSend()
            }
            className="flex-1"
            autoFocus
          />
          <Button
            size="sm"
            disabled={!answer.trim()}
            onClick={handleSend}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
