import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { requireRole } from "@/lib/auth";
import { resolveHostelId } from "@/lib/auth/resolve-hostel";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { UserRole, OnboardingRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole([UserRole.WARDEN, UserRole.MAIN_ADMIN]);
    const reqId = (await params).id;

    const onboardingReq = await prisma.onboardingRequest.findUnique({
      where: { id: reqId },
    });

    if (!onboardingReq) {
      throw new NotFoundError("Onboarding request not found");
    }

    // Verify warden has access to this hostel
    if (session.user.role === UserRole.WARDEN) {
      const hostelId = await resolveHostelId(session);
      if (onboardingReq.hostelId !== hostelId) {
        throw new NotFoundError("Onboarding request not found");
      }
    }

    if (onboardingReq.status !== OnboardingRequestStatus.PENDING) {
      throw new ValidationError(
        "Cannot regenerate password for a completed or cancelled request"
      );
    }

    if (onboardingReq.onboardingCurrentStep !== null && onboardingReq.onboardingCurrentStep > 0) {
      throw new ValidationError(
        "Prospect has already started onboarding. Temp password is no longer valid."
      );
    }

    // Generate new temp password
    const tempPassword = randomBytes(6).toString("base64url").slice(0, 10);
    const tempPasswordHash = createHash("sha256").update(tempPassword).digest("hex");

    await prisma.onboardingRequest.update({
      where: { id: reqId },
      data: {
        tempPasswordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    const entryGateLink = `/onboarding?id=${reqId}`;

    return NextResponse.json({
      tempPassword,
      entryGateLink,
      requestId: reqId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
