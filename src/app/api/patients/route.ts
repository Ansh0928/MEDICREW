import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all patients (for doctor dashboard)
export async function GET() {
    try {
        const patients = await prisma.patient.findMany({
            include: {
                consultations: {
                    orderBy: { createdAt: "desc" },
                    take: 1, // Just get the latest consultation
                },
                _count: {
                    select: { consultations: true, notifications: true },
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(patients);
    } catch (error) {
        console.error("Error fetching patients:", error);
        return NextResponse.json(
            { error: "Failed to fetch patients" },
            { status: 500 }
        );
    }
}

// POST create/update patient
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, name, age, gender, knownConditions } = body;

        if (!email || !name) {
            return NextResponse.json(
                { error: "Email and name are required" },
                { status: 400 }
            );
        }

        // Upsert - create or update based on email
        const patient = await prisma.patient.upsert({
            where: { email },
            update: {
                name,
                age: age ? parseInt(age) : null,
                gender,
                knownConditions,
            },
            create: {
                email,
                name,
                age: age ? parseInt(age) : null,
                gender,
                knownConditions,
            },
        });

        return NextResponse.json(patient);
    } catch (error) {
        console.error("Error creating/updating patient:", error);
        return NextResponse.json(
            { error: "Failed to save patient" },
            { status: 500 }
        );
    }
}
