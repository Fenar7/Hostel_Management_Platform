"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Building2, BedDouble, CheckCircle2, Layers, Phone, CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { notify } from "@/lib/toast";
import { DurationType, FoodPlan } from "@prisma/client";
import { onboardingLinkWithPassword } from "@/lib/whatsapp/templates";
import { buildWaMeLink } from "@/lib/whatsapp/utils";

interface HostelOption {
  id: string;
  name: string;
  accommodationType: string;
}

interface AvailableBed {
  id: string;
  label: string;
  roomNumber: string;
  sharingType: string;
  floorName: string;
  flatName: string | null;
}

const PHONE_REGEX = /^\+91[0-9]{10}$/;

import { HostelWorkspaceLayout } from "./HostelWorkspaceLayout";

export default function HostelOnboardView({ hostelId, hostelName, baseRoute }: { hostelId: string | null; hostelName?: string; baseRoute: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState(() => searchParams.get("phone") || "");
  const [phoneError, setPhoneError] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationType, setDurationType] = useState<DurationType>(
    DurationType.MONTHLY
  );
  const [foodPlan, setFoodPlan] = useState<FoodPlan>(FoodPlan.NOT_INCLUDED);
  const [isNewAdmission, setIsNewAdmission] = useState(true);
  const [admissionFee, setAdmissionFee] = useState("0");
  const [monthlyRent, setMonthlyRent] = useState("0");
  const [securityDeposit, setSecurityDeposit] = useState("0");
  const [foodCharges, setFoodCharges] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [selectedBedId, setSelectedBedId] = useState("");
  const [bedSearchTerm, setBedSearchTerm] = useState("");
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>("ALL");

  const filteredBeds = useMemo(() => {
    return availableBeds.filter((bed) => {
      const matchesSearch =
        !bedSearchTerm.trim() ||
        bed.label.toLowerCase().includes(bedSearchTerm.toLowerCase()) ||
        bed.roomNumber.toLowerCase().includes(bedSearchTerm.toLowerCase()) ||
        (bed.flatName && bed.flatName.toLowerCase().includes(bedSearchTerm.toLowerCase()));

      const matchesFloor =
        selectedFloorFilter === "ALL" || bed.floorName === selectedFloorFilter;

      return matchesSearch && matchesFloor;
    });
  }, [availableBeds, bedSearchTerm, selectedFloorFilter]);

  const availableFloors = useMemo(() => {
    const set = new Set<string>();
    availableBeds.forEach((b) => {
      if (b.floorName) set.add(b.floorName);
    });
    return Array.from(set).sort();
  }, [availableBeds]);

  const bedHierarchy = useMemo(() => {
    const floorMap = new Map<string, Map<string, AvailableBed[]>>();

    filteredBeds.forEach((bed) => {
      const floorKey = bed.floorName || "General Floor";
      const roomKey = bed.roomNumber;

      if (!floorMap.has(floorKey)) {
        floorMap.set(floorKey, new Map());
      }
      const roomMap = floorMap.get(floorKey)!;

      if (!roomMap.has(roomKey)) {
        roomMap.set(roomKey, []);
      }
      roomMap.get(roomKey)!.push(bed);
    });

    return floorMap;
  }, [filteredBeds]);
  const [loading, setLoading] = useState(false);
  const [submittedLink, setSubmittedLink] = useState("");
  const [submittedPassword, setSubmittedPassword] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [hostels, setHostels] = useState<HostelOption[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState(
    () => hostelId || searchParams.get("hostelId") || ""
  );
  const [hostelsLoading, setHostelsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (selectedHostelId) return;

    setHostelsLoading(true);
    fetch("/api/admin/hostels")
      .then(async (res) => {
        if (!res.ok) throw new Error("not admin");
        const data = await res.json();
        setHostels(data.map((h: HostelOption) => ({ id: h.id, name: h.name, accommodationType: h.accommodationType })));
        setIsAdmin(true);
      })
      .catch(() => {
        setIsAdmin(false);
      })
      .finally(() => setHostelsLoading(false));
  }, [selectedHostelId]);

  const totalPayable =
    (parseFloat(admissionFee) || 0) + (parseFloat(monthlyRent) || 0) + (parseFloat(securityDeposit) || 0) + (parseFloat(foodCharges) || 0) - (parseFloat(discount) || 0);

  const handlePhoneValidation = (): boolean => {
    if (!PHONE_REGEX.test(phone)) {
      setPhoneError(
        "Please enter a valid Indian phone number (e.g., +91XXXXXXXXXX)"
      );
      return false;
    }
    setPhoneError("");
    return true;
  };

  const hostelSelected = !!selectedHostelId;
  const showHostelPicker = isAdmin && !hostelSelected && !hostelsLoading;

  const handleSearchBeds = useCallback(async () => {
    if (!joiningDate) {
      notify.error("Please select a joining date");
      return;
    }
    if (durationType !== DurationType.MONTHLY && !endDate) {
      notify.error("Please select an end date");
      return;
    }
    if (endDate && new Date(endDate) <= new Date(joiningDate)) {
      notify.error("End date must be after joining date");
      return;
    }

    setLoading(true);
    setAvailableBeds([]);
    setSelectedBedId("");

    try {
      const params = new URLSearchParams({ joiningDate });
      if (endDate) {
        params.set("endDate", endDate);
      }
      if (selectedHostelId) {
        params.set("hostelId", selectedHostelId);
      }

      const response = await fetch(
        `/api/warden/beds/available?${params.toString()}`
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch available beds");
      }

      const data = await response.json();
      setAvailableBeds(data.availableBeds || []);

      if (!data.availableBeds || data.availableBeds.length === 0) {
        notify.error("No available beds found for the selected date range.");
      }
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [joiningDate, endDate, durationType, selectedHostelId]);

  useEffect(() => {
    const isStep2 = (step === 2 && !showHostelPicker) || (step === 3 && showHostelPicker);
    if (isStep2 && joiningDate && availableBeds.length === 0 && !loading) {
      handleSearchBeds();
    }
  }, [step, showHostelPicker, joiningDate, availableBeds.length, loading, handleSearchBeds]);

  const handleSubmit = async () => {
    if (!selectedBedId) {
      notify.error("Please select a bed");
      return;
    }
    if (totalPayable < 0) {
      notify.error(
        "Total payable cannot be negative. Please check your discount amount."
      );
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        phone,
        bedId: selectedBedId,
        joiningDate,
        endDate: endDate || null,
        durationType,
        foodPlan,
        isNewAdmission,
        admissionFee: parseFloat(admissionFee) || 0,
        monthlyRent: parseFloat(monthlyRent) || 0,
        securityDeposit: parseFloat(securityDeposit) || 0,
        foodCharges: parseFloat(foodCharges) || 0,
        discount: parseFloat(discount) || 0,
      };

      if (selectedHostelId) {
        payload.hostelId = selectedHostelId;
      }

      const response = await fetch("/api/warden/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create onboarding request");
      }

      const data = await response.json();
      const fullLink = `${window.location.origin}${data.entryGateLink}`;
      setSubmittedLink(fullLink);
      setSubmittedPassword(data.tempPassword || "");
      setStep(5);
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(submittedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      const el = document.createElement("textarea");
      el.value = submittedLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(submittedPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 3000);
    } catch {
      const el = document.createElement("textarea");
      el.value = submittedPassword;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 3000);
    }
  };

  const handleWhatsAppShare = () => {
    const message = onboardingLinkWithPassword(submittedLink, submittedPassword);
    window.open(buildWaMeLink(phone, message), "_blank");
  };

  const totalSteps = showHostelPicker ? 5 : 4;

  const stepLabels = useMemo(() => {
    if (showHostelPicker) {
      return [
        { num: 1, label: "Hostel", icon: Building2 },
        { num: 2, label: "Prospect Phone", icon: Phone },
        { num: 3, label: "Dates & Bed", icon: BedDouble },
        { num: 4, label: "Financials", icon: CreditCard },
        { num: 5, label: "Complete", icon: CheckCircle2 },
      ];
    }
    return [
      { num: 1, label: "Prospect Phone", icon: Phone },
      { num: 2, label: "Dates & Bed", icon: BedDouble },
      { num: 3, label: "Financials", icon: CreditCard },
      { num: 4, label: "Complete", icon: CheckCircle2 },
    ];
  }, [showHostelPicker]);

  const inputClass =
    "w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 px-4 py-3 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all h-12";

  const selectClass =
    "w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all h-12";

  return (
    <HostelWorkspaceLayout
      hostelId={hostelId || ""}
      hostelName={hostelName}
      title="Onboard New Tenant"
      subtitle="Create a new onboarding request for a prospective tenant"
      hideAdminNav={baseRoute === "/warden"}
    >
      <div className="w-full min-h-[calc(100vh-65px)] bg-zinc-50/50 dark:bg-[#09090b]">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* ── LEFT CANVAS (Col 1-8: 66% Width) ── */}
            <div className="lg:col-span-8 space-y-6">

              {/* Apple Segmented Studio Stage Bar */}
              <div className="p-1.5 rounded-2xl bg-zinc-200/50 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar">
                {stepLabels.map((s) => {
                  const isActive = step === s.num;
                  const isCompleted = step > s.num;

                  return (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => {
                        if (isCompleted) setStep(s.num);
                      }}
                      disabled={!isCompleted && !isActive}
                      className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 ${
                        isActive
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md scale-[1.02] cursor-default"
                          : isCompleted
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 cursor-pointer"
                          : "text-zinc-400 dark:text-zinc-500 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-lg text-[10px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white dark:bg-black/20 dark:text-black"
                          : isCompleted
                          ? "bg-emerald-500 text-white"
                          : "bg-zinc-300 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}>
                        {isCompleted ? "✓" : s.num}
                      </span>
                      <span className="tracking-tight">{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Apple Studio Main Stage Card Container */}
              <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-card/90 backdrop-blur-2xl p-6 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/50 space-y-6">

          {/* ── Step 1: Hostel Selection (admin only) ── */}
          {step === 1 && showHostelPicker && (
            <div className="animate-in fade-in-50 slide-in-from-right-4 duration-300 ease-out space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Step 1: Select Hostel
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose which hostel property to onboard this prospective tenant into.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hostel-select" className="text-xs font-semibold text-foreground">Hostel Property</Label>
                <Select value={selectedHostelId} onValueChange={(val) => setSelectedHostelId(val || "")}>
                  <SelectTrigger id="hostel-select" className={selectClass}>
                    <SelectValue placeholder="-- Select a Hostel --" />
                  </SelectTrigger>
                  <SelectContent>
                    {hostels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name} ({h.accommodationType === "MENS" ? "Men" : "Women"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => router.push(baseRoute)}
                  className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700 h-12 rounded-2xl font-medium text-sm transition-all px-5 border-0 shadow-none"
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedHostelId) {
                      notify.error("Please select a hostel");
                      return;
                    }
                    setStep(2);
                  }}
                  className="flex-1 bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 h-12 rounded-2xl font-semibold text-sm shadow-md active:scale-[0.98] transition-all border-0"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 1 (or 2): Phone ── */}
          {step === 1 && !showHostelPicker && (
            <div className="animate-in fade-in-50 slide-in-from-right-4 duration-300 ease-out space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Step 1: Prospect Phone Number
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the Indian mobile number of the prospective tenant to verify their account.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground" htmlFor="phone-input">
                  Mobile Phone Number
                </label>
                <PhoneInput
                  id="phone-input"
                  value={phone}
                  onChange={(val) => {
                    setPhone(val);
                    setPhoneError("");
                  }}
                  error={!!phoneError}
                />
                {phoneError && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{phoneError}</p>
                )}
              </div>

              <Button
                onClick={() => {
                  if (handlePhoneValidation()) {
                    setStep(2);
                  }
                }}
                className="w-full bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 h-12 rounded-2xl font-semibold text-sm shadow-md active:scale-[0.98] transition-all border-0"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && showHostelPicker && (
            <div className="animate-in fade-in-50 slide-in-from-right-4 duration-300 ease-out space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Step 2: Prospect Phone Number
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the Indian mobile number of the prospective tenant.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground" htmlFor="phone-input-2">
                  Mobile Phone Number
                </label>
                <PhoneInput
                  id="phone-input-2"
                  value={phone}
                  onChange={(val) => {
                    setPhone(val);
                    setPhoneError("");
                  }}
                  error={!!phoneError}
                />
                {phoneError && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">{phoneError}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => setStep(1)}
                  className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700 h-12 rounded-2xl font-medium text-sm transition-all px-5 border-0 shadow-none"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (handlePhoneValidation()) {
                      setStep(3);
                    }
                  }}
                  className="flex-1 bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 h-12 rounded-2xl font-semibold text-sm shadow-md active:scale-[0.98] transition-all border-0"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2/3: Dates & Bed Selection ── */}
          {((step === 2 && !showHostelPicker) || (step === 3 && showHostelPicker)) && (
            <div className="animate-in fade-in-50 slide-in-from-right-4 duration-300 ease-out space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Step {showHostelPicker ? 3 : 2}: Dates &amp; Bed Selection
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure stay duration type and select an available room bed.
                </p>
              </div>

              {/* Apple Segmented Duration Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Stay Duration Type</label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setDurationType(DurationType.MONTHLY);
                      setEndDate("");
                      setAvailableBeds([]);
                      setSelectedBedId("");
                    }}
                    className={`py-3 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      durationType === DurationType.MONTHLY
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md scale-[1.01]"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium"
                    }`}
                  >
                    <span>🔄 Monthly (Open-Ended)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDurationType(DurationType.CUSTOM);
                      setAvailableBeds([]);
                      setSelectedBedId("");
                    }}
                    className={`py-3 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      durationType !== DurationType.MONTHLY
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md scale-[1.01]"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium"
                    }`}
                  >
                    <span>⏱️ Fixed Duration Stay</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground" htmlFor="joining-date">
                    Joining Date
                  </label>
                  <Input
                    id="joining-date"
                    type="date"
                    value={joiningDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setJoiningDate(e.target.value);
                      setAvailableBeds([]);
                      setSelectedBedId("");
                    }}
                    className={inputClass}
                  />
                </div>

                {durationType === DurationType.MONTHLY ? (
                  <div className="flex items-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                    <div>
                      <p className="font-bold text-xs text-emerald-900 dark:text-emerald-200 mb-0.5 flex items-center gap-1.5">
                        <span>🔄</span> Monthly Recurring Stay Active
                      </p>
                      <p className="text-[11px] leading-relaxed text-emerald-700/80 dark:text-emerald-400/80">
                        Resident stays open-ended. Rent invoice automatically scheduled every 30 days.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground" htmlFor="end-date">
                      End Date
                    </label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      min={joiningDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setEndDate(e.target.value);
                        setAvailableBeds([]);
                        setSelectedBedId("");
                      }}
                      className={inputClass}
                    />
                  </div>
                )}
              </div>

              {durationType !== DurationType.MONTHLY && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Quick Duration Presets</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "1 Month", days: 30 },
                      { label: "3 Months", days: 90 },
                      { label: "6 Months", days: 180 },
                      { label: "1 Year", days: 365 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          if (!joiningDate) {
                            notify.error("Please select a joining date first");
                            return;
                          }
                          const start = new Date(joiningDate);
                          start.setDate(start.getDate() + preset.days);
                          setEndDate(start.toISOString().split("T")[0]);
                          setAvailableBeds([]);
                          setSelectedBedId("");
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/60 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all"
                      >
                        +{preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleSearchBeds}
                disabled={loading || !joiningDate || (durationType !== DurationType.MONTHLY && !endDate)}
                className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-700 h-12 rounded-2xl font-semibold text-sm transition-all border-0 shadow-none"
              >
                {loading ? "Searching Available Beds..." : "Refresh Bed Availability"}
              </Button>

              {/* Apple-Grade Visual Spatial Bed Matrix */}
              {availableBeds.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-emerald-500" />
                        Available Beds Spatial Matrix
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {filteredBeds.length} bed{filteredBeds.length === 1 ? "" : "s"} available across {availableFloors.length} floor{availableFloors.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    {/* Quick Search */}
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search room or bed..."
                        value={bedSearchTerm}
                        onChange={(e) => setBedSearchTerm(e.target.value)}
                        className="pl-9 h-10 text-xs bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>
                  </div>

                  {/* Floor Filter Pills */}
                  {availableFloors.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-1">
                      <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" /> Floor:
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedFloorFilter("ALL")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                          selectedFloorFilter === "ALL"
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-foreground"
                        }`}
                      >
                        All ({availableBeds.length})
                      </button>
                      {availableFloors.map((floor) => {
                        const count = availableBeds.filter((b) => b.floorName === floor).length;
                        return (
                          <button
                            key={floor}
                            type="button"
                            onClick={() => setSelectedFloorFilter(floor)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                              selectedFloorFilter === floor
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                                : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-foreground"
                            }`}
                          >
                            {floor} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Bed Spatial Matrix Container */}
                  <div className="max-h-[400px] overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                    {filteredBeds.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                        <p className="text-xs text-muted-foreground font-medium">No beds match your filter criteria.</p>
                      </div>
                    ) : (
                      Array.from(bedHierarchy.entries()).map(([floorName, roomMap]) => (
                        <div key={floorName} className="space-y-3">
                          {/* Floor Header */}
                          <div className="flex items-center gap-2 px-1">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                              {floorName}
                            </h4>
                            <div className="h-px flex-1 bg-zinc-200/60 dark:bg-zinc-800/60" />
                          </div>

                          {/* Room Cards Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {Array.from(roomMap.entries()).map(([roomNumber, beds]) => {
                              const firstBed = beds[0];
                              return (
                                <div
                                  key={roomNumber}
                                  className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 backdrop-blur-sm space-y-3 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
                                >
                                  {/* Room Card Header */}
                                  <div className="flex items-center justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-foreground">
                                        Room {roomNumber}
                                      </span>
                                      {firstBed.flatName && (
                                        <span className="text-[10px] font-semibold text-muted-foreground bg-zinc-200/60 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded-md">
                                          {firstBed.flatName}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      {firstBed.sharingType}
                                    </span>
                                  </div>

                                  {/* Bed Chips Grid */}
                                  <div className="grid grid-cols-2 gap-2">
                                    {beds.map((bed) => {
                                      const isSelected = selectedBedId === bed.id;
                                      return (
                                        <button
                                          key={bed.id}
                                          type="button"
                                          onClick={() => setSelectedBedId(bed.id)}
                                          className={`relative p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                                            isSelected
                                              ? "border-emerald-500 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold ring-2 ring-emerald-500 shadow-md scale-[1.03]"
                                              : "border-zinc-200/80 dark:border-zinc-800/80 bg-background/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between w-full">
                                            <span className="text-xs font-bold tracking-tight">
                                              {bed.label}
                                            </span>
                                            {isSelected && (
                                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                            )}
                                          </div>
                                          <span className={`text-[10px] mt-1 ${isSelected ? "text-white/80 dark:text-black/80 font-medium" : "text-muted-foreground"}`}>
                                            Available
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => setStep(showHostelPicker ? 2 : 1)}
                  className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700 h-12 rounded-2xl font-medium text-sm transition-all px-5 border-0 shadow-none"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(showHostelPicker ? 4 : 3)}
                  disabled={!selectedBedId}
                  className="flex-1 bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-40 h-12 rounded-2xl font-semibold text-sm shadow-md active:scale-[0.98] transition-all border-0"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3/4: Fees & Food Configuration ── */}
          {((step === 3 && !showHostelPicker) || (step === 4 && showHostelPicker)) && (
            <div className="animate-in fade-in-50 slide-in-from-right-4 duration-300 ease-out space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Step {showHostelPicker ? 4 : 3}: Fees &amp; Food Configuration
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Specify admission fee, monthly rent, security deposit, and meal preferences.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground" htmlFor="admission-fee">
                    Admission Fee (₹)
                  </label>
                  <Input
                    id="admission-fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={admissionFee}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdmissionFee(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground" htmlFor="monthly-rent">
                    Monthly Rent (₹)
                  </label>
                  <Input
                    id="monthly-rent"
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyRent}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMonthlyRent(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground" htmlFor="security-deposit">
                    Security Deposit (₹)
                  </label>
                  <Input
                    id="security-deposit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={securityDeposit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSecurityDeposit(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground" htmlFor="food-charges">
                    Food Charges (₹)
                  </label>
                  <Input
                    id="food-charges"
                    type="number"
                    step="0.01"
                    min="0"
                    value={foodCharges}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFoodCharges(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground" htmlFor="discount">
                    Discount Amount (₹)
                  </label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDiscount(e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration-type" className="text-xs font-semibold text-foreground">Duration Type</Label>
                  <Select value={durationType} onValueChange={(val) => setDurationType(val as DurationType)}>
                    <SelectTrigger id="duration-type" className={selectClass}>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DurationType.MONTHLY}>Monthly</SelectItem>
                      <SelectItem value={DurationType.WEEKLY}>Weekly</SelectItem>
                      <SelectItem value={DurationType.DAILY}>Daily</SelectItem>
                      <SelectItem value={DurationType.CUSTOM}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="food-plan" className="text-xs font-semibold text-foreground">Food Plan Preference</Label>
                  <Select value={foodPlan} onValueChange={(val) => setFoodPlan(val as FoodPlan)}>
                    <SelectTrigger id="food-plan" className={selectClass}>
                      <SelectValue placeholder="Select food plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FoodPlan.NOT_INCLUDED}>Not Included</SelectItem>
                      <SelectItem value={FoodPlan.BREAKFAST_ONLY}>Breakfast Only</SelectItem>
                      <SelectItem value={FoodPlan.BREAKFAST_DINNER}>Breakfast &amp; Dinner</SelectItem>
                      <SelectItem value={FoodPlan.BLD}>Breakfast, Lunch &amp; Dinner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Total Payable Emerald Glass Card */}
              <div
                className={`rounded-2xl border p-5 space-y-1 ${
                  totalPayable < 0
                    ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Initial Total Payable Amount
                </p>
                <p className="text-3xl font-black text-foreground tracking-tight">
                  ₹{totalPayable > 0 ? totalPayable.toLocaleString("en-IN") : "0.00"}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">
                  = Admission Fee + Monthly Rent + Security Deposit + Food Charges − Discount
                </p>
              </div>

              <label className="flex items-center gap-3 text-xs font-semibold text-foreground cursor-pointer p-1">
                <Checkbox
                  checked={isNewAdmission}
                  onCheckedChange={(checked) => setIsNewAdmission(!!checked)}
                  className="rounded-md h-5 w-5 data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-white data-[state=checked]:text-white dark:data-[state=checked]:text-zinc-900 border-zinc-300 dark:border-zinc-700"
                />
                New Tenant Admission
              </label>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => setStep(showHostelPicker ? 3 : 2)}
                  className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700 h-12 rounded-2xl font-medium text-sm transition-all px-5 border-0 shadow-none"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(showHostelPicker ? 5 : 4)}
                  disabled={totalPayable < 0}
                  className="flex-1 bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-40 h-12 rounded-2xl font-semibold text-sm shadow-md active:scale-[0.98] transition-all border-0"
                >
                  Review &amp; Submit
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4/5: Review & Submit ── */}
          {((step === 4 && !showHostelPicker) || (step === 5 && showHostelPicker)) && (
            <div className="animate-in fade-in-50 slide-in-from-right-4 duration-300 ease-out space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Step {showHostelPicker ? 5 : 4}: Review &amp; Submit
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Confirm the onboarding request summary before generating access links.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 p-5 space-y-3 text-xs">
                {hostelSelected && (
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-200/40 dark:border-zinc-800/40">
                    <span className="text-muted-foreground font-medium">Target Hostel</span>
                    <span className="font-bold text-foreground">
                      {hostels.find((h) => h.id === selectedHostelId)?.name || selectedHostelId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200/40 dark:border-zinc-800/40">
                  <span className="text-muted-foreground font-medium">Prospect Phone</span>
                  <span className="font-bold text-foreground font-mono">{phone}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200/40 dark:border-zinc-800/40">
                  <span className="text-muted-foreground font-medium">Selected Bed</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    {availableBeds.find((b) => b.id === selectedBedId)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200/40 dark:border-zinc-800/40">
                  <span className="text-muted-foreground font-medium">Joining Date</span>
                  <span className="font-bold text-foreground">{joiningDate}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200/40 dark:border-zinc-800/40">
                  <span className="text-muted-foreground font-medium">Stay Duration</span>
                  <span className="font-bold text-foreground">{durationType}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200/40 dark:border-zinc-800/40">
                  <span className="text-muted-foreground font-medium">Food Plan</span>
                  <span className="font-bold text-foreground">{foodPlan}</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-sm">
                  <span className="font-bold text-foreground">Initial Total Payable</span>
                  <span className="font-black text-foreground text-lg">
                    ₹{totalPayable > 0 ? totalPayable.toLocaleString("en-IN") : "0.00"}
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-3 text-xs font-medium text-foreground cursor-pointer rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 p-4">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(!!checked)}
                  className="rounded-md h-5 w-5 data-[state=checked]:bg-zinc-900 dark:data-[state=checked]:bg-white data-[state=checked]:text-white dark:data-[state=checked]:text-zinc-900 border-zinc-300 dark:border-zinc-700"
                />
                I confirm that all prospect details above are accurate and authorized.
              </label>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    setConfirmed(false);
                    setStep(showHostelPicker ? 4 : 3);
                  }}
                  className="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700 h-12 rounded-2xl font-medium text-sm transition-all px-5 border-0 shadow-none"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !confirmed}
                  className="flex-1 bg-zinc-900 text-white hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 disabled:opacity-40 h-12 rounded-2xl font-semibold text-sm shadow-md active:scale-[0.98] transition-all border-0"
                >
                  {loading ? "Creating Request..." : "Confirm & Send Onboarding Link"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 5/6: Success ── */}
          {((step === 5 && !showHostelPicker) || (step === 6 && showHostelPicker)) && (
            <div className="animate-in fade-in-50 slide-in-from-right-4 duration-300 ease-out space-y-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-4xl shadow-inner">
                  ✓
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  Onboarding Request Created!
                </h2>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Share the secure registration link and password below with the prospect to complete their account setup.
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 text-left space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Secure Registration Link
                </p>
                <p className="break-all text-xs font-mono font-semibold text-foreground">{submittedLink}</p>
              </div>

              {submittedPassword && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left space-y-1.5">
                  <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Temporary Access Password
                  </p>
                  <p className="text-xl font-black font-mono tracking-widest text-amber-900 dark:text-amber-200">
                    {submittedPassword}
                  </p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                    Share this one-time password with the prospect alongside the link above.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex gap-3">
                  <Button
                    onClick={handleCopyLink}
                    className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-100 h-12 rounded-2xl font-semibold text-xs border-0 shadow-none"
                  >
                    {linkCopied ? "✓ Link Copied!" : "Copy Registration Link"}
                  </Button>
                  {submittedPassword && (
                    <Button
                      onClick={handleCopyPassword}
                      className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-100 h-12 rounded-2xl font-semibold text-xs border-0 shadow-none"
                    >
                      {passwordCopied ? "✓ Password Copied!" : "Copy Password"}
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleWhatsAppShare}
                  className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white h-12 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-[0.98] border-0"
                >
                  Share via WhatsApp
                </Button>
                <Button
                  onClick={() => router.push(baseRoute)}
                  className="w-full bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 h-12 rounded-2xl font-medium text-xs border-0 shadow-none"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}
              </div>
            </div>

            {/* ── RIGHT PANEL: STICKY PROSPECT PASSPORT CARD (Col 9-12: 34% Width) ── */}
            <div className="lg:col-span-4 sticky top-6 space-y-4">
              <div className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-card/90 backdrop-blur-2xl p-6 space-y-5 shadow-xl shadow-black/5 dark:shadow-black/50">
                <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-3.5">
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    Prospect Passport
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Drafting
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Prospect Phone */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Prospect Mobile</span>
                    <span className="font-bold text-foreground font-mono">
                      {phone || "Not entered"}
                    </span>
                  </div>

                  {/* Selected Hostel */}
                  {showHostelPicker && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Target Hostel</span>
                      <span className="font-bold text-foreground">
                        {hostels.find((h) => h.id === selectedHostelId)?.name || "Select hostel"}
                      </span>
                    </div>
                  )}

                  {/* Stay Duration Type */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Stay Duration</span>
                    <span className="font-bold text-foreground">
                      {durationType === DurationType.MONTHLY ? "Monthly (Open-Ended)" : "Fixed Term"}
                    </span>
                  </div>

                  {/* Selected Bed */}
                  <div className="flex items-center justify-between border-t border-zinc-200/40 dark:border-zinc-800/40 pt-3">
                    <span className="text-muted-foreground font-medium">Allocated Bed</span>
                    {selectedBedId ? (
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        {availableBeds.find((b) => b.id === selectedBedId)?.label || "Bed selected"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic font-normal">No bed selected</span>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  {selectedBedId && (
                    <div className="space-y-2 border-t border-zinc-200/40 dark:border-zinc-800/40 pt-3">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Admission Fee</span>
                        <span className="font-semibold text-foreground">₹{admissionFee || "0"}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Monthly Rent</span>
                        <span className="font-semibold text-foreground">₹{monthlyRent || "0"}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Security Deposit</span>
                        <span className="font-semibold text-foreground">₹{securityDeposit || "0"}</span>
                      </div>
                      {parseFloat(foodCharges) > 0 && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Food Charges</span>
                          <span className="font-semibold text-foreground">₹{foodCharges}</span>
                        </div>
                      )}
                      {parseFloat(discount) > 0 && (
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span>Discount Applied</span>
                          <span>-₹{discount}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm font-extrabold text-foreground border-t border-zinc-200/60 dark:border-zinc-800/60 pt-3">
                        <span>Initial Total</span>
                        <span className="text-base font-black text-foreground">
                          ₹{totalPayable > 0 ? totalPayable.toLocaleString("en-IN") : "0.00"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </HostelWorkspaceLayout>
  );
}
