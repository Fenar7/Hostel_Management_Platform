import HostelOccupancyView from "@/components/hostel-management/HostelOccupancyView";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminOccupancyPage({
  searchParams,
}: {
  searchParams: Promise<{ hostelId?: string }>;
}) {
  const { hostelId: queryHostelId } = await searchParams;
  const { user } = await requireRole([UserRole.MAIN_ADMIN]);

  let hostelId: string | null = null;
  if (queryHostelId) {
    const hostel = await prisma.hostel.findUnique({
      where: { id: queryHostelId, organizationId: user.organizationId },
      select: { id: true, name: true }
    });
    hostelId = hostel?.id ?? null;
  }

  if (!hostelId) {
    const firstHostel = await prisma.hostel.findFirst({
      where: { organizationId: user.organizationId },
      select: { id: true }
    });
    hostelId = firstHostel?.id ?? null;
  }

  return (
    <HostelOccupancyView
      hostelId={hostelId}
      baseRoute="/admin"
    />
  );
}
