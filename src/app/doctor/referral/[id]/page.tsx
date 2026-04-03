"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Printer, ArrowLeft, Link2, Check } from "lucide-react";
import Link from "next/link";
import { formatAuDate } from "@/lib/format";

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

interface PatientDetail {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string | null;
  gender: string | null;
  knownConditions: string | null;
  medications: string[];
  allergies: string[];
}

function calcAge(dob: string | null): string {
  if (!dob) return "Not recorded";
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / (365.25 * 24 * 3600000))} years`;
}

export default function ReferralLetterPage() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<ConsultationDetail | null>(
    null,
  );
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyShareLink = useCallback(async () => {
    try {
      const res = await fetch("/api/doctor/referral/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: id }),
      });
      if (res.ok) {
        const data = (await res.json()) as { url: string };
        await navigator.clipboard.writeText(data.url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    async function load() {
      try {
        // Use doctor-scoped endpoint — avoids 403 from patient auth check
        const consultRes = await fetch(`/api/doctor/consultations/${id}`);
        if (!consultRes.ok) {
          setError(true);
          return;
        }
        const c = await consultRes.json();
        setConsultation(c);

        // Fetch patient details using patientId returned by the doctor endpoint
        const pRes = await fetch(`/api/doctor/patients/${c.patientId}`);
        if (pRes.ok) setPatient(await pRes.json());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm animate-pulse">
          Preparing referral letter…
        </p>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-600">
            Unable to load consultation data.
          </p>
          <Link
            href="/doctor"
            className="text-xs text-blue-600 hover:underline"
          >
            ← Back to portal
          </Link>
        </div>
      </div>
    );
  }

  const rec = consultation.recommendation;
  const today = formatAuDate(new Date().toISOString());
  const isUrgent =
    consultation.urgencyLevel === "urgent" ||
    consultation.urgencyLevel === "emergency";

  return (
    <>
      {/* Print controls — hidden when printing */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
        <Link
          href="/doctor"
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to portal
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {linkCopied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            {linkCopied ? "Link copied!" : "Copy share link"}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Letter body */}
      <div className="max-w-2xl mx-auto px-8 py-16 pt-24 print:pt-8 font-serif text-gray-900 text-[15px] leading-relaxed">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-700 font-sans">
              MediCrew
            </h1>
            <p className="text-xs text-gray-500 font-sans">
              AI-Assisted Clinical Summary
            </p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>{today}</p>
            <p className="text-xs mt-0.5">
              Ref: {consultation.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <hr className="border-gray-200 mb-6" />

        {/* To / From */}
        <div className="mb-6 space-y-1 text-sm">
          <p>
            <span className="font-semibold">To:</span> The Treating GP
          </p>
          <p>
            <span className="font-semibold">Re:</span>{" "}
            {patient?.name ?? "Patient"}
          </p>
          {patient?.dateOfBirth && (
            <p>
              <span className="font-semibold">DOB:</span>{" "}
              {formatAuDate(patient.dateOfBirth)} (Age:{" "}
              {calcAge(patient.dateOfBirth)})
            </p>
          )}
          {patient?.gender && (
            <p>
              <span className="font-semibold">Gender:</span>{" "}
              <span className="capitalize">{patient.gender}</span>
            </p>
          )}
          {patient?.email && (
            <p>
              <span className="font-semibold">Email:</span> {patient.email}
            </p>
          )}
        </div>

        {/* Urgency flag */}
        {isUrgent && (
          <div className="mb-6 px-4 py-3 rounded-lg border-l-4 border-red-500 bg-red-50">
            <p className="font-bold text-red-700 uppercase text-sm tracking-wide">
              {consultation.urgencyLevel === "emergency"
                ? "⚠ Emergency — Immediate attention required"
                : "⚠ Urgent referral"}
            </p>
          </div>
        )}

        {/* Opening paragraph */}
        <p className="mb-5">Dear Colleague,</p>
        <p className="mb-5">
          I am writing to refer the above patient who presented via
          MediCrew&apos;s AI-assisted consultation platform on{" "}
          {formatAuDate(consultation.createdAt)}. The following is a structured
          summary generated by our multi-specialist AI care team to assist your
          clinical assessment.
        </p>

        {/* Presenting complaint */}
        <h2 className="text-base font-bold font-sans mb-2">
          Presenting Complaint
        </h2>
        <p className="mb-5">{consultation.symptoms}</p>

        {/* Red flags */}
        {consultation.redFlags.length > 0 && (
          <>
            <h2 className="text-base font-bold font-sans mb-2">
              Red Flags Identified
            </h2>
            <ul className="list-disc pl-5 mb-5 space-y-1">
              {consultation.redFlags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </>
        )}

        {/* AI assessment */}
        {rec?.primaryRecommendation && (
          <>
            <h2 className="text-base font-bold font-sans mb-2">
              AI Care Team Assessment
            </h2>
            <p className="mb-5">{rec.primaryRecommendation}</p>
          </>
        )}

        {/* Background */}
        {(patient?.knownConditions ||
          (patient?.medications && patient.medications.length > 0)) && (
          <>
            <h2 className="text-base font-bold font-sans mb-2">
              Relevant Medical Background
            </h2>
            {patient.knownConditions && (
              <p className="mb-2">
                <span className="font-semibold">Known conditions:</span>{" "}
                {patient.knownConditions}
              </p>
            )}
            {patient.medications && patient.medications.length > 0 && (
              <p className="mb-2">
                <span className="font-semibold">Current medications:</span>{" "}
                {patient.medications.join(", ")}
              </p>
            )}
            {patient.allergies && patient.allergies.length > 0 && (
              <p className="mb-5">
                <span className="font-semibold">Allergies:</span>{" "}
                {patient.allergies.join(", ")}
              </p>
            )}
          </>
        )}

        {/* Recommended next steps */}
        {rec?.nextSteps && rec.nextSteps.length > 0 && (
          <>
            <h2 className="text-base font-bold font-sans mb-2">
              Recommended Next Steps
            </h2>
            <ol className="list-decimal pl-5 mb-5 space-y-1">
              {rec.nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </>
        )}

        {/* Closing */}
        <p className="mb-8">
          Please do not hesitate to contact us if you require any additional
          information. We appreciate your ongoing care of this patient.
        </p>

        <p className="mb-1">Yours sincerely,</p>
        <p className="font-semibold">MediCrew AI Care Team</p>
        <p className="text-sm text-gray-500">AI-Assisted, Not AI-Decided</p>

        {/* Disclaimer */}
        <hr className="border-gray-200 mt-10 mb-4" />
        <p className="text-xs text-gray-400 leading-relaxed">
          {rec?.disclaimer ??
            "This document was generated with AI assistance and is intended to support, not replace, clinical judgement. The information provided is for informational purposes only and does not constitute a medical diagnosis or treatment plan. All clinical decisions remain the responsibility of the treating practitioner."}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Generated by MediCrew · Data stored in Australia (ap-southeast-2) ·
          AHPRA-safe agent naming
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
