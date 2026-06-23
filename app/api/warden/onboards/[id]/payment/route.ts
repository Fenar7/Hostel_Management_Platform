import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { recordPaymentSchema } from "@/lib/validation/payment";
import { recordPayment } from "@/services/payments/payment.service";
import { UserRole } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const { id: stayId } = await params;

    // Fetch stay for auth check
    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
    });

    if (!stay) {
      throw new NotFoundError("Stay record not found");
    }

    const hostelId = await resolveHostelId(session, request, stay.hostelId);
    if (session.user.role !== UserRole.MAIN_ADMIN && stay.hostelId !== hostelId) {
      throw new ForbiddenError("You are not authorized to record payment for this stay");
    }

    const contentType = request.headers.get("content-type") || "";
    let data: z.infer<typeof recordPaymentSchema>;
    let screenshotFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      
      const parsed = recordPaymentSchema.safeParse({
        amountPaid: formData.get("amountPaid"),
        paymentMode: formData.get("paymentMode"),
        transactionRefNo: formData.get("transactionRefNo"),
        receivedBy: formData.get("receivedBy"),
      });

      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid payment data");
      }
      data = parsed.data;
      screenshotFile = formData.get("screenshot") as File | null;
    } else {
      const body = await request.json();
      const parsed = recordPaymentSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid payment data");
      }
      data = parsed.data;
    }
    const payment = await recordPayment({
      stayId,
      amountPaid: data.amountPaid,
      paymentMode: data.paymentMode,
      transactionRefNo: data.transactionRefNo,
      receivedBy: data.receivedBy || `User ${session.user.id}`,
      screenshotFile,
      uploadedByUserId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      message: "Payment recorded successfully, awaiting verification",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
