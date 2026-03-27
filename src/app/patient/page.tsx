"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bell, FileText, User, AlertCircle, LogOut, Users, HeartPulse } from "lucide-react";
import { CareTeamCard } from "@/components/dashboard/CareTeamCard";
import { CarePlanDetail } from "@/components/dashboard/CarePlanDetail";
import { ConsultationHistoryList } from "@/components/dashboard/ConsultationHistoryList";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

interface AgentStatus {
  agentName: string;
  message: string;
  updatedAt: string;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  gender: string | null;
  knownConditions: string | null;
  consultations: Consultation[];
  notifications: Notification[];
  careTeamStatus?: { statuses: Record<string, AgentStatus> } | null;
}

interface Consultation {
  id: string;
  symptoms: string;
  urgencyLevel: string | null;
  createdAt: string;
  recommendation: unknown | null;
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
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"care-team" | "care-plan" | "history" | "notifications">("care-team");
  const [checkIns, setCheckIns] = useState<Array<{ id: string; notificationId: string | null; status: string }>>([]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/login/patient");
      return;
    }
    loadDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, consultationsRes, careTeamRes] = await Promise.all([
        fetch("/api/patient/profile"),
        fetch("/api/patient/consultations"),
        fetch("/api/patient/care-team-status"),
      ]);

      if (profileRes.status === 401) {
        router.push("/login/patient");
        return;
      }
      if (profileRes.status === 404) {
        // Patient record not yet created (webhook pending)
        router.push("/onboarding");
        return;
      }
      if (!profileRes.ok) {
        throw new Error("Failed to load profile");
      }

      const profile = await profileRes.json();
      if (!profile.onboardingComplete) {
        router.push("/onboarding?step=1");
        return;
      }

      const [notificationsRes, checkInsRes] = await Promise.all([
        fetch("/api/notifications"),
        fetch("/api/checkin"),
      ]);

      const consultationsData = consultationsRes.ok ? await consultationsRes.json() : { consultations: [] };
      const careTeamData = careTeamRes.ok ? await careTeamRes.json() : null;
      const notifications = notificationsRes.ok ? await notificationsRes.json() : [];
      const checkInsData = checkInsRes.ok ? await checkInsRes.json() : [];

      setPatient({
        id: profile.id,
        name: profile.name,
        email: user?.emailAddresses[0]?.emailAddress ?? "",
        gender: profile.gender ?? null,
        knownConditions: profile.knownConditions ?? null,
        consultations: consultationsData.consultations ?? [],
        notifications: Array.isArray(notifications) ? notifications : [],
        careTeamStatus: careTeamData,
      });
      setCheckIns(Array.isArray(checkInsData) ? checkInsData : []);
      trackEvent(ANALYTICS_EVENTS.returnVisit, { surface: "patient_portal" });
    } catch {
      setError("Failed to load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      await loadDashboard();
    } catch {
      console.error("Failed to mark as read");
    }
  };

  const unreadCount = patient?.notifications.filter((n) => !n.read).length ?? 0;

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" onClick={loadDashboard}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

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
            {patient && (
              <span className="text-sm text-muted-foreground">
                Welcome, {patient.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/patient/profile">
              <Button variant="outline" size="sm">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
            </Link>
            <Link href="/consult">
              <Button>New Consultation</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={activeTab === "care-team" ? "default" : "outline"}
              onClick={() => setActiveTab("care-team")}
            >
              <Users className="w-4 h-4 mr-2" />
              Care Team
            </Button>
            <Button
              variant={activeTab === "care-plan" ? "default" : "outline"}
              onClick={() => setActiveTab("care-plan")}
            >
              <HeartPulse className="w-4 h-4 mr-2" />
              Care Plan
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
            {activeTab === "care-team" && (
              <motion.div
                key="care-team"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {patient ? (
                  <CareTeamCard
                    patientId={patient.id}
                    initialStatuses={patient.careTeamStatus?.statuses ?? {}}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Loading your care team...</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "care-plan" && (
              <motion.div
                key="care-plan"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {patient ? (
                  <CarePlanDetail />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Loading your care plan...</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Consultation History</h2>
                  <ConsultationHistoryList
                    consultations={patient?.consultations.map((c) => ({
                      id: c.id,
                      symptoms: c.symptoms,
                      urgencyLevel: c.urgencyLevel,
                      recommendation: c.recommendation,
                      createdAt: c.createdAt,
                    })) ?? []}
                  />
                </Card>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Notifications</h2>
                  <NotificationInbox
                    notifications={patient?.notifications ?? []}
                    checkIns={checkIns}
                    onMarkRead={markAsRead}
                    onRefresh={loadDashboard}
                  />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
