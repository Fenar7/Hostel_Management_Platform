import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  handleApiError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/lib/errors";
import { OnboardingRequestStatus } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const onboardingRequest = await prisma.onboardingRequest.findUnique({
      where: { id },
    });

    if (!onboardingRequest) {
      throw new NotFoundError("Onboarding request not found");
    }

    if (onboardingRequest.status !== OnboardingRequestStatus.PENDING) {
      throw new ConflictError("This onboarding request is no longer active");
    }

    if (onboardingRequest.onboardingCurrentStep < 5) {
      throw new ValidationError(
        "Please complete all steps before finalizing"
      );
    }

    // Mark onboarding request as completed
    await prisma.onboardingRequest.update({
      where: { id },
      data: {
        status: OnboardingRequestStatus.COMPLETED,
        tempPasswordHash: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
