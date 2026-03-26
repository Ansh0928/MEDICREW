// src/components/layout/SessionsColumn.tsx
"use client";
import { useState } from "react";

interface Patient {
  id: string;
  name: string;
  avatarSeed: string;
  urgency: "emergency" | "urgent" | "routine";
  time: string;
  isActive?: boolean;
}

const MOCK_PATIENTS: Patient[] = [
  { id: "1", name: "Jordan K.", avatarSeed: "Jordan", urgency: "routine", time: "Now", isActive: true },
  { id: "2", name: "Maria S.", avatarSeed: "Maria", urgency: "urgent", time: "2:30 PM" },
  { id: "3", name: "David T.", avatarSeed: "David", urgency: "routine", time: "3:00 PM" },
];

const urgencyColor: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  urgent: "bg-orange-100 text-orange-700",
  routine: "bg-green-100 text-green-700",
};

export function SessionsColumn({ activePatientId }: { activePatientId?: string }) {
  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");

  return (
    <div className="w-56 flex flex-col border-r border-gray-100 bg-white flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(["upcoming", "recent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${tab === t ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Patient list */}
      <div className="flex-1 overflow-y-auto">
        {MOCK_PATIENTS.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-gray-50 ${p.isActive || activePatientId === p.id ? "bg-blue-50" : ""}`}
          >
            <div className="relative flex-shrink-0">
              <img
                src={`https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${p.avatarSeed}&size=32`}
                alt={p.name}
                className="w-8 h-8 rounded-full bg-gray-100"
              />
              {(p.isActive || activePatientId === p.id) && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-1 ring-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
              <p className="text-[10px] text-gray-400">{p.time}</p>
            </div>
            <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${urgencyColor[p.urgency]}`}>
              {p.urgency}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
