import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

// GET consultations for a patient
export async function GET(request: NextRequest) {
    try {
        const { patient, needsOnboarding, error: authError } = await getAuthenticatedPatient();
        if (authError) return authError;
        if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
        const patientId = patient!.id;

        const consultations = await prisma.consultation.findMany({
            where: { patientId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(consultations);
    } catch (error) {
        console.error("Error fetching consultations:", error);
        return NextResponse.json(
            { error: "Failed to fetch consultations" },
            { status: 500 }
        );
    }
}

// POST save a consultation
export async function POST(request: NextRequest) {
    try {
        const { patient, needsOnboarding, error: authError } = await getAuthenticatedPatient();
        if (authError) return authError;
        if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
        const authPatientId = patient!.id;

        const body = await request.json();
        const {
            patientId,
            symptoms,
            urgencyLevel,
            redFlags,
            triageResponse,
            gpResponse,
            specialistResponse,
            recommendation,
        } = body;

        if (!symptoms) {
            return NextResponse.json(
                { error: "Symptoms are required" },
                { status: 400 }
            );
        }
        if (patientId && patientId !== authPatientId) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const consultation = await prisma.consultation.create({
            data: {
                patientId: authPatientId,
                symptoms,
                urgencyLevel,
                redFlags: redFlags ? JSON.stringify(redFlags) : null,
                triageResponse: triageResponse ? JSON.stringify(triageResponse) : null,
                gpResponse: gpResponse ? JSON.stringify(gpResponse) : null,
                specialistResponse: specialistResponse ? JSON.stringify(specialistResponse) : null,
                recommendation: recommendation ?? null,
            },
        });

        return NextResponse.json(consultation);
    } catch (error) {
        console.error("Error saving consultation:", error);
        return NextResponse.json(
            { error: "Failed to save consultation" },
            { status: 500 }
        );
    }
}
