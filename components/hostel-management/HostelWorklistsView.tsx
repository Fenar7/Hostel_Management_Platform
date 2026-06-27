"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { MessageSquare, ShieldCheck, FileText, Clock, CreditCard, ClipboardList, RefreshCw } from "lucide-react";
import { rentDueReminder } from "@/lib/whatsapp/templates";
import { buildWaMeLink } from "@/lib/whatsapp/utils";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface RentDueStay {
  id: string;
  status: string;
  joiningDate: string;
  endDate: string;
  daysRemaining: number;
  rentAmount: number;
  tenant: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  bed: {
    id: string;
    label: string;
    roomNumber: string;
  };
}

interface PaymentPendingStay {
  id: string;
  status: string;
  totalPayable: number;
  tenant: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  bed: {
    id: string;
    label: string;
    roomNumber: string;
  };
  pendingPayments: {
    id: string;
    amountPaise: number;
    amount: number;
    transactionRefNo: string | null;
    paymentStatus: string;
  }[];
}

interface ApplicationPendingStay {
  id: string;
  status: string;
  joiningDate: string;
  endDate: string;
  tenant: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  bed: {
    id: string;
    label: string;
    roomNumber: string;
  };
}

interface ServiceRequestPending {
  id: string;
  type: string;
  amount: number;
  metadata: any;
  stay: {
    id: string;
    tenantName: string;
    bedLabel: string;
    roomNumber: string;
  };
  payment: {
    id: string;
    screenshotDocumentId: string | null;
  } | null;
}

type TabKey = "rent" | "payments" | "applications" | "adhoc";

export default function HostelWorklistsView({
  hostelId,
  baseRoute,
}: {
  hostelId: string | null;
  baseRoute: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("rent");
  const [rentFilter, setRentFilter] = useState<3 | 7 | 14>(14);

  const [rentDueStays, setRentDueStays] = useState<RentDueStay[]>([]);
  const [paymentsPending, setPaymentsPending] = useState<PaymentPendingStay[]>([]);
  const [applicationsPending, setApplicationsPending] = useState<ApplicationPendingStay[]>([]);
  const [serviceRequestsPending, setServiceRequestsPending] = useState<ServiceRequestPending[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const query = hostelId ? `?hostelId=${hostelId}` : "";
      const res = await fetch(`/api/warden/worklists${query}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch worklists");
      }
      const data = await res.json();
      setRentDueStays(data.rentDueStays);
      setPaymentsPending(data.paymentsPending);
      setApplicationsPending(data.applicationsPending);
      setServiceRequestsPending(data.serviceRequestsPending || []);
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRentDue = rentDueStays.filter((s) => s.daysRemaining <= rentFilter);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleRentReminder = (stay: RentDueStay) => {
    const dueDateStr = formatDate(stay.endDate);
    const paymentUrl = `${window.location.origin}/tenant`;
    const phone = stay.tenant.phone ?? "";
    const message = rentDueReminder({
      name: stay.tenant.fullName,
      dueDate: dueDateStr,
      amount: stay.rentAmount,
      paymentUrl,
      daysRemaining: stay.daysRemaining,
    });
    window.open(buildWaMeLink(phone, message), "_blank");
  };

  const tabs: { key: TabKey; label: string; count: number; icon: React.ReactNode }[] = [
    { key: "rent", label: "Rent Due Soon", count: rentDueStays.length, icon: <Clock className="size-4" /> },
    { key: "payments", label: "Pending Verification", count: paymentsPending.length, icon: <CreditCard className="size-4" /> },
    { key: "applications", label: "Applications", count: applicationsPending.length, icon: <ClipboardList className="size-4" /> },
    { key: "adhoc", label: "Pending Ad-Hoc Payments", count: serviceRequestsPending.length, icon: <CreditCard className="size-4" /> },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4 bg-white border-b border-[#f0f0f0]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[28px] font-semibold text-[#1a1a1a] tracking-tight">
              Warden Worklists
            </h1>
            <p className="text-[14px] text-[#767676] mt-0.5">
              Action items requiring your attention
            </p>
          </div>
          <button
            onClick={fetchData}
            className="h-[36px] px-3 rounded-md border border-[#e5e7eb] bg-white text-[#4b5563] text-[13px] font-medium flex items-center gap-2 hover:bg-[#f9fafb] transition-colors"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "h-[40px] px-4 rounded-md border text-[13px] font-medium flex items-center gap-2 transition-colors",
                activeTab === tab.key
                  ? "border-[#2563eb] bg-[#2563eb] text-white shadow-sm"
                  : "border-[#e5e7eb] bg-white text-[#4b5563] hover:bg-[#f9fafb]"
              )}
            >
              {tab.icon}
              {tab.label}
              <span
                className={cn(
                  "ml-1 flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-[#f3f4f6] text-[#4b5563]"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6">
        <div className="rounded-[10px] border border-[#e5e7eb] bg-white shadow-sm overflow-hidden">
          
          {/* Rent Due Soon */}
          {activeTab === "rent" && (
            <div className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0f0f0] pb-4">
                <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Rent Due Soon</h2>
                <div className="flex gap-2 bg-[#f3f4f6] p-1 rounded-lg">
                  {([3, 7, 14] as const).map((days) => (
                    <button
                      key={days}
                      onClick={() => setRentFilter(days)}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                        rentFilter === days
                          ? "bg-white text-[#1a1a1a] shadow-sm"
                          : "text-[#6b7280] hover:text-[#1a1a1a]"
                      )}
                    >
                      {days} days ({rentDueStays.filter((s) => s.daysRemaining <= days).length})
                    </button>
                  ))}
                </div>
              </div>

              {filteredRentDue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-12 rounded-full bg-[#f3f4f6] flex items-center justify-center mb-3">
                    <Clock className="size-6 text-[#9ca3af]" />
                  </div>
                  <p className="text-[14px] text-[#6b7280]">No stays due within {rentFilter} days.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredRentDue.map((stay) => (
                    <div
                      key={stay.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[8px] border border-[#f0f0f0] hover:border-[#e5e7eb] transition-colors bg-[#fafafa]/50"
                    >
                      <div>
                        <p className="text-[15px] font-medium text-[#1a1a1a]">{stay.tenant.fullName}</p>
                        <p className="text-[13px] text-[#6b7280] mt-1">
                          Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label} &middot; Rent: ₹{stay.rentAmount.toLocaleString("en-IN")} &middot; Checkout: {formatDate(stay.endDate)}
                        </p>
                        <p
                          className={cn(
                            "text-[12px] font-medium mt-2",
                            stay.daysRemaining <= 3 ? "text-[#ef4444]" : stay.daysRemaining <= 7 ? "text-[#eab308]" : "text-[#4b5563]"
                          )}
                        >
                          {stay.daysRemaining} day{stay.daysRemaining !== 1 ? "s" : ""} remaining
                        </p>
                      </div>
                      <button
                        onClick={() => handleRentReminder(stay)}
                        className="h-[36px] px-4 rounded-md bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-medium flex items-center gap-2 transition-colors shrink-0"
                      >
                        <MessageSquare className="size-4" />
                        Send WhatsApp Reminder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payments Pending Verification */}
          {activeTab === "payments" && (
            <div className="p-6 space-y-5">
              <div className="border-b border-[#f0f0f0] pb-4">
                <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Payments Pending Verification</h2>
              </div>
              
              {paymentsPending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-12 rounded-full bg-[#f3f4f6] flex items-center justify-center mb-3">
                    <CreditCard className="size-6 text-[#9ca3af]" />
                  </div>
                  <p className="text-[14px] text-[#6b7280]">No payments pending verification.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {paymentsPending.map((stay) => (
                    <div
                      key={stay.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[8px] border border-[#f0f0f0] hover:border-[#e5e7eb] transition-colors bg-[#fafafa]/50"
                    >
                      <div>
                        <p className="text-[15px] font-medium text-[#1a1a1a]">{stay.tenant.fullName}</p>
                        <p className="text-[13px] text-[#6b7280] mt-1">
                          Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label}
                        </p>
                        <div className="mt-2 space-y-1">
                          {stay.pendingPayments.map((pmt) => (
                            <p key={pmt.id} className="text-[12px] text-[#4b5563] font-medium">
                              Pending: <span className="text-[#1a1a1a]">₹{pmt.amount.toLocaleString("en-IN")}</span>
                              {pmt.transactionRefNo && (
                                <span className="ml-2 font-mono text-[#6b7280]">Ref: {pmt.transactionRefNo}</span>
                              )}
                            </p>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`${baseRoute}/onboards/${stay.id}`)}
                        className="h-[36px] px-4 rounded-md border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] text-[#1a1a1a] text-[13px] font-medium flex items-center gap-2 transition-colors shrink-0"
                      >
                        <ShieldCheck className="size-4 text-[#2563eb]" />
                        Verify Payment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applications Awaiting Review */}
          {activeTab === "applications" && (
            <div className="p-6 space-y-5">
              <div className="border-b border-[#f0f0f0] pb-4">
                <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Applications Awaiting Review</h2>
              </div>
              
              {applicationsPending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-12 rounded-full bg-[#f3f4f6] flex items-center justify-center mb-3">
                    <ClipboardList className="size-6 text-[#9ca3af]" />
                  </div>
                  <p className="text-[14px] text-[#6b7280]">No applications awaiting review.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {applicationsPending.map((stay) => (
                    <div
                      key={stay.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[8px] border border-[#f0f0f0] hover:border-[#e5e7eb] transition-colors bg-[#fafafa]/50"
                    >
                      <div>
                        <p className="text-[15px] font-medium text-[#1a1a1a]">{stay.tenant.fullName}</p>
                        <p className="text-[13px] text-[#6b7280] mt-1">
                          Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label} &middot; Joining: {formatDate(stay.joiningDate)}
                        </p>
                        {stay.tenant.phone && (
                          <p className="text-[13px] text-[#6b7280] mt-0.5">Phone: {stay.tenant.phone}</p>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`${baseRoute}/onboards/${stay.id}`)}
                        className="h-[36px] px-4 rounded-md border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] text-[#1a1a1a] text-[13px] font-medium flex items-center gap-2 transition-colors shrink-0"
                      >
                        <FileText className="size-4 text-[#2563eb]" />
                        Review Application
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Ad-Hoc Payments */}
          {activeTab === "adhoc" && (
            <div className="p-6 space-y-5">
              <div className="border-b border-[#f0f0f0] pb-4">
                <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Pending Ad-Hoc Payments</h2>
              </div>
              
              {serviceRequestsPending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-12 rounded-full bg-[#f3f4f6] flex items-center justify-center mb-3">
                    <CreditCard className="size-6 text-[#9ca3af]" />
                  </div>
                  <p className="text-[14px] text-[#6b7280]">No ad-hoc payments pending verification.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {serviceRequestsPending.map((sr) => (
                    <div
                      key={sr.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[8px] border border-[#f0f0f0] hover:border-[#e5e7eb] transition-colors bg-[#fafafa]/50"
                    >
                      <div>
                        <p className="text-[15px] font-medium text-[#1a1a1a]">{sr.stay.tenantName}</p>
                        <p className="text-[13px] text-[#6b7280] mt-1">
                          Room {sr.stay.roomNumber} &middot; Bed {sr.stay.bedLabel}
                        </p>
                        <p className="text-[13px] text-[#1a1a1a] font-medium mt-1.5">
                          Type: <span className="capitalize">{sr.type.replace(/_/g, " ").toLowerCase()}</span> &middot; Amount: ₹{sr.amount.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`${baseRoute}/service-requests/${sr.id}`)}
                        className="h-[36px] px-4 rounded-md border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] text-[#1a1a1a] text-[13px] font-medium flex items-center gap-2 transition-colors shrink-0"
                      >
                        <ShieldCheck className="size-4 text-[#2563eb]" />
                        Verify Ad-Hoc
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
