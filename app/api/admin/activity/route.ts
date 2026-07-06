import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { UserRole, ActivityEventType } from "@prisma/client";
import { getActivityFeed } from "@/services/activity/activity.service";
import { handleApiError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.MAIN_ADMIN]);
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get("cursor") || undefined;
    const cursorId = searchParams.get("cursorId") || undefined;
    const take = parseInt(searchParams.get("take") || "20", 10);
    const eventTypesParam = searchParams.get("eventTypes");
    const hostelId = searchParams.get("hostelId") || undefined;

    const eventTypes = eventTypesParam 
      ? eventTypesParam.split(",").map(t => t as ActivityEventType) 
      : undefined;

    const result = await getActivityFeed({
      organizationId: session.user.organizationId!,
      hostelId: hostelId === "ALL" ? undefined : hostelId,
      cursor,
      cursorId,
      take,
      eventTypes,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
