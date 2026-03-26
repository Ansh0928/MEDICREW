"use client";

export type AgentState = "idle" | "active" | "speaking" | "done";

export interface AgentNodeProps {
  name: string;
  role: string;
  avatarSeed: string;
  x: number;        // centre x as px offset from container centre
  y: number;        // centre y as px offset from container centre
  state: AgentState;
  bubbleText?: string;
  isCenter?: boolean;
}

/** Bubble anchor: based on whether agent is left/right/top/bottom of centre */
function bubbleAnchor(x: number, y: number): string {
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  if (absX > absY) {
    return x > 0 ? "right-full mr-2 top-0" : "left-full ml-2 top-0";
  }
  return y > 0 ? "bottom-full mb-2 left-1/2 -translate-x-1/2" : "top-full mt-2 left-1/2 -translate-x-1/2";
}

export function AgentNode({ name, avatarSeed, x, y, state, bubbleText, isCenter }: AgentNodeProps) {
  const avatarUrl = `https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${encodeURIComponent(avatarSeed)}&size=48`;

  const ringClass = {
    idle: "ring-2 ring-gray-200",
    active: "ring-2 ring-blue-400 animate-pulse",
    speaking: "ring-2 ring-green-400 animate-pulse",
    done: "ring-2 ring-green-500",
  }[state];

  const size = isCenter ? "w-16 h-16" : "w-12 h-12";

  return (
    <div
      className="absolute flex flex-col items-center gap-1"
      style={{ transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`, left: "50%", top: "50%" }}
    >
      {/* Speech bubble */}
      {(state === "speaking" || state === "active") && bubbleText && (
        <div className={`absolute z-10 bg-white border border-gray-200 rounded-lg shadow-sm px-2 py-1 text-xs text-gray-700 max-w-[140px] leading-tight whitespace-normal ${bubbleAnchor(x, y)}`}>
          {bubbleText}
        </div>
      )}

      {/* Avatar circle */}
      <div className={`relative rounded-full overflow-hidden bg-gray-100 ${size} ${ringClass} flex-shrink-0`}>
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
        {state === "done" && (
          <div
            data-testid="agent-done-indicator"
            className="absolute inset-0 bg-green-500/20 flex items-center justify-center"
          >
            <span className="text-green-600 text-sm font-bold">✓</span>
          </div>
        )}
      </div>

      {/* Name label */}
      <span className="text-xs text-gray-600 text-center leading-none max-w-[80px] truncate">
        {name}
      </span>
    </div>
  );
}
