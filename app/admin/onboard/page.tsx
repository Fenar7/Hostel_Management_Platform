import HostelOnboardView from "@/components/hostel-management/HostelOnboardView";
import { requireRole } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminOnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ hostelId?: string }>;
}) {
  const { hostelId } = await searchParams;
  await requireRole([UserRole.MAIN_ADMIN]);

  return <HostelOnboardView hostelId={hostelId ?? null} baseRoute="/admin" />;
}
