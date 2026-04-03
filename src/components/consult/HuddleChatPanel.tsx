"use client";
import { useEffect, useRef } from "react";

export interface ChatMessage {
  id: string;
  agentName: string;
  content: string;
  type: "hypothesis" | "debate" | "rectification" | "mdt" | "system";
  messageType?: "agree" | "challenge" | "add_context" | "note" | "escalate";
}

const typeColors: Record<string, string> = {
  agree: "bg-green-100 text-green-800",
  challenge: "bg-orange-100 text-orange-800",
  add_context: "bg-blue-100 text-blue-800",
  note: "bg-blue-100 text-blue-800",
  escalate: "bg-red-100 text-red-800",
  hypothesis: "bg-purple-100 text-purple-800",
  rectification: "bg-gray-100 text-gray-800",
  system: "bg-gray-50 text-gray-500",
};

export function HuddleChatPanel({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full border-l border-gray-100">
      <div className="px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Team Discussion
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-700 truncate max-w-[100px]">
                  {msg.agentName}
                </span>
                {msg.messageType && (
                  <span
                    className={`text-[10px] px-1 py-0.5 rounded font-medium ${typeColors[msg.messageType] ?? ""}`}
                  >
                    {msg.messageType.replace("_", " ")}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 leading-snug">
                {msg.content}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
