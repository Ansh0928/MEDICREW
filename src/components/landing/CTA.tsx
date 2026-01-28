"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="max-w-4xl mx-auto p-8 md:p-12 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <div className="text-center">
              <div className="text-5xl mb-6">👨‍⚕️👩‍⚕️🩺</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to meet your AI care team?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Start a free consultation now. No account needed, no data stored, just instant health navigation.
              </p>
              <Link href="/consult">
                <Button size="lg" className="text-lg px-8 h-14 gap-2">
                  Start Free Consultation
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
