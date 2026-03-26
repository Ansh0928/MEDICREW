"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface TimelineItem {
  id: number;
  title: string;
  content: string;
  category: string;
  avatar: string;
  relatedIds: number[];
  energy: number;
  color: string;
  specialties?: string[];
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
  centerColor?: string;
}

const RADIUS = 180;
const SPEED = 0.4; // degrees per frame at 60fps

export default function RadialOrbitalTimeline({
  timelineData,
  centerColor = "#118CFD",
}: RadialOrbitalTimelineProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const angleRef = useRef(0);
  const rafRef = useRef<number>(0);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIdRef = useRef<number | null>(null);
  const total = timelineData.length;

  // Keep ref in sync with state (avoids stale closure in rAF loop)
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const getPos = useCallback((index: number, angle: number) => {
    const rad = (((index / total) * 360 + angle) * Math.PI) / 180;
    const x = RADIUS * Math.cos(rad);
    const y = RADIUS * Math.sin(rad);
    const depth = (Math.sin(rad) + 1) / 2; // 0 = back, 1 = front
    const opacity = activeIdRef.current !== null ? 0.2 : 0.45 + 0.55 * depth;
    const scale = activeIdRef.current !== null ? 0.9 : 0.85 + 0.15 * depth;
    return { x, y, opacity, scale };
  }, [total]);

  // rAF loop — updates DOM directly, zero React re-renders
  useEffect(() => {
    const tick = () => {
      if (activeIdRef.current === null) {
        angleRef.current = (angleRef.current + SPEED) % 360;
      }

      nodeRefs.current.forEach((el, i) => {
        if (!el) return;
        const id = timelineData[i].id;
        if (id === activeIdRef.current) return; // active node hidden via CSS class
        const { x, y, opacity, scale } = getPos(i, angleRef.current);
        el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        el.style.opacity = String(opacity);
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [timelineData, getPos]);

  const dismiss = useCallback(() => setActiveId(null), []);

  const handleClick = useCallback((id: number) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

  const activeItem = activeId !== null
    ? timelineData.find((d) => d.id === activeId) ?? null
    : null;

  return (
    <div className="w-full relative flex items-center justify-center select-none" style={{ height: 480 }}>

      {/* Click-away backdrop — no blur, just pointer capture */}
      {activeId !== null && (
        <div className="absolute inset-0 z-[90] cursor-pointer" onClick={dismiss} />
      )}

      {/* Orbit ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: RADIUS * 2 + 44,
          height: RADIUS * 2 + 44,
          border: "1px solid rgba(100,116,139,0.15)",
        }}
      />

      {/* Center hub — static, no ping */}
      <div
        className="absolute z-10 rounded-full pointer-events-none"
        style={{
          width: 40,
          height: 40,
          background: `radial-gradient(circle, ${centerColor}30 0%, ${centerColor}15 100%)`,
          border: `1.5px solid ${centerColor}50`,
          boxShadow: `0 0 20px ${centerColor}25`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full m-auto"
          style={{
            width: 12,
            height: 12,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: centerColor,
            borderRadius: "50%",
          }}
        />
      </div>

      {/* Center expanded card */}
      {activeItem && (
        <div
          className="absolute z-[200] flex flex-col items-center"
          style={{
            animation: "cardIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            pointerEvents: "none",
          }}
        >
          <style>{`
            @keyframes cardIn {
              from { opacity: 0; transform: scale(0.88); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>

          <div
            className="rounded-full overflow-hidden mb-3"
            style={{
              width: 72,
              height: 72,
              border: `3px solid ${activeItem.color}`,
              background: `${activeItem.color}12`,
              boxShadow: `0 4px 24px ${activeItem.color}40`,
            }}
          >
            <img src={activeItem.avatar} alt={activeItem.title} className="w-full h-full" />
          </div>

          <div
            className="rounded-2xl text-center shadow-xl"
            style={{
              width: 228,
              padding: "16px 18px 14px",
              background: "#ffffff",
              border: `1px solid ${activeItem.color}30`,
              pointerEvents: "auto",
            }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: activeItem.color }}
              />
              <span
                className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-widest"
                style={{ color: activeItem.color }}
              >
                Online
              </span>
            </div>

            <h4
              className="font-semibold mb-1"
              style={{ color: "#12181B", fontSize: 13, lineHeight: 1.3 }}
            >
              {activeItem.title}
            </h4>
            <p
              className="leading-relaxed mb-3"
              style={{ color: "#637288", fontSize: 11 }}
            >
              {activeItem.content}
            </p>

            {activeItem.specialties && activeItem.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                {activeItem.specialties.map((s) => (
                  <span
                    key={s}
                    className="font-[family-name:var(--font-mono)] capitalize"
                    style={{
                      fontSize: 9,
                      padding: "2px 8px",
                      borderRadius: 99,
                      color: activeItem.color,
                      background: `${activeItem.color}12`,
                      border: `1px solid ${activeItem.color}25`,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-3">
              <div
                className="w-full rounded-full"
                style={{ height: 3, background: `${activeItem.color}18` }}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: `${activeItem.energy}%`,
                    height: 3,
                    background: activeItem.color,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
              <div
                className="flex justify-between font-[family-name:var(--font-mono)] mt-1"
                style={{ fontSize: 8, color: "#637288", opacity: 0.7 }}
              >
                <span>Readiness</span>
                <span>{activeItem.energy}%</span>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="font-[family-name:var(--font-mono)] uppercase tracking-widest transition-opacity hover:opacity-60"
              style={{ fontSize: 8, color: "#9CA3AF", opacity: 0.5 }}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* Orbital nodes — rAF updates their style directly */}
      {timelineData.map((item, i) => {
        const isActive = item.id === activeId;
        return (
          <div
            key={item.id}
            ref={(el) => { nodeRefs.current[i] = el; }}
            className="absolute cursor-pointer"
            style={{
              width: 44,
              height: 44,
              // rAF handles transform/opacity; active node hidden instantly
              opacity: isActive ? 0 : undefined,
              transform: isActive ? "translate(0,0) scale(0.5)" : undefined,
              transition: isActive ? "opacity 0.2s, transform 0.2s" : "none",
              zIndex: isActive ? 0 : 100,
              willChange: "transform, opacity",
            }}
            onClick={(e) => { e.stopPropagation(); handleClick(item.id); }}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden"
              style={{
                border: `2px solid ${item.color}70`,
                background: `${item.color}12`,
              }}
            >
              <img src={item.avatar} alt={item.title} className="w-full h-full" />
            </div>
            <div
              className="absolute whitespace-nowrap font-[family-name:var(--font-mono)]"
              style={{
                fontSize: 9,
                top: 48,
                left: "50%",
                transform: "translateX(-50%)",
                color: "#8896A8",
                letterSpacing: "0.04em",
              }}
            >
              {item.title.split(" ")[0]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
