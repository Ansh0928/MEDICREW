"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    emoji: "💬",
    title: "Describe Your Symptoms",
    description:
      "Tell us what you're experiencing in your own words. No medical jargon needed.",
  },
  {
    number: "02",
    emoji: "🤖",
    title: "AI Team Consults",
    description:
      "Our team of AI specialists—from triage to cardiology to mental health—analyze your symptoms together.",
  },
  {
    number: "03",
    emoji: "🎯",
    title: "Get Clear Guidance",
    description:
      "Receive personalized next steps, urgency assessment, and questions to ask your doctor.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How MediCrew Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get guidance from a coordinated team of AI health specialists in minutes, not weeks.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-8 top-20 w-0.5 h-16 bg-gradient-to-b from-primary/50 to-transparent hidden md:block" />
              )}

              <Card className="p-6 mb-8 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
                      {step.emoji}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-primary">
                        {step.number}
                      </span>
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
