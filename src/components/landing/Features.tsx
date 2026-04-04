"use client";

import { Users, Zap, Shield, Clock, Brain, FileText } from "lucide-react";

const features = [
  {
    icon: <Users className="w-5 h-5" />,
    title: "Multi-Specialist Review",
    description:
      "Eight AI doctors assess your case simultaneously — GP, cardiologist, dermatologist, mental health and more in one consultation.",
    size: "col-span-2",
    color: "#118CFD",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Instant Guidance",
    description: "Results in minutes, not weeks.",
    size: "",
    color: "#12CA93",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Smart Triage",
    description: "Urgency-aware — knows when to say go to hospital.",
    size: "",
    color: "#8470BE",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "24/7 Availability",
    description: "No appointment needed. Available every hour, including 3am.",
    size: "",
    color: "#F7C543",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Appointment Prep",
    description: "Get the right questions to ask your doctor before you go.",
    size: "",
    color: "#E95F6A",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Privacy First",
    description:
      "Data stored in Australia (ap-southeast-2). AHPRA-aligned AI naming. No data sold. Ever.",
    size: "col-span-2",
    color: "#12CA93",
  },
];

export function Features() {
  return (
    <section className="py-28 px-6" style={{ background: "#ffffff" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-xl">
          <p
            className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase mb-4"
            style={{ color: "#637288" }}
          >
            Why MediCrew
          </p>
          <h2
            className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-tight text-balance"
            style={{ color: "#12181B", letterSpacing: "-1px" }}
          >
            Healthcare navigation,{" "}
            <span className="italic" style={{ color: "#118CFD" }}>
              redesigned.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {features.map((f, i) => (
            <div
              key={i}
              className={`group relative rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${f.size}`}
              style={{ background: "#FAFAFA", borderColor: "#E5E7EB" }}
            >
              <div className="mb-5" style={{ color: f.color }}>
                {f.icon}
              </div>
              <h3
                className="font-medium mb-2 text-sm"
                style={{ color: "#12181B" }}
              >
                {f.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#637288" }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
