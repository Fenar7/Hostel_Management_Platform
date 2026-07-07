"use client";

import { useEffect, useState } from "react";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, Users, IndianRupee } from "lucide-react";

export default function FoodFinanceDashboard({ hostelId }: { hostelId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/warden/food-finance?hostelId=${hostelId}`);
        if (!res.ok) throw new Error("Failed to load finance data");
        setData(await res.json());
      } catch (e: any) {
        notify.error(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [hostelId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-[#4b5563]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-32 w-full max-w-4xl bg-gray-200 rounded-xl" />
          <div className="h-64 w-full max-w-4xl bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Overview Card */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-[#1a1a1a]">Cycle Overview</h2>
          <p className="text-[13px] text-[#4b5563] mt-1">
            {data.cyclePeriod
              ? `${new Date(data.cyclePeriod.start).toLocaleDateString()} to ${new Date(
                  data.cyclePeriod.end
                ).toLocaleDateString()}`
              : "No active cycle"}
          </p>
        </div>

        <div className="flex gap-12">
          <div>
            <p className="text-[13px] text-[#4b5563] mb-1 flex items-center gap-1">
              <Wallet className="size-4" /> Total Collected
            </p>
            <p className="text-2xl font-bold text-[#1a1a1a]">₹{(data.totalRevenuePaise / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[13px] text-[#4b5563] mb-1 flex items-center gap-1">
              <IndianRupee className="size-4" /> Total Consumed
            </p>
            <p className="text-2xl font-bold text-[#1a1a1a]">₹{(data.totalConsumedPaise / 100).toFixed(2)}</p>
          </div>
          <div className="pl-6 border-l border-[#e5e7eb]">
            <p className="text-[13px] text-[#4b5563] mb-1">Net Position</p>
            <p
              className={cn(
                "text-2xl font-bold",
                data.netPositionPaise >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {data.netPositionPaise >= 0 ? "+" : "-"}₹
              {(Math.abs(data.netPositionPaise) / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credit List */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#e5e7eb] bg-[#f9fafb] flex items-center gap-2">
            <TrendingUp className="size-5 text-green-600" />
            <h3 className="font-medium text-[#1a1a1a]">Tenants in Credit</h3>
            <span className="ml-auto bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {data.tenantsInCredit.length}
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-4">
            {data.tenantsInCredit.length === 0 ? (
              <p className="text-sm text-[#4b5563] text-center py-4">No tenants in credit.</p>
            ) : (
              <ul className="space-y-3">
                {data.tenantsInCredit.map((t: any) => (
                  <li key={t.stayId} className="flex justify-between items-center border-b border-[#f3f4f6] pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-[#1a1a1a]">{t.tenantName}</p>
                      <p className="text-xs text-[#4b5563]">Room {t.roomName} • {t.billingMode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">+₹{(t.balancePaise / 100).toFixed(2)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Debt List */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#e5e7eb] bg-[#f9fafb] flex items-center gap-2">
            <TrendingDown className="size-5 text-red-600" />
            <h3 className="font-medium text-[#1a1a1a]">Tenants in Debt</h3>
            <span className="ml-auto bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
              {data.tenantsInDebt.length}
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-4">
            {data.tenantsInDebt.length === 0 ? (
              <p className="text-sm text-[#4b5563] text-center py-4">No tenants in debt.</p>
            ) : (
              <ul className="space-y-3">
                {data.tenantsInDebt.map((t: any) => (
                  <li key={t.stayId} className="flex justify-between items-center border-b border-[#f3f4f6] pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-[#1a1a1a]">{t.tenantName}</p>
                      <p className="text-xs text-[#4b5563]">Room {t.roomName} • {t.billingMode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">₹{(t.balancePaise / 100).toFixed(2)}</p>
                      <p className="text-[10px] text-red-500 uppercase tracking-wider">Due</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Flat Rate List */}
      <div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e5e7eb] bg-[#f9fafb] flex items-center gap-2">
          <Users className="size-5 text-gray-500" />
          <h3 className="font-medium text-[#1a1a1a]">Flat Rate Tenants</h3>
          <span className="ml-auto bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
            {data.flatRateTenants.length}
          </span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.flatRateTenants.length === 0 ? (
            <p className="text-sm text-[#4b5563] col-span-full">No flat rate tenants.</p>
          ) : (
            data.flatRateTenants.map((t: any) => (
              <div key={t.stayId} className="flex items-center gap-3 p-3 rounded-lg border border-[#f3f4f6] bg-[#f9fafb]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{t.tenantName}</p>
                  <p className="text-xs text-[#4b5563]">{t.roomName}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
