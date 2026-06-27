import { Bed, Users, FileText, IndianRupee } from "lucide-react";
import { UserRole } from "@prisma/client";
import { ActionAlertsClient } from "@/components/dashboard/ActionAlertsClient";
import { getWardenHostelStats } from "@/services/hostel/dashboard.service";

// Modular Dashboard Components
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusListCard } from "@/components/dashboard/StatusListCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { TasksList } from "@/components/dashboard/TasksList";

export const dynamic = "force-dynamic";

export default async function HostelDashboardView({
  hostelId,
  baseRoute,
  userRole,
}: {
  hostelId: string | null;
  baseRoute: string;
  userRole: "MAIN_ADMIN" | "WARDEN";
}) {
  if (!hostelId) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Hostel Dashboard
        </h1>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 shadow-sm">
          <p className="text-red-800 dark:text-red-400 font-medium">
            {userRole === UserRole.MAIN_ADMIN
              ? "No hostels found in the system."
              : "Account is not provisioned properly. Please contact your administrator."}
          </p>
        </div>
      </div>
    );
  }
  
  const stats = await getWardenHostelStats(hostelId);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 w-full max-w-7xl mx-auto">
      <DashboardHeader />
      
      <ActionAlertsClient role={userRole} />

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Available Beds" 
          value={stats.availableBeds} 
          icon={Bed}
          trend="+2"
          trendUp={true}
        />
        <StatCard 
          title="Occupied Beds" 
          value={stats.occupiedBeds} 
          icon={Users}
          trend="-1"
          trendUp={false}
        />
        <StatCard 
          title="Pending Bookings" 
          value={stats.pendingOnboarding} 
          icon={FileText}
          trend="+5"
          trendUp={true}
        />
        <StatCard 
          title="Rent Due" 
          value={stats.pendingPayments} 
          icon={IndianRupee}
          trend="Action Req"
          trendUp={false}
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        {/* Left Column (2/3) */}
        <div className="xl:col-span-2 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <StatusListCard 
              title="Occupancy Status"
              items={[
                { id: "1", label: "Standard Room", value: "85%", statusText: "High", statusColor: "green" },
                { id: "2", label: "Premium Room", value: "60%", statusText: "Medium", statusColor: "yellow" },
                { id: "3", label: "Dormitory", value: "95%", statusText: "Full", statusColor: "red" },
              ]}
            />
            <StatusListCard 
              title="Booking Status"
              items={[
                { id: "1", label: "Confirmed", value: "12", statusText: "New", statusColor: "green" },
                { id: "2", label: "Pending KYC", value: "5", statusText: "Action", statusColor: "yellow" },
                { id: "3", label: "Cancelled", value: "2", statusColor: "default" },
              ]}
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