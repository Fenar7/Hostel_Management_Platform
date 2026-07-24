import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFullHierarchy } from "@/services/hostel/structure.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    let fallbackHostelId: string | undefined = undefined;

    if (session.user.role === UserRole.MAIN_ADMIN) {
      const { searchParams } = new URL(request.url);
      if (!searchParams.get("hostelId")) {
        const firstHostel = await prisma.hostel.findFirst({
          where: { organizationId: session.user.organizationId },
          select: { id: true }
        });
        if (firstHostel) {
          fallbackHostelId = firstHostel.id;
        }
      }
    }

    const hostelId = await resolveHostelId(session, request, fallbackHostelId);
    const hierarchy = await getFullHierarchy(hostelId);
    return Response.json(hierarchy);
  } catch (error) {
    return handleApiError(error);
  }
}
