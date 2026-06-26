import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { rupeesToPaise } from "@/lib/money";
import { UserRole, ServiceRequestType } from "@prisma/client";
import { z } from "zod";

const createServiceRequestSchema = z.object({
  type: z.nativeEnum(ServiceRequestType),
  amount: z.number().positive(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id: stayId } = await params;
    const body = await request.json();

    const validatedData = createServiceRequestSchema.parse(body);

    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);

    if (session.user.role !== UserRole.MAIN_ADMIN && stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to access this stay");
    }

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        stayId: stay.id,
        type: validatedData.type,
        amountPaise: rupeesToPaise(validatedData.amount),
        metadata: validatedData.metadata || {},
        status: "PENDING_PAYMENT",
      },
    });

    return NextResponse.json({
      success: true,
      serviceRequest,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
