"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, Lock, HeartHandshake } from "lucide-react";

export function TrustSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trust & Safety
            </h2>
            <p className="text-lg text-muted-foreground">
              We take your health and privacy seriously.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    Complements, Doesn't Replace
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    MediCrew provides health navigation guidance to help you understand your symptoms and find the right care. Always consult a qualified healthcare provider for diagnosis and treatment.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Emergency Escalation</h3>
                  <p className="text-sm text-muted-foreground">
                    Our AI is trained to identify red flags and emergency situations. If something seems urgent, we'll tell you to seek immediate care—no delays.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Privacy Protected</h3>
                  <p className="text-sm text-muted-foreground">
                    Your symptom data is processed in real-time and never stored. We don't require accounts or personal information to use MediCrew.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Clinically Informed</h3>
                  <p className="text-sm text-muted-foreground">
                    Our AI agents are designed with clinical guidelines in mind and regularly evaluated for accuracy and safety.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
