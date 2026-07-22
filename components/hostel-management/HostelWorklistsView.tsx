"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  MessageSquare,
  ShieldCheck,
  FileText,
  Clock,
  CreditCard,
  ClipboardList,
  RefreshCw,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle,
  Filter,
} from "lucide-react";
import { rentDueReminder } from "@/lib/whatsapp/templates";
import { buildWaMeLink } from "@/lib/whatsapp/utils";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { cn } from "@/lib/utils";
import { HostelWorkspaceLayout } from "./HostelWorkspaceLayout";
import {
  PaymentDetailModal,
  EnrichedPaymentHistoryItem,
} from "./worklists/PaymentDetailModal";

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

type TabKey = "rent" | "payments" | "applications" | "adhoc" | "payment_history";

export default function HostelWorklistsView({
  hostelId,
  hostelName,
  baseRoute,
}: {
  hostelId: string | null;
  hostelName?: string;
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

  // Payment History State
  const [historyPayments, setHistoryPayments] = useState<EnrichedPaymentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyModeFilter, setHistoryModeFilter] = useState("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 15,
  });
  const [historyMetrics, setHistoryMetrics] = useState({
    totalPaidAmount: 0,
    upiCount: 0,
    cashCount: 0,
    otherCount: 0,
  });
  const [selectedPayment, setSelectedPayment] = useState<EnrichedPaymentHistoryItem | null>(null);

  const fetchData = useCallback(async () => {
    if (!hostelId) {
      setLoading(false);
      setRentDueStays([]);
      setPaymentsPending([]);
      setApplicationsPending([]);
      setServiceRequestsPending([]);
      return;
    }
    try {
      setLoading(true);
      const query = `?hostelId=${hostelId}`;
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

  const fetchPaymentHistory = useCallback(async () => {
    if (!hostelId) return;
    try {
      setHistoryLoading(true);
      const params = new URLSearchParams({
        hostelId,
        page: String(historyPage),
        limit: "15",
      });
      if (historySearch) params.set("search", historySearch);
      if (historyModeFilter !== "ALL") params.set("paymentMode", historyModeFilter);

      const res = await fetch(`/api/warden/worklists/history?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch payment history");
      }
      const data = await res.json();
      setHistoryPayments(data.payments || []);
      setHistoryPagination(data.pagination || { totalCount: 0, totalPages: 1, currentPage: 1, limit: 15 });
      setHistoryMetrics(data.metrics || { totalPaidAmount: 0, upiCount: 0, cashCount: 0, otherCount: 0 });
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "Error loading payment history");
    } finally {
      setHistoryLoading(false);
    }
  }, [hostelId, historyPage, historySearch, historyModeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "payment_history") {
      fetchPaymentHistory();
    }
  }, [activeTab, fetchPaymentHistory]);

  const filteredRentDue = rentDueStays.filter((s) => s.daysRemaining <= rentFilter);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
    { key: "payment_history", label: "Payment History", count: historyPagination.totalCount, icon: <FileText className="size-4" /> },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!hostelId) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-3xl font-bold tracking-tight">Worklists</h1>
        <p className="text-muted-foreground">No hostel selected.</p>
      </div>
    );
  }

  const Actions = (
    <button
      onClick={() => {
        fetchData();
        if (activeTab === "payment_history") fetchPaymentHistory();
      }}
      className="flex items-center justify-center h-10 px-5 border border-[#dedede] rounded-[6px] bg-white text-black text-[15px] font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
    >
      <RefreshCw className="mr-2 size-4 text-[#5c5c5c]" />
      Refresh
    </button>
  );

  return (
    <HostelWorkspaceLayout
      hostelId={hostelId || ""}
      hostelName={hostelName}
      title="Worklists"
      subtitle="Action items requiring your attention"
      actions={Actions}
      hideAdminNav={baseRoute === "/warden"}
    >
      <div className="w-full">
        {/* ── Tabs ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center justify-center h-10 px-4 rounded-[6px] text-[14px] font-semibold transition-colors whitespace-nowrap border",
                activeTab === tab.key
                  ? "bg-[#282828] text-[#58ff48] border-[#282828] hover:bg-black"
                  : "bg-white text-black border-[#dedede] hover:bg-gray-50"
              )}
            >
              <span className="mr-2 text-current opacity-80">{tab.icon}</span>
              {tab.label}
              <span
                className={cn(
                  "ml-2 flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                  activeTab === tab.key
                    ? "bg-[#58ff48]/20 text-[#58ff48]"
                    : "bg-[#f2f2f2] text-[#767676]"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="rounded-[7px] border border-[#dedede] bg-white p-5 w-full">
          {/* Rent Due Soon */}
          {activeTab === "rent" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f2f2f2] pb-4">
                <h3 className="text-[16px] font-semibold text-black">Rent Due Soon</h3>
                <div className="flex items-center gap-1 bg-[#f2f2f2] p-1 rounded-[6px] self-start sm:self-auto">
                  {([3, 7, 14] as const).map((days) => (
                    <button
                      key={days}
                      onClick={() => setRentFilter(days)}
                      className={cn(
                        "px-3 py-1 text-[12px] font-semibold rounded-[4px] transition-colors",
                        rentFilter === days
                          ? "bg-white text-black shadow-sm"
                          : "text-[#767676] hover:text-black"
                      )}
                    >
                      {days} days ({rentDueStays.filter((s) => s.daysRemaining <= days).length})
                    </button>
                  ))}
                </div>
              </div>

              {filteredRentDue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-12 rounded-full bg-[#f2f2f2] flex items-center justify-center mb-3">
                    <Clock className="size-6 text-[#a1a1a1]" />
                  </div>
                  <p className="text-[14px] text-[#767676] font-medium">
                    No stays due within {rentFilter} days.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRentDue.map((stay) => (
                    <div
                      key={stay.id}
                      className="flex flex-col justify-between gap-4 p-4 rounded-[6px] border border-[#dedede] bg-white hover:border-[#a1a1a1] transition-colors"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[15px] font-semibold text-black leading-snug">
                              {stay.tenant.fullName}
                            </p>
                            <p className="text-[12px] text-[#767676] mt-0.5 leading-snug">
                              Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-0.5 text-[11px] font-bold rounded-full border whitespace-nowrap",
                              stay.daysRemaining <= 3
                                ? "bg-red-50 text-red-700 border-red-200"
                                : stay.daysRemaining <= 7
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            )}
                          >
                            {stay.daysRemaining === 0
                              ? "Due Today"
                              : `${stay.daysRemaining}d left`}
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#f2f2f2] flex items-center justify-between text-[13px]">
                          <span className="text-[#767676]">Rent Amount:</span>
                          <span className="font-bold text-black">
                            ₹{stay.rentAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRentReminder(stay)}
                          className="flex-1 h-[36px] rounded-[5px] border border-[#dedede] bg-white hover:bg-gray-50 text-black text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MessageSquare className="size-4 text-[#25D366]" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => router.push(`${baseRoute}/stays/${stay.id}`)}
                          className="px-3 h-[36px] rounded-[5px] bg-black text-white text-[13px] font-semibold hover:bg-gray-800 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Verification */}
          {activeTab === "payments" && (
            <div className="space-y-5">
              <div className="border-b border-[#f2f2f2] pb-4">
                <h3 className="text-[16px] font-semibold text-black">
                  Pending Verification
                </h3>
              </div>

              {paymentsPending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-12 rounded-full bg-[#f2f2f2] flex items-center justify-center mb-3">
                    <CreditCard className="size-6 text-[#a1a1a1]" />
                  </div>
                  <p className="text-[14px] text-[#767676] font-medium">
                    No pending payment verifications.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paymentsPending.map((stay) => (
                    <div
                      key={stay.id}
                      className="flex flex-col justify-between gap-4 p-4 rounded-[6px] border border-[#dedede] bg-white hover:border-[#a1a1a1] transition-colors"
                    >
                      <div>
                        <p className="text-[15px] font-semibold text-black leading-snug">
                          {stay.tenant.fullName}
                        </p>
                        <p className="text-[12px] text-[#767676] mt-0.5 leading-snug">
                          Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label}
                        </p>
                        <div className="mt-3 pt-3 border-t border-[#f2f2f2] flex items-center justify-between text-[13px]">
                          <span className="text-[#767676]">Amount Payable:</span>
                          <span className="font-bold text-black">
                            ₹{stay.totalPayable.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`${baseRoute}/onboards/${stay.id}`)}
                        className="w-full h-[36px] rounded-[5px] border border-[#dedede] bg-white hover:bg-gray-50 text-black text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <ShieldCheck className="size-4 text-[#5c5c5c]" />
                        Verify Payment
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applications */}
          {activeTab === "applications" && (
            <div className="space-y-5">
              <div className="border-b border-[#f2f2f2] pb-4">
                <h3 className="text-[16px] font-semibold text-black">Pending Applications</h3>
              </div>

              {applicationsPending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-12 rounded-full bg-[#f2f2f2] flex items-center justify-center mb-3">
                    <ClipboardList className="size-6 text-[#a1a1a1]" />
                  </div>
                  <p className="text-[14px] text-[#767676] font-medium">
                    No onboarding applications pending review.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {applicationsPending.map((stay) => (
                    <div
                      key={stay.id}
                      className="flex flex-col justify-between gap-4 p-4 rounded-[6px] border border-[#dedede] bg-white hover:border-[#a1a1a1] transition-colors"
                    >
                      <div>
                        <p className="text-[15px] font-semibold text-black leading-snug">
                          {stay.tenant.fullName}
                        </p>
                        <p className="text-[12px] text-[#767676] mt-0.5 leading-snug">
                          Room {stay.bed.roomNumber} &middot; Bed {stay.bed.label}
                        </p>
                        <div className="mt-3 pt-3 border-t border-[#f2f2f2] flex items-center justify-between text-[13px]">
                          <span className="text-[#767676]">Joining Date:</span>
                          <span className="font-semibold text-black">
                            {formatDate(stay.joiningDate)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`${baseRoute}/onboards/${stay.id}`)}
                        className="w-full h-[36px] rounded-[5px] border border-[#dedede] bg-white hover:bg-gray-50 text-black text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <FileText className="size-4 text-[#5c5c5c]" />
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
            <div className="space-y-5">
              <div className="border-b border-[#f2f2f2] pb-4">
                <h3 className="text-[16px] font-semibold text-black">
                  Pending Ad-Hoc Payments
                </h3>
              </div>

              {serviceRequestsPending.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-12 rounded-full bg-[#f2f2f2] flex items-center justify-center mb-3">
                    <CreditCard className="size-6 text-[#a1a1a1]" />
                  </div>
                  <p className="text-[14px] text-[#767676] font-medium">
                    No ad-hoc payments pending verification.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceRequestsPending.map((sr) => (
                    <div
                      key={sr.id}
                      className="flex flex-col justify-between gap-4 p-4 rounded-[6px] border border-[#dedede] bg-white hover:border-[#a1a1a1] transition-colors"
                    >
                      <div>
                        <p className="text-[15px] font-semibold text-black leading-snug">
                          {sr.stay.tenantName}
                        </p>
                        <p className="text-[12px] text-[#767676] mt-1 leading-snug">
                          Room {sr.stay.roomNumber} &middot; Bed {sr.stay.bedLabel}
                        </p>
                        <p className="text-[13px] font-medium text-black mt-2">
                          Type:{" "}
                          <span className="capitalize font-normal text-[#767676]">
                            {sr.type.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </p>
                        <p className="text-[13px] font-bold text-black mt-0.5">
                          Amount: ₹{sr.amount.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`${baseRoute}/service-requests/${sr.id}`)}
                        className="w-full h-[36px] rounded-[5px] border border-[#dedede] bg-white hover:bg-gray-50 text-black text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <ShieldCheck className="size-4 text-[#5c5c5c]" />
                        Verify Ad-Hoc
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── NEW: Payment History Tab ── */}
          {activeTab === "payment_history" && (
            <div className="space-y-6">
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-900 to-black text-white shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-semibold uppercase tracking-wider">
                    <span>Total Settled Revenue</span>
                    <TrendingUp className="size-4 text-[#58ff48]" />
                  </div>
                  <p className="text-2xl font-extrabold text-[#58ff48] mt-1">
                    ₹{historyMetrics.totalPaidAmount.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Across {historyPagination.totalCount} verified payments
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    <span>Verified Transactions</span>
                    <CheckCircle className="size-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {historyPagination.totalCount}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Settled in hostel ledger</p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    <span>Payment Mode Ratio</span>
                    <CreditCard className="size-4 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                      UPI: {historyMetrics.upiCount}
                    </span>
                    <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md">
                      Cash: {historyMetrics.cashCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filters & Search Control */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 size-4 text-gray-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setHistoryPage(1);
                    }}
                    placeholder="Search tenant, room #, UTR..."
                    className="w-full h-9 pl-9 pr-4 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Filter className="size-3.5" />
                    <span>Mode:</span>
                  </div>
                  <select
                    value={historyModeFilter}
                    onChange={(e) => {
                      setHistoryModeFilter(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="h-9 px-3 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="ALL">All Modes</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Table / List View */}
              {historyLoading ? (
                <div className="py-12 text-center text-sm text-gray-500 font-medium">
                  Loading payment history records...
                </div>
              ) : historyPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                  <FileText className="size-8 text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No payment history found</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Try clearing search or changing filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100/80 text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Receipt #</th>
                        <th className="px-4 py-3">Tenant & Room</th>
                        <th className="px-4 py-3">Date & Time</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Txn UTR / Ref</th>
                        <th className="px-4 py-3">Verified By</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {historyPayments.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPayment(p)}
                          className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs font-bold text-black whitespace-nowrap">
                            #RCP-{String(p.receiptNumber).padStart(5, "0")}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{p.tenant.fullName}</p>
                            <p className="text-xs text-gray-500">
                              Rm {p.bed.roomNumber} &middot; Bed {p.bed.label}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                            {formatDateTime(p.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-extrabold text-emerald-700 whitespace-nowrap">
                            ₹{p.amount.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                              {p.paymentMode}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[120px] truncate">
                            {p.transactionRefNo || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                            {p.verifiedByUser ? p.verifiedByUser.fullName : "System"}
                          </td>
                          <td
                            className="px-4 py-3 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a
                              href={`/api/pdf/receipt/${p.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-black bg-[#58ff48] hover:bg-[#48ee38] border border-[#38dd28] rounded-md transition-colors"
                            >
                              <Download className="mr-1 size-3" />
                              PDF
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {historyPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-500">
                    Page <span className="font-bold text-gray-900">{historyPagination.currentPage}</span> of{" "}
                    <span className="font-bold text-gray-900">{historyPagination.totalPages}</span> (
                    {historyPagination.totalCount} items)
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                      className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      disabled={historyPage >= historyPagination.totalPages}
                      onClick={() => setHistoryPage((prev) => prev + 1)}
                      className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Detail Modal Drawer */}
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      </div>
    </HostelWorkspaceLayout>
  );
}
