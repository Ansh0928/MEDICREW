'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { LandingVariant } from "@/lib/marketing/landing-variants";

const heroCopyByVariant: Record<
  LandingVariant,
  { titleLine1: string; titleLine2: string; body: string; cta: string }
> = {
  speed: {
    titleLine1: "Get triaged fast",
    titleLine2: "with AI care guidance.",
    body: "Move from symptom uncertainty to clear next steps in minutes, including emergency-first escalation.",
    cta: "START IN MINUTES",
  },
  specialist: {
    titleLine1: "Navigate your health",
    titleLine2: "with AI specialists.",
    body: "Eight AI doctors review your symptoms together. Sign in to save care summaries and follow-up reminders.",
    cta: "GET STARTED",
  },
  reassurance: {
    titleLine1: "Feel more certain",
    titleLine2: "about what to do next.",
    body: "Get calm, structured guidance before your GP visit, with safety boundaries and practical next steps.",
    cta: "START WITH CONFIDENCE",
  },
};

export default function HeroAscii({ variant = "specialist" }: { variant?: LandingVariant }) {
  const copy = heroCopyByVariant[variant];

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.landingViewed, { surface: "hero", variant });

    const embedScript = document.createElement('script');
    embedScript.type = 'text/javascript';
    embedScript.textContent = `
      !function(){
        if(!window.UnicornStudio){
          window.UnicornStudio={isInitialized:!1};
          var i=document.createElement("script");
          i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js";
          i.onload=function(){
            window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)
          };
          (document.head || document.body).appendChild(i)
        }
      }();
    `;
    document.head.appendChild(embedScript);

    const style = document.createElement('style');
    style.textContent = `
      [data-us-project] {
        position: relative !important;
        overflow: hidden !important;
      }
      [data-us-project] canvas {
        clip-path: inset(0 0 10% 0) !important;
      }
      [data-us-project] * {
        pointer-events: none !important;
      }
      [data-us-project] a[href*="unicorn"],
      [data-us-project] button[title*="unicorn"],
      [data-us-project] div[title*="Made with"],
      [data-us-project] .unicorn-brand,
      [data-us-project] [class*="brand"],
      [data-us-project] [class*="credit"],
      [data-us-project] [class*="watermark"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
      }
    `;
    document.head.appendChild(style);

    const hideBranding = () => {
      const projectDiv = document.querySelector('[data-us-project]');
      if (projectDiv) {
        const allElements = projectDiv.querySelectorAll('*');
        allElements.forEach(el => {
          const text = (el.textContent || '').toLowerCase();
          if (text.includes('made with') || text.includes('unicorn')) {
            (el as HTMLElement).style.display = 'none';
          }
        });
      }
    };

    hideBranding();
    const interval = setInterval(hideBranding, 100);
    setTimeout(hideBranding, 1000);
    setTimeout(hideBranding, 3000);
    setTimeout(hideBranding, 5000);

    return () => {
      clearInterval(interval);
      if (document.head.contains(embedScript)) document.head.removeChild(embedScript);
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, [variant]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* UnicornStudio animation — desktop only */}
      <div className="absolute inset-0 w-full h-full hidden lg:block">
        <div
          data-us-project="whwOGlfJ5Rz2rHaEUgHl"
          style={{ width: '100%', height: '100%', minHeight: '100vh' }}
        />
      </div>

      {/* Mobile fallback background */}
      <div className="absolute inset-0 w-full h-full lg:hidden" style={{
        background: 'radial-gradient(ellipse at 30% 50%, rgba(17,140,253,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(18,202,147,0.1) 0%, transparent 60%), #000'
      }} />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-white/20 z-20" />
      <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-white/20 z-20" />
      <div className="absolute bottom-[5vh] left-0 w-10 h-10 border-b-2 border-l-2 border-white/20 z-20" />
      <div className="absolute bottom-[5vh] right-0 w-10 h-10 border-b-2 border-r-2 border-white/20 z-20" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center pt-20 lg:pt-0">
        <div className="container mx-auto px-6 lg:px-16 lg:ml-[8%]">
          <div className="max-w-lg">
            {/* Eyebrow line */}
            <div className="flex items-center gap-2 mb-4 opacity-60">
              <div className="w-8 h-px bg-white" />
              <span className="text-white text-[10px] font-[family-name:var(--font-mono)] tracking-wider">001</span>
              <div className="flex-1 h-px bg-white" />
            </div>

            {/* Heading */}
            <div className="relative mb-6">
              <div className="hidden lg:block absolute -left-3 top-0 bottom-0 w-1 opacity-40"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 1px, white 1px, white 2px), repeating-linear-gradient(90deg, transparent 0px, transparent 1px, white 1px, white 2px)', backgroundSize: '3px 3px' }} />
              <h1 className="text-3xl lg:text-5xl font-bold text-white leading-tight font-[family-name:var(--font-display)] tracking-tight" style={{ letterSpacing: '-1px' }}>
                {copy.titleLine1}
                <span className="block mt-1" style={{ color: '#118CFD' }}>
                  {copy.titleLine2}
                </span>
              </h1>
            </div>

            {/* Dots */}
            <div className="hidden lg:flex gap-1 mb-4 opacity-30">
              {Array.from({ length: 36 }).map((_, i) => (
                <div key={i} className="w-0.5 h-0.5 bg-white rounded-full" />
              ))}
            </div>

            {/* Description */}
            <p className="text-sm lg:text-base mb-8 leading-relaxed font-[family-name:var(--font-mono)] opacity-70" style={{ color: '#D1D5DB' }}>
              {copy.body}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/consult"
                className="relative px-6 py-2.5 text-white font-[family-name:var(--font-mono)] text-xs border border-white/30 hover:border-white transition-all duration-200 group text-center"
                style={{ background: 'linear-gradient(180deg, rgba(86,184,255,0.2), rgba(1,142,245,0.3))' }}
                onClick={() =>
                  trackEvent(ANALYTICS_EVENTS.landingCtaClick, {
                    surface: "hero",
                    cta: "get_started",
                    variant,
                  })
                }
              >
                <span className="hidden lg:block absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="hidden lg:block absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white opacity-0 group-hover:opacity-100 transition-opacity" />
                {copy.cta} →
              </Link>
              <Link href="#team"
                className="px-6 py-2.5 bg-transparent border border-white/20 text-white/70 font-[family-name:var(--font-mono)] text-xs hover:border-white/50 hover:text-white transition-all duration-200 text-center"
                onClick={() => trackEvent(ANALYTICS_EVENTS.landingSecondaryClick, { surface: "hero", cta: "meet_team" })}
              >
                MEET THE TEAM
              </Link>
            </div>

            {/* Bottom notation */}
            <div className="hidden lg:flex items-center gap-2 mt-8 opacity-30">
              <span className="text-white text-[9px] font-[family-name:var(--font-mono)]">AHPRA</span>
              <div className="flex-1 h-px bg-white" />
              <span className="text-white text-[9px] font-[family-name:var(--font-mono)]">PRIVACY ACT 1988</span>
              <div className="flex-1 h-px bg-white" />
              <span className="text-white text-[9px] font-[family-name:var(--font-mono)]">AUS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute left-0 right-0 z-20 border-t border-white/10 bg-black/40 backdrop-blur-sm" style={{ bottom: '5vh' }}>
        <div className="container mx-auto px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[9px] font-[family-name:var(--font-mono)] text-white/40">
            <span>SYSTEM.ACTIVE</span>
            <div className="hidden lg:flex gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-1 bg-white/20" style={{ height: `${(i % 3 + 1) * 4}px` }} />
              ))}
            </div>
            <span>8 AI SPECIALISTS</span>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-[family-name:var(--font-mono)] text-white/40">
            <span className="hidden lg:inline">◐ READY</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <span>FREE TO START · SIGN IN TO SAVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
