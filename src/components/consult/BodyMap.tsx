"use client";
import { useState } from "react";

export type BodyRegion =
  | "Head"
  | "Neck"
  | "Chest"
  | "Left arm"
  | "Right arm"
  | "Abdomen"
  | "Lower back"
  | "Left leg"
  | "Right leg"
  | "Full back";

interface Region {
  id: BodyRegion;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  view: "front" | "back";
}

const REGIONS: Region[] = [
  { id: "Head", label: "Head", x: 38, y: 4, w: 24, h: 20, view: "front" },
  { id: "Neck", label: "Neck", x: 45, y: 24, w: 10, h: 10, view: "front" },
  { id: "Chest", label: "Chest", x: 28, y: 34, w: 44, h: 28, view: "front" },
  { id: "Left arm", label: "L. Arm", x: 8, y: 34, w: 18, h: 40, view: "front" },
  {
    id: "Right arm",
    label: "R. Arm",
    x: 74,
    y: 34,
    w: 18,
    h: 40,
    view: "front",
  },
  {
    id: "Abdomen",
    label: "Abdomen",
    x: 28,
    y: 62,
    w: 44,
    h: 28,
    view: "front",
  },
  {
    id: "Left leg",
    label: "L. Leg",
    x: 28,
    y: 90,
    w: 20,
    h: 48,
    view: "front",
  },
  {
    id: "Right leg",
    label: "R. Leg",
    x: 52,
    y: 90,
    w: 20,
    h: 48,
    view: "front",
  },
  {
    id: "Lower back",
    label: "Lower back",
    x: 28,
    y: 62,
    w: 44,
    h: 28,
    view: "back",
  },
  {
    id: "Full back",
    label: "Full back",
    x: 28,
    y: 34,
    w: 44,
    h: 28,
    view: "back",
  },
];

interface BodyMapProps {
  selected: BodyRegion | null;
  onSelect: (region: BodyRegion) => void;
}

export function BodyMap({ selected, onSelect }: BodyMapProps) {
  const [view, setView] = useState<"front" | "back">("front");
  const visibleRegions = REGIONS.filter((r) => r.view === view);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Front / Back toggle */}
      <div className="flex gap-1 text-xs border rounded-full overflow-hidden">
        {(["front", "back"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1 capitalize transition-colors ${
              view === v
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* SVG body diagram */}
      <svg
        viewBox="0 0 100 140"
        className="w-40 h-56"
        aria-label="Body diagram — tap to select location"
      >
        {visibleRegions.map((r) => {
          const isSelected = selected === r.id;
          return (
            <g key={r.id}>
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={4}
                className="cursor-pointer transition-all"
                fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                stroke={
                  isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"
                }
                strokeWidth={1}
                onClick={() => onSelect(r.id)}
                aria-label={r.label}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(r.id);
                  }
                }}
              />
              <text
                x={r.x + r.w / 2}
                y={r.y + r.h / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={5}
                fill={
                  isSelected
                    ? "hsl(var(--primary-foreground))"
                    : "hsl(var(--muted-foreground))"
                }
                className="pointer-events-none select-none"
              >
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>

      {selected && visibleRegions.some((r) => r.id === selected) && (
        <p className="text-xs text-muted-foreground">
          Selected:{" "}
          <span className="text-foreground font-medium">{selected}</span>
        </p>
      )}
    </div>
  );
}
