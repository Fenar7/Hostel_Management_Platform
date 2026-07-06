import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

import { ActivityLogPageClient } from "@/components/hostel-management/dashboard/ActivityLogPageClient";

export const dynamic = "force-dynamic";

export default async function AdminActivityLogPage() {
  const session = await requireRole([UserRole.MAIN_ADMIN]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full px-4 md:px-6 xl:px-8 py-5 bg-white dark:bg-black min-h-screen">
      <div className="w-full">
        {session.user.organizationId ? (
          <ActivityLogPageClient 
            role="MAIN_ADMIN"
            organizationId={session.user.organizationId}
            showStandaloneHeader={true}
          />
        ) : (
          <div className="p-8 text-center text-red-500">
            Organization not found for this admin account.
          </div>
        )}
      </div>
    </div>
  );
}
