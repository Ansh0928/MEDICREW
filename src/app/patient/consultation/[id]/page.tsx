"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Phone,
  Printer,
} from "lucide-react";

interface SwarmSynthesis {
  urgency: string;
  primaryRecommendation: string;
  nextSteps: string[];
  bookingNeeded: boolean;
  disclaimer: string;
}

interface ConsultationDetail {
  id: string;
  symptoms: string;
  urgencyLevel: string | null;
  redFlags: string[];
  recommendation: SwarmSynthesis | null;
  createdAt: string;
}

type ReferralState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "generated"; letter: string; generatedAt: string }
  | { status: "error"; message: string }
  | { status: "upgrade_required" };

const URGENCY_CONFIG: Record<
  string,
  {
    label: string;
    variant: "destructive" | "default" | "secondary" | "outline";
    color: string;
  }
> = {
  emergency: {
    label: "Emergency",
    variant: "destructive",
    color: "text-red-700",
  },
  urgent: { label: "Urgent", variant: "default", color: "text-orange-700" },
  routine: { label: "Routine", variant: "secondary", color: "text-blue-700" },
  self_care: {
    label: "Self-Care",
    variant: "outline",
    color: "text-green-700",
  },
};

function formatAuDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Australia/Sydney",
  });
}

export default function ConsultationSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [consultation, setConsultation] = useState<ConsultationDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [referral, setReferral] = useState<ReferralState>({ status: "idle" });
  const [referralPdfLoading, setReferralPdfLoading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!consultation) return;
    setPdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const rec = consultation.recommendation;
      const urgency = consultation.urgencyLevel ?? "routine";
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const addText = (
        text: string,
        opts: {
          size?: number;
          bold?: boolean;
          color?: [number, number, number];
          wrap?: boolean;
        } = {},
      ) => {
        doc.setFontSize(opts.size ?? 10);
        doc.setFont("helvetica", opts.bold ? "bold" : "normal");
        if (opts.color) doc.setTextColor(...opts.color);
        else doc.setTextColor(30, 30, 30);
        if (opts.wrap) {
          const lines = doc.splitTextToSize(text, contentWidth) as string[];
          doc.text(lines, margin, y);
          y += lines.length * (opts.size ?? 10) * 0.4 + 2;
        } else {
          doc.text(text, margin, y);
          y += (opts.size ?? 10) * 0.4 + 2;
        }
      };

      const addSpacer = (h = 4) => {
        y += h;
      };
      const addDivider = () => {
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, pageWidth - margin, y);
        addSpacer(4);
      };

      // Header
      addText("MediCrew Consultation Summary", {
        size: 16,
        bold: true,
        color: [29, 78, 216],
      });
      addSpacer(2);
      addText(formatAuDate(consultation.createdAt), {
        size: 9,
        color: [100, 100, 100],
      });
      addDivider();

      // Urgency
      const urgencyLabel = URGENCY_CONFIG[urgency]?.label ?? urgency;
      addText(`Urgency: ${urgencyLabel}`, { size: 11, bold: true });
      addSpacer();

      // Chief complaint
      addText("Chief Complaint", { size: 11, bold: true });
      addText(consultation.symptoms, { wrap: true });
      addSpacer();

      // Red flags
      if (consultation.redFlags.length > 0) {
        addDivider();
        addText("Warning Signs Detected", {
          size: 11,
          bold: true,
          color: [194, 65, 12],
        });
        consultation.redFlags.forEach((f) => addText(`• ${f}`, { wrap: true }));
        addSpacer();
      }

      // Assessment
      if (rec?.primaryRecommendation) {
        addDivider();
        addText("Care Team Assessment", { size: 11, bold: true });
        addText(rec.primaryRecommendation, { wrap: true });
        addSpacer();
      }

      // Next steps
      if (rec?.nextSteps && rec.nextSteps.length > 0) {
        addDivider();
        addText("Recommended Next Steps", { size: 11, bold: true });
        rec.nextSteps.forEach((step, i) =>
          addText(`${i + 1}. ${step}`, { wrap: true }),
        );
        addSpacer();
      }

      // Disclaimer
      addDivider();
      addText(
        rec?.disclaimer ??
          "This summary is for informational purposes only and does not constitute a medical diagnosis or treatment plan. Always consult a qualified healthcare professional.",
        { size: 8, color: [100, 100, 100], wrap: true },
      );

      doc.save(`medicrew-consultation-${consultation.id.slice(0, 8)}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleGenerateReferral = async () => {
    if (!consultation) return;
    setReferral({ status: "loading" });
    try {
      const res = await fetch("/api/patient/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: consultation.id }),
      });
      if (res.status === 402) {
        setReferral({ status: "upgrade_required" });
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setReferral({ status: "error", message: data.error ?? "Failed to generate letter." });
        return;
      }
      const data = (await res.json()) as { letter: string; generatedAt: string };
      setReferral({ status: "generated", letter: data.letter, generatedAt: data.generatedAt });
    } catch {
      setReferral({ status: "error", message: "Network error. Please try again." });
    }
  };

  const handleDownloadReferralPdf = async () => {
    if (referral.status !== "generated") return;
    setReferralPdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const addWrappedText = (text: string, size = 10, bold = false) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setTextColor(30, 30, 30);
        const lines = doc.splitTextToSize(text, contentWidth) as string[];
        doc.text(lines, margin, y);
        y += lines.length * size * 0.4 + 2;
      };

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(29, 78, 216);
      doc.text("MediCrew", margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("GP Referral Letter — AI-Assisted Clinical Summary", margin, y);
      y += 4;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Letter body — split on newlines
      const paragraphs = referral.letter.split("\n");
      for (const para of paragraphs) {
        if (para.trim() === "") {
          y += 3;
        } else {
          addWrappedText(para);
        }
        if (y > 270) {
          doc.addPage();
          y = margin;
        }
      }

      doc.save(`medicrew-referral-${consultation!.id.slice(0, 8)}.pdf`);
    } finally {
      setReferralPdfLoading(false);
    }
  };

  useEffect(() => {
    // Load any previously generated letter when the page mounts
    if (id) {
      fetch(`/api/patient/referral/${id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { letter: string | null; generatedAt: string } | null) => {
          if (data?.letter) {
            setReferral({
              status: "generated",
              letter: data.letter,
              generatedAt: data.generatedAt,
            });
          }
        })
        .catch(() => {/* ignore — referral section stays idle */});
    }
  }, [id]);

  useEffect(() => {
    fetch(`/api/patient/consultations/${id}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (res.status === 401) {
          router.push("/login/patient");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setConsultation(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-6 space-y-3">
              <div className="h-5 w-1/3 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !consultation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Consultation not found.</p>
          <Button variant="outline" onClick={() => router.push("/patient")}>
            Back to Portal
          </Button>
        </div>
      </div>
    );
  }

  const urgency = consultation.urgencyLevel ?? "routine";
  const urgencyConfig = URGENCY_CONFIG[urgency] ?? URGENCY_CONFIG.routine;
  const rec = consultation.recommendation;
  const isEmergency = urgency === "emergency";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/patient">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Portal
              </Button>
            </Link>
            <h1 className="text-lg font-semibold text-blue-700">
              Consultation Summary
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {formatAuDate(consultation.createdAt)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {pdfLoading ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        {/* Emergency banner */}
        {isEmergency && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <Phone className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">
                Emergency — Call 000 Now
              </p>
              <p className="text-sm text-red-600 mt-0.5">
                Your symptoms may require immediate emergency care. Call Triple
                Zero (000) or go to your nearest Emergency Department.
              </p>
            </div>
          </div>
        )}

        {/* Red flags */}
        {consultation.redFlags.length > 0 && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-orange-700 mb-1">
                Warning Signs Detected
              </p>
              <ul className="space-y-0.5">
                {consultation.redFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-orange-600">
                    • {flag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Chief complaint */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Chief Complaint</CardTitle>
              <Badge variant={urgencyConfig.variant}>
                {urgencyConfig.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{consultation.symptoms}</p>
          </CardContent>
        </Card>

        {/* Primary recommendation */}
        {rec?.primaryRecommendation && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Care Team Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700">
                {rec.primaryRecommendation}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Next steps */}
        {rec?.nextSteps && rec.nextSteps.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Recommended Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {rec.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Book a GP CTA */}
        {(rec?.bookingNeeded ||
          urgency === "urgent" ||
          urgency === "emergency") && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-5">
              <p className="text-sm font-medium text-blue-800 mb-3">
                Your care team recommends seeing a GP. Book an appointment
                online:
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://www.hotdoc.com.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  HotDoc <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://www.healthengine.com.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  HealthEngine <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* GP Referral Letter — Pro feature */}
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                GP Referral Letter
                <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs">
                  Pro
                </Badge>
              </CardTitle>
              {referral.status === "generated" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReferralPdf}
                  disabled={referralPdfLoading}
                  className="text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  {referralPdfLoading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {referralPdfLoading ? "Generating PDF…" : "Download PDF"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {referral.status === "idle" && (
              <div className="space-y-3">
                <p className="text-sm text-purple-800">
                  Generate a structured referral letter for your GP — includes
                  your symptoms, AI care team assessment, and suggested
                  discussion points. AHPRA-compliant language throughout.
                </p>
                <Button
                  size="sm"
                  onClick={handleGenerateReferral}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Generate Referral Letter
                </Button>
              </div>
            )}

            {referral.status === "loading" && (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-sm text-purple-700">
                  Generating your referral letter…
                </span>
              </div>
            )}

            {referral.status === "upgrade_required" && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-purple-800">
                    GP referral letter generation is a{" "}
                    <span className="font-semibold">Pro</span> feature. Upgrade
                    to unlock this and other premium features.
                  </p>
                </div>
                <Link href="/pricing">
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                  >
                    Upgrade to Pro
                  </Button>
                </Link>
              </div>
            )}

            {referral.status === "error" && (
              <div className="space-y-3">
                <p className="text-sm text-red-700">{referral.message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateReferral}
                  className="text-xs"
                >
                  Try Again
                </Button>
              </div>
            )}

            {referral.status === "generated" && (
              <div className="space-y-3">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans bg-white border border-purple-100 rounded-lg p-4 max-h-80 overflow-y-auto">
                  {referral.letter}
                </pre>
                <p className="text-xs text-purple-500">
                  Generated{" "}
                  {new Date(referral.generatedAt).toLocaleString("en-AU", {
                    timeZone: "Australia/Sydney",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}{" "}
                  · AHPRA-compliant · AI-Assisted, Not AI-Decided
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center px-4 pb-4">
          {rec?.disclaimer ??
            "This summary is for informational purposes only and does not constitute a medical diagnosis or treatment plan. Always consult a qualified healthcare professional."}
        </p>
      </main>
    </div>
  );
}
