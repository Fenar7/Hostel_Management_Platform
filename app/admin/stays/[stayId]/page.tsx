import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import StayDetailsPageView from "@/components/hostel-management/StayDetailsPageView";

export const dynamic = "force-dynamic";

export default async function AdminStayDetailsFallbackPage({
  params,
}: {
  params: Promise<{ stayId: string }>;
}) {
  const { user } = await requireRole([UserRole.MAIN_ADMIN]);
  const { stayId } = await params;

  const stay = await prisma.stay.findFirst({
    where: {
      id: stayId,
      hostel: { organizationId: user.organizationId },
    },
    include: {
      hostel: true,
      tenant: {
        include: {
          user: true,
          documents: true,
        },
      },
      bed: {
        include: {
          room: true,
        },
      },
      payments: true,
      foodOrders: {
        orderBy: { forDate: "desc" },
      },
    },
  });

  if (!stay) {
    notFound();
  }

  return (
    <StayDetailsPageView
      stay={stay as any}
      baseRoute={`/admin/hostels/${stay.hostelId}`}
    />
  );
}
