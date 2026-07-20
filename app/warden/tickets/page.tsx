import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { HostelWorkspaceLayout } from "@/components/hostel-management/HostelWorkspaceLayout";
import TicketsPageClient from "./TicketsPageClient";

export const metadata = {
  title: "Hostel Complaints | Warden | NextHome",
};

export default async function WardenTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ hostelId?: string }>;
}) {
  const { hostelId: queryHostelId } = await searchParams;
  const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);

  let hostelId: string | null = null;
  let hostelName: string | undefined = undefined;

  if (session.user.role === UserRole.MAIN_ADMIN) {
    if (queryHostelId) {
      hostelId = queryHostelId;
    } else {
      const firstHostel = await prisma.hostel.findFirst({ select: { id: true, name: true } });
      hostelId = firstHostel?.id ?? null;
      hostelName = firstHostel?.name;
    }
    
    if (hostelId && !hostelName) {
      const h = await prisma.hostel.findUnique({ where: { id: hostelId }});
      if (h) hostelName = h.name;
    }
  } else {
    const warden = await prisma.warden.findUnique({
      where: { userId: session.user.id },
      include: { hostel: true },
    });
    if (!warden) redirect("/");
    hostelId = warden.hostelId;
    hostelName = warden.hostel.name;
  }

  if (!hostelId) {
    redirect("/");
  }

  return (
    <HostelWorkspaceLayout
      hostelId={hostelId}
      hostelName={hostelName}
      title="Hostel Complaints"
      subtitle="Manage and resolve issues reported by tenants"
      hideAdminNav={true}
    >
      <TicketsPageClient />
    </HostelWorkspaceLayout>
  );
}
