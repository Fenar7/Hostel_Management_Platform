"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, XCircle, Key, Copy, Check, Eye } from "lucide-react";

interface OnboardItem {
  id: string;
  status: string;
  joiningDate: string;
  endDate: string;
  totalPayable: number;
  hostel: { id: string; name: string };
  tenant: {
    id: string;
    fullName: string;
    phone: string;
    gender: string;
    hasProfile: boolean;
  };
  bed: {
    id: string;
    label: string;
    roomNumber: string;
    status: string;
  };
  onboardingRequest: { id: string; status: string; createdAt: string } | null;
}

export default function AdminOnboardsPage() {
  const [onboards, setOnboards] = useState<OnboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Password modal
  const [passwordModal, setPasswordModal] = useState<{
    onboardingReqId: string;
    phone: string;
  } | null>(null);
  const [revealedPassword, setRevealedPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const fetchOnboards = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/onboards");
      if (!response.ok) throw new Error("Failed to fetch onboarding list");
      const data = await response.json();
      setOnboards(data.onboards);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnboards();
  }, [fetchOnboards]);

  const handleCancel = async (stayId: string, hostelId: string) => {
    if (!confirm("Cancel this onboarding request? The bed will be freed back to AVAILABLE.")) return;

    setCancelling(stayId);
    setError("");

    try {
      const response = await fetch(`/api/admin/onboards/${stayId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostelId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to cancel");
      }

      fetchOnboards();
    } catch (err: any) {
      setError(err.message || "Failed to cancel onboarding request");
    } finally {
      setCancelling(null);
    }
  };

  const handleViewPassword = async (onboardingReqId: string, phone: string) => {
    setPasswordModal({ onboardingReqId, phone });
    setRevealedPassword("");
    setPasswordCopied(false);
    setPasswordError("");
    setPasswordLoading(true);
    try {
      const res = await fetch(
        `/api/warden/onboarding-requests/${onboardingReqId}/regenerate-password`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get password");
      setRevealedPassword(data.tempPassword);
    } catch (err: any) {
      setPasswordError(err.message || "An error occurred");
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });

  const awaitingTenant = onboards.filter(
    (item) => item.status === "ONBOARDING_PENDING" && !item.tenant.hasProfile
  );
  const awaitingReview = onboards.filter(
    (item) => item.status === "ONBOARDING_PENDING" && item.tenant.hasProfile
  );
  const awaitingPayment = onboards.filter(
    (item) => item.status === "APPROVED_AWAITING_PAYMENT"
  );
  const activeStays = onboards.filter(
    (item) => item.status === "ACTIVE" || item.status === "EXTENDED"
  );

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding Requests</h1>
          <p className="text-muted-foreground">Manage all onboarding requests across all hostels</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Awaiting Tenant Form */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          ⏳ Link Sent, Awaiting Form
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{awaitingTenant.length}</span>
        </h2>
        {awaitingTenant.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            All sent onboarding links have been acted upon.
          </div>
        ) : (
          <div className="border rounded-lg bg-card divide-y overflow-hidden shadow-sm">
            {awaitingTenant.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-bold text-foreground">
                    {item.hostel.name} — {item.tenant.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bed: {item.bed.roomNumber}-{item.bed.label}
                    {item.bed.status === "ON_HOLD" && (
                      <span className="ml-2 text-amber-600 font-medium">(ON HOLD)</span>
                    )}
                    &middot; Sent: {item.onboardingRequest ? formatDate(item.onboardingRequest.createdAt) : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleViewPassword(
                        item.onboardingRequest?.id || "",
                        item.tenant.phone
                      )
                    }
                    disabled={!item.onboardingRequest?.id}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                  >
                    <Key className="h-4 w-4 mr-1" />
                    Password
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={cancelling === item.id}
                    onClick={() => handleCancel(item.id, item.hostel.id)}
                  >
                    {cancelling === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    Cancel & Free Bed
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Awaiting Review */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          📋 Awaiting Review
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{awaitingReview.length}</span>
        </h2>
        {awaitingReview.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No forms awaiting review.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {awaitingReview.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{item.tenant.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{item.tenant.phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.hostel.name}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                    Awaiting Review
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t pt-4">
                  <div>
                    <span className="text-muted-foreground block">Assigned Bed</span>
                    <span className="font-semibold">{item.bed.roomNumber}-{item.bed.label}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Stay</span>
                    <span className="font-semibold">{formatDate(item.joiningDate)} to {formatDate(item.endDate)}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/warden/onboards/${item.id}`}>
                    <Button size="sm" variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-1.5" />
                      Review Application
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Awaiting Payment */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          💳 Awaiting Payment
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">{awaitingPayment.length}</span>
        </h2>
        {awaitingPayment.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No approved applications awaiting payments.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {awaitingPayment.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{item.tenant.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{item.tenant.phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.hostel.name}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                    Awaiting Payment
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t pt-4">
                  <div>
                    <span className="text-muted-foreground block">Total Due</span>
                    <span className="font-semibold text-sm">₹{item.totalPayable.toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Bed</span>
                    <span className="font-semibold">{item.bed.roomNumber}-{item.bed.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Stays */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          ✅ Active Stays
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">{activeStays.length}</span>
        </h2>
        {activeStays.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No active stays.
          </div>
        ) : (
          <div className="border rounded-lg bg-card divide-y overflow-hidden shadow-sm">
            {activeStays.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-semibold text-foreground">{item.tenant.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.hostel.name} &middot; {item.bed.roomNumber}-{item.bed.label}
                    &middot; {formatDate(item.joiningDate)} to {formatDate(item.endDate)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                  Active
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Reveal Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-sm w-full rounded-lg border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Key className="h-4 w-4 text-amber-500" />
                Access Password
              </h3>
              <button
                onClick={() => { setPasswordModal(null); setRevealedPassword(""); }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Phone: {passwordModal.phone}
              </p>

              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 dark:bg-red-900/20 dark:text-red-200">
                  {passwordError}
                </div>
              )}

              {passwordLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : revealedPassword ? (
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/30 p-4 text-center">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                      One-time Password
                    </p>
                    <p className="text-2xl font-bold font-mono tracking-wider text-amber-900 dark:text-amber-200 select-all">
                      {revealedPassword}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A new password was generated. The old one is no longer valid.
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(revealedPassword);
                        setPasswordCopied(true);
                        setTimeout(() => setPasswordCopied(false), 3000);
                      } catch {
                        const el = document.createElement("textarea");
                        el.value = revealedPassword;
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand("copy");
                        document.body.removeChild(el);
                        setPasswordCopied(true);
                        setTimeout(() => setPasswordCopied(false), 3000);
                      }
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    {passwordCopied ? (
                      <><Check className="h-4 w-4 mr-2" /> Copied!</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" /> Copy Password</>
                    )}
                  </Button>
                </>
              ) : null}
            </div>
            {revealedPassword && (
              <div className="flex justify-end border-t px-5 py-3">
                <Button
                  onClick={() => { setPasswordModal(null); setRevealedPassword(""); }}
                  size="sm"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
