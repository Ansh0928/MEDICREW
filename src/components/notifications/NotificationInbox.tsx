"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { CheckInResponseCard } from "./CheckInResponseCard";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  doctor?: { name: string };
}

interface CheckInItem {
  id: string;
  notificationId: string | null;
  status: string;
}

interface NotificationInboxProps {
  notifications: NotificationItem[];
  checkIns: CheckInItem[];
  onMarkRead: (id: string) => void;
  onRefresh: () => void;
}

export function NotificationInbox({
  notifications,
  checkIns,
  onMarkRead,
  onRefresh,
}: NotificationInboxProps) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No notifications yet</p>
      </div>
    );
  }

  // Build a map of notificationId -> checkIn for pending check-ins
  const pendingCheckInByNotifId = new Map<string, CheckInItem>();
  for (const ci of checkIns) {
    if (ci.status === "pending" && ci.notificationId) {
      pendingCheckInByNotifId.set(ci.notificationId, ci);
    }
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => {
        // Check if this is a pending check-in notification that needs a response card
        const pendingCheckIn = pendingCheckInByNotifId.get(notification.id);
        if (notification.type === "check-in" && pendingCheckIn) {
          return (
            <CheckInResponseCard
              key={notification.id}
              checkInId={pendingCheckIn.id}
              notificationId={notification.id}
              message={notification.message}
              createdAt={notification.createdAt}
              onResponded={onRefresh}
            />
          );
        }

        // Emergency/escalation notifications — alert styling
        if (
          notification.type === "emergency" ||
          notification.type === "escalation"
        ) {
          const isEmergency = notification.type === "emergency";
          return (
            <Card
              key={notification.id}
              className={`p-4 border-l-4 ${
                isEmergency
                  ? "border-l-red-600 bg-red-50 dark:bg-red-950/20"
                  : "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20"
              } ${notification.read ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {isEmergency ? (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <Badge variant="destructive" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(notification.createdAt).toLocaleDateString(
                        "en-AU",
                      )}
                    </div>
                  </div>
                </div>
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMarkRead(notification.id)}
                    className="shrink-0"
                  >
                    Mark Read
                  </Button>
                )}
              </div>
            </Card>
          );
        }

        // Standard notification card
        return (
          <Card
            key={notification.id}
            className={`p-4 ${
              notification.read
                ? "bg-muted/30"
                : "bg-blue-50 dark:bg-blue-950/30 border-blue-200"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  {!notification.read && (
                    <Badge variant="default" className="text-xs">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.message}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {new Date(notification.createdAt).toLocaleDateString("en-AU")}
                  {notification.doctor && (
                    <span>From: {notification.doctor.name}</span>
                  )}
                </div>
              </div>
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkRead(notification.id)}
                >
                  Mark Read
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
