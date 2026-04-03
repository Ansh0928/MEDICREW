// src/components/consult/HuddleConnections.tsx
"use client";

export type ConnectionType = "agree" | "challenge" | "add_context";

export interface HuddleConnection {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: ConnectionType;
}

const colorMap: Record<ConnectionType, string> = {
  agree: "#22c55e", // green-500
  challenge: "#f97316", // orange-500
  add_context: "#3b82f6", // blue-500
};

export function HuddleConnections({
  connections,
  width,
  height,
}: {
  connections: HuddleConnection[];
  width: number;
  height: number;
}) {
  if (connections.length === 0) return null;

  // Convert agent offsets (centred at 0,0) to SVG coordinates (origin top-left)
  const cx = width / 2;
  const cy = height / 2;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ zIndex: 0 }}
    >
      {connections.map((conn) => (
        <line
          key={conn.id}
          x1={cx + conn.fromX}
          y1={cy + conn.fromY}
          x2={cx + conn.toX}
          y2={cy + conn.toY}
          stroke={colorMap[conn.type]}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          strokeOpacity={0.7}
        />
      ))}
    </svg>
  );
}
