"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  Bell,
  Plus,
  Search,
  Pencil,
  X,
  Building2,
  User,
  Phone,
  ExternalLink,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  UserPlus,
  ChevronDown,
  BedSingle,
  Loader2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HostelWorkspaceLayout } from "./HostelWorkspaceLayout";
import HostelSelectorDropdown from "./HostelSelectorDropdown";

// ─── Types ──────────────────────────────────────────────────────────────────────
type Bed = {
  id: string;
  label: string;
  bedType: string | null;
  status: string;
  derivedStatus?: string;
  currentStay?: {
    id: string;
    status: string;
    tenant: { fullName: string; phone?: string };
  } | null;
};

type Room = {
  id: string;
  roomNumber: string;
  sharingType: string;
  isPrivate: boolean;
  beds: Bed[];
};

type Flat = {
  id: string;
  name: string;
  isPrivate: boolean;
  rooms: Room[];
};

type Floor = {
  id: string;
  name: string;
  flats: Flat[];
  rooms: Room[];
};

type HostelHierarchy = {
  id: string;
  name: string;
  address: string;
  accommodationType: string;
  floors: Floor[];
};

type HostelOption = {
  id: string;
  name: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
const formatSharing = (sharing: string, isPrivate: boolean) => {
  if (isPrivate && sharing === "SINGLE") return "Studio | Premium";
  switch (sharing) {
    case "SINGLE": return "Single | AC";
    case "DOUBLE": return "2 Sharing | AC";
    case "TRIPLE": return "3 Sharing | AC";
    case "FOUR": return "4 Sharing | AC";
    case "SIX": return "6 Sharing | AC";
    case "EIGHT": return "8 Sharing | AC";
    default: return `${sharing} | AC`;
  }
};

const getBedColor = (status: string) => {
  if (status === "OCCUPIED") return "bg-[#ef4444] text-white border-[#ef4444]"; // Red
  if (status === "AVAILABLE") return "bg-white text-[#22c55e] border-[#22c55e]"; // Green Outline
  if (status === "ON_HOLD") return "bg-[#eab308] text-white border-[#eab308]"; // Yellow Fill
  if (status === "BOOKED" || status === "RESERVED") return "bg-[#2563eb] text-white border-[#2563eb]"; // Blue Fill
  if (status === "IN_MAINTENANCE" || status === "NOT_IN_USE") return "bg-[#1a1a1a] text-white border-[#1a1a1a]"; // Black Fill for Blocked
  
  return "bg-gray-100 text-gray-400 border-gray-200";
};

// ─── Main Component ──────────────────────────────────────────────────────────────
export default function HostelOccupancyView({ hostelId, hostelName, baseRoute }: { hostelId: string | null; hostelName?: string; baseRoute: string }) {
  const [data, setData] = useState<HostelHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [floorFilter, setFloorFilter] = useState("ALL");
  const [sharingFilter, setSharingFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Multi-Hostel Selector state for Admins
  const [hostelsList, setHostelsList] = useState<HostelOption[]>([]);
  
  // Interactive Bed Drawer & Room Hover state
  const [selectedBed, setSelectedBed] = useState<{ bed: Bed; room: Room; floor: Floor } | null>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [updatingBed, setUpdatingBed] = useState(false);

  const router = useRouter();

  // 1. Fetch Multi-Hostel list if Admin
  useEffect(() => {
    if (baseRoute === "/admin") {
      fetch("/api/admin/hostels")
        .then((res) => (res.ok ? res.json() : []))
        .then((json) => {
          if (Array.isArray(json)) {
            setHostelsList(json.map((h: any) => ({ id: h.id, name: h.name })));
          }
        })
        .catch((err) => console.error("Failed to fetch hostels list for admin", err));
    }
  }, [baseRoute]);

  // 2. Fetch Hostel Structure
  function loadData() {
    if (!hostelId) {
      setLoading(false);
      setData(null);
      return;
    }
    
    setLoading(true);
    fetch(`/api/warden/stays/natural-checkout?hostelId=${hostelId}`, { method: "POST" })
      .catch(() => {})
      .then(() => {
        const url = `/api/hostel-structure/mine?hostelId=${hostelId}`;
        return fetch(url, { cache: "no-store" });
      })
      .then((res) => {
        if (!res.ok) return res.json().then((err) => Promise.reject(new Error(err.error || "Failed to fetch structure")));
        return res.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((e: Error) => {
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadData();
  }, [hostelId]);

  // 3. Bed Status Action Handler
  const handleUpdateBedStatus = async (bedId: string, newStatus: string) => {
    if (!hostelId) return;
    try {
      setUpdatingBed(true);
      const res = await fetch(`/api/warden/beds/${bedId}/status?hostelId=${hostelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        notify.success(`Bed status updated to ${newStatus}`);
        setSelectedBed(null);
        loadData();
      } else {
        const err = await res.json();
        notify.error(err.error || "Failed to update bed status");
      }
    } catch (e) {
      notify.error("Error updating bed status");
    } finally {
      setUpdatingBed(false);
    }
  };

  // ── Stats Calculation ──
  const stats = useMemo(() => {
    let totalBeds = 0;
    let availableBeds = 0;
    let singleBerth = 0;
    let lowerBerth = 0;
    let upperBerth = 0;
    let studio = 0;
    let totalRooms = 0;
    let booked = 0;
    let blocked = 0;

    if (!data) return null;

    data.floors.forEach(floor => {
      const allRooms = [...floor.rooms, ...floor.flats.flatMap(f => f.rooms)];
      totalRooms += allRooms.length;

      allRooms.forEach(room => {
        if (room.isPrivate && room.sharingType === "SINGLE") {
          studio += room.beds.length;
        }

        room.beds.forEach(bed => {
          totalBeds++;
          const status = bed.derivedStatus || bed.status;
          
          if (status === "AVAILABLE") availableBeds++;
          if (status === "ON_HOLD" || status === "BOOKED" || status === "RESERVED") booked++;
          if (status === "IN_MAINTENANCE" || status === "NOT_IN_USE") blocked++;

          if (bed.bedType === "SINGLE_COT" && !(room.isPrivate && room.sharingType === "SINGLE")) singleBerth++;
          if (bed.bedType === "LOWER_BERTH") lowerBerth++;
          if (bed.bedType === "UPPER_BERTH") upperBerth++;
        });
      });
    });

    return {
      totalBeds, availableBeds, singleBerth, lowerBerth, upperBerth, studio,
      totalRooms, booked, blocked, totalFloors: data.floors.length
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#18b92b]" />
          <p className="text-sm font-medium text-gray-500">Loading hostel occupancy map...</p>
        </div>
      </div>
    );
  }

  if (!hostelId) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-3xl font-bold tracking-tight">Occupancy</h1>
        <p className="text-muted-foreground">No hostel selected.</p>
      </div>
    );
  }

  const currentHostelName = data?.name || hostelName || "Hostel";

  const Actions = (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Multi-Hostel Selector for Admin */}
      {baseRoute === "/admin" && hostelsList.length > 0 && (
        <HostelSelectorDropdown
          hostels={hostelsList}
          selectedHostelId={hostelId}
          onSelectHostel={(id) => router.push(`${baseRoute}/occupancy?hostelId=${id}`)}
        />
      )}

      <button className="flex items-center justify-center gap-2 h-10 px-4 rounded-[6px] border border-[#dedede] dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all font-semibold text-[13px] whitespace-nowrap">
        Export Data
      </button>
      <button
        onClick={() => router.push(`${baseRoute}/builder`)}
        className="flex items-center justify-center gap-2 h-10 px-4 rounded-[6px] bg-[#282828] dark:bg-[#58ff48] text-white dark:text-black hover:bg-black transition-all font-semibold text-[13px] whitespace-nowrap"
      >
        Manage Rooms <Plus className="size-4 text-[#58ff48] dark:text-black" />
      </button>
    </div>
  );

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error || "Failed to load hostel occupancy structure"}
        </div>
      </div>
    );
  }

  return (
    <HostelWorkspaceLayout
      hostelId={hostelId}
      hostelName={currentHostelName}
      title="Hostel Occupancy"
      subtitle={`View and manage room assignments for ${currentHostelName}`}
      actions={Actions}
      hideAdminNav={baseRoute === "/warden"}
    >
      <div className="w-full">
        {/* ── Stats Header Bar ── */}
        <div className="flex flex-col gap-2.5 text-[14px] font-medium text-[#1a1a1a] dark:text-gray-200 mb-6 bg-gray-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-6 flex-wrap">
            <span><strong className="text-emerald-600 dark:text-emerald-400">Total Available Beds:</strong> {stats?.availableBeds}</span>
            <span>Single Berth: {stats?.singleBerth}</span>
            <span>Lower Berth: {stats?.lowerBerth}</span>
            <span>Upper Berth: {stats?.upperBerth}</span>
            <span>Studio: {stats?.studio}</span>
          </div>
          <div className="flex items-center gap-6 flex-wrap pt-2 border-t border-gray-200 dark:border-white/10 text-[13px]">
            <span>Total Floors: {stats?.totalFloors}</span>
            <span>Total Rooms: {stats?.totalRooms}</span>
            <span className="text-emerald-600 font-bold">Available: {stats?.availableBeds}</span>
            <span className="text-amber-600 font-bold">Booked / On Hold: {stats?.booked}</span>
            <span className="text-red-600 font-bold">Blocked / Maint: {stats?.blocked}</span>
          </div>
        </div>

        {/* ── Dynamic Filters Bar ── */}
        <div className="flex items-center gap-3 flex-wrap pb-4">
          <div className="relative min-w-[220px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search Room, Bed, or Tenant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[38px] pl-9 pr-3 rounded-lg border border-[#e5e7eb] dark:border-white/10 bg-white dark:bg-zinc-900 text-[13px] text-black dark:text-white outline-none focus:border-[#4b5563]"
            />
          </div>

          {/* Floor Filter */}
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="h-[38px] px-3 min-w-[130px] rounded-lg border border-[#e5e7eb] dark:border-white/10 bg-white dark:bg-zinc-900 text-[13px] text-[#4b5563] dark:text-gray-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Floors</option>
            {data.floors.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {/* Sharing Filter */}
          <select
            value={sharingFilter}
            onChange={(e) => setSharingFilter(e.target.value)}
            className="h-[38px] px-3 min-w-[130px] rounded-lg border border-[#e5e7eb] dark:border-white/10 bg-white dark:bg-zinc-900 text-[13px] text-[#4b5563] dark:text-gray-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Room Types</option>
            <option value="SINGLE">Single / Studio</option>
            <option value="DOUBLE">2 Sharing</option>
            <option value="TRIPLE">3 Sharing</option>
            <option value="FOUR">4 Sharing</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[38px] px-3 min-w-[130px] rounded-lg border border-[#e5e7eb] dark:border-white/10 bg-white dark:bg-zinc-900 text-[13px] text-[#4b5563] dark:text-gray-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Bed Statuses</option>
            <option value="AVAILABLE">Available Only</option>
            <option value="OCCUPIED">Occupied Only</option>
            <option value="ON_HOLD">On Hold / Booked</option>
            <option value="IN_MAINTENANCE">In Maintenance</option>
          </select>
        </div>
      </div>

      {/* ── Floors & Rooms Grid ── */}
      <div className="p-6">
        {data.floors
          .filter((floor) => floorFilter === "ALL" || floor.id === floorFilter)
          .map((floor) => {
            const allRooms = [...floor.rooms, ...floor.flats.flatMap((f) => f.rooms)];

            // Filter rooms by search, sharing, and bed status
            const filteredRooms = allRooms.filter((room) => {
              if (sharingFilter !== "ALL" && room.sharingType !== sharingFilter) return false;

              const query = search.trim().toLowerCase();
              const matchesSearch =
                !query ||
                room.roomNumber.toLowerCase().includes(query) ||
                room.beds.some(
                  (b) =>
                    b.label.toLowerCase().includes(query) ||
                    (b.currentStay?.tenant?.fullName &&
                      b.currentStay.tenant.fullName.toLowerCase().includes(query))
                );

              if (!matchesSearch) return false;

              if (statusFilter !== "ALL") {
                const hasMatchingBed = room.beds.some(
                  (b) => (b.derivedStatus || b.status) === statusFilter
                );
                if (!hasMatchingBed) return false;
              }

              return true;
            });

            if (filteredRooms.length === 0) return null;

            return (
              <div key={floor.id} className="mb-10 last:mb-0">
                <h2 className="text-[16px] font-bold text-[#1a1a1a] dark:text-white mb-5 flex items-center gap-2">
                  <span>{floor.name}</span>
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">({filteredRooms.length} rooms)</span>
                </h2>
                
                <div className="flex flex-wrap gap-4">
                  {filteredRooms.map((room) => {
                    const lbs = room.beds.filter((b) => b.bedType === "LOWER_BERTH");
                    const ubs = room.beds.filter((b) => b.bedType === "UPPER_BERTH");
                    const singles = room.beds.filter(
                      (b) => b.bedType === "SINGLE_COT" || b.bedType === null
                    );

                    const hasColumns = lbs.length > 0 || ubs.length > 0;

                    const occupiedCount = room.beds.filter((b) => (b.derivedStatus || b.status) === "OCCUPIED").length;
                    const totalBeds = room.beds.length;
                    const isFullyOccupied = occupiedCount === totalBeds && totalBeds > 0;

                    return (
                      <div
                        key={room.id}
                        onMouseEnter={() => setHoveredRoomId(room.id)}
                        onMouseLeave={() => setHoveredRoomId(null)}
                        className="relative group w-[165px] rounded-[12px] border border-[#e5e7eb] dark:border-white/10 bg-white dark:bg-zinc-900 p-4 flex flex-col items-center hover:border-gray-400 dark:hover:border-white/30 hover:shadow-md transition-all duration-200"
                      >
                        {/* ── Room Hover Popover Card ── */}
                        {hoveredRoomId === room.id && (
                          <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-64 p-3.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 shadow-2xl rounded-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 pointer-events-none flex flex-col gap-2.5 text-left">
                            {/* Down Arrow Pointer */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-white dark:border-t-zinc-900 drop-shadow-xs" />

                            {/* Header & Occupancy Pill */}
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
                              <div>
                                <h4 className="text-xs font-bold text-black dark:text-white">
                                  Room {room.roomNumber}
                                </h4>
                                <p className="text-[10px] font-semibold text-gray-500">
                                  {floor.name} · {formatSharing(room.sharingType, room.isPrivate)}
                                </p>
                              </div>

                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                                  isFullyOccupied
                                    ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"
                                    : occupiedCount > 0
                                    ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                                    : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                )}
                              >
                                {occupiedCount}/{totalBeds} Occupied
                              </span>
                            </div>

                            {/* Ratio Bar */}
                            <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                              <div
                                style={{ width: `${(occupiedCount / (totalBeds || 1)) * 100}%` }}
                                className={cn(
                                  "h-full transition-all duration-300",
                                  isFullyOccupied ? "bg-red-500" : "bg-emerald-500"
                                )}
                              />
                            </div>

                            {/* Beds & Resident Breakdown */}
                            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pt-0.5">
                              {room.beds.map((b) => {
                                const st = b.derivedStatus || b.status;
                                return (
                                  <div
                                    key={b.id}
                                    className="flex items-center justify-between text-[11px] font-semibold p-1.5 rounded-lg bg-gray-50 dark:bg-zinc-800/60"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <div
                                        className={cn(
                                          "w-2 h-2 rounded-full shrink-0",
                                          st === "OCCUPIED"
                                            ? "bg-red-500"
                                            : st === "AVAILABLE"
                                            ? "bg-emerald-500"
                                            : st === "ON_HOLD"
                                            ? "bg-amber-500"
                                            : "bg-gray-400"
                                        )}
                                      />
                                      <span className="font-bold text-gray-800 dark:text-gray-200">
                                        Bed {b.label}:
                                      </span>
                                      <span className="truncate text-gray-600 dark:text-gray-400">
                                        {b.currentStay ? b.currentStay.tenant.fullName : st}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <p className="text-[9px] font-medium text-gray-400 text-center italic pt-1 border-t border-gray-100 dark:border-white/5">
                              Click any bed to view profile or actions
                            </p>
                          </div>
                        )}

                        {/* Room Header */}
                        <div className="flex items-center justify-center gap-1.5 mb-1 w-full">
                          <span className="text-[15px] font-bold text-[#1a1a1a] dark:text-white">
                            Room {room.roomNumber}
                          </span>
                          <button
                            onClick={() => router.push(`${baseRoute}/builder`)}
                            className="text-[#1a1a1a] dark:text-gray-400 hover:text-blue-500 transition-colors"
                            title="Edit Room Layout"
                          >
                            <Pencil className="size-3.5" strokeWidth={2} />
                          </button>
                        </div>
                        <p className="text-[11px] font-semibold text-[#6b7280] dark:text-gray-400 mb-4 text-center">
                          {formatSharing(room.sharingType, room.isPrivate)}
                        </p>

                        {/* Beds Layout */}
                        {hasColumns ? (
                          <div className="flex justify-center gap-3 mt-auto w-full">
                            {/* Lower Berth Column */}
                            {lbs.length > 0 && (
                              <div className="flex flex-col items-center">
                                <span className="text-[11px] font-bold text-[#1a1a1a] dark:text-gray-300 mb-1">
                                  LB
                                </span>
                                <div className="flex flex-col gap-2">
                                  {lbs.map((bed) => {
                                    const effectiveStatus = bed.derivedStatus || bed.status;
                                    return (
                                      <div
                                        key={bed.id}
                                        onClick={() => setSelectedBed({ bed, room, floor })}
                                        className={cn(
                                          "h-[40px] min-w-[40px] px-2 rounded-[8px] border flex items-center justify-center text-[13px] font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs",
                                          getBedColor(effectiveStatus)
                                        )}
                                        title={
                                          bed.currentStay
                                            ? `Occupied by ${bed.currentStay.tenant.fullName}`
                                            : `Bed ${bed.label} (${effectiveStatus})`
                                        }
                                      >
                                        {bed.label}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Upper Berth Column */}
                            {ubs.length > 0 && (
                              <div className="flex flex-col items-center">
                                <span className="text-[11px] font-bold text-[#1a1a1a] dark:text-gray-300 mb-1">
                                  UB
                                </span>
                                <div className="flex flex-col gap-2">
                                  {ubs.map((bed) => {
                                    const effectiveStatus = bed.derivedStatus || bed.status;
                                    return (
                                      <div
                                        key={bed.id}
                                        onClick={() => setSelectedBed({ bed, room, floor })}
                                        className={cn(
                                          "h-[40px] min-w-[40px] px-2 rounded-[8px] border flex items-center justify-center text-[13px] font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs",
                                          getBedColor(effectiveStatus)
                                        )}
                                        title={
                                          bed.currentStay
                                            ? `Occupied by ${bed.currentStay.tenant.fullName}`
                                            : `Bed ${bed.label} (${effectiveStatus})`
                                        }
                                      >
                                        {bed.label}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-2 mt-auto w-full">
                            {singles.map((bed) => {
                              const effectiveStatus = bed.derivedStatus || bed.status;
                              return (
                                <div
                                  key={bed.id}
                                  onClick={() => setSelectedBed({ bed, room, floor })}
                                  className={cn(
                                    "h-[40px] min-w-[40px] px-2 rounded-[8px] border flex items-center justify-center text-[13px] font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs",
                                    getBedColor(effectiveStatus)
                                  )}
                                  title={
                                    bed.currentStay
                                      ? `Occupied by ${bed.currentStay.tenant.fullName}`
                                      : `Bed ${bed.label} (${effectiveStatus})`
                                  }
                                >
                                  {bed.label}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* ── Interactive Bed Action Sheet / Modal ── */}
      {selectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative flex flex-col gap-5">
            {/* Close button */}
            <button
              onClick={() => setSelectedBed(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X className="size-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-black dark:text-white shrink-0">
                <BedSingle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-black dark:text-white">
                  Bed {selectedBed.bed.label}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Room {selectedBed.room.roomNumber} · {selectedBed.floor.name}
                </p>
              </div>
            </div>

            {/* Status Pill */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</span>
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                  getBedColor(selectedBed.bed.derivedStatus || selectedBed.bed.status)
                )}
              >
                {selectedBed.bed.derivedStatus || selectedBed.bed.status}
              </span>
            </div>

            {/* Content per status */}
            {selectedBed.bed.currentStay ? (
              /* Occupied View */
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center text-sm shrink-0">
                    {selectedBed.bed.currentStay.tenant.fullName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Resident Tenant</p>
                    <h4 className="text-base font-bold text-black dark:text-white">
                      {selectedBed.bed.currentStay.tenant.fullName}
                    </h4>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const stayId = selectedBed.bed.currentStay?.id;
                      setSelectedBed(null);
                      if (stayId) {
                        const targetUrl =
                          baseRoute === "/admin"
                            ? `/admin/hostels/${hostelId}/stays/${stayId}`
                            : `/warden/stays/${stayId}`;
                        router.push(targetUrl);
                      }
                    }}
                    className="w-full h-11 bg-black dark:bg-[#58ff48] text-white dark:text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <User className="size-4" /> View Stay Details
                  </button>

                  {selectedBed.bed.currentStay.tenant.phone && (
                    <a
                      href={`tel:${selectedBed.bed.currentStay.tenant.phone}`}
                      className="w-full h-11 border border-gray-200 dark:border-white/10 text-black dark:text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <Phone className="size-4 text-emerald-500" /> Call Resident (+91 {selectedBed.bed.currentStay.tenant.phone})
                    </a>
                  )}
                </div>
              </div>
            ) : (selectedBed.bed.derivedStatus || selectedBed.bed.status) === "AVAILABLE" ? (
              /* Available View */
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-500 font-medium">This bed is ready for a new tenant assignment or maintenance block.</p>
                
                <button
                  onClick={() => {
                    const bedId = selectedBed.bed.id;
                    setSelectedBed(null);
                    const onboardUrl =
                      baseRoute === "/admin"
                        ? `/admin/onboards?hostelId=${hostelId}&bedId=${bedId}`
                        : `/warden/onboard?hostelId=${hostelId}&bedId=${bedId}`;
                    router.push(onboardUrl);
                  }}
                  className="w-full h-11 bg-[#18b92b] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <UserPlus className="size-4" /> Onboard Tenant to Bed {selectedBed.bed.label}
                </button>

                <button
                  disabled={updatingBed}
                  onClick={() => handleUpdateBedStatus(selectedBed.bed.id, "IN_MAINTENANCE")}
                  className="w-full h-11 border border-gray-200 dark:border-white/10 text-black dark:text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  {updatingBed ? <Loader2 className="size-4 animate-spin" /> : <Wrench className="size-4 text-amber-500" />} Mark Bed as Maintenance
                </button>
              </div>
            ) : (selectedBed.bed.derivedStatus || selectedBed.bed.status) === "ON_HOLD" ? (
              /* On Hold View */
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Onboarding Link Active</p>
                  <p className="text-xs text-amber-800 dark:text-amber-300">This bed is locked for a pending onboarding registration link.</p>
                </div>

                <button
                  disabled={updatingBed}
                  onClick={() => handleUpdateBedStatus(selectedBed.bed.id, "AVAILABLE")}
                  className="w-full h-11 bg-red-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {updatingBed ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />} Release Lock & Mark Available
                </button>
              </div>
            ) : (
              /* Maintenance / Blocked View */
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">Maintenance / Blocked</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Bed is taken out of service.</p>
                </div>

                <button
                  disabled={updatingBed}
                  onClick={() => handleUpdateBedStatus(selectedBed.bed.id, "AVAILABLE")}
                  className="w-full h-11 bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {updatingBed ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Unblock & Mark Available
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </HostelWorkspaceLayout>
  );
}

