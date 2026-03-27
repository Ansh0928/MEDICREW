import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";

// GET notifications for a patient
export async function GET(request: NextRequest) {
    try {
        const { patient, needsOnboarding, error: authError } = await getAuthenticatedPatient();
        if (authError) return authError;
        if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
        const patientId = patient!.id;

        const notifications = await prisma.notification.findMany({
            where: { patientId },
            include: {
                doctor: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json(
            { error: "Failed to fetch notifications" },
            { status: 500 }
        );
    }
}

// POST send notification (doctor to patient)
export async function POST(request: NextRequest) {
    try {
        const { patient, needsOnboarding, error: authError } = await getAuthenticatedPatient();
        if (authError) return authError;
        if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
        const authPatientId = patient!.id;

        const body = await request.json();
        const { patientId, doctorId, title, message, type = "info" } = body;

        if (!patientId || !title || !message) {
            return NextResponse.json(
                { error: "Patient ID, title, and message are required" },
                { status: 400 }
            );
        }
        if (patientId !== authPatientId) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        const notification = await prisma.notification.create({
            data: {
                patientId,
                doctorId,
                title,
                message,
                type,
            },
            include: {
                doctor: true,
                patient: true,
            },
        });

        return NextResponse.json(notification);
    } catch (error) {
        console.error("Error creating notification:", error);
        return NextResponse.json(
            { error: "Failed to send notification" },
            { status: 500 }
        );
    }
}

// PATCH mark notification as read
export async function PATCH(request: NextRequest) {
    try {
        const { patient, needsOnboarding, error: authError } = await getAuthenticatedPatient();
        if (authError) return authError;
        if (needsOnboarding) return NextResponse.json({ error: "Onboarding required", redirect: "/onboarding" }, { status: 403 });
        const patientId = patient!.id;

        const body = await request.json();
        const { notificationId } = body;

        if (!notificationId) {
            return NextResponse.json(
                { error: "Notification ID is required" },
                { status: 400 }
            );
        }

        const existing = await prisma.notification.findUnique({
            where: { id: notificationId },
            select: { id: true, patientId: true },
        });
        if (!existing || existing.patientId !== patientId) {
            return NextResponse.json(
                { error: "Notification not found" },
                { status: 404 }
            );
        }

        const notification = await prisma.notification.update({
            where: { id: notificationId },
            data: { read: true },
        });

        return NextResponse.json(notification);
    } catch (error) {
        console.error("Error updating notification:", error);
        return NextResponse.json(
            { error: "Failed to update notification" },
            { status: 500 }
        );
    }
}
