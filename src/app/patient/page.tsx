"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Bell,
  FileText,
  User,
  AlertCircle,
  LogOut,
  Users,
  HeartPulse,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { CareTeamCard } from "@/components/dashboard/CareTeamCard";
import { CarePlanDetail } from "@/components/dashboard/CarePlanDetail";
import { ConsultationHistoryList } from "@/components/dashboard/ConsultationHistoryList";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { SymptomJournalWidget } from "@/components/dashboard/SymptomJournalWidget";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentStatus {
  agentName: string;
  message: string;
  updatedAt: string;
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

interface DashboardData {
  profile: {
    id: string;
    name: string;
    gender: string | null;
    knownConditions: string | null;
    onboardingComplete: boolean;
    subscriptionPlan: string;
    subscriptionStatus: string;
    stripeCustomerId: string | null;
  };
  consultations: Consultation[];
  careTeamStatus: {
    statuses: Record<string, AgentStatus>;
    updatedAt: string | null;
  };
  notifications: Notification[];
  checkIns: Array<{
    id: string;
    notificationId: string | null;
    status: string;
  }>;
}

// ── SWR fetcher ───────────────────────────────────────────────────────────────

const fetcher = async (url: string): Promise<DashboardData> => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(
      err.error ?? "Failed to load dashboard",
    ) as Error & {
      status: number;
      redirect?: string;
    };
    error.status = res.status;
    error.redirect = err.redirect;
    throw error;
  }
  return res.json();
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-36 bg-blue-100 dark:bg-blue-900/30 rounded animate-pulse" />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-wrap gap-2">
            {[120, 100, 110, 90, 130].map((w, i) => (
              <div
                key={i}
                className="h-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                style={{ width: w }}
              />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-3"
            >
              <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PatientPortal() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const hasTrackedVisit = useRef(false);
  const [activeTab, setActiveTab] = useState<
    "care-team" | "care-plan" | "history" | "journal" | "notifications"
  >("care-team");

  // SWR: stale-while-revalidate — first load fetches, return visits are instant.
  // Disabled until Clerk reports the user is loaded, to avoid a premature 401.
  const {
    data,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<DashboardData>(
    // Key includes user.id so cached data is never shared across Clerk accounts
    // in the same browser session (e.g. sign-out → sign-in as different patient).
    isLoaded && user ? `/api/patient/dashboard?uid=${user.id}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  // Handle auth + onboarding redirects from the API response.
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/login/patient");
      return;
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (!swrError) return;
    const err = swrError as Error & { status?: number; redirect?: string };
    if (err.status === 401) {
      router.push("/login/patient");
    } else if (err.status === 404) {
      router.push("/onboarding");
    } else if (err.status === 403 && err.redirect) {
      router.push(err.redirect);
    }
  }, [swrError, router]);

  useEffect(() => {
    if (data && !data.profile.onboardingComplete) {
      router.push("/onboarding?step=1");
    }
  }, [data, router]);

  // Track return visit once per page mount — not on every SWR revalidation.
  useEffect(() => {
    if (data && !hasTrackedVisit.current) {
      hasTrackedVisit.current = true;
      trackEvent(ANALYTICS_EVENTS.returnVisit, { surface: "patient_portal" });
    }
  }, [data]);

  // Optimistic markAsRead — updates UI instantly, revalidates after PATCH.
  const markAsRead = async (notificationId: string) => {
    mutate(
      (current) =>
        current
          ? {
              ...current,
              notifications: current.notifications.map((n) =>
                n.id === notificationId ? { ...n, read: true } : n,
              ),
            }
          : current,
      false,
    );
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      mutate();
    } catch {
      console.error("Failed to mark notification as read");
      mutate(); // revert by revalidating
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  if (!isLoaded || isLoading) return <DashboardSkeleton />;

  if (swrError && !data) {
    const isAuthError = (swrError as { status?: number }).status === 401;
    if (isAuthError) return null; // redirect in progress
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-red-600">
            Failed to load your dashboard. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const profile = data?.profile;
  const consultations = data?.consultations ?? [];
  const notifications = data?.notifications ?? [];
  const checkIns = data?.checkIns ?? [];
  const careTeamStatuses = data?.careTeamStatus?.statuses ?? {};
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>
            <h1 className="text-base sm:text-xl font-bold text-blue-600">
              Patient Portal
            </h1>
            {profile && (
              <span className="hidden md:block text-sm text-muted-foreground">
                Welcome, {profile.name}
              </span>
            )}
            {profile?.subscriptionPlan === "pro" && (
              <Badge className="bg-sky-600 text-white text-xs">Pro</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {profile?.stripeCustomerId && (
              <button
                onClick={async () => {
                  const res = await fetch("/api/billing/portal", {
                    method: "POST",
                  });
                  const d = await res.json();
                  if (d.url) window.location.href = d.url;
                }}
                className="hidden sm:block text-sm text-slate-500 hover:text-slate-700 underline"
              >
                Manage billing
              </button>
            )}
            {!profile?.stripeCustomerId &&
              profile?.subscriptionPlan === "free" && (
                <a
                  href="/pricing"
                  className="hidden sm:block text-sm text-sky-600 hover:underline font-medium"
                >
                  Upgrade to Pro
                </a>
              )}
            <Link href="/patient/profile">
              <Button variant="outline" size="sm" className="px-2 sm:px-3">
                <User className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>
            <Link href="/consult">
              <Button size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
                <span className="hidden sm:inline">New </span>Consultation
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="px-2 sm:px-3"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
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
              {consultations.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {consultations.length}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === "journal" ? "default" : "outline"}
              onClick={() => setActiveTab("journal")}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Journal
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

          {/* Tab content — mode="sync" removes the exit-then-enter gap */}
          <AnimatePresence mode="sync">
            {activeTab === "care-team" && (
              <motion.div
                key="care-team"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
              >
                <CareTeamCard
                  patientId={profile!.id}
                  initialStatuses={careTeamStatuses}
                />
              </motion.div>
            )}

            {activeTab === "care-plan" && (
              <motion.div
                key="care-plan"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
              >
                <CarePlanDetail />
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Consultation History
                  </h2>
                  <ConsultationHistoryList consultations={consultations} />
                </Card>
              </motion.div>
            )}

            {activeTab === "journal" && (
              <motion.div
                key="journal"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
              >
                <SymptomJournalWidget />
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Notifications</h2>
                  <NotificationInbox
                    notifications={notifications}
                    checkIns={checkIns}
                    onMarkRead={markAsRead}
                    onRefresh={() => mutate()}
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
