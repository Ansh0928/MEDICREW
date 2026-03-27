"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CARE_TEAM } from "@/lib/care-team-config";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

export function CareTeamIntroStep() {
  const router = useRouter();

  // Exclude triage from patient-facing care team display
  const displayTeam = CARE_TEAM.filter((member) => member.role !== "triage");

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Meet your personal Medicrew care team. Each AI specialist is available whenever you
        need guidance. They work together to give you comprehensive, coordinated health support.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {displayTeam.map((member, index) => (
          <motion.div
            key={member.role}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.35 }}
          >
            <Card className="h-full">
              <CardContent className="pt-5">
                <div className="flex flex-col items-center text-center space-y-2">
                  <span className="text-4xl" role="img" aria-label={member.specialty}>
                    {member.emoji}
                  </span>
                  <h3 className="font-semibold text-sm leading-tight">{member.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {member.specialty}
                  </Badge>
                  <p className="text-xs text-muted-foreground leading-relaxed">{member.bio}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Button
        onClick={() => {
          trackEvent(ANALYTICS_EVENTS.onboardingStepCompleted, { step: "care_team_intro" });
          router.push("/patient");
        }}
        className="w-full"
        size="lg"
      >
        Get Started
      </Button>
    </div>
  );
}
