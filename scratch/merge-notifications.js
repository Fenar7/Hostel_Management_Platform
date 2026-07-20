const fs = require('fs');

const content = `"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Check,
  Trash2,
  MailOpen,
  Mail,
  Utensils,
  CreditCard,
  FileText,
  Calendar,
  Inbox,
  MessageSquare,
  ArrowRight,
  Loader2,
  ClipboardList,
  ChevronLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  dismissedFromHome: boolean;
  createdAt: string;
  referenceId: string | null;
  targetUrl: string | null;
}

interface NotificationsPanelProps {
  role?: "TENANT" | "WARDEN" | "MAIN_ADMIN";
}

export function NotificationsPanel({ role = "TENANT" }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  
  // Modal state
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
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

  const handleMarkAsRead = async (id: string, readStatus: boolean, skipToast = false) => {
    try {
      setActioningId(id);
      const res = await fetch(\`/api/notifications/\${id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: readStatus }),
      });
      if (!res.ok) throw new Error("Failed to update notification");
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: readStatus } : n))
      );
      if (!skipToast) {
        notify.success(readStatus ? "Marked as read" : "Marked as unread");
      }
    } catch (err: any) {
      if (!skipToast) notify.error(err.message || "Something went wrong");
    } finally {
      setActioningId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications", {
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

  const handleDismiss = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setActioningId(id);
      const res = await fetch(\`/api/notifications/\${id}\`, {
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

  const handleOpenNotification = (notif: NotificationItem) => {
    setSelectedNotification(notif);
    setNoteText("");
    if (!notif.read) {
      handleMarkAsRead(notif.id, true, true);
    }
  };

  const handleAddNote = async () => {
    if (!selectedNotification?.referenceId || !noteText.trim()) return;
    
    try {
      setSubmittingNote(true);
      const res = await fetch(\`/api/tickets/\${selectedNotification.referenceId}/comments\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: noteText }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add note");
      }
      
      notify.success("Note added successfully to the ticket");
      setNoteText("");
      setSelectedNotification(null);
    } catch (err: any) {
      notify.error(err.message || "Something went wrong");
    } finally {
      setSubmittingNote(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.read;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("FOOD")) return <Utensils className="h-4 w-4 text-muted-foreground" />;
    if (t.includes("PAY")) return <CreditCard className="h-4 w-4 text-muted-foreground" />;
    if (t.includes("ONBOARD")) return <FileText className="h-4 w-4 text-muted-foreground" />;
    if (t.includes("TICKET")) return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    if (t.includes("TASK")) return <ClipboardList className="h-4 w-4 text-muted-foreground" />;
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  const getTicketLink = () => {
    if (!selectedNotification?.referenceId) return "#";
    if (role === "TENANT") return \`/tenant/tickets\`;
    if (role === "WARDEN") return \`/warden/tickets\`;
    if (role === "MAIN_ADMIN") return \`/admin/tickets\`;
    return "#";
  };

  const getActionLabel = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("TASK")) return "View Task";
    if (t.includes("PAY")) return "View Payment";
    if (t.includes("ONBOARD")) return "View Application";
    if (t.includes("FOOD")) return "View Food Orders";
    return "View Details";
  };

  if (loading && notifications.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className={cn("w-full mx-auto space-y-6", role === "TENANT" ? "py-8 px-4 md:px-6 xl:px-8 max-w-4xl" : "py-8 px-4 md:px-6 xl:px-8")}>
      
      {/* -- Clean, Non-flashy Header -- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div className="space-y-1 flex items-center gap-4">
          {role === "TENANT" && (
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 text-black hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-muted-foreground text-sm">
              Stay updated with the latest alerts.
            </p>
          </div>
        </div>
        
        {notifications.some((n) => !n.read) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="self-start md:self-auto transition-all hover:bg-muted"
          >
            <Check className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Control Tabs */}
      <div className="flex items-center justify-between pb-2">
        <Tabs defaultValue="all" className="w-auto" onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="bg-muted p-1 rounded-lg">
            <TabsTrigger value="all" className="rounded-md px-3 py-1.5 text-xs font-semibold">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="rounded-md px-3 py-1.5 text-xs font-semibold">
              Unread ({notifications.filter((n) => !n.read).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main List */}
      {filteredNotifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border rounded-2xl bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg font-bold tracking-tight">You are all caught up!</CardTitle>
          <CardDescription className="mt-1.5 max-w-sm text-muted-foreground">
            {activeTab === "unread" 
              ? "There are no unread notifications right now." 
              : "No notification alerts recorded yet."}
          </CardDescription>
        </Card>
      ) : (
        <div className="space-y-3">
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
                onClick={() => handleOpenNotification(notif)}
                className={\`transition-all duration-150 rounded-xl border border-border hover:border-muted-foreground/30 cursor-pointer \${
                  notif.read
                    ? "bg-card/70 opacity-80"
                    : "bg-card border-l-2 border-l-primary"
                }\`}
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start gap-4">
                    {/* Minimalist Icon Box */}
                    <div className="p-2.5 rounded-lg bg-muted shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">
                          {notif.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium capitalize text-muted-foreground bg-muted/40">
                          {notif.type.replace(/_/g, " ").toLowerCase()}
                        </Badge>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-primary" title="Unread" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pt-0.5 pr-8">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 pt-1 font-medium">
                        <Calendar className="h-3 w-3" />
                        {dateStr}
                      </span>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground h-8 w-8 z-10"
                        title={notif.read ? "Mark as unread" : "Mark as read"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notif.id, !notif.read);
                        }}
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
                        className="rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 z-10"
                        onClick={(e) => handleDismiss(notif.id, e)}
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

      {/* Custom Modal Overlay */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedNotification(null)}>
          <div 
            className="w-full max-w-[480px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-8 pb-6 bg-white">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-muted shrink-0">
                  {getNotificationIcon(selectedNotification.type)}
                </div>
                <div className="pt-1">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
                    {selectedNotification.title}
                  </h2>
                  <p className="mt-1.5 text-sm font-medium text-gray-500">
                    {new Date(selectedNotification.createdAt).toLocaleString("en-IN", {
                      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 text-[15px] leading-relaxed text-gray-700 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                {selectedNotification.message}
              </div>

              {selectedNotification.type === "TICKET" && selectedNotification.referenceId && (
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Add a note to this ticket</h4>
                  <Textarea 
                    placeholder="Type your comment or update here..."
                    className="min-h-[100px] resize-none rounded-xl border-gray-200 focus-visible:ring-blue-500 text-sm"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <Button variant="ghost" className="rounded-xl text-gray-500 hover:text-gray-700" onClick={() => setSelectedNotification(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                {selectedNotification.type === "TICKET" && selectedNotification.referenceId ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="rounded-xl bg-white border-gray-200 shadow-sm"
                      onClick={() => {
                        setSelectedNotification(null);
                        router.push(getTicketLink());
                      }}
                    >
                      View Ticket
                    </Button>
                    <Button 
                      onClick={handleAddNote}
                      disabled={!noteText.trim() || submittingNote}
                      className="rounded-xl shadow-sm bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      {submittingNote ? <Loader2 className="size-4 animate-spin mr-2" /> : <MessageSquare className="size-4 mr-2" />}
                      Add Note
                    </Button>
                  </>
                ) : selectedNotification.targetUrl ? (
                  <Button 
                    className="rounded-xl shadow-sm bg-gray-900 hover:bg-gray-800 text-white"
                    onClick={() => {
                      const url = selectedNotification.targetUrl;
                      setSelectedNotification(null);
                      if (url) router.push(url);
                    }}
                  >
                    <ArrowRight className="size-4 mr-2" />
                    {getActionLabel(selectedNotification.type)}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
`;

fs.writeFileSync('components/notifications/NotificationsPanel.tsx', content);
console.log('Successfully applied notifications design');
