"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Download, Bell,
  Calendar, Search, Plus, ArrowRight, Maximize2,
} from "lucide-react";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────────
interface ResidentFoodEntry {
  stayId: string;
  tenantName: string;
  roomNumber: string;
  bedLabel: string;
  foodPlan: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  tea: boolean;
  cutFruits: boolean;
  gymDiet: boolean;
  hasOrder: boolean;
}

interface DayData {
  date: string; // YYYY-MM-DD in IST
  dayName: string; // "Mon"
  dayNumber: number; // 1-31
  isToday: boolean;
  residents: ResidentFoodEntry[];
}

interface TodaySummary {
  totalResidents: number;
  eligibleResidents: number;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
  teaCount: number;
}

interface WeekData {
  weekStart: string;
  weekDays: DayData[];
  todaySummary: TodaySummary;
  hostelId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function getMondayOfWeek(d: Date): string {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split("T")[0];
}

function shiftWeek(weekStart: string, delta: number): string {
  const d = new Date(`${weekStart}T00:00:00.000+05:30`);
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split("T")[0];
}

function formatHeaderDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ─── Meal columns definition ────────────────────────────────────────────────────
const MEAL_COLS = [
  { key: "breakfast" as const, label: "Break Fast" },
  { key: "lunch"     as const, label: "Lunch"      },
  { key: "dinner"    as const, label: "Dinner"     },
  { key: "tea"       as const, label: "Tea"        },
  { key: "cutFruits" as const, label: "Cut Fruits" },
  { key: "gymDiet"   as const, label: "Gym Diet"   },
] as const;

type MealKey = typeof MEAL_COLS[number]["key"];

// ─── Main Component ──────────────────────────────────────────────────────────────
export default function HostelFoodView({
  hostelId,
  baseRoute,
}: {
  hostelId: string | null;
  baseRoute: string;
}) {
  const [weekStart, setWeekStart] = useState<string>(() => getMondayOfWeek(new Date()));
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  // ── Fetch weekly data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ weekStart });
      if (hostelId) params.append("hostelId", hostelId);
      const res = await fetch(`/api/warden/food-week?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load food data");
      }
      setWeekData(await res.json());
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [weekStart, hostelId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Toggle a meal (optimistic) ─────────────────────────────────────────────────
  const handleToggle = async (
    stayId: string,
    date: string,
    meal: MealKey,
    currentVal: boolean
  ) => {
    const key = `${stayId}-${date}-${meal}`;
    if (toggling === key) return;

    const newVal = !currentVal;

    // Optimistic update
    setWeekData((prev) => {
      if (!prev) return prev;
      const todayStr = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
      const newDays = prev.weekDays.map((day) => {
        if (day.date !== date) return day;
        return {
          ...day,
          residents: day.residents.map((r) =>
            r.stayId === stayId ? { ...r, [meal]: newVal, hasOrder: true } : r
          ),
        };
      });
      // Update today summary if this is today
      let todaySummary = prev.todaySummary;
      if (date === todayStr) {
        const delta = newVal ? 1 : -1;
        todaySummary = {
          ...todaySummary,
          breakfastCount: meal === "breakfast" ? todaySummary.breakfastCount + delta : todaySummary.breakfastCount,
          lunchCount: meal === "lunch" ? todaySummary.lunchCount + delta : todaySummary.lunchCount,
          dinnerCount: meal === "dinner" ? todaySummary.dinnerCount + delta : todaySummary.dinnerCount,
          teaCount: meal === "tea" ? todaySummary.teaCount + delta : todaySummary.teaCount,
        };
      }
      return { ...prev, weekDays: newDays, todaySummary };
    });

    setToggling(key);
    try {
      const res = await fetch("/api/warden/food-mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stayId, forDate: date, [meal]: newVal }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : "Failed to update meal");
      await loadData(); // revert on error
    } finally {
      setToggling(null);
    }
  };

  // ── Filter residents by search ─────────────────────────────────────────────────
  const filterResidents = (residents: ResidentFoodEntry[]) => {
    if (!search.trim()) return residents;
    const q = search.toLowerCase();
    return residents.filter(
      (r) =>
        r.tenantName.toLowerCase().includes(q) ||
        r.roomNumber.toLowerCase().includes(q)
    );
  };

  // ── Derived state ──────────────────────────────────────────────────────────────
  const s = weekData?.todaySummary;
  const eligible = s?.eligibleResidents ?? 1;

  const STAT_CARDS = [
    { label: "Breakfast", count: s?.breakfastCount ?? 0, pct: Math.round(((s?.breakfastCount ?? 0) / eligible) * 100) },
    { label: "Lunch",     count: s?.lunchCount     ?? 0, pct: Math.round(((s?.lunchCount     ?? 0) / eligible) * 100) },
    { label: "Dinner",    count: s?.dinnerCount    ?? 0, pct: Math.round(((s?.dinnerCount    ?? 0) / eligible) * 100) },
    { label: "Tea",       count: s?.teaCount       ?? 0, pct: Math.round(((s?.teaCount       ?? 0) / eligible) * 100) },
  ];

  const isCurrentWeek = weekStart === getMondayOfWeek(new Date());

  const firstDay = weekData?.weekDays?.[0];
  const weekLabel = firstDay
    ? `${firstDay.dayName} ${firstDay.dayNumber}`
    : "—";

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">

      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-5 border-b border-[#dedede]">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#222] leading-tight">
            Food Dashboard
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[#767676] mt-1">{formatHeaderDate()}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bell */}
          <button
            onClick={() => notify.info("No new notifications")}
            className="size-[44px] rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:border-black hover:text-black transition-colors"
          >
            <Bell className="size-5" />
          </button>
          {/* Manage Meals Pricing */}
          <button
            onClick={() => notify.info("Meal pricing management — coming soon")}
            className="h-[44px] px-4 rounded-[6px] border border-[#dedede] text-[14px] font-semibold text-black hover:bg-[#f9f9f9] transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            Manage Meals Pricing <Plus className="size-4" />
          </button>
          {/* On Board a User */}
          <Link
            href={`${baseRoute}/onboard`}
            className="h-[44px] px-4 rounded-[6px] bg-[#282828] text-white text-[14px] font-semibold flex items-center gap-2 hover:bg-black transition-colors whitespace-nowrap"
          >
            On Board a User <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* ── Meal Counts (Today) ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-bold text-black">Meal Counts (Today)</h2>
          <div className="flex items-center gap-2">
            <button className="h-[38px] px-4 rounded-[6px] border border-[#dedede] text-[13px] font-semibold text-black hover:bg-[#f9f9f9] transition-colors flex items-center gap-2">
              Today <Calendar className="size-4 text-[#767676]" />
            </button>
            <button
              onClick={() => notify.info("Export coming soon!")}
              className="h-[38px] px-4 rounded-[6px] border border-[#dedede] text-[13px] font-semibold text-black hover:bg-[#f9f9f9] transition-colors flex items-center gap-2"
            >
              Export Order <Download className="size-4 text-[#767676]" />
            </button>
          </div>
        </div>

        {/* Stat Cards — 4 in a row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {loading
            ? Array(4).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="h-[127px] rounded-[7px] border border-[#dedede] animate-pulse bg-[#fafafa]"
                />
              ))
            : STAT_CARDS.map((card) => {
                const isUp = card.pct >= 50;
                return (
                  <div
                    key={card.label}
                    className="h-[127px] rounded-[7px] border border-[#dedede] bg-white px-5 pt-5 pb-4 relative flex flex-col justify-between overflow-hidden"
                  >
                    {/* Label + Trend arrow */}
                    <div className="flex items-start justify-between">
                      <p className="text-[17px] font-semibold text-black">{card.label}</p>
                      {/* Diagonal arrow — top right */}
                      <svg
                        viewBox="0 0 20 20"
                        className={cn("size-5 shrink-0 mt-0.5", !isUp && "rotate-[90deg]")}
                        fill="none"
                      >
                        <path
                          d="M4 16L16 4M16 4H8M16 4V12"
                          stroke="#282828"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    {/* Count + % */}
                    <div className="flex items-end justify-between">
                      <p className="text-[32px] font-semibold text-black leading-none">{card.count}</p>
                      <p className="text-[14px] text-[#767676] mb-0.5">{card.pct}%</p>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* ── Meal Attendance ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-[20px] font-bold text-black mb-4">Meal Attendance</h2>

        {/* Table + Right Panel container */}
        <div className="flex rounded-[12px] border border-[#dedede] overflow-hidden">

          {/* ── Main Table ── */}
          <div className="flex-1 overflow-x-auto min-w-0">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <table className="w-full min-w-[780px] border-collapse">
                {/* Header */}
                <thead>
                  <tr className="border-b border-[#dedede]">
                    <th className="px-5 py-[18px] text-left text-[18px] font-semibold text-black whitespace-nowrap w-[130px]">
                      Date
                    </th>
                    <th className="px-4 py-[18px] text-left text-[18px] font-semibold text-black whitespace-nowrap">
                      Tenant
                    </th>
                    {MEAL_COLS.map((col) => (
                      <th
                        key={col.key}
                        className="px-2 py-[18px] text-center text-[15px] font-semibold text-black whitespace-nowrap w-[88px]"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Body */}
                <tbody>
                  {(() => {
                    const rows: React.ReactNode[] = [];
                    let globalIdx = 0;

                    for (let di = 0; di < (weekData?.weekDays.length ?? 0); di++) {
                      const day = weekData!.weekDays[di];
                      const residents = filterResidents(day.residents);
                      if (residents.length === 0) continue;

                      residents.forEach((r, ri) => {
                        const isFirstInDay = ri === 0;
                        const isFirstOverall = globalIdx === 0;
                        const hasNoPlan = r.foodPlan === "NOT_INCLUDED";

                        rows.push(
                          <tr
                            key={`${day.date}-${r.stayId}`}
                            className={cn(
                              "border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa] transition-colors",
                              isFirstInDay && !isFirstOverall && "border-t-[2px] border-t-[#e8e8e8]"
                            )}
                          >
                            {/* Date cell — only on first resident row of that day */}
                            <td className="px-5 py-[14px] align-top">
                              {isFirstInDay ? (
                                <div className="flex items-center gap-2.5 pt-0.5">
                                  <span className="text-[16px] font-medium text-[#767676] w-[28px]">
                                    {day.dayName}
                                  </span>
                                  <div
                                    className={cn(
                                      "size-[34px] rounded-full flex items-center justify-center text-[14px] font-semibold",
                                      day.isToday
                                        ? "bg-[#282828] text-white"
                                        : "bg-transparent text-[#282828] border border-[#e0e0e0]"
                                    )}
                                  >
                                    {day.dayNumber}
                                  </div>
                                </div>
                              ) : null}
                            </td>

                            {/* Tenant */}
                            <td className="px-4 py-[14px]">
                              <p className="text-[15px] font-semibold text-black">
                                {r.tenantName}{" "}
                                <span className="font-normal text-[#767676]">
                                  ({r.roomNumber} {r.bedLabel})
                                </span>
                              </p>
                            </td>

                            {/* Meal checkboxes */}
                            {MEAL_COLS.map((col) => {
                              const val = r[col.key];
                              const tKey = `${r.stayId}-${day.date}-${col.key}`;
                              const isProcessing = toggling === tKey;
                              return (
                                <td key={col.key} className="py-[14px] text-center">
                                  <button
                                    onClick={() =>
                                      !hasNoPlan &&
                                      handleToggle(r.stayId, day.date, col.key, val)
                                    }
                                    disabled={hasNoPlan || isProcessing}
                                    className={cn(
                                      "size-[22px] rounded-[4px] border flex items-center justify-center mx-auto transition-all",
                                      hasNoPlan
                                        ? "bg-[#f8f7f7] border-[#e8e8e8] opacity-30 cursor-not-allowed"
                                        : val
                                          ? "bg-[#282828] border-[#282828] cursor-pointer"
                                          : "bg-[#f8f7f7] border-[#dedede] hover:border-[#828282] cursor-pointer",
                                      isProcessing && "opacity-50 cursor-wait"
                                    )}
                                  >
                                    {val && !hasNoPlan && (
                                      <svg
                                        viewBox="0 0 10 8"
                                        className="size-[9px]"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M1 4L3.5 6.5L9 1"
                                          stroke="white"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                        globalIdx++;
                      });
                    }

                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-20 text-center text-[14px] text-[#a1a1a1] font-medium"
                          >
                            {search
                              ? `No residents match "${search}"`
                              : "No active residents found for this week"}
                          </td>
                        </tr>
                      );
                    }

                    return rows;
                  })()}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Right Panel ──────────────────────────────────────────────────────── */}
          <div className="w-[185px] shrink-0 border-l border-[#dedede] flex-col bg-white hidden lg:flex">

            {/* Week nav arrows */}
            <div className="flex items-center gap-2 px-3 py-[14px] border-b border-[#f0f0f0]">
              <button
                onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
                className="size-[32px] rounded-[5px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:border-black hover:text-black transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
                className="size-[32px] rounded-[5px] border border-[#dedede] flex items-center justify-center text-[#767676] hover:border-black hover:text-black transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Search tenant */}
            <div className="px-3 py-3 border-b border-[#f0f0f0]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#a1a1a1]" />
                <input
                  type="text"
                  placeholder="Search tenant"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-[32px] pl-8 pr-2 rounded-[5px] border border-[#dedede] text-[12px] text-black placeholder:text-[#a1a1a1] outline-none focus:border-[#282828] bg-white transition-colors"
                />
              </div>
            </div>

            {/* Week start label */}
            <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center gap-2">
              <Calendar className="size-4 text-[#767676] shrink-0" />
              <span className="text-[13px] font-medium text-black">{weekLabel}</span>
            </div>

            {/* Export Order */}
            <button
              onClick={() => notify.info("Export coming soon!")}
              className="px-4 py-3 border-b border-[#f0f0f0] flex items-center gap-2 text-[13px] font-medium text-black hover:bg-[#fafafa] transition-colors text-left w-full"
            >
              <Download className="size-4 text-[#767676] shrink-0" />
              Export Order
            </button>

            {/* Expand */}
            <button className="px-4 py-3 border-b border-[#f0f0f0] flex items-center gap-2 text-[13px] font-medium text-black hover:bg-[#fafafa] transition-colors text-left w-full">
              <Maximize2 className="size-4 text-[#767676] shrink-0" />
              Expand
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* This Week */}
            <div className="px-4 py-3 border-t border-[#f0f0f0] flex items-center gap-2">
              <Calendar className="size-4 text-[#767676] shrink-0" />
              <button
                onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
                className={cn(
                  "text-[13px] font-medium transition-colors",
                  isCurrentWeek ? "text-[#282828] font-semibold" : "text-black hover:underline"
                )}
              >
                This Week
              </button>
            </div>

            {/* Download Report */}
            <button
              onClick={() => notify.info("Download report coming soon!")}
              className="px-4 py-3 border-t border-[#f0f0f0] flex items-center gap-2 text-[13px] font-medium text-black hover:bg-[#fafafa] transition-colors text-left w-full"
            >
              <Download className="size-4 text-[#767676] shrink-0" />
              Download Report
            </button>
          </div>
        </div>

        {/* Mobile: Right panel controls (shown on small screens) */}
        <div className="lg:hidden flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setWeekStart((w) => shiftWeek(w, -1))}
            className="size-9 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setWeekStart((w) => shiftWeek(w, 1))}
            className="size-9 rounded-[6px] border border-[#dedede] flex items-center justify-center text-[#767676]"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#a1a1a1]" />
            <input
              type="text"
              placeholder="Search tenant"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-2 rounded-[6px] border border-[#dedede] text-[13px] text-black placeholder:text-[#a1a1a1] outline-none focus:border-[#282828] bg-white"
            />
          </div>
          <button
            onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
            className="h-9 px-3 rounded-[6px] border border-[#dedede] text-[13px] font-medium text-black flex items-center gap-1.5"
          >
            <Calendar className="size-3.5 text-[#767676]" />
            This Week
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="p-5 space-y-4">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex items-center gap-5 animate-pulse">
          <div className="w-[100px] h-5 rounded bg-[#f2f2f2]" />
          <div className="flex-1 h-5 rounded bg-[#f2f2f2]" />
          {[...Array(6)].map((_, j) => (
            <div key={j} className="size-[22px] rounded-[4px] bg-[#f2f2f2] shrink-0" />
          ))}
        </div>
      ))}
    </div>
  );
}
