"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface TimelineItem {
  id: number;
  title: string;
  content: string;
  avatar: string;
  energy: number;
  color: string;
  specialties?: string[];
}

interface Props {
  timelineData: TimelineItem[];
  centerColor?: string;
}

const RADIUS = 210;
const SPEED = 0.28; // deg per rAF frame (~60fps → ~17s full rotation)

export default function RadialOrbitalTimeline({
  timelineData,
  centerColor = "#118CFD",
}: Props) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const angleRef = useRef(0);
  const rafRef = useRef<number>(0);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIdRef = useRef<number | null>(null);
  const total = timelineData.length;

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // rAF loop — direct DOM updates, zero React re-renders
  useEffect(() => {
    const tick = () => {
      if (activeIdRef.current === null) {
        angleRef.current = (angleRef.current + SPEED) % 360;
      }
      const a = activeIdRef.current;
      nodeRefs.current.forEach((el, i) => {
        if (!el) return;
        const item = timelineData[i];
        const rad = (((i / total) * 360 + angleRef.current) * Math.PI) / 180;
        const x = RADIUS * Math.cos(rad);
        const y = RADIUS * Math.sin(rad);
        // depth: sin goes -1 (back) to +1 (front)
        const depth = (Math.sin(rad) + 1) / 2;
        const scale =
          a !== null ? (item.id === a ? 0 : 0.82) : 0.78 + 0.22 * depth;
        const opacity =
          a !== null
            ? item.id === a
              ? 0
              : 0.3 + 0.3 * depth
            : 0.55 + 0.45 * depth;
        const z = Math.round(10 + 90 * depth);
        el.style.transform = `translate(${x}px,${y}px) scale(${scale.toFixed(3)})`;
        el.style.opacity = opacity.toFixed(3);
        el.style.zIndex = String(z);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [total, timelineData]);

  const dismiss = useCallback(() => setActiveId(null), []);
  const handleClick = useCallback((id: number) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

  const active =
    activeId !== null
      ? (timelineData.find((d) => d.id === activeId) ?? null)
      : null;

  return (
    <div
      className="relative w-full flex items-center justify-center overflow-hidden"
      style={{ height: 540 }}
      onClick={active ? dismiss : undefined}
    >
      {/* Orbit rings */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: RADIUS * 2 + 60,
          height: RADIUS * 2 + 60,
          border: "1px solid rgba(100,116,139,0.18)",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: RADIUS * 2 + 20,
          height: RADIUS * 2 + 20,
          border: "1px dashed rgba(100,116,139,0.08)",
        }}
      />

      {/* Center hub */}
      {!active && (
        <div className="absolute z-[200] flex flex-col items-center pointer-events-none">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              background: `linear-gradient(135deg, ${centerColor}20, ${centerColor}40)`,
              border: `1.5px solid ${centerColor}60`,
              boxShadow: `0 0 24px ${centerColor}30`,
            }}
          >
            <span style={{ color: centerColor, fontSize: 22, lineHeight: 1 }}>
              +
            </span>
          </div>
          <span
            className="font-[family-name:var(--font-mono)] mt-2"
            style={{ fontSize: 9, color: "#8896A8", letterSpacing: "0.18em" }}
          >
            MEDICREW
          </span>
        </div>
      )}

      {/* Center expanded card */}
      {active && (
        <div
          className="absolute z-[300] flex flex-col items-center"
          style={{
            animation: "popIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.82)}to{opacity:1;transform:scale(1)}}`}</style>

          {/* Avatar */}
          <div
            className="rounded-full overflow-hidden mb-3"
            style={{
              width: 80,
              height: 80,
              border: `3px solid ${active.color}`,
              background: `${active.color}10`,
              boxShadow: `0 6px 28px ${active.color}50`,
            }}
          >
            <img
              src={active.avatar}
              alt={active.title}
              className="w-full h-full"
            />
          </div>

          {/* Card */}
          <div
            style={{
              width: 248,
              background: "#fff",
              border: `1px solid ${active.color}28`,
              borderRadius: 18,
              padding: "18px 20px 16px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
            }}
          >
            {/* Status */}
            <div className="flex items-center justify-center gap-1.5 mb-3">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: active.color }}
              />
              <span
                className="font-[family-name:var(--font-mono)]"
                style={{
                  fontSize: 9,
                  color: active.color,
                  letterSpacing: "0.15em",
                }}
              >
                ONLINE · READY
              </span>
            </div>

            <h4
              style={{
                color: "#12181B",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 6,
                lineHeight: 1.3,
                textAlign: "center",
              }}
            >
              {active.title}
            </h4>
            <p
              style={{
                color: "#637288",
                fontSize: 11.5,
                lineHeight: 1.6,
                marginBottom: 14,
                textAlign: "center",
              }}
            >
              {active.content}
            </p>

            {/* Tags */}
            {active.specialties && active.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                {active.specialties.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 9.5,
                      padding: "3px 10px",
                      borderRadius: 99,
                      color: active.color,
                      background: `${active.color}10`,
                      border: `1px solid ${active.color}22`,
                      fontFamily: "var(--font-mono)",
                      textTransform: "capitalize",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Readiness */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  height: 3,
                  background: `${active.color}15`,
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${active.energy}%`,
                    background: active.color,
                    borderRadius: 99,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <div
                className="flex justify-between font-[family-name:var(--font-mono)]"
                style={{ fontSize: 8, color: "#9CA3AF", marginTop: 4 }}
              >
                <span>Readiness</span>
                <span>{active.energy}%</span>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="w-full font-[family-name:var(--font-mono)] transition-colors"
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "#C0C8D2",
                padding: "6px 0",
                borderTop: "1px solid #F0F2F5",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#637288")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#C0C8D2")}
            >
              ✕ DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Nodes — rAF drives their transform/opacity */}
      {timelineData.map((item, i) => (
        <div
          key={item.id}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
          className="absolute cursor-pointer"
          style={{ willChange: "transform, opacity" }}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(item.id);
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              overflow: "hidden",
              border: `2px solid ${item.color}55`,
              background: `${item.color}10`,
              boxShadow: `0 2px 12px ${item.color}25`,
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          >
            <img src={item.avatar} alt={item.title} className="w-full h-full" />
          </div>

          {/* Name label */}
          <div
            className="absolute whitespace-nowrap font-[family-name:var(--font-mono)] text-center"
            style={{
              fontSize: 9.5,
              top: 63,
              left: "50%",
              transform: "translateX(-50%)",
              color: "#637288",
              letterSpacing: "0.04em",
              lineHeight: 1.3,
            }}
          >
            {/* First word = "Triage"/"Alex"/"Sarah" etc */}
            {item.title.split(" — ")[0].split(" ").slice(0, -1).join(" ")}
            <br />
            <span style={{ color: "#9CA3AF", fontSize: 8 }}>
              {item.title.includes("—") ? item.title.split("— ")[1] : "AI"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
