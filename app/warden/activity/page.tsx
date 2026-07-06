import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { HostelWorkspaceLayout } from "@/components/hostel-management/HostelWorkspaceLayout";
import { ActivityLogPageClient } from "@/components/hostel-management/dashboard/ActivityLogPageClient";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WardenActivityLogPage() {
  const session = await requireRole([UserRole.WARDEN]);

  if (!session.user.warden?.hostelId) {
    return (
      <div className="p-8 text-center text-red-500">
        Hostel not found for this warden account.
      </div>
    );
  }

  const hostelId = session.user.warden.hostelId;
  const hostel = await prisma.hostel.findUnique({
    where: { id: hostelId },
    select: { name: true, organizationId: true }
  });

  if (!hostel) {
    return (
      <div className="p-8 text-center text-red-500">
        Hostel not found in database.
      </div>
    );
  }

  const dateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());

  return (
    <HostelWorkspaceLayout
      hostelId={hostelId}
      hostelName={hostel.name}
      title="Activity Log"
      subtitle={dateStr}
      hideAdminNav={true}
    >
      <div className="w-full mt-2">
        <ActivityLogPageClient 
          role="WARDEN"
          organizationId={hostel.organizationId}
          hostelId={hostelId}
          showStandaloneHeader={false}
        />
      </div>
    </HostelWorkspaceLayout>
  );
}
