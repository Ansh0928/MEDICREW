import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET consultations for a patient
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get("patientId");

        if (!patientId) {
            return NextResponse.json(
                { error: "Patient ID is required" },
                { status: 400 }
            );
        }

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

        if (!patientId || !symptoms) {
            return NextResponse.json(
                { error: "Patient ID and symptoms are required" },
                { status: 400 }
            );
        }

        const consultation = await prisma.consultation.create({
            data: {
                patientId,
                symptoms,
                urgencyLevel,
                redFlags: redFlags ? JSON.stringify(redFlags) : null,
                triageResponse: triageResponse ? JSON.stringify(triageResponse) : null,
                gpResponse: gpResponse ? JSON.stringify(gpResponse) : null,
                specialistResponse: specialistResponse ? JSON.stringify(specialistResponse) : null,
                recommendation: recommendation ? JSON.stringify(recommendation) : null,
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
