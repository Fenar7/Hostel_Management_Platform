import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError, ValidationError } from "@/lib/errors";
import { UserRole } from "@prisma/client";
import { verifySchema } from "@/lib/validation/onboarding";
import { verifyPayment } from "@/services/payments/payment.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id: stayId } = await params;

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid body");
    }
    const { paymentId } = parsed.data;

    const hostelId = await resolveHostelId(session, request);

    const result = await verifyPayment(paymentId, session.user.id, hostelId, session.user.role);

    return NextResponse.json({
      success: true,
      activated: result.stay.status === "ACTIVE",
      message: result.stay.status === "ACTIVE" ? "Payment verified and stay activated" : "Payment verified partially",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
