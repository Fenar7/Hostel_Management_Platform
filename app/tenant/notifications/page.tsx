"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Bell,
  Check,
  Trash2,
  MailOpen,
  Mail,
  Utensils,
  CreditCard,
  FileText,
  Calendar,
  AlertCircle,
  Inbox
} from "lucide-react";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  dismissedFromHome: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tenant/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = await res.json();
      setNotifications(json.notifications || []);
    } catch (err: any) {
      notify.error(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string, readStatus: boolean) => {
    try {
      setActioningId(id);
      const res = await fetch(`/api/tenant/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: readStatus }),
      });
      if (!res.ok) throw new Error("Failed to update notification");
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: readStatus } : n))
      );
      notify.success(readStatus ? "Marked as read" : "Marked as unread");
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tenant/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) throw new Error("Failed to update notifications");

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      notify.success("All notifications marked as read");
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      setActioningId(id);
      const res = await fetch(`/api/tenant/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissedFromHome: true }),
      });
      if (!res.ok) throw new Error("Failed to dismiss notification");

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      notify.success("Notification dismissed");
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setActioningId(null);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("FOOD")) return <Utensils className="h-5 w-5 text-amber-500" />;
    if (t.includes("PAY")) return <CreditCard className="h-5 w-5 text-blue-500" />;
    if (t.includes("ONBOARD")) return <FileText className="h-5 w-5 text-emerald-500" />;
    return <Bell className="h-5 w-5 text-violet-500" />;
  };

  const getNotificationBadgeColor = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("FOOD")) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";
    if (t.includes("PAY")) return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20";
    if (t.includes("ONBOARD")) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
    return "bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20";
  };

  if (loading && notifications.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-4 translate-x-4 rounded-full bg-white/10 blur-xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Notifications Hub</h1>
            <p className="text-indigo-100/90 text-sm font-medium">
              Real-time updates about your stay, meal subscriptions, and billing transactions.
            </p>
          </div>
          {notifications.some((n) => !n.read) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="self-start md:self-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md font-semibold transition-all hover:scale-[1.02]"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Control Tabs */}
      <div className="flex items-center justify-between border-b pb-4">
        <Tabs defaultValue="all" className="w-auto" onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="bg-muted/70 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg px-4 py-2 font-medium">
              All Notifications ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-lg px-4 py-2 font-medium">
              Unread ({notifications.filter((n) => !n.read).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main List */}
      {filteredNotifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed rounded-3xl bg-muted/20 backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-100 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-950/40 mb-6 shadow-sm">
            <Inbox className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">You are all caught up!</CardTitle>
          <CardDescription className="mt-2 max-w-sm text-muted-foreground/80 font-medium">
            {activeTab === "unread" 
              ? "There are no unread notifications right now. Check back later for updates." 
              : "No notification alerts recorded yet. Stay tuned for future stay activities."}
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notif) => {
            const dateStr = new Date(notif.createdAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card
                key={notif.id}
                className={`transition-all duration-200 rounded-2xl border-muted/80 hover:shadow-md hover:scale-[1.005] ${
                  notif.read
                    ? "bg-card/40 opacity-75"
                    : "bg-gradient-to-r from-card to-indigo-50/5 dark:to-indigo-950/5 border-l-4 border-l-indigo-600 dark:border-l-indigo-400"
                }`}
              >
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-start gap-4">
                    {/* Color-Coded Icon Block */}
                    <div className={`p-3 rounded-2xl bg-muted/60 shrink-0`}>
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-base tracking-tight leading-none">
                          {notif.title}
                        </span>
                        <Badge className={`text-[10px] py-0.5 px-2 font-semibold capitalize rounded-md ${getNotificationBadgeColor(notif.type)}`}>
                          {notif.type.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" title="Unread" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                        {notif.message}
                      </p>
                      <span className="text-xs text-muted-foreground/60 flex items-center gap-1 pt-1.5 font-medium">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                      </span>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        title={notif.read ? "Mark as unread" : "Mark as read"}
                        onClick={() => handleMarkAsRead(notif.id, !notif.read)}
                        disabled={actioningId === notif.id}
                      >
                        {notif.read ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <MailOpen className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete Alert"
                        className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDismiss(notif.id)}
                        disabled={actioningId === notif.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
