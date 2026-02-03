import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET patient by ID with full consultation history
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const patient = await prisma.patient.findUnique({
            where: { id },
            include: {
                consultations: {
                    orderBy: { createdAt: "desc" },
                },
                notifications: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        doctor: true,
                    },
                },
            },
        });

        if (!patient) {
            return NextResponse.json(
                { error: "Patient not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(patient);
    } catch (error) {
        console.error("Error fetching patient:", error);
        return NextResponse.json(
            { error: "Failed to fetch patient" },
            { status: 500 }
        );
    }
}
