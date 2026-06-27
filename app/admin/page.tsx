import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building, Bed, Activity, TrendingUp, IndianRupee, Map, Plus } from "lucide-react";
import { getAdminPortfolioStats } from "@/services/hostel/dashboard.service";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { AdminDashboardClient } from "./dashboard-client";
import { ActionAlertsClient } from "@/components/dashboard/ActionAlertsClient";

// Modular Dashboard Components
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusListCard } from "@/components/dashboard/StatusListCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { TasksList } from "@/components/dashboard/TasksList";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole([UserRole.MAIN_ADMIN]);
  const stats = await getAdminPortfolioStats();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 w-full max-w-7xl mx-auto">
      {/* Reusing the new DashboardHeader, with admin-specific title text */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--carbon-black)] dark:text-white">Admin Portfolio</h1>
          <p className="text-muted-foreground font-medium mt-1">Global Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/hostels/new">
            <Button variant="outline" className="font-semibold h-11 px-6 rounded-full border-2 border-[var(--cloud-grey)] text-[var(--carbon-black)] dark:text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Hostel
            </Button>
          </Link>
          <Link href="/warden/onboard">
            <Button className="font-semibold h-11 px-6 rounded-full bg-[var(--cta-green)] text-black hover:bg-[#4ae63a] dark:text-black">
              On Board a User
            </Button>
          </Link>
        </div>
      </div>
      
      <ActionAlertsClient role="MAIN_ADMIN" />

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Hostels" 
          value={stats.totalHostels} 
          icon={Building}
          trend="All Active"
          trendUp={true}
        />
        <StatCard 
          title="Total Beds" 
          value={stats.totalBeds} 
          icon={Bed}
        />
        <StatCard 
          title="Portfolio Occupancy" 
          value={`${stats.portfolioOccupancyRate}%`} 
          icon={Activity}
          trend={`${stats.totalOccupiedBeds} occupied`}
          trendUp={stats.portfolioOccupancyRate > 75}
        />
        <StatCard 
          title="Pending Payments" 
          value={stats.totalPendingPayments} 
          icon={IndianRupee}
          trend={stats.totalPendingPayments > 0 ? "Action Req" : "Clear"}
          trendUp={stats.totalPendingPayments === 0}
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        {/* Left Column (2/3) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <StatusListCard 
              title="Regional Occupancy"
              items={stats.hostels.map(h => ({
                id: h.id,
                label: h.name,
                value: `${h.occupancyRate}%`,
                statusText: h.occupancyRate > 85 ? "High" : "Good",
                statusColor: (h.occupancyRate > 85 ? "green" : "blue") as "green" | "blue"
              })).slice(0, 4)}
            />
            <StatusListCard 
              title="Action Required"
              items={stats.hostels.filter(h => h.pendingPayments > 0).map(h => ({
                id: h.id,
                label: h.name,
                value: `${h.pendingPayments} dues`,
                statusText: "Pending",
                statusColor: "red" as const
              })).slice(0, 4)}
            />
          </div>
          
          <ActivityFeed />
        </div>

        {/* Right Column (1/3) */}
        <div className="xl:col-span-1 space-y-6">
          <TasksList />
        </div>
      </div>
    </div>
  );
}
