"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Users,
  Zap,
  Shield,
  Clock,
  Brain,
  FileText,
} from "lucide-react";

const features = [
  {
    icon: <Users className="w-5 h-5" />,
    title: "Multi-Specialist Perspectives",
    description:
      "Get input from multiple AI specialists, not just a single chatbot.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Instant Guidance",
    description:
      "No more waiting weeks. Get health navigation in minutes.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "24/7 Availability",
    description:
      "Access guidance anytime, anywhere—perfect for after-hours concerns.",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "AI-Powered Triage",
    description:
      "Smart urgency assessment helps you know when to seek care fast.",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Appointment Prep",
    description:
      "Get questions to ask your doctor and what to expect at your visit.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Privacy First",
    description:
      "Your symptoms are processed securely and never stored.",
  },
];

export function Features() {
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
            Why Choose MediCrew
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built with care, powered by AI, designed to help you navigate healthcare with confidence.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 h-full hover:shadow-lg transition-shadow group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
