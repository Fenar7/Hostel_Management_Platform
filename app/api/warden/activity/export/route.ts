import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { UserRole, ActivityEventType } from "@prisma/client";
import { streamActivityLogCsv } from "@/services/activity/activity.service";
import { handleApiError, ForbiddenError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole([UserRole.WARDEN]);
    
    if (!session.user.warden?.hostelId) {
      throw new ForbiddenError("Warden account not provisioned with a hostel");
    }

    const { searchParams } = new URL(request.url);

    const eventTypesParam = searchParams.get("eventTypes");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const eventTypes = eventTypesParam 
      ? eventTypesParam.split(",").map(t => t as ActivityEventType) 
      : undefined;

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    const generator = streamActivityLogCsv({
      organizationId: session.user.organizationId!,
      hostelId: session.user.warden.hostelId, // ALWAYS from session
      eventTypes,
      startDate,
      endDate,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generator) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="activity-log-warden-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
