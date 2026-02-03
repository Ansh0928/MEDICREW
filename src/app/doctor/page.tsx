"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, FileText, Send, Clock, ChevronRight, AlertCircle, User } from "lucide-react";

interface Patient {
    id: string;
    name: string;
    email: string;
    age: number | null;
    gender: string | null;
    knownConditions: string | null;
    createdAt: string;
    updatedAt: string;
    consultations: Consultation[];
    notifications: Notification[];
    _count: {
        consultations: number;
        notifications: number;
    };
}

interface Consultation {
    id: string;
    symptoms: string;
    urgencyLevel: string | null;
    createdAt: string;
    recommendation: string | null;
    triageResponse: string | null;
    gpResponse: string | null;
}

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
}

export default function DoctorDashboard() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [notificationForm, setNotificationForm] = useState({
        title: "",
        message: "",
        type: "info",
    });
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const res = await fetch("/api/patients");
            const data = await res.json();
            setPatients(data);
        } catch (error) {
            console.error("Failed to load patients:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadPatientDetails = async (patientId: string) => {
        try {
            const res = await fetch(`/api/patients/${patientId}`);
            const data = await res.json();
            setSelectedPatient(data);
        } catch (error) {
            console.error("Failed to load patient details:", error);
        }
    };

    const sendNotification = async () => {
        if (!selectedPatient || !notificationForm.title || !notificationForm.message) return;

        setSending(true);
        try {
            const res = await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientId: selectedPatient.id,
                    ...notificationForm,
                }),
            });

            if (!res.ok) throw new Error("Failed to send");

            setSuccess("Notification sent successfully!");
            setNotificationForm({ title: "", message: "", type: "info" });

            // Reload patient details
            await loadPatientDetails(selectedPatient.id);
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error("Failed to send notification:", error);
        } finally {
            setSending(false);
        }
    };

    const getUrgencyColor = (urgency: string | null) => {
        switch (urgency) {
            case "emergency": return "destructive";
            case "urgent": return "default";
            case "routine": return "secondary";
            default: return "outline";
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Home
                            </Button>
                        </Link>
                        <h1 className="text-xl font-bold text-emerald-600">👨‍⚕️ Doctor Dashboard</h1>
                    </div>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                        Demo Mode
                    </Badge>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Patient List */}
                    <div className="lg:col-span-1">
                        <Card className="p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-emerald-600" />
                                <h2 className="font-semibold">Patients</h2>
                                <Badge variant="secondary">{patients.length}</Badge>
                            </div>

                            {loading ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Loading patients...
                                </div>
                            ) : patients.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No patients yet</p>
                                    <p className="text-sm mt-2">Patients will appear here after they create a profile</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {patients.map((patient) => (
                                        <motion.div
                                            key={patient.id}
                                            whileHover={{ x: 4 }}
                                            className={`p-3 rounded-lg cursor-pointer flex items-center justify-between ${selectedPatient?.id === patient.id
                                                    ? "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200"
                                                    : "bg-muted/50 hover:bg-muted"
                                                }`}
                                            onClick={() => loadPatientDetails(patient.id)}
                                        >
                                            <div>
                                                <p className="font-medium">{patient.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {patient._count.consultations} consultations
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Patient Details */}
                    <div className="lg:col-span-2">
                        <AnimatePresence mode="wait">
                            {!selectedPatient ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <Card className="p-8 text-center">
                                        <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                        <p className="text-muted-foreground">Select a patient to view their details</p>
                                    </Card>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={selectedPatient.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    {/* Patient Info */}
                                    <Card className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h2 className="text-xl font-semibold">{selectedPatient.name}</h2>
                                                <p className="text-muted-foreground">{selectedPatient.email}</p>
                                                <div className="flex gap-4 mt-2 text-sm">
                                                    {selectedPatient.age && <span>Age: {selectedPatient.age}</span>}
                                                    {selectedPatient.gender && <span>Gender: {selectedPatient.gender}</span>}
                                                </div>
                                                {selectedPatient.knownConditions && (
                                                    <div className="mt-2">
                                                        <Badge variant="outline">
                                                            <AlertCircle className="w-3 h-3 mr-1" />
                                                            {selectedPatient.knownConditions}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right text-sm text-muted-foreground">
                                                <p>Last updated</p>
                                                <p>{new Date(selectedPatient.updatedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Consultation History */}
                                    <Card className="p-6">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Consultation History
                                        </h3>
                                        {selectedPatient.consultations.length === 0 ? (
                                            <p className="text-muted-foreground text-center py-4">No consultations</p>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedPatient.consultations.map((consultation) => (
                                                    <Card key={consultation.id} className="p-4 bg-muted/30">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <Badge variant={getUrgencyColor(consultation.urgencyLevel) as "default" | "secondary" | "destructive" | "outline"}>
                                                                {consultation.urgencyLevel || "Unknown"}
                                                            </Badge>
                                                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(consultation.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="font-medium">{consultation.symptoms}</p>
                                                        {consultation.gpResponse && (
                                                            <details className="mt-2">
                                                                <summary className="text-sm text-blue-600 cursor-pointer">
                                                                    View AI Assessment
                                                                </summary>
                                                                <p className="mt-2 text-sm text-muted-foreground p-3 bg-white dark:bg-gray-800 rounded">
                                                                    {JSON.parse(consultation.gpResponse)}
                                                                </p>
                                                            </details>
                                                        )}
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </Card>

                                    {/* Send Notification */}
                                    <Card className="p-6">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <Send className="w-4 h-4" />
                                            Send Notification to Patient
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="notifTitle">Title</Label>
                                                <Input
                                                    id="notifTitle"
                                                    value={notificationForm.title}
                                                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                                                    placeholder="e.g., Follow-up Appointment"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="notifMessage">Message</Label>
                                                <textarea
                                                    id="notifMessage"
                                                    value={notificationForm.message}
                                                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                                                    placeholder="Write your message to the patient..."
                                                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="notifType">Type</Label>
                                                <select
                                                    id="notifType"
                                                    value={notificationForm.type}
                                                    onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                >
                                                    <option value="info">ℹ️ Info</option>
                                                    <option value="warning">⚠️ Warning</option>
                                                    <option value="appointment">📅 Appointment</option>
                                                    <option value="prescription">💊 Prescription</option>
                                                </select>
                                            </div>

                                            {success && (
                                                <div className="p-3 bg-green-50 text-green-600 rounded-md">
                                                    ✓ {success}
                                                </div>
                                            )}

                                            <Button
                                                onClick={sendNotification}
                                                disabled={sending || !notificationForm.title || !notificationForm.message}
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                {sending ? "Sending..." : "Send Notification"}
                                            </Button>
                                        </div>
                                    </Card>

                                    {/* Sent Notifications */}
                                    {selectedPatient.notifications.length > 0 && (
                                        <Card className="p-6">
                                            <h3 className="font-semibold mb-4">Sent Notifications</h3>
                                            <div className="space-y-2">
                                                {selectedPatient.notifications.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        className="p-3 bg-muted/30 rounded-lg flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-sm">{notification.title}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(notification.createdAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <Badge variant={notification.read ? "outline" : "default"}>
                                                            {notification.read ? "Read" : "Unread"}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
