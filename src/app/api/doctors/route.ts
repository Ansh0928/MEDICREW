import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all doctors
export async function GET() {
    try {
        const doctors = await prisma.doctor.findMany({
            orderBy: { name: "asc" },
        });

        return NextResponse.json(doctors);
    } catch (error) {
        console.error("Error fetching doctors:", error);
        return NextResponse.json(
            { error: "Failed to fetch doctors" },
            { status: 500 }
        );
    }
}

// POST create doctor (for demo seeding)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, specialty } = body;

        if (!name || !email || !specialty) {
            return NextResponse.json(
                { error: "Name, email, and specialty are required" },
                { status: 400 }
            );
        }

        const doctor = await prisma.doctor.upsert({
            where: { email },
            update: { name, specialty },
            create: { name, email, specialty },
        });

        return NextResponse.json(doctor);
    } catch (error) {
        console.error("Error creating doctor:", error);
        return NextResponse.json(
            { error: "Failed to create doctor" },
            { status: 500 }
        );
    }
}
