"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Building2, BedSingle, AlertCircle, Upload,
  UtensilsCrossed, CreditCard, Download, X, User, Users,
  Utensils, Bell, ChevronRight, Calendar, Clock,
  ArrowUpRight, Home, LayoutGrid
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { DashboardSkeleton } from "@/components/shared/DashboardSkeleton";
import { InitialPaymentForm } from "@/components/tenant/InitialPaymentForm";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TenantDetails { fullName: string; photoUrl: string | null; }
interface PaymentItem {
  id: string; amountPaid: number; paymentMode: string;
  transactionRefNo: string | null; notes?: string | null;
  paymentStatus: string; createdAt: string;
}
interface StayDetails {
  id: string; status: string; durationType: string;
  joiningDate: string; endDate: string; admissionFee: number;
  monthlyRent: number; securityDeposit: number; foodCharges: number;
  foodPlan: string; totalPayable: number; discount: number;
}
interface HostelDetails { id: string; name: string; address: string; }
interface BedDetails { id: string; label: string; roomNumber: string; sharingType: string; }
interface RoommateDetails {
  fullName: string; photoUrl: string | null; occupationType: string;
  collegeName: string | null; companyName: string | null;
  designation: string | null; bedLabel: string;
}
interface ServiceRequestItem {
  id: string; type: string; amount: number; status: string;
  createdAt: string; metadata?: any;
}
interface ApiResponse {
  tenant: TenantDetails | null; stay: StayDetails | null;
  hostel: HostelDetails | null; bed: BedDetails | null;
  payments: PaymentItem[]; roommates: RoommateDetails[];
  nextDueDate: string | null; pendingServiceRequests?: ServiceRequestItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}
function formatCurrency(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}
function daysLeft(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
}
function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}
function greetingTime() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TenantDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [stay, setStay] = useState<StayDetails | null>(null);
  const [hostel, setHostel] = useState<HostelDetails | null>(null);
  const [bed, setBed] = useState<BedDetails | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [roommates, setRoommates] = useState<RoommateDetails[]>([]);
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);
  const [pendingServiceRequests, setPendingServiceRequests] = useState<ServiceRequestItem[]>([]);
  const [paymentConfig, setHostelPaymentConfig] = useState<import("@prisma/client").HostelPaymentConfig | null>(null);
  const [homeNotifications, setHomeNotifications] = useState<any[]>([]);
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploadRef, setUploadRef] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  const fetchStayDetails = async () => {
    try {
      const res = await fetch("/api/tenant/stay");
      if (!res.ok) throw new Error("Failed to load");
      const data: ApiResponse = await res.json();
      setTenant(data.tenant || null);
      setStay(data.stay);
      setHostel(data.hostel);
      setBed(data.bed);
      setPayments(data.payments || []);
      setRoommates(data.roommates || []);
      setNextDueDate(data.nextDueDate || null);
      setPendingServiceRequests(data.pendingServiceRequests || []);
      if (data.hostel?.id) {
        try {
          const pr = await fetch(`/api/public/hostels/${data.hostel.id}/payment-config`);
          if (pr.ok) setHostelPaymentConfig(await pr.json());
        } catch {}
      }
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Error loading");
    } finally { setLoading(false); }
  };

  const fetchNotifs = async () => {
    try {
      const r = await fetch("/api/tenant/notifications");
      if (r.ok) {
        const j = await r.json();
        setHomeNotifications((j.notifications || []).filter((n: any) => !n.read && !n.dismissedFromHome));
      }
    } catch {}
  };

  const dismissNotif = async (id: string) => {
    setHomeNotifications(p => p.filter(n => n.id !== id));
    try { await fetch(`/api/tenant/notifications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dismissedFromHome: true }) }); } catch {}
  };

  useEffect(() => { fetchStayDetails(); fetchNotifs(); }, []);

  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stay) return;
    setUploading(true);
    try {
      const paise = Math.round(parseFloat(uploadAmount) * 100);
      if (isNaN(paise) || paise <= 0) throw new Error("Enter a valid amount.");
      const r = await fetch("/api/tenant/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stayId: stay.id, amountPaidPaise: paise, paymentMode: "UPI", transactionRefNo: uploadRef.trim() || null }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed"); }
      notify.success("Payment submitted for verification");
      setUploadAmount(""); setUploadRef("");
      fetchStayDetails();
    } catch (err) { notify.error(err instanceof Error ? err.message : "Error"); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><DashboardSkeleton /></div>;

  // ─── Computed ─────────────────────────────────────────────────────────────

  const verifiedPaid = payments.filter(p => p.paymentStatus === "PAID" || p.paymentStatus === "PARTIALLY_PAID").reduce((s, p) => s + p.amountPaid, 0);
  const remaining = stay ? stay.totalPayable - verifiedPaid : 0;
  const progress = stay?.totalPayable ? Math.min(100, Math.round((verifiedPaid / stay.totalPayable) * 100)) : 0;
  const pendingReqs = pendingServiceRequests.filter(r => r.status === "PENDING_PAYMENT");
  const revokedReqs = pendingServiceRequests.filter(r => r.status === "REVOKED");
  const dl = stay ? daysLeft(stay.endDate) : null;
  const due = nextDueDate ? daysUntil(nextDueDate) : null;
  const firstName = tenant?.fullName?.split(" ")[0] || "Tenant";

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (!stay) return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full space-y-4" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
        <div className="w-16 h-16 bg-[#f5f5f5] rounded-2xl mx-auto flex items-center justify-center text-2xl">🏠</div>
        <h2 className="text-[18px] font-bold text-[#111111]">No Active Stay</h2>
        <p className="text-[13px] text-[#767676] leading-relaxed">No stay found for your account. Contact your warden.</p>
      </div>
    </div>
  );

  if (stay.status === "ONBOARDING_PENDING") return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full space-y-4" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
        <div className="w-14 h-14 bg-amber-50 rounded-2xl mx-auto flex items-center justify-center"><Clock className="w-7 h-7 text-amber-500" /></div>
        <h2 className="text-[18px] font-bold text-[#111111]">Under Review</h2>
        <p className="text-[13px] text-[#767676] leading-relaxed">Your documents are submitted. Warden is verifying them.</p>
        <div className="bg-[#f5f5f5] rounded-2xl px-4 py-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#767676]" />
          <span className="text-[13px] font-semibold text-[#222222]">{hostel?.name}</span>
          <span className="text-[#dedede]">·</span>
          <span className="text-[13px] text-[#767676]">Bed {bed?.roomNumber}-{bed?.label}</span>
        </div>
      </div>
    </div>
  );

  if (stay.status === "APPROVED_AWAITING_PAYMENT") return (
    <div className="p-4 md:p-6">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><InitialPaymentForm hostel={hostel} paymentConfig={paymentConfig} remainingBalance={remaining} onSuccess={(m) => { notify.success(m); fetchStayDetails(); }} onError={(m) => notify.error(m)} /></div>
        <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-4 border-b border-[#f0f0f0]"><p className="text-[11px] font-bold uppercase tracking-widest text-[#767676]">Stay Summary</p></div>
          {[["Hostel", hostel?.name], ["Bed", `${bed?.roomNumber} - ${bed?.label}`], ["Admission Fee", formatCurrency(stay.admissionFee)], ["Rent", formatCurrency(stay.monthlyRent)], ["Security", formatCurrency(stay.securityDeposit)]].map(([l, v]) => (
            <div key={l} className="flex justify-between items-center px-5 py-3 border-b border-[#f5f5f5]">
              <span className="text-[13px] text-[#767676]">{l}</span>
              <span className="text-[13px] font-semibold text-[#222222]">{v}</span>
            </div>
          ))}
          <div className="flex justify-between items-center px-5 py-4 bg-[#f5f5f5]">
            <span className="text-[14px] font-bold text-[#222222]">Total Due</span>
            <span className="text-[18px] font-bold text-[#222222]">{formatCurrency(stay.totalPayable)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Full Dashboard ───────────────────────────────────────────────────────

  const tabs = [
    { id: "home", icon: LayoutGrid, label: "Home" },
    { id: "payments", icon: CreditCard, label: "Payments" },
    { id: "food", icon: Utensils, label: "Food" },
    { id: "mates", icon: Users, label: "Mates" },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: "#f0f0f0" }}>

      {/* ── Alert banners ── */}
      {(pendingReqs.length > 0 || revokedReqs.length > 0 || homeNotifications.length > 0) && (
        <div className="px-4 pt-4 space-y-2.5">
          {pendingReqs.map(req => (
            <div key={req.id} className="flex items-center justify-between gap-3 bg-white rounded-2xl px-4 py-3 border-l-4 border-orange-400" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                <p className="text-[12px] font-semibold text-[#222222] truncate">Payment pending · <strong>₹{req.amount}</strong></p>
              </div>
              <Link href={`/tenant/service-requests/${req.id}`} className="text-[11px] font-bold text-orange-600 flex items-center gap-1 shrink-0">Pay <ArrowUpRight className="w-3 h-3" /></Link>
            </div>
          ))}
          {revokedReqs.map(req => (
            <div key={req.id} className="flex items-center gap-2.5 bg-white rounded-2xl px-4 py-3 border-l-4 border-red-400" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-[12px] font-medium text-[#222222]">Food plan revoked · Refund of <strong>₹{req.amount}</strong> processed.</p>
            </div>
          ))}
          {homeNotifications.map(n => (
            <div key={n.id} className="flex items-start justify-between gap-3 bg-white rounded-2xl px-4 py-3" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#222222]">{n.title}</p>
                <p className="text-[11px] text-[#767676] truncate mt-0.5">{n.message}</p>
              </div>
              <button onClick={() => dismissNotif(n.id)} className="text-[#767676] shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {/* ── HOME TAB ── */}
      {activeTab === "home" && (
        <div>
          {/* Greeting Header */}
          <div className="px-4 pt-5 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar circle */}
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-bold"
                style={{ background: "#222222", color: "#58ff48" }}
              >
                {tenant?.fullName ? getInitials(tenant.fullName) : <User className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-[12px] text-[#767676] font-medium leading-none">{greetingTime()},</p>
                <p className="text-[19px] font-extrabold text-[#111111] leading-tight mt-0.5">{firstName} 👋</p>
              </div>
            </div>
            <Link href="/tenant/notifications">
              <div className="w-10 h-10 rounded-full bg-white border border-[#e8e8e8] flex items-center justify-center relative" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                <Bell className="w-4.5 h-4.5 text-[#222222]" style={{ width: 18, height: 18 }} />
                {homeNotifications.length > 0 && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#58ff48]" />}
              </div>
            </Link>
          </div>

          {/* Sub-label: hostel + bed */}
          <div className="px-4 pb-4">
            <p className="text-[12px] text-[#767676] font-medium flex items-center gap-1.5">
              <Building2 style={{ width: 11, height: 11 }} />
              {hostel?.name}
              <span className="text-[#dedede]">·</span>
              <BedSingle style={{ width: 11, height: 11 }} />
              Bed {bed?.roomNumber}–{bed?.label}
            </p>
          </div>

          {/* ── Dark Hero Card (Fintech balance card) ── */}
          <div className="px-4">
            <div
              className="relative overflow-hidden rounded-3xl px-6 py-6"
              style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)" }}
            >
              {/* Decorative circles */}
              <div className="absolute" style={{ top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(88,255,72,0.07)", pointerEvents: "none" }} />
              <div className="absolute" style={{ top: 30, right: 10, width: 70, height: 70, borderRadius: "50%", background: "rgba(88,255,72,0.04)", pointerEvents: "none" }} />
              <div className="absolute" style={{ bottom: -20, left: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.02)", pointerEvents: "none" }} />

              {/* Top: label + status */}
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#767676" }}>Monthly Rent</p>
                  <p className="text-[44px] font-extrabold leading-none mt-1.5 text-white" style={{ letterSpacing: "-2px" }}>
                    ₹{stay.monthlyRent.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] mt-1.5 font-medium" style={{ color: "#767676" }}>{stay.durationType}</p>
                </div>
                {/* Active pill */}
                <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border" style={{ background: "rgba(88,255,72,0.12)", borderColor: "rgba(88,255,72,0.25)" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#58ff48" }} />
                  <span className="text-[11px] font-bold" style={{ color: "#58ff48" }}>Active</span>
                </div>
              </div>

              {/* Divider */}
              <div className="my-5 relative z-10" style={{ height: 1, background: "rgba(255,255,255,0.07)" }} />

              {/* Stats row */}
              <div className="flex items-center gap-0 relative z-10 -mx-1">
                <div className="flex-1 px-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#767676" }}>Stay ends</p>
                  <p className="text-[14px] font-bold text-white mt-0.5">{formatDateShort(stay.endDate)}</p>
                </div>
                <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.08)" }} />
                <div className="flex-1 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#767676" }}>Days left</p>
                  <p className={`text-[14px] font-bold mt-0.5 ${dl !== null && dl <= 30 ? "text-orange-400" : "text-white"}`}>
                    {dl !== null ? `${dl}d` : "—"}
                  </p>
                </div>
                <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.08)" }} />
                <div className="flex-1 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#767676" }}>Next due</p>
                  <p className={`text-[14px] font-bold mt-0.5 ${due !== null && due <= 7 ? "text-red-400" : "text-white"}`}>
                    {nextDueDate ? formatDateShort(nextDueDate) : "—"}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-5 relative z-10">
                <div className="flex justify-between mb-2">
                  <span className="text-[11px] font-medium" style={{ color: "#767676" }}>Payment collected</span>
                  <span className="text-[11px] font-bold" style={{ color: "#58ff48" }}>{progress}%</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 5, background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: "#58ff48" }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px]" style={{ color: "#555" }}>{formatCurrency(verifiedPaid)} paid</span>
                  <span className="text-[10px]" style={{ color: "#555" }}>{formatCurrency(stay.totalPayable)} total</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="px-4 mt-5">
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: CreditCard, label: "Pay Rent", onClick: () => setActiveTab("payments"), color: "#222222" },
                { icon: Utensils, label: "Food", onClick: () => setActiveTab("food"), color: "#222222" },
                { icon: Users, label: "Mates", onClick: () => setActiveTab("mates"), color: "#222222" },
                { icon: Bell, label: "Alerts", onClick: () => {}, link: "/tenant/notifications", color: "#222222" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={action.link ? undefined : action.onClick}
                  className="flex flex-col items-center gap-2"
                >
                  {action.link ? (
                    <Link href={action.link} className="flex flex-col items-center gap-2 w-full">
                      <div className="w-full aspect-square rounded-2xl bg-white flex items-center justify-center" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                        <action.icon style={{ width: 22, height: 22, color: action.color }} />
                      </div>
                      <span className="text-[11px] font-semibold text-[#444444] text-center leading-tight">{action.label}</span>
                    </Link>
                  ) : (
                    <>
                      <div className="w-full aspect-square rounded-2xl bg-white flex items-center justify-center" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                        <action.icon style={{ width: 22, height: 22, color: action.color }} />
                      </div>
                      <span className="text-[11px] font-semibold text-[#444444] text-center leading-tight">{action.label}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Stay Details Card ── */}
          <div className="px-4 mt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-[#111111]">Stay Details</p>
            </div>
            <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              {[
                ["Hostel", hostel?.name || "—"],
                ["Bed", `${bed?.roomNumber} · ${bed?.label}`],
                ["Joining", formatDate(stay.joiningDate)],
                ["Ends", formatDate(stay.endDate)],
                ["Duration", stay.durationType],
                ["Sharing", bed?.sharingType?.replace(/_/g, " ") || "—"],
              ].map(([l, v], i, arr) => (
                <div key={l} className={`flex justify-between items-center px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                  <span className="text-[13px] text-[#767676] font-medium">{l}</span>
                  <span className="text-[13px] font-bold text-[#222222]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Billing Summary Card ── */}
          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-[#111111]">Billing Summary</p>
            </div>
            <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              {[
                ["Monthly Rent", formatCurrency(stay.monthlyRent)],
                ...(stay.foodCharges > 0 ? [["Food Charges", formatCurrency(stay.foodCharges)]] : []),
                ["Security Deposit", formatCurrency(stay.securityDeposit)],
                ...(stay.admissionFee > 0 ? [["Admission Fee", formatCurrency(stay.admissionFee)]] : []),
                ...(stay.discount > 0 ? [["Discount", `− ${formatCurrency(stay.discount)}`]] : []),
              ].map(([l, v], i) => (
                <div key={l} className="flex justify-between items-center px-5 py-3.5 border-b border-[#f5f5f5]">
                  <span className="text-[13px] text-[#767676] font-medium">{l}</span>
                  <span className={`text-[13px] font-bold ${l === "Discount" ? "text-[#58ff48]" : "text-[#222222]"}`}>{v}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-5 py-4 bg-[#f5f5f5]">
                <span className="text-[13px] font-bold text-[#222222]">Total Payable</span>
                <span className="text-[18px] font-extrabold text-[#111111]">{formatCurrency(stay.totalPayable)}</span>
              </div>
            </div>
          </div>

          {/* ── Recent Payments preview ── */}
          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-[#111111]">Recent Payments</p>
              <button onClick={() => setActiveTab("payments")} className="text-[12px] font-bold text-[#767676] flex items-center gap-0.5">
                See all <ChevronRight style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              {payments.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <div className="w-12 h-12 bg-[#f5f5f5] rounded-2xl mx-auto flex items-center justify-center mb-3">
                    <CreditCard style={{ width: 20, height: 20, color: "#767676" }} />
                  </div>
                  <p className="text-[13px] font-semibold text-[#222222]">No payments yet</p>
                  <p className="text-[12px] text-[#767676] mt-1">Your payment history will show here.</p>
                </div>
              ) : (
                payments.slice(0, 4).map((p, i, arr) => {
                  const isNeg = p.amountPaid < 0;
                  const initials = p.paymentMode?.[0]?.toUpperCase() || "P";
                  return (
                    <div key={p.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-[13px] font-bold" style={{ background: "#f0f0f0", color: "#767676" }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#222222] truncate">
                          {isNeg ? "Refund Processed" : "Payment Submitted"}
                        </p>
                        <p className="text-[11px] text-[#767676] mt-0.5">{formatDate(p.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[14px] font-bold ${isNeg ? "text-red-500" : p.paymentStatus === "PAID" ? "text-[#111111]" : "text-[#767676]"}`}>
                          {isNeg ? "−" : "+"}{formatCurrency(Math.abs(p.amountPaid))}
                        </p>
                        <p className="text-[10px] font-semibold mt-0.5 uppercase tracking-wide" style={{ color: p.paymentStatus === "PAID" ? "#58ff48" : "#767676" }}>
                          {isNeg ? "Refunded" : p.paymentStatus.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Roommates preview ── */}
          {roommates.length > 0 && (
            <div className="px-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-[#111111]">Roommates</p>
                <button onClick={() => setActiveTab("mates")} className="text-[12px] font-bold text-[#767676] flex items-center gap-0.5">
                  See all <ChevronRight style={{ width: 13, height: 13 }} />
                </button>
              </div>
              <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
                {roommates.map((rm, i, arr) => (
                  <div key={i} className={`flex items-center gap-4 px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                    {rm.photoUrl ? (
                      <img src={rm.photoUrl} className="w-10 h-10 rounded-2xl object-cover" alt={rm.fullName} />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-[#222222] flex items-center justify-center text-[12px] font-bold text-[#58ff48]">
                        {getInitials(rm.fullName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#222222] truncate">{rm.fullName}</p>
                      <p className="text-[11px] text-[#767676] mt-0.5">
                        {rm.occupationType === "STUDENT" ? rm.collegeName || "Student" : `${rm.designation || "Employee"} · ${rm.companyName || "N/A"}`}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#767676] bg-[#f5f5f5] px-2.5 py-1 rounded-full">
                      Bed {rm.bedLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {activeTab === "payments" && (
        <div className="px-4 pt-4 space-y-4">
          {/* Balance summary */}
          <div className="relative overflow-hidden rounded-3xl px-6 py-5" style={{ background: "linear-gradient(135deg, #1a1a1a, #2a2a2a)" }}>
            <div className="absolute" style={{ top: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: "rgba(88,255,72,0.08)" }} />
            <p className="text-[10px] font-bold uppercase tracking-widest relative z-10" style={{ color: "#767676" }}>Balance Due</p>
            <p className="text-[38px] font-extrabold text-white leading-none mt-1.5 relative z-10" style={{ letterSpacing: "-1.5px" }}>
              {remaining > 0 ? formatCurrency(remaining) : "₹0"}
            </p>
            <p className="text-[11px] mt-1.5 relative z-10" style={{ color: remaining > 0 ? "#ff6b6b" : "#58ff48" }}>
              {remaining > 0 ? "Pending payment" : "Fully settled ✓"}
            </p>
            <div className="flex gap-8 mt-4 relative z-10">
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: "#555" }}>Paid</p>
                <p className="text-[14px] font-bold mt-0.5" style={{ color: "#58ff48" }}>{formatCurrency(verifiedPaid)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: "#555" }}>Total</p>
                <p className="text-[14px] font-bold text-white mt-0.5">{formatCurrency(stay.totalPayable)}</p>
              </div>
            </div>
          </div>

          {/* Upload payment form */}
          <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            <div className="px-5 pt-5 pb-1">
              <p className="text-[13px] font-bold text-[#111111]">Submit Payment</p>
              <p className="text-[11px] text-[#767676] mt-1">Upload your UPI payment proof for verification.</p>
            </div>
            <form onSubmit={handleUploadPayment} className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#767676] block mb-1.5">Amount Paid (₹)</label>
                <input
                  type="number" placeholder="e.g. 15000" value={uploadAmount}
                  onChange={e => setUploadAmount(e.target.value)} required min="1"
                  className="w-full px-4 py-3 rounded-2xl border border-[#e8e8e8] bg-[#f9f9f9] text-[14px] font-semibold text-[#222222] placeholder:text-[#aaaaaa] outline-none focus:border-[#222222] transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#767676] block mb-1.5">Transaction Ref / UTR</label>
                <input
                  type="text" placeholder="12-digit UPI ref" value={uploadRef}
                  onChange={e => setUploadRef(e.target.value)} required
                  className="w-full px-4 py-3 rounded-2xl border border-[#e8e8e8] bg-[#f9f9f9] text-[14px] font-semibold text-[#222222] placeholder:text-[#aaaaaa] outline-none focus:border-[#222222] transition-colors"
                />
              </div>
              <button
                type="submit" disabled={uploading}
                className="w-full py-3.5 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all"
                style={{ background: "#222222", color: "#ffffff" }}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Submitting…" : "Submit Payment"}
              </button>
            </form>
          </div>

          {/* Payment history */}
          <div>
            <p className="text-[13px] font-bold text-[#111111] mb-3">Payment History</p>
            <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              {payments.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="w-12 h-12 bg-[#f5f5f5] rounded-2xl mx-auto flex items-center justify-center mb-3">
                    <CreditCard style={{ width: 20, height: 20, color: "#767676" }} />
                  </div>
                  <p className="text-[13px] font-semibold text-[#222222]">No payments yet</p>
                  <p className="text-[12px] text-[#767676] mt-1">Records will appear here after submission.</p>
                </div>
              ) : (
                payments.map((p, i, arr) => {
                  const isNeg = p.amountPaid < 0;
                  return (
                    <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${i < arr.length - 1 ? "border-b border-[#f5f5f5]" : ""}`}>
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: isNeg ? "#fff0f0" : "#f0fff0", color: isNeg ? "#ff6b6b" : "#1a8a10" }}>
                        {isNeg ? <Download style={{ width: 16, height: 16 }} /> : <Upload style={{ width: 16, height: 16 }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[#222222] truncate">
                          {isNeg ? "Refund" : "Payment"}
                        </p>
                        <p className="text-[11px] text-[#767676] mt-0.5">
                          {formatDate(p.createdAt)}
                          {p.transactionRefNo && <span className="ml-2 font-mono">· {p.transactionRefNo}</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[14px] font-extrabold ${isNeg ? "text-red-500" : "text-[#111111]"}`}>
                          {isNeg ? "−" : "+"}{formatCurrency(Math.abs(p.amountPaid))}
                        </p>
                        {p.paymentStatus === "PAID" && !isNeg && (
                          <a href={`/api/pdf/receipt/${p.id}`} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-bold flex items-center gap-0.5 justify-end mt-1" style={{ color: "#767676" }}>
                            <Download style={{ width: 10, height: 10 }} /> Receipt
                          </a>
                        )}
                        {p.paymentStatus !== "PAID" && (
                          <p className="text-[10px] font-semibold uppercase tracking-wide mt-1 text-amber-500">
                            {p.paymentStatus.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOD TAB ── */}
      {activeTab === "food" && (
        <div className="px-4 pt-4">
          {stay.foodPlan === "NOT_INCLUDED" ? (
            <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <div className="px-6 py-10 text-center space-y-4">
                <div className="w-16 h-16 bg-[#f5f5f5] rounded-3xl mx-auto flex items-center justify-center">
                  <UtensilsCrossed style={{ width: 28, height: 28, color: "#767676" }} />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-[#111111]">Food Not Included</h2>
                  <p className="text-[13px] text-[#767676] mt-2 leading-relaxed max-w-xs mx-auto">
                    Your stay plan doesn't include hostel food. Contact your warden to upgrade your plan.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <div className="px-6 py-8 text-center space-y-5">
                <div className="w-16 h-16 bg-[#f5f5f5] rounded-3xl mx-auto flex items-center justify-center">
                  <Utensils style={{ width: 28, height: 28, color: "#222222" }} />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-[#111111]">Weekly Meal Plan</h2>
                  <p className="text-[13px] text-[#767676] mt-2 leading-relaxed">
                    Manage your breakfast, lunch, and dinner for the week.
                  </p>
                </div>
                <Link href="/tenant/food">
                  <button className="w-full py-3.5 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2" style={{ background: "#222222", color: "#fff" }}>
                    <Utensils style={{ width: 16, height: 16 }} />
                    Manage Food Orders
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ROOMMATES TAB ── */}
      {activeTab === "mates" && (
        <div className="px-4 pt-4">
          {roommates.length === 0 ? (
            <div className="bg-white rounded-3xl px-6 py-10 text-center space-y-4" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <div className="w-16 h-16 bg-[#f5f5f5] rounded-3xl mx-auto flex items-center justify-center">
                <Users style={{ width: 28, height: 28, color: "#767676" }} />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-[#111111]">No Roommates</h2>
                <p className="text-[13px] text-[#767676] mt-2">You have no roommates in your room currently.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {roommates.map((rm, i) => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
                  <div className="flex items-center gap-4 px-5 py-5">
                    {rm.photoUrl ? (
                      <img src={rm.photoUrl} className="w-14 h-14 rounded-2xl object-cover" alt={rm.fullName} />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-[#222222] flex items-center justify-center text-[16px] font-bold" style={{ color: "#58ff48" }}>
                        {getInitials(rm.fullName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-bold text-[#111111] truncate">{rm.fullName}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#f5f5f5] text-[#767676]">
                          Bed {rm.bedLabel}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#f5f5f5] text-[#767676]">
                          {rm.occupationType === "STUDENT" ? "Student" : "Professional"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3.5 border-t border-[#f5f5f5] bg-[#fafafa]">
                    <p className="text-[12px] font-medium text-[#767676]">
                      {rm.occupationType === "STUDENT"
                        ? rm.collegeName || "Student"
                        : `${rm.designation || "Employee"} at ${rm.companyName || "N/A"}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Tab Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-72 bg-white border-t border-[#e8e8e8] z-40" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all"
                style={{ background: isActive ? "#f0f0f0" : "transparent" }}
              >
                <Icon style={{ width: 20, height: 20, color: isActive ? "#111111" : "#aaaaaa", strokeWidth: isActive ? 2.5 : 1.8 }} />
                <span className={`text-[10px] font-bold ${isActive ? "text-[#111111]" : "text-[#aaaaaa]"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
