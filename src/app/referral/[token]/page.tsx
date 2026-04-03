"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { formatAuDate } from "@/lib/format";

interface ConsultationData {
  id: string;
  symptoms: string;
  urgencyLevel: string | null;
  redFlags: string[];
  recommendation: {
    primaryRecommendation?: string;
    nextSteps?: string[];
    disclaimer?: string;
  } | null;
  createdAt: string;
}

interface PatientData {
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  email: string;
  knownConditions: string | null;
  medications: string[];
  allergies: string[];
}

function calcAge(dob: string | null): string {
  if (!dob) return "Not recorded";
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / (365.25 * 24 * 3600000))} years`;
}

export default function PublicReferralPage() {
  const { token } = useParams<{ token: string }>();
  const [consultation, setConsultation] = useState<ConsultationData | null>(
    null,
  );
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/referral/${token}`)
      .then((r) =>
        r.ok
          ? r.json()
          : r
              .json()
              .then((d: { error?: string }) =>
                Promise.reject(d.error ?? "Not found"),
              ),
      )
      .then(
        (data: { consultation: ConsultationData; patient: PatientData }) => {
          setConsultation(data.consultation);
          setPatient(data.patient);
        },
      )
      .catch((err: unknown) =>
        setError(typeof err === "string" ? err : "Unable to load referral"),
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500 animate-pulse">
          Loading referral letter…
        </p>
      </div>
    );
  }

  if (error || !consultation || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-4">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-600 font-medium">
            {error ?? "Referral not found"}
          </p>
          <p className="text-xs text-gray-400">
            This link may have expired or been revoked. Contact the referring
            clinic for a new link.
          </p>
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
    <div className="max-w-2xl mx-auto px-8 py-16 font-serif text-gray-900 text-[15px] leading-relaxed">
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

      <div className="mb-6 space-y-1 text-sm">
        <p>
          <span className="font-semibold">To:</span> The Treating GP
        </p>
        <p>
          <span className="font-semibold">Re:</span> {patient.name}
        </p>
        {patient.dateOfBirth && (
          <p>
            <span className="font-semibold">DOB:</span>{" "}
            {formatAuDate(patient.dateOfBirth)} (Age:{" "}
            {calcAge(patient.dateOfBirth)})
          </p>
        )}
        {patient.gender && (
          <p>
            <span className="font-semibold">Gender:</span>{" "}
            <span className="capitalize">{patient.gender}</span>
          </p>
        )}
      </div>

      {isUrgent && (
        <div className="mb-6 px-4 py-3 rounded-lg border-l-4 border-red-500 bg-red-50">
          <p className="font-bold text-red-700 uppercase text-sm tracking-wide">
            {consultation.urgencyLevel === "emergency"
              ? "⚠ Emergency — Immediate attention required"
              : "⚠ Urgent referral"}
          </p>
        </div>
      )}

      <p className="mb-5">Dear Colleague,</p>
      <p className="mb-5">
        I am writing to refer the above patient who presented via
        MediCrew&apos;s AI-assisted consultation platform on{" "}
        {formatAuDate(consultation.createdAt)}. The following is a structured
        summary generated by our multi-specialist AI care team to assist your
        clinical assessment.
      </p>

      <h2 className="text-base font-bold font-sans mb-2">
        Presenting Complaint
      </h2>
      <p className="mb-5">{consultation.symptoms}</p>

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

      {rec?.primaryRecommendation && (
        <>
          <h2 className="text-base font-bold font-sans mb-2">
            AI Care Team Assessment
          </h2>
          <p className="mb-5">{rec.primaryRecommendation}</p>
        </>
      )}

      {(patient.knownConditions || patient.medications?.length > 0) && (
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
          {patient.medications?.length > 0 && (
            <p className="mb-2">
              <span className="font-semibold">Current medications:</span>{" "}
              {patient.medications.join(", ")}
            </p>
          )}
          {patient.allergies?.length > 0 && (
            <p className="mb-5">
              <span className="font-semibold">Allergies:</span>{" "}
              {patient.allergies.join(", ")}
            </p>
          )}
        </>
      )}

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

      <p className="mb-8">
        Please do not hesitate to contact us if you require any additional
        information. We appreciate your ongoing care of this patient.
      </p>
      <p className="mb-1">Yours sincerely,</p>
      <p className="font-semibold">MediCrew AI Care Team</p>
      <p className="text-sm text-gray-500">AI-Assisted, Not AI-Decided</p>

      <hr className="border-gray-200 mt-10 mb-4" />
      <p className="text-xs text-gray-400 leading-relaxed">
        {rec?.disclaimer ??
          "This document was generated with AI assistance and is intended to support, not replace, clinical judgement. All clinical decisions remain the responsibility of the treating practitioner."}
      </p>
      <p className="text-xs text-gray-400 mt-2">
        Generated by MediCrew · Data stored in Australia (ap-southeast-2) ·
        AHPRA-safe agent naming · Shared via secure expiring link
      </p>
    </div>
  );
}
