"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bell, Clock, User, FileText, AlertCircle } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  email: string;
  age: number | null;
  gender: string | null;
  knownConditions: string | null;
  consultations: Consultation[];
  notifications: Notification[];
}

interface Consultation {
  id: string;
  symptoms: string;
  urgencyLevel: string | null;
  createdAt: string;
  recommendation: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  doctor?: { name: string };
}

export default function PatientPortal() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "history" | "notifications">("profile");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    knownConditions: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load patient by email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("patientEmail");
    if (savedEmail) {
      loadPatient(savedEmail);
    }
  }, []);

  const loadPatient = async (email: string) => {
    try {
      // First get patient by email using the list endpoint
      const res = await fetch("/api/patients");
      const patients = await res.json();
      const found = patients.find((p: Patient) => p.email === email);

      if (found) {
        // Get full patient details
        const detailRes = await fetch(`/api/patients/${found.id}`);
        const fullPatient = await detailRes.json();
        setPatient(fullPatient);
        setFormData({
          name: fullPatient.name,
          email: fullPatient.email,
          age: fullPatient.age?.toString() || "",
          gender: fullPatient.gender || "",
          knownConditions: fullPatient.knownConditions || "",
        });
      }
    } catch {
      console.error("Failed to load patient");
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save");

      const savedPatient = await res.json();
      localStorage.setItem("patientEmail", savedPatient.email);

      // Reload with full data
      await loadPatient(savedPatient.email);
      setSuccess("Profile saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      // Reload patient data
      if (patient) {
        loadPatient(patient.email);
      }
    } catch {
      console.error("Failed to mark as read");
    }
  };

  const unreadCount = patient?.notifications.filter(n => !n.read).length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
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
            <h1 className="text-xl font-bold text-blue-600">Patient Portal</h1>
          </div>
          <Link href="/consult">
            <Button>New Consultation</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === "profile" ? "default" : "outline"}
              onClick={() => setActiveTab("profile")}
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button
              variant={activeTab === "history" ? "default" : "outline"}
              onClick={() => setActiveTab("history")}
            >
              <FileText className="w-4 h-4 mr-2" />
              History
              {patient && patient.consultations.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {patient.consultations.length}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === "notifications" ? "default" : "outline"}
              onClick={() => setActiveTab("notifications")}
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          type="number"
                          value={formData.age}
                          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          placeholder="30"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gender">Gender</Label>
                        <select
                          id="gender"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="conditions">Known Medical Conditions</Label>
                      <Input
                        id="conditions"
                        value={formData.knownConditions}
                        onChange={(e) => setFormData({ ...formData, knownConditions: e.target.value })}
                        placeholder="e.g., Diabetes, High blood pressure"
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 text-red-600 rounded-md flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="p-3 bg-green-50 text-green-600 rounded-md">
                        ✓ {success}
                      </div>
                    )}

                    <Button onClick={handleSaveProfile} disabled={loading}>
                      {loading ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* History Tab */}
            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Consultation History</h2>
                  {!patient || patient.consultations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No consultations yet</p>
                      <Link href="/consult">
                        <Button className="mt-4">Start Your First Consultation</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {patient.consultations.map((consultation) => (
                        <Card key={consultation.id} className="p-4 bg-muted/30">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{consultation.symptoms}</p>
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                {new Date(consultation.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge variant={
                              consultation.urgencyLevel === "emergency" ? "destructive" :
                                consultation.urgencyLevel === "urgent" ? "default" :
                                  "secondary"
                            }>
                              {consultation.urgencyLevel || "Unknown"}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Notifications</h2>
                  {!patient || patient.notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {patient.notifications.map((notification) => (
                        <Card
                          key={notification.id}
                          className={`p-4 ${notification.read ? "bg-muted/30" : "bg-blue-50 dark:bg-blue-950/30 border-blue-200"}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{notification.title}</h4>
                                {!notification.read && (
                                  <Badge variant="default" className="text-xs">New</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {new Date(notification.createdAt).toLocaleDateString()}
                                {notification.doctor && (
                                  <span>• From: {notification.doctor.name}</span>
                                )}
                              </div>
                            </div>
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                              >
                                Mark Read
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
