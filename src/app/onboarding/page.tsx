"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { MedicalHistoryStep } from "@/components/onboarding/MedicalHistoryStep";
import { ConsentStep } from "@/components/onboarding/ConsentStep";
import { CareTeamIntroStep } from "@/components/onboarding/CareTeamIntroStep";

const STEP_TITLES = [
  {
    title: "Your Medical History",
    description: "Help your care team understand your health background.",
  },
  {
    title: "Privacy Consent",
    description: "Required under the Australian Privacy Act 1988.",
  },
  {
    title: "Meet Your Care Team",
    description: "Your personalised AI health team is ready.",
  },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
              i + 1 < current
                ? "bg-primary border-primary text-primary-foreground"
                : i + 1 === current
                  ? "border-primary text-primary"
                  : "border-muted text-muted-foreground"
            }`}
          >
            {i + 1 < current ? "\u2713" : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`h-0.5 w-8 transition-colors ${i + 1 < current ? "bg-primary" : "bg-muted"}`}
            />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-muted-foreground">
        Step {current} of {total}
      </span>
    </div>
  );
}

function OnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const stepParam = searchParams.get("step");
  const step = stepParam ? parseInt(stepParam, 10) : 1;
  const clampedStep = Math.min(Math.max(step, 1), 3);

  const { title, description } = STEP_TITLES[clampedStep - 1];

  function goToStep(n: number) {
    router.push(`/onboarding?step=${n}`);
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Medicrew
          </h1>
          <p className="mt-2 text-muted-foreground">
            Let&apos;s set up your health profile so your care team can help you
            better.
          </p>
        </div>

        <StepIndicator current={clampedStep} total={3} />

        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {clampedStep === 1 && (
              <MedicalHistoryStep onComplete={() => goToStep(2)} />
            )}
            {clampedStep === 2 && (
              <ConsentStep onComplete={() => goToStep(3)} />
            )}
            {clampedStep === 3 && <CareTeamIntroStep />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
