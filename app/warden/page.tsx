import HostelDashboardView from "@/components/hostel-management/HostelDashboardView";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function WardenPage({
  searchParams,
}: {
  searchParams: Promise<{ hostelId?: string }>;
}) {
  const { hostelId: queryHostelId } = await searchParams;
  const { user } = await requireRole([UserRole.WARDEN]);

  // Fallback if warden doesn't have a hostelId (which shouldn't happen if properly provisioned)
  const hostelId = user.warden?.hostelId ?? null;

  return (
    <HostelDashboardView 
      hostelId={hostelId} 
      baseRoute="/warden" 
      userRole="WARDEN" 
    />
  );
}