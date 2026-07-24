"use client";

import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type HostelOption = {
  id: string;
  name: string;
  code?: string;
};

interface HostelSelectorDropdownProps {
  hostels: HostelOption[];
  selectedHostelId: string | null;
  onSelectHostel: (hostelId: string) => void;
  className?: string;
}

export default function HostelSelectorDropdown({
  hostels,
  selectedHostelId,
  onSelectHostel,
  className,
}: HostelSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedHostel = hostels.find((h) => h.id === selectedHostelId) || hostels[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const filteredHostels = hostels.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 px-3.5 rounded-xl border flex items-center gap-2.5 transition-all duration-200 cursor-pointer shadow-xs select-none",
          isOpen
            ? "bg-gray-100 dark:bg-zinc-800 border-gray-400 dark:border-white/30 ring-2 ring-emerald-500/20"
            : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-800/60 hover:border-gray-300 dark:hover:border-white/20"
        )}
      >
        <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <Building2 className="size-3.5" />
        </div>

        <div className="flex items-center gap-1.5 text-left">
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider hidden sm:inline">
            Hostel:
          </span>
          <span className="text-xs font-bold text-black dark:text-white truncate max-w-[150px] sm:max-w-[180px]">
            {selectedHostel?.name || "Select Hostel"}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "size-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ml-0.5 shrink-0",
            isOpen && "rotate-180 text-black dark:text-white"
          )}
        />
      </button>

      {/* Custom Animated Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 shadow-2xl p-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col gap-1">
          {/* Header & Search if more than 3 hostels */}
          {hostels.length > 3 && (
            <div className="p-1 mb-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search hostel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-medium text-black dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 px-3 py-1">
            Your Properties ({hostels.length})
          </div>

          {/* List of Hostels */}
          <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
            {filteredHostels.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No hostels found</p>
            ) : (
              filteredHostels.map((h) => {
                const isSelected = h.id === selectedHostel?.id;
                return (
                  <button
                    key={h.id}
                    onClick={() => {
                      onSelectHostel(h.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all group cursor-pointer",
                      isSelected
                        ? "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0 transition-all",
                          isSelected
                            ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                            : "bg-gray-300 dark:bg-zinc-700 group-hover:bg-gray-400"
                        )}
                      />
                      <span className="truncate">{h.name}</span>
                    </div>

                    {isSelected && (
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
